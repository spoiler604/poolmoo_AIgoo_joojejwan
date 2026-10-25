# 우리의 작은 우주

학생과 학부모가 별자리를 탐험하며 배운 내용을 살펴보는 정적 웹사이트입니다.
보라색 인물의 걷는 GIF와 가슴 열림 이미지에서 줌인·별빛 터널을 거쳐 은하 지도로 이어집니다. 소주제에는 Canva 발표자료 또는 책 형태의 PDF 뷰어를 연결합니다.

현재 버전은 **1.1.0**이며 태그는 `v1.1.0-image-intro`입니다. [버전 기록](CHANGELOG.md)에 변경 사항을 기록합니다. 영상 인트로가 있던 버전은 로컬 Git 태그 `v1.0.0-video-intro`로 보존되어 있습니다.

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

`_site/`에 실제 사이트 파일만 모입니다. 걷는 GIF·가슴 열림 이미지, 배경 이미지, 책의 원본 PDF와 28쪽 이미지가 포함됩니다. 현재 버전은 인트로 MP4를 로드하지 않습니다.
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
- `assets/intro/figure-walk.gif`, `assets/intro/figure-open.png`: 현재 인트로
- `assets/intro/intro-firefly.mp4`: 이전 버전의 보관 영상
- `assets/books/lit/`: 겸서 소주제 1의 PDF와 페이지 이미지
- `book-reader.js`, `book-reader.css`: 책 뷰어
- `script.js`, `style.css`: 별자리 지도와 카메라 조작

자료를 수정한 뒤 `npm test`와 `npm run build`를 실행하고 원격 저장소에 변경을 올립니다.
