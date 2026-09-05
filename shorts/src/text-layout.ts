// Conservative glyph widths prevent Korean copy from spilling into adjacent regions.
export const textUnits = (text: string) => [...text].reduce((n, c) => n + (/\s/.test(c) ? .35 : /[\x00-\x7f]/.test(c) ? .62 : 1), 0);
export function fitCopy(text: string, width: number, height: number, preferred: number, lineHeight = 1.12) {
  for (let size = preferred; size >= 18; size--) {
    const lines: string[] = [];
    for (const paragraph of text.split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (line && textUnits(next) * size > width) {lines.push(line); line = '';}
        // Split only a token that cannot fit even on a fresh line.
        for (const char of (line ? ` ${word}` : word)) {
          if (textUnits(line + char) * size > width) {lines.push(line); line = '';}
          line += char;
        }
      }
      lines.push(line);
    }
    if (lines.length * size * lineHeight <= height) return {fontSize: size, text: lines.join('\n')};
  }
  throw new Error('[layout:text-overflow] Copy cannot fit at the minimum 18px size; enlarge its region or shorten the copy');
}

