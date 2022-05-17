(function(o) {
    "use strict";

    var REMOTE = require('@electron/remote'),
        FS = REMOTE.require('fs'),
        SHELL = REMOTE.shell;

    /************************************************************************
     * 파일 다운 실행
     * **********************************************************************/
    o.onFileDown = function(d) {

        // Busy 실행
        oAPP.setBusy('X');

        if (o._langu === "") {
            o._langu = oAPP.onConvLangu(d["langu"]);
        }

        // 캐쉬 URL에 담긴 파일을 읽는다.
        o.onGetFileInCache(d);

    }; // end of o.onFileDown

    /************************************************************************
     * 캐쉬 URL에 담긴 파일을 읽는다.
     * **********************************************************************/
    o.onGetFileInCache = function(d) {

        var url = d["dataURL"],
            xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function() { // 요청에 대한 콜백
            if (xhr.readyState === xhr.DONE) { // 요청이 완료되면
                if (xhr.status === 200 || xhr.status === 201) {

                    // 캐쉬 URL에 담긴 파일에서 Blob를 구한다.
                    o.onGetFileDownBlob(d, xhr.response);

                }
            }
        };

        // ajax 에러 처리
        xhr.onerror = function() {

            oAPP.setBusy('');

            alert(oAPP.onGetMsgTxt("0011")); /* ajax fail! */

        };

        xhr.responseType = 'blob';
        xhr.open("GET", url);
        xhr.send();

    }; // end of o.onGetFile

    /************************************************************************
     * 캐쉬 URL에 담긴 파일에서 Blob를 구한다.
     * **********************************************************************/
    o.onGetFileDownBlob = function(d, BLOB) {

        // 다운받을 폴더 지정하는 팝업에 대한 Option
        var options = {
            // See place holder 1 in above image
            title: "File Download",

            // See place holder 2 in above image            
            defaultPath: process.env.USERPROFILE + "\\Downloads",

            // See place holder 3 in above image
            // buttonLabel: "Save",

            // See place holder 4 in above image
            filters: [

            ],

            properties: ['openDirectory', '']

        };

        //파일 폴더 디렉토리 선택 팝업 
        var oFilePathPromise = REMOTE.dialog.showOpenDialog(REMOTE.getCurrentWindow(), options);

        oFilePathPromise.then(function(oPaths) {

            var sFolderPath = oPaths.filePaths[0];

            if (typeof sFolderPath == "undefined") {
                
                // Busy 실행 끄기
                oAPP.setBusy('');
                return;
            }            

            // 선택한 폴더 안에 파일 다운
            oAPP.onFileDownInFolder(d, BLOB, sFolderPath);

        }).catch(function(e) {

            var sMsg = oAPP.onGetMsgTxt("0019"); /* 다운로드 폴더 디렉토리 선택 실패! */
            alert(sMsg);

            // Busy 실행 끄기
            oAPP.setBusy('');

            return;

        });

    }; // end of o.onGetFileDownBlob

    /************************************************************************
     * 선택한 폴더 안에 파일 다운
     * **********************************************************************/
    o.onFileDownInFolder = function(d, BLOB, sFolderPath) {

        var fileName = d['fname'],

            //파일 Path 와 파일 명 조합 
            folderPath = sFolderPath,
            filePath = folderPath + "\\" + fileName; //폴더 경로 + 파일명

        var fileReader = new FileReader();
        fileReader.onload = function(event) {

            var arrayBuffer = event.target.result,
                buffer = Buffer.from(arrayBuffer);

            //PC DOWNLOAD 
            FS.writeFile(filePath, buffer, {}, (err, res) => {

                // Busy 실행 끄기
                oAPP.setBusy('');

                if (err) {

                    alert(oAPP.onGetMsgTxt("0014")); /* File Write Fail! */

                    return;
                }

                // 파일 다운받은 폴더를 오픈한다.
                SHELL.showItemInFolder(filePath);

            });

        };

        fileReader.readAsArrayBuffer(BLOB);

    }; // end of o.onFileDownInFolder

})(oAPP);