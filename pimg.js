/*  
    pimg.js - sobnik.chrome module

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

    console.log ("Loading pimg");

    var sobnik = window.sobnik;
    console.assert (sobnik, "Sobnik required");
    
    // public
    function dataToImage (data)
    {
	// no matter what image format we choose, browser gets it right
	// but don't remove /jpeg - it won't work!
	var dataUrl = "data:image/jpeg;base64,"+data;
	var img = document.createElement ('img');
	$(img).attr ("src", dataUrl);
	return img;
    }

    // public
    function textHeight (board, img) 
    {

	var canvas = document.createElement ('canvas');
	canvas.width = img.width;
	canvas.height = img.height;
	console.log ("w "+img.width+" h "+img.height);

	var context = canvas.getContext ('2d');
	context.drawImage (img, 0, 0);

	// rgba
	var imageData = context.getImageData (0, 0, img.width, img.height);
	var pixels = imageData.data;	

	// 1 channel
	var blacks = new Uint8ClampedArray (pixels.length / 4);
	
	function offset (x, y)
	{
	    return (y * img.width + x) * 4;
	}

	function setBlack (x, y)
	{
	    blacks[y * img.width + x] = 1;
	}

	// text detection filters
	var sharpDistance = 2 // px
	var sharpThreshold = 50 // 8-bit depth
	var minTextWeight = 40 // px

	for (var y = 0; y < img.height; y++)
	{
	    for (var x = sharpDistance; x < img.width; x++)
	    {
		var oc = offset (x, y);
		var od = offset (x-sharpDistance, y);
		var sharp = false;
		// for each rgb channel
		for (var i = 0; !sharp && i < 3; i++)
		{
		    var c = pixels[oc + i];
		    var d = pixels[od + i];
		    var diff = Math.abs (c - d);
//		    if (y == 465)
//			console.log ("y "+y+" x "+x+" c "+c+" d "+d+" diff "+diff);
		    sharp = diff > sharpThreshold;
		}
		if (!sharp)
		    setBlack (x, y);
	    }
	}


	// cut watermark
	if (board.watermark)
	{
	    var tl = board.watermark.top_left;
	    var br = board.watermark.bottom_right;

	    var x1 = ("left" in tl) ? tl.left : img.width - tl.right;
	    var y1 = ("top" in tl) ? tl.top : img.height - tl.bottom;
	    var x2 = ("left" in br) ? br.left : img.width - br.right;
	    var y2 = ("top" in br) ? br.top : img.height - br.bottom;

	    for (var y = y1; y <= y2; y++)
		for (var x = x1; x <= x2; x++)
		    setBlack(x, y);
	}

	var weights = [];
	for (var y = 0; y < img.height; y++)
	{
	    var weight = 0;
	    for (var x = 0; x < img.width; x++)
	    {
		function black (x, y)
		{
		    return blacks[y * img.width + x] != 0;
		}

		if (black (x, y))
		    continue;

		var noiseX = true;
		if (x > 0 && !black (x-1, y))
		    noiseX = false;

		if (x < (img.width - 1) && !black (x+1, y))
		    noiseX = false

		var noiseY = true
		if (y > 0 && !black (x, y-1))
		    noiseY = false

		if (y < (img.height - 1) && !black (x, y+1))
		    noiseY = false

		if (noiseX || noiseY)
		    setBlack (x, y);
		else
		    weight++		
	    }
	    weights.push (weight);
	}
 
	function median ()
	{
	    if (weights.length == 0)
		return 0
	    
	    weights.sort (function (a, b) { return a < b; });
	    return weights[Math.floor (weights.length / 2)];
	}

	var noise = median ();
	console.log ("Noise "+noise);
	var height = 0;
	weights.forEach (function (w) {
	    var text = w > (noise + minTextWeight);
	    if (text)
		height++;
	});

	console.log ("Photo text height: "+height);

	if (sobnik.debugPimg)
	{
	    for (var i = 0; i < blacks.length; i++)
	    {
		if (!blacks[i])
		    continue;
		
		pixels[i*4] = 0;
		pixels[i*4+1] = 0;
		pixels[i*4+2] = 0;
	    }
	    context.putImageData (imageData, 0, 0);
	    
            $(img).attr("src", canvas.toDataURL ("image/png"));
	    $("body").append (img);

	    var div = document.createElement ("div");
	    $(div).html (height);
	    $("body").append (div);
	}

	return height;
    }

    window.sobnik.pimg = {
	dataToImage: dataToImage,
	textHeight: textHeight,
    }

}) ();

