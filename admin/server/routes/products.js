let passport = require('passport');
let express = require('express');
let router = express.Router();

let AWS = require('aws-sdk');
let multer = require('multer');
let multerS3 = require('multer-s3');




router.get("/", function (req, res) {
	let alert = req.query.alert;
	let brands;
	let products;
	req.VWModel.findBrands({}).then(retBrands => {
		brands = retBrands;
		return req.VWModel.findProducts({});
	}).then(retproducts => {
		products = retproducts
		return req.VWModel.findItems({})
	}).then(items => {
		products = products.map(product => {
			let pItems = items.filter(item => {
				return item.product_id == product.id
			});
			product.items = pItems;
			return product;
		});
		products = products.map(product => {
			let pBrand = brands.filter(brand => {
				return product.brand_id == brand.id
			});
			product.brand = pBrand[0];
			return product;
		});
		let alert;
		console.log("products[0]", products[0]);
		res.render("productList", {
			products: products.sort((product1, product2) => {
				return `${product1.brand.name} ${product1.name}`.localeCompare(`${product2.brand.name} ${product2.name}`);
			}),
			alert: alert
		});
	}).catch(err => {
		res.render("productList", {
			err: err
		});
	});
});
router.get("/create", function (req, res) {
	renderCreateProductPage(req, res);
});
router.post("/create", function (req, res) {
	let items = [];

	let newProduct = {
		name: req.body.name,
		description: req.body.description,
		type: req.body.type,
		brand_id: req.body.brand,
		image: {
			list: []
		}
	}
	if (req.body["id[]"]) {
		items = req.body["id[]"].map(id => {
			return parseInt(id, 10);
		});
	}
	console.log("newProduct", newProduct, items);
	req.VWModel.createProduct(newProduct, items).then(product => {
		console.log(product);
		res.redirect("/products/" + product.id);
	}).catch(err => {
		console.log(err);
		renderCreateProductPage(req, res, "Error Creating Product");
	});
});

router.get("/items", function (req, res) {
	renderItemsPage(req, res)
});
router.post("/items", function (req, res) {
	console.log("req.body.action", req.body.action);

	if (req.body.action == "delete") {
		//console.log("it worked req.body.action",req.body.action);		
		let ids = req.body['id[]'];
		if (ids) {
			req.VWModel.deleteItems(ids).then(result => {
				renderItemsPage(req, res, `Items Successfully Deleted`);
			}).catch(err => {
				console.log("items_update_err", err);
				let alert = `${err} - ${Object.keys(err).map(key => { return `${key}:${err[key]}` }).join(' - ')}`;
				renderItemsPage(req, res, alert);
			});
		} else {
			renderItemsPage(req, res, "No Items Selected");
		}
	} else {
		let itemsUpdateObj = {
			id: req.body['id[]'],
			product_id: req.body.product
		}
		//console.log("itemsUpdateObj",itemsUpdateObj);

		req.VWModel.assignItemsToProduct(itemsUpdateObj.product_id, itemsUpdateObj.id).then(result => {
			renderItemsPage(req, res, "Items Associated with Product Successfully");
		}).catch(err => {
			console.log("items_update_err", err);
			let alert = `${err} - ${Object.keys(err).map(key => { return `${key}:${err[key]}` }).join(' - ')}`;
			renderItemsPage(req, res, alert);
		});
	}
});

var upload = multer({
	storage: multerS3({
		s3: s3,
		bucket: 'visionwheel',
		key: function (req, file, cb) {
			cb(null, "upload/" + Date.now() + file.originalname); //use Date.now() for unique file keys
		}
	})
});

router.get("/photos", function (req, res) {
	renderPhotosPage(req, res);
});

router.post("/photos", upload.single('photo'), function (req, res) {
	let ids = req.body.id;
	let image = req.file.location;

	req.VWModel.updateItemsPhotos(ids, image).then(result => {
		renderPhotosPage(req, res, "Items Photo Updated");
	}).catch(err => {
		console.log(err);
		renderPhotosPage(req, res, "Error Updating Photos");
	});
});


router.get("/:id", function (req, res) {
	let productID = req.params.id;
	renderProductPage(req, res, productID);
});

router.post("/:id", function (req, res) {
	let productID = req.params.id;
	if (req.body.action == "details") {
		let postData = {
			id: productID,
			name: req.body.name,
			description: req.body.description,
			brand_id: req.body.brand
		}

		console.log("postData", postData);
		req.VWModel.updateProduct(postData).then(result => {
			renderProductPage(req, res, productID, "Product Details Updated");
		}).catch(err => {
			res.render("product", {
				err: err
			});
		});
	} else if (req.body.action == "images") {
		req.VWModel.updateProductByItemImages(productID, req.body.isWheel === "true").then(result => {
			renderProductPage(req, res, productID, "Product Images Updated");
		}).catch(err => {
			console.log("err", err);
			res.render("product", {
				err: err
			});
		});
	} else if (req.body.action == "orphane") {
		console.log("req.body", req.body);
		let ids = [].concat(req.body["id[]"]).map(id => parseInt(id, 10));
		console.log("ids", ids);
		req.VWModel.assignItemsToProduct(null, ids).then(result => {
			renderProductPage(req, res, productID, "Items Updated");
		}).catch(err => {
			console.log("err", err);
			renderProductPage(req, res, productID, "Items Updated Error");
		});
	} else if (req.body.action == "delete") {
		req.VWModel.deleteProduct(productID).then(result => {
			console.log("delet product", result);
			res.redirect("/products?alert=delete");
		}).catch(err => {
			console.log("err", err);
			renderProductPage(req, res, productID, "Product Delete Error");
		});
	}
});




function renderPhotosPage(req, res, alert) {
	req.VWModel.getItemPhotoGroups().then(photoGroups => {
		res.render("photos", {
			photoGroups: photoGroups,
			alert: alert
		});
	}).catch(err => {
		console.log("err", err);
		res.render("photos", {
			err: err
		});
	});
}


function renderItemsPage(req, res, alert) {
	let products, items;
	req.VWModel.findProducts({}).then(results => {
		products = results;
		return req.VWModel.getOrphineItems();
	}).then(items => {
		res.render("items", {
			items: items.sort((item1, item2) => {
				return item1.part_number.localeCompare(item2.part_number);
			}),
			products: products.sort((product1, product2) => {
				return product1.name.localeCompare(product2.name);
			}),
			alert: alert
		});
	}).catch(err => {
		console.log("err", err);
		res.render("items", {
			err: err
		});
	});
}



function renderCreateProductPage(req, res, alert) {
	console.log("renderCreateProductPage");
	let brands;
	req.VWModel.getBrands().then(retBrands => {
		brands = retBrands;
		return req.VWModel.getOrphineItems();
	}).then(items => {
		res.render("productCreate", {
			parts: items.sort((item1, item2) => {
				return item1.part_number.localeCompare(item2.part_number);
			}),
			brands: brands,
			alert: alert
		});
	}).catch(err => {
		console.log(err);
		res.render("productCreate", {
			alert: "There was an error getting orphaned parts"
		});
	});
}

function renderProductPage(req, res, productID, alert) {
	console.log("renderProductPage", productID)
	let product;
	req.VWModel.getProductWithItems(productID)
		.then(retProduct => {
			product = retProduct;
			return req.VWModel.getBrands();
		}).then(brands => {
			res.render("product", {
				product: product,
				productId: productID,
				brands: brands.filter(brand => {
					return brand.type === product.type
				}),
				alert: alert
			});
		}).catch(err => {
			console.log("error", err);
			res.render("product", {
				alert: "Error getting product data"
			});
		});
}


module.exports = {
	Router: router
};