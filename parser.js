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

        return "";
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
        var tmpscope = {};
        var values = {};
        var features = {};
        for (var name in fields)
        {
            var field = fields[name];
            var element = $(field.selector);
            console.log (name);
            console.log (element.text ());
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

            if (!values[name].length)
                values[name] = [""];

            if (!field.data)
                continue;

            for (var f in field.data)
            {
                var feature = field.data[f];
                for (var i = 0; i < values[name].length; i++)
                {
                    var v = rx (values[name][i], feature.rx, feature.rxi);
                    if (feature.conv)
                        v = feature.conv.call (tmpscope, v);

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

    function gatherCapture (ad, callback)
    {

        function captureElement (field, data, e)
        {
            function setField (name, value)
            {
                if (!ad.Fields[name])
                    ad.Fields[name] = [];
                ad.Fields[name] = ad.Fields[name].concat (""+value);
            }

            // FIXME move this promise to capture module implementation
            // capture.start should return a promise itself
            return cmn.Promise (function (fulfill) {
                var what = {};
                what[field] = $(e).attr (data.attr || "src");

                capture.start (what, function (captured) {

                    captured = captured[field];
                    if (!data.dropImage)
                        setField (field, captured);

                    var image = pimg.dataToImage (captured);

                    if (!data.dropSize)
                    {
                        setField (field+"SizeWidth", image.width);
                        setField (field+"SizeHeight", image.height);
                    }

                    if (data.detectText)
                    {
                        var height = pimg.textHeight (
                            board, image);
                        setField (field+"TextHeight", height);
                    }

                    fulfill ();
                })
            })
        }

        function iterate (field, data)
        {
            function cap (el)
            {
                if (data.detectText)
                {
                    // release some CPU by waiting
                    return cmn.wait (1000).then (function () {
                        return captureElement (field, data, el);
                    });
                }
                else
                {
                    return captureElement (field, data, el);
                }
            }

            if (data.selector)
            {
                var loop = cmn.AsyncLoop ();
                $(data.selector).each (function (i, e) {
                    loop.next (function () {
                        return cap (e);
                    });
                });
                return loop.promise ();
            }
            else
            {
                return data.iterator.start ().then (function () {
                    return cmn.AsyncIterate (data.iterator, function (image) {
                        return cap (image);
                    });
                });
            }
        }

        var loop = cmn.AsyncLoop ();
        for (var field in board.capture)
        {
            // let each of elements stay in their closures
            var f = field;
            var data = board.capture[f];

            if (data.dynamic)
                data = data.dynamic ();

            loop.next (function () {
                return iterate (f, data);
            })
        }

        return loop.promise ();
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

        function post ()
        {
            console.log (ad);
            server.ads (ad, done);
        }

        if (board.capture)
        {
            gatherCapture (ad)
                .then (post);
        }
        else
        {
            post ();
        }

    }

    function parse ()
    {
        if (board.clicks)
            cmn.click (board.clicks);

        console.log ("trigger "+board.trigger);
        cmn.waitDomLoaded (board.trigger)
            .then (cmn.wait (3000)) // FIXME why?
            .then (gather);

        if (board.untrigger)
        {
            console.log ("untrigger "+board.untrigger);
            cmn.waitDomLoaded (board.untrigger)
                .then (done);
        }
    }

    // public
    function startParse ()
    {
        function start ()
        {
            var loc = location.href;
            // if current page matches pattern - start parser
            for (var i = 0; i < board.urls.length; i++)
            {
//              console.log ("Match "+loc+" against "+board.urls[i]);
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
        }

        cmn.wait (cmn.rdelay (2, 8))
            .then (start);
    }

    sobnik.parser = {
        start: startParse,
    }

}) ();
