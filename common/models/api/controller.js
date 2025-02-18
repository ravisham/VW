var Repository = require( "./repository" );

class ApiController {
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
	getProducts() {
		return new Promise(function( resolve, reject ) {
			Repository.getProducts().then(function( products ) {
				resolve( products );
			}).fail(function( error ) {
				reject( error );
			}).done();
		});
	}
};

module.exports = ApiController;