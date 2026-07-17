# trevelmoa.com 배포 체크리스트

## 현재 상태

- 도메인: `trevelmoa.com`
- 등록기관: 가비아
- 배포 대상: Cloudflare Pages
- 사이트 내부 canonical, sitemap, robots URL은 `https://trevelmoa.com` 기준으로 설정 완료

## 권장 연결 방식

Cloudflare Pages에서 루트 도메인 `trevelmoa.com`과 `www.trevelmoa.com`을 모두 안정적으로 쓰려면 Cloudflare를 DNS 관리자로 사용하는 방식이 가장 단순하다.

1. Cloudflare 대시보드에서 `trevelmoa.com` 사이트를 추가한다.
2. Cloudflare가 제시하는 2개의 네임서버 값을 확인한다.
3. 가비아 My가비아 > 도메인 관리 > `trevelmoa.com` > 네임서버 변경에서 Cloudflare 네임서버 2개로 교체한다.
4. Cloudflare에서 도메인이 Active 상태가 될 때까지 기다린다.
5. Workers & Pages > Pages 프로젝트 > Custom domains에서 아래 도메인을 추가한다.
   - `trevelmoa.com`
   - `www.trevelmoa.com`
6. Cloudflare DNS에 Pages용 CNAME이 자동 생성되는지 확인한다.
7. SSL/TLS는 Full 또는 기본 권장 설정을 사용한다.

## GitHub Pages가 아닌 Cloudflare Pages용 설정

- Build command: 비워두기
- Build output directory: `/`
- Framework preset: None 또는 Static HTML
- Production branch: `codex/ridemoa-static-site` 또는 운영용 기본 브랜치

## 배포 후 검색엔진 작업

- Google Search Console에 `https://trevelmoa.com` 등록
- `https://trevelmoa.com/sitemap.xml` 제출
- 네이버 서치어드바이저에 사이트 등록
- 네이버 소유확인 meta 코드를 `index.html`의 `naver-site-verification` 값에 반영
- 애드센스 신청 전 고유 콘텐츠 15~30개 이상 추가

## R2 이미지 도메인

이미지 전용 서브도메인을 쓸 경우 권장값:

- R2 공개 도메인: `https://images.trevelmoa.com`
- `.env`의 `R2_PUBLIC_BASE_URL=https://images.trevelmoa.com`

R2 커스텀 도메인은 Cloudflare R2 버킷 설정에서 연결한 뒤 사용한다.
