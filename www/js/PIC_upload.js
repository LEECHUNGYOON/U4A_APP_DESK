(function (o) {
    "use strict";

    /************************************************************************
     * Global Variables
     * **********************************************************************/
    var REMOTE = require('@electron/remote'),
        APP = REMOTE.app,
        IPCMAIN = REMOTE.require('electron').ipcMain,
        CURRWIN = REMOTE.getCurrentWindow(),
        iImageFileNameCount = 0; // 이미지 파일명 숫자 증가값    

    o.onPIC_upload = function (d) {

        //언어 
        if (o._langu === "") {
            o._langu = oAPP.onConvLangu(d["langu"]);
        }

        // 비디오 정보를 구하고, 카메라를 실행
        navigator.mediaDevices.enumerateDevices()
            .then(o.getCameraInfo.bind(d))
            .catch(o.onCameraInfoError);

    }; // end of o.onPIC_upload

    /************************************************************************
     * 카메라 정보를 구한다.
     * **********************************************************************/
    o.getCameraInfo = function (aDeviceInfos) {

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
        o.onCameraOpen(d);

    }; // end of o.getCameraInfo

    /************************************************************************
     * 카메라가 없을 경우 오류 메시지 
     * **********************************************************************/
    o.onCameraInfoError = function (error) {

        var err = error.message || error.name;
        
        console.error(err);

        alert(oAPP.onGetMsgTxt("0018")); /* 카메라 정보 읽기 실패! */

    }; // end of o.onCameraInfoError

    /************************************************************************
     * 카메라 오픈
     * **********************************************************************/
    o.onCameraOpen = function (d) {

        var sPath = APP.getAppPath() + "\\PIC_upload.html";

        var oCurrWin = REMOTE.getCurrentWindow(),
            oBrowserOption = {
                url: sPath,
                fullscreen: true,
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
            oBrowserWindow.webContents.send('if-camera-pic-opt', d);
        });

        // 브라우저를 닫을때 타는 이벤트
        oBrowserWindow.on('closed', () => {
            oBrowserWindow = null;
        });

    }; // end of o.onCameraOpen

    /************************************************************************
     * 사진 찍기 결과 받는 이벤트
     * **********************************************************************/
    o.onPIC_uploadResult = function (event, res) {

        var sImgBase64 = res['IMG_BASE64'];
        if (sImgBase64) {

            sImgBase64 = sImgBase64.split(",")[1];

            var oArrayBuffer = o.base64ToArrayBuffer(sImgBase64);

            iImageFileNameCount++;

            // 성공 시
            var oBlob = new Blob([oArrayBuffer], {
                    type: "image/jpeg"
                }),
                sFileName = "capture" + iImageFileNameCount + ".jpeg",
                retVal = {
                    "content": oBlob,
                    "name": sFileName
                };

            lf_sendData(retVal);

        }

        // 현재 창을 닫는다.
        var aChildWin = CURRWIN.getChildWindows(),
            iChildLen = aChildWin.length;

        if (!iChildLen) {
            return;
        }

        aChildWin[0].close();

    }; // end of o.onPIC_uploadResult    

    /************************************************************************
     * 사진 찍기 에러 받는 이벤트
     * **********************************************************************/
    o.onPIC_uploadError = function (event, res) {

        var sErrorCode = res["ERRCOD"];
        if (!sErrorCode) {
            return;
        }

        alert(oAPP.onGetMsgTxt(sErrorCode));

    }; // end of o.onPIC_uploadError

    function lf_fileOptionCheck(option, oFile) {

        var sFileName = oFile.name, // 파일명
            sMimeType = oFile.type, // Mime Type
            iFileSize = oFile.size; // 파일 사이즈 

        /*************************
         *  파일명 길이 체크
         *************************/
        if (option.maxFileLen != "") {

            var aSplit1 = sFileName.split("."),
                sFilenm = aSplit1[0],
                iFileLen = sFilenm.length;

            if (option.maxFileLen < iFileLen) {
                return {
                    erFunc: "fireFilenameLengthExceed"
                };
            }

        }

        /*************************
         *  파일 타입 체크
         *************************/
        var aSplit1 = sFileName.split("."),
            sExt = aSplit1[aSplit1.length - 1]; // 확장자 구하기

        var aFileType = option.fileType, // 허용되는 파일 타입
            iFileTypeLenth = aFileType.length,

            bIsFileTypeErr = true; // error 유무 flag

        if (iFileTypeLenth == 0) {
            bIsFileTypeErr = false;
        } else {

            for (var i = 0; i < iFileTypeLenth; i++) {

                var sFileType = aFileType[i];

                if (sExt == sFileType) {
                    bIsFileTypeErr = false;
                    break;
                }

            }
        }

        // File Type Error 가 있으면 리턴
        if (bIsFileTypeErr) {
            return {
                erFunc: "fireTypeMissmatch"
            };
        }

        /*************************
         *  마임타입 체크
         *************************/
        var aMimeType = option.mimeType, // 허용되는 마임 타입
            iMimeTypeLenth = option.mimeType.length;

        var bIsMimeTypeErr = true; // error 유무 flag

        if (iMimeTypeLenth == 0) {
            bIsMimeTypeErr = false;
        } else {

            for (var i = 0; i < iMimeTypeLenth; i++) {

                var allowMime = aMimeType[i];

                if (sMimeType == allowMime) {
                    bIsMimeTypeErr = false;
                    break;
                }

            }

        }

        // error 가 있으면 리턴
        if (bIsMimeTypeErr) {
            return {
                erFunc: "fireTypeMissmatch"
            };
        }

        /*************************
         *  파일 사이즈 체크
         *************************/
        if (option.maxFileSize != "") {

            // 허용되는 사이즈 값을 byte로 변환하여 계산
            var iMaxSize = parseFloat(option.maxFileSize) * Math.pow(2, 20);

            iMaxSize = Math.ceil(iMaxSize); // 소숫점 반올림

            if (iMaxSize < iFileSize) {
                return {
                    erFunc: "fireFileSizeExceed"
                };
            }

        }

        return false;

    } // end of lf_fileOptionCheck

    function lf_sendData(oSendData) {

        var SendData = {
            REQCD: 'PIC_upload',
            RESP: oSendData
        };

        var oFrame = document.getElementById('u4aAppiFrame');
        oFrame.contentWindow.postMessage(SendData, '*');

    }

    // 사진 찍기 결과 받는 이벤트
    IPCMAIN.on("if-camera-result", o.onPIC_uploadResult);

    // 사진 찍기 에러 받는 이벤트
    IPCMAIN.on("if-camera-error", o.onPIC_uploadError);

})(oAPP);