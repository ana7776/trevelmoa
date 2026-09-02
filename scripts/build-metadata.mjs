// 각 페이지의 head 메타와 구조화 데이터를 실제 파일 상태에 맞춰 다시 쓴다.
// - Article: datePublished / dateModified / author / image / mainEntityOfPage 채우기
// - BreadcrumbList: 홈 > 전체 가이드 > 카테고리 > 글
// - FAQPage: 본문에 FAQ(details)가 있는 글만
// - og:image: SVG 대신 1200x630 webp 절대 경로
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { loadPages, categoryLabels, site } from "./catalog.mjs";

const publisher = {
  "@type": "Organization",
  name: "라이드모아",
  url: `${site}/`,
  logo: { "@type": "ImageObject", url: `${site}/assets/images/webp/home-hero-og.webp`, width: 1200, height: 630 }
};

const routeImages = {
  "routes/seoul/hangang.html": "hangang-card-og",
  "routes/gangwon/uiamho.html": "uiamho-card-og",
  "routes/jeju/jeju-coastal.html": "jeju-card-og",
  "routes/chungnam/geumgang.html": "geumgang-card-og"
};

const imageFor = file => `${site}/assets/images/webp/${routeImages[file] || "home-hero-og"}.webp`;

// 첫 커밋일을 발행일로 본다. 커밋 이력이 없으면 수정일과 같게 둔다.
function firstCommitDate(path, fallback) {
  try {
    const out = execFileSync("git", ["log", "--reverse", "--format=%cs", "--", path], { encoding: "utf8" }).split("\n")[0].trim();
    if (out) return out;
  } catch {}
  return fallback;
}

const decode = s => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const stripTags = s => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

// head에서 name/property 메타 한 줄을 교체하거나, 없으면 canonical 뒤에 넣는다.
function setMeta(html, attr, key, value) {
  const re = new RegExp(`<meta ${attr}="${key}" content="[^"]*">`);
  const tag = `<meta ${attr}="${key}" content="${value}">`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/(<link rel="canonical"[^>]*>)/, `$1\n  ${tag}`);
}

let touched = 0;
for (const page of loadPages()) {
  const { file, url, type, category, title, description } = page;
  let html = readFileSync(file, "utf8");
  const bom = html.startsWith("﻿") ? "﻿" : "";
  html = html.slice(bom.length);

  const body = html.slice(html.indexOf("<body"));
  const modified = (body.match(/최종 업데이트:\s*(\d{4}-\d{2}-\d{2})/) || [])[1] || page.lastmod;
  const published = firstCommitDate(file, modified);
  const image = imageFor(file);
  const canonical = site + url;

  /* ---- head 메타 ---- */
  html = setMeta(html, "property", "og:image", image);
  html = setMeta(html, "property", "og:image:width", "1200");
  html = setMeta(html, "property", "og:image:height", "630");
  html = setMeta(html, "property", "og:image:alt", title);
  html = setMeta(html, "property", "og:site_name", "라이드모아");
  html = setMeta(html, "property", "og:locale", "ko_KR");
  html = setMeta(html, "name", "twitter:card", "summary_large_image");
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "name", "twitter:description", description);
  html = setMeta(html, "name", "twitter:image", image);

  if (type === "article" || type === "route") {
    html = setMeta(html, "property", "article:published_time", published);
    html = setMeta(html, "property", "article:modified_time", modified);
  }

  if (!html.includes('type="application/rss+xml"')) {
    html = html.replace(/(<link rel="stylesheet"[^>]*>)/,
      `<link rel="alternate" type="application/rss+xml" title="라이드모아 최신 가이드" href="${site}/feed.xml">\n  $1`);
  }

  /* ---- 구조화 데이터 ---- */
  const graph = [];

  if (type === "article" || type === "route") {
    const text = stripTags(body.match(/<article class="article-body">([\s\S]*?)<\/article>/)?.[1] || body);
    graph.push({
      "@type": "Article",
      "@id": `${canonical}#article`,
      headline: title,
      description,
      inLanguage: "ko-KR",
      url: canonical,
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
      datePublished: published,
      dateModified: modified,
      author: { "@type": "Organization", name: "라이드모아 편집팀", url: `${site}/pages/about.html` },
      publisher,
      image: { "@type": "ImageObject", url: image, width: 1200, height: 630 },
      articleSection: type === "route" ? "코스" : categoryLabels[category] || category,
      wordCount: text.length
    });

    const crumbs = [["홈", `${site}/`], ["전체 가이드", `${site}/info/`]];
    if (type === "article") crumbs.push([categoryLabels[category] || category, `${site}/info/#${category}`]);
    else crumbs.push(["상세 코스", `${site}/info/#route`]);
    crumbs.push([title, canonical]);
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${canonical}#breadcrumb`,
      itemListElement: crumbs.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item }))
    });

    const faq = [...body.matchAll(/<details><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g)]
      .map(m => ({ "@type": "Question", name: stripTags(m[1]), acceptedAnswer: { "@type": "Answer", text: stripTags(m[2]) } }));
    if (faq.length) graph.push({ "@type": "FAQPage", "@id": `${canonical}#faq`, mainEntity: faq });
  }

  if (type === "home") {
    graph.push(
      {
        "@type": "WebSite",
        "@id": `${site}/#website`,
        name: "라이드모아",
        alternateName: "RideMoa",
        url: `${site}/`,
        inLanguage: "ko-KR",
        description,
        publisher: { "@id": `${site}/#organization` }
      },
      {
        "@type": "Organization",
        "@id": `${site}/#organization`,
        ...publisher,
        contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: "contact@trevelmoa.com", availableLanguage: "Korean" }
      },
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: title,
        description,
        inLanguage: "ko-KR",
        isPartOf: { "@id": `${site}/#website` },
        primaryImageOfPage: { "@type": "ImageObject", url: image, width: 1200, height: 630 },
        dateModified: modified
      }
    );
  }

  if (graph.length) {
    const ld = `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}</script>`;
    html = /<script type="application\/ld\+json">[\s\S]*?<\/script>/.test(html)
      ? html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, ld)
      : html.replace("</head>", `  ${ld}\n</head>`);
  }

  /* ---- 본문 최상단 이동 경로 ---- */
  if (type === "article" && !html.includes('class="breadcrumb"')) {
    const crumb = `<nav class="breadcrumb" aria-label="현재 위치"><a href="/">홈</a><span><a href="/info/">전체 가이드</a></span><span><a href="/info/#${category}">${categoryLabels[category] || category}</a></span><span>${title}</span></nav>\n      `;
    html = html.replace('<section class="article-hero">', `${crumb}<section class="article-hero">`);
  }

  writeFileSync(file, bom + html, "utf8");
  touched++;
}
console.log(`metadata updated on ${touched} pages`);
