require("../styles/brands.scss");

var List = require("list.js");

$(function () {

	var brandList = new List('sortableTable', {
		valueNames: ['name', 'type']
	});

    $("#statusToggle input[type=checkbox]").on('change', event => {
        $("#brandTable tr.disabled").toggle();
    });

    if ( /[?&](error|message)=/.test(location.search))
        history.pushState(null, "", location.href.split("?")[0]);
});