/*  
    cian.js - sobnik.chrome module to work with cian.ru

    Copyright (c) 2014 Pavel Mozhchil <lifeair@gmail.com>
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

    console.log ("Loading cian");

    var sobnik = window.sobnik;
    console.assert (sobnik, "Sobnik required");

    var cmn = sobnik.require ("cmn");
    var boards = sobnik.require ("boards");

    var types = "flat|suburban|commercial";

    var cian = {
	name: "cian.ru",

	urls: [
	    "http[s]?://www.cian.ru/rent[^/]+/("+types+")/[\\d]+/$",
	    "http[s]?://www.cian.ru/sale[^/]+/("+types+")/[\\d]+/$",
	],

	trigger: "span.description__phone-insert.j-phone-show__insert img.description__phone-img",

	untrigger: [
	    "div.alert p:contains(\"заблокировано\")",
	    "div.alert p:contains(\"истёк\")",
	    "div.alert p:contains(\"отклонено\")",
	],

	// FIXME move this to capture stuff
	clicks: ["span.j-phone-show__insert span.btn__text"],

	capture: {
	    phoneImage: {
		selector: "span.description__phone-insert.j-phone-show__insert img.description__phone-img",
		attr: "src"
	    },
	    photoImage: {
		//click: "div.gallery-item a.gallery-link img",
		selector: "div.object_descr_images div.object_descr_images_w img.active",
		attr: "src"
	    }
	},

	watermark: {
	    top_left: {
		right: 105,
		bottom: 40
	    },
	    bottom_right: {
		right: 10,
		bottom: 15
	    }
	},

	list: {
	    // the row in the list
	    rowSelector: "table.cat tbody tr.cat[id|='tr_']", 

	    // container for the link to an ad (relative to rowSelector)
	    hrefSelector: "td[id$='comment'] div a[onclick|='_gaq.push']", 

	    // links matching this pattern will be marked in the list
	    pattern: ".*("+types+").*",

	    // matching urls will be treated as a list of ads 
	    urls: [
		"http[s]?://www.cian.ru/[^/]+/("+types+")"
	    ],

	    mark: function (row, ad) {
		var html = "<span style='display:block;"
		    +"float:left; margin:4px 0 0 0; padding: 0'>"
		    +boards.marker (ad)+"</span>";
		$(row).find ("h3").prepend (html);
		return $(row).find("h3 span")[0];
	    },
	},

	page: {
	    marks: [
		{
		    selector: "div.item-page-content h1.h1",
		    mark: function (parent, ad) {
			var html = "<span style='display:block;"
			    +"float:left; margin:12px 0 0 0; padding: 0'>"
			    +boards.marker (ad)+"</span>";
			$(parent).prepend (html);
			return $(parent).find("span")[0];
		    },
		},
		{
		    selector: "#seller",
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
	    var id = url.match (/[^\?]*(\d+)//$/);
//	    console.log ("Url "+url);
//	    console.log (id);
	    if (!id)
		return "";
	    return "cian:"+id[1];
	},

	fields: {
	    name: {
		selector: "span.object_descr_realtor_name",
		data: {
		    name: {},
		},
	    },

	    photo: {
		selector: "div.object_descr_images div.object_descr_images_w a",
		attr: "href",
		data: {
		    photo: {},
		}
	    },

	    photoBig: {
		selector: "div.object_descr_images div.object_descr_images_w a img",
		attr: "src",
		data: {
		    photo: {},
		}
	    },

	    /*photoOne: {
		selector: "a.photo-job-img-link",
		attr: "href",
		data: {
		    photo: {},
		}
	    },*/

	    city: {
		selector: "h1.object_descr_addr",
		data: {
		    city:  {
			rx: "([^,]+)(,|$)",
			rxi: 1
		    }
		}
	    },

	    street: {
		selector: "h1.object_descr_addr",
		data: {
		    street: {
			rx: "[^,]+,\\s+(.+),\\s+(.+)",
			rxi: 1
		    },
		    district: {
			rx: "[^,]+,\\s+(.+),\\s+(.+)",
			rxi: 1
		    }
		}
	    },

	    daily: {
		selector: "div.object_descr_title",
		data: {
		    daily: {
			rx: "посуточно",
			conv: function (s) {
			    return s ? "daily" : "";
			},
		    }
		},
	    },

	    type: {
		selector: "td.header_menu_item_selected div.header_menu_item_w",
		data: {
		    type: {
			conv: function (s) {
			    if (s.indexOf ("Аренда") == 0) return "sdam";
			    if (s.indexOf ("Продажа") == 0) return "prodam";
			    return "unknown";
			},
		    }
		},
	    },

	    rooms: {
		selector: "div.object_descr_title",
		data: {
		    rooms: {
			rx: "(\\d+)-\\D+",
			rxi: 1
		    },
		},
	    },

	    area: {
		selector: "table.object_descr_props tr td",
		data: {
		    area: {
			rx: "(\\d+)\\s+м²",
			rxi: 1
		    },
		    floor: {
			rx: "(\\d+)/(\\d+)",
			rxi: 1
		    },
		    floors: {
			rx: "(\\d+)/(\\d+)",
			rxi: 2
		    }
		}
	    },

	    price: {
		selector: "#price_rur",
		data: {
		    price: {}
		}
	    },

	    notes: {
		selector: "div.object_descr_text",
		data: {
		    notes: {},
		},
	    },

	    author_agent: {
		selector: "span.object_descr_realtor_checked_text",
		data: {
		    author: {
			conv: function () { return "agent"; }
		    }
		}
	    },

	    /*author_owner: {
		selector: "div.description_term span.t-seller-title:contains('Арендодатель')",
		data: {
		    author: {
			conv: function () { return "owner"; }
		    }
		}
	    },*/

	    lat: {
		selector: "div.object_descr_map_static input",
		attr: "value",
		data: {
		    lat: {
			rx: ".*&pt=(\\d+.\\d+),(\\d+.\\d+),flag",
			rxi: 1
		    }
		}
	    },

	    lon: {
		selector: "div.object_descr_map_static input",
		attr: "value",
		data: {
		    lon: {
			rx: ".*&pt=(\\d+.\\d+),(\\d+.\\d+),flag",
			rxi: 2
		    }
		}
	    },

	    date: {
		selector: "span.object_descr_dt_added",
		data: {
		    created: {
			conv: function (s) {
			    var today = new Date ();
			    var yesterday = new Date (today);
			    yesterday.setDate (today.getDate () - 1);
			    return boards.dateFmt (
				s.replace ("сегодня", boards.dts (today))
				    .replace ("вчера", boards.dts (yesterday))
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

    window.sobnik.boards.cian = cian;
    window.sobnik.boards.current = cian;

} ());
