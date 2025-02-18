var express = require('express'),
	debug = require("libs/buglog"),
	log = debug("routes", "account"),
	router = express.Router();

const Crypt = require("libs/crypt");
/** Authenciated Routes */
router.use("*", function (req, res, next) {
	if (!req.user)
		return res.redirect("/");
	next();
});

router.get("/", function (req, res) {
	renderProfilePage(req, res);
});
router.post("/", function (req, res) {
	const post = req.body;
	let dbUser = {
		id: req.user.id
	}
	// which fields the user can edit can change, so building object manually
	if (typeof post.first_name !== 'undefined')
		dbUser.first_name = post.first_name;
	if (typeof post.last_name !== 'undefined')
		dbUser.last_name = post.last_name;
	if (typeof post.phone_number !== 'undefined')
		dbUser.phone_number = post.phone_number;
	if (typeof post.address_1 !== 'undefined')
		dbUser.address_1 = post.address_1;
	if (typeof post.address_2 !== 'undefined')
		dbUser.address_2 = post.address_2;
	if (typeof post.city !== 'undefined')
		dbUser.city = post.city;
	if (typeof post.state !== 'undefined')
		dbUser.state = post.state;
	if (typeof post.zip !== 'undefined')
		dbUser.zip = post.zip;
	if (typeof post.warehouse_select !== 'undefined') {
		dbUser.shipping_config = { defaultLocationCode: post.warehouse_select }
	}
	if (typeof post.store_number !== 'undefined')
		dbUser.store_number = post.store_number;
	if (typeof post.salesrep_select !== 'undefined')
		dbUser.sales_rep = post.salesrep_select;
	if (typeof post.username !== 'undefined')
		dbUser.username = post.username.toLowerCase();

	if (typeof post.newpassword  !== 'undefined' && typeof post.confirmpassword !== 'undefined') {
		// TODO check existing password, requires lookup
		if (post.newpassword === post.confirmpassword && post.newpassword !== "") {
			const token = Crypt.encode(post.newpassword).token;
			if ( token ) dbUser.password_hash = token;
		}
	}
	req.VWModel.saveUser(dbUser).then(update => {
		req.user = Object.assign({}, req.user, update);
		renderProfilePage(req, res, '', '', "Your account has been updated");
	}).catch(function (error) {
		console.log('Error in VWModel.saveUser : ', error);
		renderProfilePage(req, res, '', '', ' There was an error upating user. ' + error);
	});
});

// Abstracting the page render from routes so I can handle the usecases more cleanly
let renderProfilePage = (req, res, error, success, message) => {
	var nav = req.nav;
	var user = req.user;
	var currentEnv = settings.environment
	let warehouse = user.warehouse;
	let warehouses = user.warehouses;
	let specifications;
	req.VWModel.getDealerProductsAndSpecifications({
		nav_customer_id: user.dealer.nav_customer_id,
		multiplier: user.pricing_multiplier
	}).then(payload => {
		specifications = payload.specifications;
		return req.VWModel.findSalesreps();
	}).then(function (response) {
		//current sales rep is always on top
		//var salesReps = response.sort((a, b) => { return a.id === user.sales_rep ? -1 : 1 });
		var salesReps = response;
		res.render("account/profile", {
			error: error,
			nav: nav,
			salesReps: salesReps,
			success: success,
			user: user,
			specifications: specifications,
			warehouse: warehouse.details,
			warehouses: warehouses,
			message
		});
	}).catch(function (err) {
		console.log(err);
		res.render("account/profile", {
			error: error,
			nav: nav,
			success: success,
			specifications: specifications,
			user: user,
			warehouse: warehouse.details,
			warehouses: warehouses,
			message
		});
	});
}

router.get("/orders", function (req, res) {
	var nav = req.nav;
	var user = req.user;
	var settings = req.appSettings;
	var currentEnv = settings.environment;
	let specifications;
	req.VWModel.getDealerProductsAndSpecifications({
		nav_customer_id: user.dealer.nav_customer_id,
		multiplier: user.pricing_multiplier
	}).then(payload => {
		specifications = payload.specifications;
		return req.VWModel.getOrderHistoryViewModelById(req.user.id);
	}).then(orders => {
		orders = orders.filter(order => !order.deleted)
		res.render("account/orders", {
			currentEnv: currentEnv,
			orders: orders.sort((o1, o2) => o2.created - o1.created),
			nav: nav,
			specifications: specifications,
			user: user
		});
	}).catch(err => {
		console.log("err", err);
		res.render("account/orders", {
			currentEnv: currentEnv,
			error: err,
			nav: nav,
			specifications: specifications,
			user: user
		});
	});
});

router.get("/pay-purchase-order", function (req, res) {
	var VWModel = req.VWModel;
	var nav = req.nav;
	var user = req.user;
	var settings = req.appSettings;
	var currentEnv = settings.environment;
	// get purchase orders
	VWModel.getSalesByUser({
		id: user.id
	}).then(function (response) {
		log(response);
		var purchaseOrders = [];
		response.forEach(function (purchaseOrder, index, array) {
			if (purchaseOrder.payment.payable === true && purchaseOrder.payment.paid !== true) {
				purchaseOrders.push({
					address: purchaseOrder.ship_to_info,
					created: purchaseOrder.created,
					id: purchaseOrder.id,
					po: purchaseOrder.po_number,
					name: purchaseOrder.customer_info.customer_name,
					total: purchaseOrder.total_invoice_amount,
					data: purchaseOrder
				});
			}
		});
		res.render("account/pay-purchase-order", {
			currentEnv: currentEnv,
			nav: nav,
			purchaseOrders: purchaseOrders,
			user: user
		});
	}).catch(function (response) {
		res.render("account/pay-purchase-order", {
			currentEnv: currentEnv,
			error: "error",
			nav: nav,
			user: user
		});
	});
});

router.post("/pay-purchase-order", function (req, res) {
	var nav = req.nav;
	var user = req.user;
	let VWModel = req.VWModel;

	VWModel.findSale({ id: req.body.saleId })
		.then(sale => {
			//update sale to be paid!!
			log("got sale:", sale);
			let update = {
				id: sale.id, //req.body.saleLineId,
				payment: sale.payment
			}
			update.payment.paid = true;
			log("sending updated sale:", update);
			return VWModel.updateSale(update);
		})
		.then(sale => {
			//send the user a notification for payment
			log("sending user payment notification:", sale);

			return VWModel.sendOrderEmail(sale.id, { action: "userPayment" });
		})
		.then(result => {
			res.status(200).json({
				error: false,
				data: "ok"
			});
		})
		.catch(err => {
			log("Order Email Send Error", err);
			res.send(err);
		});
});

module.exports = {
	Router: router
};