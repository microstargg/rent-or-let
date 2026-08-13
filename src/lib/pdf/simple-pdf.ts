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

function assemblePdf(objects: string[]): Uint8Array {
  const header = "%PDF-1.4\n";
  const chunks: Uint8Array[] = [textEncoder.encode(header)];
  const offsets = [0];
  let offset = byteLength(header);

  objects.forEach((body, i) => {
    const obj = `${i + 1} 0 obj\n${body}\nendobj\n`;
    const bytes = textEncoder.encode(obj);
    offsets.push(offset);
    chunks.push(bytes);
    offset += bytes.length;
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
  | { kind: "spacer" };

const AMOUNT_SIZE = 10;
const HEADING_SIZE = 12;
const STYLED_TITLE = 18;

function blockHeight(block: PdfBlock): number {
  if (block.kind === "title") return 26;
  if (block.kind === "heading") return 22;
  if (block.kind === "rule") return 14;
  if (block.kind === "spacer") return 10;
  return 16;
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

  for (const block of blocks) {
    const h = blockHeight(block);
    if (y - h < BOTTOM_MARGIN) flush();
    current.push(block);
    y -= h;
  }
  flush();
  if (pages.length === 0) pages.push([]);

  const objects: string[] = [];
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
  const kids = pageIds.map((id) => `${id} 0 R`).join(" ");
  objects.push(`<< /Type /Pages /Kids [ ${kids} ] /Count ${pages.length} >>`);

  const amountRight = PAGE_WIDTH - MARGIN_X;

  for (let i = 0; i < pages.length; i++) {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)}] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`
    );
    let cursorY = top;
    const ops: string[] = [];
    for (const block of pages[i]) {
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
  return assemblePdf(objects);
}
