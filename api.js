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

    var api_url = "http://sobnik.com/api/";
    var crossDomain = false;
//    var api_url = "http://localhost:8081/api/";
//    var crossDomain = true;

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
	    return weights[Math.floor (weights.length / 2)];
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

    function imageLoaded (img)
    {
	// http://www.sajithmr.me/javascript-check-an-image-is-loaded-or-not/
	if (!img.complete)
            return false;

	if (typeof img.naturalWidth !== "undefined" && img.naturalWidth === 0)
            return false;

	return true;
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

	function post (data) 
	{
	    console.log (data);
	    call ("ads", "POST", data, function () {
		done ();
	    });
	};

	function setField (name, value)
	{
	    if (!ad.Fields[name])
		ad.Fields[name] = [];
	    ad.Fields[name] = ad.Fields[name].concat (""+value);
	}

	function capture (what, callback) 
	{
	    chrome.runtime.sendMessage (
		/* ext_id= */"", 
		{type: "capture", what: what}, 
		/* options= */{}, 
		function (response) {
		    console.log (response);
		    for (var item in response)
		    {
			// FIXME work out this special case
			if (item == 'phoneImage')
			{
			    setField (item, response[item]);
			}
			else
			{
			    var height = detectTextOnPhoto (response[item]);
			    item += "Height";
			    setField (item, height);
			}
		    }

		    callback ();
		});
	}

	if (board.capture)
	{
	    var queue = [];
	    for (var item in board.capture)
	    {
		var part = board.capture[item];
		if (part.click && $(part.click).length > 0)
		{
		    $(part.click).each (function (i, e) {
			var p = {
			    name: item,
			    click: e,
			    selector: part.selector,
			    attr: part.attr
			}
			queue.push (p);
		    });
		}
		else
		{
		    $(part.selector).each (function (i, e) {
			var p = {
			    name: item,
			    element: e,
			    attr: part.attr
			}
			queue.push (p);
		    });
		}
	    }

	    var what = {};
	    function captureNext ()
	    {
		if (queue.length > 0)
		{
		    var item = queue.shift ();

		    function captureItem (e) 
		    {
			var what = {};
			what[item.name] = $(e).attr (item.attr);
			capture (what, captureNext);
		    }

		    if (item.click)
		    {
			console.log ("clicking", item.click);
			$(item.click).trigger ('click');
			function waitImage ()
			{
			    // wait for image to appear on page
			    later (1000, function () {
				console.log ("waiting", $(item.selector));
				if (!$(item.selector).length)
				    // wait more
				    waitImage ();
				else
				{
				    // wait until it's loaded
				    var img = $(item.selector)[0];
				    if (imageLoaded (img))
					captureItem (img);
				    else
					$(img).on ('load', function () {
					    captureItem (img);
					});
				}
			    });
			}

			waitImage ();
		    }
		    else 
		    {
			captureItem (item.element);
		    }
		}
		else
		{
		    post (ad);
		}
	    }

	    captureNext ();
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
	for (var i = 0; i < ads.length; i++)
	{
	    var a = ads[i];
	    if (!map[a.AdId])
		continue;

	    if (lastMarkList[a.AdId])
		$(lastMarkList[a.AdId]).remove ();

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

	if (ads == null)
	    return

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
	    $(row).find (board.list.hrefSelector).each (function (i, a) {
		var url = $(a).attr("href");
//		console.log ("Url "+url+" rx "+regexp);
		if (regexp && !regexp.test(url))
		    return;
		if (url.indexOf (location.hostname) < 0)
		    url = location.origin + url;
		
		var id = board.url2id (url);
		console.assert (id, "Bad ad id "+url);
		map[id] = {row: row, url: url};
	    });
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

    var sobnikDelayMult = 1.0;
    var startSobnik = function (ads, delay, dataCallback, retryCallback)
    {
	var request = {Ads: ads};
	
	function backoff (mult)
	{
	    sobnikDelayMult *= mult;
	    if (retryCallback)
		later (delay * sobnikDelayMult, retryCallback);
	}

	function errback () 
	{
	    // backoff faster on error
	    backoff (2);
	}

	call ("sobnik", "POST", request, /* callback= */null, {
	    200: function (data) {
		if (data && data.Ads)
		    dataCallback (data.Ads);

		// backoff slowly
		backoff (1.1);
	    },
	    204: errback,
	}, errback);
    }
    
    var markList = function (board)
    {
	// min delay
	var delay = rdelay (5, 10)

	var tryMark = function () 
	{
	    var map = gatherList (board);
	    var ads = [];
	    for (var id in map)
		ads.push ({AdId: id, Url: map[id].url});

	    console.log ("Sobnik "+ads.length);

	    if (ads.length == 0)
		return;

	    startSobnik (ads, delay, function (ads) {

		// draw
		markListDraw (board, map, ads);

	    }, tryMark);
	}

	tryMark ();
    }

    var markPage = function (board)
    {
	var delay = rdelay (1, 2);

	var tryMark = function () 
	{
	    var id = board.url2id (location.href);
	    console.assert (id, "Bad ad id "+location.href);

	    var ads = [{AdId: id, Url: location.href}];
	    startSobnik (ads, delay, function (data) {

		// draw
		markPageDraw (board, data);

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
	if ("sobnikCrawlerTab" in window)
	{
	    startParse (board);
	}
	else
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
	    var ttl = 300000; // ms, 300 sec
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
		file: "crawler.js",
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
	    close: function () { close (); },
	    getId: function () { return tab; },
	}
    }

    function createCrawler ()
    {
	// random delays 60-200 seconds
	var delays = [];
	for (var i = 0; i < 30; i++)
	    delays.push (rdelay (60, 200));

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

	    function get ()
	    {
		chrome.storage.local.get ("crawler", function (items) {
		    if (items.crawler == "off")
		    {
			// retry later after the same delay
			getJob ();
		    }
		    else
		    {
			// get the job
			call ("crawler/job", "POST", "", /* callback */null, {
			    200: function (data) {
//				console.log (data);
				speedup ();
				tab.open (data.Url, getJob);
			    },
			    204: retry
			});
		    }
		})
	    }

	    later (d, get, retry);
	};

	return {
	    next: getJob,
	    tab: tab.getId,
	    close: tab.close,
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
