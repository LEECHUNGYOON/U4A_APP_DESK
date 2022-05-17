let oAPP = (function () {
    "use strict";

    const
        REMOTE = require('@electron/remote'),
        APP = REMOTE.app,
        APPPATH = APP.getAppPath(),
        PATH = require('path');

    var COMMON = require(PATH.join(APPPATH, "\\js\\common.js")),
        SETTINGS = require(PATH.join(APPPATH, "\\settings\\u4a-electron-settings.json"));

    return {

        _langu: "",
        _msgClass: {},

        _protcol: "",
        _host: "",
        _port: "",
        _path: "",
        _params: "",
        _starturl: "",
        _Sessions: {
            "second": 0,
            "timeOUT": 5,
            "oInterval": null,
            "lastTime": 0
        },

        _aBrowsers: [], // 실제 설치된 브라우저 종류

        // Default Browser 대상 정보
        _aDefaultBrowsers: [{
                NAME: "CR",
                DESC: "Google Chrome Browser",
                REGPATH: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe"
            },
            {
                NAME: "EDGE",
                DESC: "Microsoft Edge",
                REGPATH: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\msedge.exe"
            },
            {
                NAME: "IE",
                DESC: "Microsoft Internet Explorer",
                REGPATH: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\IEXPLORE.EXE"
            },
        ],

        /************************************************************************
         * 초기 Start!!!
         * **********************************************************************/
        onStart: function () {

            oAPP.APPDATA = process.env.APPDATA;

            // 현재 PC에 설치된 브라우저 정보를 구한다.
            oAPP.onCheckInstalledBrowsers();

            // 로딩 url 구성
            //oAPP.onAppLoadUrl();

            //실행 APP pause / resume 설정 
            oAPP.onChkerSeesion();

            // 개발용이면 경우 브라우저 Menu Bar를 커스텀 한다.
            oAPP.setCustomBrowserMenuBar();

            //message Class
            this.onGetMsgClass("3");
            this.onGetMsgClass("E");

            //U4A APP 에서 요청 수신 이벤트
            window.addEventListener('message', function (e) {

                if (typeof e.data === "undefined") {
                    return;
                }

                if (typeof e.data.REQCD === "undefined") {
                    return;
                }

                switch (e.data.REQCD) {
                    case "API_LOAD":
                        //U4A 서비스에서 생성한 스크립트 소스로 oAPP <-- 오브젝트(펑션등등) 추가 
                        try {
                            eval(e.data.JS);
                        } catch (e) {
                            console.error(e);
    
                        }
    
                        break;
    
    
                    case "EXCUTE":
                        //U4A -> electron JS 직접 수행 
                        try {
                            eval(e.data.JS);
                        } catch (e) {
                            console.error(e);
    
                        }
    
                        break;
    
    
                    default:
    
                        //요청액션 동적 처리 펑션 호출 => u4a에서 요청하는 json object 정보는 반드시 (REQCD, IF_DATA) 존재해야함!!
                        // REQCD: 처리액션코드및 JS 파일,펑션명으로 구성됨  IF_DATA: 요청 Data free style JSON 형태
                        oAPP.onActionExcute(e.data.REQCD, e.data.IF_DATA);
    
                        break;
                }              

            });

        },

        /************************************************************************
         * Electron version Check
         * 2.0 이상만 실행되어야 함.
         * **********************************************************************/
        onElectronVersionCheck: function () {

            var oCurrWin = oAPP.remote.getCurrentWindow();
            var ver = parseFloat(cordova.version);

            if (2.0 >= ver) {

                alert("electron version이 2.0 이상이여야 합니다. Application을 종료합니다.");
                oCurrWin.close();

                return false;

            }

            return true;

        }, // end of onElectronVersionCheck

        /************************************************************************
         * ShortCut 생성화면 
         * **********************************************************************/
        onShortCutCreate: function () {

            var sUrl = oAPP.path.join(oAPP.app.getAppPath(), "admin.html");

            document.getElementById('u4aAppiFrame').src = sUrl;

            oAPP.setLoadingPageBusy(false);

            return;
            location.href = sUrl;

            location.replace();

        }, // end of onShortCutCreate

        /************************************************************************
         * ShortCut 생성할지 말지 여부 확인
         * **********************************************************************/
        onCheckShortCut: function () {

            /**
             * 파라미터 체크
             * 1. string 여부
             * 2. JSON 여부
             * 
             * 3. 아니면 생성화면으로..
             * 4. 맞으면 글로벌 변수에 http 관련 정보를 파라미터 값으로 대체 후
             * 나머지 로직 수행..
             */

            var sParam = oAPP.remote.process.argv[1];

            // 파라미터가 String 형태인지 확인
            if (typeof sParam !== "string") {
                return false;
            }

            // 파라미터가 JSON 형태인지 확인
            try {

                var sParamDec = decodeURIComponent(sParam);
                var oParamJson = JSON.parse(sParamDec),
                    oParam = oParamJson.DATA;

                if (typeof oParam == "undefined") {
                    return false;
                }

                var oCurrWin = oAPP.remote.getCurrentWindow();

                // ICON PATH가 있을 경우에만 설정
                if (oParam.ICONPATH) {
                    oCurrWin.setIcon(oParam.ICONPATH);
                }

                this._protcol = oParam.PROTO;
                this._host = oParam.HOST;
                this._port = oParam.PORT;
                this._path = oParam.PATH;
                this._params = oParam.PARAM;

                document.title = oParam.APPID;

                return true;


            } catch (error) {
                return false;
            }

        }, // end of onCheckShortCut        

        /************************************************************************
         * 개발용이면 경우 브라우저 Menu Bar를 커스텀 한다.
         * **********************************************************************/
        setCustomBrowserMenuBar: function () {

            var aMenus = COMMON.getMenuBarList();

            // 현재 브라우저에 메뉴를 적용한다.
            var MENU = oAPP.remote.Menu,
                oCurrWin = oAPP.remote.getCurrentWindow(),
                oMenu = MENU.buildFromTemplate(aMenus);

            oCurrWin.setMenu(oMenu);

        }, // end of setCustomBrowserMenuBar

        onChkerSeesion: function () {

            oAPP._Sessions.timeOUT = 28; //서비스 세션 TimeOut 초 

            //화면 백모드 (응용 프로그램은 배경으로 끼워 넣을 때)
            document.addEventListener("pause", function () {

                oAPP._Sessions.lastTime = new Date().getTime();

            }, false);

            //화면 활성 (응용 프로그램이 배경에서 검색 될 때 발생)
            document.addEventListener("resume", function () {

                var iLastTime = oAPP._Sessions.lastTime;

                if (!iLastTime) {
                    return;
                }

                var iCurrTime = new Date().getTime();

                var iDeffTime = (iCurrTime - iLastTime) / 1000 / 60;

                if (oAPP._Sessions.timeOUT <= iDeffTime) {
                    document.getElementById("u4aAppiFrame").src = oAPP._starturl;
                }

            }, false);

        },

        ontest: function () {


        }, //ontest

        onAppLoadUrl: function () {

            if (oAPP._starturl !== "") {
                return;
            }

            oAPP._starturl = oAPP.getStartUrlPath();

        },

        getStartUrlPath: function () {

            var sUrl = "";

            if (oAPP._port !== "") {

                sUrl = oAPP._protcol + "://" +
                    oAPP._host + ":" +
                    oAPP._port +
                    oAPP._path;

                sUrl = oAPP._params !== "" ? sUrl + "?" + oAPP._params : sUrl;

                return sUrl;

            }

            sUrl = oAPP._protcol + "://" +
                oAPP._host +
                oAPP._path;

            sUrl = oAPP._params !== "" ? sUrl + "?" + oAPP._params : sUrl;

            return sUrl;

        },
        onActionExcute: function (actnm, if_data) {

            //--*[공통] 요청액션 처리에 펑션을 생성 처리후 실행
            //--*       js 폴더안에 처리 예:xxxx.js 파일이 존재해야함!!
            //--*       actnm <- 파라메터명은 js 파일명이여야함!!

            //전달받은 액션명으로 (on + actnm) 펑션명 구성됨!!
            var fm = "on" + actnm;

            if (typeof oAPP[fm] !== "undefined") {
                oAPP[fm](if_data);
                return;
            }

            //처음 요청일 경우는 해당 처리에 대한 js파일을 호출함
            var jsnm = "js/" + actnm + ".js";

            // alert();

            oAPP.onLoadJS(jsnm, function () {
                oAPP[fm](if_data);
            }, false);

        }, //end onActionExcute

        onLoadJS: function (u, cb, aSync) {

            //js file load
            var oJS = document.createElement('script');
            oJS.src = u;
            oJS.async = aSync;
            oJS.onload = cb;
            oJS.onreadystatechange = cb;

            document.body.appendChild(oJS);

            oJS = null;

        }, //end onLoadJS

        onCopyJSON: function (j) {

            var Ljson = JSON.stringify(j);

            return JSON.parse(Ljson);

        }, //end  onCopyJSON

        /************************************************************************
         * hex -> ascii
         * **********************************************************************/
        hex_to_ascii: function (str1) {

            var hex = str1.toString();
            var str = '';

            for (var n = 0; n < hex.length; n += 2) {
                str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
            }

            return str;

        }, //end hex_to_ascii

        /************************************************************************
         * base64 -> ArrayBuffer
         * **********************************************************************/
        base64ToArrayBuffer: function (base64) {

            var binary_string = window.atob(base64);
            var len = binary_string.length;
            var bytes = new Uint8Array(len);

            for (var i = 0; i < len; i++) {
                bytes[i] = binary_string.charCodeAt(i);
            }

            return bytes.buffer;

        }, // end of oAPP.base64ToArrayBuffer 

        /************************************************************************
         * Base64 -> Blob
         * **********************************************************************/
        base64toBlob: function (b64Data, contentType, sliceSize) {

            if (b64Data == "" || b64Data == undefined) return null;

            contentType = contentType || '';

            sliceSize = sliceSize || 512;

            var byteCharacters = atob(b64Data);

            var byteArrays = [];

            for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                var slice = byteCharacters.slice(offset, offset + sliceSize);
                var byteNumbers = new Array(slice.length);
                for (var i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }
                var byteArray = new
                Uint8Array(byteNumbers);
                byteArrays.push(byteArray);
            }
            var blob = new Blob(byteArrays, {
                type: contentType
            });

            return blob;

        }, // end of oAPP.b64toBlob

        onGetMsgClass: function (lng) {

            var langu = this.onConvLangu(lng),
                oHttp = new XMLHttpRequest();

            oHttp.onreadystatechange = function () {

                if (this.readyState == 4 && this.status == 200) {
                    oAPP._msgClass[langu] = JSON.parse(this.responseText);
                }

            };

            var Lurl = "msg/" + langu + ".json";

            oHttp.open("GET", Lurl, true);

            oHttp.send();

        }, //onGetMsgClass

        onGetMsgTxt: function (cod) {
            return oAPP._msgClass[oAPP._langu][cod];
        }, //onGetMsgTxt

        onConvLangu: function (lng) {

            //sap Langu key to external key
            var Lan = "";
            switch (lng) {

                case "E":
                    Lan = "EN";
                    break;

                case "3":
                    Lan = "KO";
                    break;

                default:
                    Lan = "EN";
                    break;

            }

            return Lan;

        }, //onConvLangu

        openModalWindow: function (url, option, sendData) {
            //모달 윈도우 팝업 펑션 

            var sOption = option;
            sOption.parent = oAPP.remote.getCurrentWindow();
            sOption.modal = true;
            sOption.show = true;

            const oWin = new oAPP.remote.BrowserWindow(sOption);
            oWin.loadURL(url);
            oWin.webContents.on('did-finish-load', function () {
                //oWin.webContents.openDevTools();
                oWin.webContents.send('if_barcodeMTXdata', {
                    winid: oWin.id,
                    sendData
                });

            });

            return oWin;

        }, //end openModalWindow

        findIPCEventName: function (arr, name) {
            //ipc 통신 callback event 여부 점검 펑션 
            if (typeof arr === "undefined") {
                return;
            }
            if (arr['length'] === "undefined") {
                return;
            }

            var ret = false;
            var i;
            var len = arr['length'];

            for (i = 0; i < len; i++) {
                if (name === arr[i]) {
                    ret = true;
                    break;
                }
            }

            return ret;

        }, //end findEventName

        getAggPram: function () {

            var oSharOBJ = oAPP.remote.getGlobal('sharedObject');
            if (typeof oSharOBJ === 'undefined') {
                return false;
            }
            if (typeof oSharOBJ.prop1 === 'undefined') {
                return false;
            }

            var Tprop = oSharOBJ.prop1;
            var len = Tprop.length;
            var i;
            var url = "",
                sso = "";

            for (i = 0; i < len; i++) {
                var aProp = Tprop[i].split('=');
                if (aProp[0] === 'targeturl') {
                    url = aProp[1];
                    continue;
                }
                if (aProp[0] === 'mysso2') {
                    sso = aProp[1];
                    continue;
                }

            }

            if (url === "" && sso === "") {
                return false;
            }

            url = oAPP.hex_to_ascii(url);

            var oRet = {
                url: url,
                sso: sso
            };

            return oRet;

        }, //end getAggPram

        // Busy Indicator
        setBusy: function (bIsBusy) {

            var oBusy = document.getElementById("u4aWsBusyIndicator");

            if (!oBusy) {
                return;
            }

            if (bIsBusy == 'X') {

                // 커서를 해제 시킨다.
                oAPP.onFocusout();

                oBusy.style.visibility = "visible";

            } else {

                oBusy.style.visibility = "hidden";

            }
        },

        // Loading Page Busy Indicator
        setLoadingPageBusy: function (bIsShow) {

            var oLoadPg = document.getElementById("u4a_main_load");

            if (!oLoadPg) {
                return;
            }

            if (bIsShow == 'X') {
                oLoadPg.classList.remove("u4a_loadersInactive");
            } else {
                oLoadPg.classList.add("u4a_loadersInactive");
            }

        },

        // 마우스 포커스 해제 하는 펑션
        onFocusout: function () {

            document.getElementById("u4amainBody").focus();

            // var oFrame = document.getElementById("u4aAppiFrame");
            // if (!oFrame) {
            //     return;
            // }
            // var oActElem = oFrame.contentWindow.document.activeElement;
            // if (!oActElem) {
            //     return;
            // }
            // oActElem.blur();

        },

        /************************************************************************
         * 현재 pc에 설치된 브라우저 정보를 확인.
         * **********************************************************************/
        onCheckInstalledBrowsers: function () {

            // Default Browser 정보를 구한다.
            var aDefaultBrowsers = oAPP._aDefaultBrowsers,
                iBrowsCnt = aDefaultBrowsers.length;

            var aPromise = [];

            // Default Browser 기준으로 현재 내 PC에 해당 브라우저가 설치되어 있는지 
            // 레지스트리를 확인하여 설치 경로를 구한다.
            for (var i = 0; i < iBrowsCnt; i++) {

                var oPromise = oAPP.getBrowserInfoPromise(aDefaultBrowsers, i);

                aPromise.push(oPromise);

            }

            Promise.all(aPromise).then((aValues) => {

                if (aValues instanceof Array == false) {
                    return;
                }

                var iValuesLength = aValues.length;
                if (iValuesLength <= 0) {
                    return;
                }

                for (var i = 0; i < iValuesLength; i++) {
                    var oValue = aValues[i];

                    if (!oValue.INSPATH) {
                        continue;
                    }

                    // 현재 pc에 설치된 브라우저 정보만 수집한다.
                    this._aBrowsers.push(oValue);

                }

            });

        }, // end of onCheckInstalledBrowsers

        getBrowserInfoPromise: function (aDefaultBrowsers, index) {

            var oREGEDIT = oAPP.regedit,
                oDefBrows = aDefaultBrowsers[index],
                sRegPath = oDefBrows.REGPATH;

            var oDefBrows = aDefaultBrowsers[index],
                sRegPath = oDefBrows.REGPATH;

            var oProm = new Promise((resolve, reject) => {

                oREGEDIT.list(sRegPath, (err, result) => {

                    var oRETURN = Object.assign({}, aDefaultBrowsers[index]);

                    // 레지스터에 해당 패스가 없을 경우 오류 처리..
                    if (err) {

                        resolve(oRETURN);
                        return;

                    }

                    // 해당 브라우저가 설치 되어있으면 실제 설치된 경로를 매핑한다.
                    var sObjKey = Object.keys(result)[0],
                        oPathObj = result[sObjKey],
                        oExePathObj = oPathObj.values[""];

                    if (!oExePathObj) {

                        resolve(oRETURN);
                        return;
                    }

                    oRETURN.INSPATH = oExePathObj.value;

                    resolve(oRETURN);

                });

            });

            return oProm;

        }, // end of getBrowserInfoPromise

        /************************************************************************
         * DeviceReady
         * **********************************************************************/
        onDeviceReady: function () {

            console.log("onDeviceReady");

            oAPP.onStart();

            // Network Connect Event
            window.addEventListener("online", oAPP.onNetWorkOnline, false);
            window.addEventListener("offline", oAPP.onNetWorkOffline, false);

            //첫 시작부터 네트워크 점검 
            if(!navigator.onLine){
                oAPP.onNetWorkOffline();
                return;

            }

            //네트워크 활성 상태 일 경우 
            oAPP.onNetWorkOnline();


        },

        onNetWorkOnline: function () {

            console.log("onNetWorkOnline");

            debugger;

            // ShortCut 생성할지 말지 여부 확인
            if (oAPP.onCheckShortCut() == false) {

                // ShortCut 생성
                oAPP.onShortCutCreate();

                return;

            }

            // 로딩 url 구성
            oAPP.onAppLoadUrl();

            // 장막을 해제 한다.
            oAPP.showNetworkDisconnBlock('');

            var oFrame = document.getElementById("u4aAppiFrame");
            oFrame.onload = function () {
                oAPP.setLoadingPageBusy('');
            };

            // 초기 로드 했는지 여부 체크
            var isInitLoad = oFrame.getAttribute("data-init-load");
            if (isInitLoad == 'X') {
                return;
            }

            oFrame.setAttribute("data-init-load", "X");

            // 로드할 URL
            var sLoadUrl = oAPP._starturl,
                oForm = document.getElementById('u4asendform');

            // 파라미터 전송 필요 시 FORM 안에 hidden field 생성
            oForm.action = sLoadUrl;
            oForm.target = "u4aAppiFrame";
            oForm.submit();

        }, // end of onNetWorkOnline

        onNetWorkOffline: function () {

            // 장막을 펼친다.
            oAPP.showNetworkDisconnBlock('X');

        }, // end of onNetWorkOffline

        showNetworkDisconnBlock: function (bIsShow) {

            var oLoadPg = document.getElementById("u4a_neterr");
            if (!oLoadPg) {
                return;
            }

            if (bIsShow == 'X') {
                // 키패드가 올라와 있을 경우 포커스 해제 하여 키패드 내리기

                document.body.focus();

                oAPP.onFocusout();

                oLoadPg.classList.remove("u4a_loadersInactive");

            } else {

                oLoadPg.classList.add("u4a_loadersInactive");

            }

        } // end of showNetworkDisconnBlock

    }

})();

//nodejs API 초기 자원 할당
oAPP.remote = require('@electron/remote');
oAPP.app = oAPP.remote.app;
oAPP.ipcRenderer = require('electron').ipcRenderer;
oAPP.ipcMain = oAPP.remote.require('electron').ipcMain;
oAPP.fs = oAPP.remote.require('fs');
oAPP.BrowserWindow = oAPP.remote.require('electron').BrowserWindow;
oAPP.path = oAPP.remote.require('path');
oAPP.arguments = oAPP.remote.getGlobal('sharedObject');
oAPP.regedit = require('regedit');

const vbsDirectory = oAPP.path.join(oAPP.path.dirname(oAPP.app.getPath('exe')), 'resources/regedit/vbs');
oAPP.regedit.setExternalVBSLocation(vbsDirectory);

// oAPP.regedit.setExternalVBSLocation('resources/regedit/vbs');

// Device ready
document.addEventListener('deviceready', oAPP.onDeviceReady, false);


function gfn_getAPPDATA(){

    return oAPP.APPDATA;

}










