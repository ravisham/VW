let passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy,
	Crypt = require('libs/crypt'),
	colors = require('libs/colors'),
	debug = require('libs/buglog'),
	Exectimer = require("libs/helpers/exectimer"),
	log = debug("libs", "passport");

let VWModel = null;

/**
 * @exports Passport
 * @description
 * Implements the the node Passport library for the site to handle user authentication.
 */
module.exports = {
	/**
	 *
	 */
	initialize: function(app, vwmodel) {
		/** Initialize Passport */
		app.use(passport.initialize());
		app.use(passport.session());

		VWModel = vwmodel;

		configureLocalStrategy();

		log("\tInitialized");
	},

	/**
	 * Validate a user login attempt.
	 */
	validateLogin: function(req, res, next, callback) {
		Exectimer.time("validateLogin");
		passport.authenticate('local', function(err, user, info) {
			if (err) {
				log(err);
				log(Exectimer.timeEnd("validateLogin"));
				return callback(err);
			}

			if (user) {
				req.logIn(user, function(err) {
					if (err) {
						log(err);
						log(Exectimer.timeEnd("validateLogin"));
						return callback(err);
					}
					req.session.save(function() {
						log(Exectimer.timeEnd("validateLogin"));
						callback(null, "/");
					});
				});
			} else {
				log(Exectimer.timeEnd("validateLogin"));
				callback(null, "/?error=incorrect");
			}
		})(req, res, next);
	}
};

/**
 * @memberOf module:Passport
 * @private
 */
function validateEmail(email) {
	if (email.length == 0)
		return false;
	let re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
	return re.test(email);
}

/**
 * @memberOf module:Passport
 * @private
 */
function configureLocalStrategy() {
	/**
	 * passport session setup
	 * required for persistent login sessions
	 * passport needs ability to serialize and unserialize users out of session
	 */
	passport.use(new LocalStrategy({
		/** by default, local strategy uses username and password, we will override with email */
		usernameField: 'email',
		passwordField: 'password',
		/** allows us to pass back the entire request to the callback */
		passReqToCallback: true
	}, function(req, email, password, done) {
		Exectimer.time("authenticate");
		log("passport.authenticate: %s", email);

		/** Now we confirm if this is an email or username */
		let userParams = {};
		if (validateEmail(email))
			userParams.email = email;
		else {
			log('passport.authenticate: Switching to Username Query');
			userParams.username = email.toLowerCase();
		}

		/** First we confirm if the user exists */
		VWModel.findUser(userParams)
			.then(function(user) {
				/** User was found with the supplied email. Now we grab the User's Login Record. */
				return VWModel.findLogin({id: user.login_id})
				.then(login => {
					/** if the user is found but the password is wrong */
					
					if (!Crypt.compare(password, login.password_hash)) {
						log('passport.authenticate incorrect password for: %s', email);
						log(Exectimer.timeEnd('authenticate'));
						return done(null, false, {
							message: 'Invalid Login: Incorrect Password'
						});
					}
					/**
					 * Successful Authentication, OK to login.
					 * But before we do so, we have to update the login record's "last_accessed"
					 * column to keep track of the last time (now) the user logged in. By default,
					 * the `VWModel.updateLogin` method will add `last_accessed = new Date()`
					 * if not passed.
					 */
					VWModel.updateLogin(login)
					.then(response => log('Successfully Updated Users Login Record'))
					.catch(err => log('Error Updating Users Login Record: %O', err));

					log(Exectimer.timeEnd('authenticate'));
					return done(null, user);
				})
				.catch(err => {
					log('Unable to find Users Login Record: %O', err);
					log(Exectimer.timeEnd('authenticate'));
					return done(null, false, {
						message: "Please Try Again Later"
					});
				});
			}).fail(function(err) {
				/** Check and confirm the `err` and `user_result` callback parameters */
				if (err.errorCode && err.errorCode === 1000) {
					/**
					 * if no user is found, return the `Invalid Login` message.
					 * This is data related.
					 * Meaning Solid connection with Query and DB, but no user
					 * found with the provided `email` address.
					 */
					log('passport.authenticate could not authenticate: %s', email);
					log('passport.authenticate error code: %s', err.errorCode);
					log(err);
					log(Exectimer.timeEnd("authenticate"));
					return done(null, false, {
						message: 'Invalid User: Email Does not Exist'
					});
				} else {
					/**
					 * If there was a DB ERROR return err. There was a problem.
					 * This is the user of a Query or DB issue.
					 * NOT data related.
					 */
					log('passport.authenticate could not authenticate: %s', email);
					log('passport.authenticate error code: %s', err.errorCode);
					log(err);
					log(Exectimer.timeEnd("authenticate"));
					return done(err);
				}
			}).done();
	}));

	/** used to serialize the user for the session */
	passport.serializeUser(function(user, done) {
		log("passport.serializeUser: (%s)", colors.green(user.id));
		done(null, user.id);
	});

	/** used to deserialize the user */
	passport.deserializeUser(function(id, done) 
	{
		log("passport.deserializeUser: (%s)", colors.green(id));
		VWModel.getUserDealerById(id).then(function(user) 
		{
			let cart = user.cart;
			let dealer = user.dealer;
			let cartItems = cart.items;
			let cartItemIds = Object.keys( cartItems );
			let cartQuantity = 0;
			let warehouses = dealer ? VWModel.getDealerWarehouses( user, dealer ) : null;
			
			cartItemIds.forEach(function( itemId, index, array ) 
			{
				let cartItem = cartItems[itemId];
				let cartItemLocations = Object.keys( cartItem );
				cartItemLocations.forEach(function( cartItemLocation, index, array ) 
				{
					let cartItemLocationQuantity = cartItem[cartItemLocation];
					cartQuantity += cartItemLocationQuantity;
				});
			});
			
			user.cartQuantity = cartQuantity;
			if( user.shipping_config && user.shipping_config.defaultLocationCode && warehouses ) 
			{
				let code = user.shipping_config.defaultLocationCode;
				user.warehouse = Object.keys( warehouses ).reduce( ( acc,key ) => 
				{
					return warehouses[key].locationCode === code ? { key: key, details: warehouses[key] } : acc
				}, "");
				user.warehouses = warehouses;
			}
			user.isDTCUser = user.dealer.nav_customer_id === "DISCOUNTTIRE";
			done(null, user);
		}).fail(function(err) 
		{
			log("Unable to Deserialize User: %O", err);
		}).done();
	});
}