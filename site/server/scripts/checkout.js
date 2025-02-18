let React = require( "react" );
let ReactDOM = require( "react-dom" );
let common = require( "./components/common" );
let CheckoutComponent = require( "./components/checkout" );
require( "../styles/checkout.scss" );
require( "../images/img/vision-wheel-logo-icon.png" );
require( "../images/svg/ErrorIcon-01.svg" );
(function()
{
	console.log( "===== Closure =====" );
	common();
	window.addEventListener( "DOMContentLoaded", function( event )
	{
		console.log( "===== DOMContentLoaded =====" );
		let main = document.getElementById( "main" );
		let props = document.getElementById( "props" );
		let cart = JSON.parse( props.getAttribute( "cart" ) );
		let warehouses = JSON.parse( props.getAttribute( "warehouses" ) );
		let shippingOptions = JSON.parse( props.getAttribute( "shippingOptions" ) );
		let user = JSON.parse( props.getAttribute( "user" ));
		ReactDOM.render( <CheckoutComponent cart={ cart } warehouses={ warehouses } user={ user } shippingOptions={ shippingOptions } />, main );
		console.log( "===== /DOMContentLoaded =====" );
	}, false );
	window.addEventListener( "load", function( event ) {
		console.log( "===== Load =====" );
		console.log( "===== /Load =====" );
	}, false );
	console.log( "===== /Closure =====" );
})();
