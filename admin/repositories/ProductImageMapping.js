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


console.log("Connecting to Database");
database(settings.database, function(error, db) {
	console.log("Connected to Database");
	database = db;
	VWModel = require('models');
	Product = require("models/public/product");
	Item = require("models/public/item");
	
	console.log("Reading data file");
	let file = fs.readFileSync(path.resolve(__dirname, "../", "data", "MissingImages.csv"));
	let finisheList = parse(file, {columns:true});
	
	console.log("Filtering searchGroup");
	let filteredSearchList =  finisheList.filter(searchGroup=>{
		return searchGroup['Image 1'].length>0;
	});

	let productNames = filteredSearchList.map(search=>{return search.Model;})
	productNames= productNames.filter((item, i)=>{
		return productNames.indexOf(item) == i;
	});


	Product.find({name:productNames})
	.then(products=>{
		console.log("got products", products.length);		
		let productUpdates = products.map(updateProductPhotos);
		return Q.allSettled(productUpdates);
	})
	.then(results=>{
		console.log('finished');
	})
	.catch(err=>{
		console.log(err);
	});
});

function updateProductPhotos(product) {
	return Item.find({id:product.items.list})
	.then(items=>{
		//console.log(product.name);
		let imagelist;
		//Wheels need a [{ finish: '', src:'' }] format for images, everything else is ['']
		if (product.type==='wheel') {
			let ImageHash = items.reduce((result, item, i)=>{
				let finish = item.specification.finish;
				let imgSrc = item.image.list[0];
				if (imgSrc && imgSrc.length>0)
					result[finish] = imgSrc;
				return result;
			}, {});
			imagelist = Object.keys(ImageHash).map(key=>{
				if (ImageHash[key]==undefined) {
					console.log('======================',product.name, key);
				}
				return {src: ImageHash[key], finish: key}
			});
		} else {
			let ImageHash = items.reduce((result, item, i)=>{
				let imgSrc = item.image.list[0];
				if (imgSrc && imgSrc.length>0)
					result[imgSrc] = imgSrc;
				return result;
			}, {});
			imagelist = Object.keys(ImageHash);
		}
		
		let update = {
			id:product.id,
			image: {
				list: imagelist
			}
		}
		console.log("generated update", imagelist);
		return Product.save(update);
	});
}
