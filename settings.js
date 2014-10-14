$(function () {

function later (ms, callback)
{
    var to = setTimeout (function () {
	clearTimeout (to);
	callback ();
    }, ms);
    return to;
}

function repeat (callback, ms)
{
    callback ();
    if (!ms)
	ms = 1000;
    later (ms, function () { repeat (callback, ms); });
}

// updaters
repeat (function () {
    chrome.storage.local.get ("crawlerOffUntil", function (items) {
	if (!items.crawlerOffUntil)
	{
	    $("crawlerOffUntil").hide ();
	    return;
	}

	var now = new Date ();
	var till = new Date (items.crawlerOffUntil);
	if (now.getTime () < till.getTime ())
	{
	    $("#crawlerOffUntilTime").html (till.toLocaleString ());
	    $("#crawlerOffUntil").show ();
	}
	else
	{
	    $("#crawlerOffUntil").hide ();
	}
    });
});

repeat (function () {
    chrome.storage.local.get ("crawler", function (items) {
	$("#crawlerOn").val (items.crawler);
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

// event-handlers

$("#crawlerOnNow").on ('click', function () {
    crawlerOffTimed (0);
});

$("#crawlerOff30m").on ('click', function () {
    crawlerOffTimed (30);
});

$("#crawlerOff1h").on ('click', function () {
    crawlerOffTimed (60);
});

$("#crawlerOff3h").on ('click', function () {
    crawlerOffTimed (180);
});

$("#crawlerOn").on ("change", function () {
    var value = $("#crawlerOn").val ();
    console.log ("Crawler: "+value);

    chrome.storage.local.set ({"crawler": value});

    if (value == "off")
	chrome.runtime.sendMessage (
	    /* ext_id= */"", 
	    {type: "crawlerOff"}
	);
});

})
