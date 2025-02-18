"use strict";
var path            = require('path'),
	parse = require('csv-parse/lib/sync'),
	fs = require('fs');

let locationKey = {
	"AL" : "35603",
	"CA" : "92879",
	"IN" : "46368",
	"TX" : "75019"
}

console.log("starting to load the data!!");
//get that data
let serviceZones;
let shippingMatrix;

(_=>{ //get and filter the services zones, only need a few of them
	let serviceZonesRaw =  fs.readFileSync(path.resolve(__dirname, "data", "freight_zones.csv"));
	let fullServiceZones = parse(serviceZonesRaw, {columns:true});
	serviceZones  = fullServiceZones.filter(sz=>{
			return sz['Service Indicator']==='03'
	});
	//just testing if there is a zone 7  in the fitlererd list
	// serviceZones.filter((sz, i)=>{
	// 	if (sz['Zone']==7) {
	// 		console.log("found:",i);
	// 	}
	// 	return true;
	// });

	let shippingMatrixRaw = fs.readFileSync(path.resolve(__dirname, "data", "shipping_matrix.csv"));
	shippingMatrix = parse(shippingMatrixRaw, {columns:true});
})();

console.log("==========================");
console.log("serviceZones", serviceZones[0]);
console.log("==========================");
console.log("shippingMatrix", shippingMatrix[0]);


// So what do we need.. calculate shipping per item/location
let getServiceZone = (fromZip, toZip) => {
	let frm =  fromZip.substring(0,2);
	let to = toZip.substring(0,2);
	let sz = serviceZones.filter(sz=>{
			return  to >= sz['To Min Code'].substring(0,2) && to <= sz['To Max Code'].substring(0,2) && frm >= sz['From Min Code'].substring(0,2) && frm <= sz['From Max Code'].substring(0,2)
	})[0];
	return sz?sz:serviceZones[91]; //set a default service zone of 7 if no match is found
}
let getWheelShippingCosts = (zone, size) => {
	let row = shippingMatrix.filter(sm=>{
			let sizes = sm.Diameter.split('-');
			let sizeMin = sizes[0].match(/\d/g).join('');
			let sizeMax = sizes[1].match(/\d/g).join('');
			return  zone == sm.zone && size>=sizeMin && size<=sizeMax;
	})[0];
	return {
		qtyPerPackage : row['Qty per package'],
		pricePerPackage : Number(row['Frt per Pkg'].replace(/[^0-9\.]+/g,""))
	}

}

let buildResponse = (code, body)=>{
	var response = {
        "statusCode": code,
        "headers": {},
        "body": JSON.stringify(body)    // body must be returned as a string
    };
    console.log("response: " + JSON.stringify(response))
    return response;
}

exports.handler = function(event, context, callback) {
	let orders = JSON.parse(event.body);
	console.log("this is the data I got", orders);
	if (!orders){
		return context.succeed(buildResponse(500,{"error":"no data sent to service"}));
	}
	let returnData = {};
	orders.forEach((order, i)=>{
		let totalCost = 0;
		let zoneItem;
		let zone;
		let fromZip = locationKey[order.from];
		if (!fromZip) {
		   	return context.succeed(buildResponse(500,{"error":"invalid 'from' key"}));
		}
		zoneItem = getServiceZone(order.to, fromZip);
		if (!zoneItem) {
		   	return context.succeed(buildResponse(500,{"error":"cannot get a zone from "+order.from+" and "+order.to}));
		}
		zone = zoneItem.Zone;
		console.log("order", i, "Zone", zone);

		order.items.forEach(item=>{
			if (item.type==="accessory") {
				totalCost += item.qty<=16?8.50:(item.qty*.53);
			} else if (item.type==="accessoryLug") {
				totalCost += item.qty<=94?8.50:(item.qty*.09);
			} else if (item.type==="wheel"||item.type==="tire") {
				let shippingConfig = getWheelShippingCosts(zone, item.size);
				let packagesNeeded = Math.ceil(item.qty/shippingConfig.qtyPerPackage);
				totalCost += (packagesNeeded*shippingConfig.pricePerPackage);	
				console.log("shipping", shippingConfig, "total", totalCost);
			} else {
				return context.succeed(buildResponse(500,{"error":"invalid 'type' for item"}));		
			}
		});
		returnData[order.from] = {totalCost:totalCost};
	});

	let response = buildResponse(200,returnData);
   	context.succeed(response);
}
