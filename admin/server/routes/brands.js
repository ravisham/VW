let passport = require('passport');
let express = require('express');
let router = express.Router();

let AWS = require('aws-sdk');
let multer = require('multer');
let multerS3 = require('multer-s3');

var upload = multer({
	storage: multerS3({
		s3: s3,
		bucket: 'visionwheel',
		contentType: multerS3.AUTO_CONTENT_TYPE,
		key: function (req, file, cb) {
			cb(null, "pages/brands/" + Date.now() + file.originalname); //use Date.now() for unique file keys
		}
	})
})

router.get("/", function (req, res) {
	req.VWModel.getBrands().then(brands => {
		let alert;
		res.render("brandList", {
			brands,
			message: req.query.message
		});
	}).catch(err => {
		console.log('Error in getBrands', err);
		res.render("brandList", {
			error: err
		});
	});
});

router.get("/create", function (req, res) {
	res.render("brandEdit", {
		mode: 'Create',
		brand: {}
	});
});

router.get("/:id", function (req, res) {
	let brand_id = req.params.id;

	req.VWModel.findBrand({
		id: brand_id
	}).then(brand => {
		res.render("brandEdit", {
			mode: 'Edit',
			brand,
			message: req.query.message
		});
	}).catch(err => {
		console.log('Error in findBrand', err);
		res.render("brandList", {
			error: err
		});
	});;
});

router.post("/edit", upload.single('logoUpload'), function (req, res) {
	let post = req.body;

	let dbBrand = {
		type: post.type,
		name: post.name,
		slug: post.slug,
		disabled: (post.disable_brand === "on")
	}

	if (req.file && req.file.location) {
		dbBrand.logo = req.file.location;
	}

	if (post.id) {
		dbBrand.id = post.id;
	}

	let disabledBrand = post.disable_brand === "true";
	if (disabledBrand) {
		dbBrand.disabled = true;
	}

	req.VWModel.saveBrand(dbBrand).then(brand => {
		let message;
		if (disabledBrand) {
			message = "The brand \"" + post.name + "\" has been disabled.";
			res.redirect("/brands?message=" + message);
		} else {
			if (post.id) {
				message = "Brand edited successfully."
			} else {
				message = "New brand created successfully."
			}
			res.redirect("/brands/" + brand.id + "?message=" + message);
		}
	}).catch(err => {
		console.log('Error in saveBrand', err);
		res.render("brandList", {
			err: err
		});
	});

});

module.exports = {
	Router: router
};