/*  
    cmn.js - sobnik.chrome module

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

    // public
    function zpad (str, n)
    {
	if (!n)
	    n = 2;
	str += "";
	while (str.length < n)
	    str = "0" + str;
	return str;
    }

    // public
    function later (millis, callback)
    {
	var to = setTimeout (function () {
	    clearTimeout (to);
	    callback ();
	}, millis);
	return to;
    }

    // public
    function repeat (callback, ms)
    {
	callback ();
	if (!ms)
	    ms = 1000;
	later (ms, function () { repeat (callback, ms); });
    }

    // public
    function rdelay (from, till)
    {
	var ms = 1000;
	if (!till)
	    return from * ms;
	return (Math.random () * (till - from) + from) * ms;
    }

    // public
    function getCrawlerAllowed (callback)
    {
	var keys = ["crawler", 
		    "crawlerOnUntil", 
		    "crawlerOffUntil",
		    "crawlerSchedule",
		    "crawlerHour00",
		    "crawlerHour01",
		    "crawlerHour02",
		    "crawlerHour03",
		    "crawlerHour04",
		    "crawlerHour05",
		    "crawlerHour06",
		    "crawlerHour07",
		    "crawlerHour08",
		    "crawlerHour09",
		    "crawlerHour10",
		    "crawlerHour11",
		    "crawlerHour12",
		    "crawlerHour13",
		    "crawlerHour14",
		    "crawlerHour15",
		    "crawlerHour16",
		    "crawlerHour17",
		    "crawlerHour18",
		    "crawlerHour19",
		    "crawlerHour20",
		    "crawlerHour21",
		    "crawlerHour22",
		    "crawlerHour23",
		   ];

	chrome.storage.local.get (keys, function (items) {	    

	    var allowed = false;
	    console.log ("Crawler settings", items);

	    var now = new Date ();
	    if (items.crawler == "off")
	    {
		allowed = false;
		if (items.crawlerOnUntil)
		{
		    var till = new Date (items.crawlerOnUntil);
		    allowed = now.getTime () < till.getTime ();
		    console.log ("On till", till, allowed);
		}

/*		if (!allowed && items.crawlerSchedule != "off")
		{
		    var hour = ""+now.getHours ();
		    if (hour.length < 2) hour = "0"+hour;
		    allowed = items["crawlerHour"+hour] == "on";
		    console.log ("Sched on hour", hour, allowed);
		}
*/
	    }
	    else
	    {
		allowed = true;
		if (items.crawlerOffUntil)
		{
		    var till = new Date (items.crawlerOffUntil);
		    allowed = now.getTime () > till.getTime ();
		    console.log ("Off till", till, allowed);
		}

		if (allowed)
		{
		    function hourChecked (h)
		    {
			return items["crawlerHour"+zpad (h)] == "on";
		    }

		    var curHourChecked = hourChecked (now.getHours ());
		    var anyHourChecked = false;
		    for (var h = 0; h < 24; h++)
			anyHourChecked |= hourChecked (h);

		    if (anyHourChecked)
		    {
			if (items.crawlerSchedule == "off" && curHourChecked)
			    allowed = false;

			if (items.crawlerSchedule != "off" && !curHourChecked)
			    allowed = false;
		    }

		    console.log ("Sched on hour", items.crawlerSchedule, allowed);
		}
	    }

	    callback (allowed);
	});	
    }
    
    // public
    function matchRxs (str, rxs)
    {
	for (var i = 0; i < rxs.length; i++)
	{
//	    console.log (str, rxs[i], str.match(rxs[i]));
	    if (str.match(rxs[i]) != null)
		return true;
	}

	return false;
    }

    // public
    function setEventListeners (handlers)
    {
	chrome.runtime.onMessage.addListener (function (msg, sender, reply) {
	    if (!msg.type)
		return;

	    function safeReply (data)
	    {
		try
		{
		    reply (data);
		    return true;
		} catch (e) {
		    return false;
		}
	    }

	    var handler = handlers[msg.type];
	    if (handler)
		return handler (msg, sender, safeReply);
	});
    }

    // public
    function Promise (fn)
    {
	return new RSVP.Promise (fn);
    }

    // public
    function wait (ms)
    {
	return Promise (function (fulfill) {
	    later (ms, fulfill);
	})
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

    // public
    function waitCond (cond)
    {
	return Promise (function (fulfill) {
	    function test ()
	    {
		if (cond ())
		    fulfill ();
		else
		    later (1000, test);
	    }
	    
	    // start it
	    test ();
	})
    }

    // public
    function waitDomLoaded (s)
    {
	return Promise (function (fulfill) {
	    function findDom (selectors) 
	    {
		var $dom = [];
		if (!Array.isArray (selectors))
		    selectors = [selectors];

		for (var i = 0; !$dom.length && i < selectors.length; i++)
		    $dom = $(selectors[i]);

		if (!$dom.length)
		{
		    // retry
		    later (1000, function () {
			findDom (selectors);
		    })
		}
		else
		{
		    function done ()
		    {
			fulfill ($dom[0]);
		    }

		    if ($dom.attr ('src'))
		    {
			// maybe wait until loaded?
			if (imageLoaded ($dom[0]))
			    done ();
			else
			    $dom.on ('load', done);
			// FIXME what if it doesn't load? 
			// reject should be called in that case
		    }
		    else
		    {
			done ();
		    }
		}
	    }

	    findDom (s);
	})
    }

    // public
    function click (objects, type)
    {
	if (!Array.isArray (objects))
	    objects = [objects];

	objects.forEach (function (o) {
	    console.log ("clicking", $(o));

	    // emulation of event
	    var event = new MouseEvent (type ? type : 'click', {
		'view': window,
		'bubbles': true,
		'cancelable': true
	    });

	    // dispatch
	    $(o).each (function (i, e) {
		e.dispatchEvent (event);
	    });
	})
    }

    // public
    function AsyncIterate (iterator, processor)
    {
	var last = null;
	return Promise (function (fulfill) {
	    function next ()
	    {
		// request next item as a promise
		var item = iterator.next ();
		if (!item)
		{
		    // empty iterator
		    fulfill ();
		    return;
		}

		// append to last promise
		if (last)
		    // NOTE: you cannot 'then' a promise, 
		    // only a func that returns a promise
		    last = last.then (function () { return item; });
		else
		    last = item;

		// when item is ready
		var ready = last.then (function (found) {
		    if (found)
		    {
			last = ready
			// process item			
			    .then (function (data) {
				// processor returns a promise
				return processor (iterator.value ());
			    })
			// get next item
			    .then (next);
		    }
		    else
		    {
			console.log ("done");
			fulfill ();
		    }
		})
	    }

	    // start it
	    next ();
	})
    }

    // public
    function AsyncLoop ()
    {
	var last = null;
	return {

	    next: function (promiseCreator)
	    {
		if (last)
		    last = last.then (promiseCreator);
		else
		    last = Promise (function (fulfill) {
			fulfill (promiseCreator ());
		    })
	    },

	    promise: function ()
	    {
		if (!last)
		    return Promise (function (fulfill) {
			fulfill ();
		    })
		else
		    return last;
	    }
	}
    }

    function Now (o)
    {
	return Promise (function (fulfill) {
	    if (sobnik.isFunction (o))
		fulfill (o ());
	    else
		fulfill (o);
	})
    }

    sobnik.cmn = {
	zpad: zpad,
	later: later,
	wait: wait,
	repeat: repeat,
	rdelay: rdelay,
	matchRxs: matchRxs,
	waitDomLoaded: waitDomLoaded,
	waitCond: waitCond,
	click: click,
	setEventListeners: setEventListeners,
	getCrawlerAllowed: getCrawlerAllowed,

	Promise: Promise,
	AsyncLoop: AsyncLoop,
	AsyncIterate: AsyncIterate,
	Now: Now,
    }

}) ();
