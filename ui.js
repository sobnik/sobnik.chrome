/*  
    ui.js - sobnik.chrome module

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

    console.log ("Loading ui");

    var sobnik = window.sobnik;
    console.assert (sobnik, "Sobnik required");

    var cmn = sobnik.require ("cmn");
    var server = sobnik.require ("server.tab");
    var marker = sobnik.require ("marker");
    var board = sobnik.require ("boards/current");

    // public 
    function start ()
    {
        var reasons = board.abuseReasons;

        $("#abuses span.abuse-link").on ('click', function () {
            var reasonId = $(this).attr ('data-id');
            var reason = reasons ? reasons[reasonId] : "";
            if (!reason)
                console.log ("Unknown reason", reasonId);
            else
                console.log ("Abuse", reasonId, reason);

            var id = board.url2id (location.href);
            console.assert (id, "Bad ad id "+location.href);

            // FIXME if reason agent ask why
            server.abuse (id, reason);
        });
    }

    window.sobnik.ui = {
        start: start,
    }

}) ();
