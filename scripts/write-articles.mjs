// 신규 글을 기존 글과 같은 구조로 찍어낸다.
// head 메타와 구조화 데이터, 도해, 이동 경로는 build-metadata.mjs 가 이어서 채운다.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { articles } from "./articles-data.mjs";

const site = "https://trevelmoa.com";
const ads = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5804969457082424"
     crossorigin="anonymous"></script>`;

const esc = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function page(a) {
  const toc = [["s0", "요약"], ...a.sections.map((s, i) => [`s${i + 1}`, s[0]]),
    ["sf", "FAQ"], ["sr", "출처와 업데이트"]];
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${ads}
  <title>${esc(a.title)} | RideMoa</title>
  <meta name="description" content="${esc(a.description)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="${site}/${a.path}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${esc(a.title)} | RideMoa">
  <meta property="og:description" content="${esc(a.description)}">
  <meta property="og:url" content="${site}/${a.path}">
  <meta property="og:image" content="${site}/assets/images/webp/home-hero-og.webp">
  <link rel="stylesheet" href="/assets/css/styles.css">
</head>
<body>
  <header class="site-header">
    <a class="brand" href="/">라이드모아</a>
    <nav class="nav" aria-label="주요 메뉴">
      <a href="/">홈</a>
      <a href="/pages/routes-by-region.html">지역별</a>
      <a href="/pages/routes-by-distance.html">거리별</a>
      <a href="/pages/routes-by-purpose.html">목적별</a>
      <a href="/info/">전체 가이드</a>
      <a href="/calendar/">계절 캘린더</a>
      <a href="/pages/about.html">소개</a>
      <a href="/pages/contact.html">문의</a>
    </nav>
  </header>

  <main>
    <section class="article-hero">
      <p class="eyebrow">${a.eyebrow}</p>
      <h1>${a.title}</h1>
      <p>${a.description.split(/(?<=다\.)\s/)[0]}</p>
    </section>
    <div class="article-layout">
      <article class="article-body">
        <h2 id="s0">요약</h2>
        <table class="fact-table">${a.facts.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}</table>
        <p class="info-note">${a.note}</p>
${a.sections.map((s, i) => `        <h2 id="s${i + 1}">${s[0]}</h2>
${s.slice(1).map(p => `        <p>${p}</p>`).join("\n")}`).join("\n")}
        <section class="faq" id="sf">
          <h2>FAQ</h2>
${a.faq.map(([q, ans]) => `          <details><summary>${q}</summary><p>${ans}</p></details>`).join("\n")}
        </section>
        <section id="sr">
          <h2>출처와 업데이트</h2>
          <p>최종 업데이트: ${a.updated}. 거리, 운영시간, 통제 구간은 바뀔 수 있으므로 출발 전 공식 채널에서 다시 확인하세요.</p>
          <ul>${a.sources.map(([n, u]) => `<li><a href="${u}" rel="nofollow noopener">${n}</a></li>`).join("")}</ul>
        </section>
        <section>
          <h2>함께 읽기</h2>
          <ul>${a.related.map(([u, t, why]) => `<li><a href="${u}">${t}</a> - ${why}</li>`).join("")}</ul>
        </section>
      </article>
      <aside class="toc" aria-label="목차">${toc.map(([id, t]) => `<a href="#${id}">${t}</a>`).join("")}<div class="side-box"><strong>${a.tip[0]}</strong><p>${a.tip[1]}</p></div></aside>
    </div>
  </main>
  <footer class="site-footer">
    <p>© 2026 라이드모아. 공공기관과 지자체 공개 자료를 참고하되, 운영시간·교통·통제 정보는 방문 전 공식 채널에서 다시 확인하세요.</p>
    <p><a href="/pages/privacy.html">개인정보처리방침</a> · <a href="/pages/contact.html">문의</a></p>
  </footer>
</body>
</html>
`;
}

let written = 0;
for (const a of articles) {
  if (existsSync(a.path) && !process.env.OVERWRITE) { console.log(`skip (이미 있음): ${a.path}`); continue; }
  mkdirSync(dirname(a.path), { recursive: true });
  writeFileSync(a.path, page(a), "utf8");
  written++;
}
console.log(`articles written: ${written}`);
