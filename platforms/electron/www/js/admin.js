
let oAPP = (function () {
    "use strict";

    const
        REMOTE = parent.require('@electron/remote'),
        PATH = parent.require('path'),
        APP = REMOTE.app,
        APPPATH = APP.getAppPath(),
        DIALOG = REMOTE.require('electron').dialog,
        COMMON = parent.require(PATH.join(APPPATH, "\\js\\common.js"));

    return {

        onStart: function () {

            var oCurrWin = oAPP.remote.getCurrentWindow(),
                aMenus = COMMON.getMenuBarList();

            // 현재 브라우저에 메뉴를 적용한다.
            var MENU = oAPP.remote.Menu,
                oMenu = MENU.buildFromTemplate(aMenus);

            oCurrWin.setMenu(oMenu);

        },

        onCreateShortcut: function () {

            var oCurrView = REMOTE.getCurrentWindow();

            event.preventDefault();

            oAPP.setBusy('X');

            var oAppid = document.getElementById("appid"),
                oAppdesc = document.getElementById("appdesc"),
                oProto = document.getElementById("proto"),
                oHost = document.getElementById("host"),
                oPort = document.getElementById("port"),
                oPath = document.getElementById("path"),
                oParam = document.getElementById("parameters");

            var oAppInfo = {
                APPID: oAppid.value,
                APPDESC: oAppdesc.value,
                PROTO: oProto.value,
                HOST: oHost.value,
                PORT: oPort.value,
                PATH: oPath.value,
                PARAM: oParam.value
            };

            // 입력값 체크..
            var oRet = oAPP.onCheckAppInfo(oAppInfo);
            if (oRet.CODE == "E") {

                // alert(oRet.MSG);
                DIALOG.showMessageBoxSync(oCurrView, {
                    title: "Error!",
                    message: oRet.MSG,
                    type: "error",
                    buttons: ["OK"]
                });

                oAPP.setBusy('');

                return;
            }

            var oShortCutAppInfo = {
                DATA: oAppInfo
            };

            // Shortcut 아이콘(.ico) 파일만 선택
            var options = {
                title: "ShortCut Icon Select",
                filters: [{
                    name: 'Images',
                    extensions: ['ico']
                }],
                properties: ['openFile', '']
            };

            //파일 폴더 디렉토리 선택 팝업 
            var oFilePathPromise = oAPP.remote.dialog.showOpenDialog(oAPP.remote.getCurrentWindow(), options);

            oFilePathPromise.then(function (oPaths) {

                debugger;

                var sIconPath = oPaths.filePaths[0];

                var iBtnIndex = DIALOG.showMessageBoxSync(oCurrView, {
                    title: "Create Shortcut",
                    message: "Do you want to Create Shortcut?",
                    type: "question",
                    buttons: ["Create", "Cancel"]
                });

                // cancel Button 선택시 빠져나간다.
                if (iBtnIndex == 1) {
                    oAPP.setBusy('');
                    return;
                }

                if (typeof sIconPath != "undefined") {

                    // shortcut Icon path
                    oShortCutAppInfo.DATA.ICONPATH = sIconPath;

                }

                var sShortcutName = oAppInfo.APPID + ".lnk",
                    sShortcutUrl = oAPP.path.join(parent.gfn_getAPPDATA(), 'Microsoft', 'Windows', 'Start Menu', 'Programs', sShortcutName),
                    sTargetUrl = parent.process.execPath;

                var arguEnc = encodeURIComponent(JSON.stringify(oShortCutAppInfo));

                var oShortcutInfo = {
                    shortcutUrl: sShortcutUrl, // shortcut 바로가기 경로
                    target: sTargetUrl, //인스톨 설치된(EXE) 경로 
                    args: arguEnc, // shortcut 만들려는 app 정보
                    description: oAppInfo.APPDESC, // 바로가기 이름
                    appUserModelId: sTargetUrl,
                    icon: sIconPath, // 아이콘 이미지 경로
                    iconIndex: 0
                };

                // Shortcut Download
                oAPP.onShortCutDownload(oShortcutInfo);

            }).catch(function (e) {

                DIALOG.showMessageBox(oCurrView, {
                    title: "Error!",
                    message: e.toString(),
                    type: "error",
                    buttons: ["OK"]
                });

                // var sMsg = oAPP.onGetMsgTxt("0019"); /* 다운로드 폴더 디렉토리 선택 실패! */
                // alert(sMsg);

                // Busy 실행 끄기
                oAPP.setBusy('');

                return;

            });

        },

        onShortCutDownload: function (oShortcutInfo) {

            //실행~
            var res = oAPP.shell.writeShortcutLink(oShortcutInfo.shortcutUrl, {
                target: oShortcutInfo.target,
                args: oShortcutInfo.args,
                description: oShortcutInfo.description,
                appUserModelId: oShortcutInfo.appUserModelId,
                icon: oShortcutInfo.icon,
                iconIndex: oShortcutInfo.iconIndex
            });

            //리턴 
            if (res) {

                alert('Shortcut created successfully', 'success');

                // 파일 다운받은 폴더를 오픈한다.
                oAPP.shell.showItemInFolder(oShortcutInfo.shortcutUrl);

            } else {
                alert('Failed to create the shortcut', 'danger');

            }

            oAPP.setBusy('');

        },

        // 앱 정보 입력 체크
        onCheckAppInfo: function (oTargetData) {

            /***********************************************************************************
             *  APP ID 체크
             ***********************************************************************************/
            var oRetMsg = oAPP.checkValidAppId(oTargetData.APPID);
            if (oRetMsg.CODE == "E") {
                return oRetMsg;
            }

            /***********************************************************************************
             *  Protocol 체크
             ***********************************************************************************/
            var oRetMsg = oAPP.checkValidProtocol(oTargetData.PROTO);
            if (oRetMsg.CODE == "E") {
                return oRetMsg;
            }

            /***********************************************************************************
             *  Host 체크
             ***********************************************************************************/
            var oRetMsg = oAPP.checkValidHost(oTargetData.HOST);
            if (oRetMsg.CODE == "E") {
                return oRetMsg;
            }

            /***********************************************************************************
             *  Path 체크
             ***********************************************************************************/
            var oRetMsg = oAPP.checkValidPath(oTargetData.PATH);
            if (oRetMsg.CODE == "E") {
                return oRetMsg;
            }

            oRetMsg.CODE = "S";

            return oRetMsg;

        }, // end of oAPP.onCheckAppInfo      

        // APPID 입력 체크
        checkValidAppId: function (sAppId) {

            var oRetMsg = {
                CODE: "E",
                TYPE: "APPID",
                MSG: ""
            };

            // 입력 여부 확인
            if (!sAppId) {
                oRetMsg.MSG = "Shortcut Name을 입력하세요";
                return oRetMsg;
            }

            // 특수문자 입력 체크
            var bIsValid = oAPP.checkSpecial(sAppId);
            if (bIsValid) {
                oRetMsg.MSG = "[Shortcut Name] 특수문자를 포함하면 안됩니다";
                return oRetMsg;
            }

            // 공백 있음
            var bIsValid = oAPP.checkSpace(sAppId);
            if (bIsValid) {
                oRetMsg.MSG = "[Shortcut Name] 공백을 포함하면 안됩니다";
                return oRetMsg;
            }

            // 영문+숫자
            var bIsValid = oAPP.checkEngNum(sAppId);
            if (!bIsValid) {
                oRetMsg.MSG = "[Shortcut Name] 영문 + 숫자만 입력가능합니다";
                return oRetMsg;
            }

            oRetMsg.CODE = "S";

            return oRetMsg;

        }, // end of oAPP.checkValidAppId

        // App Description 입력 체크
        checkValidAppDesc: function (sAppDesc) {

            var oRetMsg = {
                CODE: "E",
                TYPE: "APPDESC",
                MSG: ""
            };

            // 입력 여부 확인
            if (!sAppDesc) {
                oRetMsg.MSG = "App Description을 입력하세요";
                return oRetMsg;
            }

            oRetMsg.CODE = "S";

            return oRetMsg;

        }, // end of oAPP.checkValidAppDesc

        // Protocol 입력 체크
        checkValidProtocol: function (sProto) {

            var oRetMsg = {
                CODE: "E",
                TYPE: "PROTO",
                MSG: ""
            };

            // 입력 여부 확인
            if (!sProto) {
                oRetMsg.MSG = "Protocol을 입력하세요";
                return oRetMsg;
            }

            oRetMsg.CODE = "S";

            return oRetMsg;

        }, // end of oAPP.checkValidProtocol

        // Host 입력 체크
        checkValidHost: function (sHost) {

            var oRetMsg = {
                CODE: "E",
                TYPE: "HOST",
                MSG: ""
            };

            // 입력 여부 확인
            if (!sHost) {
                oRetMsg.MSG = "HOST를 입력하세요";
                return oRetMsg;
            }

            oRetMsg.CODE = "S";

            return oRetMsg;

        }, // end of oAPP.checkValidHost

        // Path 입력 체크
        checkValidPath: function (sPath) {

            var oRetMsg = {
                CODE: "E",
                TYPE: "HOST",
                MSG: ""
            };

            // 입력 여부 확인
            if (!sPath) {
                oRetMsg.MSG = "Path를 입력하세요";
                return oRetMsg;
            }

            oRetMsg.CODE = "S";

            return oRetMsg;

        }, // end of oAPP.checkValidPath

        // 영문 + 숫자 입력 체크
        checkEngNum: function (str) {
            var regExp = /^[A-Za-z]|^[A-Za-z]+[A-Za-z0-9]+/g;

            if (regExp.test(str)) {
                return true;
            } else {
                console.log("영문+숫자입력 걸림!!");
                return false;
            }
        },

        // 특수문자 체크
        checkSpecial: function (str) {
            var special_pattern = /[`~!@#$%^&*|\\\'\";:\/?]/gi;
            if (special_pattern.test(str) == true) {
                console.log("특수문자 걸림!!");
                return true;
            } else {
                return false;
            }
        },

        // 공백(스페이스 바) 체크 
        checkSpace: function (str) {
            if (str.search(/\s/) !== -1) {
                console.log("공백 있음!!");
                return true;
            } else {
                return false;
            }
        },

        // 첨부파일 이미지 사이즈 용량 제한
        checkFilesSize: function (input) {

            if (input.files && input.files[0].size > (1 * 1024 * 1024)) {
                alert("파일 사이즈가 1mb 를 넘습니다.");
                input.value = null;
            }

        }, // end of oAPP.checkFilesSize

        setBusy: function (bIsBusy) {

            var oBusy = document.getElementById("u4aWsBusyIndicator");

            if (!oBusy) {
                return;
            }

            if (bIsBusy == 'X') {
                oBusy.style.visibility = "visible";
            } else {
                oBusy.style.visibility = "hidden";
            }

        }

    };

})();




oAPP.remote = parent.require('@electron/remote');
oAPP.app = oAPP.remote.app;
oAPP.ipcRenderer = parent.require('electron').ipcRenderer;
oAPP.ipcMain = oAPP.remote.require('electron').ipcMain;
oAPP.fs = oAPP.remote.require('fs');
oAPP.BrowserWindow = oAPP.remote.require('electron').BrowserWindow;
oAPP.path = oAPP.remote.require('path');
oAPP.shell = parent.require('electron').shell;



window.onload = function () {


    var oAppdesc = document.getElementById("appdesc"),
        oProto = document.getElementById("proto"),
        oHost = document.getElementById("host"),
        oPort = document.getElementById("port"),
        oPath = document.getElementById("path"),
        oParam = document.getElementById("parameters");

    // // test default
    // oAppdesc.value = "윤이앱테스트";
    // oProto.value = "http";
    // oHost.value = "49.236.106.96";
    // oPort.value = "8000";
    // oPath.value = "/zu4a/ycordova_test";
    // oParam.value = "sap-client=800&sap-language=EN";

    oAPP.onStart();

};