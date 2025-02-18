"use strict"
const express = require("express"),
// test commit
  //	debug = require("libs/buglog"),
  //  log = debug("routes", "api.v2"),
  router = express.Router(),
  //  heapdump = require('heapdump'),
  OAuth2Server = require("oauth2-server"),
  // oauthServer = require('express-oauth-server'),
  apiUsers = require("config/settings/apiUsers"),
  
  // authKey = "A5BC74BB8CD4AA86",
  //allowedIPs = ['::ffff:172.17.0.1','::ffff:68.49.23.196'],
  //  Request = OAuth2Server.Request,
  //	Response = OAuth2Server.Response;
  // let bodyParser = require('body-parser');
  bodyParser = require("body-parser")
  const fetch = require("node-fetch")
  const http = require("http")
  const os = require("os")
  const email = require("../../../common/controllers/email")
  const app = express()

  /**
   * The isDefined function checks if the property passed exists, with an option for comparing the property to another property.
   * @param {string|number} property is the value initially being validated
   * @param {string|number} compare is the value that is compared to the initial property
   * @returns {boolean}
   */

  const isDefined = (property, compare) => {
    const propIsDefined = property !== undefined && property !== null
    const compareIsDefined = compare !== undefined && compare !== null
    if (compareIsDefined) {
      if (!propIsDefined) {
        return true
      } else {
        return property === compare
      }
    } else {
      return propIsDefined
    }
  }
  
  const errorHandler = (error) => {
    console.log(error, "HERE IS THE ERROR")
    throw {
      message: error,
      code: ErrorCodes[error].CODE,
      description: ErrorCodes[error].MESSAGE
    }
  }

  const oauth = new OAuth2Server({
    model: require("models/oauth2/oauth2-model.js"),
    accessTokenLifetime: 60 * 5,
    allowBearerTokensInQueryString: true
  })

  require("http").globalAgent.maxSockets = require("https").globalAgent.maxSockets = 100

  const DealersEnum = {
    VISIONWHEEL: "VISIONWHEEL",
    DISCOUNTTIRE: "DISCOUNTTIRE"
  }

  const SupplierEnum = {
    VISIONWHEEL: "Vision Wheel"
  }

  const ErrorMessageEnum = {
    Success: "success",
    AccessDenied: "access-denied",
    InvalidSupplierLocation: "invalid-supplier-location",
    InvalidSite: "invalid-site",
    InvalidPartNumber: "invalid-part-number",
    InsufficientInventory: "insufficient-inventory",
    InvalidPONumber: "invalid-po-number",
    InvalidBrandName: "invalid-brand-name",
    InvalidLocation: "invalid-location",
    InvalidQuantity: "invalid-quantity",
    InvalidUser: "invalid-user",
    DuplicatePO: "duplicate-po",
    InvalidShippingInfo: "invalid-shipping-info",
    PickupNotAllowed: "pickup-not-allowed",
    ProductAccessDenied: "product-access-denied",
    QuantityThresholdExceeded: "quantity-threshold-exceeded",
    BillingIssue: "billing-issue",
    InvalidReturnNumber: "invalid-return-number",
    DuplicateReturn: "duplicate-return",
    ProductSearchFailure: "product-search-failure",
    UserSearchFailure: "user-search-failure",
    SiteManagerEmailSearchFailure: "site-manager-email-search-failure",
    POEmailDoesNotMatch: "po-email-does-not-match",
    PODoesNotMatchSite: "po-does-not-match-site",
    CannotObtainToken: "cannot-obtain-token",
    CannotObtainRates: "cannot-obtain-rates"
  }

  const ErrorCodes = {
    success: {
      CODE: 200,
      MESSAGE: `None`
    },
    "access-denied": {
      CODE: 403,
      MESSAGE: `Access Denied missing approved token`
    },
    "invalid-supplier-location": {
      CODE: 452,
      MESSAGE: `Supplier location is not recognized by system`
    },
    "invalid-site": {
      CODE: 453,
      MESSAGE: `Store number not recognized by System`
    },
    "invalid-part-number": {
      CODE: 454,
      MESSAGE: `if 'manufacturer' and/or 'partNumber' values are not recognized by Supplier system or are missing from the request`
    },
    "insufficient-inventory": {
      CODE: 455,
      MESSAGE: `if 'quantity' value exceeds available quantity at Supplier's requested DC`
    },
    "invalid-po-number": {
      CODE: 456,
      MESSAGE: `if 'purchaseOrderNumber' or 'originalOrderNumber' value is not a 10 digit numeric value or is not recognized by Supplier system`
    },
    "duplicate-po": {
      CODE: 457,
      MESSAGE: `if "purchaseOrderNumber' value has previously been sent and already resides in Supplier's system`
    },
    "invalid-shipping-info": {
      CODE: 458,
      MESSAGE: `if any values in the 'shipping' segment are not valid or missing, with the exception of 'addressLine2' and 'extension' which are optional`
    },
    "pickup-not-allowed": {
      CODE: 459,
      MESSAGE: `if 'type' value is PICKUP and the Supplier does not allow that function at the Supplier's requested DC for that particular DT Store`
    },
    "product-access-denied": {
      CODE: 460,
      MESSAGE: `if there are any restrictions in place that prevents Discount Tire from ordering a particular product at the Supplier's requested DC`
    },
    "quantity-threshold-exceeded": {
      CODE: 461,
      MESSAGE: `if 'quantity' value is either zero or exceeds any particular maximum order quantity threshold set by the Supplier`
    },
    "billing-issue": {
      CODE: 462,
      MESSAGE: `if there are any pricing and/or billing setup issues on the Supplier system related to a particular product being ordered`
    },
    "invalid-return-number": {
      CODE: 463,
      MESSAGE: `if 'returnOrderNumber' value is not a 10 digit numeric value`
    },
    "duplicate-return": {
      CODE: 464,
      MESSAGE: `if 'returnOrderNumber' value has previously been sent and already resides in Supplier's system`
    },
    "product-search-failure": {
      CODE: 465,
      MESSAGE: `Search failed to return items`
    },
    "user-search-failure": {
      CODE: 466,
      MESSAGE: `Search failed to validate user information`
    },
    "invalid-brand-name": {
      CODE: 467,
      MESSAGE: `Brand name given in request is empty or not found`
    },
    "invalid-location": {
      CODE: 468,
      MESSAGE: `Location given in request is empty or not found`
    },
    "invalid-quantity": {
      CODE: 469,
      MESSAGE: `Quantity given in request is empty or not a number`
    },
    "invalid-user": {
      CODE: 470,
      MESSAGE: `User given in request is missing or has an incorrect field`
    },
    "site-manager-email-search-failure": {
      CODE: 471,
      MESSAGE: `Manager email for site not found, local delivery requires site manager email.`
    },
    "po-email-does-not-match": {
      CODE: 472,
      MESSAGE: "Email tied to Purchase does not match User Email"
    },
    "po-does-not-match-site": {
      CODE: 473,
      MESSAGE: "Site tied to Purchase does not match Dealer Site"
    },
    "cannot-obtain-token": {
      CODE: 474,
      MESSAGE: "Could not obtain access token"
    },
    "cannot-obtain-rates": {
      CODE: 475,
      MESSAGE: "Could not obtain shipping rates"
    }
  }

  /**
   * Triggers Server Response and handles error logging via the triggerServerResponse function
   * @param {Object} response the Response object that contains response specific functions
   * @param {Object} response.setHeader setHeader function attached to response prototype which
   *  sets Header information in the server response
   * @param {Object} response.status status function attached to response prototype which
   *  sets server status information in the server response
   * @param {Object} response.json json function attached to response prototype which
   *  sets passes json data in the server response
   * @param {string} serverResponse references server error message Enums
   * @param {object|string} errorMessage error message that will be consoled
   * @param {object} serverResponseData object that overrides the server response
   * @returns {void}
   */

  const triggerServerResponse = (
    response,
    serverResponse = ErrorMessageEnum.Success,
    errorMessage = null,
    serverResponseData = {}
  ) => {
    const stack = serverResponse !== ErrorMessageEnum.Success ? {} : new Error().stack
    if (!isDefined(response) && typeof response !== "object") {
      console.error("Internal Error: missing Response object")
      console.log(stack)
      return
    }

    if (!isDefined(serverResponse) && typeof serverResponse !== "string") {
      console.error("Internal Error: missing Server Response message")
      console.log(stack)
      return
    }

    if (isDefined(errorMessage)) {
      console.error(errorMessage)
      console.log(stack)
    } else {
      console.error(`Error Message: ${serverResponse}`)
    }

    let updateResponse = { ...serverResponseData }
    if (!updateResponse.message) {
      updateResponse.message = serverResponse
    }
    updateResponse.code = !serverResponseData.code ? ErrorCodes[serverResponse].CODE : serverResponseData.code

    response.setHeader("message", !serverResponseData.message ? serverResponse : serverResponseData.message)
    response.status(updateResponse.code).json(updateResponse)
    return
  }

  const checkResponseObject = (response) => {
    console.log(response.hasOwnProperty("setHeader"), "Response Object -- setHeader")
    console.log(response.hasOwnProperty("status"), "Response Object -- status")
    console.log(response.hasOwnProperty("json"), "Response Object -- json")
  }

  /**
   * Checks server Memory resources via OS library
   */

  const checkMemoryStatistics = function () {
    // checks total system memory
    const freeMemory = os.freemem()
    const totalMemory = os.totalmem()
    const { rss, heapTotal, heapUsed, external, arrayBuffers } = process.memoryUsage()
    console.warn(`Current Free System Memory: ${freeMemory} bytes`)
    console.warn(`Total System Memory: ${totalMemory} bytes`)
    console.warn(`Current Process Memory Usage -- rss: ${rss} bytes`)
    console.warn(`Current Process Memory Usage -- heapTotal: ${heapTotal} bytes`)
    console.warn(`Current Process Memory Usage -- heapUsed: ${heapUsed} bytes`)
    console.warn(`Current Process Memory Usage -- external: ${external} bytes`)
    console.warn(`Current Process Memory Usage -- arrayBuffers: ${arrayBuffers || 0} bytes`)
  }

  // REALLY BASIC FOR NOW SO THAT I CAN UPDATE IT LATER WITH ANY API STUFF AND HAVE IT APPLY TO WHERE IT NEEDS
  const getShippingInfo = () => {
    const shippingOptions = require("config/settings/shippingOptions")
    return shippingOptions
  }

  const validatePropAndRunFunction = function (object, property, func, isStrict = false) {
    if (object === undefined || object === null) {
      console.error("Object is missing")
      return
    }

    if (typeof object !== "object") {
      console.error(`Object: ${object} is invalid type, must be object`)
      return
    }

    if (property === undefined || property === null) {
      console.error("Property is missing")
      return
    }

    if (typeof property !== "string") {
      console.error("Property is invalid type, must be string")
      return
    }

    if (func === undefined || func === null) {
      console.error("Function is missing")
      return
    }

    if (typeof func !== "function") {
      console.error("Function is invalid type, must be function")
      return
    }

    if (!object.hasOwnProperty(property) && isStrict) {
      if (Object.keys(object).length > 0) {
        console.error(`Object has the following properties: ${Object.keys(object)}`)
        console.error(`Property: ${property} does not exist on Object: ${object}, cannot run Function`)
      } else {
        console.error(`Object has no properties`)
      }
      return
    }

    func()
  }

  // UPS FUNCTIONS
  const upsClientId = process.env.UPS_CLIENT_ID
  const upsClientSecret = process.env.UPS_CLIENT_SECRET

  const getUPSToken = async () => {
    const formData = {
      grant_type: "client_credentials",
      code: "string",
      redirect_uri: "string"
    }

    const response = await fetch(`https://wwwcie.ups.com/security/v1/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${upsClientId}:${upsClientSecret}`).toString("base64")
      },
      body: new URLSearchParams(formData).toString()
    })

    const data = await response.json()
    // console.log(data, "DATA INSIDE get UPS TOKEN")
    if (data.response !== undefined) {
      return data.response
    }
    return data
  }
  const getNegotiatedRates = async (
    authToken,
    request,
    warehouseInfo,
    customerInfo,
    dealerResult,
    item,
    // items,
    requestType
  ) => {
    // console.log(authToken, "AUTH TOKEN")
    // console.log(request, "REQUEST FROM GET DELIVERY")
    // console.log(warehouseInfo, "WAREHOUSE INFO")
    // console.log(dealerResult, "DEALER RESULT IN RATES")
    // console.log(items[0], "ITEMS TO GET RATES FOR")
    // console.log(items[0].specification, "ITEMS TO GET RATES FOR")
    // console.log(requestType, "REQUEST TYPE")
    // console.log(customerInfo, "CUSTOMER INFO IN GETNEGOTIATED")
    const shippingList = getShippingInfo()
    let shippingListOption

    if (request.shipping) {
      shippingListOption = shippingList.delivery_options[0].methods.find((method) => {
        if (method.id === request.shipping.method) return method
      })
    } else {
      console.log("NO SHIPPING")
    }

    let totalWeight = item[0].specification.gross_weight
    let shippingWidth = item[0].specification.shipping_width
    let shippingHeight = item[0].specification.shipping_height
    let shippingLength = item[0].specification.shipping_length
    // let totalWeight = 0
    // let shippingWidth = 0
    // let shippingHeight = 0
    // let shippingLength = 0

    // items.forEach((product) => {
    //   console.log(product[0].specification, "ITEM SPECS")
    //   if (product[0].specification.gross_weight) {
    //     totalWeight += product[0].specification.gross_weight
    //   } else {
    //     totalWeight += 0
    //   }

    //   if (
    //     product[0].specification.shipping_height &&
    //     product[0].specification.shipping_height > shippingHeight
    //   ) {
    //     shippingHeight = product[0].specification.shipping_height
    //   }
    //   if (
    //     product[0].specification.shipping_width &&
    //     product[0].specification.shipping_width > shippingWidth
    //   ) {
    //     shippingWidth = product[0].specification.shipping_width
    //   }
    //   if (
    //     product[0].specification.shipping_length &&
    //     product[0].specification.shipping_length > shippingLength
    //   ) {
    //     shippingLength = product[0].specification.shipping_length
    //   }
    // })
    console.log(totalWeight.toString(), "TOTAL WEIGHT")
    console.log(shippingHeight, shippingLength, shippingWidth, "SHIPPING STUFF")

    const query = new URLSearchParams({
      additionalinfo: ""
    }).toString()
    // VISION WHEEL ACCOUNT NUMBER WE've BEEN GIVEN 334386, THERE ARE DIFFERENT ONES, WILL NEED TO WORK THAT IN

    let customerCountryCode =
      customerInfo.country === "CA" || customerInfo.country.toLowerCase() === "canada" ? "CA" : "US"

    // IMPORTANT
    // IMPORTANT
    // Add the weights of all the items together and maybe do something with the dimensions for the boxes. Then send the query. You'll get multiple of the same back, but just use one to send
    // IMPORTANT
    // IMPORTANT

    const version = "v2403"
    const requestoption = requestType
    const response = await fetch(`https://wwwcie.ups.com/api/rating/${version}/${requestoption}?${query}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        transId: "",
        transactionSrc: "testing",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        RateRequest: {
          Request: {
            TransactionReference: {
              CustomerContext: "Verify Success response"
            }
          },
          Shipment: {
            Shipper: {
              Name: warehouseInfo.name,
              ShipperNumber:
                dealerResult.ups_account && dealerResult.payment_option === "3rd Party UPS Account"
                  ? dealerResult.ups_account
                  : "334386",
              Address: {
                AddressLine: warehouseInfo.address,
                City: warehouseInfo.city,
                StateProvinceCode: warehouseInfo.abrev,
                PostalCode: warehouseInfo.postal,
                CountryCode: warehouseInfo.locale
              }
            },
            ShipTo: {
              Name: request.shipping
                ? request.shipping.name
                : `${customerInfo.first_name} ${customerInfo.last_name}`,
              Address: {
                AddressLine: request.shipping
                  ? [request.shipping.addressLine1, request.shipping.addressLine2]
                  : [customerInfo.addressLine1, customerInfo.addressLine2],
                City: request.shipping ? request.shipping.city : customerInfo.city,
                StateProvinceCode: request.shipping ? request.shipping.state : customerInfo.state,
                PostalCode:
                  request.shipping && request.shipping.zip ? request.shipping.zip.base : customerInfo.zip,
                CountryCode: customerCountryCode
              }
            },
            ShipFrom: {
              Name: warehouseInfo.name,
              ShipperNumber: warehouseInfo.tollfree,
              Address: {
                AddressLine: warehouseInfo.address,
                City: warehouseInfo.city,
                StateProvinceCode: warehouseInfo.abrev,
                PostalCode: warehouseInfo.postal,
                CountryCode: warehouseInfo.locale
              }
            },
            PaymentDetails:
              dealerResult.ups_account && dealerResult.payment_option === "3rd Party UPS Account"
                ? {
                    ShipmentCharge: {
                      Type: "01",
                      BillThirdParty: {
                        AttentionName: request.shipping
                          ? request.shipping.name
                          : `${customerInfo.first_name} ${customerInfo.last_name}`,
                        Name: request.shipping
                          ? request.shipping.name
                          : `${customerInfo.first_name} ${customerInfo.last_name}`,
                        AccountNumber: dealerResult.ups_account,
                        Address: {
                          // ResidentialAddressIndicator: "Y",
                          AddressLine: request.shipping
                            ? [request.shipping.addressLine1, request.shipping.addressLine2]
                            : [customerInfo.addressLine1, customerInfo.addressLine2],
                          City: request.shipping ? request.shipping.city : customerInfo.city,
                          StateProvinceCode: request.shipping ? request.shipping.state : customerInfo.state,
                          PostalCode:
                            request.shipping && request.shipping.zip
                              ? request.shipping.zip.base
                              : customerInfo.zip,
                          CountryCode: customerCountryCode
                        }
                      }
                    }
                  }
                : {
                    ShipmentCharge: {
                      Type: "01",
                      BillShipper: {
                        AccountNumber: "334386"
                      }
                    }
                  },
            ShipmentRatingOptions: {
              TPFCNegotiatedRatesIndicator: "Y",
              NegotiatedRatesIndicator: "Y"
            },
            Service:
              requestType === "Rate"
                ? {
                    Code: request.shipping.method,
                    Description: shippingListOption ? shippingListOption.name : "UPS Shipping"
                  }
                : {
                    Code: "02",
                    Descripton: ""
                  },
            // NumOfPieces: "10",
            Package: {
              PackagingType: {
                Code: "02",
                Description: "Packaging"
              },
              // DIMENSIONS ARE OPTIONAL, LATER SET THIS UP TO ACCEPT IF WE HAVE DIMENSIONS, we do not yet

              Dimensions:
                shippingHeight && shippingLength && shippingWidth
                  ? {
                      UnitOfMeasurement: {
                        Code: "IN",
                        Description: "Inches"
                      },
                      Length: shippingLength.toString(),
                      Width: shippingWidth.toString(),
                      Height: shippingHeight.toString()
                    }
                  : false,
              PackageWeight: {
                UnitOfMeasurement: {
                  Code: "LBS",
                  Description: "Ounces"
                },
                Weight: totalWeight > 0 ? totalWeight.toString() : "0.8"
              },
              OversizeIndicator: "X",
              MinimumBillableWeightIndicator: "X"
            }
          }
        }
      })
    })

    const data = await response.json()
    // console.log(data, "DATA IN RATES")
    // console.log(data.RateResponse.RatedShipment, "DATA RESPONSE IN RATES")
    // console.log(data.response, "DATA RESPONSE FROM RATES POST")
    if (data.response !== undefined) {
      return { error: data.response }
    }

    // MAYBE SEND IN THE CODE FOR THE CHOSEN SHIPPING AND GET THAT FOR EACH AND THEN PUT INTO ONE ARRAY. ALSO NEED TO HAVE A SINGLE ARRAY FOR ALL THE OTHER PARTS
    if (data.RateResponse) {
      return { data: data.RateResponse.RatedShipment }

      // let ratedShipment = data.RateResponse.RatedShipment
      // ratedShipment.forEach((service) => {
      //   let foundShipment = ratedShipment.find((shipment) => {
      //     if (shipment.Service.Code === service.Service.Code) {
      //       // shipment.NegotiatedRateCharges.TotalCharge += service.NegotiatedRateCharges.TotalCharge
      //       return shipment
      //     }
      //   })
      //   if (foundShipment) {
      //     // console.log(foundShipment, "FOUND SHIPMENT")
      //     service.NegotiatedRateCharges.TotalCharge += foundShipment.NegotiatedRateCharges.TotalCharge
      //   }
      // })
      // console.log(ratedShipment, "RATED SSHIPMENT AFTER ADDING")
      // return { data: ratedShipment }
    }
  }

  router.post("/oauth/token", function (req, res) {
    let request = new OAuth2Server.Request(req)
    let response = new OAuth2Server.Response(res)
    console.log("headers", req.headers)

    oauth
      .token(request, response)
      .then(function (token) {
        console.log("resp token", token)
        let responseData = {}
        responseData.token_type = "Bearer"
        responseData.expires_in = "300"
        responseData.access_token = token.accessToken
        responseData.scope = token.scope

        res.status(200).json(responseData)
      })
      .catch(function (err) {
        console.log("resp err")

        res.status(err.code || 500).json(err)
      })
      .then(function (req, res) {
        console.log("save")
      })

    return
  })

  router.get("/ping", function (req, res) {
    /* heapdump.writeSnapshot(function(err, filename) {
router.get("/ping", function (req, res) {
  /* heapdump.writeSnapshot(function(err, filename) {
        var fs = require('fs');

    /* Read File 
    fs.readFile(filename, bar);

    function bar (err, data)
      {
      /* If an error exists, show it, otherwise show the file 
    // err ? Function("error","throw error")(err) : console.log(JSON.stringify(data.keys()) );
    console.log('length',data.length);
    data.slice(0, 30).forEach(function(item) {
        console.log(item);
      } );
      console.log('data end');
      data.slice(-30).forEach(function(item) {
        console.log(item);
      } );
      };
      }); */
    let request = new OAuth2Server.Request(req)
    let response = new OAuth2Server.Response(res)

    return oauth
      .authenticate(request, response)
      .then(function (token, response) {
        console.log("auth next")
        let responseData = {}
        responseData.status = "alive"
        responseData.application = "vw-supplier-fufillment-api"
        responseData.env = "dev"
        responseData.version = "v1"
        res.status(200).json(responseData)
      })
      .catch(function (err) {
        console.log("auth err")
        res.status(err.code || 500).json(err)
      })
  })

  router.post("/checkInventory", function (req, res) {
    checkMemoryStatistics()
    let request = new OAuth2Server.Request(req)
    let response = new OAuth2Server.Response(res)

    return oauth
      .authenticate(request, response)
      .then(function (token, response) {
        console.log("auth next")
        console.log("req head", req.headers)
        if (req.headers.dtrequestidentifier) {
          res.setHeader("dtRequestIdentifier", req.headers.dtrequestidentifier)
        }
        if (req.headers.dtcorrelationid) {
          res.setHeader("dtCorrelationId", req.headers.dtcorrelationid)
        }
        if (req.headers.dtsourcesystem) {
          res.setHeader("dtSourceSystem", req.headers.dtsourcesystem)
        }
        if (req.headers.dtsourcesubsystem) {
          res.setHeader("dtSourceSubsystem", req.headers.dtsourcesubsystem)
        }
        let responseData = {}
        let itemList = []
        let productResponseArray = []
        let warehouse = ""
        let userId = token.client.id
        let userObj = apiUsers.find((x) => x.id == userId)
        let userDealer = userObj.dealer || DealersEnum.VISIONWHEEL
        let body = req.body
        let partNums = body.product
        if (userDealer == DealersEnum.DISCOUNTTIRE) {
          req.VWModel.checkStoreNumber(body.site, userDealer)
            .then(function (result) {
              let storeCount = result[0].count
              if (storeCount == 0) {
                responseData.message = "invalid-site"
                res.setHeader("message", "invalid-site")
                res.status(453).json(responseData)
              }
            })
            .catch(function (err) {
              responseData.message = "invalid-site"
              res.setHeader("message", "invalid-site")
              res.status(453).json(responseData)
            })
        }

        let invalidPart = false
        let accessDenied = false
        let warehouseList = require("config/settings/warehouses")
        let count = 0
        Object.keys(warehouseList).forEach(function (item) {
          if (
            warehouseList[item].locationCode == body.supplierLocation &&
            warehouseList[item].isLive == true
          ) {
            warehouse = item
          }
        })
        if (warehouse == "") {
          responseData.message = "invalid-supplier-location"
          res.setHeader("message", "invalid-supplier-location")
          res.status(452).json(responseData)
          return
        }
        partNums.forEach(function (item, index) {
          if (!item.partNumber || item.partNumber == "") {
            responseData.message = "invalid-part-number"
            res.setHeader("message", "invalid-part-number")
            res.status(454).json(responseData)
            return
          }
          req.VWModel.getItemByPartNum(item.partNumber)
            .then(function (itemPartResponse) {
              if (itemPartResponse == "") {
                invalidPart = true
                console.log("invalid part")
                responseData.message = "invalid-part-number"
                res.setHeader("message", "invalid-part-number")
                res.status(454).json(responseData)
                return
              }
            })
            .catch(function (err) {
              invalidPart = true
              responseData.message = "invalid-part-number"
              res.setHeader("message", "invalid-part-number")
              res.status(454).json(responseData)
              return
            })
        })
        /* start new code 
let count = 0;

  partNums.forEach(function(item) {
  itemList.push({
  manufacturer: item.manufacturer,
  partNumber: item.partNumber,
  partNumberType: item.partNumberType,
  Warehouse: body.supplierLocation
  });
  productResponseArray.push({
  lineItem: 0,
  manufacturer: item.manufacturer,
  partNumber: item.partNumber,
  partNumberType: item.partNumberType,
  });
  }); /*
  req.VWModel.getDealerItems({
  nav_customer_id: userDealer,
  userIsDTCUser : false,
  multiplier : null
  }) 
  itemList.forEach(function(requestedItem, index) { 
  count++;
  req.VWModel.getItemByPartNum(requestedItem.partNumber).then(function( response ) {
  if (response == '') {
    responseData.message = "invalid-part-number";
    res.setHeader('message', 'invalid-part-number');
    res.status( 454 ).json( responseData ); 
    return;
  } /*
  req.VWModel.getDealerItems({
    nav_customer_id: userDealer,
    userIsDTCUser : false,
    multiplier : null
  }).then(function( response ) { 
    console.log('dealer item resp', response);
    Object.keys(warehouseList).forEach(function (item) { 
      if (warehouseList[item].locationCode == body.supplierLocation)
      {
        warehouse = item;
      }
    });        
    if (warehouse == '')
    {
      responseData.message = "invalid-supplier-location";
      res.setHeader('message', 'invalid-supplier-location');
      res.status( 452 ).json( responseData );
      return;
    }

        console.log('warehouse',warehouse);
    let partResponse = {};
    partResponse.message = "success";
        //partResponse.product = count;
      console.log('start each'); 
    response.forEach(function(part) { console.log('each');
      let productResponse = {};
      let partNum = requestedItem.partNumber;
      let partQty = part.inventory[warehouse];
      itemList[index].lineItem = index + 1;
      itemList[index].availableQuantity = partQty;
      productResponseArray[index].lineItem = index + 1;
          //productResponseArray[index].partNumber = partNum;
      productResponseArray[index].availableQuantity = partQty;
    });
    if (index === (itemList.length - 1)) {
      
      partResponse.product = productResponseArray;
      itemList = null;
      productResponseArray = null;
      res
        .status( 200 )
        .json(partResponse);
        return;
      }
    /* });
    .catch(function(err) {
      console.log('460 part err catch',err);
      responseData.message = "product-access-denied";
      res.setHeader('message', 'product-access-denied');
      res.status( 460 ).json( responseData ); 
      return;  
    }); 
  }).catch(function(err) {
    
    console.log('454 part err');
      responseData.message = "invalid-part-number";
      res.setHeader('message', 'invalid-part-number');
      res.status( 454 ).json( responseData ); 
      return;
  }); 

  });

// end new code  */
        req.VWModel.getDealerProductsAndSpecifications({
          nav_customer_id: userDealer,
          userIsDTCUser: false,
          multiplier: null,
          part_number: partNums
        }).then(function (itemResponse) {
          console.log("item resp", itemResponse)
          partNums.forEach(function (item, index) {
            //      console.log('part nums check');
            //      console.log(item);

            let product = itemResponse.items.find((x) => x.part_number == item.partNumber)
            if (!product) {
              accessDenied = true
            }
            itemResponse = null
          })
          if (invalidPart == true) {
            console.log("454 part err")
            responseData.message = "invalid-part-number"
            res.setHeader("message", "invalid-part-number")
            res.status(454).json(responseData)
            return
          } else if (accessDenied == true) {
            responseData.message = "product-access-denied"
            res.setHeader("message", "product-access-denied")
            res.status(460).json(responseData)
            return
          }
          partNums.forEach(function (item) {
            itemList.push({
              manufacturer: item.manufacturer,
              partNumber: item.partNumber,
              partNumberType: item.partNumberType,
              Warehouse: body.supplierLocation
            })
            productResponseArray.push({
              lineItem: 0,
              manufacturer: item.manufacturer,
              partNumber: item.partNumber,
              partNumberType: item.partNumberType
            })
          })

          itemList
            .forEach(function (requestedItem, index) {
              count++
              //                console.log('num',requestedItem.VendorPartNumber);
              req.VWModel.getItemByPartNum(requestedItem.partNumber)
                .then(function (response) {
                  console.log("part num response old", response)
                  if (response == "") {
                    responseData.message = "invalid-part-number"
                    res.setHeader("message", "invalid-part-number")
                    res.status(454).json(responseData)
                    return
                  }

                  // console.log('warehouse',warehouse);
                  let partResponse = {}
                  partResponse.message = "success"
                  //partResponse.product = count;
                  response.forEach(function (part) {
                    console.log("each")
                    let productResponse = {}
                    let partNum = requestedItem.partNumber
                    let partQty = part.inventory[warehouse]
                    itemList[index].lineItem = index + 1
                    itemList[index].availableQuantity = partQty
                    productResponseArray[index].lineItem = index + 1
                    //productResponseArray[index].partNumber = partNum;
                    productResponseArray[index].availableQuantity = partQty
                  })
                  if (index === itemList.length - 1) {
                    partResponse.product = productResponseArray
                    productResponseArray = null
                    itemList = null
                    partNums = null
                    warehouseList = null
                    checkMemoryStatistics()
                    res.status(200).json(partResponse)
                    return
                  }
                })
                .catch(function (err) {
                  if (invalidPart == true) {
                    console.log("invalid part")
                    responseData.message = "invalid-part-number"
                    res.setHeader("message", "invalid-part-number")
                    res.status(454).json(responseData)
                    return
                  }
                })
            })
            .catch(function (err) {
              if (invalidPart == true) {
                console.log("invalid part")
                responseData.message = "invalid-part-number"
                res.setHeader("message", "invalid-part-number")
                res.status(454).json(responseData)
                return
              } else if (accessDenied == true) {
                console.log("460 part err catch")
                responseData.message = "product-access-denied"
                res.setHeader("message", "product-access-denied")
                res.status(460).json(responseData)
                return
              }
            })
          if (invalidPart == true) {
            console.log("invalid part")
            responseData.message = "invalid-part-number"
            res.setHeader("message", "invalid-part-number")
            res.status(454).json(responseData)
            return
          } else if (accessDenied == true) {
            console.log("460 part err catch")
            responseData.message = "product-access-denied"
            res.setHeader("message", "product-access-denied")
            res.status(460).json(responseData)
            return
          }
        })
      })
      .catch(function (err) {
        console.log("auth err", err)
        console.log("err req", request)
        console.log("err res", response)

        res.status(err.code || 500).json(err)
      })
  })

  router.post("/createOrder", function (req, res) {
    // FULL POST REQUEST FORMAT

    //   {
    //     "user": {
    //       "email": "qa@visionwheel.com",
    //         "nav_customer_id":"VISIONWHEEL"
    //     },
    //   "supplierName": "Vision Wheel",
    //   "supplierLocation": "50",
    //   "warehouse":"TX",
    //   "site": "{{vision_test_site_id}}",
    //   "purchaseOrderNumber": "1234567892-ds",
    //   "shipping": {
    //       "type": "DELIVERY",
    //       "carrier": "FEDEX",
    //       "method": "90",
    //       "name": "HIGHLANDS RANCH (COD 14)",
    //       "addressLine1": "12345 N 3oth St",
    //       "addressLine2": "Suite 12",
    //       "city": "Scottsdale",
    //       "state": "AZ",
    //       "zip": {
    //           "base": "80126",
    //           "extension": "2437",
    //           "completeZipCode": "80126-2437"
    //       }
    //   },
    //   "product": [
    //       {
    //           "lineItem": 1,
    //           "manufacturer": "VISIONWHEEL",
    //           "partNumber": "141H7861GM0",
    //           "partNumberType": "MPN",
    //           "quantity": 1
    //       }
    //   ]
    // }
    checkMemoryStatistics()
    let request = new OAuth2Server.Request(req)
    let response = new OAuth2Server.Response(res)
    let warehouseList = require("config/settings/warehouses")

    let holdResponse = {}

    let body = req.body
    let tempPOnum = body.purchaseOrderNumber
    let webOrderNum
    let partNums = body.product
    let ship_type = body.shipping.type
    let ship_agent = body.shipping.carrier
    let ship_code = body.shipping.method
    let warehouse = body.warehouse
    let userCart = { items: {} }
    let userCartItems = {}
    let managerEmail
    let orderResponseBody

    let userParams
    let totalQuant = 0
    let firstName = ""
    let lastName = ""
    let dealerEmail = ""
    let invalidPart = false
    let partIndex

    let invalid_po = false
    let exitOrder = false

    let userName
    let userAddress1
    let userCity
    let userState
    let userZip

    const warehouseListByCode = {}
    const localesList = ["US", "CA"]

    // Create an object with purchase order as the key. Put all the shipping info into it and later when you need the response returned reference it with a key value pair and return that response
    const completeOrder = {}

    const createOrder = (request, response, userEmail, userDealer, queryOptions, userParams) => {
      const findCustomer = (request, response, customerData, responseData = {}) => {
        const { email } = customerData
        const { VWModel } = request

        return VWModel.findUser({ email: email }).then((result) => {
          const userLocale = result.country.slice(0, 2).toUpperCase()
          const warehouseListByLocale = userLocale === "CA" ? { US: [], CA: [] } : { US: [] }

          if (body.shipping.name) {
            let nameArr = body.shipping.name.split(" ")
            firstName = nameArr[0]
            nameArr.shift()
            lastName = nameArr.join(" ")
          }
          Object.keys(warehouseList).forEach((key) => {
            if (userLocale === "CA") {
              warehouseListByLocale[warehouseList[key].locale].push(warehouseList[key].locationCode)
            } else if (warehouseList[key].locale === "US") {
              warehouseListByLocale["US"].push(warehouseList[key].locationCode)
            }
          })

          if (req.body.supplierName && result) {
            console.log("Customer validation successful.")
            return {
              isCustomerValid: true,
              result: result,
              locale: userLocale || "US",
              locationsByLocale: warehouseListByLocale
            }
          }
        })
      }
      const getWarehouse = (request, response) => {
        let warehouseData

        Object.keys(warehouseList).forEach((item) => {
          if (
            warehouseList[item].locationCode == request.body.supplierLocation &&
            warehouseList[item].isLive == true
          ) {
            warehouse = item
            warehouseData = warehouseList[item]
          }
        })
        if (!warehouse) {
          errorHandler(ErrorMessageEnum.InvalidSupplierLocation)
        }
        return { isWarehouseValid: true, warehouse: warehouseData }
      }

      const findDealer = (request, response, navCustomerId, responseData = {}) => {
        const { VWModel } = request

        return VWModel.findDealer({ nav_customer_id: navCustomerId }).then((result) => {
          if (result) {
            console.log("Dealer Found")
            return {
              result: result
            }
          }
        })
      }

      const customerShippingValidation = (body, customerValues, userDealer, responseData = {}) => {
        console.log("SHIPPING VALIDATION".green)

        const { result, locale, locationsByLocale } = customerValues
        const localeValid = locationsByLocale[locale].find((locale) => {
          if (locale === body.supplierLocation) {
            return true
          }
          return false
        })

        if (!localeValid) {
          errorHandler(ErrorMessageEnum.InvalidSupplierLocation)
        }

        if (userDealer === "DISCOUNTTIRE" && !body.site) {
          errorHandler(ErrorMessageEnum.InvalidShippingInfo)
        }

        userName =
          !body.shipping.name && body.user !== undefined
            ? `${result.first_name} ${result.last_name}`
            : body.shipping.name

        if (!body.shipping.name && body.user !== undefined) {
          firstName = result.first_name
          lastName = result.last_name
        }

        userAddress1 =
          !body.shipping.addressLine1 && body.user !== undefined
            ? result.address_1
            : body.shipping.addressLine1

        userCity = !body.shipping.city && body.user !== undefined ? result.city : body.shipping.city
        userState = !body.shipping.state && body.user !== undefined ? result.state : body.shipping.state

        if (body.shipping.zip === undefined && body.user === undefined) {
          errorHandler(ErrorMessageEnum.InvalidShippingInfo)
        }

        if (body.shipping.zip === undefined && body.user !== undefined) {
          userZip = result.zip
        } else if (body.shipping.zip !== undefined && body.shipping.zip.completeZipCode !== undefined) {
          userZip = body.shipping.zip.completeZipCode
        } else if (!body.shipping.zip.completeZipCode && body.shipping.zip.base) {
          userZip = body.shipping.zip.base
        }

        if (!userName || !userAddress1 || !userCity || !userState || !userZip) {
          errorHandler(ErrorMessageEnum.InvalidShippingInfo)
        } else {
          return
        }
      }

      const validateStoreNumber = function (request, response, userDealer, responseData = {}) {
        console.log("VALIDATING STORE".green)

        const { body, VWModel } = request
        return VWModel.checkStoreNumber(body.site, userDealer).then(function (result) {
          let storeCount = result[0].count
          if (storeCount === 0) {
            errorHandler(ErrorMessageEnum.InvalidSite)
          } else {
            return
          }
        })
      }

      const getStoreShippingInfo = (request) => {
        const { body, VWModel } = request

        return VWModel.getShipInfoByStoreNum(body.site)
          .then((result) => {
            return { result: result }
          })
          .catch((err) => {
            return errorHandler(ErrorMessageEnum.InvalidShippingInfo)
          })
      }

      const siteManagerEmailValidation = (defaultLocation) => {
        const selectedWarehouseKey = Object.keys(warehouseList).find(function (item) {
          return warehouseList[item].locationCode == defaultLocation
        })

        const siteManagerEmail = warehouseList[selectedWarehouseKey].managerEmail
        const emailPreference = warehouseList[selectedWarehouseKey].emailPreference

        if (!siteManagerEmail) {
          errorHandler(ErrorMessageEnum.SiteManagerEmailSearchFailure)
        }
        return { siteManagerEmail, emailPreference }
      }

      const chooseShippingOption = (request, userResult, storeShippingResult, userDealer) => {
        const { body, VWModel } = request
        const shippingOptions = getShippingInfo()
        let requestedShippingMethod
        const shippingTypeLocal = body.shipping.carrier.toLowerCase() === "delivery"
        const storeShipping = storeShippingResult ? storeShippingResult[0] : null

        if (storeShipping) {
          const defaultLocation = storeShipping.shipping_config.defaultLocationCode
          const localEnabled = storeShipping.local_enabled

          if (!localEnabled) {
            errorHandler(ErrorMessageEnum.InvalidShippingInfo)
          }
          if (localEnabled && defaultLocation !== body.supplierLocation) {
            errorHandler(ErrorMessageEnum.InvalidShippingInfo)
          }
          if (localEnabled && shippingTypeLocal) {
            managerEmail = siteManagerEmailValidation(defaultLocation)
          }
        }

        if (!userResult.local_enabled && shippingTypeLocal && userDealer !== "DISCOUNTTIRE") {
          errorHandler(ErrorMessageEnum.InvalidShippingInfo)
        }

        const chosenShippingOption = shippingOptions.delivery_options.find(
          (option) => option.name.toLowerCase() === body.shipping.carrier.toLowerCase()
        )
        if (!chosenShippingOption) {
          errorHandler(ErrorMessageEnum.InvalidShippingInfo)
        }

        if (
          typeof body.shipping.method === "number" &&
          body.shipping.method > 0 &&
          body.shipping.method < 10
        ) {
          requestedShippingMethod = `0${body.shipping.method}`
        } else {
          requestedShippingMethod = body.shipping.method.toString()
        }

        let chosenShippingMethod = {}

        if (body.shipping.method === "01" || body.shipping.method === "02" || body.shipping.method === "03") {
          chosenShippingMethod = chosenShippingOption.methods.find((method) => {
            return method.id === body.shipping.method
          })
        } else {
          errorHandler(ErrorMessageEnum.InvalidShippingInfo)
        }

        if (!chosenShippingMethod) {
          errorHandler(ErrorMessageEnum.InvalidShippingInfo)
        }
        return { chosenShippingMethod, chosenShippingOption }
      }

      const getShippingRates = (
        request,
        response,
        userResult,
        dealerResult,
        storeShippingResult,
        userDealer,
        userParams,
        warehouseInfo,
        items,
        responseData = {}
      ) => {
        const { chosenShippingMethod, chosenShippingOption } = chooseShippingOption(
          request,
          userResult,
          storeShippingResult,
          userDealer
        )
        if (body.shipping.type == "PICKUP") {
          ship_type = "CPU"
          ship_agent = "CPU"
          ship_code = "CPU"
        }

        if (dealerResult.payment_option === "prepaid") {
          console.log("PREPAID WRITES TO ORDER KEEP SHIPPING COST?")
          if (body.shipping.carrier === "UPS") {
            return getUpsRates(
              request,
              response,
              userResult,
              dealerResult,
              userDealer,
              userParams,
              warehouseInfo,
              items,
              chosenShippingMethod,
              chosenShippingOption
            )
          } else {
            chosenShippingMethod.shipping_cost = 99.99
            return buildOrder(
              request,
              response,
              chosenShippingMethod,
              chosenShippingOption,
              chosenShippingMethod.shipping_cost,
              userDealer,
              userParams
            )
          }
        } else if (
          dealerResult.payment_option === "third party ups" ||
          dealerResult.payment_option === "third party fedex" ||
          dealerResult.payment_option === "freight collect"
        ) {
          console.log("NOT PREPAID, DOESN'T WRITE TO ORDER")
          chosenShippingMethod.shipping_cost = 0
          return buildOrder(
            request,
            response,
            chosenShippingMethod,
            chosenShippingOption,
            chosenShippingMethod.shipping_cost,
            userDealer,
            userParams
          )
        }
      }

      const getUpsRates = (
        request,
        response,
        userResult,
        dealerResult,
        userDealer,
        userParams,
        warehouseInfo,
        items,
        chosenShippingMethod,
        chosenShippingOption,
        responseData = {}
      ) => {
        const _promises = []

        if (dealerResult.ups_account) {
          const upsToken = getUPSToken()
          upsToken.then((token) => {
            // console.log(token, "CHECK WHY ACCESS TOKEN DOESN'T WORK")
            if (token.errors) {
              console.log("IN TOKEN ERROR HANDLER")
              errorInNestedHandler(ErrorMessageEnum.CannotObtainToken, token.errors)
            }

            items.forEach((item) => {
              // console.log(item, "ITEM GOING INTO GET RATES")
              const _promise = getNegotiatedRates(
                token.access_token,
                request.body,
                warehouseInfo,
                userResult,
                dealerResult,
                item,
                "Rate"
              )
                .then((values) => {
                  // console.log(values, "MADE IT TO VALUES")
                  if (values.data) {
                    // console.log(values[0], "CUSTOMER VALID")
                    // return returnShippingObject(values.data, customerInfo, warehouseInfo)
                    return values.data
                  } else {
                    // console.log(values[0].error, "ERROR IN GET NEGOTIATED RATES")
                    errorInNestedHandler(ErrorMessageEnum.CannotObtainRates, values.error.errors)
                    return
                  }
                })
                .catch(function (error) {
                  console.log(error, "ERROR IN GET NEGOTIATED")
                  return errorInNestedHandler(ErrorMessageEnum.CannotObtainRates)
                })
              _promises.push(_promise)
            })

            return Promise.all([..._promises])
              .then((shippingRates) => {
                console.log(shippingRates, "START BUILDING SHIPPING OBJECT")
                // return returnShippingObject(shippingRates, customerInfo, warehouseInfo)
                return buildOrder(
                  request,
                  response,
                  chosenShippingMethod,
                  chosenShippingOption,
                  shippingRates,
                  userDealer,
                  userParams
                )
              })
              .catch((error) => {
                console.log(error, "ERROR IN PROMISE.ALL BEFORE BUILD ORDER")
                return errorInNestedHandler(ErrorMessageEnum.CannotObtainRates)
              })
          })
        }
      }

      const buildOrder = (
        request,
        response,
        chosenShippingMethod,
        chosenShippingOption,
        shippingRates,
        userDealer,
        userParams
      ) => {
        let finalRate = 0

        if (shippingRates === null || shippingRates === undefined) {
          console.log("FAILED TO BUILD ORDER WITH PROVIDED RATES".green)
          return errorInNestedHandler(ErrorMessageEnum.CannotObtainRates)
        }

        if (Array.isArray(shippingRates) === true && shippingRates.length > 1) {
          shippingRates.forEach((rate) => {
            finalRate += +rate.NegotiatedRateCharges.TotalCharge.MonetaryValue
          })
        } else if (Array.isArray(shippingRates) === true && shippingRates.length === 1) {
          finalRate = +shippingRates[0].NegotiatedRateCharges.TotalCharge.MonetaryValue
        } else {
          finalRate = +shippingRates
        }

        orderResponseBody = {
          po_number: tempPOnum,
          shipping: {
            first_name: firstName,
            last_name: lastName,
            postalcode: userZip,
            address_1: userAddress1,
            address_2: typeof body.shipping.addressLine2 !== "undefined" ? body.shipping.addressLine2 : "",
            city: userCity,
            state: userState,
            store_number: body.site,
            method: chosenShippingMethod.type,
            ship_agent: chosenShippingOption.name,
            eship_agent_service_code: chosenShippingMethod.name,
            shipping_cost: finalRate.toFixed(2),
            is_api_order: true
          },
          totals: {
            shippingtotal: finalRate.toFixed(2)
          },
          vehicleInfo: body.vehicle
        }

        const orderBody = {
          po_number: tempPOnum,
          shipping: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            postalcode: userZip,
            address_1: userAddress1,
            address_2: typeof body.shipping.addressLine2 !== "undefined" ? body.shipping.addressLine2 : "",
            city: userCity,
            state: userState,
            store_number: body.site,
            method: chosenShippingMethod.type,
            ship_agent: chosenShippingOption.name,
            eship_agent_service_code: chosenShippingMethod.name,
            shipping_cost: finalRate.toFixed(2),
            is_api_order: true
          }),
          totals: JSON.stringify({
            shippingtotal: finalRate.toFixed(2)
          }),
          vehicleInfo: body.vehicle
        }
        completeOrder[`${tempPOnum}`] = orderResponseBody

        // console.log(orderResponseBody, "ORDER BODY")

        const orderVaildationRegEx = new RegExp("^[a-zA-Z0-9-]{2,20}$")
        const discountTireOrderVaildationRegEx = new RegExp("^[0-9]{10}$")

        if (!discountTireOrderVaildationRegEx.test(orderBody.po_number) && userDealer === "DISCOUNTTIRE") {
          invalid_po = true
        }

        if (!orderVaildationRegEx.test(orderBody.po_number) && userDealer !== "DISCOUNTTIRE") {
          invalid_po = true
        }

        if (invalid_po == true) {
          errorHandler(ErrorMessageEnum.InvalidPONumber)
          exitOrder = true
          return
        }

        validateOrderPO(request, response, orderBody, userDealer, userParams)
      }

      const validatePartNumber = (request, response) => {
        console.log("VALIDATING PART".green)
        const { body, VWModel } = request
        const itemArray = []

        partNums.forEach((item, index) => {
          if (!item.partNumber || item.partNumber == "") {
            errorHandler(ErrorMessageEnum.InvalidPartNumber)
          }
          VWModel.getItemByPartNum(item.partNumber)
            .then((itemPartResponse) => {
              if (
                typeof itemPartResponse == "undefined" ||
                itemPartResponse == null ||
                itemPartResponse.length == null ||
                itemPartResponse.length == 0
              ) {
                invalidPart = true
                return errorInNestedHandler(ErrorMessageEnum.InvalidPartNumber)
              } else {
                itemArray.push(itemPartResponse)
              }
            })
            .catch(({ message, code, description }) => {
              console.error(description, "ERROR")
              invalidPart = true
              console.log("invalid part 3")
              res.setHeader("message", description)
              res.status(code).json(message)
              return
            })
        })
        return { isPartValid: true, result: itemArray }
      }

      const validateSalesOrder = (request, response, queryOptions, responseData = {}) => {
        console.log("GET SALES ORDER BY PO".green)
        const { VWModel } = request

        return VWModel.getSalesOrderByPONum(queryOptions, true)
          .then((sales_result) => {
            let sales_count = sales_result[Object.keys(sales_result)[0]]

            if (sales_count > 0) {
              console.log("sales header duplicate")
              responseData.message = "duplicate-po"
              res.setHeader("message", "duplicate-po")
              res.status(457).json(responseData)
              exitOrder = true
              return
            }

            if (exitOrder == true) {
              return
            }
            console.log(sales_count, "SALES ORDER NOT A DUPLICATE")
          })
          .catch((err) => {
            console.error("err 1", err)
            responseData.message = "invalid-site"
            res.setHeader("message", "invalid-site")
            res.status(453).json(responseData)
            return
          })
      }

      const validateSalesInvoiceOrder = (request, response, queryOptions, responseData = {}) => {
        console.log("GET SALES INVOICE ORDER BY PO".green)

        const { VWModel } = request

        return VWModel.getSalesInvoiceOrderByPONum(queryOptions, true).then((sales_result) => {
          let sales_inv_count = sales_result[Object.keys(sales_result)[0]]

          if (sales_inv_count > 0) {
            console.log("sales invoice header duplicate")
            responseData.message = "duplicate-po"
            res.setHeader("message", "duplicate-po")
            res.status(457).json(responseData)
            exitOrder = true
            return
          }
          if (exitOrder == true) {
            return
          }
          console.log(sales_inv_count, "SALES INVENTORY NOT A DUPLICATE")
        })
      }

      // DEPENDENT ON ValidatePartNumber
      const validateOrderPO = (request, response, orderBody, userDealer, userParams, responseData = {}) => {
        console.log("GET ORDER BY PO".green)

        const { VWModel } = request
        VWModel.getOrderByPONumber(orderBody.po_number).then((orders) => {
          let repeatCustomerId = false
          orders.forEach((order) => {
            // console.log(order.customer_id, userDealer, "ORDER CUSTOMER AND DEALER")
            // console.log(orders.length, "ORDERS LENGTH")
            // console.log(orders, "ORDERS")
            if (order.customer_id === userDealer) {
              return (repeatCustomerId = true)
            }
          })

          if (orders.length > 0 && repeatCustomerId === true) {
            console.log("ERROR : Fail : Inventory Hold")
            errorInNestedHandler(ErrorMessageEnum.DuplicatePO)
            return
          } else if (orders.length > 0 && userDealer === "DISCOUNTTIRE") {
            console.log("ERROR : Fail : Inventory Hold")
            errorInNestedHandler(ErrorMessageEnum.DuplicatePO)
            return
          }

          console.log(orders.length, "ORDER PO NOT A DUPLICATE")
          getDealerProductsAndSpecs(request, response, userDealer, userParams, orderBody)
        })
      }

      // DEPENDENT ON VALIDATEORDERPO
      const getDealerProductsAndSpecs = (
        request,
        response,
        userDealer,
        userParams,
        orderBody,
        responseData = {}
      ) => {
        console.log("GET DEALER PRODUCTS AND SPECS".green)

        const { VWModel } = request
        VWModel.getDealerProductsAndSpecifications({
          nav_customer_id: userDealer,
          userIsDTCUser: false,
          multiplier: null,
          part_number: partNums
        })
          .then((response) => {
            if (response.length === 0) {
              console.log(response.length, "response.length")
              errorInNestedHandler(ErrorMessageEnum.ProductAccessDenied)
              return
            }
            partNums.forEach((item, index) => {
              let product = response.items.find((x) => x.part_number == item.partNumber)
              if (!product) {
                errorInNestedHandler(ErrorMessageEnum.ProductAccessDenied)
                exitOrder = true
                return
              }

              let quant = item.quantity
              if (quant <= 0 || isNaN(quant)) {
                errorInNestedHandler(ErrorMessageEnum.QuantityThresholdExceeded)
                exitOrder = true
                return
              } else if (quant > product.inventory[warehouse] && item.partNumber !== "INSTALL-KIT") {
                errorInNestedHandler(ErrorMessageEnum.InsufficientInventory)
                exitOrder = true
                return
              }
            })

            if (exitOrder == true) {
              return
            }
            addPartsToCart(request, response, userParams, orderBody, userDealer)
          })
          .catch((error) => {
            console.error("Dealer product", error)
            // responseData.message = "invalid-site"
            // res.setHeader("message", "invalid-site")
            // res.status(453).json(responseData)
            errorInNestedHandler(ErrorMessageEnum.ProductAccessDenied)
            return
          })
      }

      const addPartsToCart = (request, response, userParams, orderBody, userDealer) => {
        partNums.forEach(function (item, index) {
          let quant = item.quantity

          let product = response.items.find((x) => x.part_number == item.partNumber)
          let prodID = product.id
          let cartItemFound = false

          Object.keys(userCartItems).forEach((key) => {
            if (key == prodID) {
              cartItemFound = true
              return
            }
          })

          if (cartItemFound) {
            console.log("PROD ID MATCHES CART ITEM KEY")
            userCartItems[prodID][warehouse] += quant
            userCart.items[prodID][warehouse] += quant
          } else {
            userCartItems[prodID] = {
              [warehouse]: quant
            }
            userCart.items[prodID] = {
              [warehouse]: quant
            }
          }
          // }
          // console.log(item, "CHECK ITEMS")

          partIndex = index
          getUserWithParams(request, response, partIndex, userParams, orderBody, userDealer)
        })
      }

      // DEPENDENT ON getDealerProductsAndSpecs
      const getUserWithParams = (
        request,
        response,
        index,
        userParams,
        orderBody,
        userDealer,
        responseData = {}
      ) => {
        console.log("GET USER WITH PARAMS".green)
        const { VWModel } = request
        if (index == 0) {
          VWModel.findUser(userParams).then((user) => {
            user.dealer = { nav_customer_id: userDealer }
            user.cart = userCart
            getCart(request, response, user, orderBody, userDealer)
          })
        }
      }

      // DEPENDENT ON getUserWithParams
      const getCart = (request, response, user, orderBody, userDealer, responseData = {}) => {
        // console.log(userDealer, "GET CART")
        const { VWModel } = request
        VWModel.getCartDetails({
          appSettings: request.appSettings,
          user: user
        }).then((response) => {
          user.cart = { items: userCartItems }
          user.cartQuantity = totalQuant
          user.warehouse = { key: warehouse, details: warehouseList[warehouse] }
          user.isApiOrder = true
          user.salesrep = "API"
          // console.log(user, "USER AFTER CART STUFF")
          VWModel.getDealerEmail(userDealer)
            .then((emailResult) => {
              dealerEmail = emailResult[0].profile.dealerEmail

              user.dealerEmail = dealerEmail
              user.managerEmail = managerEmail
              submitPurchase(request, response, orderBody, user)
            })
            .fail(function (err) {
              console.log("err 2", err)
              errorInNestedHandler(ErrorMessageEnum.InvalidSite)
            })
        })
      }

      // USED IN GETCart
      const submitPurchase = (request, response, orderBody, user) => {
        console.log("SUBMIT PURCHASE".green)
        const { VWModel } = request
        VWModel.submitPurchaseOrder({
          appSettings: req.appSettings,
          body: orderBody,
          user: user
        })
          .then((response) => {
            holdResponse = {
              message: "success",
              order: completeOrder
            }

            // let update = {
            //   po_number: tempPOnum,
            //   ship_to_info: {
            //     customer_name: userName,
            //     phone_number: "",
            //     store_number: body.site,
            //     company_name: "",
            //     address_1: userAddress1,
            //     address_2: typeof body.shipping.addressLine2 !== "undefined" ? body.shipping.addressLine2 : "",
            //     city: userCity,
            //     state: userState,
            //     zip: userZip,
            //     temp_po_num: tempPOnum
            //   },
            //   transaction_type: 2
            // }

            // let shippingOptions = {
            //   shipped: false,
            //   delivery_type: orderResponseBody.shipping.method,
            //   shipping_agent: orderResponseBody.shipping.ship_agent,
            //   shipping_method: orderResponseBody.shipping.method,
            //   eship_agent_service_code: orderResponseBody.shipping.eship_agent_service_code,
            //   shipping_cost: orderResponseBody.totals.shippingtotal
            //   // delivery_date: body.delivery_info.delivery_date
            // }

            holdResponse.supplierOrderNumber = response.props.web_order_number
            let startDate = new Date()
            holdResponse.deliveryDateTime = startDate

            res.status(200).json(holdResponse)
          })
          .fail(function (error) {
            console.log("ERROR : Fail : Checkout POST /", error)
            //   holdResponse.Error = error.message;
            //  holdResponse.Result = "Hold Failed";
            res.status(500).json(holdResponse)
          })
      }

      const errorInNestedHandler = (error, additionalMessage = null) => {
        console.log(error, "NESTED ERROR")
        console.log(additionalMessage, "ADDITIONAL INFO FOR ERROR")
        res.setHeader("message", ErrorCodes[error].MESSAGE)
        res.status(ErrorCodes[error].CODE).json({
          message: error,
          description: ErrorCodes[error].MESSAGE,
          additionalMessage: additionalMessage === null ? "" : additionalMessage[0]
        })
        return
      }
      const errorHandler = (error) => {
        console.log(error, "HERE IS THE ERROR")
        throw {
          message: error,
          code: ErrorCodes[error].CODE,
          description: ErrorCodes[error].MESSAGE
        }
      }

      return Promise.all([
        findCustomer(request, response, {
          nav_customer_id: userDealer,
          email: userEmail
        }),
        validatePartNumber(request, response),
        findDealer(request, response, userDealer),
        getStoreShippingInfo(request),
        validateStoreNumber(request, response, userDealer),
        validateSalesOrder(request, response, queryOptions),
        validateSalesInvoiceOrder(request, response, queryOptions),
        getWarehouse(request, response)
      ])
        .then((values) => {
          if (values[0].isCustomerValid && values[7].isWarehouseValid && values[1].isPartValid) {
            console.log("CUSTOMER VALID")
            customerShippingValidation(body, values[0], userDealer)
            getShippingRates(
              request,
              response,
              values[0].result,
              values[2].result,
              values[3].result,
              userDealer,
              userParams,
              values[7].warehouse,
              values[1].result
            )
          } else {
            console.log("ERROR IN CUSTOMER VALIDATION")
            throw new Error({
              message: ErrorMessageEnum.UserSearchFailure,
              code: ErrorCodes[ErrorMessageEnum.UserSearchFailure].CODE,
              description: ErrorCodes[ErrorMessageEnum.UserSearchFailure].MESSAGE
            })
          }
        })
        .catch(function ({ message, code, description }) {
          console.log(message, code, description, "ERROR IN PROMISE ALL")
          const ErrStack = new Error().stack
          console.error(`Error: ${description} - Please see stack trace below`)
          console.log(ErrStack)

          const responseData = {}
          responseData.message = message
          res.setHeader("message", message)
          res.status(code).json(responseData)
        })
    }

    const authentication = oauth
      .authenticate(request, response)
      .then(function (token, response) {
        const { headers } = req
        console.log("Authentication Step: Received token")
        console.log("Authentication Step: Requesting Headers", headers)

        const userId = token.client.id
        let userObj
        if (!req.body.user) {
          userObj = apiUsers.find((x) => x.id == userId)
        }
        let userDealer = req.body.user !== undefined ? req.body.user.nav_customer_id : userObj.dealer
        let userEmail = req.body.user !== undefined ? req.body.user.email : userObj.email

        userParams = { email: userEmail }
        let queryOptions = {}
        queryOptions.docNum = tempPOnum

        createOrder(request, response, userEmail, userDealer, queryOptions, userParams)
      })
      .catch(function (err) {
        console.log("ERROR OCCURRING AUTH CATCH")
        console.log("auth err", err)
        res.status(err.code || 500).json(err)
      })
    return authentication
  })

  router.post("/returnOrder", function (req, res) {
    let request = new OAuth2Server.Request(req)
    let response = new OAuth2Server.Response(res)
    let warehouseList = require("config/settings/warehouses")

    return oauth
      .authenticate(request, response)
      .then(function (token, response) {
        if (req.headers.dtrequestidentifier) {
          res.setHeader("dtRequestIdentifier", req.headers.dtrequestidentifier)
        }
        if (req.headers.dtcorrelationid) {
          res.setHeader("dtCorrelationId", req.headers.dtcorrelationid)
        }
        if (req.headers.dtsourcesystem) {
          res.setHeader("dtSourceSystem", req.headers.dtsourcesystem)
        }
        if (req.headers.dtsourcesubsystem) {
          res.setHeader("dtSourceSubsystem", req.headers.dtsourcesubsystem)
        }
        let userId = token.client.id
        let userObj = apiUsers.find((x) => x.id == userId)

        //  console.log('user obj',userObj);
        let responseData = {}
        let holdResponse = {}
        let body = req.body
        let VWModel = req.VWModel
        let tempPOnum = body.returnOrderNumber
        let origPOnum = body.originalOrderNumber
        let returnReason = body.returnReason
        let invalid_po = false
        if (tempPOnum.length !== 10) {
          invalid_po = true
        }
        if (isNaN(tempPOnum)) {
          invalid_po = true
        }
        if (invalid_po == true) {
          responseData.message = "invalid-return-number"
          res.setHeader("message", "invalid-return-number")
          res.status(463).json(responseData)
          return
        }
        invalid_po = false
        if (origPOnum.length !== 10) {
          invalid_po = true
        }
        if (isNaN(origPOnum)) {
          invalid_po = true
        }
        if (invalid_po == true) {
          responseData.message = "invalid-po-number"
          res.setHeader("message", "invalid-po-number")
          res.status(456).json(responseData)
          return
        }

        let partNums = body.product
        let warehouse = ""
        let userCart = { items: {} }
        let userCartItems = {}
        let userParams = { email: userObj.email }
        let totalQuant = 0
        let firstName = ""
        let lastName = ""
        if (body.shipping.name) {
          let nameArr = body.shipping.name.split(" ")
          firstName = nameArr[0]
          nameArr.shift()
          lastName = nameArr.join(" ")
        }
        let ship_agent = body.shipping.returnMethod
        if (body.shipping.returnMethod == "3RD PARTY") ship_agent = "FEDEX"
        let orderBody = {
          po_number: tempPOnum,
          shipping: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            postalcode:
              body.shipping.zip.base || triggerServerResponse(response, ErrorMessageEnum.InvalidShippingInfo),
            address_1:
              body.shipping.addressLine1 ||
              triggerServerResponse(response, ErrorMessageEnum.InvalidShippingInfo),
            address_2: typeof body.shipping.addressLine2 !== "undefined" ? body.shipping.addressLine2 : "",
            city: body.shipping.city || triggerServerResponse(response, ErrorMessageEnum.InvalidShippingInfo),
            state:
              body.shipping.state || triggerServerResponse(response, ErrorMessageEnum.InvalidShippingInfo),
            store_number: body.site,
            method: body.shipping.returnMethod,
            ship_agent: ship_agent,
            return_email: body.shipping.emailAddress,
            original_order_num: body.originalOrderNumber,
            return_reason: body.returnReason
          })
        }
        /*  VWModel.getSalesOrderNums().then(function(sales_result) {
            let orig_po_found = false;
            Object.keys(sales_result).forEach(function(sales_row) {
              
              if ((body.originalOrderNumber == sales_result[sales_row].docNum) && (sales_result[sales_row].docType == 1)) 
              {
                orig_po_found = true;
                
              }
              });
              if (orig_po_found == false) {

              console.log('orig po not found');
                responseData.message = "invalid-po-number-mssql";
                res.setHeader('message', 'invalid-po-number-mssql');
                res.status( 456 ).json( responseData );
                return;
              }
            }); */
        let queryOptions = {}
        queryOptions.docNum = tempPOnum
        VWModel.getSalesOrderByPONum(queryOptions, true).then(function (sales_result) {
          console.log("api sales order result", sales_result)
          console.log("api sales order result value", sales_result[Object.keys(sales_result)[0]])
          let sales_count = sales_result[Object.keys(sales_result)[0]]
          //sales_result[Object.keys(sales_result)[0]];
          if (sales_count > 0) {
            console.log("dup return po ms sql")
            responseData.message = "duplicate-return"
            res.setHeader("message", "duplicate-return")
            res.status(464).json(responseData)
            return
          }

          if (exitOrder == true) {
            return
          }
        })

        /*

            VWModel.getSalesOrderNums().then(function(sales_result) {
              console.log('sales header search');
                
              Object.keys(sales_result).forEach(function(sales_row) {
                
                if ((tempPOnum == sales_result[sales_row].docNum) && (sales_result[sales_row].docType == 5)) 
                {
                  console.log('dup return po ms sql');
                  responseData.message = "duplicate-return";
                  res.setHeader('message', 'duplicate-return');
                  res.status( 464 ).json( responseData );
                  return;
                  
                }
                });
                
              });
          */
        let loc_code = 11
        warehouse = "AL"
        VWModel.getShipInfoByStoreNum(body.site)
          .then(function (result) {
            loc_code = result[0].shipping_config.defaultLocationCode

            if (loc_code == "70" || loc_code == "11" || loc_code == "85") {
              loc_code = "11"
            } else {
              if (loc_code == "50" || loc_code == "55" || loc_code == "80") loc_code = "02"
              Object.keys(warehouseList).forEach(function (item) {
                if (warehouseList[item].locationCode == loc_code) {
                  warehouse = item
                }
              })
            }
            //console.log('loc code',loc_code);
            // console.log('warehouse result',warehouse);
            VWModel.getOrderByPONumber(orderBody.po_number).then(function (orders) {
              if (orders.length > 0) {
                console.log("ERROR : Fail : Inventory Hold")
                responseData.message = "duplicate-return"
                res.setHeader("message", "duplicate-return")
                res.status(464).json(responseData)
                return
              }
              let user = {}
              VWModel.getDealerProductsAndSpecifications({
                nav_customer_id: "DISCOUNTTIRE",
                userIsDTCUser: false,
                multiplier: null,
                part_number: partNums
              }).then(function (response) {
                partNums.forEach(function (item, index) {
                  if (!item.partNumber || item.partNumber == "") {
                    responseData.message = "invalid-part-number"
                    res.setHeader("message", "invalid-part-number")
                    res.status(454).json(responseData)
                    return
                  }
                  let product = response.items.find((x) => x.part_number == item.partNumber)
                  if (!product) {
                    responseData.message = "invalid-part-number"
                    res.setHeader("message", "invalid-part-number")

                    res.status(454).json(responseData)
                  }
                  let prodID = product.id
                  let quant = item.quantity

                  userCartItems[prodID] = {
                    [warehouse]: quant
                  }
                  userCart.items[prodID] = {
                    [warehouse]: quant
                  }
                  if (index == 0) {
                    VWModel.findUser(userParams).then(function (user) {
                      user.dealer = { nav_customer_id: "DISCOUNTTIRE" }
                      user.cart = userCart
                      VWModel.getCartDetails({
                        appSettings: req.appSettings,
                        user: user
                      }).then(function (response) {
                        let returnStatus = "PENDING APPROVAL"
                        if (
                          body.returnReason == "CUSTOMER CANCELLATION" ||
                          body.returnReason == "WRONG FITMENT"
                        )
                          returnStatus = "APPROVED"
                        user.cart = { items: userCartItems }
                        user.cartQuantity = totalQuant
                        user.warehouses = warehouseList
                        user.warehouse = {
                          key: warehouse,
                          details: warehouseList[warehouse]
                        }
                        user.isApiOrder = true
                        user.isReturn = true
                        user.email = body.shipping.emailAddress
                        user.returnStatus = returnStatus
                        VWModel.submitPurchaseOrder({
                          appSettings: req.appSettings,
                          body: orderBody,
                          user: user
                        })
                          .then(function (response) {
                            holdResponse = {
                              message: "success"
                            }
                            let update = {
                              po_number: tempPOnum,
                              ship_to_info: {
                                customer_name: body.shipping.name,
                                phone_number: "",
                                store_number: "",
                                company_name: "",
                                address_1:
                                  body.shipping.addressLine1 ||
                                  triggerServerResponse(response, ErrorMessageEnum.InvalidShippingInfo),
                                address_2:
                                  typeof body.shipping.addressLine2 !== "undefined"
                                    ? body.shipping.addressLine2
                                    : "",
                                city:
                                  body.shipping.city ||
                                  triggerServerResponse(response, ErrorMessageEnum.InvalidShippingInfo),
                                state:
                                  body.shipping.state ||
                                  triggerServerResponse(response, ErrorMessageEnum.InvalidShippingInfo),
                                zip:
                                  body.shipping.zip.base ||
                                  triggerServerResponse(response, ErrorMessageEnum.InvalidShippingInfo),
                                temp_po_num: tempPOnum
                              },
                              transaction_type: 2
                            }
                            let saleIds = []
                            let ship_method = ""
                            let ship_code = ""
                            let ship_agent = ""
                            if (body.shipping.returnMethod == "LOCAL") {
                              ship_method = "return"
                              ship_code = "return"
                              ship_agent = "LOCAL"
                            } else if (body.shipping.returnMethod == "3RD PARTY") {
                              ship_method = "return"
                              ship_code = "return"
                              ship_agent = "FEDEX"
                            }
                            let shipping_options = {
                              shipped: false,
                              delivery_type: "return",
                              shipping_agent: ship_agent,
                              shipping_method: ship_method,
                              eship_agent_service_code: ship_code,
                              freight_handling: body.shipping.freightHandling,
                              return_to: loc_code,
                              return_email: body.shipping.emailAddress
                            }

                            holdResponse.returnStatus = returnStatus
                            if (returnStatus == "APPROVED") {
                              holdResponse.returnAuthorizationNumber = response.props.web_order_number
                              holdResponse.returnLocation = loc_code
                            }
                            let startDate = new Date()
                            startDate.setDate(startDate.getDate() + 7)
                            // holdResponse.deliveryDateTime = startDate;
                            VWModel.getOrderByPONumber(tempPOnum).then(function (orders) {
                              let order = orders.pop()
                              update.id = order.id
                              order.sale_items.forEach(function (sale) {
                                saleIds.push(sale.id)
                              })
                              let webOrderNum = order.web_order_number
                              //  update.webOrderNum = webOrderNum;
                              shipping_options.return_reason = body.returnReason
                              shipping_options.original_order_num = body.originalOrderNumber
                              saleIds.forEach(function (saleId) {
                                let updateSaleitem = {
                                  id: saleId,
                                  shipping_options: shipping_options
                                }
                                VWModel.updateSaleItem(updateSaleitem).then(function (response) {
                                  console.log("update sale items", response)
                                })
                              })

                              VWModel.updateSale(update).then(function (response) {
                                update.webOrderNum = webOrderNum
                                update.shipping_options = shipping_options
                                update.shipping_options.eship_agent_service_code =
                                  shipping_options.eship_agent_service_code
                                update.test = false
                                update.po_number = tempPOnum

                                order.ship_to_info = update.ship_to_info
                                order.customer_billing_info.customer_name = update.ship_to_info.customer_name

                                // send order email to Andrew
                                //emailController.sendOrderEmail(order, {action: "apiReturn",itemNumbers: saleIds, tempPOnum: tempPOnum, origPOnum: body.originalOrderNumber, returnReason: body.returnReason, user: {}} )
                                console.log("return assign update", update)

                                //Update MSSQL
                                VWModel.assignPO(update).then(function (response) {
                                  console.log("assign PO", response)
                                  emailController.sendOrderEmail(order, {
                                    action: "apiReturn",
                                    itemNumbers: saleIds,
                                    tempPOnum: tempPOnum,
                                    origPOnum: body.originalOrderNumber,
                                    returnReason: body.returnReason,
                                    user: {}
                                  })
                                })
                              })
                            })

                            //console.log(holdResponse);
                            res.status(200).json(holdResponse)
                          })
                          .fail(function (error) {
                            console.log("ERROR : Fail : Checkout POST /", error)
                            //   holdResponse.Error = error.message;
                            //  holdResponse.Result = "Hold Failed";
                            res.status(500).json(holdResponse)
                          })
                          .done()
                      })
                    })
                  }
                })
              })
            })
          })
          .catch(function (err) {
            responseData.message = "invalid-site"
            res.setHeader("message", "invalid-site")
            res.status(453).json(responseData)
          })
      })
      .catch(function (err) {
        console.log("auth err")
        res.status(err.code || 500).json(err)
      })
  })

  router.get("/orderStatus/:site/:po", function (req, res) {
    let request = new OAuth2Server.Request(req)
    let response = new OAuth2Server.Response(res)
    const os = require("os")

    // check free memory
    const freeMemory = os.freemem()
    // check the total memory
    const totalMemory = os.totalmem()
    console.log("free mem", freeMemory)
    console.log("total mem", totalMemory)
    console.log("process mem", process.memoryUsage())

    const getOrderStatus = (req, response, userAuthData) => {
      let responseData = {}
      let warehouseList = require("config/settings/warehouses")
      let po_found = false
      let invoiceResponse = {}

      let VWModel = req.VWModel
      console.log("before sales invoice search")

      const errorInNestedHandler = (error) => {
        console.log(error, "NESTED ERROR")
        res.setHeader("message", ErrorCodes[error].MESSAGE)
        res.status(ErrorCodes[error].CODE).json(error)
        return
      }
      const errorHandler = (error) => {
        console.log(error, "HERE IS THE ERROR")
        throw {
          message: error,
          code: ErrorCodes[error].CODE,
          description: ErrorCodes[error].MESSAGE
        }
      }

      const findCustomer = (request) => {
        const email = request.params.site
        const { VWModel } = request
        console.log(email, "EMAIL")

        return VWModel.findUser({ email: email }).then((result) => {
          console.log(result, "RESULT")
          if (result) {
            console.log("Customer validation successful.")
            return {
              isCustomerValid: true,
              result: result
            }
          }
        })
      }

      const getOrderByPONumber = (req, customerInfo) => {
        VWModel.getOrderByPONumber(req.params.po)
          .then(function (result) {
            let queryResponse = result
            let order
            // console.log(queryResponse, "SEE IF EMAIL")
            // console.log(req.params.site, "REQ EMAIL")
            // console.log(queryResponse[0].customer_info, "CUSTOMER INFO")

            if (customerInfo === "DISCOUNTTIRE") {
              let invalid_po = false
              if (req.params.po.length !== 10) {
                invalid_po = true
              }
              if (isNaN(req.params.po)) {
                invalid_po = true
              }
              if (invalid_po == true) {
                console.log("invalid po")
                responseData.message = "invalid-po-number"
                res.setHeader("message", "invalid-po-number")
                res.status(456).json(responseData)
                return
              }
              if (queryResponse[0].customer_billing_info.store_number != req.params.site) {
                errorHandler(ErrorMessageEnum.PODoesNotMatchSite)
              }
            } else if (queryResponse[0].customer_info.email !== req.params.site) {
              errorHandler(ErrorMessageEnum.POEmailDoesNotMatch)
            }

            // console.log("order po length", order.length)
            if (typeof queryResponse !== "undefined" && queryResponse.length > 0) {
              order = queryResponse.pop()
              console.log("order   po", order)
            }

            // order = response.pop();
            if (typeof queryResponse == "undefined" || typeof order == "undefined" || order.length === 0) {
              let invalid_po = true

              console.log("after sales invoice search")
              /*  let updateResponse = '';
              res.setHeader('message', 'invalid-po-number');
              updateResponse.message = "invalid-po-number";
              res.status( 456 ).json(updateResponse); */
              //  return;
            }
            let response = {
              message: "",
              orderType: "",
              status: "",
              statusDateTime: ""
            }
            if (req.params.po) {
              let web_order_number = order.web_order_number
              response.status = order.status.toUpperCase() // shipped for nonlocal, delivered for local, approved/rejected/pending for returns
              if (web_order_number.startsWith("WR") || web_order_number.startsWith("VR")) {
                response.orderType = "RETURN"
                if (order.status == "approved" || order.status == "APPROVED") {
                  response.returnAuthorizationNumber = web_order_number
                  order.sale_items.forEach(function (item) {
                    let localShip = false
                    if (item.shipping_options.shipping_agent === "LOCAL") {
                      localShip = true
                    }

                    if (item.shipping_options.return_to) {
                      response.supplierLocation = item.shipping_options.return_to
                    }

                    if (item.shipping_options.tracking_number) {
                      response.trackingNumber.push(item.shipping_options.tracking_number)
                    }

                    if (item.shipping_options.shipped == true) {
                      if (localShip) {
                        response.status = "DELIVERED"
                      } else {
                        response.status = "SHIPPED"
                      }
                    }
                  })
                } else if (order.status == "rejected" || order.status == "REJECTED") {
                  response.rejectionReason = order.payment.return_notes
                }
              } else {
                response.orderType = "PURCHASE"
                let item = order.sale_items[0]
                let localShip = false
                if (item.shipping_options.shipping_agent === "LOCAL") {
                  localShip = true
                }

                if (item.fulfilment_location && warehouseList[item.fulfilment_location.code]) {
                  response.supplierLocation = warehouseList[item.fulfilment_location.code].locationCode
                }
                if (item.shipping_options.shipping_agent) {
                  response.carrier = item.shipping_options.shipping_agent
                }
                if (item.shipping_options.tracking_number && localShip == false) {
                  response.trackingNumber = item.shipping_options.tracking_number

                  // change to response.deliveredAt date/time for LOCAL (may still need to be stored in tracking number field)
                }
                if (order.status == "submitted" || order.status == "SUBMITTED") response.status = "PROCESSING"
                if (item.shipping_options.shipped == true) {
                  if (localShip) {
                    response.status = "DELIVERED"
                  } else {
                    response.status = "SHIPPED"
                  }
                  //temporary fix to return FedEx as a default if shipped and carrier is empty in db
                  if (item.shipping_options.shipping_agent == "") {
                    response.carrier = "FEDEX"
                  }
                }
              }
              response.message = "success"
              if (order.status == "pending") response.status = "PENDING APPROVAL"

              response.statusDateTime = order.updated //last updated

              res.status(200).json(response)
              return
            } else if (invalid_po == true) {
              let queryOptions = {}
              console.log("PO not in postgres")
              queryOptions.docNum = req.params.po

              let invoiceTrackingResponse = {
                message: "",
                orderType: "",
                status: "",
                statusDateTime: "",
                supplierLocation: "",
                carrier: "",
                trackingNumber: ""
              }
              let invoiceNoTrackingResponse = {
                message: "",
                orderType: "",
                status: "",
                statusDateTime: "",
                supplierLocation: "",
                carrier: ""
              }
              let checkTable2 = false

              VWModel.getSalesOrderByPONum(queryOptions, true)
                .then(function (count_result) {
                  console.log("api sales invoice order result", count_result)

                  console.log(count_result, "SALES RESULT")
                  if (count_result[""] > 0) {
                    console.log("Sales record found table 1")

                    VWModel.getSalesOrderByPONum(queryOptions).then(function (sales_result) {
                      if (sales_result["No_"].length > 0) {
                        if (sales_result["Package Tracking No_"].length === 0) {
                          console.log("IN NO TRACKING")
                          po_found = true
                          invoiceNoTrackingResponse.message = "success"
                          invoiceNoTrackingResponse.orderType = "PURCHASE"
                          invoiceNoTrackingResponse.status = "PROCESSING"
                          invoiceNoTrackingResponse.statusDateTime = sales_result["Order Date"]
                          invoiceNoTrackingResponse.supplierLocation = sales_result["Location Code"]
                          invoiceNoTrackingResponse.carrier = sales_result["Shipping Agent Code"]
                          res.status(200).json(invoiceNoTrackingResponse)
                          return
                        } else {
                          console.log("IN TRACKING")
                          po_found = true
                          invoiceTrackingResponse.message = "success"
                          invoiceTrackingResponse.orderType = "PURCHASE"
                          invoiceTrackingResponse.status = "SHIPPED"
                          invoiceTrackingResponse.statusDateTime = sales_result["Order Date"]
                          invoiceTrackingResponse.supplierLocation = sales_result["Location Code"]
                          invoiceTrackingResponse.carrier = sales_result["Shipping Agent Code"]
                          invoiceTrackingResponse.trackingNumber = sales_result["Package Tracking No_"]

                          res.status(200).json(invoiceTrackingResponse)
                          return
                        }
                      } else {
                        checkTable2 = true
                        console.log("TABLE 1 NO RESULT, CHECK TABLE 2")
                      }
                    })
                  } else {
                    console.log("CHECK TABLE 2")
                    checkTable2 = true
                  }

                  if (checkTable2 === true) {
                    VWModel.getSalesInvoiceOrderByPONum(queryOptions, true).then(function (table_result) {
                      if (table_result[""] > 0) {
                        VWModel.getSalesInvoiceOrderByPONum(queryOptions).then(function (result) {
                          console.log(result, "TABLE 2 RESULT")

                          if (result["Package Tracking No_"].length === 0) {
                            // console.log("FOUND IN TABLE 2 WITH NO TRACKING")
                            invoiceNoTrackingResponse.message = "success"
                            invoiceNoTrackingResponse.orderType = "PURCHASE"
                            invoiceNoTrackingResponse.status = "PROCESSING"
                            invoiceNoTrackingResponse.statusDateTime = result["Posting Date"]
                            invoiceNoTrackingResponse.supplierLocation = result["Location Code"]
                            invoiceNoTrackingResponse.carrier = result["Shipping Agent Code"]
                            res.status(200).json(invoiceNoTrackingResponse)
                            return
                          }

                          if (req.params.po == result["External Document No_"]) {
                            // console.log("TABLE 2 RETURNING SHIPPING")
                            po_found = true
                            invoiceTrackingResponse.message = "success"
                            invoiceTrackingResponse.orderType = "PURCHASE"
                            invoiceTrackingResponse.status = "SHIPPED"
                            invoiceTrackingResponse.statusDateTime = result["Posting Date"]
                            invoiceTrackingResponse.supplierLocation = result["Location Code"]
                            invoiceTrackingResponse.carrier = result["Shipping Agent Code"]
                            invoiceTrackingResponse.trackingNumber = result["Package Tracking No_"]

                            res.status(200).json(invoiceTrackingResponse)
                            return
                          } else {
                            console.log("INVALID PO TABLE 2 PO DOES NOT MATCH")
                            let updateResponse = {}
                            res.setHeader("message", "invalid-po-number")
                            updateResponse.message = "invalid-po-number"
                            res.status(456).json(updateResponse)
                            return
                          }
                        })
                      } else {
                        console.log("TABLE2 PO NOT FOUND")
                        let updateResponse = {}
                        res.setHeader("message", "invalid-po-number")
                        updateResponse.message = "invalid-po-number"
                        res.status(456).json(updateResponse)
                        return
                      }
                    })
                  }
                })
                .catch(function (err) {
                  let updateResponse = {}
                  console.error(err, "invalid po error")
                  res.setHeader("message", "invalid-po-number")
                  updateResponse.message = "invalid-po-number"
                  res.status(456).json(updateResponse)
                  return
                })
                .fail(function (error) {
                  console.log("sales invoice err", error)
                  let updateResponse = {}
                  res.setHeader("message", "invalid-po-number")
                  updateResponse.message = "invalid-po-number"
                  res.status(456).json(updateResponse)
                  return
                })
              console.log("after invoice search")
            }
          })
          .catch(function (err) {
            console.log("auth err", err)
            res.status(err.code || 500).json(err)
          })
      }

      let DTCFunction = userAuthData === "DISCOUNTTIRE" ? true : false

      return Promise.all([findCustomer(req)])
        .then((values) => {
          // console.log(values[0].result, "CUSTOMER RESULT CHECK FOR IF THEY HAVE PO")
          if (values[0].isCustomerValid && DTCFunction === false) {
            console.log("CUSTOMER VALID")
            getOrderByPONumber(req, values[0].result)
          } else {
            console.log("ERROR IN CUSTOMER VALIDATION")
            throw new Error({
              message: ErrorMessageEnum.UserSearchFailure,
              code: ErrorCodes[ErrorMessageEnum.UserSearchFailure].CODE,
              description: ErrorCodes[ErrorMessageEnum.UserSearchFailure].MESSAGE
            })
          }
        })
        .catch(function ({ message }) {
          if (DTCFunction === true) {
            getOrderByPONumber(req, userAuthData)
          } else {
            console.log(message, "ERROR IN PROMISE ALL")
            const ErrStack = new Error().stack
            console.error(
              `Error: ${
                ErrorCodes[ErrorMessageEnum.UserSearchFailure].MESSAGE
              } - Please see stack trace below`
            )
            console.log(ErrStack)

            const responseData = {}
            responseData.message = ErrorMessageEnum.UserSearchFailure
            res.setHeader("message", ErrorMessageEnum.UserSearchFailure)
            res.status(ErrorCodes[ErrorMessageEnum.UserSearchFailure].CODE).json(responseData)
            return
          }
        })
    }
    const authentication = oauth
      .authenticate(request, response)
      .then(function (token, response) {
        const userId = token.client.id

        console.log(userId, "USER ID")
        // Need to update to query user in DB instead of hard coded user JSON
        const userData = apiUsers.find((_apiUser) => _apiUser.id === userId)
        console.log(userData, "USER ID")

        const userDealerData = userData.dealer || DealersEnum.VISIONWHEEL
        console.log(userDealerData, "USER DEALER DATA")
        getOrderStatus(req, response, userDealerData)
      })
      .catch(function (err) {
        console.log("ERROR OCCURRING AUTH CATCH")
        console.log("auth err", err)
        res.status(err.code || 500).json(err)
      })
    return authentication
  })

  router.post("/searchParts", function (req, res) {
    checkMemoryStatistics()
    let request = new OAuth2Server.Request(req)
    let response = new OAuth2Server.Response(res)

    const _warehouseList = require("config/settings/warehouses")
    const warehouseListByCode = {}
    const localesList = ["US", "CA"]

    Object.keys(_warehouseList).forEach((key) => {
      warehouseListByCode[_warehouseList[key].locationCode.toString()] = {
        state: key,
        locale: _warehouseList[key].locale.toString()
      }
    })

    /**
     * Validates credentials and searchs parts based off parameters passed in API
     * @param {Object} request the Request object that contains request specific functions and data
     * @param {object} request.VWModel the Visionwheel Model that contains the
     * findUser model which extracts user data for validation
     * @param {object} request.body the Request body that contains the post request information
     * @param {Object} response the Response object that contains response specific functions
     * @param {Object} response.setHeader setHeader function attached to response prototype which
     *  sets Header information in the server response
     * @param {Object} response.status status function attached to response prototype which
     *  sets server status information in the server response
     * @param {Object} response.json json function attached to response prototype which
     *  sets passes json data in the server response
     * @returns {void}
     */

    const validateCredentialsAndSearchParts = (request, response, userDealerData) => {
      /**
       * Step 1: Validate Customer Data via validateCustomer function
       * @typedef {Object} CustomerData
       * @property {boolean} isCustomerValid - is customer data valid
       * @property {string} locale - locale value is either "US" or "CAN"
       * @property {object[]} locationsByLocale - list of warehouse locations for validation check
       *
       * @param {Object} request the Request object that contains request specific functions and data
       * @param {object} request.VWModel the Visionwheel Model that contains the
       * findUser model which extracts user data for validation
       * @param {object} request.body the Request body that contains the post request information
       * @param {Object} response the Response object that contains response specific functions
       * @param {Object} response.setHeader setHeader function attached to response prototype which
       *  sets Header information in the server response
       * @param {Object} response.status status function attached to response prototype which
       *  sets server status information in the server response
       * @param {Object} response.json json function attached to response prototype which
       *  sets passes json data in the server response
       * @return {CustomerData}
       */

      const validateCustomer = (_request, _response) => {
        const { VWModel, body } = _request
        console.log(body, "BODY IN VALIDATE CUSTOMER")
        return VWModel.findUser({ email: body.user.email })
          .then(function ({ country }) {
            if (body.supplierName && country && body.supplierName === SupplierEnum.VISIONWHEEL) {
              console.log("Status: Customer validation successful.")
              const userLocale = country.slice(0, 2).toUpperCase()
              const warehouseListByLocale = userLocale === "CA" ? { US: [], CA: [] } : { US: [] }
              Object.keys(_warehouseList).forEach((key) => {
                if (userLocale === "CA") {
                  warehouseListByLocale[_warehouseList[key].locale].push(_warehouseList[key].locationCode)
                } else if (_warehouseList[key].locale === "US") {
                  warehouseListByLocale["US"].push(_warehouseList[key].locationCode)
                }
              })
              return {
                isCustomerValid: true,
                locale: userLocale || "US",
                locationsByLocale: warehouseListByLocale
              }
            } else {
              return {
                isCustomerValid: false
              }
            }
          })
          .catch(function (error) {
            triggerServerResponse(res, ErrorMessageEnum.UserSearchFailure, error)
            return
          })
      }

      /**
       * Step 2: Validate Store Number information via validateStoreNumber function
       * @typedef {Object} StoreData
       * @property {boolean} isStoreValid - is store data valid
       *
       * @param {string} userDealerData is a value that confirms if store is in correct scope of api use
       * @param {Object} request the Request object that contains request specific functions and data
       * @param {object} request.VWModel the Visionwheel Model that contains the
       * findUser model which extracts user data for validation
       * @param {object} request.body the Request body that contains the post request information
       * @param {Object} response the Response object that contains response specific functions
       * @param {Object} response.setHeader setHeader function attached to response prototype which
       *  sets Header information in the server response
       * @param {Object} response.status status function attached to response prototype which
       *  sets server status information in the server response
       * @param {Object} response.json json function attached to response prototype which
       *  sets passes json data in the server response
       * @return {StoreData}
       */

      const validateStoreNumber = (_request, _response, userDealerData) => {
        const { VWModel, body } = _request
        if (userDealerData === DealersEnum.DISCOUNTTIRE) {
          return VWModel.checkStoreNumber(body.site, userDealerData)
            .then(function (result) {
              let storeCount = result[0].count
              if (storeCount === 0) {
                throw new Error(ErrorMessageEnum.InvalidSite)
              } else {
                console.log("Status: Store validation successful.")
                return { isStoreValid: true }
              }
            })
            .catch(function (error) {
              triggerServerResponse(res, ErrorMessageEnum.InvalidSite, error)
            })
        } else {
          return { isStoreValid: false }
        }
      }

      /**
       * Step 3: query products and validate quantity via searchProducts function
       *
       * @param {string} locale is a string value that locale of customer
       * @param {object[]} warehouseListByLocale is an array of warehouse location data for location based filtering
       * @param {Object} request the Request object that contains request specific functions and data
       * @param {object} request.VWModel the Visionwheel Model that contains the
       * findUser model which extracts user data for validation
       * @param {object} request.body the Request body that contains the post request information
       * @param {Object} response the Response object that contains response specific functions
       * @param {Object} response.setHeader setHeader function attached to response prototype which
       *  sets Header information in the server response
       * @param {Object} response.status status function attached to response prototype which
       *  sets server status information in the server response
       * @param {Object} response.json json function attached to response prototype which
       *  sets passes json data in the server response
       * @return {void}
       */

      const searchProducts = (request, response, locale = "US", warehouseListByLocale) => {
        const {
          user,
          partType: type,
          width,
          diameter,
          min_quantity,
          locations,
          part_numbers,
          ...etc
        } = request.body
        const { query: queryParams } = request
        const { boltpattern } = etc
        const { nav_customer_id } = user
        const searchParametersKeys = Object.keys({
          user,
          type,
          width,
          diameter,
          min_quantity,
          locations,
          boltpattern,
          part_numbers
        })
        const searchParametersCheck = (searchParams) => {
          const paramCheck = searchParams.filter((key) => {
            const matchParameters = ["type", "width", "diameter", "min_quantity", "boltpattern"]
            return matchParameters.indexOf(key) >= 0
          })
          return paramCheck.length > 0 ? "success" : "failed"
        }

        if (searchParametersCheck(searchParametersKeys) === "failed") {
          throw new Error(ErrorMessageEnum.ProductSearchFailure)
        }

        const validateBoltPattern = (_boltpattern, specification) => {
          const { boltpattern1, boltpattern2 } = specification
          if (boltpattern1.indexOf(_boltpattern) >= 0 && _boltpattern.length >= 5) {
            return true
          }
          if (boltpattern2.indexOf(_boltpattern) >= 0 && _boltpattern.length >= 5) {
            return true
          }
          if (!isDefined(_boltpattern)) {
            return true
          }
          return false
        }

        const validatePartNumbers = (_partNumbers) => {
          if (typeof _partNumbers === "string" && _partNumbers !== undefined && _partNumbers !== null) {
            return [_partNumbers]
          }
          if (Array.isArray(_partNumbers) && _partNumbers.length > 0) {
            return _partNumbers
          }
          return []
        }

        const params = {
          type,
          nav_customer_id,
          // brand: "Vision",
          specifications: {
            diameter: diameter,
            width: width,
            boltpattern1: boltpattern,
            boltpattern2: boltpattern
          },
          min_quantity
        }

        const filterInventory = ({ inventory, warehouseList, locale, minQuantity = 0 }) => {
          const _results = {}
          const _filterableLocations = warehouseList[locale]

          Object.keys(inventory).forEach((location) => {
            if (_warehouseList[location] && _warehouseList[location].locationCode) {
              let locationCode = _warehouseList[location].locationCode
              const filteredLocation = _filterableLocations.indexOf(locationCode) >= 0
              if (filteredLocation && inventory[location] >= minQuantity) {
                /**
                 * old method that injected localation state vs location id
                 * _results[location] = inventory[location]
                 */
                _results[locationCode] = inventory[location]
              }
            }
          })
          if (Object.keys(_results).length > 0) {
            return _results
          } else {
            return 0
          }
        }

        const filterResultsByLocation = (results, allLocations) => {
          const products = {}
          const queriedLocations = []
          const _warehouseListByLocale = {}
          // console.log(results, "RESULTS IN FILTER BY LOCATION")

          if (!results || results.length < 1) {
            throw new Error(ErrorMessageEnum.ProductSearchFailure)
          } else {
            let _locations = !allLocations ? locations : Object.keys(warehouseListByCode)
            _locations.forEach((_location) => {
              queriedLocations.push(_location)
            })

            localesList.forEach((locale) => {
              products[locale] = {
                list: [],
                length: 0
              }
              _warehouseListByLocale[locale] =
                warehouseListByLocale[locale] && warehouseListByLocale[locale].length > 0
                  ? warehouseListByLocale[locale].filter(
                      (_locationCode) => queriedLocations.indexOf(_locationCode) >= 0
                    )
                  : []
            })
            let _localesList = locale === "US" ? ["US"] : ["CA"]
            switch (locale) {
              case "US":
                delete products["CA"]
                break
              case "CA":
                delete products["US"]
                break

              default:
                delete products["CA"]
                break
            }

            let filteredSpecifications

            if (boltpattern && part_numbers === undefined) {
              filteredSpecifications = results.filter((result) => {
                if (
                  result.specification.boltpattern1.includes(boltpattern) ||
                  result.specification.boltpattern2.includes(boltpattern)
                ) {
                  return true
                }
              })
            } else {
              filteredSpecifications = results
            }

            console.log(filteredSpecifications, "FILTERED")

            filteredSpecifications.forEach(({ inventory, specification, image, price, ...etc }) => {
              const part_number = etc.part_number ? etc.part_number : null
              const _type = etc.type ? etc.type : null
              if (!isDefined(part_number)) {
                throw new Error(ErrorMessageEnum.InvalidPartNumber)
              }

              if (
                isDefined(type, _type) &&
                isDefined(diameter, specification.diameter) &&
                isDefined(width, specification.width) &&
                isDefined(inventory)
              ) {
                _localesList.forEach((_locale) => {
                  let _inventory = filterInventory({
                    inventory,
                    warehouseList: _warehouseListByLocale,
                    locale: _locale,
                    specification,
                    minQuantity: min_quantity
                  })

                  if (_inventory !== 0) {
                    products[_locale]["list"].push({
                      part_number,
                      type: _type,
                      price,
                      currency: _locale === "US" ? "USD" : "CAD",
                      inventory: _inventory,
                      ...(queryParams && queryParams.specification ? { specification } : {}),
                      image
                    })
                    products[_locale]["length"] += 1
                  }
                })
              }
            })

            if (Object.keys(products).length > 0) {
              const responseData = {
                products: products
              }
              triggerServerResponse(res, ErrorMessageEnum.Success, null, responseData)
              return
            } else {
              throw new Error(ErrorMessageEnum.ProductSearchFailure)
            }
          }
        }

        const searchDealerItemsByLocation = (_partNumbers, _navCustomerId, allLocations) => {
          // console.log(_partNumbers, "PARTS IN SEARCH DEALER ITEMS BY LOCATION")
          return request.VWModel.getDealerItems({
            nav_customer_id: _navCustomerId,
            part_number: _partNumbers
          })
            .then((results) => {
              filterResultsByLocation(results, allLocations)
            })
            .catch((error) => {
              if (error && error.message && error.message === ErrorMessageEnum.InvalidPartNumber) {
                triggerServerResponse(res, ErrorMessageEnum.InvalidPartNumber, error)
              } else {
                triggerServerResponse(res, ErrorMessageEnum.ProductAccessDenied, error)
              }
            })
        }

        const requestItemsByType = (_params) => {
          const partNumbers = []
          console.log(_params, "PARAMS TO GET PARTS IN REQUEST BY TYPE")
          return request.VWModel.getItemsByType(_params)
            .then(function (results) {
              console.log("Status: Product query successful.")
              results.forEach(({ part_number }) => {
                partNumbers.push(part_number)
              })
              console.log(partNumbers, "PART NUMBERS IN REQUEST BY TYPE")
              return searchDealerItemsByLocation(
                partNumbers,
                nav_customer_id,
                !(locations && locations.length > 0)
              )
            })
            .catch(function (error) {
              triggerServerResponse(res, ErrorMessageEnum.ProductSearchFailure, error)
            })
        }

        const requestItemsByPartNum = (_partNumbers, _params) => {
          const { nav_customer_id } = params
          const _promises = []
          _partNumbers.forEach((_partNumber) => {
            const _promise = request.VWModel.getItemByPartNum(_partNumber)
              .then(function (result) {
                if (isDefined(result[0])) {
                  return result[0].part_number
                } else {
                  throw new Error(ErrorMessageEnum.InvalidPartNumber)
                }
              })
              .catch(function (error) {
                if (error && error.message && error.message === ErrorMessageEnum.InvalidPartNumber) {
                  triggerServerResponse(res, ErrorMessageEnum.InvalidPartNumber, error)
                } else {
                  triggerServerResponse(res, ErrorMessageEnum.ProductAccessDenied, error)
                }
              })
            _promises.push(_promise)
          })

          return Promise.all([..._promises])
            .then((part_numbers) => {
              console.log("Status: Query by Product Number successful.")
              return searchDealerItemsByLocation(
                part_numbers,
                nav_customer_id,
                !(locations && locations.length > 0)
              )
            })
            .catch((error) => {
              triggerServerResponse(res, ErrorMessageEnum.ProductSearchFailure, error)
            })
        }

        request.body["part_numbers"]
          ? requestItemsByPartNum(validatePartNumbers(part_numbers), params)
          : requestItemsByType(params)
      }

      return Promise.all([
        validateCustomer(request, response)
        // validateStoreNumber(request, response, userDealerData)
      ])
        .then((values) => {
          // if(values[0].isCustomerValid && values[1].isStoreValid ) {
          if (values[0].isCustomerValid) {
            searchProducts(request, response, values[0].locale, values[0].locationsByLocale)
          } else {
            throw new Error(ErrorMessageEnum.InvalidShippingInfo)
          }
        })
        .catch(function (error) {
          triggerServerResponse(res, ErrorMessageEnum.InvalidShippingInfo, error)
        })
    }

    const authentication = oauth
      .authenticate(request, response)
      .then(function (token) {
        const { headers } = req
        console.log("Authentication Step: Received token")
        console.log("Authentication Step: Requesting Headers", headers)
        console.log("TOKEN", token)
        // Validate existence of header properties and then set headers
        // validatePropAndRunFunction(headers, 'dtRequestIdentifier', function () { res.setHeader('dtRequestIdentifier', req.headers.dtrequestidentifier) })
        // validatePropAndRunFunction(headers, 'dtcorrelationid', function () { res.setHeader('dtcorrelationid', req.headers.dtcorrelationid) })
        // validatePropAndRunFunction(headers, 'dtSourceSystem', function () { res.setHeader('dtSourceSystem', req.headers.dtSourceSystem) })
        // validatePropAndRunFunction(headers, 'dtSourceSubsystem', function () { res.setHeader('dtSourceSubsystem', req.headers.dtSourceSubsystem) })

        const userId = token.client.id

        // Need to update to query user in DB instead of hard coded user JSON
        const userData = apiUsers.find((_apiUser) => _apiUser.id === userId)
        const userDealerData = userData.dealer || DealersEnum.VISIONWHEEL
        validateCredentialsAndSearchParts(request, response, userDealerData)
      })
      .catch(function (error) {
        triggerServerResponse(res, ErrorMessageEnum.AccessDenied, error, {
          message: error.message,
          code: error.code
        })
      })
    return authentication
  })

  router.post("/getDeliveryOptions", function (req, res) {
    // REQUEST EXAMPLE

    // {
    //   "user": {
    //     "email": "qa@visionwheel.com",
    //       "nav_customer_id":"VISIONWHEEL"
    //   },
    //   "brand": "Wheel Brand",
    //   "part_number": "141H7861GM0",
    //   "supplierLocation": "02",
    //   "quantity": 4
    // }

    let request = new OAuth2Server.Request(req)
    let response = new OAuth2Server.Response(res)
    let shippingList = getShippingInfo()
    let warehouseList = require("config/settings/warehouses")
    let warehouse

    const getDeliveryOptions = (request, response, userEmail, userDealer, userParams) => {
      const findCustomer = (request, response, customerData, responseData = {}) => {
        console.log("VALIDATING CUSTOMER")
        const { email } = customerData
        const { VWModel } = request

        return VWModel.findUser({ email: email })
          .then((result) => {
            console.log("Customer validation successful.")
            return { isCustomerValid: true, result: result }
          })
          .catch(function (err) {
            errorHandler(ErrorMessageEnum.UserSearchFailure)
          })
      }

      // Broke getWarehouse into it's own function for if in the future we aren't pulling from a json.
      const getWarehouse = (request, response) => {
        let warehouseData

        Object.keys(warehouseList).forEach((item) => {
          if (
            warehouseList[item].locationCode == request.body.supplierLocation &&
            warehouseList[item].isLive == true
          ) {
            warehouse = item
            warehouseData = warehouseList[item]
          }
        })
        if (!warehouse) {
          errorHandler(ErrorMessageEnum.InvalidSupplierLocation)
        }
        return { isWarehouseValid: true, warehouse: warehouseData }
      }

      const validatePartNumber = (request, response) => {
        console.log("VALIDATING PART")
        const { body, VWModel } = request
        let itemArray = []

        body.product.forEach((item) => {
          if (!item.partNumber || item.partNumber == "") {
            errorHandler(ErrorMessageEnum.InvalidPartNumber)
          }

          VWModel.getItemByPartNum(item.partNumber).then((itemPartResponse) => {
            console.log(itemPartResponse, "PART RESPONSE")
            if (
              typeof itemPartResponse == "undefined" ||
              itemPartResponse == null ||
              itemPartResponse.length == null ||
              itemPartResponse.length == 0
            ) {
              return errorInNestedHandler(ErrorMessageEnum.InvalidPartNumber)
            } else {
              itemArray.push(itemPartResponse)
            }
          })
        })
        return { isPartValid: true, result: itemArray }
      }

      const findDealer = (request, response, navCustomerId, responseData = {}) => {
        const { VWModel } = request

        return VWModel.findDealer({ nav_customer_id: navCustomerId }).then((result) => {
          if (result) {
            console.log("Dealer Found")
            return {
              result: result
            }
          }
        })
      }

      const getShipping = (customerInfo, warehouseInfo, dealerResult, items) => {
        // console.log(customerInfo, "CUSTOMER INFO")
        // console.log(warehouseInfo, "WAREHOUSE INFO")
        // console.log(dealerResult, "DEALER RESULT")

        console.log(dealerResult, "CHECK FOR PREPAID")
        if (dealerResult.payment_option === null || dealerResult.payment_option === undefined) {
          return errorInNestedHandler(ErrorMessageEnum.CannotObtainRates, ["Payment type is not set"])
        } else if (dealerResult.payment_option.toLowerCase() === "prepaid") {
          upsShippingHandler(customerInfo, warehouseInfo, dealerResult, items)
        } else if (dealerResult.payment_option.toLowerCase() === "third party ups") {
          if (dealerResult.ups_account) {
            upsShippingHandler(customerInfo, warehouseInfo, dealerResult, items)
          } else {
            return errorInNestedHandler(ErrorMessageEnum.CannotObtainRates, [
              "Shipping account for UPS not set."
            ])
          }
        } else if (dealerResult.payment_option.toLowerCase() === "third party fedex") {
          return errorInNestedHandler(ErrorMessageEnum.CannotObtainRates, ["FedEx currently unavailable."])
        }
      }

      const upsShippingHandler = (customerInfo, warehouseInfo, dealerResult, items) => {
        const _promises = []

        const upsToken = getUPSToken()
        upsToken.then((token) => {
          // console.log(token, "CHECK WHY ACCESS TOKEN DOESN'T WORK")
          if (token.errors) {
            console.log("IN TOKEN ERROR HANDLER")
            errorInNestedHandler(ErrorMessageEnum.CannotObtainToken, token.errors)
          }

          items.forEach((item) => {
            // console.log(item, "ITEM GOING INTO GET RATES")
            const _promise = getNegotiatedRates(
              token.access_token,
              req.body,
              warehouseInfo,
              customerInfo,
              dealerResult,
              item,
              "Shop"
            )
              .then((values) => {
                console.log(values, "MADE IT TO VALUES")
                if (values.data) {
                  // console.log(values[0], "CUSTOMER VALID")
                  // return returnShippingObject(values.data, customerInfo, warehouseInfo)
                  return values.data
                } else {
                  // console.log(values[0].error, "ERROR IN GET NEGOTIATED RATES")
                  errorInNestedHandler(ErrorMessageEnum.CannotObtainRates, values.error.errors)
                  return
                }
              })
              .catch(function (error) {
                console.log(error, "ERROR IN GET NEGOTIATED")
                return errorInNestedHandler(ErrorMessageEnum.CannotObtainRates)
              })
            _promises.push(_promise)
          })

          return Promise.all([..._promises])
            .then((values) => {
              console.log(values, "START BUILDING SHIPPING OBJECT")
              return returnShippingObject(values, customerInfo, warehouseInfo)
            })
            .catch((error) => {
              return errorInNestedHandler(ErrorMessageEnum.CannotObtainRates)
            })
        })
      }

      const returnShippingObject = (rates, customerInfo, warehouseInfo) => {
        // console.log(rates, "RATES IN RETURN SHIPPING")
        const shippingOptions = []
        let warehouseObject = {
          name: warehouseInfo.name,
          address: warehouseInfo.address,
          zip_code: warehouseInfo.postal
        }
        let customerObject = {
          first_name: customerInfo.first_name,
          last_name: customerInfo.last_name,
          address_1: customerInfo.address_1,
          address_2: customerInfo.address_2,
          zip: customerInfo.zip
        }

        const upsMethodArray = []
        let shippingListOption = {}

        rates.forEach((items) => {
          items.forEach((item) => {
            let method = {
              id: "",
              name: "",
              type: "",
              shipping_cost: "",
              worldwide_service: "",
              rate_shop: ""
            }

            if (item.Service.Code === "01" || item.Service.Code === "02" || item.Service.Code === "03") {
              shippingListOption = shippingList.delivery_options[0].methods.find((method) => {
                if (method.id === item.Service.Code) return method
              })
            } else {
              // console.log(item, "NOT ACCEPTED SHIPPING")
              return
            }

            if (shippingListOption === undefined || shippingListOption === null) {
              return
            }

            let existingMethod = upsMethodArray.find((service) => {
              if (service.id === item.Service.Code) {
                return service
              }
            })

            if (existingMethod !== undefined && existingMethod !== null) {
              let methodIndex = upsMethodArray.findIndex((service) => service.id === existingMethod.id)

              let totalCost =
                +existingMethod.shipping_cost + +item.NegotiatedRateCharges.TotalCharge.MonetaryValue
              existingMethod = {
                id: item.Service.Code,
                name: shippingListOption.name,
                type: shippingListOption.type,
                shipping_cost: totalCost.toFixed(2).toString(),
                worldwide_service: shippingListOption.worldwide_service,
                rate_shop: shippingListOption.rate_shop
              }
              upsMethodArray.splice(methodIndex, 1)
              upsMethodArray.push(existingMethod)
            } else {
              method = {
                id: item.Service.Code,
                name: shippingListOption.name,
                type: shippingListOption.type,
                shipping_cost: item.NegotiatedRateCharges.TotalCharge.MonetaryValue,
                worldwide_service: shippingListOption.worldwide_service,
                rate_shop: shippingListOption.rate_shop
              }
              upsMethodArray.push(method)
            }
            console.log(upsMethodArray, "UPS ARRAY")

            // if (item.GuaranteedDelivery !== null && item.GuaranteedDelivery !== undefined) {
            //   if (
            //     item.GuaranteedDelivery.BusinessDaysInTransit !== null &&
            //     item.GuaranteedDelivery.BusinessDaysInTransit !== undefined
            //   ) {
            //     method.business_days_in_transit = item.GuaranteedDelivery.BusinessDaysInTransit
            //   }

            //   if (
            //     item.GuaranteedDelivery.DeliveryByTime !== null &&
            //     item.GuaranteedDelivery.DeliveryByTime !== undefined
            //   ) {
            //     method.delivery_by_time = item.GuaranteedDelivery.DeliveryByTime
            //   }
            // }
          })
        })

        upsMethodArray.sort((a, b) =>
          +a.shipping_cost > +b.shipping_cost ? 1 : +b.shipping_cost > +a.shipping_cost ? -1 : 0
        )

        const upsShippingOption = {
          name: "UPS",
          id: 1,
          methods: upsMethodArray
        }
        shippingOptions.push(upsShippingOption)

        const responseObject = {
          customer: customerObject,
          warehouse: warehouseObject,
          available_shipping: shippingOptions
        }
        return res.status(200).json(responseObject)
      }

      return Promise.all([
        findCustomer(request, response, {
          nav_customer_id: userDealer,
          email: userEmail
        }),
        getWarehouse(request, response),
        validatePartNumber(request, response),
        findDealer(request, response, userDealer)
      ])
        .then((values) => {
          if (values[0].isCustomerValid && values[1].isWarehouseValid && values[2].isPartValid) {
            console.log("CUSTOMER VALID")
            // console.log(values[0].isCustomerValid, "values[0].isCustomerValid")
            // console.log(values[1].isWarehouseValid, "values[1].isWarehouseValid")
            // console.log(values[2].isPartValid, "values[2].isPartValid")
            // console.log("CUSTOMER VALID")
            getShipping(values[0].result, values[1].warehouse, values[3].result, values[2].result)
          } else {
            console.log("ERROR IN CUSTOMER VALIDATION")
            errorHandler(ErrorMessageEnum.UserSearchFailure)
          }
        })
        .catch(function ({ message, code, description }) {
          console.log(message, code, description, "ERROR IN PROMISE ALL")
          const ErrStack = new Error().stack
          console.error(`Error: ${description} - Please see stack trace below`)
          console.log(ErrStack)

          const responseData = {}
          responseData.message = message
          res.setHeader("message", message)
          res.status(code).json(responseData)
        })
    }

    const errorInNestedHandler = (error, additionalMessage = []) => {
      console.log(error, "NESTED ERROR")
      console.log(additionalMessage, "ADDITIONAL INFO FOR ERROR")
      res.setHeader("message", ErrorCodes[error].MESSAGE)
      res.status(ErrorCodes[error].CODE).json({
        message: error,
        description: ErrorCodes[error].MESSAGE,
        additionalMessage: additionalMessage.length === 0 ? "" : additionalMessage[0]
      })
      return
    }

    const errorHandler = (error, additionalMessage = null) => {
      console.log(error, "HERE IS THE ERROR")
      console.log(additionalMessage, "ADDITIONAL INFO FOR ERROR")
      throw {
        message: error,
        code: ErrorCodes[error].CODE,
        description: ErrorCodes[error].MESSAGE,
        additionalMessage: additionalMessage === null ? "" : additionalMessage[0]
      }
    }

    const validateRequest = (request, response) => {
      const { product, user, supplierLocation } = request

      if (!user || !user.email || !user.nav_customer_id) {
        return errorHandler(ErrorMessageEnum.InvalidUser)
      }
      if (!supplierLocation) {
        return errorInNestedHandler(ErrorMessageEnum.InvalidLocation)
      }
      product.forEach((item) => {
        let partNumber = item.partNumber
        let quantity = item.quantity

        // if (!brand) {
        //   return errorInNestedHandler(ErrorMessageEnum.InvalidBrandName)
        // }
        if (!partNumber) {
          return errorInNestedHandler(ErrorMessageEnum.InvalidPartNumber)
        }
        if (!quantity) {
          return errorInNestedHandler(ErrorMessageEnum.InvalidQuantity)
        }
      })
    }

    const authentication = oauth
      .authenticate(request, response)
      .then((token) => {
        if (req.headers.dtrequestidentifier) {
          res.setHeader("dtRequestIdentifier", req.headers.dtrequestidentifier)
        }
        if (req.headers.dtcorrelationid) {
          res.setHeader("dtCorrelationId", req.headers.dtcorrelationid)
        }
        if (req.headers.dtsourcesystem) {
          res.setHeader("dtSourceSystem", req.headers.dtsourcesystem)
        }
        if (req.headers.dtsourcesubsystem) {
          res.setHeader("dtSourceSubsystem", req.headers.dtsourcesubsystem)
        }

        // const userId = token.client.id

        validateRequest(req.body)

        let userDealer = req.body.user.nav_customer_id
        let userEmail = req.body.user.email
        let userParams = { email: userEmail }

        getDeliveryOptions(request, response, userEmail, userDealer, userParams)
      })
      .catch((err) => {
        console.log("ERROR OCCURRING AUTH CATCH")
        console.log("auth err", err.description || err)
        res.status(err.code || 500).json(err.message || err)
      })
    return authentication
  })
router.post("/getDealerLocations", function (req, res) {
  // REQUEST EXAMPLE

  // {
  //   "user": {
  //     "email": "qa@visionwheel.com",
  //       "nav_customer_id":"VISIONWHEEL"
  //   }
  // }

  // so we would want to send the User in order to have the US/Canada logic that they wanted
  // the locations would come from the warehouses JSON file
  // but not necessarily all the fields from that file

  let request = new OAuth2Server.Request(req)
  let response = new OAuth2Server.Response(res)
  let shippingList = getShippingInfo()
  let warehouseList = require("config/settings/warehouses")
  let warehouse
  const warehouseListByCode = {}
  const localesList = ["US", "CA"]
  Object.keys(warehouseList).forEach((key) => {
    warehouseListByCode[warehouseList[key].locationCode.toString()] = {
      state: key,
      locale: warehouseList[key].locale.toString()
    }
  })

  // MAKE SURE TO CHECK THE USER FOR LOCAL_ENABLED. YOU WILL NEED THAT TO CHECK WHICH LOCATION THEY CAN GET LOCAL SHIPPING FROM!!!!

  const getDealerLocations = (request, response, userEmail, userDealer, userParams) => {
    const findCustomer = (request, response, customerData, responseData = {}) => {
      console.log("VALIDATING CUSTOMER")
      const { email } = customerData
      const { VWModel } = request

      return VWModel.findUser({ email: email })
        .then(function (result) {
          // console.log(result, "USER RESULT")
          if (result.country) {
            console.log("Status: Customer validation successful.")
            const userLocale = result.country.slice(0, 2).toUpperCase()
            return {
              isCustomerValid: true,
              locale: userLocale || "US",
              result: result
            }
          } else {
            return {
              isCustomerValid: false
            }
          }
        })
        .catch(function (err) {
          errorHandler(ErrorMessageEnum.UserSearchFailure, err)
        })
    }

    const getWarehouse = (request, response, userLocale) => {
      const warehouseArray = []
      let warehouseObject

      Object.keys(warehouseList).forEach((key) => {
        if (
          warehouseList[key].locationCode == request.body.supplierLocation &&
          warehouseList[key].isLive == true &&
          warehouseList[key].locale == userLocale
        ) {
          // name, address, city, state, locationCode, locale, isLive
          warehouseObject = {
            name: warehouseList[key].name,
            address: warehouseList[key].address,
            city: warehouseList[key].city,
            state: warehouseList[key].state,
            locationCode: warehouseList[key].locationCode,
            locale: warehouseList[key].locale
          }
          warehouseArray.push(warehouseObject)
        } else if (
          warehouseList[key].isLive == true &&
          !request.body.supplierLocation &&
          warehouseList[key].locale == userLocale
        ) {
          warehouseObject = {
            name: warehouseList[key].name,
            address: warehouseList[key].address,
            city: warehouseList[key].city,
            state: warehouseList[key].state,
            locationCode: warehouseList[key].locationCode,
            locale: warehouseList[key].locale
          }
          warehouseArray.push(warehouseObject)
        }
      })

      if (warehouseArray.length === 0) {
        errorHandler(ErrorMessageEnum.InvalidSupplierLocation)
      }
      return res.status(200).json(warehouseArray)
    }

    return Promise.all([
      findCustomer(request, response, {
        nav_customer_id: userDealer,
        email: userEmail
      })
    ])
      .then((values) => {
        if (values[0].isCustomerValid) {
          console.log("CUSTOMER VALID")
          // console.log(values[0].locale, "LOCALE")
          // console.log(values[0].locationsByLocale, "LOCATIONS BY LOCALE")
          // console.log(values[0].result, "result of USER")

          getWarehouse(request, response, values[0].locale)
        } else {
          console.log("ERROR IN CUSTOMER VALIDATION")
          errorHandler(ErrorMessageEnum.UserSearchFailure)
        }
      })
      .catch(function ({ message, code, description }) {
        console.log(message, code, description, "ERROR IN PROMISE ALL")
        const ErrStack = new Error().stack
        console.error(`Error: ${description} - Please see stack trace below`)
        console.log(ErrStack)

        const responseData = {}
        responseData.message = message
        res.setHeader("message", message)
        res.status(code).json(responseData)
      })
  }

  const errorHandler = (error) => {
    console.log(error, "HERE IS THE ERROR")
    throw {
      message: error,
      code: ErrorCodes[error].CODE,
      description: ErrorCodes[error].MESSAGE
    }
  }

  const authentication = oauth
    .authenticate(request, response)
    .then((token) => {
      if (req.headers.dtrequestidentifier) {
        res.setHeader("dtRequestIdentifier", req.headers.dtrequestidentifier)
      }
      if (req.headers.dtcorrelationid) {
        res.setHeader("dtCorrelationId", req.headers.dtcorrelationid)
      }
      if (req.headers.dtsourcesystem) {
        res.setHeader("dtSourceSystem", req.headers.dtsourcesystem)
      }
      if (req.headers.dtsourcesubsystem) {
        res.setHeader("dtSourceSubsystem", req.headers.dtsourcesubsystem)
      }

      // const userId = token.client.id

      let userDealer = req.body.user.nav_customer_id
      let userEmail = req.body.user.email
      let userParams = { email: userEmail }

      getDealerLocations(request, response, userEmail, userDealer, userParams)
    })
    .catch((err) => {
      console.log("ERROR OCCURRING AUTH CATCH")
      console.log("auth err", err.description || err)
      res.status(err.code || 500).json(err.message || err)
    })
  return authentication
})



app.listen(443)

module.exports = {
  Router: router
}
