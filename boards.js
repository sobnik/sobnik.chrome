/*  
    boards.js - sobnik.chrome module

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

    console.log ("Loading boards");

    var sobnik = window.sobnik;
    console.assert (sobnik, "Sobnik required");
    var cmn = sobnik.require ("cmn");

    // public
    function dts (date)
    {
	return cmn.zpad (date.getDate ()) + "."
	    + cmn.zpad (date.getMonth () + 1) + "."
	    + cmn.zpad (date.getYear () + 1900);
    }

    // public
    function dateFmt (date)
    {
	console.log ("Date '"+date+"'");
	if (date.length == 15)
	    date += "0";
	var h = date.slice (11, 11+2);
	var m = date.slice (14, 14+2);
	return date.slice (6, 6+4) + "-" 
	    + date.slice (3, 3+2) + "-"
	    + date.slice (0, 2) + " "
	    + (h ? h : "??") + ":"
	    + (m ? m : "??");
    }

    // public
    function marker (a) 
    {
	var color = "#1e2"; // owner
	var title = "Собственник";
	if (a.Author == 3)
	{
	    color = "yellow";
	    title = "Проверьте фото";
	}
	else if (a.Author != 0)
	{
	    color = "red";
	    title = "Посредник";
	}

	return "<div title='"+title+"' style='display:block; "
	    + "margin-right: 2px;"
	    + "height: 12px; width: 12px; line-height: 12px; "
	    + "-moz-border-radius: 50%; border-radius: 50%;"
	    + "background-color: "+color+";'/>";
    }

    window.sobnik.boards = {
	dts: dts,
	dateFmt: dateFmt,
	marker: marker,
    };
    
}) ();
