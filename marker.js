/*  
    marker.js - sobnik.chrome module

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

;(function () {

    console.log ("Loading marker");

    var sobnik = window.sobnik;
    console.assert (sobnik, "Sobnik required");

    var cmn = sobnik.require ("cmn");
    var server = sobnik.require ("server.tab");
    var board = sobnik.require ("boards/current");

    var lastMarkList = {};
    function markListDraw (map, ads)
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
    function markPageDraw (ads)
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

    function gatherList ()
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

    var sobnikDelayMult = 1.0;
    function startSobnik (ads, delay, dataCallback, retryCallback)
    {
	var request = {Ads: ads};
	
	function backoff (mult)
	{
	    sobnikDelayMult *= mult;
	    if (sobnikDelayMult > 10.0)
		sobnikDelayMult = 10.0;
	    if (retryCallback)
		cmn.later (delay * sobnikDelayMult, retryCallback);
	}

	function errback () 
	{
	    // backoff faster on error
	    backoff (2.0);
	}

	server.sobnik (request, function (data) {
	    if (data && data.Ads)
		dataCallback (data.Ads);

	    // backoff slowly
	    backoff (1.1);

	}, errback);
    }
    
    function markList ()
    {
	// min delay
	var delay = cmn.rdelay (5, 10)

	var tryMark = function () 
	{
	    var map = gatherList ();
	    var ads = [];
	    for (var id in map)
		ads.push ({AdId: id, Url: map[id].url});

	    console.log ("Sobnik "+ads.length);

	    if (ads.length == 0)
		return;

	    startSobnik (ads, delay, function (ads) {

		// draw
		markListDraw (map, ads);

	    }, tryMark);
	}

	tryMark ();
    }

    function markPage ()
    {
	var delay = cmn.rdelay (1, 2);

	var tryMark = function () 
	{
	    var id = board.url2id (location.href);
	    console.assert (id, "Bad ad id "+location.href);

	    var ads = [{AdId: id, Url: location.href}];
	    startSobnik (ads, delay, function (data) {

		// draw
		markPageDraw (data);

	    }, tryMark);
	}

	tryMark ();
    }

    function startMarkList () 
    {
	// we wait a while to let user navigate 
	// somewhere else if this page was intermediate 	
	var delay = 10000;

	cmn.later (delay, function () {
	    if (cmn.matchRxs (location.href, board.list.urls))
	    {
		console.log ("Marking list");
		markList ();
	    }
	    else
		console.log ("Not marking list");
	})
    }

    function startMarkPage () 
    {
	$(window).on ('load', function () {
	    if (cmn.matchRxs (location.href, board.urls))
	    {
		console.log ("Marking page");
		markPage ();
	    }
	    else
		console.log ("Not marking page");
	})
    }

    // public
    function start () 
    {
	startMarkList ();
	startMarkPage ();
    }

    sobnik.marker = {
	start: start,
    }

}) ();
