require( "../styles/account.scss" );
var common = require( "./components/common" );
var ItemDetails = require( "./components/overlay/itemDetails.js" );
//console.log("Account Page");


$("p.changePassword").click(function(){
	$(this).remove();
	$(".hiddenPasswordChange").show();
	$('input[name=newpassword]').focus();
});

$("form#profileUpdate").on("submit", event => {
	$("#dashboard .message").hide();
	if ( $("input[name=newpassword]").val() !== $("input[name=confirmpassword").val() ){
		alert('The new passwords entered do not match.');
		$("input[name=newpassword]").focus();
		event.preventDefault();
		return false;
	}

});

//super quick and dirty page spesific scripts
common();
(function ProfilePage(){
	let addressGroup = $(".addressGroup");
	let editAddressGroup = $(".editAddressGroup");
	let editAddressBtn = $(".editAddressBtn");
	if( addressGroup.length && editAddressGroup.length ) {
		console.log("profile Page");
		console.log( addressGroup );
		console.log( editAddressGroup );
		editAddressBtn.click(function(){
			addressGroup.hide();
			editAddressGroup.show();
		});
	}
})();

(function ContactPage(){
	var contentContainer = document.getElementById( "contentContainer" );
	var $commentFormContainer = $(".commentFormContainer");
	if ($commentFormContainer.length>0){
		var commentFormContainer = contentContainer.querySelectorAll( ".commentFormContainer" )[0];
		var commentForm = contentContainer.querySelectorAll( "form" )[0];
		var commentFormSubmit = commentForm.querySelectorAll( ".submit" )[0];
		var loadingIndicator = document.createElement( "div" );
		var loadingIcon = document.createElement( "span" );
		var overlay = document.getElementById( "overlay" );
		var $overlay = $( overlay );
		var toggleLoading = function( event ) {
			if( !commentForm.isLoading ) {
				commentForm.isLoading = true;
				overlay.appendChild( loadingIndicator );
				$( "html, body" ).addClass( "no-scroll" );
				$overlay.addClass( "toggle" );
			}
			else {
				event.preventDefault();
			}
		};
		var togglePreventSubmit = function( event ) {
			if( commentForm.isLoading ) {
				event.preventDefault();
			}
		};
		loadingIndicator.className = "loading-indicator";
		loadingIcon.className = "loading-icon";
		loadingIndicator.appendChild( loadingIcon );
		commentForm.addEventListener( "submit", toggleLoading, false );
		commentFormSubmit.addEventListener( "click", togglePreventSubmit, false );
		console.log("Contact");
	}
})();

(function OrderHistory(){
	var $orderHistory = $( "#orderHistory" );
	if( $orderHistory.length ) {
		console.log( "orderHistory" );
	}
})();
