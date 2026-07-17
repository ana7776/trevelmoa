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
- 배포 후 `example.com`으로 들어간 canonical, sitemap, robots URL을 실제 도메인으로 교체하세요.

## 이미지 자동화

```bash
cp .env.example .env
npm run images:r2
```

`.env`에는 Cloudflare R2 키와 버킷 정보를 입력해야 합니다. 외부 이미지는 저작권과 이용약관을 확인한 뒤 사용하세요.

## 애드센스 승인 보강 TODO

- 고유 글 15~30개 이상 추가
- 사이트 소개/문의 페이지 추가
- 실제 도메인 연결 후 Search Console, 네이버 서치어드바이저 등록
- 광고 승인 전 본문 광고 코드는 주석 상태 유지
