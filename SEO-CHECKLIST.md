# 색인 점검 체크리스트

기준 데이터: Google Search Console 색인 생성 보고서 (2026-08-02 ~ 2026-08-28) 및
네이버 서치어드바이저 노출/클릭 (최근 60일, 2026-09-01 기준).

## 1. 출발점: 무엇이 문제였나

| 지표 | 값 | 판정 |
| --- | --- | --- |
| 색인 생성됨 | 7 | 전체 43페이지 중 16% |
| 색인 생성되지 않음 | 41 | |
| ├ 발견됨 - 현재 색인이 생성되지 않음 | 32 | 크롤 우선순위/내부 링크 부족 |
| ├ 리디렉션 오류 | 6 | **설정 버그** |
| ├ 리디렉션이 포함된 페이지 | 2 | meta refresh 스텁 |
| └ 적절한 표준 태그가 포함된 대체 페이지 | 1 | 중복 |
| 노출 (60일 합계) | 100회 | 클릭 0, CTR 0% |
| 네이버 색인 웹문서 | 2개 (`/`, `/info/`) | 본문 글이 하나도 안 잡힘 |

노출 100회 중 99회가 홈 한 페이지에서 나왔습니다. 즉 **글이 안 팔린 게 아니라
글이 검색엔진에 안 들어가 있는 상태**였습니다.

## 2. 자동 점검 (`npm run check:seo`)

배포 전에 실행하세요. 하나라도 실패하면 종료 코드 1을 반환합니다.

- [x] **리디렉션 타깃 존재** — `_redirects`의 모든 301 목적지가 실제 파일인가
- [x] **meta refresh 없음** — 소프트 리디렉션이 서버 301로 대체되었는가
- [x] **canonical 자기 참조** — 각 페이지의 canonical이 자기 URL과 일치하는가
- [x] **noindex 충돌 없음** — 사이트맵에 든 페이지가 noindex가 아닌가
- [x] **사이트맵 일치** — 실제 페이지 집합과 `sitemap.xml`이 정확히 같은가
- [x] **내부 링크 유효** — 죽은 내부 링크가 없는가
- [x] **고아 페이지 없음** — 모든 페이지에 내부 유입 링크가 있는가
- [x] **title/description** — 존재하고 중복되지 않는가
- [x] **상투구 비율** — 같은 문장이 페이지 4분의 1 이상에 반복되지 않는가
- [x] **og:image** — 절대 경로 래스터 이미지인가 (SVG는 미리보기에서 무시됨)
- [x] **구조화 데이터 파싱** — 모든 JSON-LD가 유효하고 본문 글에 Article이 있는가
- [x] **피드 링크 유효** — `feed.xml`의 모든 링크가 살아 있는가

현재 상태: **48페이지 / 실패 0 / 경고 0**

## 3. 이번에 고친 것

### 리디렉션 오류 (6건)

- `/guide` → `/posts/national-bike-route-guide.html` 로 301 했는데 **그 파일이 없었음**.
  → `/pages/routes-by-purpose.html` 로 변경.
- `/info/region/seoul-gyeonggi-short-bike-routes.html` → `/info/planning/...` 로 301 했는데
  실제 파일은 `/info/beginner/` 에 있었음. → 경로 수정.

### 리디렉션이 포함된 페이지 (2건) / 중복

- `/posts/*.html` 20개가 `<meta http-equiv="refresh">` 스텁이었습니다.
  구글은 meta refresh를 약한 리디렉션 신호로 처리하고, 스텁 자체가 얇은 중복 페이지로
  크롤 예산을 먹습니다. → **파일 20개 삭제 + `_redirects`에 서버 301 20줄 추가.**

### 발견됨 - 현재 색인이 생성되지 않음 (32건)

이 상태는 대부분 "크롤러가 URL은 알지만 갈 이유를 못 찾음"입니다. 원인이 내부 링크였습니다.

- `/info/` 는 허브인데 **본문 글 링크가 0개**였습니다. → 코스 4개 + 글 30개 전체를
  카테고리별로 나열하는 진짜 허브로 재작성 (`CollectionPage` + `ItemList` 스키마 포함).
- 홈은 코스 상세 4개만 링크했고 나머지는 JS `fetch`로 그리고 있어 크롤되지 않았습니다.
  → **JS 없이 렌더되는 "주제별 전체 가이드" 색인 섹션**을 홈 하단에 추가.
- 전 페이지 네비게이션에 `전체 가이드`(`/info/`) 링크 추가.
- 결과: 내부 링크 1개뿐이던 최신 글 6편 포함, 모든 글이 홈에서 1클릭 거리.

### 구조화 데이터 / 메타

- `Article`에 `datePublished`, `dateModified`, `author`, `image`, `mainEntityOfPage`,
  `articleSection`, `wordCount`, `inLanguage` 추가 (기존에는 headline/url/dateModified뿐).
- `BreadcrumbList` 추가 + 본문 상단에 실제 이동 경로 노출.
- FAQ가 있는 글에 `FAQPage` 추가.
- 홈에 `WebSite` + `Organization` 추가.
- `og:image`가 전부 `route-hero.svg`였습니다. SVG는 구글·네이버·카카오 미리보기에서
  무시됩니다. → 1200x630 webp로 교체하고 `og:image:width/height/alt`, `twitter:card` 추가.

### 발견 경로

- `sitemap.xml`: 파일 스캔 기반 자동 생성으로 교체. `lastmod`를 git 커밋일에서 가져오고,
  `priority`를 홈 1.0 / 허브 0.9 / 본문 0.8 / 정책 페이지 0.4로 차등 (기존에는 전부 0.8).
- `feed.xml` (RSS) 신규 추가 + 전 페이지 `<link rel="alternate">`.
- `robots.txt`에 네이버 `Yeti` 규칙과 데이터 디렉터리 차단 추가.
- `404.html` 신규 추가 (`noindex, follow`).

### 세부 키워드 대응 글 (신규 5편)

네이버 노출 상위 검색어 중 답할 페이지가 없어 홈으로만 노출되던 것들입니다.

| 검색어 (노출) | 새 글 |
| --- | --- |
| 의암호 자전거길 소요시간 (12), 춘천의암호라이딩소요시간 (2) | `/info/planning/uiamho-riding-time.html` |
| 제주 자전거길 난이도 (1), 제주 자전거길 코스별 난이도 (2), 제주도 자전거 종주 난이도 (3) | `/info/planning/jeju-route-difficulty.html` |
| 초보 제주 자전거 종주 일정 (2) | `/info/planning/jeju-beginner-itinerary.html` |
| 전국 자전거길 (33), 전국자전거길 (6), 자전거길가이드 (2) | `/info/planning/nationwide-bike-routes-overview.html` |
| 자전거 여행 초보 가이드 (13) | `/info/beginner/bike-travel-beginner-guide.html` |

각 글은 상세 코스 페이지와 기존 가이드로 상호 링크되어 있고, 신규 글마다 내부 유입
링크가 5~6개씩 걸립니다.

### 허브 자동 생성

`pages/routes-by-region.html`, `routes-by-distance.html`, `routes-by-purpose.html` 세 허브가
정적 파일이라 나중에 추가한 글 10편이 빠져 있었습니다. `data/article-facets.json`의
지역·소요시간 분류를 바탕으로 카탈로그에서 생성하도록 바꿨습니다. 이제 세 허브 모두
39개 페이지 전부를 담습니다.

### 운영 안전장치

- `scripts/generate-ridemoa-content.mjs`는 2026-07-31 시점 20개 글만 아는 구버전입니다.
  그대로 실행하면 최신 글 10편이 사라지고 meta refresh 스텁이 되살아납니다.
  → `ALLOW_LEGACY_GENERATOR=1` 없이는 실행되지 않도록 막았습니다.

## 4. 배포 후 손으로 해야 할 것

코드로 못 하는 부분입니다. 순서대로 진행하세요.

- [ ] 배포 후 `https://trevelmoa.com/posts/first-ride-distance.html` 이 **301**로 응답하는지 확인
      (`curl -I`). Cloudflare Pages가 `_redirects`를 읽었는지 확인하는 용도입니다.
- [ ] `https://trevelmoa.com/guide` 301 확인.
- [ ] GSC → 사이트맵 → `sitemap.xml` **재제출**.
- [ ] GSC → 색인 생성 → 리디렉션 오류 / 리디렉션이 포함된 페이지 → **유효성 검사 시작**.
- [ ] GSC → URL 검사로 우선순위 높은 5~10개(`/info/`, 코스 4개, 인기 키워드 글) **색인 요청**.
      하루 할당량이 있으니 며칠에 나눠 진행하세요.
- [ ] 네이버 서치어드바이저 → 사이트맵 제출 + `feed.xml` **RSS 제출**.
      현재 네이버에 잡힌 웹문서가 2개뿐이라 여기가 가장 효과가 큽니다.
- [ ] 네이버 서치어드바이저 → 웹페이지 수집 요청으로 주요 글 등록.
- [ ] 빙 웹마스터도구에 사이트맵 등록 (GSC 계정 연동으로 바로 가져올 수 있음).

## 5. 다음에 볼 것 (2~4주 뒤)

리디렉션 오류가 0이 되고 "발견됨" 숫자가 줄기 시작하면 그다음 병목은 콘텐츠 쪽입니다.

- [x] **메타 설명 중복**. 완전 중복은 없었지만 같은 문장이 43페이지 중 42곳에 들어가
      설명 글자수의 36%를 차지했습니다. 43개 전부 페이지별 문장으로 다시 썼고,
      상투구 검사를 `check:seo`에 상시 규칙으로 넣었습니다.
- [x] **본문 이미지**. 글 본문에 `<img>`가 하나도 없었습니다. 각 글이 다루는 판단을 그린
      도해 SVG 23종을 만들어 35편 전부에 `alt`와 캡션과 함께 넣었습니다.
- [x] **검색 의도와 URL 매칭**. 노출은 잡히는데 답할 페이지가 없어 홈으로만 노출되던
      검색어에 맞춰 글 5편을 새로 썼습니다(3장 참고).
- [ ] **기존 글 분량**. 신규 5편은 평균 2,300자인데 기존 30편은 평균 2,000자,
      가장 짧은 글은 1,126자입니다. 노출이 붙기 시작하는 글부터 구체적인 수치와
      사례를 넣어 보강하세요.
- [ ] **AdSense 스크립트 위치**. `<head>` 최상단에서 동기 로드 전 삽입되어 LCP를 늦춥니다.
      승인 전까지는 본문 렌더 이후로 내리는 편이 Core Web Vitals에 유리합니다.

## 6. 글을 추가할 때마다

```bash
npm run build:index   # 허브 4곳, 홈 색인, sitemap.xml, feed.xml, 메타·스키마·도해 갱신
npm run check:seo     # 위 자동 점검 항목 실행
```

글을 새로 쓸 때는 `scripts/articles-data.mjs`에 원고를 추가하고
`node scripts/write-articles.mjs`로 뼈대를 만든 뒤,
`data/figures.json`(도해)과 `data/article-facets.json`(지역·소요시간)에 항목을 추가하세요.

`build:index`는 파일 시스템을 스캔하므로 목록을 따로 관리할 필요가 없습니다.
`check:seo`가 통과한 뒤에 배포하세요.
