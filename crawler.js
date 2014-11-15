/*
    crawler.js - sobnik.chrome module

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

    console.log("Loading crawler");

    var sobnik = window.sobnik;
    console.assert(sobnik, "Sobnik required");

    var cmn = sobnik.require("cmn");

    var crawlerTabSignal = "sobnik-chrome-crawler-tab-signal";

    function bgStart()
    {
        console.log("Loading crawler.bg");

        var server = sobnik.require("server.bg");
        var boards = sobnik.require("boards");

        var self = {
            ad : {},
            tab : null,
            to : null,
            cb : null,
            failures : 0,
            isReady : false,
            forceNewTab : false,
        };

        function callback()
        {
            if (self.cb)
                self.cb();
            self.cb = null;
        }

        function clearTTL()
        {
            if (self.to != null)
                clearTimeout(self.to);
            self.to = null;
        }

        function checkTab(t, callback)
        {
            // executeScript might fail silently w/o calling
            // the callback. I don't know how to reproduce that,
            // but it may happen and will block the whole process
            // w/o proper handling.

            var code = {
                code : "document.getElementById ('" + crawlerTabSignal + "') != null"
            };

            chrome.tabs.executeScript(t, code, function (result) {
                var found = false;
                var error = chrome.runtime.lastError;
                //      console.log ("Tab", t, error, result);
                if (!error && result)
                {
                    result.forEach(function (f)
                    {
                        if (f)
                            found = true;
                    }
                    );
                }
                callback(found, error);
            });
        }

        function close()
        {
            clearTTL();
            if (!self.tab)
            {
                callback();
                return;
            }

            // check if tab is still ours
            var t = self.tab;
            self.tab = null;
            checkTab(t, function (found) {
                if (found)
                {
                    console.log("Tab is still ours");
                    // remove
                    chrome.tabs.remove(Number(t), function () {
                        if (chrome.runtime.lastError)
                            console.log(chrome.runtime.lastError);
                        callback();
                    });
                } else {
                    console.log("Tab is not ours");
                    callback();
                }
            });
        }

        function startTTL()
        {
            if (self.to != null)
                clearTTL();

            // killer
            var ttl = 300000; // ms, 300 sec
            self.to = cmn.later(ttl, function () {
                self.failures++;
                console.log("TTL expired", self.failures);
                if (self.tab == null)
                {
                    // no tab was opened, why?
                    // we should not search the crawler tab next time here
                    // as our tab might have stuck and not responding
                    self.forceNewTab = true;
                    console.log("Crawler tab stuck? Forcing new tab");
                }

                if (self.failures > 2)
                {
                    self.failures = 0;
                    close();
                } else {
                    callback();
                }
            });
        }

        function startTab(t)
        {
            self.tab = t.id;

            if (chrome.runtime.lastError)
                console.log(chrome.runtime.lastError);

            // maybe user closed it immediately after we requested the update
            if (!self.tab)
                return;

            // notice if tab gets closed
            chrome.tabs.onRemoved.addListener(function (id) {
                if (id == self.tab)
                {
                    self.tab = null;
                    clearTTL();
                    callback();
                }
            });
        }

        function searchCrawlerTab(incognito, callback)
        {
            console.log("searchCrawlerTab");

            // reset
            self.tab = null;
            if (self.forceNewTab) 
            {
                self.forceNewTab = false;
                callback(incognito);
                return;
            }

            // search crawler tab
            chrome.windows.getAll( {
                    populate : true
                }, function (ws) {
                    // no windows?
                    if (ws.length == 0)
                    {
                        callback(incognito);
                        return;
                    }

                    // for each window
                    var tabsCount = 0;
                    ws.forEach(function (w) {
                        // for each tab
                        w.tabs.forEach(function (t) {
                            // count this tab
                            tabsCount++;
                            checkTab(t.id, function (found) {
                                // count back this tab
                                tabsCount--;

                                // found?
                                if (found && self.tab == null)
                                {
                                    if (!t.incognito && incognito)
                                    {
                                        // close our tab as we've obviously
                                        // switched to incognito crawling
                                        chrome.tabs.remove(Number(t.id));
                                    } else {
                                        // yes!
                                        self.tab = t.id;
                                        callback(incognito);
                                    }
                                }

                                // was it the last tab and we found nothing?
                                if (tabsCount == 0 && self.tab == null)
                                    callback(incognito);
                            });
                        });
                    });

                    if (tabsCount == 0 && self.tab == null)
                        callback(incognito);
            });
        }

        function open(ad, cback)
        {
            console.log(ad);
            self.ad = ad;
            self.cb = cback;
            self.isReady = false;

            // Start killer immediately.
            // Somewhere there may be a failure that will stop the whole
            // bg process (i.e. executeScript may fail silently).
            // So, TTL now works for any kind of failures and will restart
            // crawler, hopefully.
            startTTL();

            function doOpen(incognitoRequested)
            {
                console.log("doOpen");

                // now, if no crawler tab found - go create one
                if (self.tab == null)
                {
                    function start(windowId)
                    {
                        var params =
                        {
                            windowId : windowId,
                            url : ad.Url,
                            active : false,
                            selected : false,
                        };
                        chrome.tabs.create(params, startTab);
                    }

                    // search incognito window - use it by default
                    chrome.windows.getAll(function (windows) {
                        if (chrome.runtime.lastError)
                            console.log(chrome.runtime.lastError);

                        var incognitoWindowId = null;

                        windows.forEach(function (w) {
                            if (w.incognito && w.id)
                                incognitoWindowId = w.id;
                        });

                        if (incognitoRequested && incognitoWindowId == null)
                        {
                            // no incognito window found, but user
                            // requested incognito mode - open new window
                            var params = { 
                                incognito : true
                            };
                            chrome.windows.create(params, function (newWindow) {
                                console.log(newWindow);

                                if (chrome.runtime.lastError)
                                    console.log(chrome.runtime.lastError);
                                // newWindow == null if user disallowed
                                // incognito access while opening
                                // FIXME: crawler should start here anyway
                                if (newWindow)
                                    start(newWindow.id);
                            });
                        } else {
                            start(incognitoWindowId);
                        }
                    });
                } else {
                    console.log("reusing", self.tab);
                    chrome.tabs.update(self.tab, {url : ad.Url}, startTab);
                }
            }

            // get settings and start
            chrome.storage.local.get("crawlerIncognito", function (items) {
                if (items.crawlerIncognito == "on")
                {
                    chrome.extension.isAllowedIncognitoAccess(function (isAllowedIncognito) {
                        searchCrawlerTab(isAllowedIncognito, doOpen);
                    });
                } else {
                    searchCrawlerTab(false, doOpen);
                }
            });
        }

        function create()
        {
            // random delays 50-120 seconds
            var delays = [];
            for (var i = 0; i < 30; i++)
                delays.push(cmn.rdelay(50, 120));

            // multiplier used for back-off
            var delayMult = 1.0;

            function backoff()
            {
                delayMult *= 1.5;
                if (delayMult > 5.0)
                    delayMult = 5.0;
            }

            function speedup()
            {
                delayMult = 1.0;
            }

            function retry()
            {
                backoff();
                getJob();
            }

            function getJob()
            {
                var r = Math.floor(Math.random() * delays.length);
                var d = delays[r] * delayMult;
                console.log("Next job after " + d);

                function get()
                {
                    cmn.getCrawlerAllowed(function (allowed) {
                        if (!allowed)
                        {
                            // retry later after the same delay
                            getJob();
                        } else {
                            // get the job
                            var request = {
                                "Boards" : boards.allBoards()
                            };
                            server.crawlerJob(request, function (data) {
                                speedup();
                                open(data, getJob);
                            }, retry);
                        }
                    });
                }

                cmn.later(d, get, retry);
            }

            return getJob;
        }

        function isCrawlerTabReady(message, sender)
        {
            //    return message.AdId == self.ad.AdId
            return self.tab && sender.tab && self.tab == sender.tab.id;
        }

        function ready(message, sender, reply)
        {
            if (!self.isReady && isCrawlerTabReady(message, sender))
            {
                self.isReady = true;
                console.log("Crawler tab ready");
                if (!reply({type : "startCrawler"}))
                    callback();
            } else {
                console.log("Tab ready");
                reply();
            }
        }

        function done()
        {
            console.log("Crawler tab done");
            clearTTL();
            callback();
        }

        // public
        function start()
        {
            cmn.setEventListeners({
                "crawlerOff" : close,
                "parserDone" : done,
                "ready" : ready,
            });

            var crawler = create();
            crawler();
        }

        window.sobnik.crawler.bg =  {
            start : start,
        }
    }

    function tabStart()
    {
        console.log("Loading crawler.tab");

        var board = sobnik.require("boards/current");
        var parser = sobnik.require("parser");

        function insertBanner()
        {
            // add signal so that plugin can find this tab
            // even when restarted
            var div = document.createElement('div');
            div.id = crawlerTabSignal;
            $("body").append(div);

            var settingsUrl = chrome.extension.getURL("settings.html");
            var html = "<div id='sobnikCrawlerInfoDiv' "
                 + "style='position: fixed; left: 10%; top: 10%; "
                 + "border: 1px solid #aaa; background:rgba(220,220,220,0.9); "
                 + "width: 80%; height: 80%; z-index: 100000; "
                 + "padding: 20px 40px; margin: 0; font-family: Arial'>"
                 + "<a href='#' onclick=\"$('#sobnikCrawlerInfoDiv').hide (); return false;\" "
                 + "style='position: absolute; top: 10px; right: 10px'>X</a>"
                 + "<h1 style='margin: 20px 10px; padding: 0; font-size: 6em; "
                 + "text-align: center;'>"
                 + "Тут работает S<span style='color:#2c3'>o</span>bnik!"
                 + "</h1>"
                 + "<h2 style='font-size: 2em; text-align: center; "
                 + "margin: 20px 10px; padding: 0; '>"
                 + "Это не реклама, пожалуйста, прочитайте это сообщение."
                 + "</h2>"
                 + "<p style='font-size: larger'>У вас установлен <a href='http://sobnik.com' target='_blank'>плагин Sobnik</a>, который фильтрует риэлторов. Для работы плагину нужно анализировать содержимое объявлений. В день публикуется очень много объявлений, сбор их &mdash; ресурсоемкий процесс. Чтобы Sobnik мог оставаться <strong>бесплатным</strong>, теперь каждый пользователь сможет вносить вклад в общее дело. Чтобы узнать подробности &mdash; прочитайте <a href='http://sobnik.com/kak-rabotaet-sobnik.html' target='_blank'>инструкцию</a>.</p>"
                 + "<p style='font-size: larger; margin-top: 10px;'>В этой вкладке вашего браузера Sobnik будет сканировать объявления, и отправлять информацию в общую базу. Sobnik вам не помешает &mdash; он открывает не более одного объявления в минуту. Таким образом, без особых неудобств и усилий, Вы сможете помогать множеству людей по всей стране, а они в ответ будут помогать Вам.</p>"
                 + "<p style='font-size: larger; margin-top: 10px;'>Вам стоит отключить сбор объявлений в <a href='#' onclick=\"return false;\" id='sobnikShowSettings'>настройках</a>, если у вас не безлимитный доступ в Интернет. Там же можно настроить сканирование по расписанию.</p>"
                 + "<p style='font-size: larger; margin-top: 10px;'>Если у Вас есть предложения или вопросы, пожалуйста, пишите в нашей группе <a href='https://vk.com/sobnik_com' target='_blank'>Вконтакте</a>, или на электронную почту <strong>sobnik.ru@gmail.com</strong></p>"
                 + "<h2 style='font-size: 3em; text-align: center; margin-top: 30px;'>Спасибо!</h2>"
                 + "</div>";

            $("body").append(html);

            // we may not inline the onclick into the html, as it will be
            // executed in the context of web-site, not the extension.
            // this way we add handler in the context of extension.
            cmn.later(0, function () {
                $("#sobnikShowSettings").on("click", function () {
                    // FIXME this should be abstracted away
                    // but currently we can't w/o creating cyclic dep-cy
                    chrome.runtime.sendMessage("", {type : "showSettings"});
                });
            });
        }

        // public
        function start()
        {
            if (!sobnik.debugCrawler)
                insertBanner();
            parser.start();
        }

        window.sobnik.crawler.tab = {
            start : start
        };
    }

    window.sobnik.crawler = {
        bg : bgStart,
        tab : tabStart,
    };

}) ();