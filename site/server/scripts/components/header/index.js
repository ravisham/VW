// https://jqueryui.com/upgrade-guide/1.12/#official-package-on-npm
require( "jquery-ui/ui/widgets/autocomplete" );
const Header = {
	handleSearch: function() {
		var header = document.querySelectorAll( ".header" )[0];
		var headerSearch = header.querySelectorAll( ".header__search" )[0];
		if( headerSearch ) {
			var headerSearchForm = headerSearch.querySelectorAll( ".header__search-form" )[0];
			var headerSearchDropdown = headerSearch.querySelectorAll( ".header__search-dropdown" )[0];
			var headerSearchNoResults = headerSearchDropdown.querySelectorAll( ".no-results" )[0];
			var headerSearchButton = headerSearchForm.querySelectorAll( "button" )[0];
			var headerSearchInput = headerSearchForm.querySelectorAll( "input" )[0];
			var headerSearchSpecifications = JSON.parse( headerSearch.getAttribute( "data-specifications" ) );
			var $headerSearchNoResults = $( headerSearchNoResults );
			var $headerSearchButton = $( headerSearchButton );
			var $headerSearchInput = $( headerSearchInput );
			var search = window.location.search;
			var query = search ? search.slice( 1 ).split( "&" ).map(function( queryString, index, array ) {
				console.log( queryString );
			}) : null;
			var searchSpecifications = [];
			var matched = false;
			var values = false;
			Object.keys( headerSearchSpecifications ).forEach(function( searchSpecification, index, array ) {
				searchSpecifications = searchSpecifications.concat( headerSearchSpecifications[searchSpecification] );
			});
			$headerSearchInput.autocomplete({
				appendTo: headerSearchDropdown,
				select: function( event, ui ) {
					var item = ui.item;
					matched = item;
					$headerSearchButton.removeClass( "disabled" );
					__updateHash( matched );
				},
				source: function( request, response ) {
					var term = request.term;
					var termLowerCase = term.toLowerCase();
					var matcher = new RegExp( "^" + $.ui.autocomplete.escapeRegex( term ), "i" );
					var matches = $.grep( searchSpecifications, function( searchSpecification ) {
						return matcher.test( searchSpecification.value );
					}).slice( 0, 10 );
					var count = matches.length;
					matched = false;
					values = matches.length ? matches : false;
					matches.forEach(function( match, index, array ) {
						var value = match.value;
						if( value.toLowerCase() === termLowerCase ) {
							matched = match;
						}
					});
					if( values ) {
						$headerSearchNoResults.addClass( "hidden" );
						$headerSearchButton.removeClass( "disabled" );
					}
					else {
						$headerSearchNoResults.removeClass( "hidden" );
						$headerSearchButton.addClass( "disabled" );
					}
					response( matches );
				}
			}).bind( "focus", function( event ) {
				// http://stackoverflow.com/questions/11168446/jquery-autocomplete-trigger-dropdown-on-inputfocus
				let target = event.target;
				let value = target.value;
				$headerSearchInput.autocomplete( "enable" );
				$headerSearchInput.autocomplete( "search" );
				if( !values ) {
					if( !value ) {
						$headerSearchButton.removeClass( "disabled" );
					}
					else {
						$headerSearchNoResults.removeClass( "hidden" );
					}
				}
			}).bind( "keyup", function( event ) {
				let keyCode = event.keyCode;
				let target = event.target;
				let value = target.value;
				$headerSearchInput.autocomplete( "search" );
				if( !values ) {
					if( !value ) {
						$headerSearchButton.removeClass( "disabled" );
						$headerSearchNoResults.addClass( "hidden" );
					}
				}
			}).bind( "blur", function( event ) {
				let target = event.target;
				let value = target.value;
				$headerSearchInput.autocomplete( "search" );
				$headerSearchInput.autocomplete( "close" );
				$headerSearchInput.autocomplete( "disable" );
				if( !values ) {
					if( !value ) {
						$headerSearchButton.removeClass( "disabled" );
					}
				}
				$headerSearchNoResults.addClass( "hidden" );
			});
			$headerSearchInput.autocomplete( "disable" );
			headerSearchForm.addEventListener( "submit", function( event ) {
				let value = headerSearchInput.value;
				event.preventDefault();
				$headerSearchInput.autocomplete( "enable" );
				$headerSearchInput.autocomplete( "search" );
				$headerSearchInput.autocomplete( "close" );
				$headerSearchInput.autocomplete( "disable" );
				if( matched ) {
					// found match
					__updateHash( matched );
				}
				else if( !value ) {
					$headerSearchButton.removeClass( "disabled" );
				}
			}, false );
		}
	}
};

module.exports = Header;

function __updateHash( matched ) {
	window.location = `/#/search?q={"category":"${ matched.category }","type":"${ matched.type }","value":"${ encodeURIComponent( matched.value ) }"}`;
};
