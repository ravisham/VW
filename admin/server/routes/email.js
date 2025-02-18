let passport = require('passport');
let express = require('express');
let router = express.Router();


/** Authenciated Routes */
router.get("/:id", function (req, res) {
	let VWModel = req.VWModel;
	let saleId = req.params.id;
	if (true) {
		VWModel.sendOrderEmail(saleId, null, true).then(response => {
			res.send(response);
		}).catch(err => {
			console.log("Order Email Send Error", err);
			res.send(err);
		});
	} else {
		return res.redirect("/");
	}
});
router.post("/:id", function (req, res) {
	let VWModel = req.VWModel;
	let saleId = req.params.id;


	if (true) {
		VWModel.sendOrderEmail(saleId, req.body).then(response => {
			res.send(response);

		}).catch(err => {
			console.log("Order Email Send Error", err);
			res.send(err);
		});
	} else {
		return res.redirect("/");
	}
});


module.exports = {
	Router: router
};