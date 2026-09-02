// 사이트의 모든 인덱싱 대상 페이지를 파일 시스템에서 스캔해 목록으로 만든다.
// 사이트맵, RSS 피드, /info/ 허브가 모두 이 목록 하나를 사용한다.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

export const site = "https://trevelmoa.com";

export const categoryLabels = {
  beginner: "초보 가이드",
  planning: "여행 계획",
  certification: "인증·종주",
  safety: "안전",
  onroad: "여행 실전"
};

const pick = (html, re) => {
  const m = html.match(re);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
};

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".html")) out.push(full);
  }
  return out;
}

// 마지막으로 파일 내용이 바뀐 커밋 날짜. 커밋 이력이 없으면 파일 mtime.
function lastModified(path) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", path], { encoding: "utf8" }).trim();
    if (out) return out;
  } catch {}
  return statSync(path).mtime.toISOString().slice(0, 10);
}

export function loadPages() {
  const files = [
    "index.html",
    "info/index.html",
    "calendar/index.html",
    ...walk("routes"),
    ...walk("info").filter(f => !f.endsWith("index.html")),
    ...walk("pages")
  ];

  return files.map(file => {
    const html = readFileSync(file, "utf8").replace(/^﻿/, "");
    const url = "/" + file.replace(/(^|\/)index\.html$/, "$1");
    const segments = file.split("/");
    let type = "page";
    if (file === "index.html") type = "home";
    else if (file.startsWith("info/") && segments.length === 3) type = "article";
    else if (file.startsWith("routes/")) type = "route";
    else if (file === "info/index.html" || file === "calendar/index.html" || file.startsWith("pages/routes-by-")) type = "hub";

    return {
      file,
      url,
      loc: site + url,
      type,
      category: type === "article" ? segments[1] : "",
      categoryLabel: type === "article" ? categoryLabels[segments[1]] || segments[1] : "",
      title: pick(html, /<title>([^<]*)<\/title>/).replace(/\s*\|\s*RideMoa$/, ""),
      description: pick(html, /<meta name="description" content="([^"]*)"/),
      lastmod: lastModified(file)
    };
  });
}

// 크롤 예산을 본문 글에 몰아주기 위한 우선순위 차등.
export const priorityFor = page =>
  ({ home: "1.0", hub: "0.9", article: "0.8", route: "0.8", page: "0.4" })[page.type] || "0.5";
