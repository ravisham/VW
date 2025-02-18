var _ = require("underscore"),
	Q = require("q"),
	searchFinishes = require("config/settings/searchFinishes"),
	debug = require("libs/buglog"),
	MSSQL = require("libs/mssql"),
	Item = require("models/public/item"),
	log = debug("models", "items", "repository"),
	searchFinishKeys = Object.keys(searchFinishes);

module.exports = {
	extend: function (target, values) {
		return _.extend(target, values);
	},
	getPopularItems: _ => {
		return Item.getPopularItems();
	},
	getItemsByProduct: productId => {
		return Item.findByProductId(productId);
	},
	getByVendorPartNumber: partNum => {
		return Item.findByVendorPartNumber(partNum);
	},
	getDealerItemPricing: function (parameters) {
		console.log('Repository.getDealerItemPricing initializing');
		var deferred = Q.defer();
		var that = this;
		var nav_customer_id = parameters.nav_customer_id;
		var part_number = parameters.part_number;
		//console.log('MULTIPLIER PARAMETER', (parameters.multiplier) ? 'is set' : 'is NOT set');
		var multiplier = parameters.multiplier || 1; // This handles price multiplier for homepage and filters, but NOT cart and checkout related pages
		//if ( multiplier !== 1 ) console.log('items/repository.js - getDealerItemPricing - price multiplied by : ', multiplier);
		var MAX_TIME = 20;
		var timer = setTimeout(function () {
			deferred.reject(new Error('items.Repository.getDealerItemPricing ERROR TIMEOUT - took more than ' + MAX_TIME + ' seconds. Rejecting.'));
		}, MAX_TIME * 1000);

		MSSQL.getDealerItems({
			nav_customer_id: nav_customer_id,
			part_number: part_number
		}).then(function (itemPricing) {
      clearTimeout(timer)
      console.log("items.Repository.getDealerItemPricing then")
      var itemPricingArray = []

      if (!Array.isArray(itemPricing) || itemPricing.length < 1) {
        deferred.reject(new Error("ProductSearchFailure"))
      } else {
        itemPricing.forEach(function (itm, index, array) {
          var price = itm.price
          //if ( multiplier !== 1 ) console.log('items/repository.js - itemPricing.forEach - ',price, ' x ', multiplier);
          itm.origPrice = price
          itm.price = __parseDecimalPricing(price * multiplier)
          //   if (itm.part_number === "INSTALL-KIT") {
          //     itm.price = "0.00"
          //   }
          itemPricingArray.push(itm)
        })
        deferred.resolve(itemPricingArray)
      }
		}).fail(function (error) {
			clearTimeout(timer);
			console.log('items.Repository.getDealerItemPricing fail');
			deferred.reject(error);
		}).done(function () {
			console.log('items.Repository.getDealerItemPricing done');
		});
		return deferred.promise;
	},
	getDealerItems: function (parameters) {
		var start = new Date().getTime();
		console.log('items.Repository.getDealerItems - initializing 1');
		var deferred = Q.defer();
		var that = this;
		var nav_customer_id = parameters.nav_customer_id;
		var part_number = parameters.part_number;
		var multiplier = parameters.multiplier || 1;
		var progress = "start";
		var MAX_TIME = 25;
		var timer = setTimeout(function () {
			console.log('Rejecting');
			deferred.reject(new Error('items.Repository.getDealerItems ERROR TIMEOUT - took more than ' + MAX_TIME + ' seconds. Reached ' + progress + '. Rejecting.'));
		}, MAX_TIME * 1000);

		that.getDealerItemPricing({
			nav_customer_id: nav_customer_id,
			part_number: part_number,
			multiplier
		}).then(function (itemPricing) {
			progress = "then 1";
			console.log('items.Repository.getDealerItems - then 1 after ' + (new Date().getTime() - start) + 'ms');
			var itemsObj = {};
			var validPartNumbers = [];

            // console.log('items obj',itemPricing);
			console.log('items.Repository.getDealerItems - found', itemPricing.length, 'items', 'after ' + (new Date().getTime() - start) + 'ms');
			itemPricing.forEach(function (itm, index, array) {
				var partNumber = itm.part_number;
				var price = itm.price;
				var xref = itm.xref;
				itemsObj[partNumber] = {
					xref: xref,
					price: price,
					origPrice: itm.origPrice
				};
				validPartNumbers.push(partNumber);
			});
			console.log('items.Repository.getDealerItems - initializing 2 after ' + (new Date().getTime() - start) + 'ms');
			that.getItemDetails({
				nav_customer_id: nav_customer_id,
				part_number: validPartNumbers
			}).then(function (itemDetails) {
				progress = "then 2";
				clearTimeout(timer);
				console.log('items.Repository.getDealerItems - then 2 after ' + (new Date().getTime() - start) + 'ms');
				var itemDetailsArray = [];
				itemDetails.forEach(function (itemDetail, index, array) {
					var partNumber = itemDetail.part_number;
					itemDetailsArray.push(_.extend({}, itemDetail, itemsObj[partNumber]));
				});
				deferred.resolve(itemDetailsArray);
			}).catch(function (error) {
				clearTimeout(timer);
				console.log('items.Repository.getDealerItems ERROR - catch 2 after ' + (new Date().getTime() - start) + 'ms');
				deferred.reject(error);
			});
		}).fail(function (error) {
			clearTimeout(timer);
			console.log('items.Repository.getDealerItems - ERROR fail 1 after ' + (new Date().getTime() - start) + 'ms');
			deferred.reject(error);
		}).done(function () {
			console.log('items.Repository.getDealerItems - done 1 after ' + (new Date().getTime() - start) + 'ms');
		});
		return deferred.promise;
	},
	getItemDetailsWithProductsBrands: (id) => {
		return Item.findItemWithProductBrand(id).then(function (itemDetails) {
      var itemDetailsArray = []
      //   console.log(itemDetails, "ID FOUND")
      itemDetails.forEach(function (itemDetail, index, array) {
        var partNumber = itemDetail.part_number
        var price = itemDetail.price
        var productId = itemDetail.product_id
        var specification = itemDetail.specification
        if (productId && specification) {
          itemDetailsArray.push(itemDetail)
        }
        // else if (itemDetail.part_number === "INSTALL-KIT") {
        //   itemDetailsArray.push(itemDetail)
        // }
      })
      return itemDetailsArray
    })
	},
	getItemDetails: function (parameters) {
		var start = new Date().getTime();
		var deferred = Q.defer();
		var id = parameters.id;
		var nav_customer_id = parameters.nav_customer_id;
		var part_number = parameters.part_number;
		var MAX_TIME = 20;
		var timer = setTimeout(function () {
			deferred.reject(new Error('items.Repository.getItemDetails ERROR TIMEOUT - took more than ' + MAX_TIME + ' seconds. Rejecting.'));
		}, MAX_TIME * 1000);
		console.log('items.Repository.getItemDetails - initializing');
		Item.find({
			id: id,
			nav_customer_id: nav_customer_id,
			part_number: part_number
		}).then(function (itemDetails) {
			clearTimeout(timer);
			console.log('items.Repository.getItemDetails - then after ' + (new Date().getTime() - start) + 'ms');
			var itemDetailsArray = [];
			itemDetails.forEach(function (itemDetail, index, array) {
				var partNumber = itemDetail.part_number;
				var price = itemDetail.price;
				var productId = itemDetail.product_id;
				var specification = itemDetail.specification;
				if (productId && specification) {
					itemDetailsArray.push(itemDetail);
				}
			});
			deferred.resolve(itemDetailsArray);

		}).fail(function (error) {
			clearTimeout(timer);
			console.log('items.Repository.getItemDetails ERROR - fail after ' + (new Date().getTime() - start) + 'ms');
			deferred.reject(error);
		}).done();
		return deferred.promise;
	},
	getItemSpecifications: function (parameters) {
		var brands = parameters.brands;
		var items = parameters.items;
		var products = parameters.products;
		var labels = {
			accessory: {
				brand: {
					label: "Type",
					type: "radio"
				},
				finish: {
					label: "Finish",
					type: "checkbox"
				},
				size: {
					label: "Size",
					type: "checkbox"
				}
			},
			tire: {
				brand: {
					label: "Type",
					type: "checkbox"
				},
				search_description: {
					label: "Size",
					type: "checkbox"
				},
				model: {
					label: "Pattern",
					type: "checkbox"
				},
				ply: {
					label: "Ply",
					type: "range"
				}
			},
			wheel: {
				brand: {
					label: "Brand",
					type: "checkbox"
				},
				boltpattern: {
					label: "Bolt Pattern",
					type: "checkbox"
				},
				boltpattern1: {
					label: "Bolt Pattern 1",
					type: "checkbox"
				},
				boltpattern2: {
					label: "Bolt Pattern 2",
					type: "checkbox"
				},
				diameter: {
					label: "Diameter",
					type: "range"
				},
				width: {
					label: "Width",
					type: "range"
				},
				finish: {
					label: "Finish",
					type: "checkbox"
				},
				offset: {
					label: "Offset",
					type: "range"
				},
				backspace: {
					label: "Backspace",
					type: "range"
				}
			}
		};
		var specifications = {
			filter: {},
			search: {
				brand: [],
				model: [],
				part_number: [],
				xref: []
			}
		};
		var brandsObj = {};
		var productsObj = {};
		var uniqueSpecifications = {};
		var finishAliases = {};
		brands.forEach(function (brand, index, array) {
			var brandId = brand.id;
			brandsObj[brandId] = brand;
		});
		products.forEach(function (product, index, array) {
			var productId = product.id;
			productsObj[productId] = product;
		});
		searchFinishKeys.forEach(function (searchFinishKey, index, array) {
			var searchFinish = searchFinishes[searchFinishKey];
			searchFinish.forEach(function (finish, index, array) {
				let finishLowerCase = finish.toLowerCase();
				if (!finishAliases[finishLowerCase]) {
					finishAliases[finishLowerCase] = searchFinishKey;
				}
			});
		});
		Object.keys(labels).forEach(function (category, index, array) {
			var labelCategory = labels[category];
			specifications.filter[category] = {};
			uniqueSpecifications[category] = {};
			Object.keys(labelCategory).forEach(function (property, index, array) {
				var label = labelCategory[property].label;
				var type = labelCategory[property].type;
				specifications.filter[category][property] = {
					aliases: {},
					label: label,
					type: type,
					values: []
				};
				uniqueSpecifications[category][property] = {};
			});
			Object.keys(specifications.search).forEach(function (property, index, array) {
				if (!uniqueSpecifications[category][property]) {
					uniqueSpecifications[category][property] = {};
				}
			});
		});
		items.forEach(function (item, index, array) {
			var itemPartNumber = item.part_number;
			var itemXref = item.xref;
			var itemProductId = item.product_id;
			var itemType = item.type;
			var itemTypeSpecifications = specifications.filter[itemType];
			var itemTypeUniqueSpecifications = uniqueSpecifications[itemType];
			var product = productsObj[itemProductId];
			var productName = product.name;
			var productBrandId = product.brand_id;
			var brand = brandsObj[productBrandId];
			var brandName = brand.name;
			if (itemPartNumber && !itemTypeUniqueSpecifications.part_number[itemPartNumber]) {
				itemTypeUniqueSpecifications.part_number[itemPartNumber] = true;
				specifications.search.part_number.push({
					category: itemType,
					type: "part_number",
					value: itemPartNumber
				});
			}
			if (itemXref && !itemTypeUniqueSpecifications.xref[itemXref]) {
				itemTypeUniqueSpecifications.xref[itemXref] = true;
				specifications.search.xref.push({
					category: itemType,
					type: "xref",
					value: itemXref
				});
			}
			if (!itemTypeUniqueSpecifications.brand[brandName]) {
				itemTypeUniqueSpecifications.brand[brandName] = true;
				if ( !brand.disabled ) {
					specifications.search.brand.push({
						category: itemType,
						type: "brand",
						value: brandName
					});
					if (itemTypeSpecifications.brand) {
						itemTypeSpecifications.brand.values.push(brandName);
					}
				}
			}
			if (!itemTypeUniqueSpecifications.model[productName]) {
				itemTypeUniqueSpecifications.model[productName] = true;
				specifications.search.model.push({
					category: itemType,
					type: "model",
					value: productName
				});
				if (itemTypeSpecifications.model) {
					itemTypeSpecifications.model.values.push(productName);
				}
			}
			for (var key in itemTypeSpecifications) {
				let specificationLabel = labels[itemType][key];
				switch (key) {
					case "boltpattern":
						let boltpatterns = [item.specification["boltpattern1"], item.specification["boltpattern2"]];
						boltpatterns.forEach(function (boltpattern, index, array) {
							if (boltpattern && !itemTypeUniqueSpecifications[key][boltpattern]) {
								itemTypeUniqueSpecifications[key][boltpattern] = true;
								itemTypeSpecifications[key].values.push(boltpattern);
							}
						});
						break;
					case "finish":
						let finish = item.specification[key];
						if (!finish) {
							finish = "Unfinished";
						}
						let finishLowerCase = finish.toLowerCase();
						let hasAlias = finishAliases[finishLowerCase] ? true : false;
						if (!itemTypeSpecifications[key].aliases[finish]) {
							itemTypeSpecifications[key].aliases[finish] = hasAlias ? finishAliases[finishLowerCase] : finish;
						}
						if (hasAlias) {
							finish = finishAliases[finishLowerCase];
						}
						if (finish && !itemTypeUniqueSpecifications[key][finish]) {
							itemTypeUniqueSpecifications[key][finish] = true;
							itemTypeSpecifications[key].values.push(finish);
						}
						break;
					default:
						let specification = item.specification[key];
						if (specification && !itemTypeUniqueSpecifications[key][specification]) {
							itemTypeUniqueSpecifications[key][specification] = true;
							itemTypeSpecifications[key].values.push(specification);
						}
						break;
				}
			}
		});
		Object.keys(specifications.filter).forEach(function (category, index, array) {
			let categorySpecifications = specifications.filter[category];
			Object.keys(categorySpecifications).forEach(function (specification, index, array) {
				let categorySpecification = categorySpecifications[specification];
				let categorySpecificationValues = categorySpecification.values;
				switch (specification) {
					case "backspace":
					case "diameter":
					case "offset":
					case "ply":
					case "width":
						categorySpecificationValues.sort(function (a, b) {
							return a - b;
						});
						break;
					default:
						categorySpecificationValues.sort();
						break;
				}
			});
		});
		return specifications;
	},
	getOrphinedItems: _ => {
		log("getOrphinedItems");
		return Item.getOrphinedItems();
	},
	assignItemsToProduct: (productId, items) => {
		let updateObj = {
			id: items,
			product_id: productId
		}
		console.log("assignItemsToProduct", updateObj);
		return Item.updateItemProduct(items, productId)
		//return Item.save(updateObj);
	}
};

function __parseDecimalPricing(pricing) {
	return parseFloat(Math.round(pricing * 100) / 100).toFixed(2);
};
