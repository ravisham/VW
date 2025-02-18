"use strict";
/**
 * @fileOverview This file is known as the VWModel Module.
 * This model serves as a centric location to access methods that utilize the
 * rest of the application's models. This enables us to ONLY REQUIRE ONE model
 * throughout the entire application.
 *
 * Note:
 *     Sublime Text Shortcuts
 *         Collapse All Methods:
 *             Command + K, 2
 *
 * @author Joaquin Briceno <joaquin.briceno@mirumshopper.com>
 */
let Q = require("q"),
    _ = require("underscore"),
    Moment = require("moment"),
    Helprs = require("helprs"),
    colors = require("libs/colors"),
    Taxapi = require("libs/taxapi"),
    Crypt = require("libs/crypt"),
    MSSQL = require("libs/mssql"),
    AWS = require("libs/aws"),
    debug = require("libs/buglog"),
    ShippingCalculator = require("libs/shipping_calculator"),
    Mockdata = require("libs/helpers/mockery"),
    Exectimer = require("libs/helpers/exectimer"),
    EmailController = require("controllers/email"),
    BrandsController = require("models/brands")(),
    CheckoutController = require("models/checkout"),
    ItemsController = require("models/items")(),
    ProductsController = require("models/products")(),
    Generic = require("models/generic"),
    Brand = require("models/public/brand"),
    Item = require("models/public/item"),
    Oauth2 = require("models/oauth2"),
    Product = require("models/public/product"),
    ProductList = require("models/public/product_list"),
    Sale = require("models/sales/sale"),
    SaleItem = require("models/sales/sale_item"),
    Salesrep = require("models/sales/salesrep"),
    User = require("models/membership/user"),
    Login = require("models/membership/login"),
    Dealer = require("models/membership/dealer"),
    log = debug("models", "vwmodel"),
    warehousesJSON = require("../config/settings/warehouses"),
    NodeCache = require("node-cache");

let cache = new NodeCache({ stdTTL: 100 });

require("clarify");
let start;

/**
 * The `VWModelObject` containing the module logic and public accessible methods.
 * This is what being exported as the module logic. Any methods inside this object
 * are accessible externally. Any methods/functions outside of this object are meant to
 * be accessible internally.
 * @exports VWModel
 */
let VWModelObject = {
  /**
   *
   */
  getAccessToken: (id) => {
    let deferred = Q.defer()
    Oauth2.getAccessToken(id).then(function (response) {
      deferred.resolve(response)
      console.log("GET TOKEN RESPONSE", response)
    })
    return deferred.promise
  },
  getClient: (clientId, clientSecret) => {
    let deferred = Q.defer()
    Oauth2.getClient(clientId, clientSecret).then(function (response) {
      deferred.resolve(response)
      console.log("GET TOKEN RESPONSE", response)
    })
    return deferred.promise
  },
  getRefreshToken: (bearerToken) => {
    let deferred = Q.defer()
    Oauth2.getRefreshToken(bearerToken).then(function (response) {
      deferred.resolve(response)
      console.log("GET TOKEN RESPONSE", response)
    })
    return deferred.promise
  },

  getUser: (username, password) => {
    let deferred = Q.defer()
    Oauth2.getUser(username, password).then(function (response) {
      deferred.resolve(response)
      console.log("GET TOKEN RESPONSE", response)
    })
    return deferred.promise
  },

  saveAccessToken: (token, client, user) => {
    let deferred = Q.defer()
    Oauth2.saveAccessToken(token, client, user).then(function (response) {
      deferred.resolve(response)
      console.log("GET TOKEN RESPONSE: ", response)
    })
    return deferred.promise
  },

  getPopularItemsFromDealerItems: (dealerItems) => {
    //pass in the dleaer spesific items
    // get the popular items (items referenced in saleitems)
    return ItemsController.getPopularItems().then((popularItems) => {
      //create hash for xref and price on item id
      let dealerHash = dealerItems.reduce((acc, item) => {
        acc[item.id] = { xref: item.xref, price: item.price }
        return acc
      }, {})
      // add price and xref to popular items
      popularItems = popularItems
        //filter out popular item that the dealer doesnt have access to
        .filter((item) => {
          return dealerHash[item.id]
        })
        // return items with prices and xrefs
        .map((item) => {
          item.xref = dealerHash[item.id].xref
          item.price = dealerHash[item.id].price
          return item
        })
      //return a sorted object
      return {
        wheels: popularItems.filter((item) => {
          return item.type == "wheel"
        }),
        tires: popularItems.filter((item) => {
          return item.type == "tire"
        }),
        accessories: popularItems.filter((item) => {
          return item.type == "accessory"
        })
      }
    })
  },

  /**
   *
   */
  addToCart: function (parameters, options) {
    let deferred = Q.defer()
    let appSettings = parameters.appSettings
    let body = parameters.body
    let user = parameters.user
    let Checkout = new CheckoutController({
      appSettings: appSettings,
      user: user
    })
    Exectimer.time("addToCart()")
    Checkout.addToCart({
      id: body.id,
      locations: body.locations
    })
      .then(function (response) {
        log(
          Exectimer.timeEnd("addToCart()", {
            methodSuccess: true
          })
        )
        deferred.resolve(response)
      })
      .catch(function (error) {
        log(
          Exectimer.timeEnd("addToCart()", {
            methodSuccess: false
          })
        )
        deferred.reject(error)
      })
    return deferred.promise
  },

  /**
   *
   */
  removeFromCart: function (parameters, options) {
    let deferred = Q.defer()
    let appSettings = parameters.appSettings
    let body = parameters.body
    let id = parameters.id
    let user = parameters.user
    let Checkout = new CheckoutController({
      appSettings: appSettings,
      user: user
    })
    Exectimer.time("removeFromCart()")
    Checkout.removeFromCart({
      id: id,
      location: body.location
    })
      .then(function (response) {
        log(
          Exectimer.timeEnd("removeFromCart()", {
            methodSuccess: true
          })
        )
        deferred.resolve(response)
      })
      .catch(function (error) {
        log(
          Exectimer.timeEnd("removeFromCart()", {
            methodSuccess: false
          })
        )
        deferred.reject(error)
      })
    return deferred.promise
  },

  /**
   *
   */
  updateCartQuantity: function (appSettings, user, productId, locationKey, quantity) {
    let Checkout = new CheckoutController({
      appSettings: appSettings,
      user: user
    })
    return Checkout.updateCartQty({ id: productId, location: locationKey, qty: quantity })
  },
  // removeFromCart: function(appSettings, user, productId, locationKey) {
  //     let Checkout = new CheckoutController({
  //         appSettings: appSettings,
  //         user: user
  //     });
  //     return Checkout.removeFromCart({id:productId, location:locationKey});
  // },

  /**
   *
   */
  getBrands: function () {
    let deferred = Q.defer()
    BrandsController.getBrands()
      .then(function (brands) {
        deferred.resolve(brands)
      })
      .catch(function (error) {
        deferred.reject(error)
      })
    return deferred.promise
  },

  /**
   *
   */
  getCartDetails: function (parameters, options) {
    let deferred = Q.defer()
    let appSettings = parameters.appSettings
    let user = parameters.user
    let Checkout = new CheckoutController({
      appSettings: appSettings,
      user: user
    })
    Exectimer.time("getCartDetails()")
    Checkout.getCartDetailsAndSubtotal()
      .then(function (response) {
        log(
          Exectimer.timeEnd("getCartDetails()", {
            methodSuccess: true
          })
        )
        deferred.resolve(response)
      })
      .catch(function (error) {
        log(
          Exectimer.timeEnd("getCartDetails()", {
            methodSuccess: false
          })
        )
        deferred.reject(error)
      })
    return deferred.promise
  },

  /**
   *
   */
  getCartTotals: function (parameters, options) {
    let deferred = Q.defer()
    let appSettings = parameters.appSettings
    let body = parameters.body
    let user = parameters.user
    let po_number = body.po_number
    let shipping = body.shipping
    let token = body.token
    let warehouses = body.warehouses
    let Checkout = new CheckoutController({
      appSettings: appSettings,
      user: user
    })
    Exectimer.time("getCartTotals()")
    Checkout.getCartTotals({
      po_number: po_number,
      shipping: shipping,
      token: token,
      warehouses: warehouses
    })
      .then(function (response) {
        log(
          Exectimer.timeEnd("getCartTotals()", {
            methodSuccess: true
          })
        )
        deferred.resolve(response)
      })
      .catch(function (error) {
        log(
          Exectimer.timeEnd("getCartTotals()", {
            methodSuccess: false
          })
        )
        deferred.reject(error)
      })
    return deferred.promise
  },

  /**
   *
   */
  getDealerItems: function (parameters, options) {
    let start = new Date().getTime()
    let deferred = Q.defer()
    let nav_customer_id = parameters.nav_customer_id
    let part_number = parameters.part_number
    let multiplier = parameters.multiplier || 1
    //if ( multiplier !== 1 ) console.log('models/index.js - getDealerItems - price multiplied by : ', multiplier);

    console.log("getDealerItems - initializing")
    Exectimer.time("getDealerItems()")
    ItemsController.getDealerItems({
      nav_customer_id: nav_customer_id,
      part_number: part_number,
      multiplier
    })
      .then(function (itms) {
        console.log("getDealerItems - then after " + (new Date().getTime() - start) + "ms")
        log(
          Exectimer.timeEnd("getDealerItems()", {
            methodSuccess: true
          })
        )
        deferred.resolve(itms)
      })
      .catch(function (error) {
        console.log("getDealerItems ERROR - catch after " + (new Date().getTime() - start) + "ms")
        log(
          Exectimer.timeEnd("getDealerItems()", {
            methodSuccess: false
          })
        )
        deferred.reject(error)
      })
    return deferred.promise
  },
  // deprecated
  // cannot get complete specifications without products or brands
  // getDealerItemsAndSpecifications: function( parameters, options ) {
  //     let deferred = Q.defer();
  //     let nav_customer_id = parameters.nav_customer_id;
  //     let part_number = parameters.part_number;
  //     Exectimer.time( "getDealerItemsAndSpecifications()" );
  //     ItemsController.getDealerItemsAndSpecifications({
  //         nav_customer_id: nav_customer_id,
  //         part_number: part_number
  //     }).then(function( itemsAndSpecifications ) {
  //         log(Exectimer.timeEnd( "getDealerItemsAndSpecifications()", {
  //             methodSuccess: true
  //         }));
  //         deferred.resolve( itemsAndSpecifications );
  //     }).catch(function( error ) {
  //         log(Exectimer.timeEnd( "getDealerItemsAndSpecifications()", {
  //             methodSuccess: false
  //         }));
  //         deferred.reject( error );
  //     });
  //     return deferred.promise;
  // },
  // deprecated
  // no point in restricting products, all should be viewable
  // getDealerProducts: function( parameters, options ) {
  //     let deferred = Q.defer();
  //     let nav_customer_id = parameters.nav_customer_id;
  //     let part_number = parameters.part_number;
  //     Exectimer.time( "getDealerProducts()" );
  //     ProductsController.getDealerProducts({
  //         nav_customer_id: nav_customer_id,
  //         part_number: part_number
  //     }).then(function( prdcts ) {
  //         log(Exectimer.timeEnd( "getDealerProducts()", {
  //             methodSuccess: true
  //         }));
  //         deferred.resolve( prdcts );
  //     }).catch(function( error ) {
  //         log(Exectimer.timeEnd( "getDealerProducts()", {
  //             methodSuccess: false
  //         }));
  //         deferred.reject( error );
  //     });
  //     return deferred.promise;
  // },
  /**
   *
   */
  getDealerItemsById: function (parameters, options) {
    let start = new Date().getTime()
    let deferred = Q.defer()
    let nav_customer_id = parameters.nav_customer_id
    let id = parameters.id
    let multiplier = parameters.multiplier || 1
    //if ( multiplier !== 1 ) console.log('models/index.js - getDealerItems - price multiplied by : ', multiplier);
    ItemsController.getDealerItemsById({
      nav_customer_id: nav_customer_id,
      id: id,
      multiplier
    })
      .then(function (itms) {
        deferred.resolve(itms)
      })
      .catch(function (error) {
        deferred.reject(error)
      })
    return deferred.promise
  },
  /**
   *
   */
  getDealerProductsAndSpecifications: function (parameters) {
    let deferred = Q.defer()
    let that = this
    let nav_customer_id = parameters.nav_customer_id
    let part_number = parameters.part_number
    let cacheKey = `${nav_customer_id}_ProductsAndSpecifications`
    let multiplier = parameters.multiplier || 1
    //if ( multiplier !== 1 ) console.log('models/index.js - getDealerProductsAndSpecifications - price multiplied by : ', multiplier);

    Exectimer.time("getDealerProductsAndSpecifications()")
    // let cacheResObj = cache.get(cacheKey);
    // if (cacheResObj) {
    //     console.log("============ Got cacheResObj", Object.keys(cacheResObj));
    //     deferred.resolve(cacheResObj);
    //     return deferred.promise;
    // } else {
    //     console.log("============ Dont Got cacheResObj");
    // }

    console.log("getDealerProductsAndSpecifications all triggered")
    Promise.all([
      that.getDealerEmail(nav_customer_id),
      that.getDealerItems({
        nav_customer_id: nav_customer_id,
        part_number: part_number,
        multiplier
      }),
      that.getBrands(),
      that.getProducts()
    ])
      .then(function (results) {
        if (results[0].length > 0) {
          console.log("getDealerProductsAndSpecifications then reached")
          let itms = results[1]
          let brnds = results[2]
          let prdcts = results[3]
          let specifications = ItemsController.getItemSpecifications({
            brands: brnds,
            items: itms,
            products: prdcts
          })
          log(
            Exectimer.timeEnd("getDealerProductsAndSpecifications()", {
              methodSuccess: true
            })
          )
          let resolveObj = {
            brands: brnds,
            items: itms,
            products: prdcts,
            specifications: specifications
          }
          //let success = cache.set( cacheKey, resolveObj, (60 * 60) );
          console.log("getDealerProductsAndSpecifications resolving within then")
          deferred.resolve(resolveObj)
        } else {
          deferred.resolve(results[0])
        }
      })
      .catch(function (error) {
        console.log("getDealerProductsAndSpecifications caught an error")
        console.log(error)
        log(
          Exectimer.timeEnd("getDealerProductsAndSpecifications()", {
            methodSuccess: false
          })
        )
        deferred.reject(error)
      })

    // if( !cached ) {
    //     ProductsController.getDealerProductsAndSpecifications({
    //         nav_customer_id: nav_customer_id,
    //         part_number: part_number
    //     }).then(function( productsAndSpecifications ) {
    //         log(Exectimer.timeEnd( "getDealerProductsAndSpecifications()", {
    //             methodSuccess: true
    //         }));
    //         Cache.set( `${ nav_customer_id }_ProductsAndSpecifications`, productsAndSpecifications );
    //         deferred.resolve( productsAndSpecifications );
    //     }).catch(function( error ) {
    //         log(Exectimer.timeEnd( "getDealerProductsAndSpecifications()", {
    //             methodSuccess: false
    //         }));
    //         console.log( error );
    //         deferred.reject( error );
    //     });
    // }
    // else {
    //     deferred.resolve( cached );
    // }
    return deferred.promise
  },

  /**
   * Goes through the list of warehouses in /common/config/settings/warehouses.js
   * and filters them down to just the ones applicable for the user.
   *
   * filter.dealer will only show the location for users whose dealer matches the filter dealer
   * example: User is DTC and the filter is set to DTC, user sees the locaiton
   * example: User is a non DTC and the filter is set to DTC, user does not see the location
   * example: User has no dealer due to some bug? User does not see the location
   *
   * filter.country will only show the location for users whose country matches the country
   * example: User is US and the filter is set to US, user sees the location
   * example: User is US and the filter is set to CA, user does not see the location
   *
   * filter.excludeCountry will only show for users whose country DOES NOT match the country
   * example: User is US and the filter is set to exclude CA, US is not CA, user sees the location
   * example: User is JP and the filter is set to exclude CA, JP is not CA, user sees the location
   * example: User is CA and the filter is set to exclude CA, user does not see the location
   *
   * If there are multiple filters, failing any one hides the location.
   * example US DTC user and a location that filters to CA DTC, they could see because of DTC but the country excludes them.
   *
   * For both country and excludeCountry, multiple countries or abbreviations for countries can be included with comma separation.
   * So "CA,CAN,CANADA" will filter if it's any of those variants.
   * It will also work with "CA,CAN,CANADA,JA,JAP,JAPAN,JP" filtering variants of both Canada and Japan.
   * So long as the user's country matches one, it's considered a match.
   */
  getDealerWarehouses: (user, dealer) => {
    let dealerLocations = {}
    for (let locationKey in warehousesJSON) {
      let location = warehousesJSON[locationKey]
      // Only even consider "live" warehouses
      if (location.isLive) {
        // If there is a filter for the location
        if (location.filter) {
          let bShouldDisplay = true

          // If there is a dealer filter
          if (location.filter.dealer) {
            if (location.filter.dealer !== dealer.nav_customer_id) {
              // If the filter.dealer doesn't match the customer id, don't display
              bShouldDisplay = false
            } else if (typeof user.shipping_config.defaultLocationCode === "undefined") {
              // If there isn't a defaultLocationCode, don't display
              bShouldDisplay = false
            } else if (user.shipping_config.defaultLocationCode !== location.locationCode) {
              // If the default location code doesn't match the location code, don't display
              bShouldDisplay = false
            }
          }

          // If there is a filter.country but it DOES NOT match the user's (not their dealer's) country
          if (typeof location.filter.country !== "undefined") {
            // Loop over all countries as comma separated
            let countries = location.filter.country.split(",")
            let bMatch = false
            for (let i = 0; i < countries.length; i += 1) {
              if (countries[i].toString().toUpperCase() === user.country.toString().toUpperCase()) {
                bMatch = true
              }
            }
            // If the user's country wasn't in any of the filter countries, hide the location
            if (bMatch === false) {
              bShouldDisplay = false
            }
          }

          // If there is a filter.excludeCounty and it MATCHES the user's (not their dealer's) country
          if (typeof location.filter.excludeCountry !== "undefined") {
            // Loop over all countries as comma separated
            let countries = location.filter.excludeCountry.split(",")
            let bMatch = false
            for (let i = 0; i < countries.length; i += 1) {
              if (countries[i].toString().toUpperCase() === user.country.toString().toUpperCase()) {
                bMatch = true
              }
            }
            // If the user's country was in any of the filter countries to exclude, hide the location
            if (bMatch === true) {
              bShouldDisplay = false
            }
          }

          // Add entries that haven't been filtered out
          if (bShouldDisplay === true) {
            dealerLocations[locationKey] = location
          }
        } else {
          // If there were no filters, always include the location
          dealerLocations[locationKey] = location
        }
      }
    }
    return dealerLocations
  },

  /**
   *
   */
  getProducts: function () {
    console.log("getProducts (v1) initializing")
    let deferred = Q.defer()
    ProductsController.getProducts()
      .then(function (products) {
        console.log("getProducts (v1) then")
        deferred.resolve(products)
      })
      .catch(function (error) {
        console.log("getProducts (v1) catch")
        console.log("error", error)
        deferred.reject(error)
      })
    return deferred.promise
  },

  /**
   *
   */
  getProductWithItems: function (productId) {
    let items
    console.log("getProductWithItems initializing")
    return ItemsController.getItemsByProduct(productId)
      .then((returnedItems) => {
        items = returnedItems
        return Product.findOne({ id: productId })
      })
      .then((product) => {
        console.log("getProductWithItems then")
        product.items = { list: items }
        return product
      })
    //return Product.findOne({id:productId});
  },

  getItemByPartNum: function (partNum) {
    // if (partNum.length < 1 || partNum[0].length < 1) {
    //     return "";
    // }
    let items
    console.log("getItemByPartNum initializing".rainbow)
    return ItemsController.getByVendorPartNumber(partNum).then((items) => {
      console.log("getItemByPartNum then")
      return items
    })
    //return Product.findOne({id:productId});
  },

  /**
   *
   */
  createProduct: (productObj, items) => {
    let newProduct
    return ProductsController.createProduct(productObj)
      .then((product) => {
        newProduct = product
        //this.saveItem(itemsUpdateObj)
        if (items && items.length) return ItemsController.assignItemsToProduct(newProduct.id, items)
        else return newProduct
      })
      .then((results) => {
        return newProduct
      })
  },

  /**
   *
   */
  assignItemsToProduct: (productid, items) => {
    return ItemsController.assignItemsToProduct(productid, items)
  },

  /**
   *
   */
  updateItemsPhotos: (ids, image) => {
    return Item.updateItemPhotos(ids, JSON.stringify({ list: [image] }))
  },

  /**
   *
   */
  deleteItems: (ids) => {
    return Item.destroy({ id: ids })
  },

  /**
   *
   */
  deleteProduct: (productId) => {
    return Product.destroy({ id: productId })
  },

  /**
   *
   */
  updateProductByItemImages: (productId, isWheel) => {
    return ItemsController.getItemsByProduct(productId)
      .then((returnedItems) => {
        let imageHash = {}
        returnedItems.forEach((item) => {
          let finish = item.specification && item.specification.finish ? item.specification.finish : null
          if (item.image && item.image.list) {
            item.image.list.forEach((image) => {
              imageHash[image] = isWheel ? { src: image, finish: finish } : image
            })
          }
        })
        return Object.keys(imageHash).map((key) => {
          return imageHash[key]
        })
      })
      .then((imageList) => {
        let productUpdateObj = {
          id: productId,
          image: {
            list: imageList
          }
        }
        return Product.save(productUpdateObj)
      })
  },

  /**
   *
   */
  removeFromCart: function (parameters, options) {
    let deferred = Q.defer()
    let appSettings = parameters.appSettings
    let body = parameters.body
    let id = parameters.id
    let user = parameters.user
    let Checkout = new CheckoutController({
      appSettings: appSettings,
      user: user
    })
    Exectimer.time("removeFromCart()")
    Checkout.removeFromCart({
      id: id,
      location: body.location
    })
      .then(function (response) {
        log(
          Exectimer.timeEnd("removeFromCart()", {
            methodSuccess: true
          })
        )
        deferred.resolve(response)
      })
      .catch(function (error) {
        log(
          Exectimer.timeEnd("removeFromCart()", {
            methodSuccess: false
          })
        )
        deferred.reject(error)
      })
    return deferred.promise
  },

  /**
   * @see models/checkout Repository.submitPurchaseOrder (calls)
   */
  submitPurchaseOrder: function (parameters, options) {
    let deferred = Q.defer()
    let appSettings = parameters.appSettings
    let body = parameters.body
    let user = parameters.user
    const dealer = parameters.dealer
    //   console.log('body param',parameters);
    //  console.log("~~~~~ User ~~~~~~~", user)
    //  console.log("~~~~~ User Cart ~~~~~~~", user.cart)
    let po_number = body.po_number
    //  console.log("~~~~~ po_number ~~~~~~~",po_number);
    let shipping = body.shipping
    // console.log("~~~~~ shipping ~~~~~~~",shipping);
    let token = body.token
    //  console.log("~~~~~ token ~~~~~~~",token);
    let warehouses = body.warehouses
    //  console.log("~~~~~ warehouses ~~~~~~~",warehouses);
    let totals = body.totals
    const vehicleInfo = body.vehicleInfo

    let Checkout = new CheckoutController({
      appSettings: appSettings,
      user: user
    })
    Exectimer.time("submitPurchaseOrder()")
    Checkout.submitPurchaseOrder({
      po_number: po_number,
      shipping: shipping,
      totals: totals,
      vehicleInfo: vehicleInfo,
      token: token,
      warehouses: warehouses,
      user: user,
      dealer: dealer
    })
      .then(function (response) {
        log(
          Exectimer.timeEnd("submitPurchaseOrder()", {
            methodSuccess: true
          })
        )
        //   console.log("checkout submit resp", response)
        console.log("checkout submit resp COMMENTED OUT RIGHT NOW")
        deferred.resolve(response)
      })
      .catch(function (error) {
        console.log("ERROR : catch : submitPurchaseOrder > Checkout.submitPurchaseOrder", error)
        log(
          Exectimer.timeEnd("submitPurchaseOrder()", {
            methodSuccess: false
          })
        )
        deferred.reject(error)
      })
    return deferred.promise
  },

  assignPO: function (parameters) {
    let deferred = Q.defer()
    // console.log('assign param',parameters);
    MSSQL.assignPO(parameters)
      .then(function (response) {
        //    console.log("VMMODEL RESPONSE", response);
        deferred.resolve(response)
      })
      .catch(function (error) {
        console.log("ERROR : catch : assignPO", error)
      })
    return deferred.promise
  },
  getSalesOrderNums: function (parameters) {
    let deferred = Q.defer()
    MSSQL.getSalesOrderNums(parameters)
      .then(function (response) {
        deferred.resolve(response)
      })
      .catch(function (error) {
        console.log("ERROR : catch : getSalesOrderNums", error)
      })
    return deferred.promise
  },
  getSalesInvoiceOrderNums: function (parameters) {
    console.log("model invoice search")
    let deferred = Q.defer()
    MSSQL.getSalesInvoiceOrderNums(parameters)
      .then(function (response) {
        deferred.resolve(response)
      })
      .catch(function (error) {
        console.log("ERROR : catch : getSalesInvoiceOrderNums", error)
      })
    return deferred.promise
  },
  getSalesOrderByPONum: function (parameters, getCount = false) {
    let deferred = Q.defer()
    MSSQL.getSalesOrderByPONum(parameters, getCount)
      .then(function (response) {
        deferred.resolve(response)
        console.log("model order resp", response)
      })
      .catch(function (error) {
        console.log("ERROR : catch : getSalesOrderNums", error)
      })
    return deferred.promise
  },
  getSalesInvoiceOrderByPONum: function (parameters, getCount = false) {
    let deferred = Q.defer()
    MSSQL.getSalesInvoiceOrderByPONum(parameters, getCount)
      .then(function (response) {
        deferred.resolve(response)
        console.log("model invoice resp", response)
      })
      .catch(function (error) {
        console.log("ERROR : catch : getSalesInvoiceOrderNums", error)
      })
    return deferred.promise
  },
  /**
   * The `parameters` object needs to contain an id key.
   * The id key will contain the user's id.
   * @param  {Object} parameters  Parameter Object containing the User ID
   * @example <caption>Example Usage of the Parameters Object</caption>
   * {
   *     id: 123
   * }
   * @param  {Object} options Additional Options that may be defined later in dev.
   * @return {Object}         Initially, Returns a Deferred Promise Object
   */
  clearCart: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}

    Generic.clearCart(parameters, options)
      .then(function (updatedUser) {
        deferred.resolve(updatedUser.cart)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()

    return deferred.promise
  },

  /**
   * Method used to clear all rows from the passed in Table.
   * @param   {Object}  parameters  Parameters containing the table details.
   * @example <caption>Example Usage of the Parameters Object</caption>
   * {
   *     table: "user",    [REQUIRED]
   *     schema: "public"
   * }
   * @param   {Object}  options     [description]
   * @return  {Object}              [description]
   */
  clearTable: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}

    /** If we have a table but no schema, we can apply the schema value. */
    if (!parameters.schema && parameters.table) {
      switch (parameters.table) {
        case "dealer":
        case "login":
        case "user":
          parameters.schema = "membership"
          break
        case "brand":
        case "item":
        case "product":
        case "product_list":
          parameters.schema = "public"
          break
        case "sale":
        case "sale_item":
        case "salesrep":
          parameters.schema = "sale"
          break
      }
    }

    Generic.clearTableData(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()

    return deferred.promise
  },

  /**
   *
   */
  countUsers: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    User.count(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   * Method to save the dealer and user data on our DB.
   * This method will eventually trigger an email to VW as planed.
   *
   * @param   {Object}  parameters  Object containing all the data
   *                                from the filled out signup form.
   * @param   {Object}  options     Additional Options that may be defined later in dev.
   * @return  {Object}              Initially, Returns a Deferred Promise Object.
   *                                When the promise is resolved, it returns the saved user object.
   */
  dealerSignup: function (parameters, options) {
    return __validateCredentials(parameters)
      .then(__handleDealerSignup)
      .then((data) => {
        data.passwordHash = Crypt.encode(data.parameters.password).token
        return Login.save({ password_hash: data.passwordHash }).then((login) => {
          data.login = login
          data.userAccount.dealer_id = data.dealer.id
          data.userAccount.login_id = data.login.id
          data.userAccount.shipping_config.defaultLocationCode = __getDefaultLocationCode(
            data.dealer,
            options
          )
          return data.userAccount
        })
      })
      .then(__handleSaveUser)
  },

  /**
   * Used to delete a Dealer from our Database.
   * @param   {Object}  parameters  Parameter object containing the Dealer's ID.
   * @example <caption>Example Usage of the Parameters Object</caption>
   * {
   *     id: 123 (optional)   [REQUIRED]
   * }
   * @param   {Object}  options     Additional Options that may be defined for custom cases.
   * @return  {Object}              Initially, Returns a Deferred Promise Object
   */
  deleteDealer: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    Dealer.destroy(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  deleteLogin: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    Login.destroy(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  // deprecated: handled on front end
  /**
   * Filter Items based on the parameters passed in.
   *
   * @param   {Object}  parameters  Filter values to apply.
   *                                At least one parameter property is required to filter
   *                                for items.
   * @example <caption>Example Usage of the Parameters Object</caption>
   * {
   *     type: "wheel",
   *     brand: "Vision",
   *     model: "715 Crazy Eight",
   *     diameter: 17,
   *     finish: "Chrome"
   * }
   * @param   {Object}  options     Additional Options that may be defined later in dev.
   * @return  {Object}              Initially, Returns a Deferred Promise Object
   */
  filterItems: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}

    /** First, we validate a proper data structure that massive can use. */
    let parameterSchema = {}
    let parameterKeys = _.allKeys(parameters)

    /**
     * Confirm if this search is strictly for the `part_number` ONLY.
     * This flag will help us determine whether to make an extra call to
     * NAV if no items are found in our DB.
     *
     * If no Items found in our DB and this flag is set to true, this means
     * the user attempted to serahc by part number but that number doesnt
     * exist in our DB, therefore, we will now make that extra call to NAV
     * to confirm that the inputted number is a cross reference of the
     * actual part number.
     * @type  {Boolean}
     */
    let searchingPrivateLabel = null
    let searchingPartNumber = null
    let searchingByPartNumber = false
    /**
     * We have to structure the data so that the `parameterSchema` object
     * matches the item table column arrangement. This way massive can
     * query for the items based on the properties passed in with the
     * parameters.
     */
    parameterSchema["product_id !"] = null
    for (let f = 0; f < parameterKeys.length; f++) {
      let key = parameterKeys[f]
      let value = parameters[key]

      switch (key) {
        case "part_number":
        case "upc":
        case "brand":
          parameterSchema[key] = value
        case "type":
          parameterSchema[key] = value
        case "inventory":
        case "privateLabel":
          if (key === "part_number") {
            searchingByPartNumber = true
            searchingPartNumber = value
          }
          if (key === "privateLabel") searchingPrivateLabel = value
          parameterSchema[key] = value
          break
        default:
          parameterSchema[`specification ->> ${key}`] = value
      }
    }

    let that = this
    this.findItems(parameterSchema, options)
      .then(function (items) {
        if (items.length) deferred.resolve(items)
        else {
          MSSQL.crossReference(parameters, options)
            .then(function (crossRefItem) {
              let crossRefItemNum = crossRefItem["Item No_"] || ""
              if (_.isEmpty(crossRefItemNum) && crossRefItem.crossReference)
                crossRefItemNum = crossRefItem.crossReference.referencedItemNumber || ""
              crossRefItemNum = crossRefItemNum.toString().trim()

              /**
               * @ignore
               * @description For Debugging Purposes
               */
              let crossRefMsg = "\nRetrieving Cross Referenced Item from Postgres."
              crossRefMsg += "\n\tPart Number:\t\t" + colors.yellow(crossRefItemNum)
              crossRefMsg += "\n\tCross Reference Number:\t" + colors.yellow(searchingPartNumber)
              crossRefMsg += "\n\tPostgres Query Built:"
              crossRefMsg += colors.yellow(
                "\n\t\tSELECT * FROM public.item WHERE part_number = '" +
                  colors.yellow(crossRefItemNum) +
                  "';"
              )
              crossRefMsg += "\n\tCross Reference Details:"
              crossRefMsg += colors.yellow(
                "\n\t\t" + colors.yellow(JSON.stringify(crossRefItem.crossReference)) + "\n"
              )
              log(crossRefMsg)

              that
                .findItem({ part_number: crossRefItemNum })
                .then(function (item) {
                  deferred.resolve([item])
                })
                .fail(function (err) {
                  if (err.message && err.message === "Record Not Found") deferred.resolve([])
                  else deferred.reject(err)
                })
                .done()
            })
            .fail(function (err) {
              if (err.statusCode === 1002) deferred.resolve([])
              else deferred.reject(err)
            })
            .done()
        }
      })
      .fail(function (err) {
        log("There was a ERROR while Filtering Items")
        log(err)
        if (err.stack) {
          log("WARNING: Long Stack Traces")
          log(err.stack)
        }
        deferred.reject(err)
      })
      .done()

    return deferred.promise
  },

  // deprecated: handled on front end
  /**
   * Filter Items based on the supplied part number.
   *
   * @param   {Object}  parameters  Filter values to apply.
   *                                Only the `part_number` property is required.
   * @example <caption>Example Usage of the Parameters Object</caption>
   * {
   *     partNumber: "181H7681MBF"
   * }
   * @param   {Object}  options     Additional Options that may be defined later in dev.
   * @return  {Object}              Initially, Returns a Deferred Promise Object
   */
  filterItemsByPartNumber: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}

    this.findItems({ part_number: parameters.partNumber }, options)
      .then(function (items) {
        deferred.resolve(items)
      })
      .fail(function (err) {
        console.log("!!! VWModel: There was a ERROR while Filtering Items By Part Number")
        console.log(err)
        if (err.stack) {
          console.log(colors.yellow(">>> WARNING: Long Stack Traces <<<"))
          console.log(err.stack)
        }
        deferred.reject(err)
      })
      .done()

    return deferred.promise
  },

  /**
   *
   */
  findBrand: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    Brand.findOne(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  findBrands: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    Brand.find(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  // deprecated: use getCartDetails
  /**
   * Used to get Cart Item Details. In other words, this method will return
   * the items in the User's cart with each of their specific details.
   * @param   {Object}  parameters   Parameter object that contains the User ID.
   * @example <caption>Example Usage of the Parameters Object</caption>
   * {
   *     id: 123
   * }
   * @param   {Object}  options  Additional Options that may be defined later in dev.
   * @return  {Object}           Initially, Returns a Deferred Promise Object
   */
  // findCartDetails: function(parameters, options) {
  //     let deferred = Q.defer();

  //     options = options || {};
  //     parameters = parameters || {};

  //     // /**
  //      // * Flag to be set to confirm weather we should get the user
  //      // * from postgres or not. When this method is called from the routes,
  //      // * the user object along with the dealer object will always be available.
  //      // * Therefore, passing in the user object will determine that there is no
  //      // * need to go and fetch the user from the db.
  //      // *
  //      // * First we check if the parameters contains a combination of user cart object
  //      // * and dealer object, if so this is the user object and there is no need to fetch
  //      // * it again.
  //      // * @type  {Boolean}
  //      // */
  //     let fetchUser = true;
  //     if (parameters.cart && (parameters.dealer && _.isObject(parameters.dealer)))
  //         fetchUser = false;

  //     let that = this;

  //     if (fetchUser) {
  //         this.findUser({id: parameters.id}, options)
  //         .then(itemPricingHandler)
  //         .fail(function(err) {
  //             deferred.reject(err);
  //         }).done();
  //     } else {
  //         itemPricingHandler(parameters);
  //     }

  //     function itemPricingHandler(user) {
  //         let Cart = user.cart;
  //         let itemsObj = Cart.items;
  //         let itemIds = _.allKeys(itemsObj);

  //         options.excludePrivateLabelQuery = false;

  //         if (itemIds.length) {
  //             that.getItemPricing(user, options).then(function(pricedItems) {
  //                 // /**
  //                  // * Once all Items are found, we add the user.cart.items object values to the
  //                  // * found items data. This will add the QTY and Location values.
  //                  // */
  //                 Cart.subtotal = 0;
  //                 for (let t = 0; t < pricedItems.length; t++) {
  //                     let item = pricedItems[t];

  //                     /** Create Location Property */
  //                     item.locations = itemsObj[item.id];

  //                     /** Now calculate the price per WH */
  //                     let states = _.allKeys(item.locations);
  //                     for (let f = 0; f < states.length; f++) {
  //                         let state = states[f];
  //                         let price = 0;

  //                         if (item.price.dealer !== undefined)
  //                             price = item.price.dealer;
  //                         else if (item.price.retail !== undefined)
  //                             price = item.price.retail;

  //                         Cart.subtotal += item.locations[state] * price;
  //                     }
  //                 }

  //                 Cart.subtotal = __parseDecimalPricing(Cart.subtotal);
  //                 Cart.items = pricedItems;
  //                 // /** We resolve with an array of Objects containing Item Details */
  //                 deferred.resolve(Cart);
  //             }).fail(function(err) {
  //                 log(err);
  //                 if (err.stack) {
  //                     log(colors.yellow(">>> WARNING: Long Stack Traces <<<"));
  //                     log(err.stack);
  //                 }
  //                 deferred.reject(err);
  //             }).done();
  //         } else {
  //             Cart.subtotal = 0;
  //             Cart.items = [];
  //             deferred.resolve(Cart);
  //         }
  //     }

  //     return deferred.promise;
  // },

  /**
   *
   */
  findDealer: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    Dealer.findOne(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  findDealers: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    Dealer.find(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  createDealer: (dealerObj, items) => {
    let newDealer
    return Dealer.save(dealerObj)
      .then((product) => {
        newDealer = product
        //this.saveItem(itemsUpdateObj)
        if (items && items.length) return ItemsController.assignItemsToProduct(newDealer.id, items)
        else return newDealer
      })
      .then((results) => {
        return newDealer
      })
  },

  /**
   *
   */
  getOrphineItems: function () {
    log("getOrphineItems")
    return ItemsController.getOrphinedItems()
  },

  /**
   *
   */
  getItemPhotoGroups: (_) => {
    return Item.find({}).then((items) => {
      let photoGroups = []
      let photoGroupsHash = {}
      //need to get an array of item arrays
      // [{
      //     productGroupCode:"",
      //     finish:""
      //     items:[]
      // }]
      photoGroupsHash = items.reduce((acc, item) => {
        if (!item.specification) {
          return acc
        }
        let groupKey = `${item.specification.product_group_code}__${item.specification.finish}`
        let group = acc[groupKey]
        if (acc[groupKey]) {
          acc[groupKey].items.push(item)
        } else {
          acc[groupKey] = {
            productGroupCode: item.specification.product_group_code,
            finish: item.specification.finish,
            items: [item]
          }
        }
        return acc
      }, photoGroupsHash)
      //turn hash back into array;
      photoGroups = Object.keys(photoGroupsHash).map((key) => photoGroupsHash[key])
      return photoGroups
    })
  },
  // deprecated: handled on front end

  /**
   *
   */
  findItem: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    Item.findOne(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  getOrderById: function (saleId) {
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
  },

  /**
   * Retrieve Order object by Purchase Order
   * Implemented by TRAFFIC 2020
   *
   * @param string Purchase Order
   *
   * @example getOrderByPONumber(4512345678)
   */
  getOrderByPONumber: function (po_number) {
    let sales
    return Sale.find({ po_number: po_number })
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
  },
  // deprecated: handled on front end

  /**
   *
   */
  findItems: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    Item.find(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  findLogin: function (parameters, options) {
    parameters = parameters || {}
    options = options || {}
    return Login.findOne(parameters, options)
  },

  /**
   *
   */
  findProduct: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}

    let privateLabel = parameters.privateLabel || false
    delete parameters.privateLabel

    Product.findOne(parameters, options)
      .then(function (product) {
        let itemParams = {
          product_id: product.id, //items.list,
          privateLabel: privateLabel
        }
        Item.find(itemParams)
          .then(function (items) {
            product.items.list = items
            deferred.resolve(product)
          })
          .fail(function (err) {
            deferred.reject(err)
          })
          .done()
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  findProducts: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    Product.find(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  findProductListing: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    ProductList.findOne(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  findProductListings: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    ProductList.find(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   * Used to find a Sale from our Database.
   *
   * @param   {Object}  parameters  Parameter object containing the Sale or User's ID.
   * @example <caption>Example Usage of the Parameters Object</caption>
   * {
   *     id: 123 (optional),
   *     user_id: 345 (required)
   * }
   *
   * @param   {Object}  options     Additional Options that may be defined for custom cases.
   *                                Here we have the additional options that can be passed in
   *                                as part of the `options` object:
   *                                    noItems  {Boolean}  Flag that determines whether to grab the
   *                                                        items for the sale.
   *                                                        Default: undefined
   * @example <caption>Example Usage of the Options Object</caption>
   * {
   *     noItems: false
   * }
   *
   * @return  {Object}              Initially, Returns a Deferred Promise Object
   */
  findSale: function (parameters, options) {
    let deferred = Q.defer()
    options = options || {}
    parameters = parameters || {}

    let that = this
    Sale.findOne(parameters)
      .then(function (sale) {
        /**
         * This can be an options where if `options.noItems` is set to true,
         * then we exclude the fetching of the Items associated with the Sale.
         * One would do this if, they just want the sale data but not the full
         * breakdown including the items in the sale.
         *
         * @param   {Boolean}  options.noItems  If to include the Sale's Items or not.
         *
         * @return  {Object}                    Resolve the promise with the Sale Object found.
         */
        if (options.noItems) {
          return deferred.resolve(sale)
        }
        __findSaleItems(sale)
          .then(function (response) {
            deferred.resolve(response)
          })
          .fail(function (err) {
            deferred.reject(err)
          })
          .done()
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  findSales: function (parameters, options) {
    let deferred = Q.defer()
    options = options || {}
    parameters = parameters || {}

    let that = this
    Sale.find(parameters)
      .then(function (sales) {
        /**
         * This can be an options where if `options.noItems` is set to true,
         * then we exclude the fetching of the Items associated with the Sale.
         * One would do this if, they just want the sale data but not the full
         * breakdown including the items in the sale.
         *
         * @param   {Boolean}  options.noItems  If to include the Sale's Items or not.
         *
         * @return  {Object}                    Resolve the promise with the Sale Object found.
         */
        if (options.noItems) {
          return deferred.resolve(sales)
        }

        let promises = [],
          genSales = []
        for (let f = 0; f < sales.length; f++) {
          let promise = __findSaleItems(sales[f]).then(function (sale) {
            genSales.push(sale)
          })
          promises.push(promise)
        }

        Q.allSettled(promises)
          .then(function (results) {
            let isError = false,
              errorResult
            results.forEach(function (result) {
              if (result.state !== "fulfilled") {
                isError = true
                errorResult = result
              }
            })

            if (isError) {
              console.log(colors.red("!!! " + errorResult.reason))
              errorResult.message = errorResult.reason
              deferred.reject(errorResult)
            } else {
              deferred.resolve(genSales)
            }
          })
          .done()
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  findSaleItems: function (parameters, options) {
    let deferred = Q.defer()
    options = options || {}
    parameters = parameters || {}
    SaleItem.find(parameters)
      .then(function (sale) {
        deferred.resolve(sale)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  findSalesrep: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    Salesrep.findOne(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  findSalesreps: function (parameters, options) {
    return Salesrep.find(parameters, options)
  },

  /**
   * Attempt to find a single user.
   *
   * Will abort if it takes too long - usually a sign Postgres isn't responding.
   */
  findUser: function (parameters, options) {
    let deferred = Q.defer()
    let MAX_TIME = 10
    let timer = setTimeout(function () {
      deferred.reject(
        new Error("VWModel.findUser ERROR TIMEOUT - took more than " + MAX_TIME + " seconds. Rejecting.")
      )
    }, MAX_TIME * 1000)
    parameters = parameters || {}
    options = options || {}
    User.findOne(parameters, options)
      .then(function (response) {
        clearTimeout(timer)
        deferred.resolve(response)
      })
      .fail(function (err) {
        clearTimeout(timer)
        log("VWModel.findUser - ERROR failing and rejecting")
        log(err)
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  findUsers: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    User.find(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },
  /**
   *
   */
  checkStoreNumber: function (storeNum, dealer) {
    //console.log('model check store');
    let deferred = Q.defer()
    let count = 0
    //parameters = parameters || {};
    //options =  {};
    count = Generic.checkStoreNumber(storeNum, dealer)
    return count
  },
  /**
   *
   */
  getShipInfoByStoreNum: function (storeNum) {
    let loc_code = 0
    loc_code = Generic.getShipInfoByStoreNum(storeNum)
    return loc_code
  },
  /**
   *
   */
  getDealerEmail: function (dealerId) {
    let profile = ""
    console.log("get dealer email model")
    profile = Generic.getDealerEmail(dealerId)
    console.log("get dealer email model done", profile)

    return profile
  },
  /**
   *
   */
  getBrands: function (parameters, options) {
    console.log("getBrands initializing")
    let deferred = Q.defer()
    options = options || {}
    parameters = parameters || {}
    Brand.find(parameters)
      .then(function (response) {
        console.log("getBrands then")
        deferred.resolve(response)
      })
      .fail(function (err) {
        console.log("getBrands fail")
        deferred.reject(err)
      })
      .done(function () {
        console.log("getBrands done")
      })
    return deferred.promise
  },

  /**
   *
   */
  getBrandsByType: function (parameters, options) {
    let deferred = Q.defer()
    options = options || {}
    parameters = parameters || {}

    /**
     * If no type is specified, I will apply the default type
     * to an array of `wheel`, `cap`, `accessory` and `tire`.
     */
    if (!parameters.type) {
      parameters.type = ["wheel", "tire"]
    }

    Brand.find(parameters)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  getItemsByType: function (parameters, options) {
    let deferred = Q.defer()
    options = options || {}
    parameters = parameters || {}

    /**
     * If no type is specified, I will apply the default type
     * to an array of `wheel`, `cap`, `accessory` and `tire`.
     */
    if (!parameters.type) {
      console.log("Item Find Status: No Type Supplied, Reverting to Defaults")
      parameters.type = ["wheel", "cap", "accessory", "tire"]
    }

    console.log("item.find - initializing")
    Item.find(parameters)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  searchItemsByLocations: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    let query = "location=$1"

    Item.search(query, parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   * Used to get Inventory data on a specified Item ID. This method can be extended to use
   * slugs as well. To be determined.
   *
   * @param   {Object}  parameters  Parameter object that contains the Item ID.
   * @example <caption>Example Usage of the Parameters Object</caption>
   * {
   *     id: 123
   * }
   * @param   {Object}  options     Additional Options that may be defined later in dev.
   *
   * @return  {Object}              Initially, Returns a Deferred Promise Object
   */
  getInventory: function (parameters, options) {
    let deferred = Q.defer()
    options = options || {}
    parameters = parameters || {}
    this.findItems(parameters)
      .then(function (item) {
        deferred.resolve(item.inventory)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  getLastWebOrderNumber: function (parameters) {
    let deferred = Q.defer()
    parameters = parameters || {}

    let promise = null

    if (_.has(parameters, "envCode")) promise = Generic.getLastWebOrderNumberByEnv(parameters.envCode)
    else promise = Generic.getLastWebOrderNumber()

    promise
      .then(function (WebOrderNumber) {
        deferred.resolve(WebOrderNumber)
      })
      .fail(function (err) {
        log("ERROR with DB Function 'getLastWebOrderNumber()'.")
        log(err)
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  getOrdersAdmin: function () {
    let d = new Date()
    d.setMonth(d.getMonth() - 6)
    return Sale.find({ deleted: null, "web_order_number not like": "WR%", "created >": d })
  },
  /**
   *
   */
  getOrdersAdminFull: function () {
    return Sale.find({ deleted: null, "web_order_number not like": "WR%" })
  },
  /**
   *
   */
  getReturnOrdersAdmin: function () {
    return Sale.find({ deleted: null, "web_order_number like": "WR%" })
  },
  /**
   *
   */
  getOrderHistoryById: function (user_id) {
    //return this.findSales({user_id: user_id});
    let sales
    //console.log("user_id", user_id, typeof(user_id));
    return Sale.find({ user_id: user_id })
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
  },

  /**
   *
   */
  getOrderHistoryViewModelById: function (user_id) {
    //this needs to change
    return this.getOrderHistoryById(user_id).then((orders) => {
      // need to turn order.sale_items into order.locations[].saleItems[]
      return orders.map((order) => {
        let saleItems = Object.keys(order.sale_items).map((key) => order.sale_items[key])
        let locations = []
        let locationsHash = {}
        //grab location data for all sale_items
        locationsHash = saleItems.reduce((acc, saleItem) => {
          acc[saleItem.fulfilment_location.code] = saleItem.fulfilment_location
          return acc
        }, locationsHash)
        //create locationsHash to array
        locations = Object.keys(locationsHash).map((key) => locationsHash[key])
        //attach appropriot sale items to each locations
        locations = locations.map((location) => {
          location.saleItems = saleItems.filter(
            (saleItem) => location.code === saleItem.fulfilment_location.code
          )
          return location
        })
        order.locations = locations
        return order
      })
    })
  },

  /**
   *
   */
  getPopularProducts: function (parameters) {
    parameters = parameters || {}
    let deferred = Q.defer()
    this.findProductListing({ id: 298 })
      .then((result) => {
        parameters.id = result.products.list
        return this.findProducts(parameters)
      })
      .then((products) => {
        deferred.resolve(products)
      })
      .catch((err) => {
        deferred.reject(err)
      })
    return deferred.promise
  },

  /**
   *
   */
  getProduct: function (parameters, options) {
    /** ADD GET SINGLE PRODUCT WITH ITEM DATA */
    let deferred = Q.defer()
    options = options || {}
    parameters = parameters || {}
    let that = this
    Product.find(parameters, options)
      .then(function (product) {
        Item.find({ product_id: product.id })
          .then(function (items) {
            product.items.list = items
            deferred.resolve(product)
          })
          .fail(function (err) {
            deferred.reject(err)
          })
          .done()
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  getProducts: function (parameters, options) {
    let start = new Date().getTime()
    console.log("getProducts (v2) - initializing")
    let deferred = Q.defer()
    options = options || {}
    parameters = parameters || {}
    Product.find(parameters, options)
      .then(function (products) {
        console.log("getProducts (v2) - then after " + (new Date().getTime() - start) + "ms")
        deferred.resolve(products)
      })
      .fail(function (err) {
        console.log("getProducts (v2) - fail after " + (new Date().getTime() - start) + "ms")
        deferred.reject(err)
      })
      .done(function () {
        console.log("getProducts (v2) - done after " + (new Date().getTime() - start) + "ms")
      })
    return deferred.promise
  },

  /**
   * Used to get all products that belong to a certain brand.
   *
   * @param   {Object}  parameters  Parameter object that contains the Brand Name.
   * @example <caption>Example Usage of the Parameters Object</caption>
   * {
   *     name: "Vision"
   * }
   * @param   {Object}  options     Additional Options that may be defined later in dev.
   *
   * @return  {Object}              Initially, Returns a Deferred Promise Object
   */
  getProductsByBrand: function (parameters, options) {
    console.log("getProductsByBrand initializing 1")
    let deferred = Q.defer()
    options = options || {}
    parameters = parameters || {}

    let that = this
    ProductList.find(parameters, options)
      .then(function (productListed) {
        console.log("getProductsByBrand then 1")
        if (productListed.length) {
          let productsParams = {
            id: productListed.products.list
          }
          console.log("getProductsByBrand initializing 2")
          that
            .getProducts(productsParams)
            .then(function (products) {
              console.log("getProductsByBrand then 2")
              productListed.products = products
              deferred.resolve(productListed)
            })
            .fail(function (err) {
              console.log("getProductsByBrand fail 2")
              deferred.reject(err)
            })
            .done(function () {
              console.log("getProductsByBrand done 2")
            })
        }
      })
      .fail(function (err) {
        console.log("getProductsByBrand fail 1")
        deferred.reject(err)
      })
      .done(function () {
        console.log("getProductsByBrand done 1")
      })
    return deferred.promise
  },

  /**
   * Method to get all sales associated with the User's ID.
   *
   * @param   {Object}  parameters  Parameters containing the User's ID
   * @example <caption>Example Usage of the Parameters Object</caption>
   * {
   *     id: 346
   * }
   * @param   {Object}  options     [description]
   *
   * @return  {Object}              [description]
   */
  getSalesByUser: function (parameters, options) {
    let deferred = Q.defer()
    options = options || {}
    parameters = parameters || {}
    this.findSales({ user_id: parameters.id }, options)
      .then(function (taxRate) {
        deferred.resolve(taxRate)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   * Used to get the Tax Rate based on a provided address.
   *
   * NOTE:    If you would like to know how these values calculate Tax Rates based on
   *          on the data provided visit this link:
   *          [Avalara Address Validation]{@link http://developer.avalara.com/avatax/address-validation/}
   *
   * @param   {Object}  parameters  Object that contains the Address Information.
   * @example <caption>Example Usage of the Parameters Object</caption>
   *              {
   *   [REQUIRED]     country: "USA",
   *   [REQUIRED]     state: "CA",
   *   [OPTIONAL]     street: "2920 S SEPULVEDA BLVD",
   *   [OPTIONAL]     city: "CULVER CITY",
   *   [OPTIONAL]     postal: 90064
   *              }
   * @param   {Object}  options     Additional Options that may be defined later in dev.
   * @return  {Object}              The responding Object currently has 2 properties.
   *                                The possible values for the responding object's type
   *                                property are `totalRate`, `County`, `State` and `Special`.
   *                                The `type` property is important because it tells us the used
   *                                values behind the `rate` property value.
   * @example <caption>Example of Returning Object</caption>
   *              {
   *                   type: "totalRate",
   *                   rate: 9
   *              }
   */
  getTaxRateByAddress: function (parameters, options) {
    let deferred = Q.defer()
    options = options || {}
    parameters = parameters || {}
    Taxapi.getTaxRateByAddress(parameters, options)
      .then(function (taxRate) {
        deferred.resolve(taxRate)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   * Used to get the Tax Rate based on a provided postal and country.
   *
   * NOTE:    If you would like to know how these values calculate Tax Rates based on
   *          on the data provided visit this link:
   *          [Avalara Address Validation]{@link http://developer.avalara.com/avatax/address-validation/}
   *
   * @param   {Object}  parameters  Object that contains the Address Information.
   * @example <caption>Example Usage of the Parameters Object</caption>
   *              {
   *   [REQUIRED]     country: "USA",
   *   [REQUIRED]     postal: 90064
   *              }
   * @param   {Object}  options     Additional Options that may be defined later in dev.
   * @return  {Object}              The responding Object currently has 2 properties.
   *                                The possible values for the responding object's type
   *                                property are `totalRate`, `County`, `State` and `Special`.
   *                                The `type` property is important because it tells us the used
   *                                values behind the `rate` property value.
   * @example <caption>Example of Returning Object</caption>
   *              {
   *                   type: "totalRate",
   *                   rate: 9
   *              }
   */
  getTaxRateByZip: function (parameters, options) {
    let deferred = Q.defer()
    options = options || {}
    parameters = parameters || {}
    Taxapi.getTaxRateByZip(parameters, options)
      .then(function (taxRate) {
        deferred.resolve(taxRate)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  getUserDealerById: function (id, cb) {
    Exectimer.time("getUserDealerById()")
    let that = this
    return this.findUser({ id: id }).then(function (user) {
      if (!user.dealer_id) {
        log(colors.cyan("User (" + colors.yellow(user.id) + ") is NOT Associated to a Dealer"))
        user.dealer = null
        log(Exectimer.timeEnd("getUserDealerById()"))
        return user
      }
      return that.findDealer({ id: user.dealer_id }).then(function (dealer) {
        user.dealer = dealer
        log(Exectimer.timeEnd("getUserDealerById()"))
        return user
      })
    })
  },

  /**
   *
   */
  getUserDealers: function (params) {
    params = params || {}
    let deferred = Q.defer()
    let that = this
    this.findUsers(params)
      .then(function (users) {
        let userDealers = users.map((user) => {
          return that
            .findDealer({ id: user.dealer_id })
            .then(function (dealer) {
              if (dealer) {
                user.dealer = dealer
              }
              return user
            })
            .fail((err) => {
              return user
            })
        })
        return Q.allSettled(userDealers)
      })
      .then((userDealersPromise) => {
        deferred.resolve(
          userDealersPromise.map((udp) => {
            return udp.value
          })
        )
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  adminGetFullUserDetails: function (params) {
    params = params || {}
    let deferred = Q.defer()
    User.adminFind(params)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   * It updates the User's Password.
   * @param   {String}  token     This is the hashed token generated for the link
   * @param   {String}  password  The User's New Password
   * @return  {Object}            Depending on the state of the promise which will
   *                              result in an Error Object or an Object Representing
   *                              the updated Login Record.
   */
  resetPassword: function (token, data) {
    let password = data.password,
      confirm = data.confirm,
      err

    /** Password has to be a string else hashing wont work. */
    if (confirm) confirm = confirm.toString()
    if (password) password = password.toString()

    /** First we find the login record with the given token. */
    return Login.findByHashReset(token)
      .then((login) => {
        /** Confirm that password and password confirmation match */
        if (password !== confirm) {
          err = new Error("Password Confirmation Do Not Match")
          err.statusCode = 401
          err.hint = "Password and Confirmation of the Password Do Not Match."
          err.args = {
            token: token,
            inputs: data
          }
          throw err
        }
        return login
      })
      .catch((err) => {
        if (err.message !== "Record Not Found") throw err
        err.message = "You May have Requested a New Link"
        err.hint = "No Login Record was found with the provided `hashed_reset_id`"
        throw err
      })
      .then((login) => {
        if (Crypt.compare(password, login.password_hash)) {
          err = new Error("Password Has Already Been Used")
          err.statusCode = 401
          err.hint = "Please try another password. The password provided has already been used."
          err.args = {
            token: token,
            password: password
          }
          log(err)
          throw err
        }

        return {
          id: login.id,
          password_hash: Crypt.encode(password).token,
          hashed_reset_id: null
        }
      })
      .then(Login.update)
  },

  /**
   *
   */
  saveBrand: function (parameters, options) {
    let deferred = Q.defer()
    options = options || {}
    parameters = parameters || {}
    Brand.save(parameters)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  saveDealer: function (parameters, options) {
    let deferred = Q.defer()
    options = options || {}
    parameters = parameters || {}
    Dealer.save(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  saveItem: function (parameters, options) {
    let deferred = Q.defer()
    options = options || {}
    parameters = parameters || {}
    Item.save(parameters)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  saveLogin: function (parameters, options) {
    let deferred = Q.defer()
    options = options || {}
    parameters = parameters || {}
    Login.save(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  saveProduct: function (parameters, options) {
    let deferred = Q.defer()
    options = options || {}
    parameters = parameters || {}
    Product.save(parameters)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  saveProductListing: function (parameters, options) {
    let deferred = Q.defer()
    options = options || {}
    parameters = parameters || {}
    ProductList.save(parameters)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  saveSale: function (parameters, options) {
    let deferred = Q.defer()
    options = options || {}
    parameters = parameters || {}
    Sale.save(parameters)
      .then(function (sale) {
        log("Successfully Saved Sale ID %s", colors.green(sale.id))
        deferred.resolve(sale)
      })
      .fail(function (err) {
        log("There was an ERROR Saving a Sale")
        log(err)
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  saveSaleItem: function (parameters, options) {
    let deferred = Q.defer()
    options = options || {}
    parameters = parameters || {}
    SaleItem.save(parameters)
      .then(function (saleItem) {
        log(
          "Successfully Saved Sale-Item ID %s for Sale ID %s",
          colors.green(saleItem.id),
          colors.green(saleItem.sale_id)
        )
        deferred.resolve(saleItem)
      })
      .fail(function (err) {
        log("There was an ERROR Saving a Sale Item")
        log(err)
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   *
   */
  saveUser: function (parameters, options) {
    let deferred = Q.defer()
    options = options || {}
    parameters = parameters || {}
    User.save(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   * Method to search for Global search based on the passed in term.
   * @param   {Object}  parameters  Parameter properties that contain the term to search by.
   * @example <caption>Example Usage of the Parameters Object</caption>
   * {
   *     term: "Vision"
   * }
   * @param   {Object}  options     Optional Options Object that modify the search behavior.
   *                                Currently, options only expects one property which is columns.
   *                                The columns property states which columns to search the term for.
   *                                Default is set to ["name", "description"], so the search query will
   *                                execute against the name and description columns.
   * @example <caption>Example Usage of the Options Object</caption>
   * {
   *     columns: ["name"]
   * }
   * @return  {Object}               Returns an Object of with the properties `brands` and `products` with the word 'Vision' in their name or description.
   * @example <caption>Example of the Returning Object</caption>
   * {
   *     brands: [{
   *         id: 52,
   *         type: "wheel",
   *         name: "Vision Wheel",
   *         slug: "vision-wheel",
   *         logo: "http://visionwheel.s3.amazonAWS.com/pages/brands/wheels/VisionWheel.svg",
   *         description: "Browse our full selection of ATV tires designed for the performance you want on your chosen terrain.",
   *         image: {
   *                 hero: "http://visionwheel.s3.amazonAWS.com/pages/brands/wheels/Headerimage_VisionWheelHD.jpg"
   *             }
   *         }
   *     }],
   *     products: [{
   *         id: 52,
   *         type: "wheel",
   *         name: "141 Legend 5",
   *         slug: "american-muscle",
   *         logo: "http://visionwheel.s3.amazonAWS.com/pages/brands/wheels/AmericanMuscle.svg",
   *         description: null,
   *         image: {
   *             list: [{
   *                 "src": "https://visionwheel.s3.amazonAWS.com/wheels/vision-hd/vision_181_heavy_hauler_dualie_chrome_front_std_hires.jpg",
   *                 "finish": "Chrome"
   *             }, {
   *                 "src": "https://visionwheel.s3.amazonAWS.com/wheels/vision-hd/181_19.5x6.75_MBF2.jpg",
   *                 "finish": "Matte Black"
   *             }, {
   *                 "src": "https://visionwheel.s3.amazonAWS.com/wheels/vision-hd/vision_181_heavy_hauler_dualie_machined_clear_coat_front_std_hires.jpg",
   *                 "finish": "Machined"
   *             }]
   *         }
   *     }]
   * }
   */

  /**
   *
   */
  search: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}

    /**
     * @type {Array}
     * @description Default to `["name", "description"]`
     */
    parameters.columns = ["name", "description"]

    /** Check if `options.columns` has been passed. If so, override the defaults. */
    if (options && options.columns) {
      parameters.columns = options.columns
      delete options.columns
    }

    /** Validate that a Term has been provided. */
    if (!parameters.term) {
      let err = Helprs.err("No Search Term Provided", {
        statusCode: 1003,
        paramaters: parameters
      })
      return deferred.reject(err)
    }

    __globalSearch(parameters)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()

    return deferred.promise
  },

  /**
   * Method to search for Brands based on the passed in term.
   * @param   {Object}  parameters  Parameter properties that contain the term to search by.
   * @example <caption>Example Usage of the Parameters Object</caption>
   * {
   *     term: "Vision"
   * }
   * @param   {Object}  options     Optional Options Object that modify the search behavior.
   *                                Currently, options only expects one property which is columns.
   *                                The columns property states which columns to search the term for.
   *                                Default is set to ["name", "description"], so the search query will
   *                                execute against the name and description columns.
   * @example <caption>Example Usage of the Options Object</caption>
   * {
   *     columns: ["name"]
   * }
   * @return  {Array}               Returns an array of all brands with the word 'Vision' in their name or description.
   * @example <caption>Example of the Returning Array</caption>
   * [{
   *     id: 52,
   *     type: "wheel",
   *     name: "Vision Wheel",
   *     slug: "vision-wheel",
   *     logo: "http://visionwheel.s3.amazonAWS.com/pages/brands/wheels/VisionWheel.svg",
   *     description: "Browse our full selection of ATV tires designed for the performance you want on your chosen terrain.",
   *     image: {
   *         hero: "http://visionwheel.s3.amazonAWS.com/pages/brands/wheels/Headerimage_VisionWheelHD.jpg"
   *     }
   * }]
   */
  searchBrands: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}

    /**
     * @type {Array}
     * @description Default to `["name", "description"]`
     */
    parameters.columns = ["name", "description"]

    /** Check if `options.columns` has been passed. If so, override the defaults. */
    if (options && options.columns) {
      parameters.columns = options.columns
      delete options.columns
    }

    /** Validate that a Term has been provided. */
    if (!parameters.term) {
      let err = Helprs.err("No Search Term Provided", {
        statusCode: 1003,
        paramaters: parameters
      })
      return deferred.reject(err)
    }

    Brand.search(parameters, options)
      .then(function (response) {
        let resObject = null
        if (_.isObject(response)) {
          resObject = _.clone(response)
          if (response.records) response = response.records
        }

        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()

    return deferred.promise
  },

  /**
   * Method to search for Items based on the passed in term.
   * @param   {Object}  parameters  Parameter properties that contain the term to search by.
   * @example <caption>Example Usage of the Parameters Object</caption>
   * {
   *     term: "17X9"
   * }
   * @param   {Object}  options     Optional Options Object that modify the search behavior.
   *                                Currently, options only expects one property which is columns.
   *                                The columns property states which columns to search the term for.
   *                                Default is set to ["part_number", "upc", "specification"], so the search query will
   *                                execute against the name and description columns.
   * @example <caption>Example Usage of the Options Object</caption>
   * {
   *     columns: ["name"]
   * }
   * @return  {Array}               Returns an array of all brands with the word 'Vision' in their name or description.
   * @example <caption>Example of the Returning Array</caption>
   * [{
   *     id: 52,
   *     type: "wheel",
   *     upc: "886821066629",
   *     part_number: "375H7883GBMF25",
   *     specification: {"bs": 5.75, "cap": "C375-6C", "pcd": 83, "size": "17X8.5", "brand": "Vision Off-Road", "model": "375 Warrior", "style": "375 Warrior", "width": 8.5, "finish": "Gloss Black Machined Face", "offset": 25, "diameter": 17, "hub_bore": 106.2, "load_rating": 2400, "production_line": "Vision Off-Road", "boltpattern1_inches": "6-5.5", "boltpattern1_metric": "6-139.7", "boltpattern2_inches": "", "boltpattern2_metric": ""},
   *     description: null,
   *     image: {"list": []},
   *     inventory: {"AB": 24, "AL": 200, "CA": 200, "IN": 127, "ON": 34, "TX": 200, "US": 727, "CAD": 58}
   * }]
   */
  searchItems: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}

    /**
     * @type {Array}
     * @description Default to `["name", "description"]`
     */
    parameters.columns = ["part_number", "upc", "specification"]

    /** Check if `options.columns` has been passed. If so, override the defaults. */
    if (options && options.columns) {
      parameters.columns = options.columns
      delete options.columns
    }

    /** Validate that a Term has been provided. */
    if (!parameters.term) {
      let err = Helprs.err("No Search Term Provided", {
        statusCode: 1003,
        paramaters: parameters
      })
      return deferred.reject(err)
    }

    Item.search(parameters, options)
      .then(function (response) {
        let resObject = null
        if (_.isObject(response)) {
          resObject = _.clone(response)
          if (response.records) response = response.records
        }

        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()

    return deferred.promise
  },

  /**
   *
   */
  searchNAVXRefs: function (parameters, options) {
    return MSSQL.searchXRefs(parameters, options)
  },
  /**
   * Method to search for Products based on the passed in term.
   * @param   {Object}  parameters  Parameter properties that contain the term to search by.
   * @example <caption>Example Usage of the Parameters Object</caption>
   * {
   *     term: "Legend"
   * }
   * @param   {Object}  options     Optional Options Object that modify the search behavior.
   *                                Currently, options only expects one property which is columns.
   *                                The columns property states which columns to search the term for.
   *                                Default is set to ["name", "description"], so the search query will
   *                                execute against the name and description columns.
   * @example <caption>Example Usage of the Options Object</caption>
   * {
   *     columns: ["name"]
   * }
   * @return  {Array}               Returns an array of all brands with the word 'Vision' in their name or description.
   * @example <caption>Example of the Returning Array</caption>
   * [{
   *     id: 52,
   *     type: "wheel",
   *     name: "141 Legend 5",
   *     slug: "american-muscle",
   *     logo: "http://visionwheel.s3.amazonAWS.com/pages/brands/wheels/AmericanMuscle.svg",
   *     description: null,
   *     image: {
   *         list: [{
   *             "src": "https://visionwheel.s3.amazonAWS.com/wheels/vision-hd/vision_181_heavy_hauler_dualie_chrome_front_std_hires.jpg",
   *             "finish": "Chrome"
   *         }, {
   *             "src": "https://visionwheel.s3.amazonAWS.com/wheels/vision-hd/181_19.5x6.75_MBF2.jpg",
   *             "finish": "Matte Black"
   *         }, {
   *             "src": "https://visionwheel.s3.amazonAWS.com/wheels/vision-hd/vision_181_heavy_hauler_dualie_machined_clear_coat_front_std_hires.jpg",
   *             "finish": "Machined"
   *         }]
   *     }
   * }, {
   *     id: 52,
   *     type: "wheel",
   *     name: "141 Legend 6",
   *     slug: "american-muscle",
   *     logo: "http://visionwheel.s3.amazonAWS.com/pages/brands/wheels/AmericanMuscle.svg",
   *     description: null,
   *     image: {
   *         list: [{
   *             "src": "https://visionwheel.s3.amazonAWS.com/wheels/american-muscle/vision_142_legend_6_chrome_6_lug_std_1000.jpg",
   *             "finish": "Chrome"
   *         }, {
   *             "src": "https://visionwheel.s3.amazonAWS.com/wheels/american-muscle/141_Legend-5_GM_1000.jpg",
   *             "finish": "Gunmetal"
   *         }, {
   *             "src": "https://visionwheel.s3.amazonAWS.com/wheels/american-muscle/vision_142_legend_6_gunmetal_machine_lip_6_lug_std_1000.jpg",
   *             "finish": "Gunmetal Machined Lip"
   *         }]
   *     }
   * }]
   */
  searchProducts: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    console.log("start model search")
    /**
     * @type {Array}
     * @description Default to `["name", "description"]`
     */
    parameters.columns = ["name", "description"]

    /** Check if `options.columns` has been passed. If so, override the defaults. */
    if (options && options.columns) {
      parameters.columns = options.columns
      delete options.columns
    }
    parameters.term = "search"
    console.log("model search params", parameters)
    /** Validate that a Term has been provided. */
    if (!parameters.term) {
      console.log("term error")
      let err = Helprs.err("No Search Term Provided", {
        statusCode: 1003,
        paramaters: parameters
      })
      return deferred.reject(err)
    }
    console.log("before search")
    Product.search(parameters, options)
      .then(function (response) {
        let resObject = null
        if (_.isObject(response)) {
          resObject = _.clone(response)
          if (response.records) response = response.records
        }

        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()

    return deferred.promise
  },

  /**
   *
   */
  searchProductList: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    ProductList.search(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   * Used to search brands by their description.
   * Returns all brands with the term provided in their description.
   *
   * @param   {Object}  parameters  Parameter containing the term to search by.
   * @example <caption>Example Usage of the Parameters Object</caption>
   * {
   *     term: "provides the perfect look"
   * }
   * @param   {Object}  options     Additional Options that may be defined later in dev.
   *
   * @return  {Object}              Initially, Returns a Deferred Promise Object
   */
  searchBrandsByDescription: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    options.columns = ["description"]
    this.searchBrands(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   * Used to search brands by their name.
   * Returns all brands with the term provided in their name.
   *
   * @param   {Object}  parameters  Parameter containing the term to search by.
   * @example <caption>Example Usage of the Parameters Object</caption>
   * {
   *     term: "milanni"
   * }
   * @param   {Object}  options     Additional Options that may be defined later in dev.
   *
   * @return  {Object}              Initially, Returns a Deferred Promise Object
   */
  searchBrandsByName: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    options.columns = ["name"]
    this.searchBrands(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   * Used to search brands by their type.
   * Returns all brands with the term provided in their type.
   *
   * @param   {Object}  parameters  Parameter containing the term to search by.
   * @example <caption>Example Usage of the Parameters Object</caption>
   * {
   *     term: "wheel"
   * }
   * @param   {Object}  options     Additional Options that may be defined later in dev.
   *
   * @return  {Object}              Initially, Returns a Deferred Promise Object
   */
  searchBrandsByType: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    options.columns = ["type"]
    this.searchBrands(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   * Used to search products by their name.
   * Returns all products with the term provided in their name.
   *
   * @param   {Object}  parameters  Parameter containing the term to search by.
   * @example <caption>Example Usage of the Parameters Object</caption>
   * {
   *     term: "legend"
   * }
   * @param   {Object}  options     Additional Options that may be defined later in dev.
   *
   * @return  {Object}              Initially, Returns a Deferred Promise Object
   */
  searchProductsByName: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    options.columns = ["name"]
    this.searchProducts(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   * Used to search products by their type.
   * Returns all products with the term provided in their type.
   *
   * @param   {Object}  parameters  Parameter containing the term to search by.
   * @example <caption>Example Usage of the Parameters Object</caption>
   * {
   *     term: "wheel"
   * }
   * @param   {Object}  options     Additional Options that may be defined later in dev.
   *
   * @return  {Object}              Initially, Returns a Deferred Promise Object
   */
  searchProductsByType: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    options.columns = ["type"]
    this.searchProducts(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   * Used to search product list by their description.
   * Returns all product list with the term provided in their description.
   *
   * @param   {Object}  parameters  Parameter containing the term to search by.
   * @example <caption>Example Usage of the Parameters Object</caption>
   * {
   *     term: "wheel"
   * }
   * @param   {Object}  options     Additional Options that may be defined later in dev.
   *
   * @return  {Object}              Initially, Returns a Deferred Promise Object
   */
  searchProductListByDescription: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    options.columns = ["description"]
    this.searchProductList(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   * Used to search product list by their name.
   * Returns all product list with the term provided in their name.
   *
   * @param   {Object}  parameters  Parameter containing the term to search by.
   * @example <caption>Example Usage of the Parameters Object</caption>
   * {
   *     term: "milanni"
   * }
   * @param   {Object}  options     Additional Options that may be defined later in dev.
   *
   * @return  {Object}              Initially, Returns a Deferred Promise Object
   */
  searchProductListByName: function (parameters, options) {
    let deferred = Q.defer()
    parameters = parameters || {}
    options = options || {}
    options.columns = ["name"]
    this.searchProductList(parameters, options)
      .then(function (response) {
        deferred.resolve(response)
      })
      .fail(function (err) {
        deferred.reject(err)
      })
      .done()
    return deferred.promise
  },

  /**
   * Used to send the Password Reset Email to the user.
   * It generates the hash for the login record in question and updates the login record.
   * @param   {String}  userEmail  Email Address where we will be sending the password reset email.
   * @param   {String}  resetUrl   The URL Link the user will need to click on to reset their password.
   * @return  {Object}             Depending on the state of the promise which will
   *                               result in an Error Object or an Object Representing
   *                               the updated Login Record.
   */
  sendPasswordResetEmail: function (userEmail, resetUrl) {
    return User.findOne({ email: userEmail }).then((user) => {
      /**
       * @type {String}
       * @description We hash the Reset ID to make it Unique
       */
      let hashed_reset_id = Helprs.guid()
      resetUrl = resetUrl + "/" + hashed_reset_id
      return EmailController.sendPasswordResetEmail(user, resetUrl).then((emailDataResponse) => {
        log("Email Sent Successfully")
        /** Just before Resolving, we save the `hashed_reset_id` on the User's Login Record */
        return Login.save({ id: user.login_id, hashed_reset_id: hashed_reset_id }).then((savedLogin) => {
          emailDataResponse.success = true
          log(emailDataResponse)
          return emailDataResponse
        })
      })
    })
  },

  /**
   *
   */
  sendContactEmail: function (contactMessage) {
    return AWS.sendEmail(
      "sales@visionwheel.com",
      contactMessage.subject,
      contactMessage.name + "\r\r\r\r" + contactMessage.email + "\r\r\r\r" + contactMessage.message
    )
  },

  /**
   *
   */
  sendOrderEmail: function (orderID, options, renderEmail) {
    // return this.findSale({id: orderID})
    return this.getOrderById(orderID).then((order) => {
      return EmailController.sendOrderEmail(order[0], options, renderEmail)
    })
  },

  /**
   *
   */
  sendUsernameRecoveryEmail: function (user) {
    return EmailController.sendUsernameRecoveryEmail(user)
  },

  /**
   *
   */
  // deprecated: moved to Checkout Repository
  updateDealer: function (parameters) {
    return Dealer.update(parameters)
  },

  /**
   *
   */
  updateLogin: function (parameters) {
    return Login.update(parameters)
  },

  /**
   *
   */
  updateProduct: function (productUpdateObj) {
    if (!productUpdateObj.id) {
      throw Error("Cannot update product without ID param")
    }
    return Product.save(productUpdateObj)
  },

  /**
   *
   */
  updateUser: function (parameters) {
    if (parameters.id === undefined) throw new Error("Missing User Id")
    return User.update(parameters)
  },

  /**
   *
   */
  updateUserProfile: function (userId, profileUpdateData) {
    // Not used for the time being till we sort out how to handle multi user
    // company_name_1 : profileUpdateData.company_name_1,
    // company_name_2 : profileUpdateData.company_name_2,
    let updateData = {
      id: userId,
      address_1: profileUpdateData.address_1,
      address_2: profileUpdateData.address_2,
      city: profileUpdateData.city,
      state: profileUpdateData.state,
      zip: profileUpdateData.zip,
      phone_number: profileUpdateData.phone_number,
      email: profileUpdateData.email
    }
    return User.update(updateData)
  },

  /**
   *
   */
  updateUserSalesRep: function (userId, newSalesRepId) {
    return User.update({ id: userId, sales_rep: newSalesRepId })
  },

  /**
   *
   */
  updateSale: function (parameters) {
    // console.log('update params',parameters)
    return Sale.update(parameters)
  },

  /**
   *
   */
  updateSaleItem: function (parameters) {
    return SaleItem.update(parameters)
  },

  /**
   *
   */
  validateAndResetPasswordByLoginId: function (loginId, current, newPassword) {
    let deferred = Q.defer()

    let that = this
    this.findLogin({ id: loginId })
      .then(function (login) {
        if (!Crypt.compare(current, login.password_hash)) {
          let err = new Error("Invalid Login: Incorrect Password")
          err.statusCode = 401
          err.args = {
            loginId: loginId,
            current: current,
            newPassword: newPassword
          }
          log(err)
          return deferred.reject(err)
        }

        that
          .updateLogin({ id: loginId, password_hash: Crypt.encode(newPassword).token })
          .then((updatedLogin) => {
            log(updatedLogin)
            deferred.resolve(updatedLogin)
          })
          .catch((err) => {
            log("Issue updating login: %O", err)
            deferred.reject(err)
          })
      })
      .fail(function (err) {
        log("Issue finding login: %O", err)
        deferred.reject(err)
      })
      .done()

    return deferred.promise
  }
}

/** @module VWModel */
module.exports = VWModelObject;

/**
 * @private
 * @description
 * This method is being used privately by `submitPurchaseOrder`.
 * By the time this method resolves the following steps have successfully executed:
 *     1.)  A new sale has been created on postgres.
 *     2.)  All sale items pertaining to the new created sale have been saved
 *             and created on the `sale_item` table in postgres.
 * @param   {Object}  parameters  Sale information to be saved.
 * @param   {Object}  saleItems   Sale items to be saved for this sale in question.
 * @return  {Array}              An array of all resolved promises.
 */
function __createPO(parameters, options) {
    let deferred = Q.defer();

    log("PO Submission Parameters: %O", parameters);
    log("PO Submission Options: %O", options);

    VWModelObject.saveSale(parameters).then(function (savedSale) {
        log("Created Postgres Sale Record: %O", savedSale);

        let warehouses = options.warehouses;
        let totals = options.totals;
        let saleItems = {};
        let states = _.allKeys(warehouses);
        let lineItemCount = 0;

        for (let r = 0; r < states.length; r++) {
            let state = states[r];
            let info = warehouses[state];
            let items = info.items;

            /**
             * Retrieves the Tax Rates from the shippingRates.
             * @example
             * {"from":"AL","to":"91367","items":[{"type":"wheel","size":20,"qty":2}],"totalCost":84,"taxrate":9,"taxtotal":7.56}
             * @type  {Object}
             */
            let rates = null;
            if (_.has(totals, 'shippingRates')) {
                for (let c = 0; c < totals.shippingRates.length; c++) {
                    rates = totals.shippingRates[c];
                    if (rates.from === state)
                        break;
                }
            }

            for (let t = 0; t < items.length; t++) {
                let item = items[t];
                let itemId = (item.item) ? item.item.id : item.id;

                lineItemCount++;
                item.lineItem = lineItemCount;
                item = __parseWarehouseSaleItem(item, state, info, rates);

                if (!_.has(saleItems, itemId))
                    saleItems[itemId] = [];

                saleItems[itemId].push(item);
            }
        }

        log("Parsed Sale Items to save in Postgres: %O", saleItems);

        let webOrder = {
            savedSale: savedSale,
            saleItems: saleItems
        };

        __parseSaleItemsSave(savedSale, saleItems).then(function (response) {
            webOrder.savedSaleItems = response;
            deferred.resolve(webOrder);
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise;
}
/** @private */
function __parseLocationHeaders(parameters, options) {
    let user = parameters.user;
    let locations = [];
    let warehouses = options.warehouses;
    let savedSale = options.savedWebOrder.savedSale;
    let savedSaleItems = options.savedWebOrder.savedSaleItems;
    let shippingTotalsPerLocation = options.shippingTotalsPerLocation;

    let created = savedSale.created;
    let customer_info = savedSale.customer_info;
    let customer_billing_info = savedSale.customer_billing_info;
    let ship_to_info = savedSale.ship_to_info;
    let payment = savedSale.payment;
    let web_order_number = savedSale.web_order_number;
    let web_master_order_number = web_order_number.replace(/-/g, "").trim();
    let line_num_counter = 0;

    let toDecimalRegex = /[^0-9\.]+/g;
    let posubmissiontracker = {
        headers: 0,
        lineitems: 0
    };
    let CCDetails = {
        ccStatus: null,
        ccAuthCode: null,
        ccAuthDate: null
    };

    // Try to get the ship to country from the user if it isn't set
    // and use US if nothing can be found
    if (typeof ship_to_info.country === 'undefined') {
        console.log('VWModel.__parseLocationHeaders - adding ship_to_info.country as it was missing');
        if (user && user.country) {
            ship_to_info.country = user.country;
        }
    }

    /**
     * Correct UTC Created Time from Postgres
     * http://stackoverflow.com/questions/10797720/postgresql-how-to-render-date-in-different-time-zone
     * let cstCreated = Moment(created).utcOffset("-06:00:00");
     */
    // let userOffset = created.getTimezoneOffset() * 60 * 1000; // offset time
    // let centralOffset = 6 * 60 * 60 * 1000; // 6 for central time
    // created = new Date(created.getTime() - centralOffset); // redefine variable

    // let orderDate = created.getDate() + "-" + (created.getMonth() + 1) + "-" + created.getFullYear()
    // log("Created Date in CST: Date: %s, Time: %s", orderDate, );
    created = __calcTime(created);
    log("Datetime in CST: %s", created.toLocaleString())

    /** Check if the PO was payable and a Stripe Transaction took place */
    if (payment.payment_method === "CREDIT CAR") {
        /** ONLY log this during 'development' environment */
        log("Verified Stripe CC Transaction");
        /** If so, add all CC Information to submit to NAV */
        CCDetails.ccStatus = payment.CCStatus;
        CCDetails.ccAuthCode = payment.CCAuthCode;
        /** 
         * @type {Number|Timestamp}
         * @description Convert the CCAuthDate from timestamp to formatted 
         */
        CCDetails.ccAuthDate = Moment(payment.CCAuthDate * 1000).format("DD-MM-YYYY");
        log("These CC details will be added to the Headers: %o", CCDetails);
    }

    for (let state in warehouses) {
        if (warehouses.hasOwnProperty(state)) {
            let warehouse = warehouses[state];
            let whDetails = warehouse.details;
            let whItems = warehouse.items;
            let whLocationCode = whDetails.locationCode;

            let shippingtotal;
            if (shippingTotalsPerLocation) {
                shippingtotal = shippingTotalsPerLocation.filter(function (wh) {
                    return wh.from === state;
                })[0].totalCost;
            }

            shippingtotal = shippingtotal ? shippingtotal : 0;
            log("Shipping Total for %s is %d", state, shippingtotal);

            let locationPO = {
                header: null,
                lines: []
            };

            let shipping_agent = "ups";
            let shipping_method = warehouse.method;
            let eship_agent_service_code = "ground";
            if (!_.isEmpty(warehouse.option)) {
                if (warehouse.option === "2 day")
                    warehouse.option = "2nd day";
                eship_agent_service_code = warehouse.option;
                if (info.option === "2nd day" || "overnight")
                    shipping_method = "expedited";
            }
            if (shipping_method === "ltl")
                shipping_agent = "ltl";
            else if (shipping_method === "pickup") {
                eship_agent_service_code = shipping_agent = "cpu";
                shipping_method = "pickup cpu";
            }

            let location = {
                docNum: web_order_number + "-" + whDetails.locationCode,
                docType: 0,
                orderDate: created.getDate() + "-" + (created.getMonth() + 1) + "-" + created.getFullYear(),
                externalDocNum: parameters.po_number,
                locationCode: whLocationCode,
                customerNum: parameters.customer_id.toString(),
                shipToName: customer_billing_info.customer_name,
                shipToAddress: ship_to_info.address_1,
                shipToAddress2: ship_to_info.address_2,
                shipToPostCode: ship_to_info.zip,
                shipToCity: ship_to_info.city,
                shipToCounty: ship_to_info.state,
                shipToCountryCode: ship_to_info.country,
                addShipToCodeToNAV: 0,
                shippingAgent: shipping_agent,
                shipmentMethod: shipping_method,
                eShipAgentService: eship_agent_service_code,
                paymentMethod: payment.payment_method,
                freightTotal: Number(shippingtotal),
                totalDiscountAmount: Number((savedSale.total_discount_amount || 0).replace(toDecimalRegex, "")),
                taxAmount: Number(savedSale.tax_amount.replace(toDecimalRegex, "")),
                totalInvoiceAmount: Number(savedSale.total_invoice_amount.replace(toDecimalRegex, "")),
                websiteUserEmailAddress: customer_info.email,
                customerPhone: customer_info.phone,
                storeNo: parameters.ship_to_info.store_number,
                webmasterOrderNum: web_master_order_number
            };

            /** Extend with the CC Details */
            if (location.paymentMethod === "CREDIT CAR")
                location = _.extend(location, CCDetails);

            locationPO.header = location;
            posubmissiontracker.headers++;

            for (let z = 0; z < whItems.length; z++) {
                let whItem = whItems[z];
                let savedSaleItem = null;

                for (let q = 0; q < savedSaleItems.length; q++) {
                    savedSaleItem = savedSaleItems[q];
                    if (savedSaleItem.applied)
                        continue;

                    if (savedSaleItem.item_no === whItem.item.part_number) {
                        savedSaleItem.applied = true;
                        break;
                    }
                }
                line_num_counter++;

                let line_item = {
                    docNum: location.docNum,
                    docType: 0,
                    lineNum: line_num_counter,
                    itemNum: savedSaleItem.item_no,
                    qty: savedSaleItem.qty,
                    unitPrice: Number(savedSaleItem.unit_price.replace(/[^0-9\.]+/g, "")),
                    taxAmount: Number(savedSaleItem.tax_amount.replace(/[^0-9\.]+/g, "")),
                    totalLineAmount: Number(savedSaleItem.total_line_amount.replace(/[^0-9\.]+/g, "")),
                    eCommLineType: 0
                };

                locationPO.lines.push(line_item);
                posubmissiontracker.lineitems++;
            }

            locations.push(locationPO);
        }
    }

    log("Total PO Submission Count: %o", posubmissiontracker);

    return locations;
}
/** 
 * @memberOf module:VWModel
 * @private 
 */
function __findSaleItems(sale) {
    let deferred = Q.defer();

    sale.sale_items = {};
    /** Find `sale_items` associated with this Sale's ID. */
    VWModelObject.findSaleItems({ sale_id: sale.id }).then(function (saleItems) {
        /**
         * If we found `sale_items` with the associated `sale.id`, we
         * append them to the `sale.sale_items` object as hashes. Else
         * we just keep it as an empty object indicating no Items.
         *
         * However, empty items should never happen. That means there is a
         * bug somewhere. A sale can not occur without items.
         */
        if (saleItems.length) {
            for (let f = 0; f < saleItems.length; f++) {
                let saleItem = saleItems[f];
                let saleItemId = saleItem.id;
                delete saleItem.id;
                sale.sale_items[saleItemId] = _.extend({}, saleItem);
            }
            deferred.resolve(sale);
        } else {
            deferred.resolve(sale);
        }
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise;
}

/** 
 * @memberOf module:VWModel
 * @private 
 */
function __validateCredentials(parameters) {
    /** Confirm email */
    if (!parameters.email) throw new Error('No Email was Provided');
    let regx = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
    if (!regx.test(parameters.email)) throw new Error('Email Is Not Valid');
    /** Confirm passwords */
    if (!parameters.password) throw new Error('No Password was Provided');
    if (!parameters.confirm_password) throw new Error('Password Was Not Confirmed');
    if (parameters.password !== parameters.confirm_password) throw new Error('Passwords Do Not Match');
    /** Now we confirm with the email already exist in our DB. */
    return User.count({ email: parameters.email })
        .then(response => { throw new Error('Email already exists') })
        .catch(err => parameters)
        .then(parameters => {
            /** When dealers signup, account is created immediately with a “pending” status. */
            let userAccount = _.pick(parameters, 'first_name', 'last_name', 'phone_number', 'email', 'address_1');
            userAccount.role = 'owner';
            userAccount.status = 'pending';
            userAccount.city = parameters.city ? parameters.city.toString().trim() : null;
            userAccount.state = parameters.state ? parameters.state.toString().trim() : null;
            userAccount.zip = parameters.postal ? parameters.postal.toString().trim() : null;
            userAccount.country = parameters.country ? parameters.country.toString().trim() : null;
            userAccount.comments = parameters.comments ? parameters.comments.toString().trim() : null;
            userAccount.address_2 = parameters.address_2 ? parameters.address_2.toString().trim() : null;
            userAccount.cart = {
                items: {}
            };
            userAccount.shipping_config = {
                defaultLocationCode: '02'
            };
            return {
                parameters: parameters,
                userAccount: userAccount
            };
        });
}

/** 
 * @memberOf module:VWModel
 * @private 
 */
function __handleDealerSignup(data) {
    let parameters = data.parameters;
    if (!data.parameters.customer_number) throw new Error('No Dealer ID was Provided');
    log('Checking if Dealer ID (%s) exist in DB', colors.green(data.parameters.customer_number));
    return Dealer.findDealer({ nav_customer_id: data.parameters.customer_number })
        .then(dealer => {
            data.dealer = dealer;
            return data;
        });
}

/** 
 * @memberOf module:VWModel
 * @private 
 */
function __handleSaveUser(parameters) {
    log('Checking if User Already in DB: %O', parameters);
    return User.findUser(parameters)
        .catch(err => {
            if (err.message === 'User Not Found') {
                log('User doesnt exist. Creating the User Record.');
                return User.save(parameters);
            }
            throw err;
        });
}
/** 
 * @memberOf module:VWModel
 * @private 
 * @description
 * Parses the info to create a `sale_item` with the required postgres
 * schema.
 * @param   {type}  item          [description]
 * @param   {type}  state         [description]
 * @param   {type}  stateDetails  [description]
 * @return  {type}                [description]
 */
function __parseWarehouseSaleItem(item, state, info, rates) {
    let stateDetails = info.details;
    let qty = item.quantity;
    let lineItem = item.lineItem;
    if (item.item)
        item = item.item;

    let unit_price = item.price.dealer || item.price.retail;
    let total_line_amount = parseFloat(unit_price) * qty;
    total_line_amount = __parseDecimalPricing(total_line_amount);

    let taxRate = rates ? rates.taxrate : 0;
    let taxAmount = (taxRate / 100) * unit_price;
    taxAmount = __parseDecimalPricing(taxAmount);

    let shipping_agent = "UPS";
    let shipping_method = info.method;
    let eship_agent_service_code = "GROUND";

    if (!_.isEmpty(info.option)) {
        if (info.option === "2 day")
            info.option = "2nd day";
        eship_agent_service_code = info.option;
        if (info.option === "2nd day" || "overnight")
            shipping_method = "expedited";
    }

    if (shipping_method === "ltl")
        shipping_agent = "ltl";
    else if (shipping_method === "pickup") {
        eship_agent_service_code = shipping_agent = "cpu";
        shipping_method = "pickup cpu";
    }

    let item_description = {
        product_name: item.specification.model,
        size: item.specification.size,
        finish: item.specification.finish,
        line_item_number: lineItem
    };
    /** 
     * @type {String} 
     * @description Set the Item's Image. This shouldbe only one image. 
     */
    if (item.image && item.image.list)
        item_description.image = item.image.list[0];

    let fulfilment_location = {
        code: state,
        name: stateDetails.name,
        address: stateDetails.address,
        city: stateDetails.city,
        state: stateDetails.state,
        postal: stateDetails.postal
    };

    let shipping_options = {
        shipped: false,
        delivery_type: "commercial",
        shipping_agent: "",
        shipping_method: shipping_method,
        eship_agent_service_code: eship_agent_service_code
    };

    let sale_item = {};
    sale_item.customer_item_no = "";
    sale_item.tax_amount = taxAmount;
    sale_item.item_no = item.part_number;
    sale_item.qty = qty;
    sale_item.unit_price = unit_price;
    sale_item.total_line_amount = total_line_amount;
    sale_item.item_description = item_description;
    sale_item.fulfilment_location = fulfilment_location;
    sale_item.shipping_options = shipping_options;

    return sale_item;
}

/** 
 * @memberOf module:VWModel
 * @private 
 */
function __parseSaleItemsSave(savedSale, saleItems) {
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

                let promise = VWModelObject.saveSaleItem(newSaleItem);
                promises.push(promise);
            }
        }
    }

    Q.allSettled(promises).then(function (results) {
        let isError = false,
            errorResult, resolvedValues = [];
        results.forEach(function (result) {
            if (result.state !== 'fulfilled') {
                isError = true;
                errorResult = result;
            } else {
                resolvedValues.push(result.value);
            }
        });
        if (isError) {
            log(errorResult.reason);
            errorResult.message = errorResult.reason;
            deferred.reject(errorResult);
        } else {
            deferred.resolve(resolvedValues);
        }
    }).done();

    return deferred.promise;
}

/** 
 * @memberOf module:VWModel
 * @private 
 */
function __validateSalesrepCode(parameters) {
    //console.log(colors.yellow(">>> VWModel: Validating the Dealer Selected Salesrep."));
    let deferred = Q.defer();
    let salesrepParameters = {};

    parameters.salesrep = parameters.salesrep || 0;
    if (typeof parameters.salesrep === "string")
        parameters.salesrep = parseInt(parameters.salesrep);
    if (isNaN(parameters.salesrep) || parameters.salesrep === 0) {
        if (parameters.salesrep_firstname)
            salesrepParameters.name = parameters.salesrep_firstname.toUpperCase();
        if (parameters.salesrep_lastname) {
            if (salesrepParameters.name)
                salesrepParameters.name += " " + parameters.salesrep_lastname.toUpperCase();
            else
                salesrepParameters.name = parameters.salesrep_lastname.toUpperCase();
        }
        if (salesrepParameters.name)
            salesrepParameters.name = salesrepParameters.name.trim();
    } else {
        salesrepParameters.code = parameters.salesrep;
    }

    VWModelObject.findSalesrep(salesrepParameters).then(function (salesrep) {
        //console.log(colors.yellow(">>> VWModel: Salesrep was found for Dealer."));
        deferred.resolve(salesrep);
    }).fail(function (err) {
        if (err.errorCode && err.errorCode === 1000) {
            console.log(colors.yellow(">>> VWModel: Unable to Match Dealers Salesrep."));
            deferred.resolve(null);
        } else {
            deferred.reject(err);
        }
    }).done();

    return deferred.promise;
}

/** 
 * @memberOf module:VWModel
 * @private 
 */
function __clearCartAndFindSalesrep(parameters, options) {
    let promises = [
        VWModelObject.clearCart({ id: parameters.user_id }),
        VWModelObject.findSalesrep({ id: options.savedWebOrder.savedSale.salesrep_id })
    ];
    return Q.spread(promises, function (updatedUser, salesrep) {
        let results = {
            updatedUser: updatedUser,
            salesrep: salesrep
        };
        return results;
    });
}

/** 
 * @memberOf module:VWModel
 * @private 
 */
function __saveNavRecords(publishedPO, savedWebOrder) {
    log("Published PO Headers");
    log(publishedPO.header);
    log("Published PO Lines");
    log(publishedPO.lines);

    let savedSale = savedWebOrder.savedSale;
    let savedSaleItems = savedWebOrder.savedSaleItems;

    let updatedSaleItems = savedSaleItems.map(function (savedSaleItem) {
        let matchingItems = publishedPO.lines.filter(function (lineItem) {
            return lineItem["Item No_"] === savedSaleItem.item_no;
        });

        for (let d = 0; d < matchingItems.length; d++) {
            let matchingItem = matchingItems[d];
            if (matchingItem.Quantity !== savedSaleItem.qty)
                continue;

            let tax_amount = savedSaleItem.tax_amount.replace(/\$/g, '');
            tax_amount = parseFloat(tax_amount);
            if (matchingItem['Tax Amount'] !== tax_amount)
                continue;

            let unit_price = savedSaleItem.unit_price.replace(/\$/g, '');
            unit_price = parseFloat(unit_price);
            if (matchingItem['Unit Price'] !== unit_price)
                continue;

            let total_line_amount = savedSaleItem.total_line_amount.replace(/\$/g, '');
            total_line_amount = parseFloat(total_line_amount);
            if (matchingItem['Total Line Amount'] !== total_line_amount)
                continue;

            savedSaleItem.nav_record = matchingItem;
            break;
        }

        if (savedSaleItem.applied)
            delete savedSaleItem.applied;

        return VWModelObject.updateSaleItem(savedSaleItem);
    });

    savedSale.nav_record = {
        headers: publishedPO.header
    };

    let promises = _.union([VWModelObject.updateSale(savedSale)], updatedSaleItems);

    return Q.allSettled(promises);
}

/** 
 * @memberOf module:VWModel
 * @private 
 */
function __globalSearch(parameters) {
    return Q.spread([VWModelObject.searchBrands(parameters), VWModelObject.searchProducts(parameters)], function (brandResults, productResults) {
        let results = {
            brands: brandResults,
            products: productResults
        };
        return results;
    });
}

/** 
 * @memberOf module:VWModel
 * @private 
 */
function __generateWebOrderNumber(options) {
    let deferred = Q.defer();
    if (!options.environment) options.environment = process.env.NODE_ENV;

    // let envCode = '1';
    // if (options.environment === 'qa') envCode = '2';
    // else if (options.environment === 'development') envCode = '3';
    let envCode = '2';
    
    let wons = {
        "Latest Generated Web Order Number": null,
        "New Generated Web Order Number": null
    };

    VWModelObject.getLastWebOrderNumber({ envCode: envCode }).then(function (lastWebOrderNumber) {
        wons["Latest Generated Web Order Number"] = lastWebOrderNumber;
        wons["New Generated Web Order Number"] = webOrderNumber(envCode, lastWebOrderNumber);
        deferred.resolve(wons);

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
    }).fail(function (err) {
        log("Error getting 'lastWebOrderNumber': %O", err);
        wons["New Generated Web Order Number"] = webOrderNumber(envCode);
        deferred.resolve(wons);
    }).done();
    return deferred.promise;
}

/** 
 * @memberOf module:VWModel
 * @private 
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
            max: 9999
        }),
        /** 
         * @type {String}
         * @description Last Web Order Number 
         */
        lst: lastWebOrderNumber || null
    };

    log('Generating WON Codes: %O', codes);

    if (!lastWebOrderNumber) return `${codes.env}${codes.gen}`;
    if (lastWebOrderNumber && lastWebOrderNumber.includes('-')) return `${codes.env}${codes.gen}`;
    if (lastWebOrderNumber && !lastWebOrderNumber.includes('-')) {
        let generatedInt = lastWebOrderNumber.slice(1);
        for (state in warehousesJSON) {
            if (warehousesJSON.hasOwnProperty(state)) {
                let lc = warehousesJSON[state].locationCode;
                if (!generatedInt.includes(lc)) continue;
                generatedInt = generatedInt.replace(lc, '');
                generatedInt = parseInt(generatedInt);
                generatedInt++;
                return `${codes.env}${generatedInt}${lc}`;
            }
        }
    }
}

/** 
 * @memberOf module:VWModel
 * @private 
 * @description
 * Private method that converts your decimal to a currency standard value.
 * @param   {Number|Decimal}  pricing   The value to be formatted to 'US' Currency.
 * @return  {String}                    The US Currency Standard formatted value
 */
function __parseDecimalPricing(pricing) {
    if (typeof pricing !== 'string')
        pricing = pricing.toString();
    return parseFloat(Math.round(pricing * 100) / 100).toFixed(2);
}

/** 
 * @memberOf module:VWModel
 * @private 
 */
function __decimalPlaces(num) {
    let numStr = num;

    if (typeof numStr !== "string")
        numStr = numStr.toString();

    if (numStr.indexOf(".") < 0)
        return 0;

    let pieces = numStr.split(".");
    return pieces[1].length;
}

/** 
 * @memberOf module:VWModel
 * @private 
 */
function __startDebugTimer(note) {
    start = process.hrtime();
    return note;
}

/** 
 * @memberOf module:VWModel
 * @private 
 */
function __endDebugTimer(note) {
    let precision = 3; // 3 decimal places
    let elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
    start = process.hrtime(); // reset the timer
    note = "'VWModel." + note + "()'";
    return "Method Execution Time: " + note + " " + process.hrtime(start)[0] + " s, " + elapsed.toFixed(precision) + " ms";
}
/** 
 * @memberOf module:VWModel
 * @private 
 * @description
 * function to calculate local time in a different city
 * given the city's UTC offset
 * @param   {type}  city    [description]
 * @param   {type}  offset  [description]
 * @return  {type}          [description]
 */
function __calcTime(dateObj) {
    let offset = "-06";
    // create Date object for current location
    let d = dateObj || new Date();

    // convert to msec
    // add local time zone offset
    // get UTC time in msec
    let utc = d.getTime() + (d.getTimezoneOffset() * 60000);

    // create new Date object for different city
    // using supplied offset
    return new Date(utc + (3600000 * offset));
}

/** 
 * @memberOf module:VWModel
 * @private 
 */
function __getDefaultLocationCode(dealer, options) {
    let keys = _.allKeys(options.mssqlDatabase.locationCodes);
    for (key of keys) {
        if (options.mssqlDatabase.locationCodes[key] !== dealer.profile.tax_area_code)
            continue;
        return key;
    }
    return '0';
}