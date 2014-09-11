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
		console.log (r);

		if (r && r.length > 1)
		    result[item] = r[1];
	    }

	    console.log (result);
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

    chrome.runtime.onMessage.addListener (function (message, sender, reply) {
	if (!message.type)
	    return;

	var handlers = {
	    "capture": capture
	};

	var handler = handlers[message.type];
	if (handler)
	    return handler (sender, message, reply);
    });

} ());
