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
	
	console.log("Reading data file");
	let file = fs.readFileSync(path.resolve(__dirname, "../", "data", "MissingImages.csv"));
	let finisheList = parse(file, {columns:true});

	
	console.log("Filtering items");
	let filteredSearchList =  finisheList.filter(searchGroup=>{
		return searchGroup['Image 1'].length>0;
	})
	
	console.log("Searching items");
	let finishGroupSavePromises = filteredSearchList.map(finishMapObj=>{
		let searchObj = {model:finishMapObj.Model}
		if (finishMapObj.Finish.length>0)
			searchObj.finish = finishMapObj.Finish
		console.log("Searching obj", searchObj);
		return VWModel.filterItems(searchObj)
		.then(items=>{
			console.log(items.length, finishMapObj.Model, finishMapObj.Finish, "some string");
			return generateItemUpdates(items, finishMapObj);
		});
	});

	Q.allSettled(finishGroupSavePromises)
	.then(allSearches=>{
		console.log("did ",allSearches.length,"searches");
		let allItems = allSearches.reduce((result, item, i)=>{return result.concat(item.value);},[])
		console.log(allItems.length);

	}).catch(err=>{
		console.log("Error", err);
	});
	return;
});

function generateItemUpdates(items, mappingObj){
	console.log("matching items:"+items.length);
	let itemSavePromises = items.map(item=>{
		let update = {
			id: item.id,
			image: {
				list:[]
			}
		}
		if (mappingObj['Image 1']){
			update.image.list.push(mappingObj['Image 1']);	
		}
		if (mappingObj['Image 2']){
			update.image.list.push(mappingObj['Image 2']);	
		}
		console.log('Update',item.id);
		return Item.save(update);
	});
	return Q.allSettled(itemSavePromises);
}