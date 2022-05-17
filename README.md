# U4A_APP_ELECTRON
ELECTRON 기반의 APP

## 배포시 주의사항!!
1. 반드시 cordova platform electron을 삭제 후 2.0.0으로 빌드 할것!!
  cordova platform rm electron
  cordova platform add electron@2.0.0

2. settings js에 개발툴 오픈 로직 주석으로 막을것!!
경로) platforms/electron/platform_www/cdv-electron-main.js

** 아래의 소스를 주석으로 막을것!! **

// Open the DevTools.
if (cdvElectronSettings.browserWindow.webPreferences.devTools) {
    mainWindow.webContents.openDevTools();
}

3. icon 이미지(.png)의 사이즈가 가로 세로 각각 512px 이상이여야 함.

4. 운영 (고객) 배포용 일 경우

/www/settings/u4a-electron-settings.json 안에

isDev : false;

나머지는
isDev : true로 반드시 변경 할 것!!;