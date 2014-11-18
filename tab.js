/*  
    tab.js - sobnik.chrome module

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

    console.log ("Loading tab");

    var sobnik = window.sobnik;
    console.assert (sobnik, "Sobnik required");

    var cmn = sobnik.require ("cmn");
    var marker = sobnik.require ("marker");
    var crawler = sobnik.require ("crawler.tab");
    var board = sobnik.require ("boards/current");
    var ui = sobnik.require ("ui");

    function start () 
    {
        var id = board.url2id (location.href);

        chrome.runtime.sendMessage (
            /* ext_id= */"", 
            {type: "ready", AdId: id}, 
            /* options= */{}, 
            function (reply) {
                console.log ("Bg confirms ready", reply);
                if (reply && reply.type == "startCrawler")
                {
                    crawler.start ();
                }
                else
                {
                    if (sobnik.debugStartCrawler)
                        crawler.start ();

                    if (!sobnik.debugStopMarker)
                        marker.start ();
                    ui.start ();
                }
            })
    }

    // start the tab
    start ();
    
}) ();
