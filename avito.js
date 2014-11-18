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

;(function () {

    console.log ("Loading avito");

    var sobnik = window.sobnik;
    console.assert (sobnik, "Sobnik required");

    var cmn = sobnik.require ("cmn");
    var boards = sobnik.require ("boards");

    var types = "kvartiry|nedvizhimost|komnaty|doma_dachi_kottedzhi|zemelnye_uchastki|garazhi_i_mashinomesta|kommercheskaya_nedvizhimost";

    var avito = {
        name: "avito.ru",

        abuseReasons: {
            "64": "agent",
            "65": "let",
            "66": "sold",
            "79": "fake",
            "71": "spam",
            "72": "price",
            "73": "address",
            "74": "phone",
            "76": "contacts",
            "82": "crime",
            "77": "other",
        },

        urls: [
            "http[s]?://www.avito.ru/[^/]+/("+types+")/[^\\?]*_[\\d]+$",
            "http[s]?://www.avito.ru/[^/]+/("+types+")/[^\\?]*_[\\d]+#",
            "http[s]?://www.avito.ru/[^/]+/("+types+")/[^\\?]*_[\\d]+\\?",
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
                dropSize: true,
            },

            photoImage: {

                dynamic: function () {

                    var data = {
                        dropImage: true,
                        detectText: true,

                        iterator: {},
                    }

                    var zoomer = "td.big-picture a.j-zoom-gallery-link";
                    var zoomable = $(zoomer).length > 0;
                    var single = $("div.gallery-item a.gallery-link img").length == 0;
                    
                    var gallery = "td.gallery-wrapper a.gallery-link";
                    var image = "td.big-picture img.active";
                    if (zoomable)
                    {
                        gallery = "div.b-zoom-gallery a.gallery-link";
                        image = "div.photo-slide img.active";
                    }

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
                            if (single)
                            {
                                fulfill (true);
                                return;
                            }

                            // take id of image from href
                            var href = $(item).attr ("href");
                            var rx = /\/(\d+).jpe?g/;
                            href = href.match (rx)[1];

                            // click the link
                            cmn.click (item);
                            cmn.waitCond (function () {

                                // wait until image get's same id
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

                    function init ()
                    {
                        var selector = gallery;
                        if (single)
                            selector = image;

                        $(selector).each (function (i, e) {
                            queue.push (e);
                        });
                    }

                    data.iterator.start = function () {
                        if (zoomable)
                        {
                            cmn.click (zoomer);
                            return cmn.waitDomLoaded (image)
                                .then (init);
                        }
                        else
                        {
                            return cmn.Now (init);
                        }
                    }

                    console.log ("Capture settings", data);
                    return data;
                },
            },
        },

        watermark: {
            top_left: {
                right: 115,
                bottom: 50,
            },
            bottom_right: {
                right: 20,
                bottom: 22,
            },
        },

        list: {
            // the row in the list
            rowSelector: "div.catalog div.item", 

            // container for the link to an ad (relative to rowSelector)
            hrefSelector: "a", 

            // links matching this pattern will be marked in the list
            pattern: ".*("+types+").*",

            // matching urls will be treated as a list of ads 
            urls: [
                "http[s]?://www.avito.ru/[^/]+/("+types+")"
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
            var id = url.match (/[^\?]*_(\d+)($|#.*|\?.*)/);
//          console.log ("Url "+url);
//          console.log (id);
            if (!id)
                return "";
            return "avito:"+id[1];
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

            photoOne: {
                selector: "a.photo-job-img-link",
                attr: "href",
                data: {
                    photo: {},
                }
            },

            city: {
                selector: "#map span[itemprop=name]",
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
                    },
                    district: {
                        rx: "([^,]+)(,|$)",
                        rxi: 1
                    }
                }
            },

            daily: {
                selector: "div.description-expanded div.item-params div a[title*=\"Срок аренды\"]",
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
                selector: "div.description-expanded div.item-params div a[title*=\"Тип объявления\"]",
                data: {
                    type: {
                        conv: function (s) {
                            if (s.indexOf ("Сдам") == 0) return "sdam";
                            if (s.indexOf ("Сниму") == 0) return "snimu";
                            if (s.indexOf ("Продам") == 0) return "prodam";
                            if (s.indexOf ("Куплю") == 0) return "kuplyu";
                            return "unknown";
                        },
                    }
                },
            },

            rooms: {
                selector: "div.description-expanded div.item-params div a[title*=\"Количество комнат\"]",
                data: {
                    rooms: {
                        rx: "(\\d+)\\D+",
                        rxi: 1
                    },
                },
            },

            area: {
                selector: "div.description-expanded div.item-params div:eq(1)",
                data: {
                    area: {
                        rx: "\\d*[-]*\\s*\\S+\\s+(\\d+)",
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
                        conv: function (s) { if (s) return "agent"; }
                    }
                }
            },

            author_owner: {
                selector: "div.description_term span.t-seller-title:contains('Арендодатель')",
                data: {
                    author: {
                        conv: function (s) { if (s) return "owner"; }
                    }
                }
            },

            lat: {
                selector: "#i_contact div.j-item-map",
                attr: "data-map-lat",
                data: {
                    lat: {}
                }
            },

            lon: {
                selector: "#i_contact div.j-item-map",
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
                                    .replace (" нояб.", ".11.2014")
                                    .replace (" дек.", ".12.2014")
                                    .replace (" в ", " ")
                            );
                        }
                    }
                }
            }
        }
    };

    window.sobnik.boards.avito = avito;
    window.sobnik.boards.current = avito;

}) ();
