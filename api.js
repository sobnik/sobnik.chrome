/*  
    api.js - sobnik client api class

    Copyright (c) 2014 Artur Brugeman <brugeman.artur@gmail.com>
    Copyright other contributors as noted in the AUTHORS file.

    This file is part of sobnik.chrome, Sobnik plugin for Chrome:
    http://sobnik.com.

    This is free software; you can redistribute it and/or modify it under
    the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation; either version 3 of the License, or (at
    your option) any later version.

    This software is distributed in the hope that it will be useful, but
    WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
    Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public
    License along with this program. If not, see
    <http://www.gnu.org/licenses/>.
*/

function sobnikApi ()
{

//    var api_url = "http://sobnik.com/api/";
//    var crossDomain = false;
    var api_url = "http://localhost:8081/api/";
    var crossDomain = true;

    var call = function (method, type, data, callback, statbacks, errback)
    {
	$.ajax ({
	    url: api_url + method,
	    type: type,
	    data: JSON.stringify (data),
	    success: callback,
	    crossDomain: crossDomain,
	    statusCode: statbacks,
	    error: function (xhr, status, error) {
		console.log ("API Error, method: "+method+", status: "+status);
		if (errback)
		    errback ();
	    }
	});
    };

    var dts = function (date)
    {
	return zpad2 (date.getDate ()) + "."
	    + zpad2 (date.getMonth () + 1) + "."
	    + zpad2 (date.getYear () + 1900);
    };

    var dateFmt = function (date)
    {
	var h = date.slice (11, 11+2);
	var m = date.slice (14, 14+2);
	return date.slice (6, 6+4) + "-" 
	    + date.slice (3, 3+2) + "-"
	    + date.slice (0, 2) + " "
	    + (h ? h : "??") + ":"
	    + (m ? m : "??");
    }

    var rx = function (text, pattern, index)
    {
	if (!pattern)
	    return text.trim();

	index = index || 0;
	var r = text.match (new RegExp (pattern));
	//    console.log(r);
	if (r && r.length > index)
	    return r[index].trim();
	return null;
    }

    var zpad2 = function (str)
    {
	str += "";
	while (str.length < 2)
	    str = "0" + str;
	return str;
    }

    var all = function (elements, extractor)
    {
	var values = [];

	elements.each (function (e) {
	    values = values.concat (extractor (this));
	});

	return values;
    }

    var later = function (millis, callback)
    {
	var to = setTimeout (function () {
	    clearTimeout (to);
	    callback ();
	}, millis);
	return to;
    }
    
    var gatherFields = function (fields) 
    {
	var values = {};
	var features = {};
	for (var name in fields)
	{
	    var field = fields[name];
	    var element = $(field.selector);
	    console.log(name);
	    console.log(element.text());
	    if (field.attr)
		values[name] = all (
		    element, 
		    function (e) { return $(e).attr(field.attr); }
		);
	    else
		values[name] = all (
		    element, 
		    function (e) { return rx ($(e).text (), field.rx, field.rxi); }
		);

	    if (!field.data || !values[name])
		continue;

	    for (var f in field.data)
	    {
		var feature = field.data[f];
		for (var i = 0; i < values[name].length; i++)
		{
		    var v = rx (values[name][i], feature.rx, feature.rxi);
		    if (v && feature.conv)
			v = feature.conv (v);
		    if (v)
		    {
			if (!features[f])
			    features[f] = [];
			features[f] = features[f].concat (v);
		    }
		}
		console.log (features[f]);
	    }

	}

	return features;
    }

    var done = function ()
    {
	var div = document.createElement('div');
	$(div).attr("id", "sobnik-chrome-done-signal");
	document.body.appendChild (div);
	chrome.runtime.sendMessage (
	    /* ext_id= */"", 
	    {type: "done"}
	);
    }

    function detectTextOnPhoto (data) 
    {
	// no matter what image format we choose, browser gets it right
	// but don't remove /jpeg - it won't work!
	var dataUrl = "data:image/jpeg;base64,"+data;
	var img = document.createElement ('img');
	$(img).attr ("src", dataUrl);

	var canvas = document.createElement ('canvas');
	canvas.width = img.width;
	canvas.height = img.height;
	console.log ("w "+img.width+" h "+img.height);

	var context = canvas.getContext ('2d');
	context.drawImage (img, 0, 0);

	// rgba
	var imageData = context.getImageData (0, 0, img.width, img.height);
	var pixels = imageData.data;	

	// 1 channel
	var blacks = new Uint8ClampedArray (pixels.length / 4);
	
	function offset (x, y)
	{
	    return (y * img.width + x) * 4;
	}

	function setBlack (x, y)
	{
	    blacks[y * img.width + x] = 1;
	}

	// text detection filters
	var sharpDistance = 2 // px
	var sharpThreshold = 50 // 8-bit depth
	var minTextWeight = 40 // px

	for (var y = 0; y < img.height; y++)
	{
	    for (var x = sharpDistance; x < img.width; x++)
	    {
		var oc = offset (x, y);
		var od = offset (x-sharpDistance, y);
		var sharp = false;
		// for each rgb channel
		for (var i = 0; !sharp && i < 3; i++)
		{
		    var c = pixels[oc + i];
		    var d = pixels[od + i];
		    var diff = Math.abs (c - d);
//		    if (y == 465)
//			console.log ("y "+y+" x "+x+" c "+c+" d "+d+" diff "+diff);
		    sharp = diff > sharpThreshold;
		}
		if (!sharp)
		    setBlack (x, y);
	    }
	}

	var weights = [];
	for (var y = 0; y < img.height; y++)
	{
	    var weight = 0;
	    for (var x = 0; x < img.width; x++)
	    {
		function black (x, y)
		{
		    return blacks[y * img.width + x] != 0;
		}

		if (black (x, y))
		    continue;

		var noiseX = true;
		if (x > 0 && !black (x-1, y))
		    noiseX = false;

		if (x < (img.width - 1) && !black (x+1, y))
		    noiseX = false

		var noiseY = true
		if (y > 0 && !black (x, y-1))
		    noiseY = false

		if (y < (img.height - 1) && !black (x, y+1))
		    noiseY = false

		if (noiseX || noiseY)
		    setBlack (x, y);
		else
		    weight++		
	    }
	    weights.push (weight);
	}

	// debug
	if (false)
	{
	    for (var i = 0; i < blacks.length; i++)
	    {
		if (!blacks[i])
		    continue;
		
		pixels[i*4] = 0;
		pixels[i*4+1] = 0;
		pixels[i*4+2] = 0;
	    }
	    context.putImageData (imageData, 0, 0);
	    
            $(img).attr("src", canvas.toDataURL ("image/png"));
	    document.body.appendChild (img);
	}
 
	function median ()
	{
	    if (weights.length == 0)
		return 0
	    
	    weights.sort (function (a, b) { return a < b; });
	    return weights[weights.length / 2];
	}

	var noise = median ();
	console.log ("Noise "+noise);
	var height = 0;
	weights.forEach (function (w) {
	    var text = w > (noise + minTextWeight);
	    if (text)
		height++;
	});

	console.log ("Photo text height: "+height);
	return height;
    }

    var gather = function (board) 
    {
	console.log ("gathering");

	var ad = {
	    Url: location.href,
	    AdId: board.url2id (location.href),
	};

	console.assert (ad.AdId, "Bad ID for url "+location.href);

	ad.Fields = gatherFields (board.fields);

	var post = function (data) {
	    console.log (data);
	    
	    call ("ads", "POST", data, function () {
		done ();
	    });

/*	    for (var i = 0; i < 1000; i++)
	    {
		call ("ads", "POST", data, function () {
		    console.log (i);
		});
	    }
*/
	};

	if (board.capture)
	{
	    var what = {};
	    for (var item in board.capture)
	    {
		var part = board.capture[item];
		var url = $(part.selector).attr (part.attr);
		what[item] = url;
	    }

	    chrome.runtime.sendMessage (
		/* ext_id= */"", 
		{type: "capture", what: what}, 
		/* options= */{}, 
		function (response) {
		    console.log (response);
		    for (var item in response)
		    {
			if (item == 'phoneImage')
			{
			    if (!ad.Fields[item])
				ad.Fields[item] = [];
			    ad.Fields[item] = ad.Fields[item].concat (response[item]);
			}
			else
			{
			    var height = detectTextOnPhoto (response[item]);
			    item += "Height";
			    if (!ad.Fields[item])
				ad.Fields[item] = [];
			    ad.Fields[item] = ad.Fields[item].concat (""+height);
			}
		    }

		    post (ad);
		});
	}
	else
	{
	    post (ad);
	}
    };

    var findTrigger = function (selector, callback) 
    {
	var $trigger = $(selector);
	if ($trigger.length == 0)
	{
	    later (1000, function () {
		findTrigger (selector, callback);
	    });
	}
	else
	{
	    if ($trigger.attr('src'))
	    {
		$trigger.on ('load', callback);
	    }
	    else
	    {
		later (3000, callback);
	    }
	}
    };

    var parse = function (board) 
    {
	if (board.clicks)
	{
	    for (var i = 0; i < board.clicks.length; i++)
	    {
		console.log ("click "+board.clicks[i]);
		$(board.clicks[i]).trigger ("click");
	    }
	}
	
	console.log ("trigger "+board.trigger);
	findTrigger (board.trigger, function () { gather (board); });

	if (board.untrigger)
	{
	    console.log ("untrigger "+board.untrigger);
	    findTrigger (board.untrigger, function () { 
		console.log ("cancelled");
		done (); 
	    });
	}
    }

    var lastMarkList = {};
    var markListDraw = function (board, map, ads)
    {
//	console.log ("Removing...");
//	console.log (lastMarkList);
	for (var i = 0; i < lastMarkList.length; i++)
	    $(lastMarkList[i]).remove ();
	lastMarkList = [];

	for (var i = 0; i < ads.length; i++)
	{
	    var a = ads[i];
	    if (lastMarkList[a.AdId])
		$(lastMarkList[a.AdId]).remove ();

	    if (!map[a.AdId])
		continue;

	    var row = map[a.AdId].row;
	    var mark = board.list.mark (row, a);
	    lastMarkList[a.AdId] = mark;
	    delete map[a.AdId];
	}
    }

    var lastMarkPage = [];
    var markPageDraw = function (board, ads)
    {
	console.log ("Removing...");
	console.log (lastMarkPage);
	for (var i = 0; i < lastMarkPage.length; i++)
	    $(lastMarkPage[i]).remove ();
	lastMarkPage = [];

	var id = board.url2id (location.href);
	console.assert (id, "Bad ad id "+location.href);
	for (var i = 0; i < ads.length; i++)
	{
	    var a = ads[i];
	    if (a.AdId != id)
		continue;

	    for (var i = 0; i < board.page.marks.length; i++)
	    {
		var parent = $(board.page.marks[i].selector);
		var mark = board.page.marks[i].mark (parent, a);
		lastMarkPage.push (mark);	    
	    }
	    break;
	}
    }

    var gatherList = function (board)
    {
	var rows = $(board.list.rowSelector);
	var map = {};
	var regexp = board.list.pattern ? new RegExp(board.list.pattern) : null;
	rows.each (function(i, row) {
	    var url = $(row).find (board.list.hrefSelector).attr("href");
	    if (regexp && !regexp.test(url))
		return;
	    if (url.indexOf (location.hostname) < 0)
		url = location.origin + url;

	    var id = board.url2id (url);
	    console.assert (id, "Bad ad id "+url);
	    map[id] = {row: row, url: url};
	});

	return map;
    }

    function rdelay (from, till)
    {
	var ms = 1000;
	if (!till)
	    return from * ms;
	return (Math.random () * (till - from) + from) * ms;
    }
    
    // randomize timer to avoid storms
    var waitSobnikMinRetry = rdelay (1, 2);
    var waitSobnikRetry = waitSobnikMinRetry;
    var waitSobnik = function (id, callback, errback)
    {
	var request = {TaskId: id};

	var backoff = function () 
	{
	    // backoff exponentially
	    waitSobnikRetry *= 2;
	    later (waitSobnikRetry, tryWait);
	}

	var success = function (data)
	{
	    // speed-up linearly
	    waitSobnikRetry -= 1000;
	    if (waitSobnikRetry < waitSobnikMinRetry)
		waitSobnikRetry = waitSobnikMinRetry;

	    // process results
	    callback (data);
	}

	var tryWait = function () 
	{
	    call ("result", "POST", request, /* callback= */null, {
		200: success,
		204: backoff,
		404: errback,
	    }, backoff);
	}

	later (waitSobnikRetry, tryWait);
    }

    var startSobnik = function (ids, urls, options, dataCallback, retryCallback)
    {
	var request = {AdIds: ids, Async: true};
	if (urls)
	    request.Urls = urls;
	var errback = function () 
	{
	    // backoff exponentially on error
	    options.retry *= 2;
	    if (retryCallback)
		later (options.retry, retryCallback);
	}

	call ("sobnik", "POST", request, function (data) {
	    console.log (data);
	    if (!data || !data.Id)
	    {
		errback ();
		return
	    }

	    // wait for result
	    waitSobnik (data.Id, function (urls) {
		// process sobnik data
		dataCallback (urls);

		if (retryCallback)
		    later (options.retry, retryCallback);
	    }, errback);

	}, /* statbacks= */null, errback);
    }
    
    var markList = function (board)
    {
	var minRetry = rdelay (20, 30);
	var options = {
	    retry: minRetry
	};
	var known = {};

	var tryMark = function () 
	{
	    var map = gatherList (board);
//	    console.log (map);
	    var ids = [];
	    var urls = [];
	    for (var id in map)
	    {
		if (known[id])
		    continue;

		ids.push (id);
		urls.push (map[id].url);
	    }
	    console.log ("Sobnik "+ids.length);

	    if (ids.length == 0)
		return;

	    startSobnik (ids, urls, options, function (ads) {

		// remember what we've got
		for (var i = 0; i < ads.length; i++)
		{
		    var a = ads[i];
		    known[a.AdId] = a;
		}

		// draw
		markListDraw (board, map, ads);

		// reset timer
		options.retry = minRetry;

	    }, tryMark);

	}

	tryMark ();
    }

    var markPage = function (board)
    {
	var options = {
	    retry: rdelay (7, 10)
	};

	var tryMark = function () 
	{
	    var id = board.url2id (location.href);
	    console.assert (id, "Bad ad id "+location.href);

	    // no urls provided as this page should parse the ad itself
	    startSobnik ([id], /* urls= */null, options, function (data) {

		// draw
		markPageDraw (board, data);

		// it get's less and less likely that any changes will
		// be shown by server, so lets backoff so that 
		// open tabs do not create constant useless traffic
		options.retry *= 1.3;
	    }, tryMark);
	}

	tryMark ();
    }

    var marker = function (a) 
    {
	var color = a.Author ? "red" : "#1e2";
	var title = a.Author ? "Посредник" : "Собственник";
	return "<div title='"+title+"' style='display:block; "
	    + "margin-right: 2px;"
	    + "height: 12px; width: 12px; line-height: 12px; "
	    + "-moz-border-radius: 50%; border-radius: 50%;"
	    + "background-color: "+color+";'/>";
    }

    var startParse = function (board)
    {
	later (rdelay (2, 8), function () {
	    var loc = location.href;
	    // if current page matches pattern - start sobnik
	    for (var i = 0; i < board.urls.length; i++)
	    {
		console.log ("Match "+loc+" against "+board.urls[i]);
		if (loc.match(board.urls[i]) != null)
		{
		    console.log ("Parsing "+loc);
		    parse (board);
		    return;
		}
	    }
	    console.log ("Not parsing");
	    if ("sobnikCrawlerTab" in window)
		done ();
	})
    }

    var startMarkList = function (board) 
    {
//	$(window).on ('load', function () {
	later (5000, function () {
	    var loc = location.href;
	    // if current page matches list pattern - start sobnik
	    for (var i = 0; i < board.list.urls.length; i++)
	    {
		if (loc.match(board.list.urls[i]) != null)
		{
		    console.log ("Marking "+loc);
		    markList (board);
		    return;
		}
	    }
	    console.log ("Not marking");
	})
    }

    var startMarkPage = function (board) 
    {
	$(window).on ('load', function () {
//	later (2000, function () {
	    var loc = location.href;
	    // if current page matches list pattern - start sobnik
	    for (var i = 0; i < board.urls.length; i++)
	    {
		if (loc.match(board.urls[i]) != null)
		{
		    console.log ("Marking page "+loc);
		    markPage (board);
		    return;
		}
	    }
	    console.log ("Not marking page");
	})
    }

    function activate () {
	chrome.runtime.sendMessage (
	    /* ext_id= */"", 
	    {type: "activated"}
	)
    }

    function start (board) 
    {
	startParse (board);
	if (!("sobnikCrawlerTab" in window))
	{
	    startMarkList (board);
	    startMarkPage (board);
	}
	activate ();
    }

    function crawlerTab () 
    {
	var tab = null;
	var to = null;
	var callback = null;
    
	function clearTTL ()
	{
	    if (to != null)
		clearTimeout (to);
	    to = null;
	}

	function close () 
	{
	    if (!tab)
	    {
		callback ();
		return;
	    }

	    chrome.tabs.remove (Number(tab), function () {
		if (chrome.runtime.lastError)
		    console.log (chrome.runtime.lastError);
		callback ();
	    });

	    clearTTL ();
	    tab = null;
	}

	function startTab (t) 
	{
	    var ttl = 60000; // ms, 60 sec
	    tab = t.id;

	    // start killer
	    to = later (ttl, function () {
		console.log ("TTL expired");
		close ();
	    });

	    if (chrome.runtime.lastError)
		console.log (chrome.runtime.lastError);

	    // maybe user closed it immediately after we requested the update
	    if (!tab)
		return;

	    // notice if tab gets closed
	    chrome.tabs.onRemoved.addListener(function (id) {
		if (id == tab)
		    tab = null;
	    })

	    // mark it as a crawler tab
	    chrome.tabs.executeScript (tab, {
		code: 'window["sobnikCrawlerTab"] = true;',
		runAt: "document_start",
	    }, function () {
		if (chrome.runtime.lastError)
		    console.log (chrome.runtime.lastError);
	    });
	}

	function open (url, cb)
	{
	    console.log (url);
	    callback = cb;
	    if (tab == null)
	    {
		chrome.tabs.create ({
		    url: url,
		    active: false,
		    selected: false
		}, startTab);
	    }
	    else
	    {
		clearTTL ();
		chrome.tabs.update (tab, {
		    url: url
		}, startTab);
	    }
	}

	return {
	    open: open,
	    getId: function () { return tab; }
	}
    }

    function createCrawler ()
    {
	// random delays 10-200 seconds
	var delays = [];
	for (var i = 0; i < 30; i++)
	    delays.push (rdelay (10, 20)); // FIXME 200

	// multiplier used for back-off
	var delayMult = 1.0;

	var tab = crawlerTab ();

	function backoff () {
	    delayMult *= 2;
	}

	function speedup () {
	    delayMult -= 0.1;
	    if (delayMult < 1.0)
		delayMult = 1.0;
	}

	function retry () {
	    backoff ();
	    getJob ();
	}

	function getJob () {
	    var r = Math.floor (Math.random () * delays.length);
	    var d = delays[r] * delayMult;
	    console.log ("Next job after "+d);
	    later (d, function () {
		call ("crawler/job", "GET", {}, /* callback */null, {
		    200: function (data) {
			console.log (data);
			speedup ();
			tab.open (data.Url, getJob);
		    },
		    204: retry
		}, retry);
	    })
	};

	return {
	    next: getJob,
	    tab: tab.getId
	}
    };

    var s = {
	call: call,
	dts: dts,
	dateFmt: dateFmt,
	marker: marker,
	start: start,
	crawler: createCrawler,
    };

    return s;
}
