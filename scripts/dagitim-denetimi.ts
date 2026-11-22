import { validateProductName } from "./isim-denetimi";

type Platform = { url: string; signature: string };
type Manifest = { version: string; pub_date: string; platforms: Record<string, Platform> };

const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/;
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const timestamp = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])[Tt](?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:[Zz]|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

function validateJsonNames(value: unknown, label: string): void {
  if (typeof value === "string") validateProductName(value, label);
  else if (Array.isArray(value)) value.forEach((item, index) => validateJsonNames(item, `${label}[${index}]`));
  else if (object(value)) {
    for (const [key, item] of Object.entries(value)) {
      validateProductName(key, `${label}: key`);
      validateJsonNames(item, `${label}.${key}`);
    }
  }
}

export function validateManifest(text: string): Manifest {
  validateProductName(text, "latest.json");
  let data: unknown;
  try { data = JSON.parse(text); }
  catch { throw new Error("latest.json: geçerli JSON değil / invalid JSON"); }
  if (!object(data)) throw new Error("latest.json: JSON object gerekli");
  if (typeof data.version !== "string" || !semver.test(data.version)) throw new Error("version: geçerli semver gerekli");
  if (typeof data.pub_date !== "string" || !timestamp.test(data.pub_date) || !Number.isFinite(Date.parse(data.pub_date))) throw new Error("pub_date: geçerli RFC 3339 zaman damgası gerekli");
  if (!object(data.platforms) || Object.keys(data.platforms).length === 0) throw new Error("platforms: en az bir platform gerekli");
  for (const [name, platform] of Object.entries(data.platforms)) {
    if (!/^(?:(?:linux|darwin|windows)-(?:x86_64|aarch64|i686|armv7)|darwin-universal)(?:-[a-z0-9]+)?$/.test(name)) throw new Error(`${name}: geçerli Tauri platform hedefi gerekli`);
    if (!object(platform) || typeof platform.url !== "string") throw new Error(`${name}: URL gerekli`);
    validateProductName(platform.url, `${name}: URL`);
    let decodedUrl: string;
    try { decodedUrl = decodeURIComponent(platform.url); }
    catch { throw new Error(`${name}: URL geçerli yüzde kodlaması gerekli`); }
    validateProductName(decodedUrl, `${name}: URL`);
    const url = new URL(platform.url);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error(`${name}: HTTP(S) URL gerekli`);
    if (!url.pathname.includes(`/v${data.version}/`)) throw new Error(`${name}: version ile URL uyuşmuyor`);
    const basename = decodeURIComponent(url.pathname.split("/").at(-1)!);
    if (!basename) throw new Error(`${name}: URL dosya adı boş`);
    const signature = platform.signature;
    if (typeof signature !== "string" || !signature.trim()) throw new Error(`${name}: signature boş veya eksik`);
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(signature)) throw new Error(`${name}: signature geçerli base64 değil`);
    const decoded = atob(signature);
    if (!decoded.split(/\s+/).includes(`file:${basename}`)) throw new Error(`${name}: signature file:${basename} içermiyor`);
  }
  validateJsonNames(data, "latest.json");
  return data as Manifest;
}

export function validateReleaseTag(finalUrl: string, version: string): void {
  const tag = /\/releases\/tag\/([^/]+)$/.exec(new URL(finalUrl).pathname)?.[1];
  if (!tag || decodeURIComponent(tag) !== `v${version}`) throw new Error(`latest release tag uyuşmuyor: beklenen v${version}, URL ${finalUrl}`);
}

export function validateStatus(status: number, label: string, asset: boolean): void {
  if (status < 200 || status >= (asset ? 300 : 400)) throw new Error(`${label}: HTTP ${status}`);
}

export function extractHttpLinks(markdown: string): string[] {
  return [...new Set((markdown.match(/https?:\/\/(?:[^\s<>"'`*()\[\]]|\([^\s<>"'`]*?\))+/g) ?? []).map(link => link.replace(/[.,;!?]+$/, "")))];
}

async function request(url: string, method: string): Promise<Response> {
  return fetch(url, { method, redirect: "follow", signal: AbortSignal.timeout(30_000) });
}

async function main(): Promise<void> {
  const releaseUrl = "https://github.com/metegunesofficial/synapsery-surumler/releases/latest";
  const manifestResponse = await request(`${releaseUrl}/download/latest.json`, "GET");
  validateStatus(manifestResponse.status, "latest.json", true);
  const manifest = validateManifest(await manifestResponse.text());
  const releaseResponse = await request(releaseUrl, "HEAD");
  validateStatus(releaseResponse.status, "latest release", true);
  validateReleaseTag(releaseResponse.url, manifest.version);
  console.log(`OK: latest.json ve release tag v${manifest.version}`);
  for (const [name, platform] of Object.entries(manifest.platforms)) {
    const response = await request(platform.url, "HEAD");
    validateStatus(response.status, `${name}: ${platform.url}`, true);
    console.log(`OK: ${name} HTTP ${response.status} (yönlendirmeler takip edildi)`);
  }
  const links = extractHttpLinks(await Bun.file(new URL("../README.md", import.meta.url)).text());
  for (const link of links) {
    const response = await request(link, "GET");
    await response.body?.cancel();
    validateStatus(response.status, link, false);
    console.log(`OK: README HTTP ${response.status} ${link}`);
  }
  console.log(`Dağıtım denetimi başarılı: ${Object.keys(manifest.platforms).length} platform, ${links.length} README bağlantısı.`);
}

if (import.meta.main) {
  main().catch(error => {
    console.error(`Dağıtım denetimi başarısız / failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
