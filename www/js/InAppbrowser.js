(function(o) {
    "use strict";

    const
        FS = require('fs'),
        SPAWN = require("child_process").spawn,
        REMOTE = require('electron').remote,
        APP = REMOTE.app,
        USERDATA = APP.getPath("userData"),
        TEMP_HTML_URL = USERDATA + "\\tmp";

    // POST 로 윈도우 오픈 시, temp.html 파일을 로컬에 만들면서 오픈 하는 방식인데
    // 해당 temp.html 만든 갯수 카운트
    var iBrowserCnt = 0;

    o.onInAppbrowser = function(d) {

        if (o._langu === "") {
            o._langu = oAPP.onConvLangu(d["langu"]);
        }

        var sUrl = d["URL"],
            sBrowserType = d["BROWSERTYPE"],
            aParam = d["PARAM"],
            iParamLen = aParam.length;

        var aBrowsers = o._aBrowsers, // 현재 PC에 설치된 브라우저 정보
            iBrowserLenth = aBrowsers.length;

        if (iBrowserLenth <= 0) {
            return;
        }

        // Browser Type 대문자로 변환
        sBrowserType = sBrowserType.toUpperCase();

        // PC에 설치된 Browser 정보 중, parameter의 BrowserType 값이 없으면 Default Browser를 선택한다.
        var oBrowserInfo = aBrowsers.find(a => a.NAME == sBrowserType);
        if (!oBrowserInfo) {
            oBrowserInfo = aBrowsers[0];
        }

        // Post로 던질 파라미터가 없으면 브라우저 바로 실행.
        if (iParamLen <= 0) {

            var aComm = [sUrl];

            // 브라우저 실행
            SPAWN(oBrowserInfo.INSPATH, aComm);
            return;

        }

        // Post로 던질 파라미터가 있을 경우..
        var pageContent = '<html><head></head><body>';
        pageContent += '<form id="loginForm" action="' + sUrl + '" method="post">';

        for (var i = 0; i < iParamLen; i++) {

            var oParam = aParam[i];

            pageContent += '<input type="hidden" name="' + oParam.NAME + '" value="' + oParam.VALUE + '">';

        }

        pageContent += '</form> <script type="text/javascript">';
        pageContent += '(function(){';
        pageContent += '"use strict";';
        pageContent += 'window.onload = function(){';
        pageContent += 'document.getElementById("loginForm").submit();';
        pageContent += '}';
        pageContent += '})();';
        pageContent += '</script></body></html>';

        var sTempUrl = TEMP_HTML_URL + iBrowserCnt + ".html";

        iBrowserCnt++;

        FS.writeFile(sTempUrl, pageContent, function(err) {
            
            if (err) {
                alert(oAPP.onGetMsgTxt("0014")); /* File Write Fail! */
                return;
            }

            var aComm = [sTempUrl];

            // APP 실행		
            SPAWN(oBrowserInfo.INSPATH, aComm);

        });

    };

    // 브라우저를 닫으면 temp로 만든 temp.html들을 삭제한다.
    window.addEventListener('beforeunload', function() {

        if (iBrowserCnt <= 0) {
            return;
        };

        for (var i = 0; i < iBrowserCnt; i++) {

            var sTempUrl = TEMP_HTML_URL + i + ".html",
                bIsExists = FS.existsSync(sTempUrl);

            if (!bIsExists) {
                continue;
            }

            FS.unlinkSync(sTempUrl);

        }

    });

})(oAPP);