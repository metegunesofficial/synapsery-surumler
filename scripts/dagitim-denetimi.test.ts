import { expect, test } from "bun:test";
import { extractHttpLinks, validateManifest, validateReleaseTag, validateStatus } from "./dagitim-denetimi";

const fixture = () => ({
  version: "0.1.48",
  pub_date: "2026-11-19T16:41:28.246Z",
  platforms: {
    "windows-x86_64": {
      url: "https://github.com/metegunesofficial/brainos-surumler/releases/download/v0.1.48/Synapsery.zip",
      signature: btoa("trusted comment: timestamp:1795106410\tfile:Synapsery.zip\n"),
    },
  },
});

test("valid fixture accepts the legacy repository URL and matching release", () => {
  expect(validateManifest(JSON.stringify(fixture())).version).toBe("0.1.48");
  expect(() => validateReleaseTag("https://github.com/metegunesofficial/synapsery-surumler/releases/tag/v0.1.48", "0.1.48")).not.toThrow();
});

test.each([
  ["version mismatch", (f: ReturnType<typeof fixture>) => { f.version = "0.1.49"; }, /version.*URL/],
  ["missing signature", (f: ReturnType<typeof fixture>) => { delete (f.platforms["windows-x86_64"] as Partial<typeof f.platforms["windows-x86_64"]>).signature; }, /signature/],
  ["file-name mismatch", (f: ReturnType<typeof fixture>) => { f.platforms["windows-x86_64"].signature = btoa("file:Other.zip\n"); }, /file:/],
  ["empty platforms", (f: ReturnType<typeof fixture>) => { f.platforms = {} as typeof f.platforms; }, /platforms/],
  ["invalid semver", (f: ReturnType<typeof fixture>) => { f.version = "01.1.48"; }, /semver/],
  ["invalid date", (f: ReturnType<typeof fixture>) => { f.pub_date = "not a date"; }, /pub_date/],
  ["invalid base64", (f: ReturnType<typeof fixture>) => { f.platforms["windows-x86_64"].signature = "%%%"; }, /base64/],
  ["non-http URL", (f: ReturnType<typeof fixture>) => { f.platforms["windows-x86_64"].url = "file:///v0.1.48/Synapsery.zip"; }, /HTTP/],
])("rejects %s", (_name, mutate, error) => {
  const data = fixture();
  mutate(data);
  expect(() => validateManifest(JSON.stringify(data))).toThrow(error);
});

test.each(["", "{", "null", "[]"])("rejects invalid manifest %j", (data) => {
  expect(() => validateManifest(data)).toThrow();
});

test.each(["2026-11-19", "2026-11-19T16:41:28", "2026-11-19 16:41:28Z", "2026-11-19T25:41:28Z"])("rejects incomplete or invalid timestamp %s", pub_date => {
  expect(() => validateManifest(JSON.stringify({ ...fixture(), pub_date }))).toThrow(/pub_date/);
});

test.each(["2026-11-19T16:41:28Z", "2026-11-19t16:41:28.246z", "2026-11-19T16:41:28+03:00", "2026-11-19T16:41:28.1-05:30"])("accepts RFC 3339 timestamp %s", pub_date => {
  expect(validateManifest(JSON.stringify({ ...fixture(), pub_date })).pub_date).toBe(pub_date);
});

test("release tag must match, not merely contain the version", () => {
  expect(() => validateReleaseTag("https://github.com/o/r/releases/tag/v0.1.49", "0.1.48")).toThrow(/tag/);
  expect(() => validateReleaseTag("https://github.com/o/r/releases/latest", "0.1.48")).toThrow(/tag/);
});

test.each(["windws-x86_64", "windows-x64", "linux-", "darwin-aarch64-", "windows-x86_64-nsis-extra", "windows-universal", ""])("rejects invalid platform target %j", target => {
  const data = fixture();
  expect(() => validateManifest(JSON.stringify({ ...data, platforms: { [target]: data.platforms["windows-x86_64"] } }))).toThrow(/Tauri platform/);
});

test.each(["windows-x86_64", "linux-i686", "linux-armv7", "windows-x86_64-nsis", "windows-x86_64-msi", "linux-x86_64-appimage", "linux-x86_64-deb", "linux-x86_64-rpm", "darwin-aarch64-app", "darwin-universal", "darwin-universal-app"])("accepts Tauri platform target %s", target => {
  const data = fixture();
  expect(validateManifest(JSON.stringify({ ...data, platforms: { [target]: data.platforms["windows-x86_64"] } })).platforms).toHaveProperty(target);
});

test("HTTP checks distinguish asset 2xx from README below 400", () => {
  expect(() => validateStatus(206, "asset", true)).not.toThrow();
  expect(() => validateStatus(302, "asset", true)).toThrow();
  expect(() => validateStatus(302, "README", false)).not.toThrow();
  expect(() => validateStatus(404, "README", false)).toThrow(/404/);
});

test("extracts Markdown, HTML and bare HTTP links without duplicates", () => {
  expect(extractHttpLinks('**[a](https://a.test/x)** <https://b.test> <a href="http://c.test">c</a> https://a.test/x')).toEqual([
    "https://a.test/x", "https://b.test", "http://c.test",
  ]);
  expect(extractHttpLinks("no links")).toEqual([]);
});
