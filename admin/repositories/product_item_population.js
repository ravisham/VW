let program = require('commander');
let config = require('config');
let database = require("libs/db");
let Q = require("q");
let settings = {};
let configEnv = config.settings('config/env');
	settings = config.mergeSettingsDefault(configEnv, program);
let VWModel;
let Item;

console.log("Connecting to Database");
database(settings.database, function(error, db) {
	console.log("Connected to Database");
	database = db;
	VWModel = require('models');
	Item = require("models/public/item");
	Product = require("models/public/product");

	// Product.find({}).then(products=>{
	// 	let productSaves = products.map(product=>{
	// 		console.log(product.name);
	// 		let update = {
	// 			id : product.items.list,
	// 			product_id : product.id
	// 		}
	// 		console.log(update);
	// 		return Item.save(update);	
	// 	});
	// 	return Q.allSettled(productSaves);
	// }).then(result=>{
	// 	console.log('done', result);
	// }).catch(err=>{
	// 	console.log('err', err)		
	// })
	Item.find({"product_id":null}).then(items=>{
		console.log("items", items.length);
	}).catch(err=>{
		console.log(err)
	});

	// console.log('connected')
	return;
});


