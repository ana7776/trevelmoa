import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as cheerio from "cheerio";
import sharp from "sharp";
import { fetch } from "undici";
import crypto from "node:crypto";
import path from "node:path";

const required = [
  "CLOUDFLARE_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_BASE_URL",
  "CRAWL_TARGET_URLS"
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

const sourceUrls = process.env.CRAWL_TARGET_URLS
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function toAbsoluteUrl(src, baseUrl) {
  try {
    return new URL(src, baseUrl).toString();
  } catch {
    return null;
  }
}

function createObjectKey(imageUrl) {
  const url = new URL(imageUrl);
  const baseName = path.basename(url.pathname).replace(/\.[a-z0-9]+$/i, "") || "image";
  const hash = crypto.createHash("sha256").update(imageUrl).digest("hex").slice(0, 12);
  return `bike-routes/${baseName}-${hash}.webp`;
}

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "RideMoa image optimizer; contact=contact@trevelmoa.com"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Skipped non-image resource: ${url}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function uploadWebp(buffer, key) {
  const webp = await sharp(buffer)
    .resize({ width: 1400, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();

  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: webp,
    ContentType: "image/webp",
    CacheControl: "public, max-age=31536000, immutable"
  }));

  return `${process.env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
}

async function collectImages(pageUrl) {
  const response = await fetch(pageUrl, {
    headers: {
      "user-agent": "RideMoa content research; contact=contact@trevelmoa.com"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page ${pageUrl}: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const images = [];

  $("img").each((_, img) => {
    const src = $(img).attr("src") || $(img).attr("data-src");
    const alt = ($(img).attr("alt") || "").trim();
    const absolute = src ? toAbsoluteUrl(src, pageUrl) : null;
    if (absolute) images.push({ url: absolute, alt, sourcePage: pageUrl });
  });

  return images;
}

const uploaded = [];

for (const pageUrl of sourceUrls) {
  const images = await collectImages(pageUrl);

  for (const image of images) {
    try {
      const original = await fetchBuffer(image.url);
      const key = createObjectKey(image.url);
      const publicUrl = await uploadWebp(original, key);
      uploaded.push({ ...image, publicUrl });
      console.log(JSON.stringify({ status: "uploaded", publicUrl, source: image.url }));
    } catch (error) {
      console.warn(JSON.stringify({ status: "skipped", source: image.url, reason: error.message }));
    }
  }
}

console.log(JSON.stringify({ totalUploaded: uploaded.length, uploaded }, null, 2));
