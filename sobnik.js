/*  
    sobnik.js - sobnik.chrome background module

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

(function () {

    function capture (sender, message, reply) {
	var parse = function (data) {
	    console.log (message.what);

	    var result = {};
	    for (var item in message.what) 
	    {
		var url = message.what[item]
		    .replace (/\//g, "\\/")
		    .replace ("?", "\\?")
		    .replace ("+", "\\+")
		    .replace ("=", "\\=")
		    .replace ("*", "\\*");

		var pattern = "Content-Location[^\\n]*"+url
		    +"[^A-Za-z0-9\\+\\/]*([A-Za-z0-9=\\+\\/\\r\\n]+)";

		console.log (pattern);
		var r = data.match (new RegExp (pattern));
		if (r && r.length > 1)
		    result[item] = r[1];
	    }

	    reply (result);
	};

	chrome.pageCapture.saveAsMHTML ({tabId: sender.tab.id}, function (data) {
	    var reader = new FileReader ();
	    reader.addEventListener ("loadend", function () {
		parse (reader.result);
	    });

	    reader.readAsBinaryString (data);		
	});

	// tell chrome that we'll reply asynchronously
	return true;
    };

    function activated (sender, message, reply) {
	if (sender.tab.incognito)
	    return;

	$.cookie ("subscribeOffer", "");
	var decision = $.cookie ("subscribeOffer");
	var show = !decision || decision.indexOf("done=") == 0;
	if (!show && decision.indexOf ("later=") == 0)
	{
	    var day = 24*60*60*1000; // ms
	    var decided = Number (decision.substr (6));
	    show = !decided;
	    if (!show)
	    {
		var elapsed = Date.now () - decided;
		console.log ("Elapsed "+elapsed);
		show = elapsed > day;
	    }
	}
	if (show)
	    chrome.pageAction.show (sender.tab.id);
	console.log ("activated");
    };

    var crawler = sobnikApi ().crawler ()
    // start it
    // FIXME off until server support
    // crawler.next ();

    function done (sender)
    {
	if (sender.tab.id == crawler.tab ())
	{
	    console.log ("Crawler tab done");
	    crawler.next ();
	}
    }

    chrome.runtime.onMessage.addListener (function (message, sender, reply) {
	if (!message.type)
	    return;

	var handlers = {
	    "capture": capture,
	    "activated": activated,
	    "done": done
	};

	var handler = handlers[message.type];
	if (handler)
	    return handler (sender, message, reply);
    });

} ());
