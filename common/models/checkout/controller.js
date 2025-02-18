var _ = require("underscore"),
	Repository = require("./repository"),
	debug = require('libs/buglog'),
	log = debug('models', 'checkout', 'controller');

/**
 * @class
 */
class CheckoutController {
  /**
   * @returns {CheckoutController}
   * @params {CheckoutModel} Model
   */
  constructor(Model) {
    this.addToCart = this.addToCart.bind(this, Model.props)
    this.getCartDetailsAndSubtotal = this.getCartDetailsAndSubtotal.bind(this, Model.props)
    this.getCartTotals = this.getCartTotals.bind(this, Model.props)
    this.getErrors = this.getErrors.bind(this, Model.errors)
    this.getProps = this.getProps.bind(this, Model.props)
    this.removeFromCart = this.removeFromCart.bind(this, Model.props)
    this.updateCartQty = this.updateCartQty.bind(this, Model.props)
    this.submitPurchaseOrder = this.submitPurchaseOrder.bind(this, Model.props)
  }

  /**
   * @returns {Promise}
   * @param {object} props
   * @param {object} parameters
   */
  addToCart(props, parameters) {
    var that = this
    return new Promise(function (resolve, reject) {
      var validation = __validateAddToCart(parameters)
      if (validation.isValid) {
        Repository.updateUserCart(__addToCart(props, validation.parameters))
          .then(function (user) {
            that
              .getCartDetailsAndSubtotal()
              .then(function (response) {
                resolve({
                  message: "successfully updated user cart, found cart details, and calculated subtotal",
                  parameters: validation.parameters,
                  props: props
                })
              })
              .catch(function (error) {
                reject({
                  message:
                    "successfully updated user cart, but could not find cart details, and calculate subtotal",
                  parameters: validation.parameters,
                  props: props
                })
              })
          })
          .fail(function (error) {
            reject({
              message: "could not update user cart",
              parameters: validation.parameters,
              props: props
            })
          })
      } else {
        reject({
          message: "addToCart invalid parameters",
          parameters: validation.parameters,
          props: props
        })
      }
    })
  }

  /**
   * @returns {Promise}
   * @param {object} props
   */
  getCartDetailsAndSubtotal(props) {
    return new Promise(function (resolve, reject) {
      Repository.getDealerItemsById(props)
        .then(function (items) {
          resolve({
            message: "successfully found cart details, and calculated subtotal",
            parameters: null,
            props: __parseCartDetails(props, items)
          })
        })
        .fail(function (error) {
          console.log("err", error)
          resolve({
            message: "could not find cart details, and calculate subtotal",
            parameters: null,
            props: props
          })
        })
        .done()
    })
  }

  /**
   * @returns {Promise}
   * @param {object} props
   * @param {object} parameters
   */
  getCartTotals(props, parameters) {
    var that = this
    // console.log(parameters, "GETCART PARAMS")
    // console.log(props, "GETCART PROPS")

    return new Promise(function (resolve, reject) {
      var validation = __validateCheckout(props, parameters)

      if (validation.isValid) {
        that
          .getCartDetailsAndSubtotal()
          .then(function (response) {
            Repository.getShippingRates(props)
              .then(function (shippingRates) {
                props.shippingRates = shippingRates

                if (shippingRates.length) {
                  let shippingtotal = 0
                  shippingRates.forEach(function (shippingRate, index, array) {
                    // Only add non null, non zero shipping rates
                    if (typeof shippingRate === "number" && shippingRate !== 0) {
                      shippingtotal += shippingRate.shippingtotal
                    }
                  })

                  // Try to store the shipping total but only store a non zero value if it's a parseable number.

                  props.totals.shippingtotal = 0
                  try {
                    props.totals.shippingtotal = __parseDecimalPricing(parameters.totals.shippingtotal)
                  } catch (e) {
                    console.log(
                      "Error in /common/models/checkout/controller.js - getCartTotals - props.totals.shippingtotal"
                    )
                  }

                  Repository.getTaxRate(props)
                    .then(function (taxRate) {
                      var rate = taxRate.rate
                      var taxtotal = 0
                      // Attempt to handle string numbers for tax rate
                      if (typeof rate === "string") {
                        try {
                          rate = parseFloat(rate, 10)
                        } catch (er) {
                          console.log(
                            "Warning in /common/models/checkout/controller.js - tax rate was a string but could not be converted to a number."
                          )
                        }
                      }
                      // Catch and log if given a non numeric tax
                      if (typeof rate !== "number") {
                        console.log(
                          "Warning in /common/models/checkout/controller.js - tax rate is not a number - is " +
                            typeof rate
                        )
                        console.log("taxRate was returned as:")
                        console.log("treating as zero")
                        rate = 0
                        console.log(JSON.stringify(taxRate, null, 2))
                        console.log("props were:")
                        console.log(props)
                      }
                      props.shippingRates.forEach(function (shippingRate, index, array) {
                        shippingRate.taxrate = rate
                        shippingRate.taxtotal =
                          (rate / 100) * (shippingRate.shippingtotal + shippingRate.subtotal)
                        if (typeof shippingRate.taxtotal !== "number") {
                          console.log(
                            "Warning in /common/models/checkout/controller.js - Skipping shippingRate.taxtotal as it's not a number."
                          )
                        } else {
                          taxtotal += shippingRate.taxtotal
                        }
                      })

                      props.canPay = true

                      props.taxRate = taxRate

                      // Try to store the tax total but only store a non zero value if it's a parseable number.
                      props.totals.taxtotal = 0
                      try {
                        props.totals.taxtotal = __parseDecimalPricing(taxtotal)
                      } catch (err) {
                        console.log(
                          "Error in /common/models/checkout/controller.js - getCartTotals - props.totals.taxtotal"
                        )
                      }

                      // Try to store the total but only store a non zero value if it's a parseable number.
                      props.totals.total = 0
                      try {
                        props.totals.total = __parseDecimalPricing(
                          parseFloat(props.totals.subtotal, 10) +
                            parseFloat(props.totals.shippingtotal, 10) +
                            parseFloat(props.totals.taxtotal, 10)
                        )
                      } catch (erro) {
                        console.log(
                          "Error in /common/models/checkout/controller.js - getCartTotals - props.totals.total"
                        )
                        console.log(
                          "props.totals.subtotal was " +
                            props.totals.subtotal +
                            " (" +
                            typeof props.totals.subtotal +
                            ")"
                        )
                        console.log(
                          "props.totals.shippingtotal was " +
                            props.totals.shippingtotal +
                            " (" +
                            typeof props.totals.shippingtotal +
                            ")"
                        )
                        console.log(
                          "props.totals.taxtotal was " +
                            props.totals.taxtotal +
                            " (" +
                            typeof props.totals.taxtotal +
                            ")"
                        )
                      }

                      resolve({
                        message: "successfully calculated cart totals",
                        parameters: validation.parameters,
                        props: props
                      })
                    })
                    .catch(function (error) {
                      console.log(error)
                      reject({
                        message: "could not calculate tax total",
                        parameters: validation.parameters,
                        props: props
                      })
                    })
                } else {
                  // canPay === false
                  resolve({
                    message: "successfully calculated cart totals",
                    parameters: validation.parameters,
                    props: props
                  })
                }
              })
              .catch(function (error) {
                console.log(error)
                reject({
                  message: "could not calculate shipping total",
                  parameters: validation.parameters,
                  props: props
                })
              })
          })
          .catch(function (error) {
            console.log(error)
            reject({
              message: "could not find cart details, and calculate subtotal",
              parameters: validation.parameters,
              props: props
            })
          })
      } else {
        reject({
          message: "getcarttotals invalid parameters",
          parameters: validation.parameters,
          props: props
        })
      }
    })
  }

  /**
   * @returns {array}
   * @param {array} errors
   */
  getErrors(errors) {
    return errors
  }

  /**
   * @returns {object}
   * @param {object} props
   */
  getProps(props) {
    return props
  }

  /**
   * @returns {Promise}
   * @param {object} props
   * @param {object} parameters
   */
  updateCartQty(props, parameters) {
    let that = this
    return new Promise(function (resolve, reject) {
      if (props.user.cart.items[parameters.id] && props.user.cart.items[parameters.id][parameters.location]) {
        props.user.cart.items[parameters.id][parameters.location] = parameters.qty
        Repository.updateUserCart(props)
          .then((user) => {
            that
              .getCartDetailsAndSubtotal()
              .then(function (response) {
                resolve({
                  message: "successfully updated item cart, retreived cart details, and calculated subtotal",
                  props: props
                })
              })
              .catch(function (error) {
                reject({
                  message:
                    "successfully updated user cart, but could not find cart details, and calculate subtotal",
                  props: props
                })
              })
          })
          .catch(function (error) {
            reject({
              message: "could not update user cart",
              props: props
            })
          })
      } else {
        console.log("error Repository.updateUserCart")
        reject({
          message: "updateCartQty invalid parameters",
          props: props
        })
      }
    })
  }

  /**
   * @returns {Promise}
   * @param {object} props
   * @param {object} parameters
   */
  removeFromCart(props, parameters) {
    var that = this
    return new Promise(function (resolve, reject) {
      var validation = __validateRemoveFromCart(parameters)
      if (validation.isValid) {
        Repository.updateUserCart(__removeFromCart(props, validation.parameters))
          .then(function (user) {
            that
              .getCartDetailsAndSubtotal()
              .then(function (response) {
                resolve({
                  message: "successfully removed from cart, retreived cart details, and calculated subtotal",
                  parameters: validation.parameters,
                  props: props
                })
              })
              .catch(function (error) {
                console.log(error)
                reject({
                  message:
                    "successfully updated user cart, but could not find cart details, and calculate subtotal",
                  parameters: validation.parameters,
                  props: props
                })
              })
          })
          .catch(function (error) {
            console.log(error)
            reject({
              message: "could not update user cart",
              parameters: validation.parameters,
              props: props
            })
          })
      } else {
        reject({
          message: "removefromcart invalid parameters",
          parameters: validation.parameters,
          props: props
        })
      }
    })
  }

  /**
   * @returns {Promise}
   * @param {object} props
   * @param {object} parameters
   * @see VWModel.submitPurchaseOrder (called by)
   * @see models/checkout Controller.__submitPurchaseOrder (calls)
   */
  submitPurchaseOrder(props, parameters) {
    var that = this
    const managerEmail = props.user.managerEmail
    const vehicleInfo = parameters.vehicleInfo
    const dealer = parameters.dealer

    //	console.log('submit user params',parameters.user);
    return new Promise(function (resolve, reject) {
      that
        .getCartTotals(parameters)
        .then(function (response) {
          var validatedParameters = response.parameters

          Repository.findSalesRep(props)
            .then(function (salesRepObj) {
              props.salesRep = salesRepObj

              Repository.generateWebOrderNumber(props)
                .then(function (webOrderNumbers) {
                  const _shippingtotal = JSON.parse(parameters.totals).shippingtotal
                  const { totals, ...etc } = props
                  const { shippingtotal, ..._totals } = totals
                  const _props = {
                    ...etc,
                    ...{ totals: { ..._totals, ...{ shippingtotal: _shippingtotal } } }
                  }
                  log("Generated WON: %O", webOrderNumbers)
                  _props.web_order_number = webOrderNumbers["New Generated Web Order Number"]

                  _props.order = __parseOrder(_props)
                  _props.managerEmail = managerEmail
                  _props.vehicleInfo = vehicleInfo
                  _props.dealer = dealer

                  __submitPurchaseOrder(_props)
                    .then(function (savedRecords) {
                      resolve({
                        message: "successfully submitted purchase order",
                        parameters: validatedParameters,
                        props: _props
                      })
                    })
                    .catch(function (error) {
                      console.log(
                        "ERROR : catch : submitPurchaseOrder > getCartTotals > findSalesRep > generateWebOrderNumber > __submitPurchaseOrder",
                        error
                      )
                      reject({
                        message: "successfully calculated cart totals, but could not submit purchase order",
                        parameters: validatedParameters,
                        props: _props
                      })
                    })
                })
                .catch(function (error) {
                  console.log(
                    "ERROR : catch : submitPurchaseOrder > getCartTotals > findSalesRep > generateWebOrderNumber",
                    error
                  )
                  reject({
                    message: "successfully calculated cart totals, but could not generate web order number",
                    parameters: validatedParameters,
                    props: props
                  })
                })
            })
            .catch(function (error) {
              console.log("ERROR : catch : submitPurchaseOrder > getCartTotals > findSalesRep", error)
              reject({
                message: "could not find sales rep",
                parameters: validatedParameters,
                props: props
              })
            })
        })
        .catch(function (error) {
          console.log("ERROR submitPurchaseOrder > .getCartTotals .catch", error)
          reject({
            message: "submitPurchaseOrder: could not get cart totals",
            parameters: error.parameters,
            props: props
          })
        })
    })
  }
}

module.exports = CheckoutController

/**
 * @memberOf CheckoutController
 * @private
 * @static
 * @returns {object}
 * @param {object} props
 * @param {object} parameters
 */
function __addToCart(props, parameters) {
  if (!props.user.cart.items[parameters.id]) {
    props.user.cart.items[parameters.id] = {}
  }
  for (var state in parameters.locations) {
    var location = parameters.locations[state]
    var quantity = location.quantity
    if (props.user.cart.items[parameters.id][state]) {
      props.user.cart.items[parameters.id][state] += quantity
    } else {
      props.user.cart.items[parameters.id][state] = quantity
    }
  }
  return props
}

/**
 * @memberOf CheckoutController
 * @private
 * @static
 * @returns {object}
 * @param {object} props
 * @param {array} items
 */
function __parseCartDetails(props, items) {
  var warehouses = {}
  var subtotal = 0
  items.forEach(function (item, index, array) {
    var price = 0
    try {
      price = __parseDecimalPricing(item.price)
    } catch (e) {
      console.log("Error in /common/models/checkout/controller.js - __parseCartDetails - item.price")
    }
    var locations = []

    for (let state in props.user.cart.items[item.id]) {
      let quantity = props.user.cart.items[item.id][state]
      if (quantity) {
        var warehouse = props.warehouses ? props.warehouses[state] : null
        if (!warehouses[state]) {
          warehouses[state] = {
            details: Repository.warehousesJSON[state],
            items: [],
            method: warehouse ? warehouse.method : "",
            option: warehouse ? warehouse.option : ""
          }
        }
        warehouses[state].items.push({
          item: item,
          quantity: quantity
        })
        locations.push({
          key: state,
          quantity: quantity
        })
        subtotal += price * quantity
      }
    }
    item.locations = locations
    item.price = price
  })
  props.totals.subtotal = 0
  try {
    props.totals.subtotal = __parseDecimalPricing(subtotal)
  } catch (er) {
    console.log("Error in /common/models/checkout/controller.js - __parseCartDetails - props.totals.subtotal")
  }
  props.user.cart.items = items
  props.warehouses = warehouses
  return props
}

/**
 * Takes a string and converts it to a two decimal point number.
 * It will attempt to handle other data types as well.
 * If there's an error in parsing the float, it will throw the error.
 *
 * @memberOf CheckoutController
 * @private
 * @static
 * @returns {string}
 * @param {string} pricing
 */
function __parseDecimalPricing(pricing) {
  if (typeof pricing !== "string") {
    pricing = pricing.toString()
  }
  try {
    let result = parseFloat(Math.round(pricing * 100) / 100, 10).toFixed(2)
    return result
  } catch (error) {
    console.log("Error in /common/models/checkout/controller.js - __parseDecimalPricing")
    console.log(error)
    console.log("Was passed pricing: " + pricing)
    throw error
  }
}

/**
 * @memberOf CheckoutController
 * @private
 * @static
 * @returns {Promise}
 * @param {object} props
 * @see models/checkout Controller.submitPurchaseOrder (called by)
 * @see models/checkout Repository.publishPurchaseOrder (calls)
 */
function __submitPurchaseOrder(props) {
  // console.log(props, "PROPS IN __SUBMITPURCHASEORDER")
  return new Promise(function (resolve, reject) {
    Repository.submitPurchaseOrder(props)
      .then(function (purchaseOrder) {
        console.log(
          "/common/models/checkout/controller.js __submitPurchaseOrder - Purchase order written to Postgres"
        )

        props.purchaseOrder = purchaseOrder
        //console.log('submit po props',props);
        Repository.updateUserCart(__clearCart(props))
          .then(function (user) {
            // Write to MS SQL ("Nav")
            Repository.publishPurchaseOrder(props)
              .then(function (savedRecords) {
                console.log(
                  "/common/models/checkout/controller.js __submitPurchaseOrder - Purchase order writtern to MSSQL"
                )

                // Send the confirmation email
                // It used to be called before publishPurchaseOrder
                // but that caused confusion with confirms going before db writes ultimately failed
                // so we've moved it inside
                var action = "initOrder"
                if (props.user.isReturn) {
                  action = "apiReturn"
                  props.user.original_order_num = purchaseOrder.savedSale.original_order_num
                  props.user.return_reason = purchaseOrder.savedSale.return_reason
                  props.user.return_status = purchaseOrder.savedSale.returnStatus
                }

                console.log(
                  "/common/models/checkout/controller.js __submitPurchaseOrder - requesting sendOrderEmail"
                )
                Repository.sendOrderEmail(props.purchaseOrder.savedSale.id, {
                  action: action,
                  user: props.user,
                  managerEmail: props.managerEmail
                })
                  .then(() => {
                    console.log(
                      "/common/models/checkout/controller.js __submitPurchaseOrder - sendOrderEmail success"
                    )
                  })
                  .catch((err) => {
                    console.log(
                      "/common/models/checkout/controller.js __submitPurchaseOrder - ERROR calling sendOrderEmail",
                      err
                    )
                  })
                console.log("after submit email")
                resolve(savedRecords)
              })
              .catch(function (error) {
                console.log(
                  "ERROR : catch : __submitPurchaseOrder > Repository.submitPurchaseOrder > Repository.updateUserCart > Repository.publishPurchaseOrder",
                  error
                )
                reject({
                  message: "could not publish purchase order",
                  // parameters: validatedParameters,
                  props: props
                })
              })
          })
          .catch(function (error) {
            console.log(
              "ERROR : catch : __submitPurchaseOrder > Repository.submitPurchaseOrder > Repository.updateUserCart",
              error
            )
            reject({
              message: "could not update user cart",
              // parameters: validatedParameters,
              props: props
            })
          })
      })
      .catch(function (error) {
        console.log("ERROR : catch : __submitPurchaseOrder > Repository.submitPurchaseOrder", error)
        reject({
          message: "could not submit purchase order",
          // parameters: validatedParameters,
          props: props
        })
      })
  })
}

// deprecated: implemented in __parseCartDetails
// function __calculateSubtotal( items ) {
// 	var subtotal = 0;
// 	items.forEach(function( item, index, array ) {
// 		item.locations.forEach(function( location, index, array ) {
// 			var quantity = location.quantity;
// 			if( quantity && !isNaN( quantity ) ) {
// 				subtotal += parseFloat( item.price ) * parseInt( quantity );
// 			}
// 		});
// 	});
// 	return subtotal;
// };

/**
 * Removes all items from a user's cart, setting it back to an empty object.
 * (props.user.cart.items)
 *
 * @memberOf CheckoutController
 * @private
 * @static
 * @returns {object}
 * @param {object} props
 */
function __clearCart(props) {
  props.user.cart.items = {}
  return props
}

/**
 * @memberOf CheckoutController
 * @private
 * @static
 * @returns {object}
 * @param {object} props
 */
const __parseOrder = (props) => {
  var canPay = props.canPay
  var poNumber = props.po_number
  var salesRep = props.salesRep
  var shipping = props.shipping
  var shippingRates = props.shippingRates
  let totals = props.totals
  var user = props.user
  var dealer = user.dealer
  var warehouses = props.warehouses
  var webOrderNumber = props.web_order_number
  var status = "submitted"
  if (user.returnStatus) status = user.returnStatus

  //   console.log(totals.shippingtotal, "TOTALS IN PARSE ORDER")

  // var created = new Date();
  var customerInfo = {
    customer_name: shipping.first_name.trim() + " " + shipping.last_name.trim(),
    company_name: dealer.company_name_1 || shipping.company,
    phone: user.phone_number,
    email: user.email
  }
  var shippingAddress = {
    store_number: shipping.store_number || "",
    address_1: shipping.address_1,
    address_2: shipping.address_2,
    city: shipping.city,
    state: shipping.state,
    zip: shipping.postalcode,
    country: shipping.country || user.country
  }
  var payment = {
    paid: false,
    payable: canPay,
    payment_method: "CHARGE",
    CCInfo: "",
    CCStatus: "",
    CCAuthCode: "",
    CCAuthDate: "",
    CCSettleDate: "",
    CCResponse: ""
  }
  var shipToInfo = {
    store_number: shipping.store_number || "",
    country: shippingAddress.country
  }
  console.log("models/checkout/controller/__parseOrder")
  //   console.log("shippingAddress", shippingAddress)
  var customerBillingInfo = {}
  for (var key in customerInfo) {
    customerBillingInfo[key] = customerInfo[key]
    shipToInfo[key] = customerInfo[key]
  }
  for (var key in shippingAddress) {
    customerBillingInfo[key] = shippingAddress[key]
    shipToInfo[key] = shippingAddress[key]
  }

  if (!totals.shippingtotal) {
    totals.shippingtotal = 0
  }
  if (!totals.taxtotal) {
    totals.taxtotal = 0
  }

  let total = 0
  if (__isDTCUser(user)) {
    totals.shippingtotal = totals.shippingtotal
    totals.taxtotal = totals.taxtotal
    //recalculate total
    total = +totals.subtotal + +totals.shippingtotal + +totals.taxtotal
    totals.total = total.toLocaleString("en", { minimumFractionDigits: 2 }) //dont know or think we are doing discount total yet.
  } else {
    // ASK ABOUT WHAt TO DO FOR CALCS IF NOT DTC USER (VISIONWHEEL AND WHATNOT)
    totals.shippingtotal = totals.shippingtotal
    totals.taxtotal = totals.taxtotal
    //recalculate total
    total = +totals.subtotal + +totals.shippingtotal + +totals.taxtotal
    totals.total = total.toLocaleString("en", { minimumFractionDigits: 2 })
  }

  var order = {
    // created: created,
    customer_billing_info: customerBillingInfo,
    customer_id: user.dealer ? user.dealer.nav_customer_id : null,
    customer_info: customerInfo,
    dealer_id: user.dealer_id || null,
    freight_total: totals.shippingtotal,
    nav_record: null,
    payment: payment,
    po_number: poNumber,
    salesrep_id: user.sales_rep,
    ship_to_info: shipToInfo,
    status: status,
    subtotal_amount: totals.subtotal,
    tax_amount: totals.taxtotal,
    total_discount_amount: totals.discounttotal,
    total_invoice_amount: totals.total,
    // updated: created,
    user_id: user.id,
    web_order_number: webOrderNumber,
    transaction_type: user.isApiOrder ? 1 : 2
  }

  return order
}

/**
 * Determine if a passed user object is a DTC (Discount Tire Center) user.
 *
 * @memberOf CheckoutController
 * @private
 * @static
 * @returns {boolean}
 * @param {object} user
 */
function __isDTCUser(user) {
	if (!_.has(user, 'dealer'))
		return false;
	if (!_.has(user.dealer, 'nav_customer_id'))
		return false;
	if (user.dealer.nav_customer_id.includes('DISCOUNTTIRE'))
		return true;
	return false;
}

/**
 * @memberOf CheckoutController
 * @private
 * @static
 * @returns {object}
 * @param {object} props
 * @param {object} parameters
 */
function __removeFromCart(props, parameters) {
	if (props.user.cart.items[parameters.id]) {
		if (props.user.cart.items[parameters.id][parameters.location]) {
			var states = [];
			for (var state in props.user.cart.items[parameters.id]) {
				states.push(state);
			}
			if (states.length === 1) {

				delete props.user.cart.items[parameters.id];

			}
			else {

				delete props.user.cart.items[parameters.id][parameters.location];

			}
		}
	}
	return props;
};

/**
 * @memberOf CheckoutController
 * @private
 * @static
 * @returns {object}
 * @param {object} parameters
 */
function __validateAddToCart(parameters) {
	var errors = [];
	var isValid = false;
	var itemId, itemLocations;
	if (parameters.id && !isNaN(parameters.id) && parameters.locations && typeof parameters.locations === "string") {
		try {
			itemId = parseInt(parameters.id);
			itemLocations = JSON.parse(parameters.locations);
			for (var state in itemLocations) {
				var location = itemLocations[state];
				var quantity = location.quantity;
				if (!isNaN(quantity)) {
					location.quantity = parseInt(quantity);
				}
				else {
					errors.push(`itemLocations["${state}"]: quantity is not a number;`);
				}
			}
		}
		catch (error) {
			errors.push(error);
		}
		if (itemId && itemLocations) {
			isValid = true;
		}
	}
	else {
		errors.push("invalid or missing parameters");
	}
	return {
		errors: isValid ? false : errors,
		isValid: isValid,
		parameters: isValid ? {
			id: itemId,
			locations: itemLocations
		} : parameters
	};
};

/**
 * @memberOf CheckoutController
 * @private
 * @static
 * @returns {object}
 * @param {object} props
 * @param {object} parameters
 */
function __validateCheckout(props, parameters) {
	var user = props.user;
	var errors = [];
	var isValid = false;
	var itemIds = [];
	for (var itemId in user.cart.items) {
		if (!isNaN(itemId)) {
			itemIds.push(itemId);
		}
	}
	if (itemIds.length) {
		if (parameters.po_number && typeof parameters.po_number === "string") {
			props.po_number = parameters.po_number;
		}
		else {
			errors.push("parameters.po_number is invalid");
		}
		try {
			props.shipping = parameters.shipping && typeof parameters.shipping === "string" ? JSON.parse(parameters.shipping) : null;
		}
		catch (error) {
			errors.push("parameters.shipping is invalid");
		}
		try {
			props.token = parameters.token && typeof parameters.token === "string" ? JSON.parse(parameters.token) : null;
		}
		catch (error) {
			errors.push("parameters.token is invalid");
		}
		try {
			props.warehouses = parameters.warehouses && typeof parameters.warehouses === "string" ? JSON.parse(parameters.warehouses) : null;
		}
		catch (error) {
			errors.push("parameters.warehouses is invalid");
		}
		if (!errors.length) {
			isValid = true;
		} else {
			console.log("ERRORS __validateCheckout : ", errors);
		}
	}
	else {
		errors.push("user.cart has no items");
	}
	// console.log('ERRORS', errors);
	return {
		errors: isValid ? false : errors,
		isValid: isValid,
		parameters: parameters
	};
};

/**
 * @memberOf CheckoutController
 * @private
 * @static
 * @returns {object}
 * @param {object} parameters
 */
function __validateRemoveFromCart(parameters) {
	var errors = [];
	var isValid = false;
	var itemId, itemLocation;

	if (parameters.id && !isNaN(parameters.id) && parameters.location && typeof parameters.location === "string") {
		itemId = parseInt(parameters.id);
		itemLocation = parameters.location;
		isValid = true;
	}
	else {
		errors.push("invalid or missing parameters");
	}
	return {
		errors: isValid ? false : errors,
		isValid: isValid,
		parameters: isValid ? {
			id: itemId,
			location: itemLocation
		} : parameters
	};
};
