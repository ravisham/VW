var Repository = require( "./repository" );

class ProductsController {
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
  // deprecated
  // no point in restricting products, all should be viewable
	// getDealerProducts( parameters ) {
	// 	var nav_customer_id = parameters.nav_customer_id;
	// 	var part_number = parameters.part_number;
	// 	return new Promise(function( resolve, reject ) {
	// 		Repository.getDealerProducts({
	// 			nav_customer_id: nav_customer_id,
	// 			part_number: part_number
	// 		}).then(function( products ) {
	// 			resolve( products );
	// 		}).fail(function( error ) {
	// 			reject( error );
	// 		}).done();
	// 	});
	// }
  // deprecated
  // no point in restricting products, all should be viewable
	// getDealerProductsAndSpecifications( parameters ) {
	// 	var nav_customer_id = parameters.nav_customer_id;
	// 	var part_number = parameters.part_number;
	// 	return new Promise(function( resolve, reject ) {
	// 		Repository.getDealerProductsAndSpecifications({
	// 			nav_customer_id: nav_customer_id,
	// 			part_number: part_number
	// 		}).then(function( productsAndSpecifications ) {
	// 			resolve( productsAndSpecifications );
	// 		}).fail(function( error ) {
	// 			reject( error );
	// 		}).done();
	// 	});
	// }
	createProduct(productObj) {
		return Repository.createProduct(productObj);
	}
	getItemsByProduct(productId) {
		return Repository.getItemsByProduct(productId);
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

module.exports = ProductsController;
