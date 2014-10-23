/*  
    bg.js - sobnik.chrome module

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

    console.log ("Loading bg");

    var sobnik = window.sobnik;
    console.assert (sobnik, "Sobnik required");

    var cmn = sobnik.require ("cmn");
    var server = sobnik.require ("server.bg");
    var capture = sobnik.require ("capture.bg");
    var crawler = sobnik.require ("crawler.bg");

    function showSettings ()
    {
	chrome.tabs.create ({
	    url: "settings.html"
	});	
    }

    function showHowto ()
    {
	chrome.tabs.create ({
	    url: "http://sobnik.com/kak-rabotaet-sobnik.html"
	});	
    }

    function ready (message, sender, reply)
    {
	if (sender.tab.incognito)
	    return;

	chrome.pageAction.show (sender.tab.id);
    }

    function start ()
    {
	cmn.setEventListeners ({
	    "showSettings": showSettings,
	    "ready": ready,
	});

	chrome.runtime.onInstalled.addListener (function (details) {
	    if (details.reason == "install")
		showHowto ();	    
	});

	server.start ();
	crawler.start ();
	capture.start ();
    }

    start ();

}) ();
