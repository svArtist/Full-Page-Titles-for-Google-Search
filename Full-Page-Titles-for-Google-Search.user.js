// ==UserScript==
// @name		Retrieve Full Page Titles in Google Search
// @version		1.9
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
settings.verbosity = 0;						// Default = 0. 0 = no logs; 1 = reports on link counts; 2 = +statuses of link checks; 3 = +Details
settings.keepSettings = true;				// Default = TRUE. TRUE = Try to save & load settings in browser's localStorage. FALSE = settings will be overweitten on update.
settings.warnOnChange = true;				// Default = TRUE. TRUE = When changes are made but the Version number stays the same (assume changes by user), ask to save and apply the settings. FALSE = Automatically apply changes.
settings.useTimerInsteadOfObserver = true;	// Default = TRUE. TRUE = Use a simple timer to check for links. Less likely to overlook updates, but will be running constantly.
settings.checkTimer = 1000;					// Default = 1000. Interval for checking Links in milliseconds. Only relevant if useTimerInsteadOfObserver == TRUE.

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

clog("Verbosity level: " + settings.verbosity, 1);

if(localStorage){
    var oldVersion = myVersion;
    var storSettings = JSON.parse(localStorage.fptSettings);
    clog("Old Version: " + localStorage.fptVersion);
    clog(localStorage.fptSettings);
    if(localStorage.fptVersion !== undefined)
        var oldVersion = localStorage.fptVersion;
    else
        settingsSave();

    if(oldVersion != myVersion)
        if(storSettings.keepSettings === true)
            settingsLoad();
    if(settings.keepSettings === true){
        if(oldVersion == myVersion && settingsChanged()){
            if(settings.warnOnChange && !confirm(msgPrefix + "Settings have been changed, although the Script Version (" + oldVersion + ") has stayed the same.\nDo you want to save those settings to localStorage and use them?\nIf you didn't manually make new changes, localStorage has probably been lost. Simply click 'OK' to save the settings again.'"))
                settingsLoad();
        }
        settingsSave();
    }

    var complete = true;
    for(var key in settingsSafety){
        if(settingsSafety.hasOwnProperty(key)){
           if(storSettings[key] === undefined || storSettings[key] === null){
               clog("Added new settings object: " + key, 3);
               storSettings[key] = settingsSafety[key];
               complete = false;
           }
        }
    }
    if(!complete){
        localStorage.fptSettings = JSON.stringify(storSettings);
    }
}
else
{
    if(settings.keepSettings === true){
        clog("Settings are set to work from localStorage, but localStorage is not available!\nMake sure this script has access to localStorage, or turn off this feature in the settings section of this script.",1);
        alert(msgPrefix + "Settings are set to work from localStorage, but localStorage is not available!\nMake sure this script has access to localStorage, or turn off this feature in the settings section of this script.");
    }
}

function settingsSave(){
    localStorage.fptSettings = JSON.stringify(settings);
    localStorage.fptVersion = oldVersion = myVersion;
    clog("Settings saved",3);
}
function settingsLoad(){
    if(localStorage.fptSettings === undefined)
        return;
    settings = JSON.parse(localStorage.fptSettings);
    clog("Settings loaded",3);
}
function settingsChanged(){
    if(localStorage.fptSettings === undefined || localStorage.fptSettings != JSON.stringify(settings))
        return true;
    return false;
}


openRequests = 0;
successRequests = 0;
failedRequests = 0;
allinks = 0;
function updatePage(){
    clog("Walking through Links...", 2);
	$("#ires .g .rc h3.r a:not(.done)").each(function(){
        allinks ++;
        disableUpdate = true;
		$(this).addClass("done");
        disableUpdate = false;
        clog("Looking at Link '" + this.href + "' (" + this.innerHTML + ")", 3);
		if(this.text.substr(this.text.length-3)=="...")
			getTitle(this);
	});
    clog(openRequests + " of " + allinks + " links are being checked.", 2);
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
		timeout: 30000, //30 seconds timeout
		onload: function(res){
            var mrex = new RegExp(settings.rex, "i");
			var tit = mrex.exec(res.response);
			if(tit === undefined || tit === null){
                clog({error: "No title found in response", page: el.href}, 2);
                report("fail");
				return;
            }
			disableUpdate = true;
			el.title = unEscapeHtml(tit[2]);
            if(settings.applyToLinkText){
                el.innerHTML = el.title;
                $(el).parent().css("overflow", "visible");
            }
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
    if(settings.verbosity >= l)
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
		updaterequest = true;
	}
}

var bodyObserver;

function observeResults(){
	clog("observing contents", 3);
    updater();
	resultsObserver = new MutationObserver(function(){
        clog("content changed",3);
        updater();
    });
	resultsObserver.observe($("#ires")[0], {subtree: true, childList: true});
	// if(bodyObserver !== undefined)
	// 	bodyObserver.disconnect();
}

var oloc = window.location.href;
function checkLocation(){
	if(window.location.href != oloc){
        clog("Window Location has changed (dynamic loading)",3);
		oloc = window.location.href;
		prepareObservers();
	}
	updater();
}

function prepareObservers(){
    if($("#ires").length>0){
        observeResults();
    }
    else{
        bodyObserver = new MutationObserver(function(){
            if(disableUpdate || !idle){
                return;
            }
            if($("#ires").length>0)
            {
                clog("content found through body observer",3);
                observeResults();
            }
        });
        bodyObserver.observe($("body")[0], {subtree: true, childList: true});
    }
}

if(settings.useTimerInsteadOfObserver === true){
	setInterval(updatePage, settings.checkTimer);
}
else{
	setInterval(checkLocation, 1000);
	prepareObservers();
}
