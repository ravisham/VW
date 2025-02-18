var handleModal = function() {
	var modal = document.getElementById( "modal" );
	var modalClose = modal.querySelectorAll( ".modal__close" )[0];
	var $htmlBody = $( "html, body" );
	var $modal = $( modal );
	var $modalClose = $( modalClose );
	console.log("handleModal");
	$modalClose.click(function( event ) {
		modal.className = "";
		$modal.addClass( "hidden" );
		$htmlBody.removeClass( "no-scroll" );
	});
};

module.exports = handleModal;
