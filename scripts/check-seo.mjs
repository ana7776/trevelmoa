// 색인 점검 자동화. SEO-CHECKLIST.md의 "자동 점검" 항목을 그대로 실행한다.
// 실패가 하나라도 있으면 1로 종료하므로 배포 전 게이트로 쓸 수 있다.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadPages, site } from "./catalog.mjs";

const fails = [];
const warns = [];
const fail = (rule, detail) => fails.push(`${rule}: ${detail}`);
const warn = (rule, detail) => warns.push(`${rule}: ${detail}`);

const allHtml = (dir = ".", out = []) => {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules") continue;
    const full = join(dir, name).replace(/^\.\//, "");
    if (statSync(full).isDirectory()) allHtml(full, out);
    else if (full.endsWith(".html")) out.push(full);
  }
  return out;
};

const read = f => readFileSync(f, "utf8").replace(/^﻿/, "");

// URL 경로를 실제 파일로 푼다. 없으면 null.
const resolve = url => {
  let p = url.split(/[#?]/)[0].replace(/^\//, "");
  if (p === "" || p.endsWith("/")) p += "index.html";
  return existsSync(p) ? p : null;
};

const pages = loadPages();
const files = allHtml();

/* 1. 리디렉션 타깃이 실제로 존재하는가 (GSC "리디렉션 오류") */
for (const line of read("_redirects").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const [from, to] = t.split(/\s+/);
  if (to.includes("*")) continue;
  if (!resolve(to)) fail("redirect", `${from} -> ${to} 타깃 없음`);
  if (from === to) fail("redirect", `${from} 자기 자신으로 리디렉션`);
}

/* 2. meta refresh 소프트 리디렉션이 남아 있지 않은가 */
for (const f of files) {
  if (/http-equiv="refresh"/i.test(read(f))) fail("meta-refresh", `${f} - 서버 301(_redirects)로 옮기세요`);
}

/* 3. canonical 이 자기 자신을 가리키는가 */
for (const p of pages) {
  const html = read(p.file);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (!canonical) fail("canonical", `${p.file} 없음`);
  else if (canonical !== p.loc) fail("canonical", `${p.file} -> ${canonical} (기대: ${p.loc})`);
  if (/<meta name="robots"[^>]*noindex/i.test(html)) fail("robots", `${p.file} 이 noindex 인데 사이트맵 대상입니다`);
}

/* 4. 사이트맵이 실제 페이지 집합과 일치하는가 */
const sitemapLocs = new Set([...read("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]));
for (const p of pages) if (!sitemapLocs.has(p.loc)) fail("sitemap", `${p.loc} 누락`);
for (const loc of sitemapLocs) {
  if (!resolve(loc.replace(site, ""))) fail("sitemap", `${loc} 파일 없음`);
  if (!pages.some(p => p.loc === loc)) warn("sitemap", `${loc} 이 카탈로그에 없습니다`);
}

/* 5. 내부 링크가 전부 살아 있는가 */
for (const f of files) {
  for (const m of read(f).matchAll(/href="(\/[^"]*)"/g)) {
    const href = m[1];
    if (href.startsWith("//") || /\.(css|js|json|xml|svg|webp|png|jpg|txt)$/.test(href)) continue;
    if (!resolve(href)) fail("dead-link", `${f} -> ${href}`);
  }
}

/* 6. 글마다 내부 유입 링크가 있는가 (크롤 발견 경로) */
const inbound = new Map(pages.map(p => [p.url, 0]));
for (const f of files) {
  for (const m of read(f).matchAll(/href="(\/[^"#?]*)"/g)) {
    if (m[1] === "/" + f || !inbound.has(m[1])) continue;
    inbound.set(m[1], inbound.get(m[1]) + 1);
  }
}
for (const p of pages) {
  if (p.type === "home") continue;
  const n = inbound.get(p.url);
  if (n === 0) fail("orphan", `${p.url} 로 가는 내부 링크가 없습니다`);
  else if (n < 2) warn("orphan", `${p.url} 내부 링크 ${n}개뿐`);
}

/* 7. title / description 이 있고 중복되지 않는가 */
const seen = new Map();
for (const p of pages) {
  if (!p.title) fail("title", `${p.file} 없음`);
  if (!p.description) fail("description", `${p.file} 없음`);
  else if (p.description.length > 160) warn("description", `${p.file} ${p.description.length}자 (160자 이하 권장)`);
  const key = p.title + "|" + p.description;
  if (seen.has(key)) fail("duplicate", `${p.file} 의 title+description 이 ${seen.get(key)} 와 동일`);
  seen.set(key, p.file);
}

/* 8. og:image 가 절대 경로 래스터 이미지인가 (SVG 는 미리보기에서 무시됨) */
for (const p of pages) {
  const og = read(p.file).match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  if (!og) fail("og:image", `${p.file} 없음`);
  else if (!og.startsWith("http")) fail("og:image", `${p.file} 상대 경로`);
  else if (og.endsWith(".svg")) fail("og:image", `${p.file} SVG 는 소셜/검색 미리보기에서 무시됩니다`);
  else if (!resolve(og.replace(site, ""))) fail("og:image", `${p.file} -> ${og} 파일 없음`);
}

/* 9. 구조화 데이터가 파싱되는가 */
for (const f of files) {
  for (const m of read(f).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { fail("ld+json", `${f} - ${e.message}`); }
  }
  if (/class="article-body"/.test(read(f)) && !/"@type":"Article"/.test(read(f))) {
    fail("ld+json", `${f} 본문 글인데 Article 스키마가 없습니다`);
  }
}

/* 10. 피드가 살아 있는가 */
const feedLinks = [...read("feed.xml").matchAll(/<link>([^<]+)<\/link>/g)].map(m => m[1]);
for (const l of feedLinks) if (l !== `${site}/` && !resolve(l.replace(site, ""))) fail("feed", `${l} 파일 없음`);

/* ---- 결과 ---- */
for (const w of warns) console.log(`  WARN  ${w}`);
for (const f of fails) console.log(`  FAIL  ${f}`);
console.log(`\n페이지 ${pages.length}개 / 사이트맵 ${sitemapLocs.size}개 / 경고 ${warns.length} / 실패 ${fails.length}`);
if (fails.length) process.exit(1);
console.log("색인 자동 점검 통과");
