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

## 애드센스 승인 준비 상태

승인 지침서(콘텐츠·사이트 구조·정책/기술·검색 노출) 기준으로 점검한 결과입니다.

### 완료

- 고유 정보 글 30편 + 코스 상세 4편 발행
- 필수 신뢰 페이지 4종: [소개](pages/about.html), [문의](pages/contact.html),
  [개인정보처리방침](pages/privacy.html), [이용약관](pages/terms.html)
- 개인정보처리방침에 Google AdSense 등 제3자 광고 쿠키 고지와 옵트아웃 안내 반영
- `/info/` 전체 가이드 목록 페이지 구성 (빈 허브 페이지 제거)
- 색인 가능한 얇은 리다이렉트 페이지 20개 제거 → `_redirects` 301 규칙으로 대체
- 전 페이지 메뉴·푸터 일관화, canonical·description·favicon 전수 점검
- sitemap.xml을 실제 파일 기준으로 재생성 (44 URL)

### 신청 전 직접 확인할 것

- [ ] 실제 도메인에서 로그인 없이 전체 페이지 접근 확인
- [ ] Search Console, 네이버 서치어드바이저 소유 확인 및 사이트맵 제출
- [ ] 대표 URL 검사로 noindex·canonical·크롤링 상태 확인
- [ ] 실제 휴대폰에서 본문·표·메뉴·문의 링크 확인
- [ ] `anagim7776@gmail.com` 수신 테스트
- [ ] 광고 승인 전 본문 광고 슬롯은 노출하지 않음 (`.ad-slot`은 `display:none` 유지)

### 콘텐츠 수정 시 주의

`scripts/generate-ridemoa-content.mjs`는 손으로 관리하는 페이지(신뢰 페이지, 목록 페이지,
`_redirects`)를 덮어쓰지 않습니다. 해당 목록은 스크립트의 `MANUAL_PAGES`에 있습니다.
