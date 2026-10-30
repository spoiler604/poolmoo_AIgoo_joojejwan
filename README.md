# 에이구 · 2026 풀무제 소모둠

학생과 학부모가 별자리를 탐험하며 배운 내용을 살펴보는 정적 웹사이트입니다.
보라색 인물의 걷는 GIF가 반복되고, 클릭하면 가슴 열림 이미지로 부드럽게 전환됩니다. 이어서 줌인·별빛 터널을 거쳐 은하 지도로 이동합니다. 소주제에는 Canva 발표자료, 책 형태의 PDF 뷰어 또는 글·이미지 읽기 창을 연결합니다.
중앙 은하를 누르면 회오리 영상이 재생되는 동안 별빛 선과 일곱 개의 별자리가 차례로 나타납니다.
태양계 8개 행성은 모두 46px 크기(토성은 고리 포함)입니다. 처음에는 보이지 않다가 지도가 나타난 후 3~5.5초 사이에 첫 행성이 화면 바깥에서 들어옵니다. 위·아래·왼쪽·오른쪽을 네 번의 등장마다 한 번씩 섞어 사용하고, 각 가장자리의 등장 위치와 순서도 무작위로 정합니다. 이후 7~14초 간격으로 다른 행성들이 나타나 약 2.5~4분 동안 천천히 화면을 가로지릅니다. 표면은 약 4~7분에 한 바퀴씩 회전합니다. 별자리를 선택하면 행성이 은은해집니다. 인트로 모션을 생략해도 배경 행성은 움직이며, 명시적으로 시스템 모션 모드를 선택하면 운영체제의 모션 감소 설정을 따릅니다. `planets.js`, `planets.css`에서 등장·크기·속도를 조정합니다.
별자리를 선택하면 연결된 이야기의 미리보기 카드가 별 옆에 나타납니다. 자료 제목은 미리보기 카드에만 표시하고 별 자체에는 글자를 표시하지 않습니다. 카드를 눌러 발표자료·글·이미지·책을 열며, 좁은 화면에서는 카드가 아래쪽에 배치됩니다. 한울·상목·경찬은 이야기 하나씩, 승원은 두 개를 연결합니다.
인트로와 별자리 탐색에는 브라우저에서 합성한 공간음과 별빛 효과음이 재생됩니다. 매번 소리 켜짐 상태로 시작하며, 음소거는 현재 방문 동안만 적용됩니다. 인트로 대기 배경음은 화면을 누르면 0.6초 안에 사라지고 전환 효과음으로 이어집니다. 자동 재생이 차단된 브라우저에서는 오른쪽 위 스피커 버튼을 누르면 인트로 배경음이 시작됩니다. 다른 탭으로 이동하면 소리가 멈춥니다.
한글 글 자료는 검은 코드 편집기 모양의 읽기 창으로 표시합니다. 줄 번호, 용어 색상 강조, 접는 지침서, 확대·축소·닫기를 지원하며 이미지 자료 창은 원래 형태를 유지합니다. 우희의 자료는 「레픽 아나돌 주제관」, 「My AI」, 「AI인프라 주제관」 순서입니다. 한울의 첫 자료에는 Canva 「기업과 AI」를 연결했습니다.
지도를 보고 있는 시간이 2분 지날 때마다 작은 고양이 GIF가 왼쪽에서 오른쪽으로 18초 동안 지나갑니다. 다른 탭에서는 카운트다운과 이동이 잠시 멈춥니다. `easter-egg.js`의 `interval`에서 간격을 조정합니다.

현재 버전은 **1.4.1**이며 태그는 `v1.4.1`입니다. [버전 기록](CHANGELOG.md)에 변경 사항을 기록합니다. 이전 버전은 각각의 Git 태그로 보존합니다.

배경음·효과음의 기본 출력은 이전 버전의 두 배입니다. 은하 영상은 사용하는 앞 3.2초만 960px·24fps로 압축한 약 1MB 파일이며 클릭할 때 불러옵니다. 배경·은하·우주인·가슴 열림 이미지는 WebP를 사용하고, 자료 미리보기 이미지는 해당 별자리를 선택할 때 내려받습니다. 원본 미디어는 별도 파일로 보관합니다. 은하 배경 제거는 480×270으로 처리하며, 인트로 터널은 고해상도 화면에서도 약 160만 픽셀로 제한합니다.

## 로컬 미리보기

Node.js 22 이상에서 추가 패키지 설치 없이 실행합니다.

```sh
npm run preview
```

브라우저에서 `http://127.0.0.1:8768/`을 엽니다.

## 검사와 배포 파일 만들기

```sh
npm test
npm run build
```

`_site/`에 실제 사이트 파일만 모입니다. 걷는 GIF·가슴 열림 이미지, 은하 영상, 배경과 현재 연결된 자료 이미지가 포함됩니다. 인트로 MP4, 이전 LIT 자료와 원본 HWPX는 프로젝트에 보관하며, 현재 화면에서 사용하지 않는 파일은 배포 폴더에 포함하지 않습니다.
과거 시안, 미리보기 캡처, 테스트, 개발용 도구와 메모는 사이트에 포함되지 않습니다.
GitHub 프로젝트 하위 주소에서도 작동하도록 이미지·영상·문서는 상대 경로로 연결합니다.

## GitHub Pages로 배포

1. 사용할 GitHub 저장소를 준비하고 이 프로젝트를 해당 저장소의 `main` 브랜치에 올립니다.
2. 저장소의 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
3. **Actions → Deploy website to GitHub Pages**에서 실행 상태를 확인합니다. 설정 후 최초 실행이 필요하면 **Run workflow**를 누릅니다.
4. 성공하면 **Settings → Pages**와 배포 작업의 `github-pages` 환경에 실제 사이트 주소가 표시됩니다.

이후 `main`에 변경을 올리면 테스트와 빌드가 통과한 버전이 자동 배포됩니다. 별도 서버나 API 키는 필요하지 않습니다.

GitHub Free에서는 공개 저장소로 Pages를 사용할 수 있습니다. 비공개 저장소 지원은 계정 요금제에 따라 다릅니다.
공개 사이트에는 현재 연결된 영상, PDF와 발표자료가 표시됩니다.

공식 안내:
- [배포 소스 설정](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub Actions로 Pages 배포](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## 내용 바꾸기

- `cosmos-data.js`: 별자리 이름, 소주제, Canva 주소와 책의 페이지 설정
- `assets/intro/figure-walk.gif`, `assets/intro/figure-open.webp`: 현재 인트로의 걷기와 가슴 열림 이미지 (`figure-open.png`는 원본 보관)
- `assets/cosmos/galaxy-swirl-lite.mp4`: 실제 재생하는 압축 은하 영상 (`galaxy-swirl.mp4`는 원본 보관)
- `assets/intro/intro-firefly-20261028.mp4`, `intro-video.js`: 사용하지 않는 영상 인트로 보관 파일
- `assets/intro/intro-firefly.mp4`: 이전 버전의 보관 영상
- `assets/books/lit/`: 이전 겸서 소주제 1의 LIT 원본과 페이지 이미지 보관
- `book-reader.js`, `book-reader.css`: 책 뷰어
- `index.html`의 `woohui-refik`, `woohui-my-ai`, `woohui-infrastructure` 템플릿: 우희의 세 한글 자료
- `assets/articles/woohui/`: 우희 한글 원본과 문서에서 추출한 이미지, 이전 자료 보관
- `index.html`의 `gyeomseo-article` 템플릿과 `assets/articles/gyeomseo/`: 겸서의 IT 인프라 글, 원본 HWPX와 두 책 표지
- `index.html`의 `aigu-introduction` 템플릿과 `assets/articles/aigu/`: 소모둠 소개의 소개글과 원본 HWPX
- `assets/presentations/gyeongchan/`: 경찬의 「AI 인프라의 현재와 과거」 PPT 원본, PDF와 5장 슬라이드 이미지
- `article-reader.js`, `article-reader.css`: 확대·축소·닫기가 있는 읽기 창 (70~200%)
- `code-reader.css`: 한글 글 자료와 미리보기의 코드 편집기 스타일
- `easter-egg.js`, `easter-egg.css`, `assets/cosmos/easter-egg-cat.gif`: 2분 간격 고양이 이스터에그
- `script.js`, `style.css`: 별자리 지도와 카메라 조작
- `preview-layout.js`: 별에 연결된 미리보기 카드의 화면 크기별 배치. 모든 별자리의 이미지·Canva 발표자료 카드는 같은 큰 크기 기준을 적용하며 세로 표지는 원래 비율을 유지합니다.
- `sound.js`: 인트로 공간음, 우주 배경음, 은하·별자리·소주제 효과음과 음소거 설정

자료를 수정한 뒤 `npm test`와 `npm run build`를 실행하고 원격 저장소에 변경을 올립니다.
