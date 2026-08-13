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
