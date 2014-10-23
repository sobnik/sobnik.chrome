/*  
    parser.js - sobnik.chrome module

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

    console.log ("Loading parser");

    var sobnik = window.sobnik;
    console.assert (sobnik, "Sobnik required");

    var cmn = sobnik.require ("cmn");
    var capture = sobnik.require ("capture.tab");
    var server = sobnik.require ("server.tab");
    var pimg = sobnik.require ("pimg");
    var board = sobnik.require ("boards/current");

    function rx (text, pattern, index)
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

    function all (elements, extractor)
    {
	var values = [];

	elements.each (function (e) {
	    values = values.concat (extractor (this));
	});

	return values;
    }

    function gatherFields (fields) 
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
		    function (e) { 
			return rx ($(e).text (), field.rx, field.rxi); 
		    }
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

    function done ()
    {
	chrome.runtime.sendMessage (
	    /* ext_id= */"", 
	    {type: "parserDone"}
	);
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

    function gather () 
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
	    server.ads (data, function () {
		done ();
	    });
	};

	function setField (name, value)
	{
	    if (!ad.Fields[name])
		ad.Fields[name] = [];
	    ad.Fields[name] = ad.Fields[name].concat (""+value);
	}

	function callCapture (what, callback) 
	{
	    capture.start (what, function (captured) {
//		console.log (captured);
		for (var item in captured)
		{
		    // FIXME work out this special case
		    if (item == 'phoneImage')
		    {
			setField (item, captured[item]);
		    }
		    else
		    {
			var height = pimg.textHeight (
			    board, captured[item]);
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
			callCapture (what, captureNext);
		    }

		    if (item.click)
		    {
			console.log ("clicking", item.click);
			$(item.click).trigger ('click');
			function waitImage ()
			{
			    // wait for image to appear on page
			    cmn.later (1000, function () {
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
    }

    function findTrigger (selectors, callback) 
    {
	var $trigger = [];
	if (Array.isArray (selectors))
	{
	    for (var i = 0; $trigger.length == 0 && i < selectors.length; i++)
		$trigger = $(selectors[i]);
	}
	else
	{
	    $trigger = $(selectors);
	}

	if ($trigger.length == 0)
	{
	    cmn.later (1000, function () {
		findTrigger (selectors, callback);
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
		cmn.later (3000, callback);
	    }
	}
    }

    function parse () 
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
	findTrigger (board.trigger, function () { gather (); });

	if (board.untrigger)
	{
	    console.log ("untrigger "+board.untrigger);
	    findTrigger (board.untrigger, function () { 
		console.log ("cancelled");
		done (); 
	    });
	}
    }

    // public
    function startParse ()
    {
	cmn.later (cmn.rdelay (2, 8), function () {
	    var loc = location.href;
	    // if current page matches pattern - start parser
	    for (var i = 0; i < board.urls.length; i++)
	    {
//		console.log ("Match "+loc+" against "+board.urls[i]);
		if (loc.match(board.urls[i]) != null)
		{
		    console.log ("Parsing "+loc);
		    parse ();
		    return;
		}
	    }

	    // nothing matched
	    console.log ("Not parsing");
	    done ();
	})
    }

    sobnik.parser = {
	start: startParse,
    }

}) ();
