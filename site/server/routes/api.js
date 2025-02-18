var express = require('express'),
	debug = require("libs/buglog"),
    log = debug("routes", "api"),
    zipcodes = require('zipcodes'),
    colors = require('libs/colors'),
    allowedIPs = ['::ffff:172.17.0.1','::ffff:68.49.23.196'],
    emailController = require('controllers/email'),
    authKey = "A5BC74BB8CD4AA86",
    warehouseList = require('config/settings/warehouses'),
    apiUsers = require('config/settings/apiUsers'),
    router = express.Router();

    // validate request
    router.use( "*", function( req, res, next ) {
        res.setTimeout(50000, function(){
            console.log('Request has timed out.');
                res.sendStatus(408);
            });
        if (req.body.AuthKey === authKey || req.query.AuthKey  === authKey) {
            next();
        } else {
            res.status(403).render('403');
            return
        };
    });

    router.post("/inventoryhold", function (req, res) {
        var body = req.body;
        var VWModel = req.VWModel;
        var userId = body.BillingLocation;

        //Get user email from api users file
        var userObj = apiUsers.find(x => x.id == userId);
        if (userObj) {
            var userParams = {email: userObj.email};
            //set user's dealer to dealer from api users file, default to dtd. 
            var userDealer = userObj.dealer || "DTD";
        }
        
        var userCart = {items: {} };
        var userCartItems = {};
        var partNums = body.RequestList;
        var warehouse = body.WarehouseCode;
        var totalQuant = 0;
        
        //split first name and surname of customer name
        var firstName = "";
        var lastName = "";
        if (body.CustomerName) {
            var nameArr = body.CustomerName.split(" ");
            firstName = nameArr[0]
            nameArr.shift();
            lastName = nameArr.join(" ");
        }

        var orderBody = {
            po_number: body.TempPONumber,
            shipping: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                postalcode: body.CustomerZip,
                address_1: "Pending",
                address_2: "",
                city: "",
                state: "",
                store_number: body.BillingLocation
            })
        }

        //initiate response object
        holdResponse = {
            AuthKey: "",
            CustomerName: body.CustomerName,
            CustomerZip: body.CustomerZip,
            Result: "Success",
            Error: "none",
            TempPONumber: body.TempPONumber,
            WarehouseCode: warehouse,
            WorkOrder: ""
        }

        if (partNums === undefined || partNums.length == 0) {
            partNums.push("");
        }
        VWModel.getOrderByPONumber(orderBody.po_number).then(function (orders) {
            if (orders.length > 0) {
                console.log("ERROR : Fail : Inventory Hold");
                holdResponse.Error = "Purchase order number already in use";
                holdResponse.Result = "Hold Failed";
                res.status( 500 ).json( holdResponse );
                return;
            }  
            VWModel.getDealerProductsAndSpecifications({
                nav_customer_id: 'DTD',
                userIsDTCUser : false,
                multiplier : null
            }).then(function(response) {
                // Get products by part num if ID is not suplied  
                console.log(JSON.stringify(partNums));        
                if (response) {
                    partNums.forEach(function(toFind, index) {
                        var product = response.items.find(x => x.xref == toFind.Product.ArticleNumber);
                        if (!product) {
                            response.items.find(x => x.part_number == toFind.Product.VendorPartNumber);
                        }
                        var prodID = product.id;
                        var quant = toFind.Product.Quantity;
                        userCartItems[prodID] = {
                            [warehouse]: quant
                        }
                        userCart.items[prodID] = {
                            [warehouse]: quant
                        }
                        console.log("cart",userCart);
                    })
                }
                console.log("cart after",userCart);
                // We need to retrieve the user first by email
                VWModel.findUser(userParams)
                    .then(function(user) { 

                        //If user has no assigned dealer assign Vision Wheel
                        !('dealer' in user) && (user.dealer = { nav_customer_id: userDealer})
                        user.cart = userCart;
                        
                        VWModel.getCartDetails({
                            appSettings: req.appSettings,
                            user: user
                        }).then(function( response ) { 

                            orderBody.warehouses = JSON.stringify(response.props.warehouses);
                            user.cart = { items: userCartItems };
                            user.cartQuantity = totalQuant;
                            user.warehouses = warehouseList;
                            user.warehouse =  {key: warehouse, details: warehouseList[warehouse] };
                            user.isApiOrder = true; 
                            user.salesrep = "API";
                            VWModel.submitPurchaseOrder({
                                appSettings: req.appSettings,
                                body: orderBody,
                                user: user
                            }).then(function( response ) {
                                console.log("REACHED RESPONSE");
                                holdResponse.WorkOrder = response.props.web_order_number;
                                res.status( 200 ).json( holdResponse );
                            }).fail(function( error ) {
                                console.log("ERROR : Fail : Checkout POST /", error);
                                holdResponse.Error = error.message;
                                holdResponse.Result = "Hold Failed";
                                res.status( 500 ).json( holdResponse );
                            }).done();
                        });
                    })
            });
        });
        return
    });
    router.get('/ping/:supplierCode', function (req, res) {

        
              let responseData = {}; 
           responseData.status = 'alive'
          responseData.application = 'dt-supplier-fufillment-api'
          responseData.env = 'dev'
          responseData.version = 'v1'
             res.status( 200 )
                 .json(responseData);
            });
        
    router.get("/inventory", function (req, res) {
        var VWModel = req.VWModel;
        var params = req.query;
        var paramkey = Object.keys(params);
        
        //Process list to isolate zip code
        var warehouseZips = []
        Object.keys(warehouseList).forEach(function (item) { 
            var zip = warehouseList[item].postal;
            //skip if Canada or warehouse not live
            if (!zip.match(/[a-z]/i) && warehouseList[item].isLive) {
                var tempObj = {warehouse: item, zipcode: zip}
                warehouseZips.push(tempObj);
            }
        })

        // validate that all required elements are present
        var containsAll = ['AuthKey','ZipCode','RequestList'].every(i => paramkey.includes(i));
        if (containsAll) {
            var authKey = params.AuthKey,
            zip = params.ZipCode,
            reqList = JSON.parse(params.RequestList)
        } 

        //invoke list of items
        var itemList = [];

        // validate that all required elements of the request list object are present
        reqList.forEach(function(item) {
            var reqListKeys = Object.keys(item);
            if (['ArticleNumber','VendorPartNumber','Quantity'].every(i => reqListKeys.includes(i))) {
                var articleNum = item.ArticleNumber,
                vendorPartNum = item.VendorPartNumber,
                quant = parseInt(item.Quantity)
            } else {
                res
                .status( 500 )
                .send("Incomplete input in request list");
                return
            }
            itemList.push({
                Error: "none",
                ArticleNumber: articleNum,
                VendorPartNumber: vendorPartNum,
                RequestedQty: quant,
                AvailableQty: 0,
                Warehouse: {}
            });
        })

        //Calculate distance between given zip and each wharehouse zip
        warehouseZips.forEach(function(location) {
            var dist = zipcodes.distance(zip,location.zipcode);
            location.dist = dist;
        })

        //Sort warehouse zips
        warehouseZips.sort(function(a, b) {
            return a.dist > b.dist;
        });

        //build response obj 
        invResponse = {
            AuthKey: "",
            ZipCode: zip, 
        }

        console.log(colors.yellow(JSON.stringify(warehouseZips)));

        VWModel.getDealerProductsAndSpecifications({
			nav_customer_id: 'DTD',
			userIsDTCUser : false,
			multiplier : null
		}).then(function( response ) {
            itemList.forEach(function(requestedItem, index) { 
                var item = response.items.find(x => x.xref == requestedItem.ArticleNumber);
                if (!item) {
                    var item = response.items.find(x => x.part_number == requestedItem.VendorPartNumber);
                }
                if (item) {
                    itemList[index].VendorPartNumber = item.part_number;
                    itemList[index].ArticleNumber = item.xref;
                    inventory = [];
                    warehouseZips.forEach(x => inventory.push(item.inventory[x.warehouse]));
                    itemList[index].inventory = inventory;
                } else {
                    itemList[index].Error = "Invalid Article or Vendor Part Number";
                    invResponse.RequestList = itemList;
                    res
                        .status( 200 )
                        .json(invResponse);
                    return;
                }
            });

            var nearestWH = false;
            var nearestInd = 0;
            for (index = 0; index < warehouseZips.length; index++) {
                var noQty = false;
                itemList.forEach(function(prod) {
                    if (prod.inventory[index] < prod.RequestedQty) {
                        noQty = true;
                    }
                });
                if (!noQty) {
                    nearestWH = warehouseZips[index].warehouse;
                    nearestInd = index;
                    break;
                }
            }

            if (nearestWH) {
                itemList.forEach(function (item) {
                    item.AvailableQty = item.inventory[nearestInd];
                    item.Warehouse = {
                        name: warehouseList[nearestWH].name,
                        code: warehouseList[nearestWH].abrev,
                        address: warehouseList[nearestWH].address,
                        city: warehouseList[nearestWH].city,
                        state: warehouseList[nearestWH].abrev,
                        zip: warehouseList[nearestWH].postal
                    }
                    delete item.inventory;
                })
            } else {
                itemList.forEach(function (item) {
                    item.Error = "Entire order cannot be fulfilled by a single warehouse."
                    item.AvailableQty = 0;
                    item.Warehouse = {};
                    delete item.inventory;
                })
            }

            invResponse.RequestList = itemList;
            res
                .status( 200 )
                .json(invResponse);
        })
    
    });

     //update order
     router.post("/assignpo", function (req, res) { 
        var VWModel = req.VWModel;
        var body = req.body;
        var tempPOnum = body.AssignPO.TemporaryPO;
        var permPOnum = body.AssignPO.PermanentPO;
        updateResponse = {
            Status: "success",
            Error: "none",
            PurchaseOrder: tempPOnum,
            CustomerName: body.AssignPO.CustomerInfo.CustomerName,
            Zip: body.AssignPO.CustomerInfo.Zip
        }

        if (!tempPOnum || !permPOnum) {
            updateResponse.Status = "failed"
            updateResponse.Error = "Temporary and/or Permanant PO not provided" 
            res
                .status( 500 )
                .json(updateResponse);
                return;
        }

        if (body.AssignPO.CustomerInfo.BusinessName == null) {
            body.AssignPO.CustomerInfo.BusinessName = "";
        }

        var allFieldsProvided = true;

        function triggerError(unfoundField) {
            updateResponse.Status = "failed"
            updateResponse.Error = "Field: <" + unfoundField + "> not Provided";  
            allFieldsProvided = false;
            res
                .status( 500 )
                .json(updateResponse);
                return;
        }

        var update = {
            po_number: permPOnum,
            ship_to_info: {
                customer_name: body.AssignPO.CustomerInfo.CustomerName || triggerError("Customer Name"),
                phone_number: "",
                store_number: "",
                company_name: body.AssignPO.CustomerInfo.BusinessName || "",
                address_1: body.AssignPO.CustomerInfo.Address1 || triggerError("Address"),
                address_2: body.AssignPO.CustomerInfo.Address2 || "",
                city: body.AssignPO.CustomerInfo.City || triggerError("City"),
                state: body.AssignPO.CustomerInfo.State || triggerError("State"),
                zip: body.AssignPO.CustomerInfo.Zip || triggerError("Zip"),
                temp_po_num: tempPOnum
            },
            transaction_type: 2
        } 

        if (!body.AssignPO.ShipMethod || !body.AssignPO.Shipper) {
            triggerError("Shipper and/or ShipMethod");
        }

        var saleIds = [];
        var shipping_options = {	
            delivery_type:	"commercial",
            shipping_agent:	body.AssignPO.Shipper.toUpperCase(),
            shipping_method: "",
            eship_agent_service_code: body.AssignPO.ShipMethod.toUpperCase(),
        }


        if (!allFieldsProvided) {
            return;
        }

        VWModel.getOrderByPONumber(tempPOnum).then(function (orders) {
            if (orders.length < 1) {
                updateResponse.Status = "failed"
                updateResponse.Error = "Order Not Found" 
                res
                .status( 500 )
                .json(updateResponse);
                return;
            }
            var order = orders.pop();
            update.id = order.id; 
            order.sale_items.forEach(function(sale) {
                saleIds.push(sale.id);
            })

            var webOrderNum = order.web_order_number

            console.log("ORDER",order);
            update.ship_to_info.store_number = order.ship_to_info.store_number;
            var userShipMethod = shipping_options.eship_agent_service_code;

            if (shipping_options.eship_agent_service_code === "2116") {
                if (userShipMethod.includes("GROUND")) {
                    shipping_options.eship_agent_service_code = "GROUND SERVICE";
                } else {
                    shipping_options.eship_agent_service_code = "HOME DELIVERY";
                }
            } else {
                if (userShipMethod.includes("HOME")) {
                    shipping_options.eship_agent_service_code = "HOME DELIVERY";
                }else {
                    shipping_options.eship_agent_service_code = "GROUND SERVICE";
                }
            }

            console.log("METHOD",shipping_options.eship_agent_service_code);

            saleIds.forEach(function(saleId) {
                var updateSaleitem = {
                    id: saleId,
                    shipping_options: shipping_options
                }
                VWModel.updateSaleItem(updateSaleitem);
            });

            VWModel.updateSale(update).then(function(response) {
                update.webOrderNum = webOrderNum
                update.shipping_options = shipping_options; 
                update.test = false;
                updateResponse.PurchaseOrder = update.po_number;
                order.po_number = update.po_number;
                order.ship_to_info = update.ship_to_info;
                order.customer_billing_info.customer_name = update.ship_to_info.customer_name;

                // send order email to Andrew
                emailController.sendOrderEmail(order, {action: "apiPoUpdate",itemNumbers: saleIds, tempPOnum: tempPOnum,permPOnum: permPOnum, user: {}} )
                    
                //Update MSSQL 
                VWModel.assignPO(update);

                //Send Response
                res
                    .status( 200 )
                    .json(updateResponse);
            });
        });
        console.log('assign po complete');
     })

    //Retrieve order status by oprder number
    router.get("/orderstatus", function (req, res) {
        var orderNum = req.query.ordernumber;
        if (!orderNum) {
            res.status(404).send('No Param');
            return
        }
        responseObj = {
            PONumber: orderNum,
            Status: "",
            TemporaryPONumber: "",
            TrackingNumbers: []
        }

        var VWModel = req.VWModel;
        VWModel.getOrderByPONumber(orderNum).then(function( response ) {
            
            order = response.pop();
            if (!order) {
                res.status(500).send('Order not found');
            }
            responseObj.Status = order.status;
            responseObj.PONumber = order.po_number;
            responseObj.TemporaryPONumber = order.ship_to_info.temp_po_num || responseObj.PONumber;
            order.sale_items.forEach(function(item) {
               if (item.shipping_options.tracking_number) {
                   responseObj.TrackingNumbers.push(item.shipping_options.tracking_number);
               }
            });
            

            res
                .status( 200 )
                .json(responseObj)
        })
    });

    //Get Items request for my own reference
    router.get("/test/:weborderid", function (req, res) {
        var VWModel = req.VWModel;
        var update = {};
        update = {};
        update.webOrderNum = req.params.weborderid;
        update.test = true;
        req.setTimeout(5000);

        VWModel.assignPO(update).then(function( response ) {
            res
            .status( 200 )
            .json(response)
            return;
        })
    });

module.exports = {
    Router: router
};