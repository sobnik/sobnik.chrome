$(function () {

    var sobnik = window.sobnik;
    console.assert (sobnik, "Sobnik required");

    var cmn = sobnik.require ("cmn");

    // updaters
    cmn.repeat (function () {
	chrome.storage.local.get (["crawler", "crawlerOffUntil"], function (items) {
	    if (!items.crawlerOffUntil || items.crawler == "off")
	    {
		$("crawlerOffUntil").hide ();
		return;
	    }

	    var now = new Date ();
	    var till = new Date (items.crawlerOffUntil);
	    if (now.getTime () < till.getTime ())
	    {
		var diff = (till.getTime () - now.getTime ()) / (60*1000);
		$("#crawlerOffUntilTime").html (
		    "на "+Number (diff).toFixed(0)+" минут, "
			+"до "+till.toLocaleString ());
		$("#crawlerOffUntil").show ();
	    }
	    else
	    {
		$("#crawlerOffUntil").hide ();
	    }
	});
    });

    cmn.repeat (function () {
	chrome.storage.local.get (["crawler", "crawlerOnUntil"], function (items) {
	    if (!items.crawlerOnUntil || items.crawler != "off")
	    {
		$("crawlerOnUntil").hide ();
		return;
	    }

	    var now = new Date ();
	    var till = new Date (items.crawlerOnUntil);
	    if (now.getTime () < till.getTime ())
	    {
		var diff = (till.getTime () - now.getTime ()) / (60*1000);
		$("#crawlerOnUntilTime").html (
		    "на "+Number (diff).toFixed(0)+" минут, "
			+"до "+till.toLocaleString ());
		$("#crawlerOnUntil").show ();
	    }
	    else
	    {
		$("#crawlerOnUntil").hide ();
	    }
	});
    });

    cmn.repeat (function () {
	chrome.storage.local.get ("crawler", function (items) {
	    var on = items.crawler;
	    $("#crawlerOn").val ((on == "off") ? "off" : "on");
	    if (on == "on")
	    {
		$("#crawlerOffTmp").show ();
		$("#crawlerOnTmp").hide ();
		$("#crawlerOnUntil").hide ();
		$("#crawlerScheduleTable").show ();
	    }
	    else
	    {
		$("#crawlerOffTmp").hide ();
		$("#crawlerOffUntil").hide ();
		$("#crawlerOnTmp").show ();
		$("#crawlerScheduleTable").hide ();
	    }
	});
    });

    cmn.repeat (function () {
	chrome.storage.local.get ("crawlerIncognito", function (items) {
	    var on = items.crawlerIncognito;
	    $("#crawlIncognito").prop ("checked", (on == "on") ? true : false);
	    if (on == "on")
		chrome.extension.isAllowedIncognitoAccess (function (allowed) {
		    if (!allowed)
			$("#crawlIncognitoWarning").show ();
		    else
			$("#crawlIncognitoWarning").hide ();
		});
	    else
		$("#crawlIncognitoWarning").hide ();
	});
    });

    cmn.repeat (function () {
	chrome.storage.local.get ("crawlerSchedule", function (items) {
	    var on = items.crawlerSchedule;
	    $("#crawlerSchedule").val ((on == "off") ? "off" : "on");
	});
    });

    cmn.repeat (function () {
	$("#crawlerHours input[type=checkbox]").each (function (i, e) {
	    chrome.storage.local.get (e.id, function (items) {
		var on = items[e.id];
		$(e).prop ("checked", (on == "on") ? true : false);
	    });
	});
    });

    // helpers
    function crawlerTimed (off, minutes)
    {
	var now = (new Date ()).getTime ();
	var till = now + minutes * 60 * 1000; // ms
	var tillDate = new Date ();
	tillDate.setTime (till);
	console.log (off, tillDate.toString ());
	var data = {};
	data["crawler"+(off ? "Off" : "On")+"Until"] = tillDate.toString ()
	chrome.storage.local.set (data);
    }

    function crawlerOffTimed (minutes)
    {
	crawlerTimed (/* off= */true, minutes);
    }

    function crawlerOnTimed (minutes)
    {
	crawlerTimed (/* off= */false, minutes);
    }

    function off ()
    {
	chrome.runtime.sendMessage (
	    /* ext_id= */"", 
	    {type: "crawlerOff"}
	);
    }

    // event-handlers

    $("#crawlerOffNow").on ('click', function () {
	crawlerOnTimed (0);
	off ();
    });

    $("#crawlerOff30m").on ('click', function () {
	crawlerOffTimed (30);
	off ();
    });

    $("#crawlerOff1h").on ('click', function () {
	crawlerOffTimed (60);
	off ();
    });

    $("#crawlerOff3h").on ('click', function () {
	crawlerOffTimed (180);
	off ();
    });


    $("#crawlerOnNow").on ('click', function () {
	crawlerOffTimed (0);
    });

    $("#crawlerOn30m").on ('click', function () {
	crawlerOnTimed (30);
    });

    $("#crawlerOn1h").on ('click', function () {
	crawlerOnTimed (60);
    });

    $("#crawlerOn3h").on ('click', function () {
	crawlerOnTimed (180);
    });

    $("#crawlerOn").on ("change", function () {
	var value = $("#crawlerOn").val ();
	console.log ("Crawler: "+value);

	var data = {
	    "crawler": value,
	    "crawlerOffUntil": "",
	    "crawlerOnUntil": "",
	}
	chrome.storage.local.set (data);
	if (value == "off")
	    off ();
    });

    $("#crawlIncognito").on ("change", function () {
	var value = $("#crawlIncognito").prop ('checked');
	console.log ("Incognito: "+value);
	chrome.storage.local.set ({"crawlerIncognito": value ? "on" : "off" });
    });

    $("#crawlerSchedule").on ("change", function () {
	var value = $("#crawlerSchedule").val ();
	console.log ("crawlerSchedule: "+value);
	chrome.storage.local.set ({"crawlerSchedule": value});
    });

    $("#crawlerHours input[type=checkbox]").on ("change", function (e) {
	var input = e.target;
	var on = $(input).prop ("checked") ? "on" : "off";
	var data = {};
	data[input.id] = on;
	console.log (data);
	chrome.storage.local.set (data);
    });

})
