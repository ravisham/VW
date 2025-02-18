let Q = require("q"),
	_ = require("underscore"),
	Helprs = require("helprs"),
	db = require("libs/db");

/**
 * @module Generic
 */
module.exports = {
	/**
	 * @returns {Promise}
	 * @param {object} parameters
	 * @param {object} options
	 */
	clearCart: function(parameters, options) {
		let deferred = Q.defer();

		db.clearCart([parameters.id], function(err, response) {
			if (err)
				deferred.reject(err);
			else
				deferred.resolve(response);
		});

		return deferred.promise;
	},

	/**
	 * @returns {Promise}
	 * @param {object} parameters
	 * @param {object} options
	 */
	clearTableData: function(parameters, options) {
		let deferred = Q.defer();

		let missingParam = "Table",
			badParams = false;
		if (!parameters.schema || !parameters.table) {
			if (!parameters.schema && !parameters.table)
				missingParam += " and Schema";
			else if (!parameters.schema)
				missingParam = "Schema";
			badParams = true;
		}

		Q.delay(250).done(function() {
			if (badParams) {
				let err = Helprs.err("Must specify a " + missingParam, {
					statusCode: 1002,
					paramaters: parameters
				});
				deferred.reject(err);
			} else {
				db.clearTable([parameters.schema, parameters.table], function(err, response) {
					if (err)
						deferred.reject(err);
					else
						deferred.resolve(response);
				});
			}
		});

		return deferred.promise;
	},

	/**
	 * @returns {Promise}
	 * @param {object} parameters
	 */
	checkStoreNumber: function(storeNum, dealer) {
		let deferred = Q.defer();
		db.checkStoreNumber(storeNum, dealer, function(err, count) {
			if (err)
				deferred.reject(err);
			else {
				if (count)
					deferred.resolve(count);
				else {
					deferred.reject(Helprs.err("Invalid Site ID", {
						statusCode: 453					
					}));
				}
			}
		});
		return deferred.promise;
	},
	/**
	 * @returns {Promise}
	 * @param {object} parameters
	 */
	getShipInfoByStoreNum: function(storeNum) {
		let deferred = Q.defer();
		db.getShipInfoByStoreNum(storeNum, function(err, result) {
			if (err)
				deferred.reject(err);
			else {
				if (result)
					deferred.resolve(result);
				else {
					deferred.reject(Helprs.err("Invalid Site ID", {
						statusCode: 453					
					}));
				}
			}
		});
		return deferred.promise;
	},
	/**
	 * @returns {Promise}
	 * @param {object} parameters
	 */
	 getDealerEmail: function(dealerId) {
		
		let deferred = Q.defer();
		db.getDealerEmail(dealerId, function(err, result) {
			if (err)
				deferred.reject(err);
			else {
				if (result)
					deferred.resolve(result);
				else {
					deferred.reject(Helprs.err("Invalid Site ID", {
						statusCode: 453					
					}));
				}
			}
		});
	
		return deferred.promise;
	},
	
	/**
	 * @returns {Promise}
	 */
	getLastWebOrderNumber: function() {
		let deferred = Q.defer();
		db.sales.getLastWebOrderNumber(function(err, WebOrderNumber) {
			if (err)
				deferred.reject(err);
			else
				deferred.resolve(WebOrderNumber);
		});
		return deferred.promise;
	},

	/**
	 * @returns {Promise}
	 * @param {object} parameters
	 */
	getLastWebOrderNumberByEnv: function(parameters) {
		let deferred = Q.defer();
		let envCode = parameters.envCode + '%';
		db.getLastWebOrderNumberByEnv(envCode, function(err, WebOrderNumber) {
			if (err)
				deferred.reject(err);
			else {
				if (WebOrderNumber[0])
					deferred.resolve(WebOrderNumber[0].web_order_number);
				else {
					deferred.reject(Helprs.err("Record Not Found", {
						statusCode: 401,
						envCode: envCode
					}));
				}
			}
		});
		return deferred.promise;
	},

	/**
	 * @returns {Promise}
	 * @param {object} parameters
	 */
	getLastWebOrderNumberByEnvAndId: function(parameters) {
		let deferred = Q.defer();
		let envCode = parameters.envCode;
		let envCodeSearch = parameters.envCode + '%';
		
		db.getLastWebOrderNumberByEnvAndId(envCode, envCodeSearch, function(err, WebOrderNumber) {
			if (err)
				deferred.reject(err);
			else {
				if (WebOrderNumber[0])
					deferred.resolve(WebOrderNumber[0].web_order_number);
				else {
					deferred.reject(Helprs.err("Record Not Found", {
						statusCode: 401,
						envCode: envCode
					}));
				}
			}
		});
		return deferred.promise;
	}
};