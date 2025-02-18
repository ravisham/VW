let parse = require('csv-parse/lib/sync');
let path = require('path');
let fs = require('fs');
let program = require('commander');
let config = require('config');
let database = require("libs/db");
let Q = require("q");
let settings = {};
let configEnv = config.settings('config/env');
	settings = config.mergeSettingsDefault(configEnv, program);
let VWModel;
let Item;

database(settings.database, function(error, db) {
	console.log("Connected to Database");
	database = db;
	VWModel = require('models');
	Product = require("models/public/product");
	
	console.log("Getting Items");
	Product.find({}).then(products=>{
		console.log(products.length);
		//generate image updates
		return products.reduce((acc,product,i)=>{
			let update = {
				id:product.id,
				logo:null,
				image:{
					list:[]
				}
			}
			if (typeof(product.logo)==="string") {
				update.logo = product.logo.replace(/^http:/, "https:");
			}
			if (product.image && product.image.list) {
				update.image.list = product.image.list.map(img=>{
					if (typeof(img)==="object"&&typeof(img.src)==="string") {
						img.src = img.src.replace(/^http:/, "https:");
						return img;
					} else if (typeof(img)==="string"){
						return img.replace(/^http:/, "https:")		
					} else {
						return img;
					}
				});
			}
			let promise=Product.save(update)
			acc.push(promise);
			return acc;
		}, []);
	}).then(updates=>{
		console.log(updates);
		console.log(updates.length);
		//console.log(updates[2].image);
		return Q.allSettled(updates);
	}).then(results=>{
		console.log("did ",results.length,"updates");
	}).catch(e=>{
		console.log(e);
	});
	
	
	
	

	// Q.allSettled(finishGroupSavePromises)
	// .then(allSearches=>{
	// 	console.log("did ",allSearches.length,"searches");
	// 	let allItems = allSearches.reduce((result, item, i)=>{return result.concat(item.value);},[])
	// 	console.log(allItems.length);

	// }).catch(err=>{
	// 	console.log("Error", err);
	// });
	
});