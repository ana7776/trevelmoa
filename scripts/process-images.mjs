import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const manifestPath = path.join(root, "data", "image-assets.json");
const quality = Number(process.env.IMAGE_WEBP_QUALITY || 82);

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function convertSlot(slot) {
  const source = path.join(root, slot.source);
  if (!(await exists(source))) {
    return { id: slot.id, status: "missing-source", source: slot.source };
  }

  const webp = path.join(root, slot.webp);
  const card = path.join(root, slot.card);
  const og = path.join(root, slot.og);
  await Promise.all([ensureDir(webp), ensureDir(card), ensureDir(og)]);

  await sharp(source)
    .rotate()
    .resize({ width: 1600, height: 900, fit: "cover" })
    .webp({ quality })
    .toFile(webp);

  await sharp(source)
    .rotate()
    .resize({ width: 800, height: 450, fit: "cover" })
    .webp({ quality })
    .toFile(card);

  await sharp(source)
    .rotate()
    .resize({ width: 1200, height: 630, fit: "cover" })
    .webp({ quality })
    .toFile(og);

  return { id: slot.id, status: "converted", webp: slot.webp, card: slot.card, og: slot.og };
}

const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const results = [];
for (const slot of manifest.slots || []) {
  results.push(await convertSlot(slot));
}

console.log(JSON.stringify({
  quality,
  captionTemplate: manifest.captionTemplate,
  results
}, null, 2));
