(function (o) {

	var REMOTE = require('@electron/remote');

	o.onCreateBarcodeMatrix = function (d) {

		//로컬 디렉토리 폴더 선택 
		var Tpath = REMOTE.dialog.showOpenDialog({
			properties: ['openFile', 'openDirectory', 'multiSelections']
		});

		Tpath.then(function (oPaths) {

			var sFolderPath = oPaths.filePaths[0];

			//폴더 지정 않하면 종료 
			if (typeof sFolderPath == "undefined") {
				return;
			}

			var Spath = sFolderPath,
				loadUrl = `file://${__dirname}/` + `CreateBarcodeMatrix.html`;
			var sOption = {
				width: 389,
				height: 150,
				resizable: false,
				movable: false,
				closable: true,
				frame: false,
				webPreferences:{
					webSecurity : false,
					nodeIntegration: true,
					enableRemoteModule:true
				}       
			};

			//병렬 처리에 대한 결과리턴 이벤트 - 이벤트가 존재하지않을경우만 생성한다 
			if (!oAPP.findIPCEventName(oAPP.ipcMain.eventNames(), 'if-barcodeMTXdataCB')) {

				oAPP.ipcMain.on('if-barcodeMTXdataCB', (event, res) => {

					var cnt = oAPP.onCreateBarcodeMatrix.actCnt;
					cnt = cnt - 1;
					oAPP.onCreateBarcodeMatrix.actCnt = cnt;


					if (!oAPP.onCreateBarcodeMatrix.res) {
						oAPP.onCreateBarcodeMatrix.res = [];
					}

					oAPP.onCreateBarcodeMatrix.res = oAPP.onCreateBarcodeMatrix.res.concat(res);

					if (cnt > 0) {
						return;
					}

					delete oAPP.onCreateBarcodeMatrix.actCnt;

					var oFrame = document.getElementById('u4aAppiFrame');

					var SendData = {
						REQCD: 'CreateBarcodeMatrix',
						RESP: oAPP.onCreateBarcodeMatrix.res
					};
					delete oAPP.onCreateBarcodeMatrix.res;

					oFrame.contentWindow.postMessage(SendData, '*');

				});

			}

			//3보다 작은경우 바로 전송.
			if (d.length <= 3) {

				var aSendData = {};
				aSendData.PATH = Spath;
				aSendData.DATA = d;

				oAPP.onCreateBarcodeMatrix.actCnt = 1;
				oAPP.openModalWindow(loadUrl, sOption, aSendData);

				return;
			}


			var rs = d.length % 3,
				st = 0,
				ed = Math.floor(d.length / 3),
				ct = ed;

			//병렬 수행 카운트 설정 
			oAPP.onCreateBarcodeMatrix.actCnt = 3;

			for (var i = 1, l = 3; i <= l; i++) {

				//마지막인경우 나머지값을 더해줌.
				if (i === l) {
					ed += rs;
				}

				var aSendData = {};
				aSendData.PATH = Spath;
				aSendData.DATA = d.slice(st, ed);
				oAPP.openModalWindow(loadUrl, sOption, aSendData);

				//호출 이후 exit.
				if (i === l) {
					break;
				}

				//종료값을 시작값으로 옮김.
				st = ed;

				//종료값 +
				ed = ed + ct;

			}

		}).catch(function (e) {

			var sMsg = oAPP.onGetMsgTxt("0019"); /* 다운로드 폴더 디렉토리 선택 실패! */
			alert(sMsg);

			return;

		});

	};

})(oAPP);