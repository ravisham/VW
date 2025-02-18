let _ = require("underscore"),
	bodyParser = require("body-parser"),
	express = require("express"),
	debug = require("libs/buglog"),
	log = debug("routes", "checkout"),
	shippingOptions = require('config/settings/shippingOptions'),
	router = express.Router();


/** Authenciated Routes */
router.use( "*", function( req, res, next ) {
	let user = req.user;
	if( !user ) {
		return res.redirect( "/" );
	}
	next();
});

router.get( "/", function( req, res ) {
	let VWModel = req.VWModel;
	let appSettings = req.appSettings;
	let nav = req.nav;
	let user = req.user;
	let currentEnv = appSettings.environment;
	let dealer = user.dealer;
	let nav_customer_id = dealer.nav_customer_id;
	let userIsPending = !user.dealer ? true : false;
	
	VWModel.getDealerProductsAndSpecifications({
		nav_customer_id: nav_customer_id,
		multipier : user.pricing_multiplier
	}).then(function( response ) {
		let specifications = response.specifications;
		VWModel.getCartDetails({
			appSettings: appSettings,
			user: user
		}).then(function( response ) { 
			//console.log( "CHECKOUT RESPONSE: ", response );
            
			let message = response.message;
			let parameters = response.parameters;
			let props = response.props;
			res.render("checkout", {
				currentEnv: currentEnv,
				cart: {
					items: props.user.cart.items,
					subtotal: props.totals.subtotal
				},
				nav: nav,
				scripts: ["/js/checkout.js"],
				specifications: specifications,
				styles: ["/css/checkout.css"],
				user: user,
				warehouses: props.warehouses,
				shippingOptions: shippingOptions.filter(opt=>{
					if (opt.exclude&&opt.exclude.dealer&&opt.exclude.dealer===nav_customer_id)
						return false
					else
						return true
				})
			});
		}).fail(function( error ) {
			let message = error.message;
			let parameters = error.parameters;
			let props = error.props;
			res.render( "checkout", {
				currentEnv: currentEnv,
				cart: {
					items: [],
					subtotal: 0
				},
				nav: nav,
				scripts: ["/js/checkout.js"],
				specifications: specifications,
				styles: ["/css/checkout.css"],
				user: user,
				warehouses: props.warehouses
			});
		}).done();
	}).catch(function( error ) {
		console.log(error);
		res.status( 500 ).send( error );
	});
});

router.post( "/totals", function( req, res ) {
	let VWModel = req.VWModel;
	let appSettings = req.appSettings;
	let body = req.body;
	let user = req.user;
	VWModel.getCartTotals({
		appSettings: appSettings,
		body: body,
		user: user
	}).then(function( response ) {
		let message = response.message;
		let parameters = response.parameters;
		let props = response.props;
		res.status( 200 ).json({
			canPay: props.canPay,
			totals: props.totals
		});
	}).fail(function( error ) {
		let message = error.message;
		let parameters = error.parameters;
		let props = error.props;
		res.status( 500 ).json( error );
	}).done();
});


router.post("/", function(req, res) {
	let VWModel = req.VWModel;
	let appSettings = req.appSettings;
	let body = req.body;
	let user = req.user;
	console.log( "POST: /checkout" );
	VWModel.submitPurchaseOrder({
		appSettings: appSettings,
		body: body,
		user: user
	}).then(function( response ) {
		let message = response.message;
		let parameters = response.parameters;
		let props = response.props;
		let value = {message:message, won:response.props.web_order_number}
		res.status( 200 ).json( value );
	}).fail(function( error ) {
		let message = error.message;
		let parameters = error.parameters;
		let props = error.props;
		console.log("ERROR : Fail : Checkout POST /", error);
		res.status( 500 ).json({ message: error.message });
	}).done();
});

module.exports = {
	Router: router
};
