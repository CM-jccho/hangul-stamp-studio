# Hangul Stamp Studio · 한글 낙관 도장 스튜디오

내 이름을 한글로 바꿔 **전통 낙관 도장**, **붓글씨**, **미니멀 타투 도안**, **모던 서울 포스터**로 그려 주는 정적 웹앱입니다.
스페인어(es) · 포르투갈어(pt) · 영어(en) · 한국어(ko) 4개 국어를 지원하고, 남미·글로벌 한류 팬을 첫 타겟으로 만들었습니다.

- 외부 빌드 없음 · 서버 없음 · 프레임워크 없음 → **GitHub Pages / Vercel / Netlify / Cloudflare Pages에 폴더째 올리면 바로 동작**
- 이름 변환·렌더링·다운로드가 **전부 브라우저 안에서** 처리됩니다(이름이 서버로 가지 않음)
- 무료: 워터마크 PNG(1080px) / PRO: 워터마크 제거 + 3000px PNG + 벡터 SVG + 3비율 일괄 저장

---

## 1. 폴더 구조

```
hangul-stamp-studio/
├─ index.html            화면(마크업)
├─ css/styles.css        디자인(한지·먹·주홍 팔레트, 반응형)
├─ js/config.js          ★ 배포 전에 고칠 설정(가격, 구매 URL, 체험 코드)
├─ js/i18n.js            4개 국어 문구(es/pt/en/ko) — 키 100+ 전부 4개 언어에 존재
├─ js/translit.js        라틴 이름 → 한글 음차 엔진(사전 370여 개 + 음가 규칙)
├─ js/render.js          Canvas 4종 렌더러 + SVG 내보내기(폰트 내장)
├─ js/app.js             앱 로직(상태·다운로드·PRO 잠금)
└─ tests/e2e.py          Playwright 자동 검증(81개 체크)
```

## 2. 배포 방법 (5분)

### GitHub Pages
```bash
cd hangul-stamp-studio
git init && git add . && git commit -m "Hangul Stamp Studio"
git branch -M main
git remote add origin https://github.com/<본인계정>/hangul-stamp-studio.git
git push -u origin main
# GitHub → Settings → Pages → Source: Deploy from a branch → main / (root)
```
`https://<본인계정>.github.io/hangul-stamp-studio/` 로 열립니다.

### Vercel / Netlify
- Vercel: `vercel` 명령 또는 대시보드에서 폴더를 드래그 → Framework: **Other**, Build command 없음, Output: `.`
- Netlify: 폴더를 드래그 앤 드롭하면 끝.

> 커스텀 도메인을 붙이면 `js/config.js`의 `SITE_URL`을 실제 도메인으로 바꿔 주세요(워터마크에 표시됩니다).

## 3. 판매 연결 (PRO)

`js/config.js`에서 세 줄만 고치면 됩니다.

```js
PRO_BUY_URL: 'https://yourname.gumroad.com/l/hangul-stamp', // 비우면 "결제 준비 중" 안내로 표시
PRO_PRICE: '$4.90',
PRO_CODE: 'HANGUL-PRO-2026',   // 실제 판매용 코드로 바꾸고, 구매자에게만 전달
```

**Gumroad 절차**
1. 상품 생성 → 가격 `$4.90` (Pay-what-you-want 아님, 고정가)
2. 상품 파일은 비워 두고, **"내용(Content)"에 해금 코드를 적습니다.** 예:
   > 결제해 주셔서 감사합니다! 아래 코드를 사이트 PRO 입력창에 넣으면 워터마크 없는 3000px PNG와 벡터 SVG를 받으실 수 있어요.
   > `HANGUL-PRO-2026`
3. 결제 완료 메일이 자동 발송되므로 코드 전달이 자동화됩니다.
4. 남미 결제를 위해 Gumroad 기본 카드/PayPal을 그대로 두면 됩니다(브라질은 카드+PayPal 비중이 큼).

**Payhip**도 동일합니다(상품 → Digital product → "Thank you page"에 코드 기재).

> 더 강한 잠금이 필요하면 Gumroad의 "License key" 기능을 쓰고, `app.js`의 `tryUnlock()`을 Gumroad License API 검증으로 바꾸면 됩니다. 지금 구조는 **서버 없는 정적 사이트**라 코드 방식이 가장 단순합니다.

## 4. 제품 구성

| 구분 | 무료 | PRO ($4.90) |
|---|---|---|
| 이름 → 한글 음차 + 발음 가이드 | ✅ | ✅ |
| 4가지 스타일 · 3가지 비율 미리보기 | ✅ | ✅ |
| PNG 저장 | 1080px · 워터마크 | 3000px · 워터마크 없음 |
| 벡터 SVG (타투·인쇄) | ❌ | ✅ (폰트 내장, 뷰어에서 글꼴 안 깨짐) |
| 3비율 일괄 저장(6개 파일) | ❌ | ✅ |
| 사용 범위 | SNS 공유 | 개인 + 인쇄 상품 |

체험 코드: `HANGUL-PRO-2026` (config.js에서 변경 가능)

## 5. 기술 메모

- **음차 엔진**: 스페인어/포르투갈어/영어 음가 규칙 + 인기 이름 사전(377개 표제어, 언어별 표기 분리)
  - 예: `Sofía → 소피아`, `Mateo → 마테오`, `Thiago → 티아고`, `João → 주앙`, `Julián → 훌리안`, `Bruno → 브루누(pt) / 브루노`
  - 사전에 없으면 규칙 엔진이 처리하고, 결과는 **한글 입력창에서 직접 수정 가능**
- **발음 가이드**: 추정 원어, 로마자 표기, UI 언어 기준 읽기(`so-pi-a` / `sô-pi-a` / `soh-pee-ah`), 원어별 음가 팁
- **렌더링**: Canvas 2D. 낙관은 별도 레이어에 도장을 찍은 뒤 잉크가 덜 묻은 부분을 지워 실제 도장 질감을 냅니다. 붓글씨는 블러 다중 패스로 번짐을, 타투는 `strokeText`로 라인아트를 만듭니다.
- **SVG 내보내기**: Google Fonts CSS를 파싱해 **쓰인 글자만 담은 woff2 서브셋을 base64로 내장**합니다. 그래서 Illustrator/Figma/타투샵 PC에서도 글꼴이 대체되지 않습니다(파일당 약 570KB).
- **폰트**: Black Han Sans, Song Myung, Nanum Brush Script, Noto Sans KR, Instrument Serif (모두 Google Fonts, OFL)

## 6. 법적·문화적 안전장치

- 특정 K-POP 아티스트·그룹의 이름, 로고, 초상, 음반 이미지를 **일절 사용하지 않습니다.**
- 한글 자체와 한국 인장 문화(낙관)만 사용하며, 앱 내 문구에서도 "공식 굿즈가 아닌 한국 문화"임을 4개 국어로 명시합니다.
- 폰트는 OFL 라이선스라 상업적 사용이 가능합니다. Google Fonts를 CDN으로 불러오므로 폰트 파일을 재배포하지 않습니다.

## 7. 자동 검증

```bash
pip install playwright pillow
playwright install chromium
python3 tests/e2e.py
```

검증 항목(81개): 4개 국어 전환 시 문구 누락 0건, 이름 변환 9종, 4스타일 × 3비율 렌더, 무료 PNG(1080) 다운로드, PRO 잠금 차단 → 체험 코드 해금 → 3000px PNG·SVG(폰트 내장) 다운로드, 일괄 6파일, 1440/768/390px 가로 오버플로 0, 콘솔·페이지 에러 0.

## 8. 상품 페이지 문구(복사용)

**ES**
> Tu nombre en hangul, hecho a mano. Sello coreano (낙관), caligrafía a pincel, tatuaje minimalista y póster de Seúl en 4 idiomas. Descarga en PNG y SVG vectorial para tatuajes e impresión.

**PT**
> Seu nome em hangul, feito à mão. Selo coreano (낙관), caligrafia a pincel, tatuagem minimalista e pôster de Seul em 4 idiomas. Download em PNG e SVG vetorial para tatuagem e impressão.

**EN**
> Your name in hangul, made by hand. Korean seal (낙관), brush calligraphy, minimal tattoo and Seoul poster in 4 languages. PNG and vector SVG for tattoos and print.

**KO**
> 내 이름을 한글로. 낙관 도장·붓글씨·타투 도안·서울 포스터를 4개 국어로 만들고, 타투·인쇄용 벡터 SVG로 저장하세요.

---

© 2026 Hangul Stamp Studio. 한글과 인장 문화는 모두의 것입니다.
