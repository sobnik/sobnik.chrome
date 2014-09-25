;(function () {

    var cookieName = "subscribeOffer";

    function thanks () {
	$("#offer").hide ();
	$("#thanks").show ();	
    }

    function done () {
	$.cookie (cookieName, "done="+Date.now (), {expires: 30, path: '/'});
    }

    function later () {
	$.cookie (cookieName, "later="+Date.now (), {expires: 1});
    }

    function never () {
	$.cookie (cookieName, "never", {expires: 300, path: '/'});
    }

    $(function () {

	$(".done").on ("click", function () {
	    done ();
	    thanks ();
	});

	$("#later").on ("click", function () {
	    later ();
	    thanks ();
	});

	$("#never").on ("click", function () {
	    never ();
	    thanks ();
	});

	$("#current").html ($.cookie (cookieName));

    });

}) ();
