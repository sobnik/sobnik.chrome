/*  
    avito.js - sobnik.chrome module to work with Avito.ru

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

(function () {

    console.log ("avito");

    // needs to stay in closure to be used by 'conv' methods below
    var sob = sobnikApi ();

    var board = {
	name: "avito.ru",

	urls: [
	    "http://www.avito.ru/[^/]+/kvartiry/.*_[\\d]+$"
	],

	trigger: "span.description__phone-insert.j-phone-show__insert img.description__phone-img",

	clicks: ["span.j-phone-show__insert span.btn__text"],

	capture: {
	    phoneImage: {
		selector: "span.description__phone-insert.j-phone-show__insert img.description__phone-img",
		attr: "src"
	    }
	},

	list: {
	    rowSelector: "div.b-catalog div.item", 
	    hrefSelector: "a", 
	    pattern: ".*kvartiry.*",

	    urls: [
		"http://www.avito.ru/[^/]+/kvartiry/sdam/na_dlitelnyy_srok"
	    ],

	    mark: function (row, ad) {
		var html = "<span style='display:block;"
		    +"float:left; margin:4px 0 0 0; padding: 0'>"
		    +sob.marker (ad)+"</span>";
		$(row).find ("h3").prepend (html);
		return $(row).find("h3 span")[0];
	    },
	},

	page: {
	    marks: [
		{
		    selector: "div.item h1",
		    mark: function (parent, ad) {
			var html = "<span style='display:block;"
			    +"float:left; margin:12px 0 0 0; padding: 0'>"
			    +sob.marker (ad)+"</span>";
			$(parent).prepend (html);
			return $(parent).find("span")[0];
		    },
		},
		{
		    selector: "#seller",
		    mark: function (parent, ad) {
			var html = "<span style='display:block;"
			    +"float:left; margin:4px 0 0 0; padding: 0'>"
			    +sob.marker (ad)+"</span>";
			$(parent).prepend (html);
			return $(parent).find("span")[0];
		    },
		},
	    ],
	},

	fields: {
	    name: {
		selector: "#seller strong",
		data: {
		    name: {},
		},
	    },

	    photo: {
		selector: "td.gallery-wrapper div.gallery-item a",
		attr: "href",
		data: {
		    photo: {},
		}
	    },

	    photoBig: {
		selector: "td.big-picture div.picture-aligner img",
		attr: "src",
		data: {
		    photo: {},
		}
	    },

	    city: {
		selector: "#map",
		data: {
		    city: {}
		}
	    },

	    street: {
		selector: "#toggle_map",
		data: {
		    street: {
			rx: "[^,]+,\\s+(.+)",
			rxi: 1
		    }
		}
	    },

	    area: {
		selector: "div.description-expanded div.item-params div:eq(1)",
		data: {
		    area: {
			rx: "\\d*[-]*\\s*\\S+\\s+(\\d+)",
			rxi: 1
		    },
		    rooms: {
			rx: "(\\d+)\\D+",
			rxi: 1
		    },
		    floor: {
			rx: "на\\s+(\\d+)\\s+этаже",
			rxi: 1
		    },
		    floors: {
			rx: "\\s+(\\d+)-этажного",
			rxi: 1
		    }
		}
	    },

	    price: {
		selector: "div.description_price span.p_i_price",
		data: {
		    price: {
			rx: "(.*\\S+)\\s+руб.",
			rxi: 1,
			conv: function (s) {
			    return s.replace(/\s+/ig, "");
			}
		    }
		}
	    },

	    notes: {
		selector: "#desc_text",
		data: {
		    notes: {},
		},
	    },

	    author_agent: {
		selector: "div.description_term span.t-seller-title:contains('Агентство')",
		data: {
		    author: {
			conv: function () { return "agent"; }
		    }
		}
	    },

	    author_owner: {
		selector: "div.description_term span.t-seller-title:contains('Арендодатель')",
		data: {
		    author: {
			conv: function () { return "owner"; }
		    }
		}
	    },

	    lat: {
		selector: "#i_contact div.b-catalog-map",
		attr: "data-map-lat",
		data: {
		    lat: {}
		}
	    },

	    lon: {
		selector: "#i_contact div.b-catalog-map",
		attr: "data-map-lon",
		data: {
		    lon: {}
		}
	    },

	    date: {
		selector: "div.g_92 div.item-subtitle",
		data: {
		    created: {
			rx: "Размещено\\s+((\\S+.*)\\sв\\s(\\d\\d:\\d\\d))",
			rxi: 1,
			conv: function (s) {
			    var today = new Date ();
			    var yesterday = new Date (today);
			    yesterday.setDate (today.getDate () - 1);
			    return sob.dateFmt (s
						.replace ("сегодня", sob.dts (today))
						.replace ("вчера", sob.dts (yesterday))
						.replace (" янв.", ".01.2014")
						.replace (" фев.", ".02.2014")
						.replace (" мар.", ".03.2014")
						.replace (" апр.", ".04.2014")
						.replace (" мая", ".05.2014")
						.replace (" июня", ".06.2014")
						.replace (" июля", ".07.2014")
						.replace (" авг.", ".08.2014")
						.replace (" сен.", ".09.2014")
						.replace (" окт.", ".10.2014")
						.replace (" ноя.", ".11.2014")
						.replace (" дек.", ".12.2014")
						.replace (" в ", " ")
					       );
			}
		    }
		}
	    }
	}
    };

    sob.start (board);

    console.log ("started");

} ());
