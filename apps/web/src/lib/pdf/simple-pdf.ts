/**
 * Minimal single/multi-page PDF writer (WinAnsi / Helvetica).
 * Avoids native deps so statement downloads work on Vercel.
 */

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 56;
const TITLE_SIZE = 16;
const BODY_SIZE = 11;
const LINE_HEIGHT = 16;
const TITLE_Y = 780;
const BODY_START_Y = 748;
const BOTTOM_MARGIN = 56;

const textEncoder = new TextEncoder();

function byteLength(s: string): number {
  return textEncoder.encode(s).length;
}

const WINANSI_MAP: Record<string, number> = {
  "€": 128,
  "‚": 130,
  ƒ: 131,
  "„": 132,
  "…": 133,
  "†": 134,
  "‡": 135,
  ˆ: 136,
  "‰": 137,
  Š: 138,
  "‹": 139,
  Œ: 140,
  Ž: 142,
  "‘": 145,
  "’": 146,
  "“": 147,
  "”": 148,
  "•": 149,
  "–": 150,
  "—": 151,
  "˜": 152,
  "™": 153,
  š: 154,
  "›": 155,
  œ: 156,
  ž: 158,
  Ÿ: 159,
};

function charToWinAnsi(ch: string): number {
  const code = ch.codePointAt(0) ?? 63;
  if (code === 0xa0) return 160;
  if (code < 128) return code;
  if (code <= 255) return code;
  if (WINANSI_MAP[ch] != null) return WINANSI_MAP[ch];
  const folded = ch.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  if (folded.length === 1) {
    const f = folded.codePointAt(0) ?? 63;
    if (f < 128) return f;
  }
  return 63; // "?"
}

function escapePdfString(text: string): string {
  let out = "";
  for (const ch of text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")) {
    if (ch === "\n") {
      out += "\\n";
      continue;
    }
    const b = charToWinAnsi(ch);
    if (b === 40 || b === 41 || b === 92) {
      out += `\\${String.fromCharCode(b)}`;
    } else if (b < 32 || b > 126) {
      out += `\\${b.toString(8).padStart(3, "0")}`;
    } else {
      out += String.fromCharCode(b);
    }
  }
  return out;
}

function wrapLine(text: string, maxChars: number): string[] {
  const trimmed = text.replace(/\t/g, "  ");
  if (trimmed.length <= maxChars) return [trimmed];
  const words = trimmed.split(/(\s+)/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + word).length > maxChars && current.trim()) {
      lines.push(current.trimEnd());
      current = word.trimStart();
    } else {
      current += word;
    }
  }
  if (current) lines.push(current.trimEnd());
  return lines.length ? lines : [""];
}

export function buildSimplePdf(title: string, lines: string[]): Uint8Array {
  const wrapped = lines.flatMap((line) => wrapLine(line, 90));
  const linesPerPage = Math.max(
    1,
    Math.floor((BODY_START_Y - BOTTOM_MARGIN) / LINE_HEIGHT)
  );
  const pageCount = Math.max(1, Math.ceil(wrapped.length / linesPerPage) || 1);

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");

  const pageIds: number[] = [];
  const contentIds: number[] = [];
  // Object 1 = catalog, 2 = pages tree, then pages + contents + font
  let nextId = 3;
  for (let i = 0; i < pageCount; i++) {
    pageIds.push(nextId++);
    contentIds.push(nextId++);
  }
  const fontId = nextId++;

  const kids = pageIds.map((id) => `${id} 0 R`).join(" ");
  objects.push(`<< /Type /Pages /Kids [ ${kids} ] /Count ${pageCount} >>`);

  for (let i = 0; i < pageCount; i++) {
    const contentId = contentIds[i];
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );

    const slice = wrapped.slice(i * linesPerPage, (i + 1) * linesPerPage);
    const ops: string[] = [];
    ops.push("BT");
    ops.push(`/F1 ${TITLE_SIZE} Tf`);
    ops.push(`${MARGIN_X} ${TITLE_Y} Td`);
    const pageTitle = pageCount > 1 ? `${title} (${i + 1}/${pageCount})` : title;
    ops.push(`(${escapePdfString(pageTitle)}) Tj`);
    ops.push(`/F1 ${BODY_SIZE} Tf`);
    ops.push(`0 ${BODY_START_Y - TITLE_Y} Td`);
    slice.forEach((line, idx) => {
      if (idx === 0) {
        ops.push(`(${escapePdfString(line)}) Tj`);
      } else {
        ops.push(`0 ${-LINE_HEIGHT} Td`);
        ops.push(`(${escapePdfString(line)}) Tj`);
      }
    });
    ops.push("ET");
    const stream = ops.join("\n");
    objects.push(`<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  }

  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");

  return assemblePdf(objects);
}

/** An object whose stream is raw bytes (e.g. a JPEG); `dict` must not include /Length. */
interface BinaryPdfObject {
  dict: string;
  data: Uint8Array;
}

function assemblePdf(objects: (string | BinaryPdfObject)[]): Uint8Array {
  const header = "%PDF-1.4\n";
  const chunks: Uint8Array[] = [textEncoder.encode(header)];
  const offsets = [0];
  let offset = byteLength(header);

  objects.forEach((body, i) => {
    offsets.push(offset);
    const parts: Uint8Array[] =
      typeof body === "string"
        ? [textEncoder.encode(`${i + 1} 0 obj\n${body}\nendobj\n`)]
        : [
            textEncoder.encode(
              `${i + 1} 0 obj\n${body.dict.replace(/>>\s*$/, ` /Length ${body.data.length} >>`)}\nstream\n`
            ),
            body.data,
            textEncoder.encode("\nendstream\nendobj\n"),
          ];
    for (const p of parts) {
      chunks.push(p);
      offset += p.length;
    }
  });

  const xrefStart = offset;
  const xrefLines = ["xref", `0 ${objects.length + 1}`, "0000000000 65535 f "];
  for (let i = 1; i <= objects.length; i++) {
    xrefLines.push(`${String(offsets[i]).padStart(10, "0")} 00000 n `);
  }
  const xref = xrefLines.join("\n") + "\n";
  chunks.push(textEncoder.encode(xref));
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  chunks.push(textEncoder.encode(trailer));

  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

/** Approximate Helvetica widths (font units / 1000). */
function helveticaWidth(text: string, size: number): number {
  let w = 0;
  for (const ch of text) {
    const b = charToWinAnsi(ch);
    if (b === 32) w += 278;
    else if (b >= 48 && b <= 57) w += 556;
    else if (b === 44 || b === 46 || b === 39) w += 278;
    else if (b === 45 || b === 163 || b === 128) w += 556;
    else if (b === 40 || b === 41) w += 333;
    else w += 500;
  }
  return (w * size) / 1000;
}

export type PdfBlock =
  | { kind: "title"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "text"; text: string; bold?: boolean }
  | { kind: "row"; label: string; value: string; bold?: boolean; indent?: boolean }
  | { kind: "rule" }
  | { kind: "spacer" }
  | { kind: "images"; images: PdfImage[] };

export interface PdfImage {
  data: Uint8Array;
  width: number;
  height: number;
  components: number;
}

/** Read width/height from a baseline or progressive JPEG. Returns null for anything else. */
export function readJpeg(data: Uint8Array): PdfImage | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < data.length) {
    if (data[i] !== 0xff) return null;
    const marker = data[i + 1]!;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = (data[i + 2]! << 8) | data[i + 3]!;
    // SOF0..SOF15 except DHT (C4), JPG (C8) and DAC (CC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = (data[i + 5]! << 8) | data[i + 6]!;
      const width = (data[i + 7]! << 8) | data[i + 8]!;
      const components = data[i + 9]!;
      if (!width || !height || ![1, 3, 4].includes(components)) return null;
      return { data, width, height, components };
    }
    i += 2 + len;
  }
  return null;
}

const IMAGES_PER_ROW = 3;
const IMAGE_GAP = 8;
const IMAGE_CELL_H = 116;

const AMOUNT_SIZE = 10;
const HEADING_SIZE = 12;
const STYLED_TITLE = 18;

function blockHeight(block: PdfBlock): number {
  if (block.kind === "title") return 26;
  if (block.kind === "heading") return 22;
  if (block.kind === "rule") return 14;
  if (block.kind === "spacer") return 10;
  if (block.kind === "images") return IMAGE_CELL_H + IMAGE_GAP;
  return 16;
}

/** One block per row of photos so a long set of photos can break across pages. */
function splitImageRows(blocks: PdfBlock[]): PdfBlock[] {
  return blocks.flatMap((block) => {
    if (block.kind !== "images") return [block];
    const rows: PdfBlock[] = [];
    for (let i = 0; i < block.images.length; i += IMAGES_PER_ROW) {
      rows.push({ kind: "images", images: block.images.slice(i, i + IMAGES_PER_ROW) });
    }
    return rows;
  });
}

export function buildStyledPdf(blocks: PdfBlock[]): Uint8Array {
  const pages: PdfBlock[][] = [];
  let current: PdfBlock[] = [];
  let y = PAGE_HEIGHT - 56;
  const top = PAGE_HEIGHT - 56;

  const flush = () => {
    if (current.length) pages.push(current);
    current = [];
    y = top;
  };

  for (const block of splitImageRows(blocks)) {
    const h = blockHeight(block);
    if (y - h < BOTTOM_MARGIN) flush();
    current.push(block);
    y -= h;
  }
  flush();
  if (pages.length === 0) pages.push([]);

  const objects: (string | BinaryPdfObject)[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  const pageIds: number[] = [];
  const contentIds: number[] = [];
  let nextId = 3;
  for (let i = 0; i < pages.length; i++) {
    pageIds.push(nextId++);
    contentIds.push(nextId++);
  }
  const regularFontId = nextId++;
  const boldFontId = nextId++;
  // Image XObjects come after the fonts, one per distinct photo, numbered in page order.
  const imageObjects = new Map<Uint8Array, { name: string; id: number; image: PdfImage }>();
  const pageImages = pages.map((page) =>
    page.flatMap((b) => (b.kind === "images" ? b.images : [])).map((image) => {
      let placed = imageObjects.get(image.data);
      if (!placed) {
        const id = nextId++;
        placed = { name: `Im${id}`, id, image };
        imageObjects.set(image.data, placed);
      }
      return placed;
    })
  );
  const kids = pageIds.map((id) => `${id} 0 R`).join(" ");
  objects.push(`<< /Type /Pages /Kids [ ${kids} ] /Count ${pages.length} >>`);

  const amountRight = PAGE_WIDTH - MARGIN_X;

  for (let i = 0; i < pages.length; i++) {
    const images = pageImages[i]!;
    const xobjects = images.length
      ? ` /XObject << ${[...new Set(images)].map((im) => `/${im.name} ${im.id} 0 R`).join(" ")} >>`
      : "";
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)}] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >>${xobjects} >> /Contents ${contentIds[i]} 0 R >>`
    );
    let cursorY = top;
    let imageIndex = 0;
    const ops: string[] = [];
    for (const block of pages[i]) {
      if (block.kind === "images") {
        const cellW = (amountRight - MARGIN_X - IMAGE_GAP * (IMAGES_PER_ROW - 1)) / IMAGES_PER_ROW;
        block.images.forEach((img, col) => {
          const placed = images[imageIndex++]!;
          const scale = Math.min(cellW / img.width, IMAGE_CELL_H / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          const x = MARGIN_X + col * (cellW + IMAGE_GAP) + (cellW - w) / 2;
          const y = cursorY - IMAGE_GAP / 2 - h;
          ops.push(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /${placed.name} Do Q`);
        });
        cursorY -= blockHeight(block);
        continue;
      }
      if (block.kind === "rule") {
        const ruleY = cursorY - 6;
        ops.push("0.75 w");
        ops.push("0.55 0.55 0.55 RG");
        ops.push(`${MARGIN_X} ${ruleY.toFixed(2)} m ${amountRight.toFixed(2)} ${ruleY.toFixed(2)} l S`);
        ops.push("0 0 0 RG");
        cursorY -= blockHeight(block);
        continue;
      }
      if (block.kind === "spacer") {
        cursorY -= blockHeight(block);
        continue;
      }

      const size =
        block.kind === "title" ? STYLED_TITLE : block.kind === "heading" ? HEADING_SIZE : AMOUNT_SIZE;
      const useBold =
        block.kind === "title" ||
        block.kind === "heading" ||
        (block.kind === "text" && block.bold) ||
        (block.kind === "row" && block.bold);
      const fontName = useBold ? "F2" : "F1";
      const textY = cursorY - (block.kind === "title" ? 14 : 11);

      if (block.kind === "row") {
        const x = block.indent ? MARGIN_X + 16 : MARGIN_X;
        const label = wrapLine(block.label, block.indent ? 70 : 74)[0] ?? "";
        ops.push("BT");
        ops.push(`/${fontName} ${size} Tf`);
        ops.push(`1 0 0 1 ${x} ${textY.toFixed(2)} Tm`);
        ops.push(`(${escapePdfString(label)}) Tj`);
        const valueWidth = helveticaWidth(block.value, size);
        ops.push(`1 0 0 1 ${(amountRight - valueWidth).toFixed(2)} ${textY.toFixed(2)} Tm`);
        ops.push(`(${escapePdfString(block.value)}) Tj`);
        ops.push("ET");
      } else {
        const text =
          block.kind === "title" || block.kind === "heading" || block.kind === "text"
            ? block.text
            : "";
        ops.push("BT");
        ops.push(`/${fontName} ${size} Tf`);
        ops.push(`1 0 0 1 ${MARGIN_X} ${textY.toFixed(2)} Tm`);
        ops.push(`(${escapePdfString(text)}) Tj`);
        ops.push("ET");
      }
      cursorY -= blockHeight(block);
    }
    if (pages.length > 1) {
      const footer = `${i + 1} / ${pages.length}`;
      ops.push("BT");
      ops.push(`/F1 9 Tf`);
      ops.push(`1 0 0 1 ${MARGIN_X} 36 Tm`);
      ops.push(`(${escapePdfString(footer)}) Tj`);
      ops.push("ET");
    }
    const stream = ops.join("\n");
    objects.push(`<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  }

  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objects.push(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
  );
  for (const im of imageObjects.values()) {
    const colorSpace =
      im.image.components === 1 ? "/DeviceGray" : im.image.components === 4 ? "/DeviceCMYK" : "/DeviceRGB";
    // Adobe CMYK JPEGs are stored inverted.
    const decode = im.image.components === 4 ? " /Decode [1 0 1 0 1 0 1 0]" : "";
    objects.push({
      dict: `<< /Type /XObject /Subtype /Image /Width ${im.image.width} /Height ${im.image.height} /ColorSpace ${colorSpace} /BitsPerComponent 8 /Filter /DCTDecode${decode} >>`,
      data: im.image.data,
    });
  }
  return assemblePdf(objects);
}
