/**
 * 사이트 계층 구조를 data/site-structure.json 기준으로 반영한다.
 *
 *  1. 분류별 인덱스 페이지 생성        /info/{분류}/index.html
 *  2. 글 페이지에 breadcrumb 삽입      홈 / 전체 가이드 / 분류 / 현재 글
 *  3. BreadcrumbList 구조화 데이터 삽입
 *  4. "함께 읽기" 관련 글 3개로 구성   같은 분류 2개 + 다음 단계 1개
 *
 * 실행: node scripts/build-structure.mjs
 * 여러 번 실행해도 결과가 같도록(멱등) 기존 블록을 교체하는 방식으로 동작한다.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

const SITE = "https://trevelmoa.com";
const TODAY = "2026-08-23";
const structure = JSON.parse(readFileSync("data/site-structure.json", "utf8"));

const ADSENSE = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5804969457082424"
     crossorigin="anonymous"></script>`;

const NAV = `  <header class="site-header">
    <a class="brand" href="/">라이드모아</a>
    <nav class="nav" aria-label="주요 메뉴">
      <a href="/">홈</a>
      <a href="/info/">목적별</a>
      <a href="/pages/routes-by-region.html">지역별</a>
      <a href="/calendar/">계절 캘린더</a>
      <a href="/pages/about.html">소개</a>
      <a href="/pages/contact.html">문의</a>
    </nav>
  </header>`;

const FOOTER = `  <footer class="site-footer">
    <p>© 2026 라이드모아. 공공기관과 지자체 공개 자료를 참고하되, 운영시간·교통·통제 정보는 방문 전 공식 채널에서 다시 확인하세요.</p>
    <p class="foot-links"><a href="/pages/about.html">소개</a> · <a href="/pages/contact.html">문의</a> · <a href="/pages/privacy.html">개인정보처리방침</a> · <a href="/pages/terms.html">이용약관</a> · <a href="/pages/privacy.html#ads">광고·쿠키 안내</a></p>
  </footer>`;

/** 글 메타데이터를 파일에서 직접 읽는다. */
function readMeta(file) {
  const html = readFileSync(file, "utf8").replace(/^﻿/, "");
  const pick = (re) => (html.match(re) || [])[1] || "";
  let desc = pick(/<meta name="description" content="(.*?)"/s);
  desc = desc.split("출발 전 거리, 보급")[0].split("공식 확인 지점도")[0].trim();
  return {
    title: pick(/<title>(.*?)<\/title>/s).replace(" | RideMoa", ""),
    desc,
    date: pick(/"dateModified":"(.*?)"/) || TODAY
  };
}

/** 분류별 글 목록 (파일 시스템이 기준) */
function articlesOf(key) {
  const dir = `info/${key}`;
  return readdirSync(dir)
    .filter((f) => f.endsWith(".html") && f !== "index.html")
    .sort()
    .map((f) => ({ slug: f.replace(".html", ""), url: `/${dir}/${f}`, file: path.join(dir, f), ...readMeta(path.join(dir, f)) }));
}

const byCategory = new Map(structure.categories.map((c) => [c.key, { meta: c, items: articlesOf(c.key) }]));
const allBySlug = new Map();
for (const [key, { items }] of byCategory) for (const a of items) allBySlug.set(a.slug, { ...a, category: key });
for (const r of structure.routes) allBySlug.set(r.url, { url: r.url, title: r.name });

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---------------------------------------------------------------- 1. 분류 인덱스 */

function categoryIndex(cat, items) {
  const url = `${SITE}/info/${cat.key}/`;
  const description = `${cat.lead} 라이드모아의 ${cat.name} 분류 글 ${items.length}편을 한곳에서 확인할 수 있습니다.`;
  const others = structure.categories.filter((c) => c.key !== cat.key);

  const cards = items
    .map(
      (a) =>
        `      <article class="info-card"><h3>${esc(a.title)}</h3><p>${esc(a.desc)}</p><a href="${a.url}">읽기</a></article>`
    )
    .join("\n");

  const rows = items
    .map((a) => `      <tr><td><a href="${a.url}">${esc(a.title)}</a></td><td class="col-date">${a.date}</td></tr>`)
    .join("\n");

  const siblings = others
    .map((c) => `<a href="/info/${c.key}/">${c.name}</a>`)
    .join(" · ");

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "전체 가이드", item: `${SITE}/info/` },
      { "@type": "ListItem", position: 3, name: cat.name, item: url }
    ]
  };

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    headline: `${cat.title} | 라이드모아`,
    description,
    url,
    dateModified: TODAY,
    publisher: { "@type": "Organization", name: "라이드모아" },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: a.title,
        url: `${SITE}${a.url}`
      }))
    }
  };

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${ADSENSE}
  <title>${cat.title} | RideMoa</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${cat.title} | RideMoa">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE}/assets/images/route-hero.svg">
  <link rel="icon" href="/assets/images/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/css/styles.css">
  <script type="application/ld+json">${JSON.stringify(collectionLd)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
</head>
<body>
${NAV}
<main class="policy">
<nav class="breadcrumb" aria-label="현재 위치"><a href="/">홈</a><span><a href="/info/">전체 가이드</a></span><span aria-current="page">${cat.name}</span></nav>
<h1>${cat.title}</h1>
<p>${cat.lead}</p>
<p>${cat.intro}</p>
<p class="info-note"><strong>읽는 순서</strong> · ${cat.readOrder}</p>

<h2>${cat.name} 분류 글 ${items.length}편</h2>
<div class="info-grid">
${cards}
</div>

<h2>최종 확인일</h2>
<table class="fact-table">
  <thead><tr><th scope="col">글</th><th scope="col" class="col-date">최종 확인일</th></tr></thead>
  <tbody>
${rows}
  </tbody>
</table>

<h2>다른 분류</h2>
<p>${siblings}</p>
<p class="info-note">전체 글을 한 번에 보려면 <a href="/info/">목적별 가이드 전체</a>를, 갈 지역이 정해져 있다면 <a href="/pages/routes-by-region.html">지역별 코스</a>를 이용하세요. 거리와 소요시간으로 좁히려면 <a href="/#finder">홈의 코스 찾기</a>에서 조건을 고르면 됩니다.</p>
</main>
${FOOTER}
</body>
</html>
`;
}

let created = 0;
for (const [key, { meta, items }] of byCategory) {
  writeFileSync(`info/${key}/index.html`, categoryIndex(meta, items), "utf8");
  created++;
}
console.log(`분류 인덱스 ${created}개 생성`);

/* ---------------------------------------------------------------- 1-2. 지역별 코스 허브 */

/**
 * 지역별에는 "지역이 특정되는" 콘텐츠만 넣는다.
 * 지역과 무관한 준비 글은 목적별(/info/)이 담당하므로 두 허브의 목록이 겹치지 않는다.
 */
function regionHub() {
  const url = `${SITE}/pages/routes-by-region.html`;
  const total = structure.regions.reduce((n, r) => n + 1 + r.articles.length, 0);
  const description =
    "서울·수도권, 강원, 충남, 제주 지역의 자전거길 코스와 그 지역에서만 확인할 조건을 모았습니다. " +
    "지역과 무관한 준비 기준은 목적별 가이드에서 확인할 수 있습니다.";

  const sections = structure.regions
    .map((r) => {
      const course = allBySlug.get(r.course) || { url: r.course, title: r.course };
      const items = r.articles.map((u) => {
        const meta = readMeta(u.slice(1));
        return { url: u, ...meta };
      });
      const articleCards = items.length
        ? `      <div class="info-grid fluid">
${items
  .map((a) => `        <article class="info-card"><h4>${esc(a.title)}</h4><p>${esc(a.desc)}</p><a href="${a.url}">읽기</a></article>`)
  .join("\n")}
      </div>`
        : `      <p>이 지역은 아직 코스 상세만 있습니다. 준비 기준은 <a href="/info/planning/">계획 가이드</a>에서 확인하세요.</p>`;

      return `<section class="region-block" id="${r.key}">
      <h2>${esc(r.name)}</h2>
      <p>${esc(r.lead)}</p>
      <div class="info-grid fluid">
        <article class="info-card"><h3>${esc(course.title)}</h3><p>이 지역의 코스 상세 페이지입니다. 구간, 노면, 보급, 복귀 교통을 순서대로 확인할 수 있습니다.</p><a href="${course.url}">코스 보기</a></article>
      </div>
${items.length ? `      <h3>${esc(r.name)}에서 확인할 것</h3>\n${articleCards}` : articleCards}
      <p class="info-note"><strong>이 지역의 변수</strong> · ${esc(r.note)}</p>
    </section>`;
    })
    .join("\n\n    ");

  const jump = structure.regions.map((r) => `<a href="#${r.key}">${esc(r.name)}</a>`).join(" · ");

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "지역별 코스", item: url }
    ]
  };
  const pageLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    headline: "지역별 자전거길 코스 | 라이드모아",
    description,
    url,
    dateModified: TODAY,
    publisher: { "@type": "Organization", name: "라이드모아" }
  };

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${ADSENSE}
  <title>지역별 자전거길 코스 | RideMoa</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="지역별 자전거길 코스 | RideMoa">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE}/assets/images/route-hero.svg">
  <link rel="icon" href="/assets/images/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/css/styles.css">
  <script type="application/ld+json">${JSON.stringify(pageLd)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
</head>
<body>
${NAV}
<main class="policy">
<nav class="breadcrumb" aria-label="현재 위치"><a href="/">홈</a><span aria-current="page">지역별 코스</span></nav>
<h1>지역별 자전거길 코스</h1>
<p>갈 지역이 정해져 있을 때 쓰는 목록입니다. 코스 상세와 <strong>그 지역에서만 확인할 조건</strong>을 함께 묶었습니다.</p>
<p class="info-note">지역과 상관없는 준비 기준(거리, 준비물, 인증, 안전, 현장 대처)은 <a href="/info/">목적별 가이드</a>에서 다룹니다. 두 목록은 겹치지 않으니 필요한 쪽만 보면 됩니다. 거리나 소요시간으로 좁히려면 <a href="/#finder">홈의 코스 찾기</a>를 이용하세요.</p>
<p><strong>바로 가기</strong> · ${jump}</p>

    ${sections}

<h2>지역을 아직 정하지 않았다면</h2>
<p>무엇을 준비해야 하는지부터 정하는 편이 빠릅니다. <a href="/info/beginner/">초보</a> · <a href="/info/planning/">계획</a> · <a href="/info/certification/">인증</a> · <a href="/info/safety/">안전</a> · <a href="/info/onroad/">여행 실전</a> 분류에서 상황에 맞는 기준을 먼저 확인하세요.</p>
<p class="info-note">현재 코스 상세 ${structure.regions.length}편과 지역 특정 준비 글을 합쳐 ${total}개 항목을 다룹니다. 코스는 확인이 끝난 지역부터 순서대로 추가합니다.</p>
</main>
${FOOTER}
</body>
</html>
`;
}

writeFileSync("pages/routes-by-region.html", regionHub(), "utf8");
console.log("지역별 코스 허브 생성");

/* ---------------------------------------------------------------- 2~4. 글 페이지 */

const BREADCRUMB_RE = /\s*<nav class="breadcrumb" aria-label="현재 위치">.*?<\/nav>/s;
const RELATED_RE = /\s*<section class="related">.*?<\/section>/s;
const LEGACY_RELATED_RE = /\s*<section>\s*<h2>함께 읽기<\/h2>.*?<\/section>/s;
const BREADCRUMB_LD_RE = /\s*<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org","@type":"BreadcrumbList".*?<\/script>/s;

function breadcrumbHtml(trail) {
  // aria-current는 마지막 항목(현재 페이지)에만 붙인다.
  const last = trail.length - 1;
  const parts = trail.map((t, i) => {
    if (i === 0) return `<a href="${t.url}">${esc(t.name)}</a>`;
    if (t.url) return `<span><a href="${t.url}">${esc(t.name)}</a></span>`;
    return `<span${i === last ? ' aria-current="page"' : ""}>${esc(t.name)}</span>`;
  });
  return `<nav class="breadcrumb" aria-label="현재 위치">${parts.join("")}</nav>`;
}

function breadcrumbLd(trail) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail
      .filter((t) => t.url)
      .map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: `${SITE}${t.url}` }))
  });
}

function relatedHtml(links) {
  const items = links
    .map((l) => `            <li><a href="${l.url}">${esc(l.title)}</a><span>${esc(l.why)}</span></li>`)
    .join("\n");
  return `        <section class="related">
          <h2>함께 읽기</h2>
          <ul class="related-list">
${items}
          </ul>
        </section>`;
}

let touched = 0;
for (const [key, { meta, items }] of byCategory) {
  items.forEach((a, idx) => {
    let html = readFileSync(a.file, "utf8").replace(/^﻿/, "");

    // --- breadcrumb ---
    const trail = [
      { name: "홈", url: "/" },
      { name: "전체 가이드", url: "/info/" },
      { name: meta.name, url: `/info/${key}/` },
      { name: a.title, url: null }
    ];
    html = html.replace(BREADCRUMB_RE, "");
    html = html.replace(
      /(\n?\s*)<section class="article-hero">/,
      `$1${breadcrumbHtml(trail)}$1<section class="article-hero">`
    );

    // --- BreadcrumbList 구조화 데이터 ---
    html = html.replace(BREADCRUMB_LD_RE, "");
    html = html.replace(
      /(<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org","@type":"Article".*?<\/script>)/s,
      `$1\n  <script type="application/ld+json">${breadcrumbLd(trail)}</script>`
    );

    // --- 함께 읽기: 다음 단계 1개 + 같은 분류 2개 (중복 없이 항상 3개) ---
    const links = [];

    // 다음 단계 링크를 먼저 확정한다. 같은 분류의 글일 수도 있으므로 중복 제외 기준이 된다.
    const nextUrl = structure.nextStep[a.slug];
    const next = nextUrl ? allBySlug.get(nextUrl) || allBySlug.get(nextUrl.split("/").pop().replace(".html", "")) : null;
    if (next && next.url !== a.url) {
      links.push({ url: next.url, title: next.title, why: "다음 단계로 읽기" });
    }

    // 같은 분류에서 자기 자신과 이미 담긴 링크를 뺀 뒤, 순환 순서로 채운다.
    for (let step = 1; step < items.length && links.length < 3; step++) {
      const s = items[(idx + step) % items.length];
      if (!s || s.slug === a.slug) continue;
      if (links.some((l) => l.url === s.url)) continue;
      links.push({ url: s.url, title: s.title, why: `같은 ${meta.name} 분류` });
    }

    html = html.replace(LEGACY_RELATED_RE, "");
    html = html.replace(RELATED_RE, "");
    html = html.replace(/(\s*)<\/article>/, `\n${relatedHtml(links)}\n      </article>`);

    writeFileSync(a.file, html, "utf8");
    touched++;
  });
}
console.log(`글 페이지 ${touched}개 갱신 (breadcrumb · 구조화 데이터 · 함께 읽기)`);

/* ---------------------------------------------------------------- 코스 상세 페이지 breadcrumb */

let routeTouched = 0;
for (const r of structure.routes) {
  const file = r.url.slice(1);
  if (!existsSync(file)) continue;
  let html = readFileSync(file, "utf8").replace(/^﻿/, "");
  const trail = [
    { name: "홈", url: "/" },
    { name: "지역별 코스", url: "/pages/routes-by-region.html" },
    { name: r.region, url: null },
    { name: r.name, url: null }
  ];
  html = html.replace(BREADCRUMB_RE, "");
  html = html.replace(/(\n?\s*)<section class="route-hero">/, `$1${breadcrumbHtml(trail)}$1<section class="route-hero">`);
  html = html.replace(BREADCRUMB_LD_RE, "");
  html = html.replace(
    /(<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org".*?<\/script>)/s,
    `$1\n  <script type="application/ld+json">${breadcrumbLd(trail)}</script>`
  );
  writeFileSync(file, html, "utf8");
  routeTouched++;
}
console.log(`코스 상세 ${routeTouched}개 갱신 (breadcrumb)`);
