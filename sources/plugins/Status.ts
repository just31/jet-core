import {IJetApp, IJetView} from "../interfaces";

const baseicons = {
	"good":	"check",
	"error": "warning",
	"saving": "refresh fa-spin"
};

const basetext = {
	"good":	"Ok",
	"error": "Error",
	"saving": "Connecting..."
};

export function Status(app: IJetApp, view: IJetView, config: any){

	let status = "good";
	let count = 0;
	let iserror = false;
	let expireDelay = config.expire;
	if (!expireDelay && expireDelay !== false)  expireDelay = 2000;
	let texts = config.texts || basetext;
	let icons = config.icons || baseicons;

	if (typeof config === "string")
		config = { target:config };

	function refresh(content? : string) {
		const area = view.$$(config.target);
		if (area) {
			if (!content)
				content = "<div class='status_" + status + "'><span class='webix_icon fa-" + icons[status] + "'></span> " + texts[status] + "</div>";
			(area as webix.ui.template).setHTML(content);
		}
	}
	function success(){
		count--;
		setStatus("good");
	}
	function fail(err){
		count--;
		setStatus("error", err);
	}
	function start(promise){
		count++;
		setStatus("saving");
		if (promise && promise.then){
			promise.then( success, fail );
		}
	}
	function getStatus(){
		return status;
	}
	function hideStatus(){
		if (count == 0){
			refresh(" ");
		}
	}
	function setStatus(mode, err?){
		if (count < 0){
			count = 0;
		}

		if (mode === "saving"){
			status = "saving";
			refresh();
		} else {
			iserror = (mode === "error");
			if (count === 0){
				status = iserror ? "error" : "good";
				if (iserror && app.callEvent("app:error:server",[err])){
					if (err){
						console.error(err.responseText || err);
					}
				} else {
					if (expireDelay)
						setTimeout(hideStatus, expireDelay)
				}

				refresh();
			}
		}
	}
	function track(data){
		const dp = webix.dp(data);
		if (dp){
			view.on(dp, "onAfterDataSend", start);
			view.on(dp, "onAfterSaveError", (id, obj, response) => fail(response));
			view.on(dp, "onAfterSave", success);
		}
	}

	app.setService("status", {
		getStatus,
		setStatus,
		track
	});

	if (config.remote){
		view.on(webix, "onRemoteCall", start);
	}

	if (config.ajax){
		view.on(webix, "onBeforeAjax", (mode, url, data, request, headers, files, promise) => {
			start(promise);
		});
	}

	if (config.data){
		track(config.data);
	}
}