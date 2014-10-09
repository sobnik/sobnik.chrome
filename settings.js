$(function () {

chrome.storage.local.get ("crawler", function (items) {
    $("#crawlerOn").val (items.crawler);
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
