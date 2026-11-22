import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { findOldNames, validateProductName } from "./isim-denetimi";

const scanFile = (file: string, text: string) => [...findOldNames(file, file), ...findOldNames(text, file)];
const readTrackedFile = (root: string, file: string) => readFileSync(join(root, file), "utf8");

test("satırlar arasına bölünmüş eski ad başlangıç satırında raporlanır", () => {
  const name = ["Bra", "in"].join("");
  expect(findOldNames(`Synapsery\n${name}\nos\n`, "fixture.txt")).toEqual(["fixture.txt:2: eski ürün adı"]);
  expect(findOldNames(`${name}os ${name}\nos\n${name}os`, "fixture.txt")).toEqual([
    "fixture.txt:1: eski ürün adı", "fixture.txt:3: eski ürün adı",
  ]);
});

test("dosya yollarındaki URL karakterleri gerçek dosya adı olarak okunur", () => {
  const root = mkdtempSync(join(tmpdir(), "isim-kilidi-"));
  try {
    for (const file of ["notes#1.md", "notes%20.md"]) {
      writeFileSync(join(root, file), "Synapsery");
      expect(readTrackedFile(root, file)).toBe("Synapsery");
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("kilit içeriği temiz olsa da eski adlı dosya yolunu reddeder", () => {
  const path = `docs/${["Bra", "in", "OS"].join("")}/guide.md`;
  expect(scanFile(path, "Synapsery").join("\n")).toContain(path);
  expect(scanFile("docs/Synapsery.md", "")).toEqual([]);
});

test("takipli dosyalarda eski ürün adı bulunmaz", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const files = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  expect(files.length).toBeGreaterThan(0);
  const matches = files.flatMap(file => scanFile(file, readTrackedFile(root, file)));
  expect(matches, matches.join("\n")).toEqual([]);
});

test.each(["OS", "OS 2", "OS2", "os", "os2", "os-surumler", " os", "-os", "OS.2", "_os", "_os2"])("kilit ekilen eski ad çeşidini yakalar: %s", suffix => {
  const planted = ["Bra", "in", suffix].join("");
  expect(findOldNames(`Synapsery\n${planted}\n`, "fixture.txt")).toEqual(["fixture.txt:2: eski ürün adı"]);
  expect(() => validateProductName(planted, "latest.json")).toThrow(/latest.json:1/);
});

test.each(["", "Synapsery", "Synapsery\nhttps://github.com/metegunesofficial/synapsery-surumler"])("temiz veya boş metne izin verir: %j", text => {
  expect(findOldNames(text, "fixture.txt")).toEqual([]);
  expect(() => validateProductName(text, "latest.json")).not.toThrow();
});
