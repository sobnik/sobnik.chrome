/*  
    server.js - sobnik.chrome module

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

    var sobnik = window.sobnik;
    console.assert (sobnik, "Sobnik required");

    var cmn = sobnik.require ("cmn");

    console.log ("Loading server");
    
    function bgPart () 
    {
	console.log ("Loading server.bg");

	var apiUrl = "http://sobnik.com/api/";
	var crossDomain = false;
	//    var apiUrl = "http://localhost:8081/api/";
	//  var crossDomain = true;

	var token = "";
	var requesting = false;

	function authHeaders ()
	{
	    var headers = {};
	    if (token)
		headers["Authorization"] = token;
	    return headers;
	}

	function setToken (t)
	{
	    token = t;
	    chrome.storage.local.set ({token: t});
	}

	function requestToken ()
	{
	    if (requesting)
		return;

	    requesting = true;

	    function errback () {
		console.log ("Refused token");
		requesting = false;
		setToken ("");
	    }

	    function callback (data) 
	    {
		console.log ("Token", data);
		requesting = false;
		setToken (data.Token);
	    }

	    $.ajax ({
		url: apiUrl + "token",
		type: "POST",
		data: null,
		headers: authHeaders (),
		crossDomain: crossDomain,
		statusCode: {
		    200: callback,
		    204: errback
		},
		error: errback
	    });
	}

	function getToken () 
	{
	    if (token)
		return;

	    chrome.storage.local.get ("token", function (items) {
		token = items.token;
		if (token)
		    return;

		requestToken ();
	    });
	}

	function ajax (method, type, data, callback, statbacks, errback)
	{
	    
	    if (!statbacks)
		statbacks = {};

	    statbacks[403] = function () {
		console.log ("Token expired");
		setToken ("");
		requestToken ();
	    }

	    $.ajax ({
		url: apiUrl + method,
		type: type,
		data: JSON.stringify (data),
		headers: authHeaders (),
		success: callback,
		crossDomain: crossDomain,
		statusCode: statbacks,
		error: function (xhr, status, error) {
		    console.log ("API Error, method: "+method+", status: "+status);
		    if (errback)
			errback ();
		}
	    });
	}

	function call (method, data, callback, errback)
	{
	    ajax (method, "POST", data, /* callback= */null, {
		200: callback,
		201: callback,
		204: errback,
	    }, errback);

	    return true;
	}

	function tabCall (method, data, callback)
	{
	    call (method, data, callback, function () {
		callback ({error: true});
	    });
	    return true;
	}

	function crawlerJob (callback, errback)
	{
	    call ("crawler/job", /* data= */null, callback, errback);
	}

	function sobnik (data, callback, errback)
	{
	    call ("sobnik", data, callback, errback);
	}

	function ads (data, callback, errback)
	{
	    call ("ads", data, callback, errback);
	}

	function onCrawlerJob (message, sender, reply)
	{
	    return tabCall ("crawler/job", /* data= */null, reply);
	}

	function onSobnik (message, sender, reply)
	{
	    return tabCall ("sobnik", message.data, reply);
	}

	function onAds (message, sender, reply)
	{
	    return tabCall ("ads", message.data, reply);
	}

	// public
	function start ()
	{
	    cmn.setEventListeners ({
		"server.crawlerJob": onCrawlerJob,
		"server.sobnik": onSobnik,
		"server.ads": onAds,
	    });

	    getToken ();
	}

	window.sobnik.server.bg = {
	    start: start,
	    crawlerJob: crawlerJob,
	    sobnik: sobnik,
	    ads: ads,
	}
    }

    function tabPart () 
    {
	console.log ("Loading server.tab");

	function bgCall (method, data, callback, errback)
	{
	    chrome.runtime.sendMessage (
		/* ext_id= */"", 
		{type: "server."+method, data: data},
		/* options= */{}, 
		function (response) {
		    if (!response || response.error)
			errback (response);
		    else
			callback (response);
		});
	}

	// public
	function crawlerJob (callback, errback)
	{
	    bgCall ("crawlerJob", /* data= */null, callback, errback);
	}

	// public
	function sobnik (request, callback, errback)
	{
	    bgCall ("sobnik", request, callback, errback);
	}

	// public
	function ads (request, callback, errback)
	{
	    bgCall ("ads", request, callback, errback);
	}

	window.sobnik.server.tab = {
	    crawlerJob: crawlerJob,
	    sobnik: sobnik,
	    ads: ads,
	}
    }

    window.sobnik.server = {
	bg: bgPart,
	tab: tabPart,
    }

}) ();
