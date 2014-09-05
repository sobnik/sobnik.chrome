(function () {

    console.log ("avito");

    // needs to stay in closure to be used by 'conv' methods below
    var sob = sobnikApi ();

    var board = {
	name: "avito.ru",

	urls: [
	    // FIXME make it any city
	    "http://www.avito.ru/chelyabinsk/kvartiry/[^\\.]+\\._[\\d]+$"
	],

	trigger: "span.description__phone-insert.j-phone-show__insert img.description__phone-img",

	clicks: ["span.j-phone-show__insert span.btn__text"],

	capture: {
	    phoneImage: {
		selector: "span.description__phone-insert.j-phone-show__insert img.description__phone-img",
		attr: "src"
	    }
	},

	fields: {
	    location: {
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
			    return s.replace(/\s+/i, "");
			}
		    }
		}
	    },

	    notes: {
		selector: "#desc_text",
		data: {
		    notes: {},
		    phone: {
			conv: sob.extractPhones
		    }
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
