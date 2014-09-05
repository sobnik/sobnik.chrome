
function sobnikApi ()
{

    var api_url = "http://localhost:8081/api/";

    var call = function (method, type, data, callback, statbacks, errback)
    {
	$.ajax ({
	    url: api_url + method,
	    type: type,
	    data: JSON.stringify (data),
	    success: callback,
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

    var extractPhones = function (s)
    {
	// 1. replace words by numbers
	s = s
	    .replace (/один/ig, "1")
	    .replace (/два/ig, "2")
	    .replace (/три/ig, "3")
	    .replace (/четыре/ig, "4")
	    .replace (/пять/ig, "5")
	    .replace (/шесть/ig, "6")
	    .replace (/семь/ig, "7")
	    .replace (/восемь/ig, "8")
	    .replace (/девять/ig, "9")
	    .replace (/ноль/ig, "0");
	console.log (s);

	// 2. cut all the special symbols
	s = s.replace (/[\/\<\>\?\;\:\'\"\[\]\{\}\|\~\`\!\@\#\$\%\^\&\*\(\)\-\_\=\+]/g, "");
	console.log (s);
	
	// 3. split by non-digits and spaces
	s = s.split (/[^\d ]/);
	console.log (s);

	// FIXME sometimes phones are split with spaces and get 
	// concatenated here
	// 4. remove anything but numbers
	var numbers = [];
	for (var i = 0; i < s.length; i++)
	{
	    var n = s[i].replace (/\D/g, "");
	    if (n.length < 6)
		continue;

	    if (n.length == 11 && n.charAt (0) == "8")
		n = "+7" + n.slice (1);

	    if (n.length == 11 && n.charAt (0) == "7")
		n = "+7" + n.slice (1);

	    numbers.push (n);
	}

	return numbers;
    }
    
    var gatherFields = function (fields) 
    {
	var values = {};
	var features = {};
	for (var name in fields)
	{
	    var field = fields[name];
	    var element = $(field.selector);
	    //	console.log(name);
	    //	console.log(element.text());
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

    var gather = function (board) 
    {
	console.log ("gathering");

	var ad = {
	    Url: location.href,
	};

	ad.Fields = gatherFields (board.fields);

	var post = function (data) {
	    console.log (data);
	    // FIXME call api
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
	    var to = setTimeout (
		function () {
		    clearTimeout (to);
		    findTrigger (selector, callback);
		}, 
		1000
	    );
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

    var start = function (board) 
    {
	var to = setTimeout (function () {
	    clearTimeout (to);

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
	    console.log ("No match "+loc);
	}, (Math.random () * 10 + 1) * 1000);
    };

    var s = {
	call: call,
	dts: dts,
	dateFmt: dateFmt,
	gatherFields: gatherFields,
	extractPhones: extractPhones,
	start: start
    };

    return s;
}
