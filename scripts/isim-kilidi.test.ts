import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { findOldNames, validateProductName } from "./isim-denetimi";

test("takipli dosyalarda eski ürün adı bulunmaz", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const files = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  expect(files.length).toBeGreaterThan(0);
  const matches = files.flatMap(file => findOldNames(readFileSync(new URL(file, new URL("../", import.meta.url)), "utf8"), file));
  expect(matches, matches.join("\n")).toEqual([]);
});

test.each(["OS", "OS 2", "OS2", "os", "os2", "os-surumler", " os", "-os", "OS.2"])("kilit ekilen eski ad çeşidini yakalar: %s", suffix => {
  const planted = ["Bra", "in", suffix].join("");
  expect(findOldNames(`Synapsery\n${planted}\n`, "fixture.txt")).toEqual(["fixture.txt:2: eski ürün adı"]);
  expect(() => validateProductName(planted, "latest.json")).toThrow(/latest.json:1/);
});

test.each(["", "Synapsery", "Synapsery\nhttps://github.com/metegunesofficial/synapsery-surumler"])("temiz veya boş metne izin verir: %j", text => {
  expect(findOldNames(text, "fixture.txt")).toEqual([]);
  expect(() => validateProductName(text, "latest.json")).not.toThrow();
});
