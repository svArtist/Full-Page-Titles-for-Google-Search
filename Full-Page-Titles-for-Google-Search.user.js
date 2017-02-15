// ==UserScript==
// @name		Retrieve Full Page Titles in Google Search
// @version		1.4
// @downloadURL	https://github.com/svArtist/Full-Page-Titles-for-Google-Search/raw/master/Full-Page-Titles-for-Google-Search.user.js
// @namespace	Google
// @author		Benjamin Philipp <benjamin_philipp [at - please don't spam] gmx.de>
// @description	Fill the page link titles with the full respective page titles
// @icon64URL	http://imgur.com/1J34GZD.png
// @include		/https?:\/\/(www\.)?google\.[a-z\.]{2,6}\/search\?((?!tbm=isch).)*$/
// @require 	http://ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js
// @run-at		document-body
// @grant		GM_xmlhttpRequest
// @connect		*
// ==/UserScript==

var applyToLinkText = false;			// Default = false. True = change innerHTML of links and applying overflow: visible to parent; false = only apply to Link Title (for mouseover Tooltip)
var rex = /<title>([^<]+)</i;			// Default = /<title>([^<]+)</i. Regex to find the title of a page. If you find a better way, please let me know.
var dontLookupExtensions = [".pdf"];	// Default = [".pdf"]. Exclude from lookup. PDFs are generally downloaded as files, giving you a popup. Excluding ".pdf" is recommended.
var verbose = 1;						// Default = 1. 0 = no logs; 1 = reports on link counts; 2 = +statuses of link checks; 3 = +Details


var resultsObserver;
var idle = true;
var idletimer;
var disableUpdate = false;
var updaterequest = false;
var openRequests = 0;
var successRequests = 0;
var failedRequests = 0;

clog("Verbosity level: " + verbose, 1);

function runthrough(){
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
	for(i=0; i<dontLookupExtensions.length; i++)
	{
		if(el.href.endson(dontLookupExtensions[i], true)){
            clog("Excluding Link '" + el.href + "' (" + el.innerHTML + ") because the extension (" + dontLookupExtensions[i] + ") is excluded", 3);
			return;
        }
	}
    openRequests++;
	GM_xmlhttpRequest({
		url: el.href,
		method: "GET",
		timeout: 15000, //15 seconds timeout
		onload: function(res){
			var tit = rex.exec(res.response);
			if(tit === undefined || tit === null){
                clog("No title found in response for " + el.href, 2);
                report("fail");
				return;
            }
			disableUpdate = true;
			el.title = unEscapeHtml(tit[1]);
            if(applyToLinkText){
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

function clog(o, l){
    if(verbose >= l)
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

function updatePage(){
	if(idle)
	{
		idle = false;
		updaterequest = false;
        clog("Update again", 3);
		runthrough();
		idletimer = setTimeout(function(){
			idle = true;
			if(updaterequest)
				updatePage();
		}, 1000);
	}
	else
	{
		updaterequest = true;
	}
}

$(function(){
	var bodyObserver = new MutationObserver(function(mutations){
		if(disableUpdate || !idle)
			return;
		if($("#ires .g").length>0)
		{
			resultsObserver = new MutationObserver(updatePage);
			resultsObserver.observe($("#ires")[0], {subtree: true, childList: true});
		}
	});
	bodyObserver.observe($("body")[0], {subtree: true, childList: true});
	updatePage();
});
