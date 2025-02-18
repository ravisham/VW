var Repository = require("./repository");

class ItemsController {
	constructor(Model) {
		this.getErrors = this.getErrors.bind(this, Model.errors);
		this.getProps = this.getProps.bind(this, Model.props);
	}
	getErrors(errors) {
		return errors;
	}
	getProps(props) {
		return props;
	}
	getPopularItems() {
		return Repository.getPopularItems();
	}
	getDealerItems(parameters) {
		var start = new Date().getTime();
		var nav_customer_id = parameters.nav_customer_id;
		var part_number = parameters.part_number;

		var multiplier = parameters.multiplier || 1;
		//if ( multiplier !== 1 ) console.log('items/controller.js - getDealerItems - price multiplied by : ', multiplier);
		console.log('ItemsController.getDealerItems - initializing');
		return new Promise(function (resolve, reject) {
			Repository.getDealerItems({
				nav_customer_id: nav_customer_id,
				part_number: part_number,
				multiplier
			}).then(function (items) {
				console.log('ItemsController.getDealerItems - then after ' + (new Date().getTime() - start) + 'ms');
				resolve(items);
			}).fail(function (error) {
				console.log('ItemsController.getDealerItems ERROR - failafter ' + (new Date().getTime() - start) + 'ms');
				reject(error);
			}).done(function () {
				console.log('ItemsController.getDealerItems - done after ' + (new Date().getTime() - start) + 'ms');
			});
		});
	}
	getOrphinedItems() {
		return Repository.getOrphinedItems();
	}
	getItemsByProduct(productId) {
		return Repository.getItemsByProduct(productId);
	}
	getByVendorPartNumber(partNum) {
		return Repository.getByVendorPartNumber(partNum);
	}
	assignItemsToProduct(productId, items) {
		//console.log("assignItemsToProduct");
		return Repository.assignItemsToProduct(productId, items);
	}
	// deprecated
	// cannot get complete specifications without products or brands
	// getDealerItemsAndSpecifications( parameters ) {
	// 	var that = this;
	// 	var nav_customer_id = parameters.nav_customer_id;
	// 	var part_number = parameters.part_number;
	// 	return new Promise(function( resolve, reject ) {
	// 		that.getDealerItems({
	// 			nav_customer_id: nav_customer_id,
	// 			part_number: part_number
	// 		}).then(function( items ) {
	// 			var specifications = Repository.getItemSpecifications({
	// 				items: items
	// 			});
	// 			resolve({
	// 				items: items,
	// 				specifications: specifications
	// 			});
	// 		}).catch(function( error ) {
	// 			console.log( error );
	// 			reject( error );
	// 		});
	// 	});
	// }
	getCartItemsByIdWithProductsBrands(parameters) {
    // console.log(parameters, "ITEMS BEING PASSED TO GET PRODUCTS")
    let id = parameters.id
    let user = parameters.user
    let multiplier = user.pricing_multiplier || 1 // This handles price multiplier for cart and checkout related pages
    let nav_customer_id = parameters.nav_customer_id
    let itemDetailsObj = {}

    // id.forEach((partNumber, index) => {
    //   if (partNumber === "INSTALL-KIT") {
    //     id.splice(index, 1)
    //     // That's install kit's id in postgres
    //     id.push("238488")
    //   }
    // })

    return Repository.getItemDetailsWithProductsBrands(id)
      .then(function (itemDetails) {
        // console.log("getCartItemsByIdWithProductsBrands itemDetails", itemDetails)
        var part_number = []
        itemDetails.forEach(function (itemDetail, index, array) {
          var partNumber = itemDetail.part_number
          itemDetailsObj[partNumber] = itemDetail
          part_number.push(partNumber)
        })
        //if ( multiplier !== 1 ) console.log('items/controller.js - getCartItemsByIdWithProductsBrands - price multiplied by : ', multiplier);
        return Repository.getDealerItemPricing({
          nav_customer_id: nav_customer_id,
          part_number: part_number,
          multiplier
        })
      })
      .then(function (itemPricing) {
        var items = []
        itemPricing.forEach(function (pricing, index, array) {
          var partNumber = pricing.part_number
          var price = pricing.price
          var origPrice = pricing.origPrice.toFixed(2)
          var xref = pricing.xref
          var itemDetail = itemDetailsObj[partNumber]
          items.push(
            Repository.extend(itemDetail, {
              xref: xref,
              price: price,
              origPrice
            })
          )
        })
        return items
      })
  }
	getDealerItemsById(parameters) {
		var id = parameters.id;
		var nav_customer_id = parameters.nav_customer_id;
		var multiplier = parameters.multiplier || 1;
		console.log('items controller getDealerItemsById',parameters);
		//if ( multiplier !== 1 ) console.log('items/controller.js - getDealerItemsById - price multiplied by : ', multiplier);
		return new Promise(function (resolve, reject) {
			Repository.getItemDetails({
				id: id,
				nav_customer_id: nav_customer_id,
				multiplier
			}).then(function (itemDetails) {
				console.log("getDealerItemsById itemDetails", itemDetails);
				var itemDetailsObj = {};
				var part_number = [];
				itemDetails.forEach(function (itemDetail, index, array) {
					var partNumber = itemDetail.part_number;
					itemDetailsObj[partNumber] = itemDetail;
					part_number.push(partNumber);
				});
				console.log('items controller part num',part_number);
				//if ( multiplier !== 1 ) console.log('items/controller.js - getDealerItemsById (Promise) - price multiplied by : ', multiplier);
				Repository.getDealerItemPricing({
					nav_customer_id: nav_customer_id,
					part_number: part_number,
					multiplier
				}).then(function (itemPricing) {
					var items = [];
					itemPricing.forEach(function (pricing, index, array) {
						var partNumber = pricing.part_number;
						var price = pricing.price;
						var xref = pricing.xref;
						var itemDetail = itemDetailsObj[partNumber];
						items.push(Repository.extend(itemDetail, {
							xref: xref,
							price: price
						}));
					});
					resolve(items);
				}).fail(function (error) {
					reject(error);
				}).done();
			}).fail(function (error) {
				reject(error);
			}).done();
		});
	}
	getItemSpecifications(parameters) {
		var brands = parameters.brands;
		var items = parameters.items;
		var products = parameters.products;
		return Repository.getItemSpecifications({
			brands: brands,
			items: items,
			products: products
		});
	}
};

module.exports = ItemsController;
