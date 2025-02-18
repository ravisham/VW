var passport = require('passport');
var express = require('express');
var router = express.Router();

const multer = require('multer');
const csvParse = require('csv-parse');
const stringify = require('csv-stringify');
const Crypt = require("libs/crypt");
const Warehouses = require('config/settings/warehouses');

function renderPage(req, res, userId, message) {
	let VWModel = req.VWModel;
	VWModel.getUserDealerById(userId).then(user => {
		res.render("userEdit", {
			user: user,
			alert: message
		});
	}).catch(err => {
		console.log("err", err)
		res.render("userEdit", {
			error: err
		});
	});
}

/**
 * Test a given code to find out if it is a live warehouse or not.
 * Checks against two letter state codes as used by Postgres.
 * Checks against the /common/config/settings/warehouses.js definitions.
 *
 * @returns {boolean}
 * @param {string} stateCode The warehouse code to test.
 */
function isWarehouseLive(stateCode) {
	if (typeof Warehouses !== 'object') {
		return false;
	}
	if (typeof Warehouses[stateCode] !== 'object') {
		return false;
	}
	if (Warehouses[stateCode].isLive !== true) {
		return false;
	} 
	return true;
}

/**
 * Test a given code to find out if it is a live warehouse or not.
 * Checks against alpha numeric location codes as used by MSSQL.
 * Checks against the /common/config/settings/warehouses.js definitions.
 *
 * @returns {boolean}
 * @param {string} alphaNumericLocationCode The warehouse code to test.
 */
function isLocationLive(alphaNumericLocationCode) {
	var key;
	for (key in Warehouses) {
		if (Warehouses.hasOwnProperty(key)) {
			if (Warehouses[key].locationCode.toString() === alphaNumericLocationCode.toString()) {
				if (Warehouses[key].isLive === true) {
					return true;
				} else {
					return false;
				}
			}
		}
	}
	return false;
}

// Bulk Functions
router.get("/bulk", function (req, res) {
	res.render("usersBulkImport");
});

/**
 * Handle bulk exports to CSV
 */
router.get("/bulk/export", function (req, res) {

	const VWModel = req.VWModel;
	let DBDealers;
	let SalesReps;

	VWModel.findSalesreps({})
		.then(salesReps => {
			SalesReps = salesReps;
			return VWModel.findDealers();
		}).then(dealers => {
			DBDealers = dealers;
			return VWModel.adminGetFullUserDetails();
		}).then(users => {
			let newUsers = users.map(user => {

				if (user.login.password_hash) {
					try {
						const decrypted = Crypt.decode(user.login.password_hash);
						if (decrypted && decrypted.password)
							user.password = decrypted.password;
					} catch (error) {

					}
				}

				// map sales rep
				let thisSalesRep = SalesReps.find(rep => {
					return parseInt(rep.id) === parseInt(user.sales_rep)
				});
				if (!thisSalesRep || !thisSalesRep.code) thisSalesRep = {
					code: 9
				};

				// map dealer
				let thisDealer = DBDealers.find(dealer => {
					return dealer.id === user.dealer_id
				});
				if (!thisDealer) thisDealer = {
					nav_customer_id: null
				};

				return {
					dealer_id: thisDealer.nav_customer_id,
					store_number: user.store_number,
					first_name: user.first_name,
					last_name: user.last_name,
					address_1: user.address_1,
					address_2: user.address_2,
					city: user.city,
					state: user.state,
					zip: user.zip,
					country: user.country,
					phone_number: user.phone_number,
					username: user.username,
					password: user.password,
					email: user.email,
					sales_rep_code: parseInt(thisSalesRep.code),
					preferred_location: user.shipping_config.defaultLocationCode,
					pricing_mutiplier: user.pricing_multiplier,
				}
			});

			stringify(newUsers, {
				header: true
			}, function (err, output) {
				res.setHeader('Content-disposition', 'attachment; filename=userExport.csv');
				res.set('Content-Type', 'text/csv');
				res.status(200).send(output);
			});
		}).catch(error => {
			console.log('Error in Export', error);
			res.render("usersBulkImport", {
				error: 'Server error. findUsers. ' + error
			});
		});

});

/**
 * Handle bulk imports from CSV.
 *
 * Note, it updates/adds but doesn't delete.
 * My guess is that was deemed dangerous
 * as a bug could then delete every user
 */
router.post("/bulk", multer({
	inMemory: true
}).single('csvdata'), function (req, res) {
	//if (req.file && req.file.buffer && req.file.mimetype == "text/csv") {
	if (req.file && req.file.buffer && req.file.originalname && req.file.originalname.split('.').pop() === "csv") {

		const startTime = new Date().getTime();

		// Configure the node package csv-parse
		const parser = csvParse({
			delimiter: ',',
			rtrim: true,
			columns: true,
			relax_column_count: true,
			skip_empty_lines: true
		});

		// Connect to the VisionWheel main model
		const VWModel = req.VWModel;

		// Define the expected header columns for the CSV
		const csvheader = "dealer_id,store_number,first_name,last_name,address_1,address_2,city,state,zip,country,phone_number,username,password,email,sales_rep_code,preferred_location,pricing_mutiplier";

		// Store which rows are created, updated an unchanged
		let createdrows = [],
			updatedrows = [],
			unchangedrows = [];

		// Store information on invalid rows
		let invalidrows = {
			columnLength: [],
			noDealer: [],
			invalidEmail: [],
			disabledDealer: [],
			invalidPreferredLocation: []
		};

		// Create an array of promise tasks to resolve
		let tasks = [];

		// Keep track of the number of rows
		let counter = 1;

		let DBDealers;
		let SalesReps;

		VWModel.findSalesreps({})
			.then(salesReps => {
				SalesReps = salesReps;
				return VWModel.findDealers();
			}).then(dealers => {
				DBDealers = dealers;
				return VWModel.adminGetFullUserDetails();
			}).then(users => {

				// Build easier to reference object from joined result
				// The join for this was cleaned up and fixed in a later sprint
				users.forEach(user => {
					// let decodedpassword = Crypt.decode(user.password_hash);
					user.password = {
						password_hash: user.login.password_hash
					}
					user.dealer = {
						id: user.dealer_id,
						company_name_1: user.company_name_1,
						nav_customer_id: user.nav_customer_id
					}
					user.salesrep = {
						id: user.sales_rep,
						code: user.code
					}
				});

				// Once the parser is ready
				parser.on('readable', function () {

					// Reading a record at a time
					while (record = parser.read()) {

						// Check to see if the record's length matches the expected number of columns from the header
						// If it doesn't, add an entry to invalidrows.columnLength
						if (Object.keys(record).length !== csvheader.split(',').length) {
							const csvString = Object.keys(record).map(key => {
								return record[key];
							}).join(',');
							invalidrows.columnLength.push("Line " + (counter + 1) + " : " + csvString);
							continue;
						}

						// line num
						counter++;
						record.line_number = counter;

						// Check for email format, adding to the invalidrows.invalidEmail if it fails
						if (!/.+@.+\..+/i.test(record.email)) {
							invalidrows.invalidEmail.push(record);
							continue;
						}

						// Preferred Location
						// Invalid if there isn't one
						// or if the value passed isn't live
						if (!record.preferred_location) {
							invalidrows.invalidPreferredLocation.push(record);
							continue;
						} else if (isLocationLive(record.preferred_location) === false) {
							invalidrows.invalidPreferredLocation.push(record);
							continue;
						}

						// map sales rep
						const thisSalesRep = SalesReps.find(rep => {
							return rep.code === record.sales_rep_code
						});

						// map dealer
						const thisDealer = DBDealers.find(dealer => {
							return dealer.nav_customer_id === record.dealer_id
						});

						// No dealer
						if (!thisDealer) {
							record.dealerid = record.store_number;
							invalidrows.noDealer.push(record);
							continue;
						}

						// Disabled Dealer
						if (thisDealer.disabled) {
							record.dealer = thisDealer.company_name_1 + " (" + thisDealer.id + ")";
							invalidrows.disabledDealer.push(record);
							continue;
						}

						let location;
						if (record.preferred_location) {
							location = record.preferred_location;
							// zerofill location codes
							if (location !== "" && !isNaN(location) && location < 10) {
								location = ("0000" + location).slice(-2);
							}
						}

						// Find the user entry if there is an entry already for that email address
						const existingUser = users.find(user => {
							return user.email === record.email;
						});

						// Get the userId if there is an existing entry
						const userId = (existingUser) ? existingUser.id : null;

						// Build a full entry object for the user based on the record
						let dbUser = {
							id: userId,
							first_name: record.first_name,
							last_name: record.last_name,
							phone_number: record.phone_number,
							dealer_id: thisDealer.id,
							email: record.email,
							address_1: record.address_1,
							address_2: record.address_2,
							city: record.city,
							state: record.state,
							zip: record.zip,
							country: record.country,
							shipping_config: {
								defaultLocationCode: location
							},
							store_number: record.store_number,
							username: record.username.toLowerCase(),
							sales_rep: thisSalesRep.id,
							password_hash: Crypt.encode(record.password).token
						};

						// If there is no username in the record
						// remove the field from the object too
						if (!record.username) {
							delete dbUser.username;
						}

						// If there was an existing user
						if (existingUser) {
							// Create a comparisson object
							let compareUser = {
								id: existingUser.id,
								first_name: existingUser.first_name,
								last_name: existingUser.last_name,
								phone_number: existingUser.phone_number,
								dealer_id: existingUser.dealer_id,
								email: existingUser.email,
								address_1: existingUser.address_1,
								address_2: existingUser.address_2,
								city: existingUser.city,
								state: existingUser.state,
								zip: existingUser.zip,
								country: existingUser.country,
								shipping_config: existingUser.shipping_config,
								store_number: existingUser.store_number,
								username: existingUser.username,
								sales_rep: existingUser.salesrep.id,
								password_hash: existingUser.password.password_hash
							};

							let compareUser2 = JSON.parse(JSON.stringify(dbUser));
							//delete compareUser2.password_hash;
							if (!existingUser.username)
								delete compareUser.username;

							// Compare the two users' JSON objects. If they're the same, add to the unchangedrows array
							if (JSON.stringify(compareUser) === JSON.stringify(compareUser2)) {
								unchangedrows.push(record);
								continue;
							}
						}

						// If it's an existing user
						if (existingUser) {
							// Add the DB write task - it will start running asynchronously
							tasks.push(VWModel.saveUser(dbUser));
							updatedrows.push(record);
							continue;
						}

						// If it's a new user

						// Default properties
						const newUser = {
							role: 'owner',
							status: 'pending',
							cart: {
								items: {}
							},
							country: 'US'
						}
						// Ensure there's no id as it's a new user
						delete dbUser.id;
						const newRow = Object.assign({}, newUser, dbUser);
						// Add the DB write task - it will start running asynchronously
						tasks.push(VWModel.saveUser(newRow));
						createdrows.push(record);
					}
				});

				// Catch any errors from the parser
				parser.on('error', function (err) {
					console.log("Error in parser.on(error) during bulk processing");
					console.dir(err);
				});

				// Once the parser finishes
				parser.on('finish', function () {
					const end = new Date().getTime();

					// Wait for all of the db tasks to resolve
					Promise.all(tasks).then(function () {
						// Render the result using the usersBulkImport view and the data from the import 
						res.render("usersBulkImport", {
							createdrows,
							updatedrows,
							unchangedrows,
							invalidrows,
							csvheader,
							time: end - startTime
						});
					}).catch(function (error) {
						console.log('Error in parser.on(finish) Promise.all : ', error);
						res.render("usersBulkImport", {
							error: 'Server error. Promise.all error caught on parser.finish. ' + error.detail
						});
					});

				});

				// Get the CSV file from the request object
				const thefile = req.file.buffer.toString();
				// Write the file to the parser, starting parsing
				parser.write(thefile);
				// Close the parser
				parser.end();
			}).catch(error => {
				console.log('Error in findUsers promise chain :', error);
				res.render("usersBulkImport", {
					error: 'Server error. findUsers. ' + error
				});
			});

	} else {
		res.render("usersBulkImport", {
			error: 'No valid file uploaded.'
		});
	}
});


router.get("/", function (req, res) {
	req.VWModel.adminGetFullUserDetails().then(users => {
		res.render("userList", {
			users
		});
	});
});

router.get("/:id", function (req, res) {
	let DBDealers;
	let SalesReps;
	let postedUser;
	let VWModel = req.VWModel;
	let id = req.params.id;
	let mode = "Edit";

	if (id === "create") {
		mode = "Create";
		id = null;
	}
	if (req.query.posted) {
		let posted = JSON.parse(req.query.posted);

		postedUser = Object.assign({}, posted, {
			sales_rep : posted.salesrep_select,
			dealer: {
				id: posted.dealer_id
			},
			shipping_config : {
				defaultLocationCode : posted.warehouse_select
			}
		});
	}

	VWModel.findSalesreps()
		.then(salesReps => {
			SalesReps = salesReps;
			return VWModel.findDealers();
		}).then(dealers => {
			DBDealers = dealers;
			if (mode === "Edit") {
				return VWModel.adminGetFullUserDetails({
					id
				});
			} else {
				return VWModel.adminGetFullUserDetails();
			}
		}).then(user => {
			if (mode === "Edit") {
				user = user[0];
			} else {
				user = {
					dealer: {},
					salesrep: {},
					login: {}
				};
			}
			if ( postedUser ) {
				console.log('posted user?', postedUser);
				user = postedUser;
			}
			res.render("userEdit", {
				user,
				salesReps: SalesReps,
				dealers: DBDealers,
				warehouses: Warehouses,
				mode,
				message: req.query.message,
				error: req.query.error
			});
		});
});

/**
 * Process editing/creating users.
 */
router.post("/", function (req, res) {
	let VWModel = req.VWModel;
	let form = req.body;
	let mode = form.id ? 'edit' : 'create';

	// Confirm the passed warehouse is valid
	// If it isn't, abort.
	if (isLocationLive(form.warehouse_select) === false) {
		console.log('Error in user route - invalid warehouse code.');
		console.log('posted data', form);
		let message = 'User not created  : Invalid Warehouse';
		let id = (mode === "create") ? "create" : form.id;
		res.redirect("/users/" + id + "?error=" + encodeURIComponent(message) + "&posted=" + JSON.stringify(form));
		return;
	}

	let dbUser = {
    first_name: form.first_name,
    last_name: form.last_name,
    phone_number: form.phone_number,
    dealer_id: form.dealer_id,
    address_1: form.address_1,
    address_2: form.address_2,
    city: form.city,
    state: form.state,
    zip: form.zip,
    country: form.country,
    shipping_config: {
      defaultLocationCode: form.warehouse_select
    },
    store_number: form.store_number,
    username: form.username.toLowerCase(),
    sales_rep: form.salesrep_select,
    pricing_multiplier: form.pricing_multiplier || null,
    disabled: form.disabled === "on",
    checkout_disabled: form.checkout_disabled === "on",
    local_enabled: form.local_enabled === "on"
  }

	if (form.created) {
		dbUser.created = form.created;
	}
	if (form.id) {
		dbUser.id = form.id;
	} else {
		dbUser.email = form.email;
		dbUser = Object.assign({country: 'US'}, dbUser, {
			role: 'owner',
			status: 'pending',
			cart: {
				items: {}
			}
		});
	}

	if (form.password) {
		dbUser.password_hash = Crypt.encode(form.password).token;
	}
	if (form.newpassword && form.confirmpassword && form.newpassword === form.confirmpassword) {
		dbUser.password_hash = Crypt.encode(form.newpassword).token;
	}

	VWModel.saveUser(dbUser).then(function (returnUser) {
		let message = "User updated successfully";
		res.redirect("/users/" + returnUser.id + "?message=" + message);
	}).catch(error => {
		// todo better error handling
		console.log('Error in user route, VWModel.saveUser during user post : ', error);
		console.log('posted data', form);
		let message = 'User not created  : ' + error;
		let id = (mode === "create") ? "create" : form.id;
		res.redirect("/users/" + id + "?error=" + encodeURIComponent(message) + "&posted=" + JSON.stringify(form));
	});;
});


module.exports = {
	Router: router
};



// {
// 	first_name: user['First Name'],
// 	last_name: user['Last Name'],
// 	phone_number: user.Phone,
// 	role: 'owner',
// 	status: 'pending',
// 	cart: { items: {} },
// 	dealer_id: dealerID,
// 	email: user.Email,
// 	sales_rep: 34,
// 	address_1: user['Address 1'],
// 	address_2: user['Address 2'],
// 	city: user.City,
// 	state: user.State,
// 	zip: user.Zip,
// 	country: 'US',
// 	shipping_config: { defaultLocationCode: user['Preffered Location'] },
// 	username: user.Username.toLowerCase(),
// 	store_number: user['Site ID/Ship-to Code']
// }