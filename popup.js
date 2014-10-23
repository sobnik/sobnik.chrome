;(function () {

    var sobnik = sobnikApi ();

    $(function () {

	$("#crawlerOn30m").on ("click", function () {
	    var now = (new Date ()).getTime ();
	    var till = now + 30 * 60 * 1000; // ms
	    var tillDate = new Date ();
	    tillDate.setTime (till);
	    chrome.storage.local.set ({
		crawlerOnUntil: tillDate.toString (),
	    });

	    $("#crawlerOn").hide ();
	    $("#crawlerOnThanks").show ();
	    
	});

	sobnik.getCrawlerAllowed (function (allowed) {
	    if (allowed)
		$("#crawlerOn").hide ();
	    else
		$("#crawlerOn").show ();
	});

    });

}) ();
