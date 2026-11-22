const oldName = new RegExp(["bra", "in", "[\\s._-]*", "os", "(?:[\\s._-]*2)?"].join(""), "i");

export function findOldNames(text: string, file: string): string[] {
  const lines = new Set<number>();
  text.split(/\r?\n/).forEach((line, index) => { if (oldName.test(line)) lines.add(index + 1); });
  for (const match of text.matchAll(new RegExp(oldName.source, "gi"))) {
    lines.add(text.slice(0, match.index).split("\n").length);
  }
  return [...lines].sort((a, b) => a - b).map(line => `${file}:${line}: eski ürün adı`);
}

export function validateProductName(text: string, label: string): void {
  const matches = findOldNames(text, label);
  if (matches.length) throw new Error(matches.join("\n"));
}
