let Q = require("q"),
    _ = require("underscore"),
    Helprs = require("helprs"),
    db = require("libs/db");

/**
 * @module User
 */
module.exports = {
    /**
     * Get the total number of users in the Postgres database.
     *
     * @returns {Promise}
     * @param {object} parameters
     * @param {object} options
     */
    count: function (parameters, options) {
        let deferred = Q.defer();
        db.membership.user.count(parameters, function (err, results) {
            if (err)
                deferred.reject(err);
            else {
                if (typeof results === 'string')
                    results = parseInt(results, 10);
                if (!results)
                    deferred.reject(results);
                else
                    deferred.resolve(results);
            }
        });
        return deferred.promise;
    },

    /**
     * Appears to find a? (find should return all results, findOne returns a single) user that matches the passed params and options.
     *
     * @returns {Promise}
     * @param {object} parameters
     * @param {object} options
     */
    find: function (params, options) {
        let deferred = Q.defer();
        let guid = null;
        options = options || {};
        if (options.guid) {
            guid = options.guid;
            delete options.guid;
        }

        db.membership.user.find(params, options, function (err, result) {
            if (err)
                deferred.reject(err);
            else {
                if (guid) {
                    result.guid = guid;
                }
                deferred.resolve(result);
            }
        });

        return deferred.promise;
    },

    /**
     * Find a single user.
     *
     * params.username should be used to pass a username to look for.
     * params.email should be used to pass an email to look for.
     * 
     * It was modified to use ilike for case insensitive matching.
     * This allows users to log in even if they miscapitalize their usernames.
     *
     * @returns {Promise}
     * @param {object} parameters
     * @param {object} options
     */
    findOne: function (params, options) {
        let deferred = Q.defer();
        let guid = null;
        options = options || {};
        if (options.guid) {
            guid = options.guid;
            delete options.guid;
        }

        // A username was passed - we want to do case insensitive testing
        if (typeof params.username === 'string') {
            params["username ilike"] = params.username;
            delete params.username;
        }

        // An email was passed - we want to do case insensitive testing
        if (typeof params.email === 'string') {
            params["email ilike"] = params.email;
            delete params.email;
        }

        db.membership.user.findOne(params, options, function (err, record) {
            if (err) {
                console.log('/common/models/membersip/user.js findOne error from db.membership.user.findOne');
                console.log('params were:');
                console.log(params);
                console.log('options were:');
                console.log(options);
                console.log('error was:');
                console.log(err);
                deferred.reject(err);
            } else {
                if (!record) {
                    let errOpts = {
                        errorCode: 1000,
                        statusCode: 401
                    };
                    if (guid) {
                        errOpts.guid = guid;
                    }
                    deferred.reject(Helprs.err("Record Not Found", errOpts));
                } else {
                    if (guid) {
                        record.guid = guid;
                    }
                    deferred.resolve(record);
                }
            }
        });

        return deferred.promise;
    },

    /**
     * Find a single user based on the passed params.
     * It gives direct access to Massive for database queries but doesn't do the additional services of findOne.
     *
     * @returns {Promise}
     * @param {object} parameters
     * @param {object} options
     */
    findUser: function (params) {
        return new Promise((resolve, reject) => {
            db.membership.user.findOne(params, (err, record) => {
                if (err) return reject(err);
                else if (!record) return reject(new Error('User Not Found'));
                resolve(record);
            });
        });
    },

    /**
     * Appears to get all admin, deaer and sales rep users from the Postgres database.
     *
     * @returns {Promise}
     * @param {object} parameters
     * @param {object} options
     */
    adminFind: function (params, options) {
        let deferred = Q.defer();

        let sql = `
            select 
                u.*,
                row_to_json(d.*) as dealer,
                row_to_json(s.*) as salesrep,
                row_to_json(l.*) as login
            from membership.user u 
                left join membership.login l on u.login_id = l.id 
                left join membership.dealer d on u.dealer_id = d.id
                left join sales.salesrep s on u.sales_rep = s.id`;

         if (params.id) {
            sql += " where u.id = " + params.id;
        }
        let result = db.run(sql, function (err, results) {
            if (results && !err) {
                deferred.resolve(results);
            } else {
                console.log('Error in adminFind with db.run :', err);
                console.log('SQL : ', sql);
                console.log('Params : ', params);
                deferred.reject(err);
            }
        });
        return deferred.promise;
    },

    /**
     * Appears to save a user to the Postgres database.
     *
     * @returns {Promise}
     * @param {object} parameters
     * @param {object} options
     */
    save: function (data) {
        let deferred = Q.defer();
        data.updated = new Date();
        let newUser = !data.id;

        let passwordHash;
        if (data.password_hash) {
            passwordHash = data.password_hash;
            delete data.password_hash;
        }

        db.membership.user.save(data, function (err, userUpdate) {
            if (err || !userUpdate || userUpdate === null) {
                console.log('Error in User.save with db.membership.user.save, initial: ', err);
                deferred.reject(err);
            }

            if (passwordHash && userUpdate) {
                let loginDetails = {
                    id: userUpdate.login_id || null,
                    user_id: userUpdate.id,
                    password_hash: passwordHash,
                }

                if (newUser || userUpdate.login_id === null) {
                    delete loginDetails.id;
                    loginDetails.created = new Date();
                }

                let passwordUpdate = db.membership.login.save(loginDetails, function (err, result) {
                    if (err) return console.log('Error in User.save with db.membership.login.save, password update: ', err);
                    db.membership.user.update({
                        id: result.user_id,
                        login_id: result.id
                    }, function (errr, results) {
                        if (errr) return console.log('Error in User.save with db.membership.user.update, login_id update : ', errr);
                    });
                });
            }
            deferred.resolve(userUpdate);

        }, function (err, res) {
            console.log('Error callback in User.save with db.membership.user.save : ', err);
            deferred.reject(err);
        });
        return deferred.promise;
    },

    /**
     * Perform full text searching across the membership.users list in Postgres
     *
     * @see https://dmfay.github.io/massive-js/queries.html#search
     * @returns {Promise}
     * @param {object} parameters
     * @param {object} options
     */
    search: function (params, options, returnOptions) {
        let deferred = Q.defer();
        let toReturn = false;
        if (returnOptions !== undefined)
            toReturn = returnOptions;
        options = options || {};

        db.membership.user.search(params, function (err, docs) {
            if (err)
                deferred.reject(err);
            else {
                if (toReturn) {
                    let resObj = _.extend({}, options);
                    resObj.docs = docs;
                    deferred.resolve(resObj);
                } else {
                    deferred.resolve(docs);
                }
            }
        });
        return deferred.promise;
    },

    /**
     * Update a data row in Postgres
     * @param   {Object}  data  Object containing the row to update.
     *                          NOTE: You must provide the row ID to update.
     *                          Else Massive will think its a new record instead of an update.
     * @return  {type}        [description]
     */
    update: function (data) {
        let deferred = Q.defer();

        if (!data.id) {
            let hintMsg = "You MUST pass an `id` as a parameter.";
            hintMsg += "\nThis ID will be used to execute an UPDATE.";
            hintMsg += "\nWithout the ID, Massive will attempt to create a new record instead of updating an existing one.";
            let err = Helprs.err("No row ID was specified.", {
                statusCode: 1002,
                paramaters: data,
                hintMessage: hintMsg
            });
            return deferred.reject(err);
        }
        data.updated = new Date();
        db.membership.user.save(data, function (err, user) {
            if (err)
                deferred.reject(err);
            else {
                deferred.resolve(user);
            }
        });
        return deferred.promise;
    },

    /**
     * Delete records from Postgres
     *
     * @returns {Promise}
     * @param {object} parameters
     * @param {object} options
     */
    destroy: function (params, options) {
        let deferred = Q.defer();
        db.membership.user.destroy(params, function (err, dealer) {
            if (err)
                deferred.reject(err);
            else {
                deferred.resolve(dealer);
            }
        });
        return deferred.promise;
    }
};