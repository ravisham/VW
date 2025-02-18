var passport = require('passport');
var express = require('express');
var router = express.Router();



router.get("/", function(req, res) {
	var VWModel = req.VWModel;
	var user = req.user;

	if (true) {
		VWModel.getOrdersAdminFull()
		.then(results=>{
			// console.log("Got orders:", results);
			res.render("admin", {
				orders:results.reverse(),
				message : req.query.message,
                isfull: true
            });
		})
		.catch(err=>{
			res.render("admin", {
				error:err
			});
		});
	} else {
		res.render("login", {
			error: req.query.error ? req.query.error : false
		});
	}
});
module.exports = {
	Router: router
};