/*
    sob.js - sobnik.chrome module to work with sob.ru

    Copyright (c) 2014 Artem Palchevsky.
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

    console.log ("Loading sob.ru");

    var sobnik = window.sobnik;
    console.assert (sobnik, "Sobnik required");

    var cmn = sobnik.require ("cmn");
    var boards = sobnik.require ("boards");

    var sob = {
        name: "sob.ru",

        // FIXME add abuse reasons

        urls: [
            "http[s]?://.*\\.?sob.ru/card/.*",
        ],

        trigger: [
            "div.card_wrap_rent",
            "div.card_wrap"
        ],

        untrigger: [
            //FIXME: fill it in
        ],

	capture: {
            photoImage: {
                dynamic: function () {

                    var data = {
                        dropImage: true,
                        attr: "src",
                    }

                    if ($("div.wrapper h1").text ().indexOf ("Аренда") == 0)
                    {
                        // settings are returned
                        data.selector = "div.wrapper div.photos img";
                        console.log ("Capture settings", data);
                        return data;
                    }
                    else
                    {
                        // promise that waits for selector is returned
                        data.selector = "div.card_photos li.photo img";

                        // start loading of photos
                        var link = "div.big_photo a.card_image_box";

                        // any photos?
                        if (!$(link).length)
                            return {selector: link}; // empty selector
                            
                        cmn.click (link);

                        // wait until photo card is created
                        return cmn.waitCond (function () {
                            return $(data.selector).length;
                        }).then (function () {
                            // lets wait a bit to make sure
                            return cmn.wait (1000);
                        }).then (function () {
                            // now capture settings are ready
                            console.log ("Capture settings", data);
                            return data;
                        });
                    }
                },
            },
        },

        list: {
            // the row in the list
            rowSelector: "table.main_table tr[id^='tr_']",

            // container for the link to an ad (relative to rowSelector)
            hrefSelector: "td.address a",

            // links matching this pattern will be marked in the list
            pattern: "/card/",

            // matching urls will be treated as a list of ads
            urls: [
                "http[s]?://.*\\.?sob.ru/prodazha.*",
                "http[s]?://.*\\.?sob.ru/arenda/.*"
                ],

            mark: function (row, ad) {
                var el = $("<span style='display:block;"
                    +"float:left; margin: 1em 0; padding: 0'>"
                    +boards.marker (ad)+"</span>");
                    $(row).find("td.address").prepend(el);
                    return el;
            },
        },

        page: {
            marks: [
                {
                    selector: "div.wrapper h1",
                    mark: function (parent, ad) {
                        var el = $("<span style='display:block;"
                            +"float:left; margin: 6px 3px; padding: 0'>"
                            +boards.marker (ad)+"</span>");
                        $(parent).prepend(el);
                        return el;
                    },
                },
                {
                    selector: "div.contact",
                    mark: function (parent, ad) {
                        var el = $("<span style='display:block;"
                            +"float:left; margin: 2em 5px; padding: 0'>"
                        +boards.marker (ad)+"</span>");
                        $(parent).prepend(el);
                        return el;
                    },
                },
                {
                    selector: ".phones.icon",
                    mark: function (parent, ad) {
                        var el = $("<span style='display:block;"
                            +"float:left; margin: 1px 3px; padding: 0'>"
                            +boards.marker (ad)+"</span>");
                        $(parent).prepend(el);
                        return el;
                    },
                }
            ],
        },

        url2id: function (url) {
            var id = url.match (".*\\/\\d+-(\\d+)");
//          console.log ("Url "+url);
//          console.log (id);
            if (!id)
                return "";
            return "sob:"+id[1];
        },

        fields: {
            script: {
                selector: "script",
                data: {
                    script: {
                        rx: "var current_object = eval\\(({.*?})\\);",
                        rxi: 1,
                        conv: function (s) {
                            if (s.length)
                            {
//                                console.log (s);
                                this.current_object = JSON.parse(s);
                                console.log(this.current_object);
                            }
                        }
                    },

                }
            },

            info: {
                selector: "div.wrapper h1",
                data: {
                    name: {
                        conv: function () {
                            var r = [];
                            if (this.current_object.owner_name)
                                r.push (unescape(this.current_object.owner_name));
                            if (this.current_object.company_name)
                                r.push (unescape(this.current_object.company_name));
                            return r;
                        }
                    },
                    street: {
                        conv: function () {
                            return unescape(this.current_object.info.address);
                        }
                    },
                    type: {
                        conv: function (s) {
                            if (s.indexOf ("Аренда") == 0) return "sdam";
                            if (s.indexOf ("Продажа") == 0) return "prodam";
                            return "unknown";
                        },
                    },
                    rooms: {
                        conv: function (s) {
                            if (s.indexOf ("однокомн")) return "1";
                            if (s.indexOf ("двухкомн")) return "2";
                            if (s.indexOf ("трёхкомн")) return "3";
                            //if (s.indexOf ("многокомн") == 0) return 4;
                            return null;
                        },
                    },
                    area: {
                        conv: function () {
                            return (parseInt(this.current_object.info.sqtl) / 10).toString();
                        }
                    },
                    floor: {
                        conv: function () {
                            return this.current_object.info.bldflr;
                        }
                    },
                    floors: {
                        conv: function () {
                            return this.current_object.info.bldht;
                        }
                    },
                    phone: {
                        conv: function () {
                            return this.current_object
                                .phones.map (function (p) {
                                    return p.replace (/^7/, "+7");
                                });
                        }
                    },
                    phoneOff: {
                        conv: function () {
                            return this.current_object
                                .phones.map (function (p) {
                                    return p.replace (/^7/, "+7");
                                });
                        }
                    },
                    notes: {
                        conv : function () {
                            return this.current_object.info.cm;
                        }
                    },
                    created: {
                        conv: function () {
                            var d = this.current_object.info.crdt;
                            var m = d.match(/^\S+/);
                            if (m)
                            {
                                return boards.dts(new Date(m[0]));
                            }
                        }
                    },
                    lat:
                    {
                        conv: function () {
                            return this.current_object.info.yandex_y;
                        }
                    },
                    lon:
                    {
                        conv: function () {
                            return this.current_object.info.yandex_x;
                        }
                    },
                    photo:
                    {
                        conv: function () {
                            return this.current_object.photos;
                        }
                    },
                    author: 
                    {
                        conv: function () {
                            if (Number (this.current_object.info.commission_agency) > 0
                                || Number (this.current_object.info.commission_client) > 0
                                || this.current_object.company_name
                                || this.current_object.company_logo
                                || this.current_object.company_link)
                                return "agent";
                        }
                    },
                }
            },

            city: {
                selector: "div.region span.caption",
                data: {
                    city:  {}
                }
            },

            // FIXME check cities w/o metro
            metro: {
                selector: "span.subway_name",
                data: {
                    district: {},
                }
            },

            daily: {
                selector: "span.period",
                data: {
                    daily: {
                        rx: "сутки",
                        conv: function (s) {
                            return s ? "daily" : "";
                        },
                    }
                },
            },

            price: {
                selector: "div.price",
                data: {
                    price: {
                        conv: function (s) {
                            return s.replace(/([^\d]|\s)+/ig, "");
                        }
                    }
                }
            },
        }
    };

    window.sobnik.boards.sob = sob;
    window.sobnik.boards.current = sob;

} ());
