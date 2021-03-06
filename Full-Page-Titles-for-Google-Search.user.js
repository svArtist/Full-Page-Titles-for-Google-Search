// ==UserScript==
// @name		Retrieve Full Page Titles in Google Search
// @version		1.8
// @downloadURL	https://www.benjamin-philipp.com/fff/userScripts/Full-Page-Titles-for-Google-Search.user.js
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

/* jshint loopfunc: true, -W027 */
/* eslint-disable curly, no-redeclare */
/* eslint no-trailing-spaces: off */
/* globals $, GM_info, GM_setValue, GM_getValue, GM_xmlhttpRequest, GM.setValue, GM.getValue, GM.xmlhttpRequest, escape, uneval */

// SETTINGS:
var settings = {};
settings.applyToLinkText = true;			// Default = FALSE. TRUE = change innerHTML of links and applying overflow: visible to parent; false = only apply to Link Title (for mouseover Tooltip)
settings.rex = "<title([^>]*)>([^<]+)<";	// Default = "<title([^>]*)>([^<]+)<". Regex to find the title of a page. If you find a better way, please let me know.
settings.dontLookupExtensions = [".pdf"];	// Default = [".pdf"]. Exclude from lookup. PDFs are generally downloaded as files, giving you a popup. Excluding ".pdf" is recommended.
settings.verbose = 3;						// Default = 1. 0 = no logs; 1 = reports on link counts; 2 = +statuses of link checks; 3 = +Details
settings.keepSettings = true;				// Default = TRUE. TRUE = Try to save & load settings in browser's localStorage. FALSE = settings will be overweitten on update.
settings.warnOnChange = true;				// Default = TRUE. TRUE = When changes are made but the Version number stays the same (assume changes by user), ask to save and apply the settings. FALSE = Automatically apply changes.

// Script vars, best don't touch
var myVersion = GM_info.script.version;
var settingsSafety = settings;
var linkmatch = "#search #rso .g .rc a h3";
var resultsObserver;
var idle = true;
var idletimer;
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
    var allinks = 0;
    clog("Walking through Links...", 2);
	$(linkmatch + ":not([titled])").each(function(){
        allinks ++;
        clog("Looking at Link '" + $(this).parent()[0].href + "' (" + this.innerHTML + ")", 3);
		if(this.textContent.substr(this.textContent.length-3)=="..."){
			clog("needs checking");
			$(this).parent().css("background-color", "#fee");
			getTitle($(this).parent()[0]);
		}
	});
    clog(openRequests + " of " + allinks + " links need to be checked.", 1);
}

function getTitle(el){
    clog("Link '" + el.href + "' (" + el.innerHTML + ") is too long.", 3);
	for(var i=0; i<settings.dontLookupExtensions.length; i++)
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
			$(el).css("background-color", "#efe");
			el.title = unEscapeHtml(tit[2]);
            if(settings.applyToLinkText){
                $(el).find("h3").html(el.title);
                $(el).css("white-space", "nowrap");
                $(el).parent().css("overflow", "visible");
            }
			$(el).attr("titled", "true");
            report("success");
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

setInterval(updater, 2000);
