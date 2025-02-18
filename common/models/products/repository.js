var _ = require( "underscore" ),
		Q = require( "q" ),
		debug = require( "libs/buglog" ),
		Product = require( "models/public/product" ),
		log = debug( "models", "products", "repository" );

module.exports = {
	createProduct: productData=>{
		return Product.save(productData);
	},
	getProducts: function() {
		var deferred = Q.defer();
		Product.find().then(function( prdcts ) {
			deferred.resolve( prdcts );
		}).fail(function( error ) {
			deferred.reject( error );
		}).done();
		return deferred.promise;
	}
};

// function __appendItemsToProducts( uniqueProducts, prdcts ) {
// 	prdcts.forEach(function( prdct, index, array ) {
// 		var prdctId = prdct.id;
// 		prdct.items = uniqueProducts[prdctId].items;
// 	});
// 	return prdcts;
// };

// function __getUniqueProducts( itms ) {
// 	var uniqueProducts = {};
// 	itms.forEach(function( itm, index, array ) {
// 		var productId = itm.product_id;
// 		if( !uniqueProducts[productId] ) {
// 			uniqueProducts[productId] = {
// 				items: []
// 			};
// 		}
// 		uniqueProducts[productId].items.push( itm );
// 	});
// 	return uniqueProducts;
// };
