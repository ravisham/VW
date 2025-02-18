var React = require( "react" );
var ReactDOM = require( "react-dom" );
var common = require( "./components/common" );
var HomeDispatcher = require( "./components/home/dispatcher" );
require( "../styles/home.scss" );
require( "../images/img/hero-image-1.jpg" );
(function() {
	console.log( "===== Closure =====" );
	
	var Dispatcher = new HomeDispatcher();
	common();
	Dispatcher.initialize();
	// Dispatcher.renderFilter();
	// Dispatcher.renderResults();
	window.addEventListener( "DOMContentLoaded", function( event ) {
		console.log( "===== DOMContentLoaded =====" );
		console.log( "===== /DOMContentLoaded =====" );
	}, false );
	window.addEventListener( "load", function( event ) {
		console.log( "===== Load =====" );
		console.log( "===== /Load =====" );
	}, false );
	console.log( "===== /Closure =====" );
})();
