var Header = require( "./header" );
var handleModal = require( "./handleModal" );

var common = function() {
	console.log("common");
	Header.handleSearch();
	handleModal();
};

module.exports = common;
