// 본문용 도해 SVG를 만든다. 사진이 아니라 그 글이 다루는 판단 자체를 그린 그림이므로
// 글마다 내용이 다르고, 텍스트 본문과 중복되지 않는다.
import { mkdirSync, writeFileSync } from "node:fs";

const C = { bg: "#eef6f2", ink: "#17201b", muted: "#60706a", line: "#cfe0d8", forest: "#1f6b4f", blue: "#78b8ce", deep: "#1e5f8c", sun: "#f5b641", white: "#ffffff" };

const frame = (label, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" role="img" aria-label="${label}">
  <rect width="800" height="400" rx="18" fill="${C.bg}"/>
  <style>text{font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif}.t{fill:${C.ink};font-size:20px;font-weight:700}.s{fill:${C.muted};font-size:16px}.w{fill:${C.white};font-size:16px;font-weight:700}</style>
${inner}
</svg>
`;

// 가로 눈금 위에 지점을 찍는 공통 도형
const track = (y, stops) => `  <line x1="70" y1="${y}" x2="730" y2="${y}" stroke="${C.line}" stroke-width="8" stroke-linecap="round"/>
${stops.map(([x, top, bottom, fill]) => `  <circle cx="${x}" cy="${y}" r="13" fill="${fill || C.forest}"/>
  <text class="t" x="${x}" y="${y - 30}" text-anchor="middle">${top}</text>
  <text class="s" x="${x}" y="${y + 42}" text-anchor="middle">${bottom}</text>`).join("\n")}`;

// 세로 막대 묶음
const bars = (items, baseY = 320, w = 110) => items.map((it, i) => {
  const x = 78 + i * 168, h = it.h;
  return `  <rect x="${x}" y="${baseY - h}" width="${w}" height="${h}" rx="10" fill="${it.fill}"/>
  <text class="t" x="${x + w / 2}" y="${baseY - h - 16}" text-anchor="middle">${it.top}</text>
  <text class="s" x="${x + w / 2}" y="${baseY + 26}" text-anchor="middle">${it.bottom}</text>`;
}).join("\n");

const title = t => `  <text class="t" x="60" y="62" font-size="24">${t}</text>`;

const figures = {
  "distance-return": ["첫 자전거길 여행의 거리와 복귀 지점을 나타낸 도해",
    title("첫 여행은 복귀 방법을 먼저 정한다") +
    track(210, [[110, "출발", "체력 100%"], [300, "10km", "첫 휴식"], [490, "20km", "판단 지점", C.sun], [690, "복귀", "대중교통", C.deep]]) +
    `  <text class="s" x="400" y="352" text-anchor="middle">왕복 20~35km 또는 편도 후 대중교통 복귀 · 휴식 포함 반나절</text>`],

  "day-split": ["장거리 자전거 여행의 일자별 주행거리와 숙박 지점 분할 도해",
    title("하루 거리보다 숙박 지점을 먼저 잡는다") +
    bars([
      { h: 120, top: "60km", bottom: "1일차 · 적응", fill: C.blue },
      { h: 170, top: "85km", bottom: "2일차 · 최장", fill: C.forest },
      { h: 140, top: "70km", bottom: "3일차 · 인증", fill: C.forest },
      { h: 90, top: "45km", bottom: "4일차 · 복귀", fill: C.blue }
    ]) +
    `  <text class="s" x="400" y="384" text-anchor="middle">숙박지와 보급 지점이 있는 곳에서 하루를 끊는다</text>`],

  "stamp-flow": ["국토종주 인증수첩 발급부터 완주 신청까지의 순서 도해",
    title("인증은 수첩 · 스탬프 · 신청 세 단계") +
    [["수첩 발급", "인증센터·온라인", 130], ["구간 스탬프", "무인 부스에서 직접", 400], ["완주 신청", "빠짐 확인 후 제출", 670]]
      .map(([t, s, x], i) => `  <rect x="${x - 105}" y="150" width="210" height="96" rx="14" fill="${i === 1 ? C.forest : C.deep}"/>
  <text class="w" x="${x}" y="188" text-anchor="middle">${t}</text>
  <text x="${x}" y="216" text-anchor="middle" fill="${C.white}" font-size="14" opacity="0.85">${s}</text>`).join("\n") +
    `\n  <path d="M243 198 h44" stroke="${C.muted}" stroke-width="4" marker-end="url(#a)"/>
  <path d="M513 198 h44" stroke="${C.muted}" stroke-width="4" marker-end="url(#a)"/>
  <defs><marker id="a" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9 z" fill="${C.muted}"/></marker></defs>
  <text class="s" x="400" y="320" text-anchor="middle">스탬프가 빠지면 그 구간만 다시 가야 하므로 도착 즉시 확인한다</text>`],

  "night-visibility": ["야간과 터널 구간에서 전조등과 후미등으로 시인성을 확보하는 도해",
    title("야간은 보는 것보다 보이는 것이 먼저") +
    `  <rect x="60" y="120" width="680" height="180" rx="14" fill="#22303a"/>
  <path d="M470 210 L700 150 L700 270 Z" fill="${C.sun}" opacity="0.5"/>
  <path d="M330 210 L140 165 L140 255 Z" fill="#e0574a" opacity="0.45"/>
  <circle cx="400" cy="210" r="26" fill="${C.white}"/>
  <text x="400" y="216" text-anchor="middle" font-size="14" font-weight="700" fill="${C.ink}">라이더</text>
  <text class="w" x="620" y="288" text-anchor="middle" font-size="15">전조등 · 노면 확인</text>
  <text class="w" x="200" y="288" text-anchor="middle" font-size="15">후미등 · 뒤차 인지</text>
  <text class="s" x="400" y="352" text-anchor="middle">터널 진입 전 속도를 낮추고 등화를 먼저 켠다</text>`],

  "season-risk": ["봄 여름 가을 겨울 계절별 자전거 여행 위험 요소 비교 도해",
    title("계절마다 먼저 대비할 위험이 다르다") +
    [["봄", "강풍 · 혼잡", C.blue], ["여름", "온열질환 · 소나기", "#e0574a"], ["가을", "일몰 빨라짐", C.sun], ["겨울", "결빙 · 저체온", C.deep]]
      .map(([s, r, c], i) => `  <rect x="${68 + i * 172}" y="140" width="152" height="130" rx="14" fill="${c}"/>
  <text class="w" x="${144 + i * 172}" y="186" text-anchor="middle" font-size="22">${s}</text>
  <text x="${144 + i * 172}" y="222" text-anchor="middle" fill="${C.white}" font-size="14" opacity="0.9">${r}</text>`).join("\n") +
    `\n  <text class="s" x="400" y="330" text-anchor="middle">같은 코스도 계절에 따라 출발 시각과 복장 기준이 달라진다</text>`],

  "packing-groups": ["자전거 여행 준비물을 안전 수리 보급 세 묶음으로 나눈 도해",
    title("준비물은 세 묶음으로 나눠 담는다") +
    [["안전", "헬멧 · 전조등 · 후미등", C.forest], ["수리", "펌프 · 튜브 · 멀티툴", C.deep], ["보급", "물 · 행동식 · 현금", C.sun]]
      .map(([t, s, c], i) => `  <rect x="${70 + i * 230}" y="140" width="200" height="140" rx="16" fill="${c}"/>
  <text class="w" x="${170 + i * 230}" y="196" text-anchor="middle" font-size="24">${t}</text>
  <text x="${170 + i * 230}" y="232" text-anchor="middle" fill="${C.white}" font-size="14" opacity="0.9">${s}</text>`).join("\n") +
    `\n  <text class="s" x="400" y="336" text-anchor="middle">셋 중 하나라도 비면 그날 일정 전체가 흔들린다</text>`],

  "transit-transfer": ["자전거를 들고 역에서 코스 출발점까지 이동하는 환승 동선 도해",
    title("반입 가능 여부보다 역 안 동선이 문제") +
    track(210, [[110, "개찰구", "반입 시간대 확인"], [320, "계단·엘리베이터", "실제 병목"], [530, "출구", "지상까지 거리"], [700, "출발점", "라스트마일", C.deep]]) +
    `  <text class="s" x="400" y="352" text-anchor="middle">엘리베이터 위치를 미리 확인하지 않으면 계단에서 시간을 잃는다</text>`],

  "lodging-radius": ["코스 종료 지점을 기준으로 숙소를 고르는 거리 기준 도해",
    title("숙소는 코스 종료 지점 기준으로 고른다") +
    `  <circle cx="330" cy="205" r="120" fill="${C.blue}" opacity="0.22"/>
  <circle cx="330" cy="205" r="66" fill="${C.forest}" opacity="0.3"/>
  <circle cx="330" cy="205" r="14" fill="${C.forest}"/>
  <text class="t" x="330" y="180" text-anchor="middle">코스 종료</text>
  <text class="s" x="330" y="300" text-anchor="middle">3km 이내 권장</text>
  <text class="t" x="560" y="160">확인할 것</text>
  <text class="s" x="560" y="196">실내 자전거 보관</text>
  <text class="s" x="560" y="228">젖은 장비 건조</text>
  <text class="s" x="560" y="260">늦은 체크인 가능</text>
  <text class="s" x="400" y="360" text-anchor="middle">가격보다 자전거를 어디에 두느냐가 먼저다</text>`],

  "repair-triage": ["여행 중 자전거 고장 유형별 대처 분기 도해",
    title("현장에서 고칠 것과 포기할 것을 나눈다") +
    [["펑크", "현장 교체 가능", C.forest], ["체인 이탈", "현장 복구 가능", C.forest], ["변속 · 휠", "수리점 이동", "#e0574a"]]
      .map(([t, s, c], i) => `  <rect x="${70 + i * 230}" y="145" width="200" height="120" rx="16" fill="${c}"/>
  <text class="w" x="${170 + i * 230}" y="196" text-anchor="middle" font-size="22">${t}</text>
  <text x="${170 + i * 230}" y="228" text-anchor="middle" fill="${C.white}" font-size="14" opacity="0.9">${s}</text>`).join("\n") +
    `\n  <text class="s" x="400" y="320" text-anchor="middle">복구가 안 되면 대중교통 · 콜택시 · 택배 중 이동 대안을 먼저 정한다</text>`],

  "family-pace": ["보호자와 아이가 함께 탈 때의 위치와 휴식 간격 도해",
    title("아이 앞, 보호자 뒤, 20~30분마다 휴식") +
    `  <path d="M70 240 C220 190 420 270 730 210" fill="none" stroke="${C.white}" stroke-width="30" stroke-linecap="round"/>
  <circle cx="470" cy="243" r="20" fill="${C.sun}"/><text x="470" y="212" text-anchor="middle" class="t" font-size="16">아이</text>
  <circle cx="600" cy="228" r="22" fill="${C.forest}"/><text x="600" y="196" text-anchor="middle" class="t" font-size="16">보호자</text>
  <line x1="150" y1="310" x2="730" y2="310" stroke="${C.line}" stroke-width="5"/>
  ${[0, 1, 2].map(i => `<circle cx="${210 + i * 190}" cy="310" r="9" fill="${C.deep}"/><text class="s" x="${210 + i * 190}" y="342" text-anchor="middle">휴식 ${(i + 1) * 25}분</text>`).join("")}
  <text class="s" x="400" y="380" text-anchor="middle">피곤하다는 말이 나오기 전에 돌아갈 준비를 한다</text>`],

  "budget-split": ["국토종주 비용을 항목별로 나눈 비율 도해",
    title("비용은 숙박과 식비에서 갈린다") +
    (() => { const it = [["숙박", 300, C.forest], ["식비", 180, C.blue], ["교통", 130, C.deep], ["소모품", 90, C.sun], ["예비비", 60, C.muted]]; let x = 70; const tot = it.reduce((n, i) => n + i[1], 0);
      return it.map(([t, v, c]) => { const w = Math.round(660 * v / tot); const r = `  <rect x="${x}" y="160" width="${w - 6}" height="90" rx="10" fill="${c}"/>
  <text class="s" x="${x + (w - 6) / 2}" y="286" text-anchor="middle">${t}</text>`; x += w; return r; }).join("\n"); })() +
    `\n  <text class="s" x="400" y="340" text-anchor="middle">예비비를 빼면 하루만 틀어져도 계획 전체가 무너진다</text>`],

  "supply-gap": ["보급 지점이 드문 구간에서 물과 행동식을 계산하는 도해",
    title("보급 공백은 거리가 아니라 시간으로 센다") +
    track(200, [[110, "편의점", "출발 보급"], [280, "공백 25km", "약 1시간 30분", C.sun], [520, "공백 지속", "통신 사각 주의", "#e0574a"], [720, "편의점", "다음 보급"]]) +
    `  <text class="s" x="400" y="330" text-anchor="middle">물 1L와 행동식 2개를 공백 구간 진입 전에 미리 채운다</text>`],

  "route-difficulty": ["자전거길 코스를 난이도 기준으로 비교한 도해",
    title("난이도는 거리보다 상승과 바람이 정한다") +
    bars([
      { h: 60, top: "낮음", bottom: "평지 강변형", fill: C.blue },
      { h: 105, top: "보통", bottom: "호반 · 완만한 언덕", fill: C.forest },
      { h: 155, top: "높음", bottom: "누적 상승 · 맞바람", fill: C.sun },
      { h: 200, top: "매우 높음", bottom: "장거리 · 보급 공백", fill: "#e0574a" }
    ]) +
    `  <text class="s" x="400" y="384" text-anchor="middle">같은 40km라도 상승과 바람에 따라 체감이 두 배로 갈린다</text>`],

  "time-estimate": ["코스 소요시간을 속도와 휴식으로 계산하는 도해",
    title("소요시간 = 주행 + 휴식 + 사진 시간") +
    (() => { const it = [["주행", 380, C.forest], ["휴식", 160, C.blue], ["사진 · 식사", 120, C.sun]]; let x = 70; const tot = 660;
      return it.map(([t, v, c]) => { const w = Math.round(660 * v / tot); const r = `  <rect x="${x}" y="165" width="${w - 6}" height="86" rx="10" fill="${c}"/>
  <text class="s" x="${x + (w - 6) / 2}" y="288" text-anchor="middle">${t}</text>`; x += w; return r; }).join("\n"); })() +
    `\n  <text class="s" x="400" y="338" text-anchor="middle">평속 15km/h로 계산하고 휴식과 사진 시간을 40% 더한다</text>`],

  "nationwide-routes": ["전국 자전거길을 권역별로 나눈 개요 도해",
    title("전국 자전거길은 권역으로 나눠 본다") +
    [["수도권", "한강 · 아라 · 남한강", C.blue], ["충청", "금강 · 오천", C.forest], ["강원", "북한강 · 의암호", C.deep], ["영·호남", "낙동강 · 영산강", "#4f8f74"], ["제주", "환상 종주", C.sun]]
      .map(([t, s, c], i) => `  <rect x="${64 + (i % 3) * 232}" y="${i < 3 ? 120 : 250}" width="208" height="106" rx="14" fill="${c}"/>
  <text class="w" x="${168 + (i % 3) * 232}" y="${i < 3 ? 166 : 296}" text-anchor="middle" font-size="21">${t}</text>
  <text x="${168 + (i % 3) * 232}" y="${i < 3 ? 196 : 326}" text-anchor="middle" fill="${C.white}" font-size="14" opacity="0.9">${s}</text>`).join("\n")],

  "beginner-path": ["자전거 여행 초보가 단계별로 거리를 늘려가는 도해",
    title("초보는 거리보다 단계를 늘린다") +
    track(210, [[110, "1단계", "왕복 10km"], [300, "2단계", "왕복 25km"], [490, "3단계", "편도 40km"], [690, "4단계", "1박 종주", C.deep]]) +
    `  <text class="s" x="400" y="352" text-anchor="middle">각 단계를 두세 번 반복한 뒤 다음으로 넘어가면 무리가 없다</text>`],

  "check-routine": ["출발 직전 5분 자전거 점검 순서 도해",
    title("출발 직전 5분, 순서를 지켜 점검한다") +
    [["공기압", "손으로 눌러 확인"], ["브레이크", "앞뒤 각각"], ["체인", "소리와 늘어짐"], ["안장", "높이 · 고정"], ["라이트", "잔량 확인"]]
      .map(([t, s2], i) => `  <circle cx="${104 + i * 148}" cy="185" r="42" fill="${i < 2 ? C.forest : C.deep}"/>
  <text class="w" x="${104 + i * 148}" y="192" text-anchor="middle" font-size="17">${t}</text>
  <text class="s" x="${104 + i * 148}" y="258" text-anchor="middle" font-size="14">${s2}</text>
  <text x="${104 + i * 148}" y="126" text-anchor="middle" fill="${C.muted}" font-size="14">${i + 1}단계</text>`).join("\n") +
    `\n  <text class="s" x="400" y="330" text-anchor="middle">순서를 정해두면 하나를 빠뜨려도 바로 알아차린다</text>`],

  "passbook-app-compare": ["종주 인증수첩과 앱 인증 방식의 장단점 비교 도해",
    title("수첩과 앱은 서로의 약점을 메운다") +
    [["인증수첩", ["현장 스탬프로 확정", "배터리와 무관", "분실 시 복구 불가"], C.forest],
     ["앱 기록", ["자동 기록 · 백업", "분실 위험 낮음", "오프라인 구간 취약"], C.deep]]
      .map(([t, rows, c], i) => `  <rect x="${72 + i * 340}" y="115" width="316" height="180" rx="16" fill="${c}"/>
  <text class="w" x="${230 + i * 340}" y="158" text-anchor="middle" font-size="22">${t}</text>
${rows.map((r, j) => `  <text x="${230 + i * 340}" y="${196 + j * 30}" text-anchor="middle" fill="${C.white}" font-size="15" opacity="0.9">${r}</text>`).join("\n")}`).join("\n") +
    `\n  <text class="s" x="400" y="345" text-anchor="middle">둘 다 남겨두면 한쪽이 실패해도 구간을 다시 갈 일이 없다</text>`],

  "center-hours": ["인증센터 마감 시간과 도착 시각에 따른 대처 도해",
    title("마감 후 도착이면 기록부터 남긴다") +
    track(200, [[130, "운영 중", "스탬프 즉시"], [370, "마감 직후", "사진 · 앱 기록", C.sun], [630, "다음날", "재방문 판단", "#e0574a"]]) +
    `  <text class="s" x="400" y="320" text-anchor="middle">무인 부스는 24시간인 곳이 있으므로 센터 유형을 먼저 확인한다</text>`],

  "pain-points": ["장거리 라이딩에서 통증이 생기는 부위와 조정 항목 도해",
    title("통증 부위마다 조정할 곳이 다르다") +
    [["목 · 어깨", "핸들 거리 · 시선", 130], ["손목", "장갑 · 체중 분산", 330], ["엉덩이", "안장 높이 · 각도", 530], ["무릎", "안장 높이 · 회전수", 690]]
      .map(([t, s2, x]) => `  <circle cx="${x}" cy="170" r="16" fill="#e0574a"/>
  <text class="t" x="${x}" y="212" text-anchor="middle" font-size="17">${t}</text>
  <text class="s" x="${x}" y="242" text-anchor="middle" font-size="14">${s2}</text>`).join("\n") +
    `\n  <text class="s" x="400" y="320" text-anchor="middle">통증은 참을 신호가 아니라 세팅을 바꾸라는 신호다</text>`],

  "insurance-check": ["자전거 보험 가입 전 확인할 담보 항목 도해",
    title("보험은 중복부터 확인한다") +
    [["배상책임", "상대 피해 보상", C.forest], ["본인상해", "내 부상 보상", C.deep], ["실손 중복", "이미 있는지 확인", C.sun]]
      .map(([t, s2, c], i) => `  <rect x="${70 + i * 230}" y="140" width="200" height="130" rx="16" fill="${c}"/>
  <text class="w" x="${170 + i * 230}" y="192" text-anchor="middle" font-size="21">${t}</text>
  <text x="${170 + i * 230}" y="226" text-anchor="middle" fill="${C.white}" font-size="14" opacity="0.9">${s2}</text>`).join("\n") +
    `\n  <text class="s" x="400" y="326" text-anchor="middle">지자체 자전거 보험에 이미 가입돼 있는 경우가 많다</text>`],

  "bikepacking-load": ["바이크패킹에서 짐을 자전거에 나눠 싣는 위치 도해",
    title("무거운 짐은 낮고 가운데로") +
    `  <path d="M150 300 h500" stroke="${C.line}" stroke-width="6" stroke-linecap="round"/>
  <circle cx="215" cy="300" r="46" fill="none" stroke="${C.muted}" stroke-width="8"/>
  <circle cx="585" cy="300" r="46" fill="none" stroke="${C.muted}" stroke-width="8"/>
  <path d="M215 300 L330 200 L470 200 L585 300" fill="none" stroke="${C.ink}" stroke-width="7"/>
  <rect x="330" y="205" width="120" height="60" rx="10" fill="${C.forest}"/>
  <text class="w" x="390" y="242" text-anchor="middle" font-size="15">프레임백</text>
  <rect x="470" y="150" width="130" height="46" rx="10" fill="${C.deep}"/>
  <text class="w" x="535" y="180" text-anchor="middle" font-size="15">안장백</text>
  <rect x="228" y="150" width="120" height="46" rx="10" fill="${C.sun}"/>
  <text class="w" x="288" y="180" text-anchor="middle" font-size="15">핸들바백</text>
  <text class="s" x="400" y="368" text-anchor="middle">무게 중심이 높으면 저속에서 핸들이 흔들린다</text>`],

  "weather-decision": ["날씨가 바뀌었을 때 계속 갈지 우회할지 중단할지 판단하는 분기 도해",
    title("계속 · 우회 · 중단을 미리 정해둔다") +
    [["계속", "시야 확보 · 노면 정상", C.forest], ["우회", "바람 · 침수 구간 회피", C.sun], ["중단", "특보 · 체온 저하", "#e0574a"]]
      .map(([t, s2, c], i) => `  <path d="M400 118 L${170 + i * 230} 168" stroke="${C.muted}" stroke-width="3"/>
  <rect x="${70 + i * 230}" y="168" width="200" height="110" rx="16" fill="${c}"/>
  <text class="w" x="${170 + i * 230}" y="214" text-anchor="middle" font-size="22">${t}</text>
  <text x="${170 + i * 230}" y="246" text-anchor="middle" fill="${C.white}" font-size="14" opacity="0.9">${s2}</text>`).join("\n") +
    `\n  <circle cx="400" cy="112" r="16" fill="${C.deep}"/>
  <text class="s" x="400" y="332" text-anchor="middle">출발 전에 기준을 정해두면 현장에서 무리하지 않는다</text>`]
};

mkdirSync("assets/images/figures", { recursive: true });
for (const [name, [label, inner]] of Object.entries(figures)) {
  writeFileSync(`assets/images/figures/${name}.svg`, frame(label, inner), "utf8");
}
console.log(`figures: ${Object.keys(figures).length}`);
