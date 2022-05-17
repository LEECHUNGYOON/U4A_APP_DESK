(function (o) {
    "use strict";

    var REMOTE = require('@electron/remote'),
        IPCMAIN = REMOTE.require('electron').ipcMain,
        APP = REMOTE.app;

    o.onqr_barcode_scanner = function (d) {

        if (o._langu === "") {
            o._langu = oAPP.onConvLangu(d["langu"]);
        }

        // 비디오 정보를 구하고, 카메라를 실행
        navigator.mediaDevices.enumerateDevices()
            .then(o.getQrCameraInfo.bind(d))
            .catch(o.getQrCameraInfoError);

    }; // end of o.onqrcode_scanner

    /************************************************************************
     * 카메라가 없을 경우 오류 메시지 
     * **********************************************************************/
    o.getQrCameraInfoError = function (error) {

        var err = error.message || error.name;

        console.error(err);

        alert(oAPP.onGetMsgTxt("0018")); /* 카메라 정보 읽기 실패! */

    }; // end of o.getQrCameraInfoError

    /************************************************************************
     * 카메라 정보를 구한다.
     * **********************************************************************/
    o.getQrCameraInfo = function (aDeviceInfos) {

        var d = this;

        // Media Device 정보가 담긴 Object의 데이터 타입 체크
        if (aDeviceInfos instanceof Array == false) {
            return;
        }

        // Media 정보 중, 카메라 디바이스가 없을 경우 실행하지 않는다.
        var found = aDeviceInfos.find(element => element.kind === "videoinput");
        if (!found) {
            throw new Error(oAPP.onGetMsgTxt("0015")); /* 카메라가 없습니다. */
        }

        // 카메라 실행
        o.onQrScannerOpen(d);

    }; // end of o.getCameraInfo

    o.onQrScannerOpen = function (oOptions) {

        // qr barcode scan 할 수있는 브라우저 새창 열기
        var sPath = APP.getAppPath() + "\\qr_barcode_scanner.html";

        var oCurrWin = REMOTE.getCurrentWindow(),
            oBrowserOption = {
                url: sPath,
                fullscreen: true,
                // alwaysOnTop: true,
                autoHideMenuBar: true,
                resizable: true,
                movable: true,
                closable: true,
                modal: true,
                parent: oCurrWin,
                webPreferences: {
                    nodeIntegration: true,
                    enableRemoteModule: true,
                }
            };

        // 브라우저 오픈
        var oBrowserWindow = new REMOTE.BrowserWindow(oBrowserOption);
        oBrowserWindow.loadURL(sPath);

        // oBrowserWindow.webContents.openDevTools();

        // 브라우저가 오픈이 다 되면 타는 이벤트
        oBrowserWindow.webContents.on('did-finish-load', function () {
            oBrowserWindow.webContents.send('if-qr-scan-opt', oOptions);
        });

        // 브라우저를 닫을때 타는 이벤트
        oBrowserWindow.on('closed', () => {
            oBrowserWindow = null;
        });

    }; // end of o.onQrScannerOpen

    o.onQrScanResult = function (event, res) {

        // 바코드 리딩 성공 시 비프 음
        o.onPlayBarcodeScanSound();

        var oResult = res.RESULT;

        var SendData = {
            REQCD: 'qr_barcode_scanner',
            RESP: oResult
        };

        var oFrame = document.getElementById('u4aAppiFrame');
        oFrame.contentWindow.postMessage(SendData, '*');

    }; // end of o.onQrScanResult

    o.onQrScanError = function (event, res) {

        var sErrorCode = res["ERRCOD"];
        if (!sErrorCode) {
            return;
        }

        alert(oAPP.onGetMsgTxt(sErrorCode));

    }; // end of o.onQrScanError

    /************************************************************************
     * 카메라 셔텨음 실행
     * **********************************************************************/
    o.onPlayBarcodeScanSound = function () {

        var oAudio = document.getElementById("u4aCdvAudio");
        if (!oAudio) {
            return;
        }

        var sSoundPath = APP.getAppPath() + "\\sound\\barcode_beep.wav";

        // 실행 중이면 리턴.
        if (!oAudio.paused) {
            return;
        }

        oAudio.src = "";
        oAudio.src = sSoundPath;
        oAudio.play();

    }; // end of oAPP.onPlayCameraShutterSound

    // 사진 찍기 결과 받는 이벤트
    IPCMAIN.on("if-qr-scan-result", o.onQrScanResult);

    // 사진 찍기 에러 받는 이벤트
    IPCMAIN.on("if-qr-scan-error", o.onQrScanError);

})(oAPP);