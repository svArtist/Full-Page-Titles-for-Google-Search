// ==UserScript==
// @name		Retrieve Full Page Titles in Google Search
// @version		1.4
// @downloadURL	https://github.com/svArtist/Full-Page-Titles-for-Google-Search/raw/master/Full-Page-Titles-for-Google-Search.user.js
// @namespace	Google
// @author		Benjamin Philipp <benjamin_philipp [at - please don't spam] gmx.de>
// @description	Fill the page link titles with the full respective page titles
// @icon64URL	http://imgur.com/1J34GZD.png
// @include		/https?:\/\/(www\.)?google\.[a-z\.]{2,6}\/search\?((?!tbm=isch).)*$/
// @include		/https?:\/\/(www\.)?google\.[a-z\.]{2,6}\/webhp\?((?!tbm=isch).)*$/
// @require 	http://ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js
// @run-at		document-body
// @grant		GM_xmlhttpRequest
// @connect		*
// ==/UserScript==

// SETTINGS:
var settings = {};
settings.applyToLinkText = false;			// Default = FALSE. TRUE = change innerHTML of links and applying overflow: visible to parent; false = only apply to Link Title (for mouseover Tooltip)
settings.rex = "<title([^>]*)>([^<]+)<";	// Default = "<title([^>]*)>([^<]+)<". Regex to find the title of a page. If you find a better way, please let me know.
settings.dontLookupExtensions = [".pdf"];	// Default = [".pdf"]. Exclude from lookup. PDFs are generally downloaded as files, giving you a popup. Excluding ".pdf" is recommended.
settings.verbose = 1;						// Default = 1. 0 = no logs; 1 = reports on link counts; 2 = +statuses of link checks; 3 = +Details
settings.keepSettings = true;				// Default = TRUE. TRUE = Try to save & load settings in browser's localStorage. FALSE = settings will be overweitten on update.
settings.warnOnChange = true;				// Default = TRUE. TRUE = When changes are made but the Version number stays the same (assume changes by user), ask to save and apply the settings. FALSE = Automatically apply changes.

// Script vars, best don't touch
var myVersion = GM_info.script.version;
var settingsSafety = settings;
var resultsObserver;
var idle = true;
var idletimer;
var disableUpdate = false;
var updaterequest = false;
var openRequests = 0;
var successRequests = 0;
var failedRequests = 0;
var msgPrefix = "Full Page Titles in Google Search:\n";

clog("Verbosity level: " + settings.verbose, 1);

if(localStorage){
    var oldVersion = myVersion;
    if(localStorage.fptVersion !== undefined)
        var oldVersion = localStorage.fptVersion;
    else
        settingsSave();

    if(oldVersion != myVersion)
        if(localStorage.fptSettings.keepSettings === true)
            settingsLoad();
    if(settings.keepSettings === true){
        if(oldVersion == myVersion && settingsChanged() && settings.warnOnChange){
            if (!confirm(msgPrefix + "Settings have been changed, although the Script Version (" + oldVersion + ") has stayed the same.\nDo you want to save those settings to localStorage and use them?\nIf <ou didn't manually make new changes, localStorage has probably been lost. Simply click 'OK' to save the settings again.'"))
                settingsLoad();
        }
        settingsSave();
    }
    else{
        if(settings.keepSettings === true)
            clog("Settings are set to work from localStorage, but localStorage is not available!\nMake sure this script has access to localStorage, or turn off this feature in the settings section of this script.",1);
            alert(msgPrefix + "Settings are set to work from localStorage, but localStorage is not available!\nMake sure this script has access to localStorage, or turn off this feature in the settings section of this script.");
    }

    var tob = JSON.parse(localStorage.fptSettings);
    var complete = true;
    for(var key in settingsSafety){
        if(settingsSafety.hasOwnProperty(key)){
           if(tob[key] === undefined || tob[key] === null){
               clog("Added new settings object: " + key, 3);
               tob[key] = settingsSafety[key];
               complete = false;
           }
        }
    }
    if(!complete){
        localStorage.fptSettings = JSON.stringify(tob);
    }
}

function settingsSave(){
    localStorage.fptSettings = JSON.stringify(settings);
    localStorage.fptVersion = oldVersion = myVersion;
}
function settingsLoad(){
    if(localStorage.fptSettings === undefined)
        return;
    settings = JSON.parse(localStorage.fptSettings);
}
function settingsChanged(){
    if(localStorage.fptSettings === undefined || localStorage.fptSettings != JSON.stringify(settings))
        return true;
    return false;
}


function updatePage(){
    openRequests = 0;
    successRequests = 0;
    failedRequests = 0;
    allinks = 0;
    clog("Walking through Links...", 2);
	$("#ires .g .rc h3.r a:not([titled])").each(function(){
        allinks ++;
        clog("Looking at Link '" + this.href + "' (" + this.innerHTML + ")", 3);
		if(this.text.substr(this.text.length-3)=="...")
			getTitle(this);
	});
    clog(openRequests + " of " + allinks + " links need to be checked.", 1);
}

function getTitle(el){
    clog("Link '" + el.href + "' (" + el.innerHTML + ") is too long.", 3);
	for(i=0; i<settings.dontLookupExtensions.length; i++)
	{
		if(el.href.endson(settings.dontLookupExtensions[i], true)){
            clog("Excluding Link '" + el.href + "' (" + el.innerHTML + ") because the extension (" + settings.dontLookupExtensions[i] + ") is excluded", 3);
			return;
        }
	}
    openRequests++;
	GM_xmlhttpRequest({
		url: el.href,
		method: "GET",
		timeout: 15000, //15 seconds timeout
		onload: function(res){
            var mrex = new RegExp(settings.rex, "i");
			var tit = mrex.exec(res.response);
			if(tit === undefined || tit === null){
                clog("No title found in response for " + el.href, 2);
                report("fail");
				return;
            }
			disableUpdate = true;
			el.title = unEscapeHtml(tit[2]);
            if(settings.applyToLinkText){
                el.innerHTML = el.title;
                $(el).parent().css("overflow", "visible");
            }
			$(el).attr("titled", "true");
            report("success");
			disableUpdate = false;
		},
		onerror: function(res){
			clog({error: "Error loading page", page: el.href}, 2);
            report("fail");
		},
		ontimeout: function(res){
			clog({error: "Connection timed out", page: el.href}, 2);
            report("fail");
		}
	});
}

function report(status){
    switch(status){
        case "success":
            successRequests ++;
            openRequests --;
            break;
        case "fail":
            failedRequests ++;
            openRequests --;
            break;
    }
    clog(successRequests + " requests successful, " + failedRequests + " failed. " + openRequests + " Requests open.", 1);
}

function clog(o, l=2){
    if(settings.verbose >= l)
        console.log(o);
}

function unEscapeHtml(text){
	var t = document.createElement("TEXTAREA");
	t.innerHTML = text;
	return t.value;
}

String.prototype.endson = function(str, insensitive){
  return new RegExp("("+escapeRegExp(str)+")$", insensitive?"i":"").test(this);
};

function escapeRegExp(str) {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function updater(t = 1000){
	if(idle)
	{
		idle = false;
		updaterequest = false;
		updatePage();
		idletimer = setTimeout(function(){
			idle = true;
			if(updaterequest)
				updatePage();
		}, t);
	}
	else
	{
        clog("Updater called but busy",3);
		updaterequest = true;
	}
}

var bodyObserver;

function observeResults(){
	clog("observing", 3);
    updater();
	resultsObserver = new MutationObserver(function(){
        clog("content changed",3);
        updater();
    });
	resultsObserver.observe($("#ires .g .rc")[0], {subtree: true, childList: true});
	if(bodyObserver !== false)
		bodyObserver.disconnect();
}

var oloc = window.location.href;
function checkLocation(){
	if(window.location.href != oloc){
        clog("Window Location has changed (dynamic loading)",2);
		oloc = window.location.href;
		prepareObservers();
	}
}

function prepareObservers(){
    if($("#ires .g .rc").length>0){
        observeResults();
    }
    else{
        bodyObserver = new MutationObserver(function(mutations){
            if(disableUpdate || !idle){
                return;
            }
            if($("#ires .g .rc").length>0)
            {
                clog("content found through body observer");
                observeResults();
            }
        });
        bodyObserver.observe($("body")[0], {subtree: true, childList: true});
    }
}

setInterval(checkLocation, 1000);
prepareObservers();
