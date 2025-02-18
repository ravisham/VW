let _ = require("underscore"),
	Q = require("q"),
	Helprs = require("helprs"),
	EmailController = require("controllers/email"),
	debug = require("libs/buglog"),
	MSSQL = require("libs/mssql"),
	ShippingCalculator = require("libs/shipping_calculator"),
	Taxapi = require("libs/taxapi"),
	Generic = require("models/generic"),
	Item = require("models/public/item"),
	Items = require("models/items")(),
	Sale = require("models/sales/sale"),
	SaleItem = require("models/sales/sale_item"),
	SalesRep = require("models/sales/salesrep"),
	User = require("models/membership/user"),
	log = debug("models", "checkout", "repository"),
	warehousesJSON = require("config/settings/warehouses");

/**
 * @module CheckoutRepository
 * @description
 * Handles all database access for the Checkout.
 */
module.exports = {
  /**
   * @returns {Promise}
   * @param {object} props
   */
  getDealerItemsById: function (props) {
    let deferred = Q.defer()
    let user = props.user
    //console.log("~~~~~~~~~~ USER ~~~~~~~~",user);
    let dealer = user.dealer
    //console.log("~~~~~~~~~~ DEALER ~~~~~~~~",dealer);
    let nav_customer_id = dealer.nav_customer_id
    //console.log("~~~~~~~~~~ NAV CUSTOMER ID ~~~~~~~~",nav_customer_id);
    let userCart = user.cart
    //console.log("~~~~~~~~~~ USER CART ~~~~~~~~",userCart);
    let userCartItems = userCart.items
    //console.log("~~~~~~~~~~ USER CART ITEMS ~~~~~~~~",userCartItems);
    let itemIds = _.allKeys(userCartItems)
    if (typeof userCartItems[0] !== "undefined") {
      itemsIds = []
      itemIds.push(userCartItems[0].id)
      itemIds.shift()
    }
    if (itemIds.length) {
      Items.getCartItemsByIdWithProductsBrands({
        id: itemIds,
        nav_customer_id: nav_customer_id,
        user
      })
        .then(function (itms) {
          deferred.resolve(itms)
        })
        .catch(function (error) {
          deferred.reject(error)
        })
    } else {
      deferred.resolve([])
    }
    return deferred.promise
  },

  /**
   * Updates the user model's cart
   * based on props.user.id and props.user.cart
   *
   * The returned promise will resolve passing the user object as its sole property.
   *
   * @returns {Promise}
   * @param {object} props
   */
  updateUserCart: function (props) {
    let deferred = Q.defer()
    let user = props.user
    let userId = user.id
    let userCart = user.cart
    User.update({
      id: userId,
      cart: userCart
    })
      .then(function (user) {
        deferred.resolve(user)
      })
      .fail(function (error) {
        deferred.reject(error)
      })
      .done()
    return deferred.promise
  },

  /**
   * @property {object}
   */
  warehousesJSON: warehousesJSON,

  /**
   * Attempt to get the props.user's sales rep object
   * from the salesrep module.
   *
   * @returns {Promise}
   * @param {object} props
   */
  findSalesRep: function (props) {
    let deferred = Q.defer()

    let user = props.user
    let userSalesRepId = user.sales_rep

    SalesRep.findOne({
      id: userSalesRepId
    })
      .then(function (salesRepObj) {
        deferred.resolve(salesRepObj)
      })
      .fail(function (error) {
        deferred.reject(error)
      })
      .done()

    return deferred.promise
  },

  /**
   * Attempt to get the "Latest Generated Web Order Number" for the environment
   * and then generate a new "New Generated Web Order Number"
   * Those are then returned as properties of the argument in the Promise.resolve
   *
   * @returns {Promise}
   * @param {object} props
   */
  generateWebOrderNumber: function (props) {
    let deferred = Q.defer()
    let appSettings = props.appSettings
    let environment = appSettings.environment

    let envCode = "W"
    let orderCode = "W"
    if (environment === "qa" || environment === "staging" || environment === "development") {
      envCode = "V"
      orderCode = "V"
    }
    if (props.user.isReturn == true) {
      envCode = "WR"
      if (environment === "qa" || environment === "staging" || environment === "development") envCode = "VR"
    }
    let wons = {
      "Latest Generated Web Order Number": null,
      "New Generated Web Order Number": null
    }

    Generic.getLastWebOrderNumberByEnvAndId({ envCode: envCode })
      .then(function (lastWebOrderNumber) {
        wons["Latest Generated Web Order Number"] = lastWebOrderNumber
        if (props.user.isReturn == true) {
          let new_won = webOrderNumber(envCode, lastWebOrderNumber.replace(orderCode, "")).toUpperCase()
          console.log("return num", new_won)
          wons["New Generated Web Order Number"] = new_won
        } else {
          console.log("new web num", wons)
          wons["New Generated Web Order Number"] = webOrderNumber(envCode, lastWebOrderNumber).toUpperCase()
        }
        deferred.resolve(wons)

        // let splitLWON = lastWebOrderNumber.split("-");
        // /** Now put it back together and resolve. */
        // let WebOrderNumber = null;
        // let isEnvBasedWON = false;
        // splitLWON.forEach(function(roundset, index) {
        //     if (index === 0) {
        //         if (roundset === '01' || roundset === '02' || roundset === '03')
        //             isEnvBasedWON = true;
        //         WebOrderNumber = roundset;
        //     } else if ((index + 1) === splitLWON.length) {
        //         // If last, increment the value
        //         roundset = parseInt(roundset);
        //         roundset++;
        //         roundset = roundset.toString();
        //         WebOrderNumber += "-" + roundset;
        //     } else
        //         WebOrderNumber += "-" + roundset;
        // });
        // if (!isEnvBasedWON)
        //     WebOrderNumber = envCode + "-" + WebOrderNumber;
        // wons["New Generated Web Order Number"] = WebOrderNumber;
        // deferred.resolve(wons);
      })
      .fail(function (error) {
        log("ERROR with DB Function 'getLastWebOrderNumberByEnv()': %O", error)
        wons["New Generated Web Order Number"] = webOrderNumber(envCode)
        deferred.resolve(wons)
      })

    return deferred.promise
  },

  /**
   * This was originally built to handle getting shipping rates.
   * In October 2017, shipping rates were removed as a concept.
   * The interface remains and it now just returns an empty array to the Promise.resolve
   *
   * @returns {Promise}
   * @param {object} props
   */
  getShippingRates: (props) => {
    // SETTING UP FOR THE FUTURE GET SHIPPING RATES THAT AREN'T STATIC
    // const _promise = new Promise((resolve, reject) => {
    //   if (props.shippingtotal) {
    //     resolve(props)
    //   } else {
    //     reject({
    //       message: "Shipping total is not found.",
    //       props: props
    //     })
    //   }
    // })
    // 16-10-17 - Bryant - since we're removing shipping as a concept, returning empty promises until this is properly deprecated
    // let shipping = props.shipping;
    // let user = props.user;
    // let warehouses = props.warehouses;
    // let calculateTotals = true;
    // for (let key in warehouses) {
    // 	let state = key;
    // 	let stateOpts = warehouses[key];
    // 	if (stateOpts.method === "ltl" || stateOpts.method === "expedited") {
    // 		calculateTotals = false;
    // 		break;
    // 	}
    // }
    // if (calculateTotals) {
    // 	__getShippingRates({
    // 		shipping: shipping,
    // 		user: user,
    // 		warehouses: warehouses
    // 	}).then(function (shippingRates) {
    // 		deferred.resolve(shippingRates);
    // 	}).catch(function (error) {
    // 		console.log("ERROR : catch : getShippingRates > __getShippingRates", error);
    // 		deferred.reject(error);
    // 	});
    // }
    // else {
    // 	let shippingRates = [];
    // 	deferred.resolve(shippingRates);
    // }
    // return _promise

    let deferred = Q.defer()

    deferred.resolve([])

    return deferred.promise
  },

  /**
   * This was originally built to handle getting tax rates.
   * Since then, tax rates were removed as a concept.
   * The interface remains and it now just returns an empty array to the Promise.resolve
   *
   * @returns {Promise}
   * @param {object} props
   */
  getTaxRate: (props) => {
    let deferred = Q.defer()

    // let shipping = props.shipping;
    // let postalcode = shipping.postalcode;
    // let user = props.user;
    // let dealer = user.dealer;
    // let isDealer = dealer ? true : false;
    // let isTaxable = isDealer && dealer.taxable ? true : false;

    // let taxST = {
    // 	country: "USA",
    // 	postal: postalcode
    // };
    // //no
    // //if( !isDealer || isTaxable ) {
    // if (false) {
    // 	Taxapi.getTaxRateByZip(taxST).then(function (taxRate) {
    // 		deferred.resolve(taxRate);
    // 	}).fail(function (error) {
    // 		deferred.reject(error);
    // 	}).done();
    // }
    // else {
    // 	taxST.rate = 0;
    // 	deferred.resolve(taxST);
    // }

    deferred.resolve([])

    return deferred.promise
  },

  /**
   * Attempt to publish a purchase order (contained in props)
   * to the MS SQL "Nav" database.
   *
   * @returns {Promise}
   * @param {object} props
   * @see models/checkout Controller.__submitPurchaseOrder (called by)
   * @see libs/mssql MSSQL.__submitPurchaseOrder (calls)
   */
  publishPurchaseOrder: function (props) {
    let deferred = Q.defer()
    let purchaseOrder = props.purchaseOrder
    let shippingRates = props.shippingRates
    let warehouses = props.warehouses
    let user = props.user
    const vehicleInfo = props.vehicleInfo
    //	console.log('publish po ship',props.shipping);
    if (props.shipping.is_api_order) {
      purchaseOrder.savedSale.is_api_order = true
      purchaseOrder.savedSale.method = props.shipping.method
      purchaseOrder.savedSale.eship_agent_service_code = props.shipping.eship_agent_service_code
      if (user.first_name == "DTC") {
        console.log("dtc transaction")
        purchaseOrder.savedSale.transaction_type = 2
      }
    }
    purchaseOrder.savedSale.original_order_num = props.shipping.original_order_num
    purchaseOrder.savedSale.ship_agent = props.shipping.ship_agent
    purchaseOrder.savedSale.return_reason = props.shipping.return_reason
    // let order = props.order;
    // let options = props.options;

    log("Now Publishing PO to NAV")

    let originalPrices = {}
    _.forEach(warehouses, (warehouse) => {
      _.forEach(warehouse.items, (itemParent) => {
        let item = itemParent.item
        if (item.origPrice) originalPrices[item.id] = item.origPrice
      })
    })

    _.forEach(purchaseOrder.savedSaleItems, (item) => {
      if (originalPrices[item.item_id]) {
        let updatedPrice = "$" + originalPrices[item.item_id]
        item.unit_price = updatedPrice
        item.total_line_amount = updatedPrice
      }
    })
    // console.log('before publish',purchaseOrder);
    MSSQL.publishPurchaseOrder({
      purchaseOrder: purchaseOrder,
      shippingRates: shippingRates,
      warehouses: warehouses,
      vehicleInfo: vehicleInfo,
      user: user
    })
      .then(function (publishedPO) {
        deferred.resolve([])

        // * Now that we have submitted to NAV we will now take the extra step
        // * to save the inserted NAV records into our DB.
        // __saveNavRecords( publishedPO, purchaseOrder ).then(function( savedRecords ) {
        // 	log( "Successfully Updated Sale and Sale Items NAV Records." );
        // 	deferred.resolve( savedRecords );
        // }).catch(function( error ) {
        // 	let errorMessage = "Failed to Update Sale and/or Sale Items NAV Records";
        // 	log( colors.red( errorMessage ) + ": %O", error );
        // 	deferred.reject( error );
        // });
      })
      .fail(function (error) {
        log("ERROR in /models/checkout/repository.js Failed to Publish PO to NAV")
        log("Error was:")
        log(error)
        log("Passed props were:")
        log(JSON.stringify(props, null, 4))
        log("---------")
        EmailController.sendCriticalError(
          "ERROR in /models/checkout/repository.js Failed to Publish PO to NAV",
          {
            error: error,
            props: props,
            purchaseOrder: purchaseOrder,
            shippingRates: shippingRates,
            warehouses: warehouses,
            user: user
          }
        )
        deferred.reject(error)
      })

    return deferred.promise
  },

  /**
   * Send the order via email.
   * @see module:EmailController
   *
   * @returns {Promise}
   * @param {string} orderID
   * @param {object} options
   * @param {boolean} renderEmail Should the promise return the email's HTML (true) or send the email via AWS SES (false/default)
   */
  sendOrderEmail: function (orderID, options, renderEmail) {
    // return __findSale({ id: orderID }).then(function( order ) {
    console.log("/common/models/checkout/repository.js sendOrderEmail - calling __getOrderById")
    return __getOrderById(orderID).then((order) => {
      console.log(
        "/common/models/checkout/repository.js sendOrderEmail - calling EmailController.sendOrderEmail"
      )
      return EmailController.sendOrderEmail(order[0], options, renderEmail)
    })
  },

  /**
		Used to submit a Purchase Order. This will save a new `sale` on
		the database. This will also save the sale's items in an additional
		table (sale_item).
		Here we also generate a `Web Order Number`.
		So it is not necessary to pass in a `web_order_number` field.
		Once the Web Order gets submitted to NAV, we will then save the ID generated with the record
		as reference on our DB. This will allow is to do cross referencing when a PO Number becomes
		available.
		@param   {Object}  parameters  Parameter object containing all sale data required to create and submit a sale on the database.
		@example <caption>Fields that aren't necessary from the front-end or need further clarification are:</caption>
		{
			web_order_number: null,	// May not be known from the front-end
			po_number: null,					// Will not be available from the front-end
			status: "submitted",			// We can set this from the back-end. No need for the front-end to do this.
			// This can be set from the back-end. Payment info will only be available in the back end.
			payment: {
				paid: false,
				payment_method: "po",
				CCInfo: "((VISA) xxxxx-xxxxx-9591)",
				CCStatus: "",
				CCAuthCode: "",
				CCAuthDate: "",
				CCSettleDate: "",
				CCResponse: ""
			}
		}
		@example <caption>Example Usage of the Parameters Object</caption>
		{
		   user_id: 123,
		   dealer_id: 1234,
		   salesrep_id: 853,
		   tax_amount: 20.87,
		   customer_id: "DISCOUNTTIRE",
		   customer_info: {
		       customer_name: "John Doe",
		       company_name: "MIRUM SHOPPER",
		       phone: 8185554545,
		       email: john.doe@email.com
		   },
		   customer_billing_info: {
		       customer_name: customer_name,
		       company_name: "MIRUM SHOPPER",
		       phone: 8185554545,
		       email: john.doe@email.com,
		       address_1: "123 Some St",
		       address_2: "",
		       city: "Los Angeles",
		       state: "CA",
		       zip: "91605",
		       country: "us"
		   },
		   ship_to_info: {
		       store_number: 10000,
		       address_1: "123 Some Store St",
		       address_2: "",
		       city: "Culver City",
		       state: "CA",
		       zip: "91604",
		       country: "us"
		   },
		   freight_total: 45.56,
		   subtotal_amount: 678.90,
		   total_discount_amount: 8.89,
		   total_invoice_amount: 3000.00
		}
		@param {Object} options
		Additional Options that may be defined later in dev.
		Currently one of the options is to confirm whether this method should use
		fake data or not. If the `mockdata` property is set to true, we will get
		all mock data, else use real data passed in.
		If using `mockdata` but the `parameters` already contains half the data
		only missing data will be merged into the `parameters` data.
		@example <caption>Example Usage of the Options Object</caption>
		{
			mockdata: false
		}
		@return {Object} Initially, Returns a Deferred Promise Object
	*/
  submitPurchaseOrder: function (props) {
    //props.warehouses['AL'].items[].xref
    let deferred = Q.defer()
    //	console.log('submit order',props);
    let order = props.order
    let salesRep = props.salesRep
    let shippingRates = props.shippingRates
    let warehouses = props.warehouses
    const { shippingtotal } = props.totals
    const orderShipping = props.shipping
    const vehicleInfo = props.vehicleInfo
    const dealer = props.dealer


    // Write the order row to Postgress and then get the row, as written, back as savedSale
    Sale.save(order)
      .then(function (savedSale) {
        log("Created Postgres Sale Record: %O", savedSale)

        let saleItems = {}
        let states = _.allKeys(warehouses)
        let shippingRatesObj = {}
        let lineItemCount = 0

        shippingRates.forEach(function (shippingRate, index, array) {
          shippingRatesObj[shippingRate.from] = shippingRate
        })

        for (let r = 0; r < states.length; r++) {
          let state = states[r]
          let info = warehouses[state]
          let items = info.items

          let shippingRate = shippingRatesObj[state]

          for (let t = 0; t < items.length; t++) {
            let item = items[t]
            let itemId = item.item ? item.item.id : item.id

            lineItemCount++
            item.lineItem = lineItemCount
            item = __parseWarehouseSaleItem(
              item,
              state,
              info,
              shippingtotal,
              orderShipping,
              vehicleInfo,
              dealer
            )

            if (!_.has(saleItems, itemId)) {
              saleItems[itemId] = []
            }

            saleItems[itemId].push(item)
          }
        }

        log("Parsed Sale Items to save in Postgres: %O", saleItems)

        let purchaseOrder = {
          saleItems: saleItems,
          salesRep: salesRep,
          savedSale: savedSale,
          savedSaleItems: null
        }

        __saveSaleItems(savedSale, saleItems)
          .then(function (savedSaleItems) {
            purchaseOrder.savedSaleItems = savedSaleItems

            deferred.resolve(purchaseOrder)
          })
          .fail(function (error) {
            console.log("ERROR : Fail : submitPurchaseOrder > Sale.save > __saveSaleItems", error)
            deferred.reject(error)
          })
      })
      .fail(function (error) {
        console.log("ERROR : Fail : submitPurchaseOrder > Sale.save", error)
        deferred.reject(error)
      })

    return deferred.promise
  }
}

/**
 * Generate a new Web Order Number based on the last Web Order Number.
 * Will usually be the next integer in order.
 * But it also handles missing or hyphenated last Web Order Numbers.
 *
 * @memberOf module:CheckoutRepository
 * @private
 * @static
 * @returns {string}
 * @param {string} envCode
 * @params {string} lastWebOrderNumber
 */
function webOrderNumber(envCode, lastWebOrderNumber) {
  /**
   * @type {Object}
   * @description Codes that will ultimately makeup the web order number
   */
  let codes = {
    /**
     * @type {String}
     * @description Environment Code
     */
    env: envCode,
    /**
     * @type {Number}
     * @description Random Generated Integer (replace with `sale.id` later)
     */
    gen: Helprs.integer({
      min: 1,
      max: 9999999
    }),
    /**
     * @type {String}
     * @description Last Web Order Number
     */
    lst: lastWebOrderNumber || null
  }

  log("Generating WON Codes: %O", codes)

  // If there was no last web order number, generate a new random number
  // with the environment code followed by a number between min and max.
  if (!lastWebOrderNumber) return `${codes.env}${codes.gen}`
  // If there was a last web order number, but it included a hyphen
  // generate a new random number
  // with the environment code followed by a number between min and max.
  if (lastWebOrderNumber && lastWebOrderNumber.includes("-")) return `${codes.env}${codes.gen}`
  // If there was a last web order number and it doesn't have a hyphen in it
  if (lastWebOrderNumber && !lastWebOrderNumber.includes("-")) {
    // Get the random part after the first digit
    let generatedInt = lastWebOrderNumber.slice(1)
    // Convert the string into an integer
    generatedInt = parseInt(generatedInt, 10)
    // Add one to it
    console.log("generated number")
    generatedInt++
    generatedInt = generatedInt.toString()
    while (generatedInt.length < 7) generatedInt = "0" + generatedInt
    return `${codes.env}${generatedInt}`
  }
}

/**
 * Attempt to find a sale object by its saleId.
 *
 * @memberOf module:CheckoutRepository
 * @private
 * @private
 * @static
 * @returns {object}
 * @param {string} saleId
 */
function __getOrderById(saleId) {
  let sales
  return Sale.find({ id: saleId })
    .then((retSales) => {
      sales = retSales
      let saleIds = sales.reduce((arr, sale) => {
        arr.push(sale.id)
        return arr
      }, [])
      return Sale.getSaleItemProductBrand(saleIds)
    })
    .then((saleItems) => {
      sales = sales.map((sale) => {
        sale.sale_items = saleItems.filter((item) => item.sale_id == sale.id)
        return sale
      })
      return sales
    })
}

/**
 * Attempts to get the number before the X, M or / in a string.
 *
 * @memberOf module:CheckoutRepository
 * @private
 * @static
 * @returns {numeric}
 * @param {string} size
 */
function __fixSize(size) {
  let sizeSplit = null
  if (size.indexOf("X") > -1) {
    sizeSplit = size.split("X")
    size = sizeSplit[0]
  }
  if (size.indexOf("M") > -1) {
    sizeSplit = size.split("M")
    size = sizeSplit[0]
  }
  if (size.indexOf("/") > -1) {
    sizeSplit = size.split("/")
    size = sizeSplit[0]
  }
  size = parseInt(size, 10)
  if (isNaN(size)) {
    size = null
  }
  return size
}

/**
 * Formerly part of the shipping rates system.
 * This has been deprecated since October 2017.
 *
 * @memberOf module:CheckoutRepository
 * @private
 * @static
 * @returns {Promise}
 * @param {object} parameters
 */
function __getShippingRates(parameters) {
  let deferred = Q.defer()

  let shipping = parameters.shipping
  let postalcode = shipping.postalcode
  let user = parameters.user
  let userCart = user.cart
  let userCartItems = userCart.items
  let warehouses = parameters.warehouses

  let shippingCalculatorBody = []
  let excludeShippingCalculatorBody = []
  userCartItems.forEach(function (item, index, array) {
    let locations = item.locations
    for (let a = 0; a < locations.length; a++) {
      let location = locations[a]
      let state = location.key
      let toExclude = false
      let shipCalcItem = {
        price: item.price,
        qty: location.quantity,
        size: item.specification.size,
        type: item.type
      }
      // TODO: may not work
      if (state === "AB" || state === "ON") {
        continue
      }
      // TODO: should throw error
      if (!shipCalcItem.size) {
        continue
      }
      shipCalcItem.size = __fixSize(shipCalcItem.size)
      if (warehouses[state].method === "pickup") {
        toExclude = true
      }
      if (toExclude) {
        let idx = _.findIndex(excludeShippingCalculatorBody, {
          from: state
        })
        if (excludeShippingCalculatorBody.length && idx > -1) {
          let existingCalculationOpt = excludeShippingCalculatorBody[idx]
          existingCalculationOpt.items.push(shipCalcItem)
        } else {
          let shipBodyCalc = {
            from: state,
            to: postalcode,
            items: [shipCalcItem],
            shippingtotal: 0
          }
          excludeShippingCalculatorBody.push(shipBodyCalc)
        }
      } else {
        let idx = _.findIndex(shippingCalculatorBody, {
          from: state
        })
        if (shippingCalculatorBody.length && idx > -1) {
          let existingCalculationOpt = shippingCalculatorBody[idx]
          existingCalculationOpt.items.push(shipCalcItem)
        } else {
          let shipBodyCalc = {
            from: state,
            to: postalcode,
            items: [shipCalcItem]
          }
          shippingCalculatorBody.push(shipBodyCalc)
        }
      }
    }
  })
  if (!_.isEmpty(shippingCalculatorBody)) {
    ShippingCalculator.request(shippingCalculatorBody)
      .catch((error) => {
        deferred.resolve([])
      })
      .then(function (shippingCalculations) {
        let fromStates = _.allKeys(shippingCalculations)
        for (let f = 0; f < fromStates.length; f++) {
          let fromState = fromStates[f]
          for (let s = 0; s < shippingCalculatorBody.length; s++) {
            let submittedBody = shippingCalculatorBody[s]
            let fromStateCalculation = shippingCalculations[fromState]
            let fromStateShippingTotal = fromStateCalculation.totalCost
            // TODO: should throw error
            if (submittedBody.from !== fromState) {
              continue
            }
            submittedBody.shippingtotal = fromStateShippingTotal
          }
        }
        if (!_.isEmpty(excludeShippingCalculatorBody)) {
          shippingCalculatorBody = _.union(shippingCalculatorBody, excludeShippingCalculatorBody)
        }
        shippingCalculatorBody.forEach(function (body, index, array) {
          let subtotal = 0
          body.items.forEach(function (item, index, array) {
            subtotal += parseFloat(item.price) * item.qty
          })
          body.subtotal = subtotal
        })
        deferred.resolve(shippingCalculatorBody)
      })
      .fail(function (error) {
        deferred.reject(error)
      })
  } else {
    let resolvingBodObj = {}
    if (!_.isEmpty(excludeShippingCalculatorBody)) {
      excludeShippingCalculatorBody.forEach(function (excludeBody, index, array) {
        let subtotal = 0
        excludeBody.items.forEach(function (item, index, array) {
          subtotal += parseFloat(item.price) * item.qty
        })
        excludeBody.subtotal = subtotal
      })
      resolvingBodObj = excludeShippingCalculatorBody
    }
    deferred.resolve(resolvingBodObj)
  }

  return deferred.promise
}

/**
 * Convert a string to a two decimal place number.
 * If there is an error, parsing the string, the error will throw back to the calling code.
 *
 * @memberOf module:CheckoutRepository
 * @private
 * @static
 * @returns {Promise}
 * @param {object} props
 */
function __parseDecimalPricing(pricing) {
  if (typeof pricing !== "string") {
    pricing = pricing.toString()
  }
  let result = 0
  try {
    result = parseFloat(Math.round(pricing * 100) / 100, 10).toFixed(2)
  } catch (err) {
    console.log(
      "Error in /common/model/checkout/repository.js - __parseDecimalPricing - attempted to parse a string that couldn't be parsed."
    )
    throw err
  }
  return result
}

/**
 * Parses the info to create a `sale_item` with the required postgres schema.
 * @memberOf module:CheckoutRepository
 * @private
 * @param   {type}  item          [description]
 * @param   {type}  state         [description]
 * @param   {type}  stateDetails  [description]
 * @return  {type}                [description]
 */
function __parseWarehouseSaleItem(item, state, info, shippingRate, orderShipping, vehicleInfo, dealer) {
  let stateDetails = info.details
  let qty = item.quantity
  let lineItem = item.lineItem
  if (item.item) {
    item = item.item
  }

  let unit_price = item.price
  let total_line_amount = 0
  try {
    total_line_amount = parseFloat(unit_price) * qty
    total_line_amount = __parseDecimalPricing(total_line_amount)
  } catch (err) {
    total_line_amount = 0
    console.log("Error in /models/checkout/repository.js - __parseWarehouseSaleItem - total_line_amount")
  }

  let taxRate = shippingRate ? shippingRate.taxrate : 0
  let taxAmount = 0
  try {
    taxAmount = (taxRate / 100) * unit_price
    taxAmount = __parseDecimalPricing(taxAmount)
  } catch (err) {
    taxAmount = 0
    console.log("Error in /models/checkout/repository.js - __parseWarehouseSaleItem - taxAmount")
  }

  let shipping_agent = orderShipping.ship_agent
  let shipping_method = orderShipping.method
  let eship_agent_service_code = orderShipping.eship_agent_service_code

  if (!_.isEmpty(info.option)) {
    if (info.option === "2 day") {
      info.option = "2nd day"
    }
    eship_agent_service_code = info.option
    if (info.option === "2nd day" || "overnight") {
      shipping_method = "expedited"
    }
  }

  if (shipping_method === "ltl") {
    shipping_agent = "ltl"
  } else if (shipping_method === "pickup") {
    eship_agent_service_code = shipping_agent = "cpu"
    shipping_method = "pickup cpu"
  }

  let item_description = {
    product_name: item.specification.model,
    size: item.specification.size,
    finish: item.specification.finish,
    line_item_number: lineItem
  }
  /**
   * @type {String}
   * @description Set the Item's Image. This shouldbe only one image.
   */
  if (item.image && item.image.list) {
    item_description.image = item.image.list[0]
  }
  let fulfilment_location = {
    code: state,
    name: "",
    address: "",
    city: "",
    state: "",
    postal: ""
  }
  if (!_.isEmpty(stateDetails)) {
    fulfilment_location = {
      code: state,
      name: stateDetails.name,
      address: stateDetails.address,
      city: stateDetails.city,
      state: stateDetails.state,
      postal: stateDetails.postal
    }
  }

  let shipping_options = {
    shipped: false,
    delivery_type: "commercial",
    shipping_agent: shipping_agent,
    shipping_method: shipping_method,
    eship_agent_service_code: eship_agent_service_code
  }

  let sale_item = {}
  //TODO: Populate this
  sale_item.customer_item_no = item.xref || ""
  sale_item.tax_amount = 0 //No Tax //taxAmount;
  sale_item.item_no = item.part_number
  sale_item.qty = qty
  sale_item.unit_price = unit_price
  //sale_item.original_price = item.origPrice;
  sale_item.total_line_amount = total_line_amount
  sale_item.item_description = item_description
  sale_item.fulfilment_location = fulfilment_location
  sale_item.shipping_options = shipping_options
  sale_item.vehicle_info = vehicleInfo

  //console.log('checkout item',item);
  //console.log('checkout info',info);

  //console.log('checkout ship options',sale_item.shipping_options);
  return sale_item
};

/**
 * @memberOf module:CheckoutRepository
 * @private
 * @static
 * @returns {Promise}
 * @param {string} publishedPO
 * @param {object} purchaseOrder
 */
function __saveNavRecords(publishedPO, purchaseOrder) {
	log("Published PO Headers");
	log(publishedPO.header);
	log("Published PO Lines");
	log(publishedPO.lines);

	let savedSale = purchaseOrder.savedSale;
	let savedSaleItems = purchaseOrder.savedSaleItems;

	let updatedSaleItems = savedSaleItems.map(function (savedSaleItem) {
		let matchingItems = publishedPO.lines.filter(function (lineItem) {
			return lineItem["Item No_"] === savedSaleItem.item_no;
		});

		for (let d = 0; d < matchingItems.length; d++) {
			let matchingItem = matchingItems[d];
			if (matchingItem.Quantity !== savedSaleItem.qty) {
				continue;
			}

			let tax_amount = savedSaleItem.tax_amount.replace(/\$/g, "");
			tax_amount = parseFloat(tax_amount);
			if (matchingItem["Tax Amount"] !== tax_amount) {
				continue;
			}

			let unit_price = savedSaleItem.unit_price.replace(/\$/g, "");
			unit_price = parseFloat(unit_price);
			if (__parseDecimalPricing(matchingItem["Unit Price"]) !== __parseDecimalPricing(unit_price)) {
				continue;
			}

			let total_line_amount = savedSaleItem.total_line_amount.replace(/\$/g, "");
			total_line_amount = parseFloat(total_line_amount);
			if (__parseDecimalPricing(matchingItem["Total Line Amount"]) !== __parseDecimalPricing(total_line_amount)) {
				continue;
			}

			savedSaleItem.nav_record = matchingItem;
			break;
		}

		if (savedSaleItem.applied) {
			delete savedSaleItem.applied;
		}

		return SaleItem.update(savedSaleItem);
	});

	savedSale.nav_record = {
		headers: publishedPO.header
	};

	let promises = _.union([Sale.update(savedSale)], updatedSaleItems);

	return Q.allSettled(promises);
};

/**
 * Save all of the individual line items in a sale.
 *
 * @memberOf module:CheckoutRepository
 * @private
 * @static
 * @returns {Promise}
 * @param {object} savedSale
 * @param {object} saleItems
 */
function __saveSaleItems(savedSale, saleItems) {
	let deferred = Q.defer();

	let promises = [];

	/** Now we iterate throughout each Item in the sale and save it onto the Database */
	for (let itemId in saleItems) {
		if (saleItems.hasOwnProperty(itemId)) {
			let saleItemArr = saleItems[itemId];

			for (let y = 0; y < saleItemArr.length; y++) {
				let newSaleItem = saleItemArr[y];
				/** On each sale item, we associate the saved sale id and the item id. */
				newSaleItem.sale_id = savedSale.id;
				newSaleItem.item_id = parseInt(itemId);


				let promise = SaleItem.save(newSaleItem);
				promises.push(promise);
			}
		}
	}

	Q.allSettled(promises).then(function (results) {
		let savedSaleItems = [];
		let errorResults = [];
		let hasErrors = false;
		results.forEach(function (result) {
			if (result.state !== "fulfilled") {
				hasErrors = true;
				errorResults.push(result);
			}
			else {
				savedSaleItems.push(result.value);
			}
		});
		if (hasErrors) {
			console.log("ERROR : __saveSaleItems > allSettled", errorResults);
			deferred.reject(errorResults);

		}
		else {
			deferred.resolve(savedSaleItems);
		}
	}).done();

	return deferred.promise;
};
