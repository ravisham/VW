var _ = require( "underscore" ),
		Q = require( "q" ),
		debug = require( "libs/buglog" ),
		Brand = require( "models/public/brand" ),
		log = debug( "models", "brands", "repository" );

module.exports = {
	getBrands: function() {
		var deferred = Q.defer();
		Brand.find().then(function( brnds ) {
			deferred.resolve( brnds );
		}).fail(function( error ) {
			deferred.reject( error );
		});
		return deferred.promise;
	}
};
