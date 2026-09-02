# RideMoa Static Site

전국 자전거길 여행 정보를 애드센스 승인과 SEO 확장을 고려해 구성한 정적 사이트입니다.

## 로컬 실행

```bash
npm install
npm run serve
```

정적 HTML이므로 `index.html`을 직접 열어도 확인할 수 있습니다.

## Cloudflare Pages

- Build command: 비워두기
- Output directory: `/`
- 환경: Static HTML
- 배포 도메인: `https://trevelmoa.com`
- 도메인 연결 절차는 `DEPLOYMENT.md`를 참고하세요.

## GitHub

- Repository: `https://github.com/ana7776/trevelmoa`
- Production branch: `main`

## 이미지 자동화

```bash
cp .env.example .env
npm run images:r2
```

`.env`에는 Cloudflare R2 키와 버킷 정보를 입력해야 합니다. 외부 이미지는 저작권과 이용약관을 확인한 뒤 사용하세요.

## 색인 · SEO

```bash
npm run build:index   # /info/ 허브, 홈 색인, sitemap.xml, feed.xml, 메타/구조화 데이터 갱신
npm run check:seo     # 리디렉션·canonical·사이트맵·내부 링크·스키마 자동 점검
```

글을 추가하거나 옮긴 뒤에는 위 두 명령을 순서대로 실행하세요. `build:index`는 파일
시스템을 스캔하므로 목록을 따로 관리할 필요가 없습니다. 점검 항목과 배포 후 수동
작업은 `SEO-CHECKLIST.md`를 참고하세요.

`scripts/generate-ridemoa-content.mjs`는 구버전 생성기이며 그대로 실행하면 최신 글이
덮어써집니다. 자세한 내용은 파일 상단 주석을 확인하세요.

## 애드센스 승인 보강 TODO

- 고유 글 15~30개 이상 추가
- 사이트 소개/문의 페이지 추가
- 실제 도메인 연결 후 Search Console, 네이버 서치어드바이저 등록
- 광고 승인 전 본문 광고 코드는 주석 상태 유지
