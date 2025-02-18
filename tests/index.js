var _ = require( "underscore" );
var expect = require( "expect" );
var https = require( "https" );
var program = require( "commander" );
var config = require( "../common/config" );
var Cache = require( "../common/libs/helpers/cache" );
var DB = require( "../common/libs/db" );
var MSSQL = require( "../common/libs/mssql" );
var appSettings = __setup();
var argv = JSON.parse( process.env.npm_config_argv ).original.slice( 1 );
var definedUser = function() {
	return JSON.parse(JSON.stringify(foundUser));
};
var DTCUser = function() {
	return JSON.parse(JSON.stringify(dtcUser));
};
var tests = {
	getDealerWarehouses: function( callback ) {
		describe( "Dealer Warehouses", function() {
			var user = new definedUser();
			var dtcuser = new DTCUser();
			var messages = [];
			var errors = [];
			var result;
			var handleItCallback = __handleIt_Callback.bind( tests, errors, messages );
			let userWarehouseLocations = VWModel.getDealerWarehouses(user, user.dealer);
			let DTCWarehouseLocations = VWModel.getDealerWarehouses(dtcuser, dtcuser.dealer);
			__handleIt( "Warehouses", "should be an object", function( response ) {
				expect( userWarehouseLocations ).toBeAn( "object", "Response is not an object" );
				expect( DTCWarehouseLocations ).toBeAn( "object", "Response is not an object" );
			}, handleItCallback );
			describe( "User Warehouse filtering", function() {
				__handleIt( "Normal User", "should not have Harris tire locations", function( response ) {
					expect(userWarehouseLocations['GA']).toBeAn( "undefined", "Location was GA found" );
					expect(userWarehouseLocations['NC']).toBeAn( "undefined", "Location was NC found" );
					expect(userWarehouseLocations['FL']).toBeAn( "undefined", "Location was FL found" );
				}, handleItCallback );
			});
			describe( "DTC Warehouse locations", function() {
				__handleIt( "DTC User", "should have Harris tire locations", function( response ) {
					expect(DTCWarehouseLocations['FL']).toBeAn( "undefined", "Location GA was found" );
					expect(DTCWarehouseLocations['GA']).toBeAn( "object", "Location NC was not found" );
					expect(DTCWarehouseLocations['NC']).toBeAn( "undefined", "Location FL was found" );
				}, handleItCallback );
			});
			describe( "User Default Locations", function() {
				__handleIt( "Users", "should have default locations", function( response ) {
					expect(user.shipping_config).toBeAn( "object", "Shipping Config was not found on normal user" );
					expect(dtcuser.shipping_config).toBeAn( "object", "Shipping Config was not found on DTC user" );
				}, handleItCallback );
			});
			after(function( done ) {
				__postMessageToSlack( errors.length ? `= VWModel.getDealerWarehouses: Failed;\n\t${ messages.join( "\n\t" ) }` : `= VWModel.getDealerWarehouses: Success;\n\t${ messages.join( "\n\t" ) }`, function() {
					callback( done );
				});
			});
		});
	},
	getCartDetails: function( callback ) {
		describe( "VWModel.getCartDetails()", function() {
			var user = new definedUser();
			var messages = [];
			var errors = [];
			var handleItCallback = __handleIt_Callback.bind( tests, errors, messages );
			var result;
			this.timeout( 30000 );
			it( "should return a response", function( done ) {
				VWModel.getCartDetails({
					appSettings: appSettings,
					user: user
				}).then(function( response ) {
					result = response;
					__handleExpectations_Response( response, "VWModel.getCartDetails() should return a response", handleItCallback, done );
				}).fail(function( error ) {
					var errmessage = error.message ? new Error( error.message ) : error;
					handleItCallback( errmessage, null, done );
				}).done();
			});
			describe( "Response", function() {
				__handleIt( "Response", "should be an object", function( response ) {
					expect( result ).toBeAn( "object", "Response is not an object" );
				}, handleItCallback );
				__handleIt( "Response", "should have a props object", function( response ) {
					expect( result.props ).toBeAn( "object", "Response.props is not an object" );
				}, handleItCallback );
				__handleIt( "Response", "should have a user object", function( response ) {
					expect( result.props.user ).toBeAn( "object", "Response.props.user is not an object" );
				}, handleItCallback );
				__handleIt( "Response", "should have a user cart object", function( response ) {
					expect( result.props.user.cart ).toBeAn( "object", "Response.props.user.cart is not an object" );
				}, handleItCallback );
				__handleIt( "Response", "should have a user cart items array", function( response ) {
					expect( Array.isArray( result.props.user.cart.items ) ).toBe( true, "Response.props.user.cart.items is not an array" );
					response.text += ` (${ result.props.user.cart.items.length } ${ result.props.user.cart.items.length === 1 ? "item" : "items" })`;
				}, handleItCallback );
			});
			describe( "Items", function() {
				__handleIt( "Items", "should have an id, part_number, upc, type, specification, inventory, image, product_id, price, and xref properties", function( response ) {
					__handleExpectations_Item( response, result.props.user.cart.items );
				}, handleItCallback );
			});
			after(function( done ) {
				__postMessageToSlack( !result || errors.length ? `= VWModel.getCartDetails: Failed;\n\t${ messages.join( "\n\t" ) }` : `= VWModel.getCartDetails: Success;\n\t${ messages.join( "\n\t" ) }`, function() {
					callback( done );
				});
			});
		});
	},
	getCartTotals: function( callback ) {
		describe( "VWModel.getCartTotals()", function() {
			var user = new definedUser();
			var body = {
				po_number: 'qaPO',
				shipping: '{"store_number":"1234567890","first_name":"Admin","last_name":"Mirum","email":"admin@mirumshopper.com","phone_number":"1234567890","company":"Mirum Shopper","address_1":"2920 S Sepulveda Blvd","address_2":"","city":"Los Angeles","country":"USA","state":"CA","postalcode":"90064"}',
				warehouses: '{"AL":{"method":"standard","option":""}}'
			};
			var messages = [];
			var errors = [];
			var handleItCallback = __handleIt_Callback.bind( tests, errors, messages );
			var result, exception;
			this.timeout( 30000 );
			it( "should return a response", function( done ) {
				VWModel.getCartTotals({
					appSettings: appSettings,
					body: body,
					user: user
				}).then(function( response ) {
					result = response;
					__handleExpectations_Response( response, "VWModel.getCartTotals() should return a response", handleItCallback, done );
				}).fail(function( error ) {
					var message, errmessage;
					if( error.message && !error.props.user.cart.items.length ) {
						exception = true;
						message = "Cart has no items";
					}
					else {
						errmessage = error.message ? new Error( error.message ) : error;
					}
					handleItCallback( errmessage, message, done );
				}).done();
			});
			describe( "Response", function() {
				__handleIt( "Response", "should be an object", function( response ) {
					if( result ) {
						expect( result ).toBeAn( "object", "Response is not an object" );
					}
					else {
						response.text = "";
					}
				}, handleItCallback );
				__handleIt( "Response", "should have a props object", function( response ) {
					if( result ) {
						expect( result.props ).toBeAn( "object", "Response.props is not an object" );
					}
					else {
						response.text = "";
					}
				}, handleItCallback );
				__handleIt( "Response", "should have a totals object", function( response ) {
					if( result ) {
						expect( result.props.totals ).toBeAn( "object", "Response.props.totals is not an object" );
					}
					else {
						response.text = "";
					}
				}, handleItCallback );
			});
			describe( "Totals", function() {
				// __handleIt( "Totals", "should have a discount total", function( response ) {
				// 	expect( result.props.totals.discounttotal ).toExist( "Response.props.totals.discounttotal does not exist" );
				// 	response.text += ` ($${ result.props.totals.discounttotal })`
				// }, handleItCallback );
				__handleIt( "Totals", "should have a subtotal", function( response ) {
					if( result ) {
						expect( result.props.totals.subtotal ).toExist( "Response.props.totals.subtotal does not exist" );
						response.text += ` ($${ result.props.totals.subtotal })`;
					}
					else {
						response.text = "";
					}
				}, handleItCallback );
				__handleIt( "Totals", "should have a shipping total", function( response ) {
					if( result ) {
						expect( result.props.totals.shippingtotal ).toExist( "Response.props.totals.shippingtotal does not exist" );
						response.text += ` ($${ result.props.totals.shippingtotal })`;
					}
					else {
						response.text = "";
					}
				}, handleItCallback );
				__handleIt( "Totals", "should have a tax total", function( response ) {
					if( result ) {
						expect( result.props.totals.taxtotal ).toExist( "Response.props.totals.taxtotal does not exist" );
						response.text += ` ($${ result.props.totals.taxtotal })`;
					}
					else {
						response.text = "";
					}
				}, handleItCallback );
				__handleIt( "Totals", "should have a total", function( response ) {
					if( result ) {
						expect( result.props.totals.total ).toExist( "Response.props.totals.total does not exist" );
						response.text += ` ($${ result.props.totals.total })`;
					}
					else {
						response.text = "";
					}
				}, handleItCallback );
			});
			after(function( done ) {
				__postMessageToSlack( (!result && !exception) || errors.length ? `= VWModel.getCartTotals: Failed;\n\t${ messages.join( "\n\t" ) }` : `= VWModel.getCartTotals: Success;\n\t${ messages.join( "\n\t" ) }`, function() {
					callback( done );
				});
			});
		});
	},
	getDealerItems: function( callback ) {
		describe( "VWModel.getDealerItems()", function() {
			var user = new DTCUser();
			var dealer = user.dealer;
			var nav_customer_id = dealer.nav_customer_id;
			var messages = [];
			var errors = [];
			var handleItCallback = __handleIt_Callback.bind( tests, errors, messages );
			var result;
			this.timeout( 30000 );
			it( "should return a response", function( done ) {
				VWModel.getDealerItems({
					nav_customer_id: nav_customer_id
				}).then(function( response ) {
					result = response;
					__handleExpectations_Response( response, "VWModel.getDealerItems() should return a response", handleItCallback, done );
				}).fail(function( error ) {
					handleItCallback( error, null, done );
				}).done();
			});
			describe( "Response", function() {
				__handleIt( "Response", "should be an array", function( response ) {
					expect( Array.isArray( result ) ).toBe( true, "Response is not an array" );
					expect( result.length ).toBeGreaterThan( 0, "Response.length is not greater than 0" );
					response.text += ` (${ result.length } ${ result.length === 1 ? "item" : "items" })`;
				}, handleItCallback );
			});
			describe( "Items", function() {
				__handleIt( "Items", "should have an id, part_number, upc, type, specification, inventory, image, product_id, price, and xref properties", function( response ) {
					__handleExpectations_Item( response, result );
				}, handleItCallback );
			});
			after(function( done ) {
				__postMessageToSlack( !result || errors.length ? `= VWModel.getDealerItems: Failed;\n\t${ messages.join( "\n\t" ) }` : `= VWModel.getDealerItems: Success;\n\t${ messages.join( "\n\t" ) }`, function() {
					callback( done );
				});
			});
		});
	},
	getDealerProductsAndSpecifications: function( callback ) {
		describe( "VWModel.getDealerProductsAndSpecifications()", function() {
			var user = new DTCUser();
			var dealer = user.dealer;
			var nav_customer_id = dealer.nav_customer_id;
			var messages = [];
			var errors = [];
			var handleItCallback = __handleIt_Callback.bind( tests, errors, messages );
			var result;
			this.timeout( 30000 );
			it( "should return a response", function( done ) {
				VWModel.getDealerProductsAndSpecifications({
					nav_customer_id: nav_customer_id
				}).then(function( response ) {
					result = response;
					__handleExpectations_Response( response, "VWModel.getDealerProductsAndSpecifications() should return a response", handleItCallback, done );
				}).fail(function( error ) {
					handleItCallback( error, null, done );
				}).done();
			});
			describe( "Response", function() {
				__handleIt( "Response", "should be an object", function( response ) {
					expect( result ).toBeAn( "object", "Response is not an object" );
				}, handleItCallback );
				__handleIt( "Response", "should have an items array", function( response ) {
					expect( Array.isArray( result.items ) ).toBe( true, "Response.items is not an array" );
				}, handleItCallback );
				__handleIt( "Response", "should have a products array", function( response ) {
					expect( Array.isArray( result.products ) ).toBe( true, "Response.products is not an array" );
				}, handleItCallback );
				__handleIt( "Response", "should have a specifications object", function( response ) {
					expect( result.specifications ).toBeAn( "object", "Response.specifications is not an object" );
				}, handleItCallback );
			});
			describe( "Items", function() {
				__handleIt( "Items", "should have an id, part_number, upc, type, specification, inventory, image, product_id, price, and xref properties", function( response ) {
					__handleExpectations_Item( response, result.items );
				}, handleItCallback );
			});
			describe( "Specifications", function() {
				__handleIt( "Specifications", "should have an accessory, tire, and wheel object", function( response ) {
					expect( result.specifications.filter.accessory ).toBeAn( "object", "Specifications.accessory is not an object" );
					expect( result.specifications.filter.tire ).toBeAn( "object", "Specifications.tire is not an object" );
					expect( result.specifications.filter.wheel ).toBeAn( "object", "Specifications.wheel is not an object" );
				}, handleItCallback );
			});
			describe( "Specifications (Accessory)", function() {
				__handleIt( "Specifications (Accessory)", "should have a brand, finish, and size object with a label string and values array", function( response ) {
					__handleExpectations_Specifications( response, result.specifications.filter, "accessory" );
				}, handleItCallback );
			});
			describe( "Specifications (Tire)", function() {
				__handleIt( "Specifications (Tire)", "should have a brand, model, ply, and search_description object with a label string and values array", function( response ) {
					__handleExpectations_Specifications( response, result.specifications.filter, "tire" );
				}, handleItCallback );
			});
			describe( "Specifications (Wheel)", function() {
				__handleIt( "Specifications (Wheel)", "should have a backspace, brand, boltpattern, diameter, finish, offset, and width object with a label string and values array", function( response ) {
					__handleExpectations_Specifications( response, result.specifications.filter, "wheel" );
				}, handleItCallback );
			});
			after(function( done ) {
				__postMessageToSlack( !result || errors.length ? `= VWModel.getDealerProductsAndSpecifications: Failed;\n\t${ messages.join( "\n\t" ) }` : `= VWModel.getDealerProductsAndSpecifications: Success;\n\t${ messages.join( "\n\t" ) }`, function() {
					callback( done );
				});
			});
		});
	}
};

var username = "admin@mirumshopper.com";
var Database, VWModel, test, foundUser, dtcUser, Importer;

// Disabling tests
// __init();

function __handleExpectations_Item( response, items ) {
	var properties = ["id", "part_number", "upc", "type", "specification", "inventory", "image", "product_id", "price", "xref"];
	var hasFailed = false;
	items.forEach(function( item, index, array ) {
		properties.forEach(function( property, index, array ) {
			switch( property ) {
				case "price":
					expect( item[property] ).toExist( `Items[${ index }]["${ property }"] (${ item.part_number }) is undefined or null;` );
					expect( parseFloat( item[property] ) ).toBeA( "number", `Items[${ index }]["${ property }"] (${ item.part_number }) is not a number;` );
				break;
				case "image":
				case "product_id":
				case "upc":
				case "xref":
					expect( item.hasOwnProperty( property ) ).toBe( true, `Items[${ index }]["${ property }"] (${ item.part_number }) does not exist;` );
				break;
				default:
					expect( item[property] ).toExist( `Items[${ index }]["${ property }"] (${ item.part_number }) is undefined or null;` );
				break;
			}
		});
	});
};
function __handleExpectations_Response( response, message, callback, done ) {
	try {
		expect( response ).toExist( "Response does not exist" );
		callback( null, message, done );
	}
	catch( error ) {
		callback( error, null, done );
	}
};
function __handleExpectations_Specifications( response, specifications, type ) {
	var fields = {
		accessory: ["brand", "finish", "size"],
		tire: ["brand", "model", "ply", "search_description"],
		wheel: ["backspace", "brand", "boltpattern", /* "boltpattern1", "boltpattern2", */ "diameter", "finish", "offset", "width"]
	};
	var count = [];
	fields[type].forEach(function( field, index, array ) {
		var specification = specifications[type][field];
		expect( typeof specification === "object" && specification.label && Array.isArray( specification.values ) ).toBe( true, `Specifications["${ type }"]["${ field }"] is not an object, is missing a label, or is not an array` );
		count.push( specification.values.length );
	});
	response.text += ` (${ count.join( ", " ) })`;
};
function __handleIt( label, description, expectation, callback ) {
	it( description, function( done ) {
		try {
			var response = { text: `${ label } ${ description }` };
			expectation( response );
			callback( null, response.text, done );
		}
		catch( error ) {
			callback( error, null, done );
		}
	});
};
function __handleIt_Callback( errors, messages, error, message, done ) {
	if( error ) {
		errors.push( error );
		messages.push( `x\t${ error }` );
	}
	else if( message ) {
		messages.push( `o\tOk: ${ message }` );
	}
	done( error );
};
function __init() {
	describe("Vision Wheel Tests", function() {
		var que = [];

		before(function() {
			this.timeout(30000);
			argv.forEach(function( arg, index, array ) {
				if (arg.match("--test=") || arg.match("-t")) {
					if (arg.match("--test=")) test = arg.split("--test=")[1];
					else if (arg.match("-t")) test = arg.split("-t")[1].trim();
				}
				if (arg.match("--username=") || arg.match("-u")) {
					if (arg.match("--username=")) username = arg.split("--username=")[1];
					else if (arg.match("-u")) username = arg.split("-u")[1].trim();
				}
			});

			que.push( __initDB );
			que.push( __initMSSQL );

			if (test && test === 'importer') {
				Importer = require("../importer/server");
				que.push( __parseItemData );
			} else {
				que.push( __initVWModel );
				que.push( __initUser.bind( tests, username ) );
				que.push( __initDealer );
				for (var key in tests) que.push(tests[key]);
			}
		});

		it("should initiate unit tests", function(done) {
			__postMessageToSlack("================= Vision Wheel Unit Tests: Start; =================", function() {
				__run(que, function(done) {
					__postMessageToSlack("================= Vision Wheel Unit Tests: End; =================", function() {
						done();
					});
				});
				done();
			});
		});
	});
};
function __initDB( callback ) {
	describe( "DB()", function() {
		var messages = [];
		var errors = [];
		var handleItCallback = __handleIt_Callback.bind( tests, errors, messages );
		var result;
		this.timeout( 30000 );
		it( "shoud return a response", function( done ) {
			DB( appSettings.database, function( error, response ) {
				Database = result = response;
				try {
					handleItCallback( error, "DB() should return a response", done );
				}
				catch( error ) {
					handleItCallback( error, null, done );
				}
			});
		});
		after(function( done ) {
			__postMessageToSlack( !result || errors.length ? `= DB(): Failed;\n\t${ messages.join( "\n\t" ) }` : `= DB(): Success;\n\t${ messages.join( "\n\t" ) }`, function() {
				callback( done );
			});
		});
	});
};
function __initDealer( callback ) {
	describe( "Database.membership.dealer()", function() {
		var dealer_id = foundUser.dealer_id;
		var dtcdealer_id = dtcUser.dealer_id;
		var messages = [];
		var errors = [];
		var handleItCallback = __handleIt_Callback.bind( tests, errors, messages );
		this.timeout( 30000 );
		it( "should return a normal dealer", function( done ) {
			Database.membership.dealer.find({
				id: dealer_id
			}, function( error, result ) {
				var dealer = result[0];
				foundUser.dealer = dealer;
				try {
					expect( dealer ).toExist();
					handleItCallback( error, `Database.membership.dealer() should return a response (${ dealer_id })`, done );
				}
				catch( error ) {
					handleItCallback( error, null, done );
				}
			});
		});
		it( "should return a dtc dealer", function( done ) {
			Database.membership.dealer.find({
				id: dtcdealer_id
			}, function( error, result ) {
				var dealer = result[0];
				dtcUser.dealer = dealer;
				try {
					expect( dealer ).toExist();
					handleItCallback( error, `Database.membership.dealer() should return a response (${ dealer_id })`, done );
				}
				catch( error ) {
					handleItCallback( error, null, done );
				}
			});
		});
		after(function( done ) {
			__postMessageToSlack( !foundUser.dealer || errors.length ? `= Database.membership.dealer(): Failed;\n\t${ messages.join( "\n\t" ) }` : `= Database.membership.dealer(): Success;\n\t${ messages.join( "\n\t" ) }`, function() {
				callback( done );
			});
		});
	});
};
function __initMSSQL( callback ) {
	describe( "MSSQL.initialize()", function() {
		var messages = [];
		var errors = [];
		var handleItCallback = __handleIt_Callback.bind( tests, errors, messages );
		this.timeout( 30000 );
		it( "should return a response", function( done ) {
			MSSQL.initialize( appSettings, function( error ) {
				handleItCallback( error, "MSSQL.initialize() should return a response", done );
			});
		});
		after(function( done ) {
			__postMessageToSlack( !MSSQL.hasInitialized || errors.length ? `= MSSQL.initialize(): Failed;\n\t${ messages.join( "\n\t" ) }` : `= MSSQL.initialize(): Success;\n\t${ messages.join( "\n\t" ) }`, function() {
				callback( done );
			});
		});
	});
};
function __initVWModel( callback ) {
	describe( "VWModel", function() {
		this.timeout( 30000 );
		VWModel = require( "models" );
		it( "should be an object", function( done ) {
			try {
				expect( VWModel ).toBeAn( "object" );
				done();
			}
			catch( error ) {
				done( error );
			}
		});
		after( callback );
	});
};
function __initUser( username, callback ) {
	describe( "Database.membership.user()", function() {
		var messages = [];
		var errors = [];
		var handleItCallback = __handleIt_Callback.bind( tests, errors, messages );
		this.timeout( 30000 );
		it( "should return a DTC user", function( done ) {
			Database.membership.user.find({
				email: username
			}, function( error, result ) {
				var user = result[0];
				var dealer_id = user.dealer_id;
				dtcUser = user;
				try {
					expect( user ).toExist();
					expect( dealer_id ).toExist();
					handleItCallback( error, `Database.membership.user() should return a response (${ username })`, done );
				}
				catch( error ) {
					handleItCallback( error, null, done );
				}
			});
		});
		it( "should return a non-DTC user", function( done ) {
			Database.membership.user.find({
				email: "ryan.elston@mirumagency.com"
			}, function( error, result ) {
				var user = result[0];
				var dealer_id = user.dealer_id;
				foundUser = user;
				try {
					expect( user ).toExist();
					expect( dealer_id ).toExist();
					handleItCallback( error, `Database.membership.user() should return a response (${ username })`, done );
				}
				catch( error ) {
					handleItCallback( error, null, done );
				}
			});
		});
		after(function( done ) {
			__postMessageToSlack( !foundUser || errors.length ? `= Database.membership.user(): Failed;\n\t${ messages.join( "\n\t" ) }` : `= Database.membership.user(): Success;\n\t${ messages.join( "\n\t" ) }`, function() {
				callback( done );
			});
		});
	});
};
function __parseItemData(callback) {
	describe("Importer - SQL NAV Item Parser", function() {
		var messages = [];
		var errors = [];
		var sqlNavItem = null;

		it("should return an item", function(done) {
			this.timeout(30000);
			Importer.executeTest('test-fetch-item').then(function(res) {
				Importer.killConnection();
				sqlNavItem = res;
				done();
			})
			.catch(function(err) {
				var errmessage = err.message ? new Error(err.message) : err;
				handleItCallback(errmessage, null, done);
			});
		});

		describe("SQL Item Structure", function() {
			it("property 'Item No_' should be a string", function() {
				expect(sqlNavItem['Item No_']).toBeAn("string", "Item No_ is not a string");
			});
			it("property 'Item No_ 2' should be a string", function() {
				expect(sqlNavItem['Item No_ 2']).toBeAn("string", "Item No_ 2 is not a string");
			});
			it("property 'Description' should be a string", function() {
				expect(sqlNavItem['Description']).toBeAn("string", "Description is not a string");
			});
			it("property 'Description 2' should be a string", function() {
				expect(sqlNavItem['Description 2']).toBeAn("string", "Description 2 is not a string");
			});
			it("property 'Search Description' should be a string", function() {
				expect(sqlNavItem['Search Description']).toBeAn("string", "Search Description is not a string");
			});
			it("property 'Base Unit of Measure' should be a string", function() {
				expect(sqlNavItem['Base Unit of Measure']).toBeAn("string", "Base Unit of Measure is not a string");
			});
			it("property 'Sale Unit of Measure' should be a string", function() {
				expect(sqlNavItem['Sale Unit of Measure']).toBeAn("string", "Sale Unit of Measure is not a string");
			});
			it("property 'Item Category Code' should be a string", function() {
				expect(sqlNavItem['Item Category Code']).toBeAn("string", "Item Category Code is not a string");
			});
			it("property 'Product Group Code' should be a string", function() {
				expect(sqlNavItem['Product Group Code']).toBeAn("string", "Product Group Code is not a string");
			});
			it("property 'Offset' should be a string", function() {
				expect(sqlNavItem['Offset']).toBeAn("string", "Offset is not a string");
			});
			it("property 'Ply' should be a string", function() {
				expect(sqlNavItem['Ply']).toBeAn("string", "Ply is not a string");
			});
			it("property 'Inventory Posting Group' should be a string", function() {
				expect(sqlNavItem['Inventory Posting Group']).toBeAn("string", "Inventory Posting Group is not a string");
			});
		});

		describe("Parsed Item Structure", function() {
			it("should return a parsed item", function() {
				this.timeout(30000);
				sqlNavItem = Importer.executeNodeAction('test-parser', sqlNavItem);
			});
			it("should be an object", function() {
				expect(sqlNavItem).toBeAn("object", "item is not an object");
			});
			it("property 'type' should be a string", function() {
				expect(sqlNavItem['type']).toBeAn("string", "type is not a string");
			});
			it("property 'part_number' should be a string", function() {
				expect(sqlNavItem['part_number']).toBeAn("string", "part_number is not a string");
			});
			it("property 'specification' should be an object", function() {
				expect(sqlNavItem['specification']).toBeAn("object", "specification is not an object");
			});
		});

		after(function(done) {
			__postMessageToSlack(!sqlNavItem || errors.length ? `= Importer.executeTest('test-fetch-item'): Failed;\n\t${ messages.join( "\n\t" ) }` : `= Importer.executeTest('test-fetch-item'): Success;\n\t${ messages.join( "\n\t" ) }`, function() {
				callback(done);
			});
		});
	});
};
function __postMessageToSlack( message, callback ) {
	var postData = JSON.stringify({
		channel: "#z-slackbot",
		text: message,
		parse: "full"
	});
	var postOptions = {
		host: "hooks.slack.com",
		path: "/services/T02J2LAEG/B4X3BC0SJ/IxCxHDdeCo0sudG9VSZAit9Q",
		method: "POST"
	};
	var post = https.request( postOptions, function( response ) {
		response.on( "error", function( error ) {
			hasError = error;
		});
		response.on( "data", function( chunk ) {
			// required to trigger end
		});
		response.on( "end", function() {
			if( callback ) { callback(); }
		});
	});
	var hasError;
	post.write( postData );
	post.end();
	// callback();
};
function __run( que, callback ) {
	var task = que[0];
	if( task ) {
		task(function( done ) {
			que.shift();
			if( que.length ) {
				__run( que, callback );
				done();
			}
			else {
				callback( done );
			}
		});
	}
	else {
		callback();
	}
};
function __setup() {
	var appSettings = config.mergeSettingsDefault( config.settings( "config/env" ), program );
	appSettings.environment = process.env.NODE_ENV || "development";
	Cache.set("TaxRatesAPI", appSettings.taxRatesAPI);
	return appSettings;
};
