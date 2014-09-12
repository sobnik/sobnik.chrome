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
	    
	    call ("ads", "POST", data);
	    
	    done ();
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
			if (!ad.Fields[item])
			    ad.Fields[item] = [];
			ad.Fields[item] = ad.Fields[item].concat (response[item]);
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
	var trigger = $(selector);
	if (trigger.length == 0)
	{
	    later (1000, function () {
		findTrigger (selector, callback);
	    });
	}
	else
	{
	    trigger.on ("load", callback);
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
	
	if (board.trigger)
	{
	    console.log ("trigger "+board.trigger);
	    findTrigger (board.trigger, function () { gather (board); });
	}
	else
	{
	    gather (board);
	}
    }

    var lastMarkList = [];
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
	    var row = map[a.AdId];
//	    console.log (row);
	    if (!row)
		continue;

	    var mark = board.list.mark (row, a);
	    lastMarkList.push (mark);	    
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
	    map[id] = row;
	});

	return map;
    }
    
    var markList = function (board)
    {
	var retry = 30000; // 30 sec
	var tryMark = function () 
	{
	    var map = gatherList (board);
//	    console.log (map);
	    if (map.length == 0)
		return;

	    var request = {AdIds: []};
	    for (var id in map)
		request.AdIds.push (id);
//	    console.log (request);
	    call ("sobnik", "POST", request, function (data) {
//		console.log (data);
		markListDraw (board, map, data);
		later (retry, tryMark);
	    }, /* statbacks= */null, function () {
		later (retry, tryMark);
	    });
	}

	tryMark ();
    }

    var markPage = function (board)
    {
	var retry = 10000; // 10 sec
	var tryMark = function () 
	{
	    var id = board.url2id (location.href);
	    console.assert (id, "Bad ad id "+location.href);
	    var request = {AdIds: [id]};
//	    console.log (request);
	    call ("sobnik", "POST", request, function (data) {
//		console.log (data);
		markPageDraw (board, data);
		later (retry, tryMark);
	    }, /* statbacks= */null, function () {
		later (retry, tryMark);
	    });
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
	later ((Math.random () *  + 1) * 1000, function () {
	    var loc = location.href;
	    // if current page matches pattern - start sobnik
	    for (var i = 0; i < board.urls.length; i++)
	    {
		if (loc.match(board.urls[i]) != null)
		{
		    console.log ("Parsing "+loc);
		    parse (board);
		    return;
		}
	    }
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
	})
    }

    var startMarkPage = function (board) 
    {
//	$(window).on ('load', function () {
	later (5000, function () {
	    var loc = location.href;
	    // if current page matches list pattern - start sobnik
	    for (var i = 0; i < board.urls.length; i++)
	    {
		if (loc.match(board.urls[i]) != null)
		{
		    console.log ("Marking "+loc);
		    markPage (board);
		    return;
		}
	    }
	})
    }

    var start = function (board) 
    {
	startParse (board);
	startMarkList (board);
	startMarkPage (board);
    };

    var s = {
	call: call,
	dts: dts,
	dateFmt: dateFmt,
	gatherFields: gatherFields,
	marker: marker,
	start: start
    };

    return s;
}
