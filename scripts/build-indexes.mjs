// /info/ 허브, 홈의 전체 가이드 목록, sitemap.xml, feed.xml을 카탈로그에서 다시 만든다.
// 글을 추가한 뒤 `npm run build:index` 한 번이면 색인 경로가 전부 맞춰진다.
import { readFileSync, writeFileSync } from "node:fs";
import { loadPages, priorityFor, categoryLabels, site } from "./catalog.mjs";

const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const order = ["beginner", "planning", "certification", "safety", "onroad"];

const pages = loadPages();
const articles = pages.filter(p => p.type === "article");
const routes = pages.filter(p => p.type === "route");
const byCategory = order.map(c => [c, articles.filter(a => a.category === c)]).filter(([, list]) => list.length);

/* ---------- /info/ 허브 ---------- */

const card = p => `<article class="info-card"><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><a href="${p.url}">읽기</a></article>`;

const hubSections = [
  `<section id="route"><h2>상세 코스</h2><div class="info-grid">${routes.map(card).join("")}</div></section>`,
  ...byCategory.map(([c, list]) =>
    `<section id="${c}"><h2>${categoryLabels[c]} <span class="tag">${list.length}편</span></h2><div class="info-grid">${list.map(card).join("")}</div></section>`)
].join("\n");

const hubList = [...routes, ...articles];
const hubSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "전체 라이딩 가이드",
  description: "라이드모아의 자전거길 코스와 준비 가이드 전체 목록입니다.",
  url: `${site}/info/`,
  inLanguage: "ko-KR",
  mainEntity: {
    "@type": "ItemList",
    numberOfItems: hubList.length,
    itemListElement: hubList.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: site + p.url, name: p.title }))
  }
};

const hub = readFileSync("info/index.html", "utf8");
writeFileSync("info/index.html", hub.replace(
  /<main class="policy">[\s\S]*?<\/main>/,
  `<main class="policy">
    <nav class="breadcrumb" aria-label="현재 위치"><a href="/">홈</a><span>전체 가이드</span></nav>
    <h1>전체 라이딩 가이드</h1>
    <p>라이드모아의 코스 상세 페이지와 준비 가이드 ${hubList.length}편을 주제별로 모았습니다. 출발 전 확인해야 할 거리, 보급, 복귀 교통, 계절 위험을 기준으로 정리했습니다.</p>
    <p><a class="cta" href="/pages/routes-by-purpose.html">목적별로 보기</a> <a class="cta" href="/pages/routes-by-region.html">지역별로 보기</a> <a class="cta" href="/pages/routes-by-distance.html">거리별로 보기</a></p>
${hubSections}
  </main>`
), "utf8");

// 허브에는 원래 구조화 데이터가 없었다. 있으면 교체, 없으면 head 끝에 넣는다.
const hubLd = `<script type="application/ld+json">${JSON.stringify(hubSchema)}</script>`;
const hubNow = readFileSync("info/index.html", "utf8");
writeFileSync("info/index.html", /<script type="application\/ld\+json">[\s\S]*?<\/script>/.test(hubNow)
  ? hubNow.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, hubLd)
  : hubNow.replace("</head>", `  ${hubLd}\n</head>`), "utf8");

/* ---------- 홈의 전체 가이드 목록 ---------- */
// 모든 글이 홈에서 한 번에 크롤되도록, JS 없이 렌더되는 링크 목록을 둔다.

const homeBlock = `    <!-- build:guide-index -->
    <section class="home-section" id="all-guides">
      <div class="home-wrap">
        <div class="home-section-title">
          <div><p class="home-eyebrow">All Guides</p><h2>주제별 전체 가이드</h2></div>
          <a class="more-link" href="/info/">전체 보기 →</a>
        </div>
${byCategory.map(([c, list]) => `        <h3>${categoryLabels[c]}</h3>
        <ul class="guide-index">
${list.map(p => `          <li><a href="${p.url}">${esc(p.title)}</a></li>`).join("\n")}
        </ul>`).join("\n")}
      </div>
    </section>
    <!-- /build:guide-index -->`;

let home = readFileSync("index.html", "utf8");
home = home.includes("<!-- build:guide-index -->")
  ? home.replace(/ *<!-- build:guide-index -->[\s\S]*?<!-- \/build:guide-index -->/, homeBlock)
  : home.replace("  </main>", `${homeBlock}\n  </main>`);
writeFileSync("index.html", home, "utf8");

/* ---------- sitemap.xml ---------- */

writeFileSync("sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  pages.map(p => `  <url><loc>${p.loc}</loc><lastmod>${p.lastmod}</lastmod><changefreq>${p.type === "home" || p.type === "hub" ? "weekly" : "monthly"}</changefreq><priority>${priorityFor(p)}</priority></url>`).join("\n") +
  `\n</urlset>\n`, "utf8");

/* ---------- feed.xml ---------- */
// 네이버·빙 등 피드 기반 발견 경로용. 최근 갱신 20건.

const feedItems = [...articles, ...routes].sort((a, b) => b.lastmod.localeCompare(a.lastmod)).slice(0, 20);
const rfc822 = d => new Date(`${d}T00:00:00Z`).toUTCString();

writeFileSync("feed.xml",
  `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>라이드모아 - 전국 자전거길 여행 가이드</title>
    <link>${site}/</link>
    <description>자전거길 코스 선택, 이동 동선, 안전 준비, 계절별 주의사항을 정리하는 라이드모아의 최신 가이드입니다.</description>
    <language>ko</language>
    <lastBuildDate>${rfc822(feedItems[0].lastmod)}</lastBuildDate>
    <atom:link href="${site}/feed.xml" rel="self" type="application/rss+xml"/>
${feedItems.map(p => `    <item>
      <title>${esc(p.title)}</title>
      <link>${p.loc}</link>
      <guid isPermaLink="true">${p.loc}</guid>
      <pubDate>${rfc822(p.lastmod)}</pubDate>
      <description>${esc(p.description)}</description>
    </item>`).join("\n")}
  </channel>
</rss>
`, "utf8");

console.log(`pages=${pages.length} articles=${articles.length} routes=${routes.length} feed=${feedItems.length}`);
