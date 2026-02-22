# 구글 플레이 스토어 출시 가이드 (PC 웹 게임 -> 안드로이드 앱 변환)

현재 만드신 "똥 피하기" 게임은 웹 기술(HTML, CSS, JS)로 만들어져 있습니다. 이를 안드로이드 앱으로 변환하여 구글 플레이 스토어에 출시하기 위한 단계를 안내해 드립니다.

가장 추천하는 방법은 **Capacitor**를 사용하는 것입니다. 웹 코드를 그대로 앱으로 감싸주는 현대적인 도구입니다.

## 1단계: 준비물
1.  **Node.js**: 이미 설치되어 있어야 합니다.
2.  **Android Studio**: 안드로이드 앱을 빌드하기 위해 필수입니다. [다운로드 링크](https://developer.android.com/studio)에서 설치하세요.
3.  **Google Play 개발자 계정**: 구글 플레이 콘솔에 등록해야 하며, **$25 (약 3만원, 평생 1회)**의 등록비가 필요합니다.

## 2단계: 프로젝트를 앱으로 변환하기 (Capacitor 사용)

터미널에서 다음 명령어를 순서대로 실행하여 프로젝트에 Capacitor를 적용합니다.

### 1. 프로젝트 초기화 (이미 되어있지 않다면)
```bash
npm init -y
```

### 2. Capacitor 설치
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init
```
*   질문이 나오면 다음과 같이 입력하세요:
    *   **Name**: Poop Dodge (또는 원하시는 앱 이름)
    *   **Package ID**: com.yourname.poopdodge (전세계에서 유일한 ID여야 합니다. 예: `com.chulsoo.poopgame`)
    *   **Web asset directory**: `.` (현재 폴더를 의미합니다. 또는 웹 파일들을 `www` 폴더에 모아두고 `www`라고 입력해도 됩니다.)

### 3. 설정 수정 (`capacitor.config.json`)
생성된 `capacitor.config.json` 파일에서 `webDir`이 HTML 파일이 있는 경로와 맞는지 확인하세요. 현재 구조로는 `.`(현재 디렉토리) 혹은 소스파일들을 별도 폴더(예: `www`)로 옮기는 것이 깔끔합니다.
**권장**: `index.html`, `style.css`, `script.js`, `Assets/` 폴더 등을 모두 새로운 `www` 폴더를 만들어 그 안으로 옮기세요. 그리고 `capacitor.config.json`의 `webDir`을 `"www"`로 설정하세요.

### 4. 안드로이드 플랫폼 추가
```bash
npx cap add android
```

### 5. 앱 동기화 및 열기
```bash
npx cap sync
npx cap open android
```
이 명령어를 입력하면 **Android Studio**가 열립니다.

## 3단계: Android Studio에서 빌드 및 테스트

1.  Android Studio가 열리면 프로젝트가 로드될 때까지 기다립니다 (오른쪽 아래 바가 멈출 때까지).
2.  **테스트**: 상단의 `Run` 버튼(초록색 재생 버튼)을 눌러 에뮬레이터나 연결된 실제 폰에서 게임이 잘 돌아가는지 확인합니다.
3.  **아이콘 변경**: `app/src/main/res` 폴더 내의 아이콘 파일들을 게임 아이콘으로 교체해야 합니다. (Android Studio의 'Image Asset Studio' 기능을 사용하면 편리합니다.)
4.  **서명된 번들 빌드 (출시용)**:
    *   메뉴에서 `Build` > `Generate Signed Bundle / APK` 선택.
    *   `Android App Bundle` 선택.
    *   `Key store path`에서 `Create new...`를 눌러 키(암호)를 생성합니다. **이 키 파일과 비밀번호는 절대 잃어버리면 안 됩니다!** (분실 시 앱 업데이트 불가능)
    *   빌드가 완료되면 `.aab` 파일이 생성됩니다. 이 파일이 플레이 스토어에 업로드할 파일입니다.

## 4단계: 구글 플레이 콘솔 등록

1.  [Google Play Console](https://play.google.com/console)에 접속하여 로그인 및 $25 결제를 진행합니다.
2.  **앱 만들기** 버튼을 클릭합니다.
3.  **앱 정보 입력**:
    *   앱 이름, 기본 언어.
    *   앱/게임 여부 (게임 선택).
    *   유료/무료 여부.
4.  **대시보드 절차 따르기**:
    *   **개인정보처리방침**: 웹사이트에 간단한 개인정보처리방침을 올리고 링크를 넣어야 합니다. (개인정보를 수집하지 않는다면 "수집하지 않음"을 명시한 노션 페이지 등의 링크라도 있어야 합니다.)
    *   **앱 콘텐츠 설정**: 광고 포함 여부, 타겟 연령층(만 3세 이상 등), 뉴스 앱 여부 등을 체크합니다.
    *   **스토어 등록정보**: 앱 아이콘(512x512), 스크린샷(폰, 태블릿), 그래픽 이미지(1024x500) 등을 업로드합니다.
5.  **프로덕션 트랙에 출시**:
    *   `프로덕션` 메뉴로 이동.
    *   `새 출시 만들기`.
    *   Android Studio에서 만든 `.aab` 파일을 업로드합니다.
    *   출시명과 출시 노트를 적고 `검토`를 누릅니다.

## 5단계: 심사 대기

구글의 심사는 보통 3일~7일 정도 소요됩니다. 심사가 통과되면 플레이 스토어에 "똥 피하기" 게임이 공개됩니다!

---

### 팁
*   **가로/세로 모드 고정**: 모바일 게임은 보통 세로로 고정하는 것이 좋습니다. `android/app/src/main/AndroidManifest.xml` 파일에서 `<activity>` 태그 안에 `android:screenOrientation="portrait"` 속성을 추가하면 세로로 고정됩니다.
*   **터치 컨트롤**: 현재 코드는 키보드와 터치를 모두 지원하므로 모바일에서도 문제없이 작동할 것입니다.
