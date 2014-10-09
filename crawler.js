window["sobnikCrawlerTab"] = true;

(function () {

    function later(delay, callback) 
    {
	var to = setTimeout(function () {
	    clearTimeout (to);
	    callback ();
	}, delay);
	return to;
    }

    function waitJquery (callback) 
    {
	if (window["$"] == undefined)
	    later (1000, function () { waitJquery (callback);})
	else
	    callback ();
    }

    function insertSobnik () 
    {
	
	var settingsUrl = chrome.extension.getURL ("settings.html");
	var html = "<div id='sobnikCrawlerInfoDiv' "
	    + "style='position: fixed; left: 10%; top: 10%; "
	    + "border: 1px solid #aaa; background:rgba(220,220,220,0.9); "
	    + "width: 80%; height: 80%; z-index: 10000; "
	    + "padding: 20px 40px'>"
	    + "<a href='#' onclick=\"$('#sobnikCrawlerInfoDiv').hide (); return false;\" "
	    + "style='position: absolute; top: 10px; right: 10px'>X</a>"
	    + "<h1 style='font-size: 6em; text-align: center'>"
	    + "Тут работает S<span style='color:#2c3'>o</span>bnik!"
	    + "</h1>"
	    + "<p style='font-size: larger'>У вас установлен "
	    + "<a href='http://sobnik.com' target='_blank'>плагин Sobnik</a>, "
	    + "который фильтрует риэлторов. Для работы плагину нужно "
	    + "анализировать содержимое объявлений. В день публикуется "
	    + "очень много объявлений, сбор их &mdash; ресурсоемкий процесс. "
	    + "Чтобы Sobnik мог оставаться <strong>бесплатным</strong>, теперь каждый "
	    + "пользователь сможет вносить вклад в общее дело.</p>"
	    + "<p style='font-size: larger; margin-top: 10px;'>В этой вкладке "
	    + "вашего браузера Sobnik будет сканировать объявления, и "
	    + "отправлять информацию в общую базу. Sobnik вам не помешает &mdash; он открывает не более одного объявления в минуту. Таким образом, без особых неудобств и усилий, Вы сможете помогать множеству людей по всей стране."
	    + "</p>"
	    + "<p style='font-size: larger; margin-top: 10px;'>Вам стоит <a href='#' onclick=\"return false;\" id='sobnikShowSettings'>отключить</a> сбор объявлений, если у вас не безлимитный доступ в Интернет."
	    + "</p>"
	    + "<p style='font-size: larger; margin-top: 10px;'>Если у Вас есть предложения или вопросы, пожалуйста, пишите в нашей группе <a href='https://vk.com/sobnik_com' target='_blank'>Вконтакте</a>, или на электронную почту <strong>sobnik.ru@gmail.com</strong>"
	    + "</p>"
	    + "<h2 style='font-size: 3em; text-align: center; margin-top: 30px;'>Спасибо!</h2>"
	    + "</div>";
	
	$("body").append (html);
	console.log (html);

	// we may not inline the onclick into the html, as it will be
	// executed in the context of web-site, not the extension.
	// this way we add handler in the context of extension.
	later (0, function () {
	    $("#sobnikShowSettings").on ("click", function () {
		chrome.runtime.sendMessage("", {type: "showSettings"});
	    });
	});
    }

    waitJquery (insertSobnik);

}) ();
