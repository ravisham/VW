var express     = require('express');
var router      = express.Router();

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
	req.VWModel.getDealerProductsAndSpecifications({
			nav_customer_id: user.dealer.nav_customer_id,
			multiplier : user.pricing_multiplier

	}).then(payload=>{
		specifications = payload.specifications;
		res.render("contact", {
			currentEnv: currentEnv,
			nav: nav,
			specifications: specifications,
			user: user
		});
	}).catch(function( error ) {
		console.log("500 Error in contact.js");
		res.status( 500 ).send( error );
	});
});
router.post( "/", function(req, res) {
	var message = req.body;
	var nav = req.nav;
	var user = req.user;
	var settings = req.appSettings;
	var currentEnv = settings.environment;

	req.VWModel.sendContactEmail(message)
	.then(emailResponse=>{
		res.render("contact-result", {
			currentEnv: currentEnv,
			nav: nav,
			success: true,
			user: user
		});
	}).fail(err=>{
		res.render("contact-result", {
			currentEnv: currentEnv,
			err: err,
			nav: nav,
			user: user
		});
	})
});

module.exports = {
	Router: router
};