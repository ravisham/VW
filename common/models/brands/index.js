var Controller = require( "./controller" );
var Model = require( "./model" );

module.exports = function( parameters ) {
	return new Controller( new Model( parameters ) );
};
