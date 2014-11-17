/*  
    init.js - sobnik.chrome module

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

    console.log ("Initializing sobnik");
    console.assert (!("sobnik" in window), "Sobnik already initialized");

    RSVP.on ('error', function (reason) {
	console.assert (false, reason);
    })

    // http://stackoverflow.com/questions/5999998/how-can-i-check-if-a-javascript-variable-is-function-type
    // damn black magic
    // public
    function isFunction (f) 
    {
	var getType = {};
	return f && getType.toString.call(f) === '[object Function]';
    }

    // public
    function require (module)
    {
	var path = module.split ("/");

	var child = null;
	var parent = window.sobnik;
	path.forEach (function (name) {
	    var parts = name.split (".");
	    child = parent[parts[0]];
	    console.assert (child, "Required", parts[0]);
	    if (parts.length > 1)
	    {
		// init if not yet
		if (isFunction (child[parts[1]]))
		    child[parts[1]] ();

		child = child[parts[1]];
	    }
	    parent = child;
	});

//	console.log (window.sobnik);
	return child;
    }

    window.sobnik = {
	require: require,
	isFunction: isFunction,
//	debug: true, 
	debugStartCrawler: true,
	debugStopMarker: true, 
//	debugPimg: true, 
    }

}) ();
