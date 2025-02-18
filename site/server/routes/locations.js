var express     = require('express');
var router      = express.Router();
var warehouses = require('config/settings/warehouses');

/** Authenciated Routes */
router.use( "*", function(req, res, next) {
    if (!req.user)
    	return res.redirect( "/" );
    next();
});

router.get( "/", function(req, res) {
	var nav = req.nav;
	var user = req.user;
	var settings = req.appSettings;
	var currentEnv = settings.environment;
	let specifications;
	req.VWModel.getDealerProductsAndSpecifications({
			nav_customer_id: user.dealer.nav_customer_id,
			multiplier : user.pricing_multiplier
	}).then(payload=>{
		specifications = payload.specifications;
		res.render("locations", {
			currentEnv: currentEnv,
			nav: nav,
			specifications: specifications,
			user: user,
			warehouses: warehouses
		});
	}).catch(function( error ) {
		console.log("500 Error in locations.js");
		res.status( 500 ).send( error );
	});
});

module.exports = {
	Router: router
};