/*  
    irr.js - sobnik.chrome module to work with Irr.ru

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

    console.log ("Loading irr");

    var sobnik = window.sobnik;
    console.assert (sobnik, "Sobnik required");

    var cmn = sobnik.require ("cmn");
    var boards = sobnik.require ("boards");

    var irr = {

	name: "irr.ru",

	// FIXME add
	abuseReasons: {
	},

	urls: [
	    "http[s]?://irr.ru/real-estate/(rent|sale)/[^/]+advert[\\d]+",
	],

	trigger: "#contact_phones img",

	// FIXME add
	untrigger: [
	],
	
	// FIXME move this to capture stuff
	clicks: ["#show_contact_phones"],

	capture: {
	    phoneImage: {
		selector: "#contact_phones img",
		dropSize: true,
	    },

	    photoImage: {

		dynamic: function () {

		    var data = {
			dropImage: true,
			detectText: true,

			iterator: {},
		    }

		    var image = "div.nyroModalImage>img";
		    var queue = [];
		    data.iterator.next = function ()
		    {
			return cmn.Promise (function (fulfill) {
			    if (!queue.length)
			    {
				fulfill (false);
				return;
			    }

			    var item = queue.shift ();
			    cmn.waitCond (function () {
				var close = "a.nyroModalClose";
				if ($(close).length)
				    cmn.click (close);
				return $(close).length == 0;
			    }).then (function () {
				cmn.click (item);
				return cmn.waitDomLoaded (image);
			    }).then (function () {
				fulfill (true);
			    });

			    return;

			    // click the link
			    cmn.click (item);
			    cmn.waitCond (function () {

				// wait until image get's active
				
				var src = $(image).attr ('src');
				src = src.match (rx);
				src = src.length ? src[1] : null;
				return src == href;
			    }).then (function () {
				
				// wait until image is loaded
				return cmn.waitDomLoaded (image);
			    }).then (function () {
				
				// now we're done!
				fulfill (true);
			    });
			});
		    }

		    data.iterator.value = function ()
		    {
			return $(image)[0];
		    }

		    data.iterator.start = function () {

//			$("ul.slider_pagination li a").each (function (i, e) {
			$("div.slides a.nyroModal").each (function (i, e) {
			    queue.push (e);
			});

			return cmn.Now ();
		    }

		    console.log ("Capture settings", data);
		    return data;
		},
	    },
	},

	// FIXME it is flowing!
	watermark: {
	    top_left: {
		right: 192,
		bottom: 48,
	    },
	    bottom_right: {
		right: 10,
		bottom: 10,
	    },
	},

	list: {
	    // the row in the list
	    rowSelector: "div.adds_cont div.add_list div.add_title_wrap", 

	    // container for the link to an ad (relative to rowSelector)
	    hrefSelector: "a", 

	    // links matching this pattern will be marked in the list
	    pattern: "advert\\d+\\.html",

	    // matching urls will be treated as a list of ads 
	    urls: [
		"http[s]?://irr.ru/real-estate/(sale|rent)/search"
	    ],

	    mark: function (row, ad) {
		var html = "<span style='display:block;"
		    +"float:left; margin:4px 0 0 0; padding: 0'>"
		    +boards.marker (ad)+"</span>";
		$(row).prepend (html);
		return $(row).find ("span")[0];
	    },
	},

	page: {
	    marks: [
		{
		    selector: "h1.title3",
		    mark: function (parent, ad) {
			var html = "<span style='display:block;"
			    +"float:left; margin:12px 0 0 0; padding: 0'>"
			    +boards.marker (ad)+"</span>";
			$(parent).prepend (html);
			return $(parent).find("span")[0];
		    },
		},
		{
		    selector: "#contact_phones",
		    mark: function (parent, ad) {
			var html = "<span style='display:block;"
			    +"float:left; margin:4px 0 0 0; padding: 0'>"
			    +boards.marker (ad)+"</span>";
			$(parent).prepend (html);
			return $(parent).find("span")[0];
		    },
		},
	    ],
	},

	url2id: function (url) {
	    var id = url.match (/advert(\d+)\.html/);
//	    console.log ("Url "+url);
//	    console.log (id);
	    if (!id)
		return "";
	    return "irr:"+id[1];
	},

	fields: {
	    name: {
		selector: "ul.form_info li",
		data: {
		    name: {
			rx: "Контактное\\s+лицо:\\s+(.*)",
			rxi: 1,
		    },
		},
	    },

	    phone_name: {
		selector: "#contact_phones",
		data: {
		    name: {},
		},
	    },

	    seller: {
		selector: "ul.form_info li",
		data: {
		    name: {
			rx: "Продавец:\\s+(.*)\\s*—\\s*Все",
			rxi: 1,
		    },
		    user_ads: {
			rx: "Все\\s+объявления\\s+продавца\\s+(\\d+)",
			rxi: 1,
		    },
		},
	    },

	    photo: {
		selector: "div.slides div.slide a.nyroModal img",
		attr: "src",
		data: {
		    photo: {},
		}
	    },

	    address: {
		selector: "div.content_left div.clear a.address_link",
		data: {
		    city: {
			rx: "([^,]+),",
			rxi: 1,
		    },
		    street: {
			rx: "[^,]+,\\s+(.*)",
			rxi: 1,
		    },
		}
	    },

	    metro: {
		selector: "div.address_block span.metro",
		data: {
		    district: {}
		},
	    },

	    price: {
		selector: "table.title-wrap div.credit_cost",
		data: {
		    price: {
			rx: "[\\d.]+",
			conv: function (s) {
			    return s.replace (".", "");
			},
		    },
		    daily: {
			rx: "сутки",
			conv: function (s) {
			    return s ? "daily" : "";
			},
		    },
		},
	    },

	    type: {
		selector: "#zzzz",
		data: {
		    type: {
			conv: function () {
			    if (document.location.href.match ("/rent/"))
				return "sdam";
			    if (document.location.href.match ("/sale/"))
				return "prodam";
			    return "unknown";
			},
		    }
		},
	    },

	    rooms: {
		selector: "li.cf_block_rooms",
		data: {
		    rooms: {
			rx: "в квартире:\\s*(\\d+)",
			rxi: 1
		    },
		},
	    },

	    floor: {
		selector: "li.cf_block_etage",
		data: {
		    floor: {
			rx: "Этаж:\\s*(\\d+)",
			rxi: 1
		    },
		}
	    },

	    floors: {
		selector: "li.cf_block_etage-all",
		data: {
		    floors: {
			rx: "здании:\\s*(\\d+)",
			rxi: 1
		    },
		}
	    },

	    area: {
		selector: "li.cf_block_meters-all",
		data: {
		    area: {
			rx: "площадь:\\s*(\\d+)",
			rxi: 1
		    },
		}
	    },

	    notes: {
		selector: "div.content_left>p.text",
		data: {
		    notes: {},
		},
	    },

	    author_partner: {
		selector: "span.partner",
		data: {
		    author: {
			conv: function (s) {
			    // skip same selector
			    if (s.match ("просмотров"))
				return;
			    if (!s.match ("Частное"))
				return "agent"; 
			},
		    }
		}
	    },

	    author_fee: {
		selector: "li.cf_block_fee",
		data: {
		    author: {
			conv: function (s) { 
			    console.log ("Fee", s);
			    if (!s.match ("Без комиссии"))
				return "agent"; 
			}
		    }
		}
	    },

	    lat: {
		selector: "#geo_x", // funny how lat became x
		attr: "value",
		data: {
		    lat: {}
		}
	    },

	    lon: {
		selector: "#geo_y", // funny how lon became y
		attr: "value",
		data: {
		    lon: {}
		}
	    },

	    date: {
		selector: "div.grey_info span.data",
		data: {
		    created: {
			conv: function (s) {
			    return boards.dateFmt (
				s.replace (" января ", ".01.")
				    .replace (" февраля ", ".02.")
				    .replace (" марта ", ".03.")
				    .replace (" апреля ", ".04.")
				    .replace (" мая ", ".05.")
				    .replace (" июня ", ".06.")
				    .replace (" июля ", ".07.")
				    .replace (" августа ", ".08.")
				    .replace (" сентября ", ".09.")
				    .replace (" октября ", ".10.")
				    .replace (" ноября ", ".11.")
				    .replace (" декабря ", ".12.")
			    );
			}
		    }
		}
	    }
	}
    };

    window.sobnik.boards.avito = irr;
    window.sobnik.boards.current = irr;

}) ();
