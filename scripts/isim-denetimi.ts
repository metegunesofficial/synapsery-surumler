const oldName = new RegExp(["bra", "in", "[\\s._-]*", "os", "(?:[\\s._-]*2)?"].join(""), "i");

export function findOldNames(text: string, file: string): string[] {
  return text.split(/\r?\n/).flatMap((line, index) => oldName.test(line) ? [`${file}:${index + 1}: eski ürün adı`] : []);
}

export function validateProductName(text: string, label: string): void {
  const matches = findOldNames(text, label);
  if (matches.length) throw new Error(matches.join("\n"));
}
