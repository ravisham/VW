var passport = require('passport');
var express = require('express');
var router = express.Router();


/** Authenciated Routes */
router.get("/", function(req, res) {
	var VWModel = req.VWModel;
	var user = req.user;

	if (true) {
		VWModel.getOrdersAdmin()
		.then(results=>{
			// console.log("Got orders:", results);
			res.render("admin", {
				orders:results.reverse(),
				message : req.query.message,
				isfull: false
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



/** Unauthenciated Routes */ 
router.post("/login", function(req, res, next) {
	// console.log("user loged in with:", req.body);
	passport.authenticate('local', function(err, user, info) {
		if (err) {
			console.log(err);
		}
		// console.log("auth process done", user);
		if (user) { 
			// console.log("login");
			req.logIn(user, function(err) {
				if (err) {
					return next(err);
				}
				res.redirect('/');
			});
			return;
		}
		res.redirect('/?error=incorrect');
	})(req, res, next);
});

router.get("/logout", function(req, res) {
	req.logout();
	res.redirect('/');
});

router.get("/status", function(req, res) {
	var settings = req.appSettings;
	var object = {
        ip:req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        useragent:req.headers['user-agent'],
        currentEnv: settings.environment,
        build: process.env.JENKINS_BUILD || "none",
    }
    res.status(200).json(object);
});


module.exports = {
	Router: router
};