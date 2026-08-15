# CLAUDE.md

전국 자전거길 여행 정보를 다루는 정적 HTML 사이트입니다. 빌드 단계가 없고, 저장소의 파일이 그대로 trevelmoa.com이 됩니다.

**이 프로젝트의 목표는 구글 애드센스 승인입니다.** 작업 판단이 갈릴 때는 승인에 유리한 쪽을 고릅니다.

## 브랜치는 main 하나만 씁니다

작업은 Claude Code에서만 진행하며, 브랜치는 `main` 하나로 유지합니다. 자료가 흩어지면 나중에 수정이 어려워지므로 다른 브랜치를 새로 만들지 않습니다.

```bash
git checkout main
git pull origin main
# 작업, 커밋
git push -u origin main
```

- main 푸시 = 실제 배포입니다. Cloudflare Pages가 main을 보고 자동 빌드·반영합니다(빌드 명령 없음, output `/`).
- 검토자가 없으므로 **푸시 전 검증이 유일한 안전장치**입니다.
- PR은 별도로 요청받았을 때만 만듭니다.
- `codex/ridemoa-static-site` 브랜치는 더 이상 쓰지 않습니다. 이 브랜치에 커밋하거나 병합하지 마세요.

## 푸시 전 검증

빌드·테스트·린트 명령이 없는 정적 사이트입니다. 대신 아래 4가지를 확인하고, 하나라도 실패하면 푸시하지 않습니다.

```bash
# 1) 로컬 구동 + 주요 경로 200 확인
node scripts/local-server.mjs & SRV=$!
sleep 2
for u in / /info/ /calendar/ /pages/privacy.html /sitemap.xml; do
  curl -s -o /dev/null -w "$u %{http_code}\n" --noproxy '*' "http://localhost:8788$u"
done
kill $SRV   # pkill -f 는 감싸는 셸까지 잡을 수 있으니 PID로 종료

# 2) 내부 링크가 실제 파일을 가리키는지 (출력이 없어야 정상)
find . -path ./.git -prune -o -name "*.html" -print | sed 's|^\./||' | while read f; do
  grep -o 'href="/[^"#?]*"' "$f" | sed 's|href="||;s|"$||' | sort -u | while read l; do
    t=".$l"
    if [ -d "$t" ]; then [ -f "$t/index.html" ] || echo "$f -> $l"
    elif [ ! -f "$t" ]; then case "$l" in */) [ -f ".${l}index.html" ] || echo "$f -> $l";; *) echo "$f -> $l";; esac; fi
  done
done | sort -u

# 3) 구조화 데이터(JSON-LD) 파싱
python3 -c "
import glob,re,json
for p in glob.glob('**/*.html',recursive=True):
    for b in re.findall(r'<script type=\"application/ld\+json\">(.*?)</script>',open(p,encoding='utf-8').read(),re.S):
        try: json.loads(b)
        except Exception as e: print('BAD',p,e)
print('ok')"

# 4) 사이트맵과 실제 파일이 1:1인지
python3 -c "
import re,os
s=open('sitemap.xml',encoding='utf-8').read()
for u in re.findall(r'<loc>https://trevelmoa.com/([^<]*)</loc>',s):
    p=u or 'index.html'
    p=p+'index.html' if p.endswith('/') else p
    if not os.path.exists(p): print('사이트맵에만 있음:',u)
print('urls:',s.count('<loc>'))"
```

- 검증을 건너뛰었거나 실패한 채로 두었다면, 그 사실을 숨기지 않고 먼저 알립니다.

## 주요 명령

```bash
npm run serve          # 로컬 서버 http://localhost:8788
npm run images:process # 원본 이미지 -> webp 3종(본문/카드/og) 생성
npm run images:r2      # 이미지 R2 업로드
```

- `npm run prepare:dist`는 PowerShell 전용이라 Linux/macOS 세션에서는 동작하지 않습니다.
- 의존성(sharp, cheerio 등)은 이미지 파이프라인 전용입니다. 사이트 자체는 의존성 없이 동작합니다.

## 프로젝트 규칙

### 글을 하나 추가하면 5곳을 함께 고쳐야 합니다

자동 생성이 없으므로 한 곳만 고치면 조용히 누락됩니다.

1. `info/<카테고리>/<슬러그>.html` — 본문
2. `data/routes.json` — 홈 코스 찾기 필터와 `/info/` 허브가 이 파일을 읽습니다
3. `info/index.html` — 허브 카드(해당 카테고리 `<section>` 안)
4. `pages/routes-by-purpose.html`, `routes-by-region.html`, `routes-by-distance.html` — 목록
5. `sitemap.xml` — `<loc>`과 `<lastmod>`

카테고리는 `beginner / planning / certification / safety / onroad` 5종이며, `routes-by-purpose.html`의 앵커 id와 구조화 데이터 breadcrumb가 이 값에 묶여 있습니다.

### 되살리면 안 되는 설정

- **`scripts/generate-ridemoa-content.mjs`는 실행 금지입니다.** 이 파일은 글 30편 중 20편만 알고 있고, `index.html`의 네이버 사이트 확인 태그와 webp 히어로, 전 페이지 og/twitter/breadcrumb 메타를 모릅니다. 실행하면 글 10편이 sitemap·목록·`routes.json`에서 사라지고 SEO 메타가 되돌아갑니다. `RIDEMOA_ALLOW_REGEN=1` 가드가 걸려 있으니 **가드를 제거하지 마세요.**
- **`posts/` 디렉터리를 되살리지 마세요.** 예전 안내 페이지 20개는 본문 없는 중복 페이지여서 삭제했고, `_redirects`의 실제 301로 대체했습니다.
- **`og:image`에 SVG를 넣지 마세요.** 카카오톡·페이스북·X 어디도 렌더링하지 않아 공유 카드가 빈칸이 됩니다. 항상 `assets/images/og/*.jpg`(1200×630)를 씁니다.
- 모든 HTML 파일은 UTF-8 BOM으로 시작합니다. 파일을 새로 쓸 때 BOM을 유지하세요.

### 애드센스 (이 프로젝트의 목표)

- `ads.txt`의 퍼블리셔 ID(`pub-5804969457082424`)는 모든 페이지 `adsbygoogle.js` 로더의 `client` 값과 반드시 일치해야 합니다.
- **본문 없는 화면에 광고 로더를 넣지 마세요.** 리다이렉트 안내, 빈 허브, 준비 중 페이지가 여기 해당합니다. 과거 거절 위험 요인이었습니다.
- `pages/privacy.html`의 "광고와 제3자 쿠키" 절은 애드센스 정책 필수 고지입니다. 삭제하지 마세요.
- 현재 `<ins class="adsbygoogle">` 광고 유닛이 0개이며 자동 광고 설정에 의존합니다. 코스 페이지의 `.ad-slot` div는 비어 있고 CSS에서 `display:none`입니다.
- **남은 최대 위험은 분량입니다.** 승인 거절 1위 사유가 "가치 없는 콘텐츠"인데, 현재 본문 1,500자 미만이 16쪽입니다. 특히 `pages/contact.html` 157자, `pages/about.html` 311자는 심사에서 반드시 보는 페이지입니다. 초보·계획 카테고리 10편도 1,250~1,470자로, 같은 사이트의 다른 글(2,500~2,800자) 대비 절반입니다.

### 사이트 정보

- 도메인 `https://trevelmoa.com` — canonical, og:url, sitemap 모두 이 절대 URL 기준입니다.
- Cloudflare Pages 프로젝트명 `trevelmoa`, `wrangler.toml`의 `pages_build_output_dir = "."`
- `_headers`에서 `/assets/*`는 1년 immutable 캐시입니다. 에셋을 교체할 때는 파일명을 바꾸세요.
