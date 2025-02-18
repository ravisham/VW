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
	Item = require("models/public/item");
	
	console.log("Getting Items");
	Item.find({}).then(items=>{
		console.log(items.length);
		//generate image updates
		return items.reduce((acc,item)=>{
			//do they need need to be updated?
			if (item.image && item.image.list && item.image.list.length>0) {
				let update = {
					id:item.id,
					image:{
						list:[]
					}
				}
				update.image.list = item.image.list.map(img=>{
					return img.replace(/^http:/, "https:")
				});
				let promise=Item.save(update)
				acc.push(promise);
			} 
			return acc;
		}, []);
	}).then(updates=>{
		console.log(updates);
		console.log(updates.length);
		//console.log(updates[0].image);
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