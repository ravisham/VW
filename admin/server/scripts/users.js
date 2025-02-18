require("../styles/users.scss");
var profileContainer = document.querySelectorAll(".profileContainer")[0];
var $userProfileContainer = $(".userProfileContainer");
var $userProfileEditContainer = $(".userProfileEditContainer");

var List = require("list.js");

$(".editBtn", $userProfileContainer).click(function () {
	$userProfileContainer.hide();
	$userProfileEditContainer.show();
});

$(function () {

	var userList = new List('sortableTable', {
		valueNames: ['name', 'email', 'username', 'phone', 'address', 'dealer', 'created']
	});
	
	$("#importer").on('submit', function () {

		$("p.loading").show();
		$(".resultsContainer, .errorsContainer, .error, .timer").empty();
	});

	$("#statusToggle input[type=checkbox]").on('change', event => {
		$("#userTable tr.disabled").toggle();
	});

	$("select[name=dealer_select]").on('change', event =>{
		let navid = $(this).find(":selected").val();
		let id = $(this).find(":selected").attr('data-id');

		$('input[name=dealer_nav_id]').val(navid);
		$('input[name=dealer_id]').val(id);
	});	

	$('input[name=dealer_nav_id]').on('change', function(){
		let navid = $(this).val().toUpperCase().trim();
		let select = $("select[name=dealer_select]");
		
		if ( navid === "" ) {
			return;
		}
		$(this).val(navid);

		let target = $("option[value=\"" + navid + "\"]", select);
		if ( target.length > 0 ) {
			select.val(navid);
			$('input[name=dealer_id]').val(target.attr('data-id'));
		} else {
			alert('The dealer ID you\'ve entered \'' + navid + '\' does not seem to match any existing dealers.');
			$(this).focus();
		}
	});		

	if ( /[?&](error|message)=/.test(location.search))
		history.pushState(null, "", location.href.split("?")[0]);
});