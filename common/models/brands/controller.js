var Repository = require( "./repository" );

class BrandsController {
	constructor( Model ) {
		this.getErrors = this.getErrors.bind( this, Model.errors );
		this.getProps = this.getProps.bind( this, Model.props );
	}
	getErrors( errors ) {
		return errors;
	}
	getProps( props ) {
		return props;
	}
	getBrands() {
		return new Promise(function( resolve, reject ) {
			Repository.getBrands().then(function( brands ) {
				resolve( brands );
			}).fail(function( error ) {
				reject( error );
			}).done();
		});
	}
};

module.exports = BrandsController;
