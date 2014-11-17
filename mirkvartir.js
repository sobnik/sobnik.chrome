/*
    mirkvartir.js - sobnik.chrome module to work with mirkvartir.ru

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

;(function (){

    console.log("Loading mirkvartir");

    var sobnik = window.sobnik;
    console.assert(sobnik, "Sobnik required");

    var cmn = sobnik.require("cmn");
    var boards = sobnik.require("boards");

    var mirkvartir =
    {
        name : "mirkvartir.ru",

        // FIXME add abuse behaviour

        urls : [
            "http[s]?://.*.mirkvartir.ru/[\\d]+/($|#.*|\\?.*)",
        ],

        trigger : "#location",

        untrigger : [
            // FIXME fill
        ],

        capture :
        {

            photoImage :
            {

                dynamic : function ()
                {

                    var data =
                    {
                        dropImage : true,
                        detectText : false,
                        iterator : {},
                    };

                    var images = "#photos a.photo-item-link img";

                    var cursor = -1;
                    var queue = [];
                    data.iterator.next = function ()
                    {
                        // advance
                        cursor++;
                        return cmn.Promise(function (fulfill)
                        {
                            // eof?
                            if (cursor >= queue.length)
                            {
                                fulfill(false);
                                return;
                            }

                            var item = queue[cursor];
                            console.log("Image", cursor, item);
                            // wait until image is loaded
                            return cmn.waitDomLoaded(item)

                            .then(function ()
                            {
                                // scroll to make it visible
                                item.scrollIntoView();

                                // wait until image dimentions are set by js
                                return cmn.waitCond(function ()
                                {
                                    // make artificial scroll event
                                    // as browser does not fire it if
                                    // tab is not active
                                    // and make it constantly,
                                    // as some might get lost
                                    cmn.click(window, "scroll");

                                    return $(item).attr("width");
                                });
                            })
                            .then(function ()
                            {
                                // now we're done!
                                fulfill(true);
                            });
                        });
                    };

                    data.iterator.value = function ()
                    {
                        return queue[cursor];
                    };

                    data.iterator.start = function ()
                    {
                        // start loading of photos
                        cmn.click("a[href=\"#photos\"]");

                        // collect photo dom elements
                        $(images).each(function (i, e){
                            queue.push(e);
                        });

                        console.log("Queue", queue);

                        return cmn.Now();
                    };

                    console.log("Capture settings", data);
                    return data;
                },
            },
        },

        list :
        {
            // the row in the list
            rowSelector : "#flats div.list_item",

            // container for the link to an ad (relative to rowSelector)
            hrefSelector : "a.cmpz-list-item",

            // links matching this pattern will be marked in the list
            pattern : "^/\\d+/",

            // matching urls will be treated as a list of ads
            urls : [
                "http[s]?://.*.mirkvartir.ru/%"
            ],

            mark : function (row, ad)
            {
                var el = $("<span style='display:block;"
                         + "float:left; margin:4px 0 0 0; padding: 0'>"
                         + boards.marker(ad) + "</span>");
                $(row).find("div.cntr>p>span:first-child").prepend(el);
                return el;
            },
        },

        page :
        {
            marks : [
                {
                    selector : "h1.s2",
                    mark : function (parent, ad)
                    {
                        var html = "<span style='display:block;"
                             + "float:left; margin:24px 0 0 0; padding: 0'>"
                             + boards.marker(ad) + "</span>";
                        $(parent).prepend(html);
                        return $(parent).find("span")[0];
                    },
                },
                {
                    selector : "p.contact-item span.phone-item",
                    mark : function (parent, ad)
                    {
                        var html = "<span style='display:block;"
                            + "float:left; margin:4px 0 0 0; padding: 0'>"
                            + boards.marker(ad) + "</span>";
                        $(parent).prepend(html);
                        return $(parent).find("span")[0];
                    },
                },
            ],
        },

        url2id : function (url)
        {
            var id = url.match(/.mirkvartir.ru\/(\d+)\//);
            //        console.log ("Url "+url);
            //        console.log (id);
            if (!id)
                return "";
            return "mirkvartir:" + id[1];
        },

        fields :
        {

            name :
            {
                selector : "span[itemprop=name]",
                data :
                {
                    name : {}
                },
            },

            source :
            {
                selector : "div.techinfo.nbb td.tc-content",
                data :
                {
                    name :
                    {
                        conv : function (s)
                        {
                            var name = s.match("(.+)\\s+\\(ID");
                            if (name && name.length)
                                return name[1];
                            return '';
                        }
                    },
                    author :
                    {
                        conv : function (s)
                        {
                            var owner = s.match("Пользователь сайта");
                            console.log(owner);
                            if (owner)
                                return "owner";
                            return "agent";
                        }
                    },
                },
            },

            city :
            {
                selector : "#structure h1.s2",
                data :
                {
                    type :
                    {
                        conv : function (s)
                        {
                            if (s.indexOf("Аренда") >= 0)
                                return "sdam";
                            return "prodam";
                        },
                    },
                    city :
                    {
                        rx : "[^,]+,\\s*(\\S+),",
                        rxi : 1,
                    },
                    street :
                    {
                        rx : "[^,]+,\\s*\\S+,\\s*(\\S+.*)",
                        rxi : 1,
                    },
                },
            },

            metro :
            {
                selector : "dl.info-item[itemprop=address]",
                data :
                {
                    district :
                    {
                        rx : "Метро\\s+([^,]+),",
                        rxi : 1,
                    },
                },
            },

            daily :
            {
                selector : "p.price",
                data :
                {
                    daily :
                    {
                        conv : function (s)
                        {
                            return s.match("день") ? "daily" : "";
                        },
                    }
                },
            },

            info :
            {
                selector : "div.txt_about_home",
                data :
                {
                    rooms :
                    {
                        rx : "Число комнат:\\s*(\\d+)",
                        rxi : 1,
                    },
                    area :
                    {
                        rx : "Общая площадь:\\s*(\\d+)",
                        rxi : 1,
                    },
                    floor :
                    {
                        rx : "Этаж:\\s*(\\d+)",
                        rxi : 1,
                    },
                    floors :
                    {
                        rx : "Этаж:\\s*\\d+\\s+из\\s+(\\d+)",
                        rxi : 1,
                    },
                },
            },

            price :
            {
                selector : "strong[itemprop=price]",
                data :
                {
                    price :
                    {
                        conv : function (s)
                        {
                            return s.replace(/\s+/ig, "");
                        }
                    }
                }
            },

            phone :
            {
                selector : "p.contact-item span.phone-item",
                data :
                {
                    phone :
                    {
                        conv : function (s)
                        {
                            return s.replace(/[^\d]+/ig, "")
                                    .replace(/^[78]/, "+7");
                        },
                    },
                    phoneOff :
                    {
                        conv : function (s)
                        {
                            return s.replace(/[^\d]+/ig, "")
                                    .replace(/^[78]/, "+7");
                        },
                    },
                },
            },

            notes :
            {
                selector : "p.estate-description",
                data :
                {
                    notes : {},
                },
            },

            location :
            {
                selector : "div.gm_default script",
                data :
                {
                    lat :
                    {
                        rx : "var centerLatitude = ([\\d.]+);",
                        rxi : 1,
                    },
                    lon :
                    {
                        rx : "var centerLongitude = ([\\d.]+);",
                        rxi : 1,
                    }
                }
            },

            photo :
            {
                selector : "#photos div.photo-item-container noscript",
                data :
                {
                    photo :
                    {
                        rx : "src=\"([^\"]+)\"",
                        rxi : 1,
                    },
                }
            },

            date :
            {
                selector : "time[itemprop=availabilityStarts]",
                attr : "datetime",
                data :
                {
                    created : {},
                },
            }
        }
    };

    window.sobnik.boards.mirkvartir = mirkvartir;
    window.sobnik.boards.current = mirkvartir;

})();
