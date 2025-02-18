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

let imgTest = /.png$|.JPG$/;
let pngTest = /.png$/;
//let imgTest = /.JPG$/;

database(settings.database, function(error, db) {
	console.log("Connected to Database");
	database = db;
	VWModel = require('models');
	Item = require("models/public/item");

	console.log("Get all items");
	return Item.find({}).then(results=>{
		let updateable = results.filter(item=>{
			if (item.image.list) {
				let list = item.image.list.filter(img=>{
					if (imgTest.test(img)){
						return true
					}
				});
				return list.length>0;
			} else {
				return imgTest.test(item.image);
			}
		});
		return updateable;
	}).then(updateAbleItems=>{
		console.log("how many",updateAbleItems.length);
		// let htmlStr='';
		// updateAbleItems.forEach(item=>{
		// 	item.image.list.forEach(img=>{
		// 		let newImage = img.replace(imgTest,'.jpg');
		// 		htmlStr+=`<img src='${newImage}' /> \n`;	
		// 	});
		// });
		// return fs.writeFileSync('test.html', htmlStr, 'utf8');
		let itemUpdates =  updateAbleItems.map(generateItemUpdate);
		return Q.allSettled(itemUpdates);
	}).then(results=>{
		return console.log("results",results);
	}).catch(err=>{
		return console.log("Error", err);
	});
});

function generateItemUpdate(item){
	let update = {
		id: item.id,
		image: {
			list:[]
		}
	}
	item.image.list.map(img=>{
		let newImage = img.replace(imgTest,'.jpg');
		
		console.log(`<img src='${newImage}' />`);	
		
		update.image.list.push(newImage);
	});
	
	return Item.save(update).then(res=>{
		console.log("saved",res);
	});
	
}