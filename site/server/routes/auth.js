/*
https://code2flow.com/app pseudocode:

block {
  function ItemsController.getPopularItems {
    file
    /common/models
    /items/controller.js;
    Pass call through 
    Repository.getPopularItems;
    Pass call through
    Item.getPopularItems;
    Pass call through
    db.getPopularItems;
    Queries database
    and returns
    popular items;
  }

  function VWModel.getPopularItemsFromDealerItems {
    file /common/models/index.js;
    call ItemsController.getPopularItems;
    if (promise) [then] {
      Add pricing 
      and xrefs 
      to items;
      Filter out items
      dealer does not 
      have access to;
      Return an 
      object with
      wheels,
      tires,
      accessories;
    } else [fail] {
      NO FAIL CATCH
    }
  }
}


block {
  block VWModel.getDealerItems {
    block Repository.getDealerItemPricing {
      function __getDealerItems {
        file /common/libs/mssql/index.js;
        call __validateConnection;
        deferred.when;
        if (deferred when) [no error]{
          Prepare 
          SQL Prepared Statement
          (simplified);
          Execute 
          SQL Prepared Statement
          (simplified);
          UnPrepare 
          SQL Prepared Statement
          (simplified);
          if (successful) [resolve] {
            Resolve with data;
          } else 
          Reject with Error
        } else [error] {
          Reject with error;
        }
      }
      
      function MSSQL.getDealerItems {
        file /common/libs/mssql/index.js;
        call __getDealerItems;
        if (promise) [then] {
          Resolve with 
          array of objects of
          part_number,
          price,
          xref
        } else [fail] {
          Log error;
          Reject with error;
        }
      }
    
      function Repository.getDealerItemPricing {
        file /common/models/items/repository.js;
        call MSSQL.getDealerItems;
        if (promise) [then] {
          Build itemPricingArray;
          Resolve with itemPricingArray;
        } else [fail] {
          Log error;
          Reject with error;
        }
      }
    }
    
    function Repository.getDealerItems {
      file /common/models/items/repository.js;
      call Repository.getDealerItemPricing;
      if (promise) [then] {
        Add price and xref
        to each item;
        call Repository.getItemDetails;
        if (promise) [then] {
          Create itemDetailsArray;
          Resolve with itemDetailsArray;
        } else [catch] {
          Log error;
          Reject with error;
        }
      } else [fail] {
        Log error;
        Reject with error;
      }
    }
    
    function ItemsController.getDealerItems {
        file
        /common/models
        /items/controller.js;
        call Repository.getDealerItems;
    }

    function VWModel.getDealerItems {
      file /common/models/index.js;
      call ItemsController.getDealerItems;
      if (promise) [then] {
        Resolve with data;
      } else [fail] {
        Log error;
        Reject with error;
      }
    }
  }
  
  block VWModel.getBrands {
    function db.brand.find {
      Perform Massive query
      on brand table;
    }
    
    function Brand.find {
      file /common/models/public/brand.js;
      call db.brand.find;
      if (returned error) [error] {
        Reject with error;
      } else [no error] {
        Resolve with data;
      }
    }
    
    function VWModel.getBrands {
      file /common/models/index.js;
      call Brand.find;
      if (promise) [then] {
        Resolve with data;
      } else [fail] {
        Log error;
        Reject with error;
      }
    }
  }
  
  block VWModel.getProducts {
    function db.product.find {
      Perform Massive query
      on product table;
    }
    
    function Product.find {
      file /common/models/public/product.js;
      call db.product.find;
      if (returned error) [error] {
        Reject with error;
      } else [no error] {
        Resolve with data;
      }
    }
    
    function VWModel.getProducts {
      file /common/models/index.js;
      call Product.find;
      if (promise) [then] {
        Resolve with data;
      } else [fail] {
        Log error;
        Reject with error;
      }
    }
  }

  function VWModel.getDealerProductsAndSpecifications {
    file /common/models/index.js;
    switch(Promise.all) {
      case Items:
        call VWModel.getDealerItems;
        break;
      case Brands:
        call VWModel.getBrands;
        break;
      case Products:
        call VWModel.getProducts;
        break;
    }
    if (Promise.all) [then] {
      call ItemsController.getItemSpecifications;
      Resolve with object with
      brands,
      items,
      products,
      specifications;
    } else [catch] {
      Log Error;
      Reject;
    }
  }
}

block routes/auth{
  file /site/server/routes/auth.js;
  auth get;
  if (Do we have a user?) {
    if (User is disabled?) {
      redirect to 
      /logout?error=disabled
    } else {
      call VWModel.getDealerProductsAndSpecifications;
      if (promise) [then] {
        Filter Items with 
        Disabled Brands;
        if (Was "/?json" requested?) {
          Return JSON
        } else {
          call VWModel.getPopularItemsFromDealerItems;
          if (promise) [then] {
		  		  Render "home" 
			  	  with data
				  } else [fail] {
				    NO FAIL CATCH
			    }
        }
      
      } else [fail] {
        Log error
      }
    }
  } else {
    Show Login
  }
}
*/

var _ = require("underscore"),
	path = require('path'),
	express = require('express'),
	Passport = require('libs/passport'),
	debug = require("libs/buglog"),
	log = debug("routes", "auth"),
	router = express.Router();

function lowerCaseInputs(req, res, next) {
	/** Lower Case the values before moving on */
	// if (_.has(req.body, 'password'))
	// 	req.body.password = req.body.password.toLowerCase();
	// if (_.has(req.body, 'confirm_password'))
	// 	req.body.confirm_password = req.body.confirm_password.toLowerCase();
	next();
}

/** Authenciated Routes */
router.get("/", function(req, res) {
	var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	var server = req.connection.localAddress;
	var VWModel = req.VWModel;
	var nav = req.nav;
	var user = req.user;
	var settings = req.appSettings;
	var currentEnv = settings.environment || process.env.NODE_ENV;
	var warehouses;// = settings.warehouses;
  var start = new Date().getTime();
	
	console.log(
    "Home page hit.",
    "User Session:", Boolean(user), 
    "client:", ip, "server:", server, 
    "duration:", new Date().getTime() - start
  );
	if (user) {
		if (req.user && (req.user.disabled || req.user.dealer && req.user.dealer.disabled)) {
			return res.redirect('/logout?error=disabled');
		}
		
		var dealer = user.dealer;
		var warehouse = user.warehouse;
		var warehouses = user.warehouses;
		var nav_customer_id = dealer.nav_customer_id;
		var privateLabel = dealer && dealer.nav_customer_id ? dealer.nav_customer_id : false;

		console.log(
      "Home page - Requesting getDealerProductsAndSpecifications",
      "client:", ip, "server:", server,
      "user", user.first_name, user.last_name,
      "duration:", new Date().getTime() - start
    );
		VWModel.getDealerProductsAndSpecifications({
			nav_customer_id: nav_customer_id,
			userIsDTCUser : user.isDTCUser,
			multiplier : user.pricing_multiplier
		}).then(function( response ) {
			console.log(
        "Home page - Received getDealerProductsAndSpecifications",
        "client:", ip, "server:", server,
        "user", user.first_name, user.last_name,
        "duration:", new Date().getTime() - start
      );
			var brands = response.brands;
			var items = response.items;
			var products = response.products;
			var specifications = response.specifications;

			// remove items with disabled brands
			items = items.filter(item => {
				let productSet = products.find(product => product.id === item.product_id);
				let brand = brands.find(brand => brand.id === productSet.brand_id);
				return (brand.disabled !== true);
			});

			brands = brands.filter(brand => brand.disabled !== true);

			if (req.query && req.query.json) {
				console.log(
          "Home page - JSON requested, returning status 200 and the JSON object", 
          "client:", ip, "server:", server, 
          "user", user.first_name, user.last_name, 
          "duration:", new Date().getTime() - start
        );
				res
					.status( 200 )
					.json({
						brands: brands,
						items: items,
						products: products,
						specifications: specifications.filter,
						warehouse: warehouse ? warehouse.key : null,
						warehouses: warehouses
					});
			} else {
				console.log(
          "Home page - JSON not requested, requesting getPopularItemsFromDealerItems",
          "client:", ip, "server:", server,
          "user", user.first_name, user.last_name,
          "duration:", new Date().getTime() - start
        );
				VWModel
					.getPopularItemsFromDealerItems(items)
					.then(popularItems=>{
						console.log(
              "Home page - Received getPopularItemsFromDealerItems", 
              "client:", ip, "server:", server, 
              "user", user.first_name, user.last_name, 
              "duration:", new Date().getTime() - start
            );
						var data = {
							brands: brands,
							currentEnv: currentEnv,
							filter: true,
							items: items,
							nav: nav,
							products: products,
							// scripts: ["/js/home.js"],
							specifications: specifications,
							// styles: ["/css/home.css"],
							user: user,
							warehouse: warehouse ? warehouse.key : null,
							warehouses: warehouses,
							popular:popularItems
						};
						console.log(
              "Home page - Rendering the home page",
              "client:", ip, "server:", server,
              "user", user.first_name, user.last_name, "duration:", 
              new Date().getTime() - start
            );
						res.render( "home", data);
					});
			}
		}).fail(function( error ) {
			console.log(
        "Home page - 500 Error from getDealerProductsAndSpecifications",
        "client:", ip, "server:", server,
        "user", user.first_name, user.last_name,
        "duration:", new Date().getTime() - start
      );
			console.log(JSON.stringify(error));
			res.status( 500 ).render( "error", {
				error: error.message,
				type:typeof(error),
				name:error.name,
				stack:error.stack,
				fileName:error.fileName,
				lineNumber:error.lineNumber
      });
		}).done();
	} else {
		console.log(
      "Home page - Rendering login",
      "client:", ip, "server:", req.connection.localAddress, 
      "duration:", new Date().getTime() - start
    );
		res.render("login", {
			currentEnv: currentEnv,
			error: req.query.error ? req.query.error : false
		});
	}
});


/** Unauthenciated Routes */
router.post("/login", lowerCaseInputs, function(req, res, next) {
	var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	var server = req.connection.localAddress;
  var start = new Date().getTime();
	
	req.body.email = req.body.email.toLowerCase();
  console.log(
    "Login page - Processing login",
    "client:", ip, "server:", server,
    "user:", req.body.email.replace(/\W/g, '#')
  );
	Passport.validateLogin(req, res, next, function(err, redirect) {
		if (err) {
			console.log(
        "Login page - Processed login, with error",
        "client:", ip, "server:", server, "duration:",
        new Date().getTime() - start
      );
			return next(err);
		}
		console.log(
      "Login page - Processed login, without error",
      "client:", ip, "server:", server, "duration:",
      new Date().getTime() - start
    );
		console.log("Login page - Redirect requested to: " + redirect);
		res.redirect(redirect);
	});
});


router.get("/logout", function(req, res) {
	req.session.destroy(function(err) {
		res.clearCookie();
		if ( req.query.error ) {
			res.redirect('/?error=' + req.query.error);
		} else {
			res.redirect('/');
		}
	});
});

router.route('/forgot-password')
	.get((req, res) => {
		let settings = req.appSettings;
		let currentEnv = settings.environment;
		res.render("forgotpassword", {
			currentEnv: currentEnv
		});
	})
	.post((req, res) => {
		let absResetUrl = req.protocol + '://' + req.get('host') + "/reset-password";
		let currentEnv = req.appSettings.environment;
		req.VWModel.sendPasswordResetEmail(req.body.email, absResetUrl)
		.then(response => {
			log(response);
			res.render('forgotpassword', {
				currentEnv: currentEnv,
				ResponseMetadata: {
					RequestId: "bf222c98-dce8-11e6-ad2a-2364c18955d7"
				},
				MessageId: "01000159add75679-159bd5a3-7d6b-4a89-a904-9bfdf1b17b68-000000",
				success: response.success
			});
		})
		.catch(err => {
			res.render('forgotpassword', {
				currentEnv: currentEnv,
				error: "not found"
			});
		});
	});

router.route('/forgot-username')
	.get(function(req, res) {
		var settings = req.appSettings;
		var currentEnv = settings.environment;
		res.render("forgotusername", {
			currentEnv: currentEnv
		});
	})
	.post(lowerCaseInputs, function(req, res, next) {
		var Model = req.VWModel;
		var currentEnv = req.appSettings.environment;
		log(req.body);
		Model.findUser(req.body)
			.then(Model.sendUsernameRecoveryEmail)
			.then(function(response) {
				log(response);
				res.render("forgotusername", {
					currentEnv: currentEnv,
					ResponseMetadata: {
						RequestId: "bf222c98-dce8-11e6-ad2a-2364c18955d7"
					},
					MessageId: "01000159add75679-159bd5a3-7d6b-4a89-a904-9bfdf1b17b68-000000",
					success: response.success
				});
			})
			.catch(function(err) {
				res.render("forgotusername", {
					currentEnv: currentEnv,
					error: "not found"
				});
			});
	});

router.route('/reset-password/:token')
	.get((req, res) => {
		res.render('resetpassword', {
			action: req.params.token
		});
	})
	.post((req, res) => {
		req.VWModel.resetPassword(req.params.token, req.body)
			.then(response => {
				log('Successfully Reset Password');
				res.render("resetpassword", {
					success: true,
					action: req.params.token
				});
			})
			.catch(err => {
				log(err);
				res.render('resetpassword', {
					error: err.message,
					action: req.params.token
				});
			});
	});

router.get("/status", function(req, res) {
	var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	var settings = req.appSettings;
	var object = {
        ip:ip,
        server: req.connection.localAddress,
        useragent:req.headers['user-agent'],
        currentEnv: settings.environment,
        signedIn: Boolean(req.user),
        build: process.env.JENKINS_BUILD || 'none',
    }
    if (req.user) {
    	object.userDealer = req.user.dealer.nav_customer_id;
    }
    log('Status Check', object);
    res.status(200).json(object);
});

module.exports = {
	Router: router
};