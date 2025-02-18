const debug = require('debug')('importer:model');
const Crypt = require('./helpers/crypt');
const Utility = require('./helpers/utility');
const db = require('./databases/psql');
const config = require('config');

const settings = config.get('importer');
const tracking_settings = config.get('tracking_importer');
const touch = require('touch');

/**
 * Call the appropirate type of import for the passed data,
 * according to the actionType
 *
 * @alias module:Model.importContents
 * @returns {Promise}
 * @param {array} records The set of new records.
 * @param {object} parser The parser configuration data from /importer/config/default.yaml
 * @param {object} actionType Either has a param "users", "stock" or neither - which implies specifications.
 *
 * @see {@link module:Model~parseImportUser} (called by)
 * @see {@link module:Model~parseImportItem} (calls)
 */
function importContents(data, parser, actiontype) {
    if (actiontype.users)
        return parseImportUser(data, parser, actiontype);
    if (actiontype.tracking)
        console.log('import contents data',data);
    return parseImportItem(data, parser, actiontype);
}

/**
 * Parse over the imported items.
 *
 * Identify which items are new and need saving,
 * which are changed and need updating,
 * and which haven't changed at all and need keeping.
 *
 * If the actionType was "import-stock" then just call updateItems 
 * on the inventory levels for each item.
 *
 * If the actionType was "import-items" then
 * for new items that need saving, call saveItems
 * on the specifications for each item.
 * Do the same with updateItems for those that need updating.
 *
 * @alias module:Model.parseImportItems
 * @returns {Promise}
 * @param {array} records The set of new records.
 * @param {object} parser The parser configuration data from /importer/config/default.yaml
 * @param {object} actionType Either has a param "users", "stock" or neither - which implies specifications.
 *
 * @see {@link module:Model.parseItem} (calls)
 * @see {@link module:Model~findItems} (calls)
 * @see {@link module:Model~updateVerification} (calls)
 * @see {@link module:Model~saveItems} (calls)
 * @see {@link module:Model~updateItems} (calls)
 */
function parseImportItems( records, parser, actionType ) {
    return new Promise(function( resolve, reject ) {
        // Used to keep track of which part numbers in the records were unique
        let uniquePartNumbers = {};
        // Stores a sequential array of all part numbers in the records
        let partNumbers = [];

        // initialize document numbers for tracking import
        let uniqueDocNumbers = {};
        let uniqueWebNumbers = {};
        let docNumbers = [];
        let webOrderNumbers = [];
        let trackingNumbers = {};
        let shippingAgents = {};

        var locationCodes = {
            "02": "CA",
            "04": "IN",
            "11": "AL",
            "55": "TX",
            "60": "AB",
            "61": "ON",
            "70": "NC",
            "80": "WA",
            "85": "NJ",
            "H10": "GA",
            "H30": "FL"
        };
         // Parse over the passed records
        let dataSchemas = records.map(function( data ) {
            // For each record, parse the item according to its data schema
            let dataSchema = parseItem( data, parser, actionType );
            if ((actionType.tracking) && (dataSchema.doc_number.startsWith('W')) && (!dataSchema.doc_number.startsWith('WR'))) {
                let docNumber = dataSchema.doc_number;
                let webOrderNumber = dataSchema.doc_number.slice(0,-2);
                let locNumber = dataSchema.doc_number.slice(-2);
                if (!uniqueDocNumbers[docNumber]) {
                    uniqueDocNumbers[docNumber] = true;
                    docNumbers.push(docNumber);
                }
                if (!uniqueWebNumbers[webOrderNumber]) {
                    uniqueWebNumbers[webOrderNumber] = true;
                    webOrderNumbers.push(webOrderNumber);
                }
                
                let tracking_num = dataSchema.tracking_num;
                let shipping_agent = dataSchema.shipping_agent;
                trackingNumbers[docNumber] = tracking_num;
                shippingAgents[docNumber] = shipping_agent;

            }
            // Get the part number for it
            let partNumber = dataSchema.part_number;
            // If the part number hasn't previously been parsed
            if( !uniquePartNumbers[partNumber] ) {
                // Add to the unique part numbers list
                uniquePartNumbers[partNumber] = true;
                // And add it to the end of the partNumbers array
                partNumbers.push( partNumber );
            }
            // Then store the parsed item
            return dataSchema;
        });
        if (actionType.tracking) {
            params = {web_order_number: webOrderNumbers};
            var options = {};
            console.log('before db find params',params);
            db.sales.sale.find(params, (err, records) => {
                // Throw a reject if the db had issues
                // or no results came back
                // otherwise resolve the results 
                if (err) {
                  //  console.log('reject sale find error',err);
                    reject(err);
                } else if (Utility.isEmpty(records)) {
                    reject({
                        statusCode: 401,
                        message: 'Record Not Found - tracking'
                    });
                } else {
//                    console.log('records found',records);
                    var item_count = 0;
                    var ship_count = 0;
                    var item_count_arr = [];
                    var ship_count_arr = [];
                    records.forEach(function(record) {
                        sale_item_params = {sale_id: record.id};
                        //console.log('record id',record.id);
                        //console.log('params before start',sale_item_params);
                        
                        db.sales.sale_item.find(sale_item_params, (err, sales_item_records) => {
                            //console.log('params start',sale_item_params);
                            
                            item_count = 0;
                            ship_count = 0;
                            item_count = sales_item_records.length;
                           sales_item_records.forEach(function(sales_item_record) {
                                console.log('this record',sales_item_record.sale_id);
                            
                                if (sales_item_record.shipping_options.shipped == true)
                                {
                                    ship_count++;
                                }    
                            });
                            
                            item_count_arr[record.id] = item_count;
                            ship_count_arr[record.id] = ship_count;
                            sales_item_records.forEach(function(sales_item_record) {
                                //console.log('this record 2',sales_item_record.sale_id);
                            
                                var data = {};
                                var location = {};
                                data = sales_item_record.shipping_options;
                                location = sales_item_record.fulfilment_location.code;
                                var locationCode = Object.keys(locationCodes)[Object.values(locationCodes).indexOf(location)];

                                var docNumFound = record.web_order_number.concat(locationCode);
                                //console.log('doc num index',docNumFound);
                                //console.log('tracking number array val',trackingNumbers[docNumFound]);
                                let queryValues = [];
                                 if ((!(docNumFound in trackingNumbers)) || (trackingNumbers[docNumFound] == '')) 
                                 {
                                    data.shipped = false;
                                } else {    
                                   data.shipped = true;
                                  data.tracking_number = trackingNumbers[docNumFound];
                                  data.shipping_agent = shippingAgents[docNumFound];
                                 } 
                                 var updateCheck = false;
                                 existQueryString = `SELECT shipping_options FROM sales.sale_item 
                                WHERE sale_id = ${ record.id } 
                                AND fulfilment_location -> 'code' ? '${ location }'`;
                                //console.log('exist query id',record.id);
                                //console.log('exist query loc',location);
                                //console.log('tracking num found',data.tracking_number);
                                //console.log('ship agent',data.shipping_agent);

                                db.run( existQueryString, function( error, exist_records ) {
                                    if( !error ) {
                                        //console.log('exist length',exist_records.length);
                                        exist_records.forEach(function(exist_record) {
                                            //console.log('tracking num check', data.tracking_number);

                                            //console.log('tracking num check exist', exist_record.shipping_options.tracking_number);

                                            if ((exist_record.shipping_options.tracking_number == data.tracking_number) && (data.tracking_number !== "") && (typeof data.tracking_number !== undefined))
                                            {   
                                                console.log('tracking num match exist',exist_record.shipping_options.tracking_number);
                                               } else {
                                                updateCheck = true;
                                                var isPickup = false;
                                                if (exist_record.shipping_options.delivery_type == "CPU")
                                                    isPickup = true;
                                              //  console.log('update data',data);
                                                queryString = `UPDATE sales.sale_item AS i SET
                                               shipping_options = '${ JSON.stringify(data) }'
                                               WHERE sale_id = ${ record.id } 
                                               AND fulfilment_location -> 'code' ? '${ location }'`;
                                               var record_updated = new Date();
                                              if (data.shipped == true) {
                                                //  var statusText = "processing";
                                                // if (item_count_arr[record.id] == (ship_count_arr[record.id] + 1))
                                                    statusText = "complete";
                                               dateQueryString = `UPDATE sales.sale SET
                                               updated = '${ record_updated.toISOString() }',
                                               status = '${ statusText }'
                                               WHERE id = ${ record.id }`;
                                            //   console.log('date query',dateQueryString);
                                               //console.log('item count loop',item_count);
                                               //console.log('ship count',ship_count);
                                               
                                              } else {
                                                  dateQueryString = '';
                                              }
                                               var updateObj = {}
                                               console.log('update obj',updateObj);
                                               if (isPickup == false) { 
                                               db.run( queryString, function( error, records ) {
                                                   console.log('update query run',queryString);
                                                   if( !error ) {
                                                       console.log('update success',records);
                                                       resolve( records );
                                                   }
                                                   else {
                                                       console.log('update error',error);
                                                       reject( error );
                                                   }
                                               }); 
                                               if (dateQueryString !== '') {
                                               db.run( dateQueryString, function( error, records ) {
                                                   console.log('update query run',queryString);
                                                   if( !error ) {
                                                       console.log('update success',records);
                                                       resolve( records );
                                                   }
                                                   else {
                                                       console.log('update error',error);
                                                       reject( error );
                                                   }
                                                 });
                                               }
                                             } 
                                            }
                                        });
                                        console.log('update check 2',updateCheck);

                                        resolve( exist_records );
                                        
                                    }
                                    else {
                                        console.log('exist error',error);
                                        reject( error );
                                    }
                                });
                                console.log('end this record 2',sales_item_record.sale_id);
                                //   db.sales.sale_item.save(updateObj, (err, record) => {
                              //      console.log('db save',record);
                              //      if (err) return reject(err);
                              //      resolve(record);
                              //  });
                            });
                        });
                    });
                    resolve(records);
                }
            });
        } 
        // Request all of the pre-existing items from the database by the passed part numbers
        findItems({ part_number: partNumbers }).then(function( existentItems ) {

            // keep - object should be kept as it was
            // save - object is new, should be added
            // update - object existed but has changed
            let updateObj = {
                keep: [],
                save: [],
                update: []
            };

            // Create an existent items object that maps
            // the part_number from each db result as the key
            // to the full record as the value
            let existentItemsObj = {};
            existentItems.forEach(function( existentItem ) {
                let partNumber = existentItem.part_number;
                existentItemsObj[partNumber] = existentItem;
            });

            // For each of the items parsed out of records
            // Sort them as to whether they should be kept (no change), saved (new) or updated (existing but changed)
            dataSchemas.forEach(function( dataSchema ) {
                let partNumber = dataSchema.part_number;
                let existentItem = existentItemsObj[partNumber];
                // If the item already exists in the database
                if( existentItem ) {
                    let verification = updateVerification( dataSchema, existentItem, parser, actionType );
                    if( !verification.stopUpdate ) {
                        // existent item was found and should be updated
                        console.log("==Updating Item==");
                        console.log(JSON.stringify(dataSchema));
                        updateObj.update.push( dataSchema );
                        // Touch the file so we know the last time this ran
                        // If it gets more than about 12 hours old, we likely have an issue
                        try {
                            touch('/item-update.txt');
                        } catch (e) {
                            console.log('Warning: /importer/model.js - findItems - unable to touch /app/taskrunner/item-update.txt')
                        }
                    }
                    else {
                        // existent item was found and should not be updated
                        updateObj.keep.push( dataSchema );
                    }
                }
                else {
                    // existent item could not be found and should be saved
                    console.log("==Creating New Item==");
                    console.log(JSON.stringify(dataSchema));
                    updateObj.save.push( dataSchema );
                }
            });

            // Build an array of tasks to perform.
            // Each task is a promise so can be run via a Promise.all
            let tasks = [];
            let saves, updates;

            if( actionType.stock ) {
                // import-stock
                updates = updateObj.update.length ? updateObj.update.map(function( data, index ) {
                    return [`( '${ data.part_number }', $${ index + 1 }::jsonb )`, data.inventory];
                }) : null;
            }
            else if( actionType.tracking ) {
                console.log('find items tracking data',data);
            }
            else {
                // import-items
                saves = updateObj.save.length ? updateObj.save.map(function( data, index ) {
                    return [`( '${ data.part_number }', '${ data.type }', $${ index + 1 }::jsonb )`, data.specification];
                }) : null;
                // test save
                // saves = [[`( '01234ASDF', 'accessory', $1::jsonb )`, {}]];
                updates = updateObj.update.length ? updateObj.update.map(function( data, index ) {
                    return [`( '${ data.part_number }', $${ index + 1 }::jsonb )`, data.specification];
                }) : null;
            }

            // If there were any saves, call the saveItems function and add its returned promise to the tasks list
            if( saves ) {
                tasks.push( saveItems( saves ) );
            }

            // If there were any updates, call the updateItems function and add its returned promise to the tasks list
            if( updates ) {
                tasks.push( updateItems( updates, actionType ) );
            }

            // If there were any tasks to perform
            // Perform them then call resolve
            if( tasks.length ) {
                Promise.all( tasks ).then(function( results ) {
                    resolve( updateObj );
                }).catch(function( error ) {
                    reject( error );
                });
            }
            else {
                // If there were no tasks to perform
                // Resolve straight away
                debug( "No Tasks" );
                resolve( updateObj );
            }
        }).catch(function( error ) {
            reject( error );
        });
    });
}

/**
 * Parse items into the postgres database's expected formats.
 *
 * For stock checks, return {part_number: string, inventory: object}
 *
 * For specifications, it's somewhat more complicated.
 * Based on the settings in /importer/config/default.yaml
 * we have to exclude some fields, rename others, rename some values
 * and then write fields into either the root of the object
 * or into a specifications object within it.
 *
 * @alias module:Model.parseItem
 * @returns {object}
 * @param {object} data The object to parse.
 * @param {object} parser The parser data from /importer/config/default.yaml
 * @param {object} actionType Should we be parsing the item for a stock check or its properties.
 *
 * @see {@link module:Model.parseImportItems} (called by)
 * @see {@link module:Model~parseImportItem} (called by)
 */
function parseItem(data, parser, actiontype) { 
    // For stock level checks,
    // We just want to return the part number and inventory
    if (actiontype.stock) {
        return {
            part_number: data.part_number,
            inventory: data.inventory
        };
    } else if (actiontype.tracking) {
        return {
            doc_number: data.doc_number,
            tracking_num: data.tracking_num,
            shipping_agent: data.ship_agent
        };
    }

    /** Fix Specifications */
    // Map data into the postgres key names as the sql server key names
    // Look in the /importer/config/default.yaml for parser.mappings.keys.
    // These are pairs of what the key in the sql server is and what the key should be in postgres.
    // For each of these pairs, if the sql server key exists, copy the data into the postgres key.
    // The SQL Server key isn't deleted.
    let iterable = new Map(parser.mappings.keys);
    for (let [sqlkey, pgkey] of iterable) {
        if (Reflect.has(data, sqlkey))
            data[pgkey] = data[sqlkey];
    }

    // Get all of the keys
    let keys = Reflect.ownKeys(data);
    // Create a blank data schema object with a blank specification object within it.
    let dataSchema = {
        specification: {}
    };

    // Get a map of the SQL Server terms for inventory posting groups
    // and how they map to the type column in Postgres.
    // Also from /importer/config/default.yaml
    iterable = new Map(parser.mappings.values);

    // Loop over all of the keys
    for (key of keys) {
        /** Check if Key is not part of the excluded specifications properties */
        if (!parser.specifications.exclude.includes(key)) {
            let value = data[key];
            let schema = dataSchema.specification;

            // Trim any strings
            if (value && value.length && typeof value === 'string') {
                value = value.trim();
            }

            /** Check if Key is a highlevel property or a specification property */
            // This is defined in parser.highlevel in /importer/config/default.yaml
            // highlevel properties are on the root of the object
            // everything else goes into the specifications
            if (parser.highlevel.includes(key)) {
                // Loop over the known SQL Server types and convert to Postgres types if found
                for (let [sqlvalue, pgvalue] of iterable) {
                    if (value === sqlvalue) {
                        value = pgvalue;
                        break;
                    }
                }
                schema = dataSchema;
            }

            // Clean up keys to lowercase,
            // strip periods, hashes
            // convert double underscores to single underscores
            key = key.toLowerCase().replace(/(\(|\)|\s+)/g, '_');
            key = key.replace(/(\.|\#|\_+$)/g, '');
            /** Eliminate any Double Underscores. */
            key = key.replace(/__+/g, '_');

            // Store the value in the correct place in the object
            schema[key] = value;
            // debug("Created ", key, value);
        }
    }

    return dataSchema;
}

/**
 * Parse a user, converting SQL Server keys into the correct structure for Postgres.
 *
 * @alias module:Model.parseUser
 * @returns {object}
 * @param {object} data The source user object from SQL Server.
 * @param {object} parser The parser data from /importer/config/default.yaml
 * @param {object} actionType Not used but keeps the same argument pattern from parseItem
 *
 * @see {@link module:Model~parseImportUser} (called by)
 */
function parseUser(data, parser, actiontype) {
    let mappings = parser.srcdata.users.mappings;
    let iterable = new Map(mappings.keys);
    data['Shipping Config'] = {
        defaultLocationCode: '11'
    };
    for (let [csvkey, pgkey] of iterable) {
        if (pgkey === 'Shipping Config')
            data['Shipping Config'].defaultLocationCode = data[csvkey];
        else if (Reflect.has(data, csvkey))
            data[pgkey] = data[csvkey];
    }

    let dataSchema = {
        role: 'owner',
        cart: {
            items: {}
        },
        sales_rep: 34,
        country: 'US'
    };
    let keys = Reflect.ownKeys(data);

    for (key of keys) {
        if (parser.srcdata.users.exclude.includes(key)) continue;
        /** Check if Key is not part of the excluded specifications properties */
        let value = data[key];
        if (key === 'Username')
            value = value.toLowerCase();
        key = key.toLowerCase().replace(/(\(|\)|\s+)/g, '_');
        key = key.replace(/(\.|\#|\_+$)/g, '');
        /** Eliminate any Double Underscores. */
        key = key.replace(/__+/g, '_');

        dataSchema[key] = value;
    }

    return dataSchema;
}

/**
 * @module Model
 */
module.exports = { importContents, parseImportItems, parseItem, parseUser }

/**
 * Parse user data, converting from SQL Server to Postgres formats,
 * ensure the user is valid and doesn't already exist,
 * then insert into Postgres.
 *
 * @inner
 * @param {object} data The source user object from SQL Server.
 * @param {object} parser The parser data from /importer/config/default.yaml
 * @param {object} actionType Not used but keeps the same argument pattern from parseItem
 *
 * @see {@link module:Model.importContents} (called by)
 * @see {@link module:Model.parseUser} (calls)
 * @see {@link module:Model~validateCredentials} (calls)
 * @see {@link module:Model~handleSaveLogin} (calls)
 * @see {@link module:Model~findDealer} (calls)
 */
function parseImportUser(data, parser, actiontype) {
    let savedlogin, saveddealer, saveduser;
    // Clean up the user data from SQL Server to Postgres formats
    data = parseUser(data, parser, actiontype);

    // If the user's valid
    return validateCredentials(data)
        .then(handleSaveLogin)
        .then(login => {
            savedlogin = login;
            data.login_id = login.id;
            return findDealer({nav_customer_id: data.dealer_id});
        })
        .then(dealer => {
            saveddealer = dealer;
            data.dealer_id = dealer.id;
            return data;
        })
        .then(handleSaveUser)
        .then(user => {
            saveduser = user;
            savedlogin.user_id = user.id;
            return savedlogin;
        }).then(saveLogin);
}

/**
 * Parse an item's data, converting from SQL Server to Postgres formats,
 * ensure the user is valid and doesn't already exist,
 * then insert into Postgres.
 *
 * @inner
 * @see {@link module:Model.importContents} (called by)
 * @see {@link module:Model.parseItem} (calls)
 * @see {@link module:Model~findItem} (calls)
 * @see {@link module:Model~updateVerification} (calls)
 * @see {@link module:Model~saveItem} (calls)
 */
function parseImportItem(data, parser, actiontype) {
    // Convert the object from SQL Server to Postrgres format
    let dataSchema = parseItem(data, parser, actiontype);
    console.log('schema',dataSchema);
    
    return findItem({part_number: dataSchema.part_number})
        .then(existentItem => updateVerification(dataSchema, existentItem, parser, actiontype))
        .catch(err => {
            if (err.message !== 'Record Not Found')
                throw new Error(err.message);
            if (actiontype.stock) dataSchema.stopUpdate = true;
            return dataSchema;
        })
        .then(responseData => {
            if (responseData.stopUpdate)
                return responseData;
            return saveItem(responseData);
        });
}

/**
 * Compare an item with its existing form and determine whether it needs updating or not.
 * If the object needs updaing, the new version returned.
 * If the object does not need updating, an object with a stopUpdate: true and a message: string
 *
 * The new item is modified, in the process, gaining missing properties from the existing item.
 *
 * @inner
 * @returns {object}
 * @param {object} item The new version of the item.
 * @param {object} existentItem The version of the item in the database.
 * @param {object} parser The parser object from /importer/config/default.yaml
 * @param {object} actionType Stock or Specifications}
 *
 * @see {@link module:Model.parseImportItems} (called by)
 */
function updateVerification(item, existentItem, parser, actionType, users) {
    let isUpdate = false;
    let activeProcess = 'Import';
    let comp = parser.comparison;

    // Copy the id from the existing item
    if (Reflect.has(existentItem, 'id'))
        item['id'] = Reflect.get(existentItem, 'id');

    if (actionType.stock) { // For stock checks
        activeProcess = 'Inventory';
        for (key of Reflect.ownKeys(item.inventory)) {
            // Perform the most convoluted getting of an integer known to man on each inventory level
            let invVal = Number.parseFloat(Reflect.get(item.inventory, key));
            invVal = invVal.toFixed();
            invVal = Number.parseInt(invVal);
            // Update the inventory level value with the cleaned integer
            Reflect.set(item.inventory, key, invVal);
            // If the existing item didn't have an inventory levels object - update
            if (!Reflect.has(existentItem, 'inventory') || !existentItem.inventory) {
                isUpdate = true;
                continue;
            }
            // If the existing item didn't have an inventory level for this warehous, update
            if (!Reflect.has(existentItem.inventory, key))
                isUpdate = true;
            // If the inventory levels were different, update
            if (invVal !== existentItem.inventory[key])
                isUpdate = true;
        }
    } else { // For specifications checks
        // If the existent item has an of the fields in parser.comparrison.assign
        // from /importer/config/default.yaml
        // then set them for the new item from the existent item
        comp.assign.forEach(key => {
            if (Reflect.has(existentItem, key)){
                Reflect.set(item, key, Reflect.get(existentItem, key));
            }
        });

        // If the existent item has an of the fields in parser.comparrison.remove
        // from /importer/config/default.yaml
        // then remove them from the existing item for the comparrison
        // this basically just removes the inventory levels
        comp.remove.forEach(key => {
            if (Reflect.has(existentItem, key)){
                Reflect.deleteProperty(existentItem, key);
            }
        });

        // Loop over all of the keys in the new item
        for (key of Reflect.ownKeys(item)) {
            // If the existing version doesn't have the key, it's an update
            if (!Reflect.has(existentItem, key)) {
                isUpdate = true;
                break;
            }
            // If the field is an object
            if (Utility.isObject(item[key])) {
                // Make sure it's an object on the existent item - if not, it's an update
                if (!Utility.isObject(existentItem[key])) {
                    isUpdate = true;
                    break;
                }
                // Make sure their values match - if not, it's an update
                if (!Utility.isEqual(item[key], existentItem[key])) {
                    isUpdate = true;
                    break;
                }
            } else {
                // If the value was a non object, make sure they match - if not, it's an update
                if (item[key] !== existentItem[key]) {
                    isUpdate = true;
                    break;
                }
            }
        }
    }
    if (isUpdate) return item;
    let resObj = {};
    resObj.stopUpdate = true;
    resObj.message = `No ${activeProcess} Updates on Item ${item.part_number}`;
    // debug(resObj.message);
    return resObj;
}

/**
 * Validate a user's credentials.
 *
 * @inner
 * @see {@link module:Model~parseImportUser} (called by)
 * @see {@link module:Utility.validateEmail} (calls)
 * @see {@link module:Model~countUsers} (calls)
 */
function validateCredentials(data) {
    let errvalid = null;

    if (!data.email) {
        errvalid = new Error('No Email Passed In');
        errvalid.statusCode = 401;
        errvalid.hint = 'No Email Address was Provided.';
        throw errvalid;
    }

    if (!Utility.validateEmail(data.email)) {
        errvalid = new Error('Email Is Not Valid');
        errvalid.statusCode = 401;
        errvalid.hint = 'Email Address must be Valid.';
        throw errvalid;
    }

    if (!data.password_hash) {
        errvalid = new Error('No Password Passed In');
        errvalid.statusCode = 401;
        errvalid.hint = 'No Password was Provided.';
        throw errvalid;
    }

    /** Now we confirm with the email already exist in our DB. */
    return countUsers({email: data.email}).then(response => {
        errvalid = new Error('This Email Already exists in our Database');
        errvalid.statusCode = 401;
        throw errvalid;
    }).catch(err => data);
}

/**
 *
 *
 * @inner
 * @see {@link module:Model~parseImportUser} (called by)
 * @see {@link module:Model~findLogin} (calls)
 * @see {@link module:Model~saveLogin} (calls)
 */
function handleSaveLogin(data) {
    let savingLogin = {
        password_hash: Crypt.encode(data.password_hash).token
    };
    return findLogin(savingLogin)
        .catch(err => {
            if (err.message === 'Record Not Found') {
                savingLogin.created = new Date();
                return saveLogin(savingLogin);
            }
            throw err;
        });
}

/**
 *
 *
 * @inner
 * @see {@link module:Model~parseImportUser} (called by)
 * @see {@link module:Model~findUser} (calls)
 * @see {@link module:Model~saveUser} (calls)
 */
function handleSaveUser(data) {
    let existantUser = {
        status: 'pending',
        role: 'owner',
        cart: {
            items: {}
        },
        login_id: data.login_id,
        dealer_id: data.dealer_id,
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number,
        email: data.email,
        address_1: data.address_1,
        shipping_config: data.shipping_config,
        store_number: data.store_number
    };
    if (data.address_2) existantUser.address_2 = data.address_2.toString().trim();
    if (data.city) existantUser.city = data.city.toString().trim();
    if (data.state) existantUser.state = data.state.toString().trim();
    if (data.zip) existantUser.zip = data.zip.toString().trim();
    if (data.postal) existantUser.zip = data.postal.toString().trim();
    if (data.country) existantUser.country = data.country.toString().trim();
    if (data.comments) existantUser.comments = data.comments.toString().trim();
    if (data.username) existantUser.username = data.username.toString().trim();
    return findUser(existantUser).catch(function(err) {
        if (err.message === 'Record Not Found') return saveUser(existantUser);
        else throw err;
    });
}

/**
 *
 *
 * @inner
 * @see {@link module:Model~validateCredentials} (called by)
 */
function countUsers(parameters) {
    return new Promise((resolve, reject) => {
        db.membership.user.count(parameters, (err, results) => {
            if (err)
                reject(err);
            else {
                if (typeof results === 'string')
                    results = parseInt(results);
                if (!results)
                    reject(results);
                else
                    resolve(results);
            }
        });
    });
}

/**
 *
 *
 * @inner
 * @see {@link module:Model~parseImportUser} (called by)
 */
function findDealer(params) {
    return new Promise((resolve, reject) => {
        db.membership.dealer.findOne(params, (err, record) => {
            if (err) return reject(err);
            if (Utility.isEmpty(record)) {
                return reject({
                    statusCode: 401,
                    message: 'Record Not Found'
                });
            }
            resolve(record);
        });
    });
}

/**
 *
 *
 * @inner
 * @see {@link module:Model~parseImportItem} (called by)
 */
function findItem(params) {
    return new Promise((resolve, reject) => {
        db[settings.tableName].findOne(params, (err, record) => {
            if (err)
                reject(err);
            else {
                if (Utility.isEmpty(record)) {
                    reject({
                        statusCode: 401,
                        message: 'Record Not Found'
                    });
                } else
                    resolve(record);
            }
        });
    });
}

/**
 * Search the database for existing items by their part numbers. 
 *
 * Takes the passed list of parameters (product ids),
 * search the database for matches
 * return a promise that resolves with the matches
 * or rejects if there was a problem connecting/were no matches
 *
 * @inner
 * @returns {Promise}
 * @param {object} params The params for a Massive find request. In the form {part_number: [array of part numbers]}
 * @param {object} options The options for a Massive find request.
 *
 * @see {@link module:Model.parseImportItems} (called by)
 */
function findItems(params, options) {
    return new Promise((resolve, reject) => {
        options = options || {};
        // Query the database table for matches
        // parseImportItems will {have part_number: [array of partNumbers]}
        db[settings.tableName].find(params, options, (err, records) => {
            // Throw a reject if the db had issues
            // or no results came back
            // otherwise resolve the results 
            if (err) {
                reject(err);
            } else if (Utility.isEmpty(records)) {
                reject({
                    statusCode: 401,
                    message: 'Record Not Found'
                });
            } else {
                resolve(records);
            }
        });
    });
}

/**
 *
 *
 * @inner
 * @see {@link module:Model~handleSaveLogin} (called by)
 */
function findLogin(params) {
    return new Promise((resolve, reject) => {
        db.membership.login.findOne(params, (err, record) => {
            if (err) return reject(err);
            if (Utility.isEmpty(record)) {
                return reject({
                    statusCode: 401,
                    message: 'Record Not Found'
                });
            }
            resolve(record);
        });
    });
}

/**
 *
 *
 * @inner
 * @see {@link module:Model~handleSaveUser} (called by)
 */
function findUser(params) {
    return new Promise((resolve, reject) => {
        db.membership.user.findOne(params, function(err, record) {
            if (err) return reject(err);
            if (Utility.isEmpty(record)) {
                return reject({
                    statusCode: 401,
                    message: 'Record Not Found'
                });
            }
            resolve(record);
        });
    });
}

/**
 *
 *
 * @inner
 * Apparently not called by anything.
 */
function saveDealer(data) {
    return new Promise((resolve, reject) => {
        data.created = data.updated = new Date();
        db.membership.dealer.save(data, (err, record) => {
            if (err) return reject(err);
            resolve(record);
        });
    });
}

/**
 *
 *
 * @inner
 * @see {@link module:Model~parseImportItem} (called by)
 */
function saveItem(data) {
    return new Promise((resolve, reject) => {
        db[settings.tableName].save(data, (err, record) => {
            if (err) return reject(err);
            resolve(record);
        });
    });
}

/**
 * Insert a set of new items into the database.
 *
 * @inner
 * @returns {Promise}
 * @param {array} data The set of items to insert.
 *
 * @see {@link module:Model.parseImportItems} (called by)
 */
function saveItems( data ) {
    return new Promise(function( resolve, reject ) {
        let queryValues = [];
        let queryValuesString = data.map(function( d, index, array ) {
            queryValues.push( d[1] );
            return d[0];
        }).join( ", " );
        let queryString = `INSERT INTO public.item ( part_number, type, specification ) VALUES ${ queryValuesString }`;
        // console.log( queryValues );
        if( queryString ) {
            db.run( queryString, queryValues, function( error, records ) {
                if( !error ) {
                    resolve( records );
                }
                else {
                    reject( error );
                }
            });
        }
        else {
            reject( new Error( "Importer.Model.saveItems: missing queryString;" ) );
        }
    });
}

/**
 *
 *
 * @inner
 * @see {@link module:Model~handleSaveLogin} (called by)
 */
function saveLogin(data) {
    return new Promise((resolve, reject) => {
        if (!Reflect.has(data, 'last_accessed')) data.last_accessed = new Date();
        db.membership.login.save(data, function(err, record) {
            if (err) return reject(err);
            resolve(record);
        });
    });
}

/**
 *
 *
 * @inner
 * @see {@link module:Model~parseImportUser} (called by)
 * @see {@link module:Model~handleSaveUser} (called by)
 */
function saveUser(data) {
    return new Promise((resolve, reject) => {
        data.created = data.updated = new Date();
        db.membership.user.save(data, (err, record) => {
            if (err) return reject(err);
            resolve(record);
        });
    });
}

/**
 * Update a set of existing items in the database.
 *
 * @inner
 * @returns {Promise}
 * @param {array} data The set of items to insert.
 *
 * @see {@link module:Model.parseImportItems} (called by)
 */
function updateItems( data, actionType ) {
    return new Promise(function( resolve, reject ) {
        let queryValues = [];
        let queryValuesString = data.map(function( d, index, array ) {
            queryValues.push( d[1] );
            return d[0];
        }).join( ", " );
        let queryString;
        if( actionType.stock ) {
            // import-stock
            queryString = `UPDATE public.item AS i SET
                inventory = i2.inventory
            FROM( VALUES ${ queryValuesString } ) AS i2( part_number, inventory )
            WHERE i2.part_number = i.part_number`;
        }
        else if( actionType.tracking ) {
            // import-tracking
            console.log('tracking update query',queryValuesString);
           // queryString = `UPDATE public.item AS i SET
            //    inventory = i2.inventory
           // FROM( VALUES ${ queryValuesString } ) AS i2( part_number, inventory )
           // WHERE i2.part_number = i.part_number`;

        }
        else {
            // import-items
            queryString = `UPDATE public.item AS i SET
                specification = i2.specification
            FROM( VALUES ${ queryValuesString } ) AS i2( part_number, specification )
            WHERE i2.part_number = i.part_number`;
        }
        // console.log( queryValues );
        if( queryString ) {
            db.run( queryString, queryValues, function( error, records ) {
                if( !error ) {
                    resolve( records );
                }
                else {
                    // Adding verbose logging when a db update fails
                    console.log('Error in /importer/model.js - updateItems - db returned an error');
                    console.log(error);
                    console.log('queryString was:');
                    console.log(queryString);
                    console.log('queryValues was:');
                    console.log(queryValues);
                    console.log('data  was:');
                    console.log(JSON.stringify(data, null, 4));
                    reject( error );
                }
            });
        }
        else {
            reject( new Error( "Importer.Model.updateItems: missing queryString;" ) );
        }
    });
}
