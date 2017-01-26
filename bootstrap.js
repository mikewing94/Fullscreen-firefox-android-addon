const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
Cu.import("resource://gre/modules/Services.jsm");

function install(data, reason) {
	ThreeFingerSwipe.install();
}

function uninstall(data, reason) {
	if (reason == ADDON_UNINSTALL)
		ThreeFingerSwipe.uninstall();
}

function startup(data, reason) {
	var winEnum = Services.wm.getEnumerator("navigator:browser");
	while (winEnum.hasMoreElements()) {
		var win = winEnum.getNext();
		ThreeFingerSwipe.init(win);
	}
	Services.wm.addListener(windowListener);
}

function shutdown(data, reason) {
	if (reason == APP_SHUTDOWN)
		return;
	Services.wm.removeListener(windowListener);
	var winEnum = Services.wm.getEnumerator("navigator:browser");
	while (winEnum.hasMoreElements()) {
		var win = winEnum.getNext();
		ThreeFingerSwipe.uninit(win);
	}
}

var windowListener = {
	onOpenWindow: function(aWindow) {
		var win = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).
		                  getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		win.addEventListener("UIReady", function(event) {
			win.removeEventListener("UIReady", arguments.callee, false);
			ThreeFingerSwipe.init(win);
		}, false);
	},
	onCloseWindow: function(aWindow) {
		var win = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).
		                  getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		ThreeFingerSwipe.uninit(win);
	},
	onWindowTitleChange: function(aWindow) {},
};

function log(aMessage) {
	Services.console.logStringMessage("threefingerswipe: " + aMessage);
}

function alert(aMessage) {
	Services.prompt.alert(null, "threefingerswipe", aMessage);
}

function toast(win, msg) {
  win.NativeWindow.toast.show(msg, "short");
}

var ThreeFingerSwipe = {

	fingers: 1,

	threshold: 50,

	_window: null,

	_baseX: 0,
	_baseY: 0,

	_ongoing: false,

	_bundle: null,

	_branch: null,

	_scrolled: false,
	_scrollTimer: null,
	_direction: "",

	install: function() {
	},

	uninstall: function() {
	},

	init: function(aWindow) {
		this._window = aWindow;
		if (!aWindow.BrowserApp.deck) {
			toast("Error: BrowserApp.deck is null.");
			return;
		}
		aWindow.BrowserApp.deck.addEventListener("touchstart", this, false);
		aWindow.BrowserApp.deck.addEventListener("touchend", this, false);
		aWindow.BrowserApp.deck.addEventListener("touchmove", this, false);
		aWindow.BrowserApp.deck.addEventListener("scroll", this, false);
		aWindow.BrowserApp.deck.addEventListener("DOMContentLoaded", this, false);
		this.threshold = Math.min(aWindow.content.document.documentElement.clientHeight,aWindow.content.document.documentElement.clientWidth) * 0.15;
		//toast(aWindow, "autofullscreen initialized " + aWindow.content.document.documentElement.clientHeight);
	},

	uninit: function(aWindow) {
		aWindow.BrowserApp.deck.removeEventListener("touchstart", this, false);
		aWindow.BrowserApp.deck.removeEventListener("touchend", this, false);
		aWindow.BrowserApp.deck.removeEventListener("touchmove", this, false);
		aWindow.BrowserApp.deck.removeEventListener("scroll", this, false);
		aWindow.BrowserApp.deck.removeEventListener("DOMContentLoaded", this, false);
	},



	handleEvent: function(event) {
		switch (event.type) {
			case "touchstart":
    		if (event.touches.length != this.fingers)
    			return;
        if(this._scrollTimer) {
          this._window.clearInterval(this._scrollTimer);
          this._scrollTimer = null;
        }
    		var touch = event.touches.item(0);
				this._ongoing = true;
				this._baseX = touch.clientX;
				this._baseY = touch.clientY;

				break;

			case "touchend":
    		var touch = event.changedTouches.item(0);
				this._ongoing = false;
			  break;

			case "DOMContentLoaded":
			  this._window.fullScreen = true;
			  this._fullscreen = true;
			  break;

			case "DOMContentLoaded":
				this._window.fullScreen = false;
				this._window.fullScreen = true;
				break;

			case "touchmove":
    		if (event.touches.length != this.fingers)
    			return;
    		var touch = event.touches.item(0);
				if (!this._ongoing)
					return;
				var dx = touch.clientX - this._baseX;
				var dy = touch.clientY - this._baseY;
				if (Math.abs(dx) > this.threshold || Math.abs(dy) > this.threshold) {
					this._direction = Math.abs(dx) > Math.abs(dy)*3 ?
					                (dx > 0 ? "right" : "left") : (Math.abs(dy) > Math.abs(dx)*3 ? (dy > 0 ? "down" : "up") : "none");

					this._fullscreen = true;
					var me = this;

					if ((this._direction == "up")&&(touch.clientY < this._window.content.document.documentElement.clientHeight * 0.2)) {
					  this._ongoing = false;
					  this._fullscreen = false;
					}

					if ((this._direction == "down")&&(this._baseY < this._window.content.document.documentElement.clientHeight * 0.1)) {
					  this._ongoing = false;
					  this._fullscreen = false;
					}

					if((this._direction == "right")&&(this._baseX < this._window.content.document.documentElement.clientWidth * 0.1)) {
					  this._ongoing = false;
					  this._window.BrowserApp.selectedTab.window.back();
					  toast(this._window, "back");
					}

					if((this._direction == "left")&&(touch.clientX < this._window.content.document.documentElement.clientWidth * 0.2)) {
					  this._ongoing = false;
					  this._window.BrowserApp.selectedTab.window.forward();
					  toast(this._window, "forward");
					}


					if ((this._scrollTimer == null)&&(this._fullscreen != this._window.fullScreen)) {
					  //setup timer to check for stopped scrolling

	          var scrollTimerCallback = function() {
	            if(me._scrolled == false) {
	              if(me._scrollTimer) {
	                me._window.clearInterval(me._scrollTimer);
	                me._scrollTimer = null;
	              }
	              me._ongoing = false;
	              me._window.fullScreen = me._fullscreen;
	            }
	            me._scrolled = false;
	          };
					  this._scrollTimer = this._window.setInterval(scrollTimerCallback,330);
					}
          this._scrolled = true;
				}
				break;
			case "scroll":
			  this._scrolled = true;
			  break;
			default:
		}
	}

};
