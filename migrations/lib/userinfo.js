var Q = require('q');
var username = require('username');
var fullname = require('fullname');

var cacheInfo = {
	username: null,
	fullname: null,
	firstname: null,
	lastname: null
};

module.exports = {
	initialize: function() {
		Q.spread([this.getFullname(), this.getUsername()], function(fullName, userName) {
			var userdetails = {
				message: "Retrieved User Info",
				fullname: __cacheFullname(fullName),
				username: __cacheUsername(userName)
			};
		});
	},
	getFullname: function() {
		var deferred = Q.defer();

		if (cacheInfo.fullname)
			deferred.resolve(cacheInfo.fullname);
		else {
			fullname().then(function(name) {
				deferred.resolve(__cacheFullname(name));
			});
		}

		return deferred.promise;
	},
	getUsername: function() {
		var deferred = Q.defer();

		if (cacheInfo.username)
			deferred.resolve(cacheInfo.username);
		else {
			username().then(function(name) {
				deferred.resolve(__cacheUsername(name));
			});
		}

		return deferred.promise;
	},
	getFirstname: function() {
		var deferred = Q.defer();

		if (cacheInfo.firstname)
			deferred.resolve(cacheInfo.firstname);
		else if (!cacheInfo.firstname && cacheInfo.fullname) {
			var firstname = __cacheFullname(cacheInfo.fullname, "firstname");
			deferred.resolve(firstname);
		} else {
			fullname().then(function(name) {
				var firstname = __cacheFullname(name, "firstname");
				deferred.resolve(firstname);
			});
		}

		return deferred.promise;
	},
	getLastname: function() {
		var deferred = Q.defer();

		if (cacheInfo.lastname)
			deferred.resolve(cacheInfo.lastname);
		else if (!cacheInfo.lastname && cacheInfo.fullname) {
			var lastname = __cacheFullname(cacheInfo.fullname, "lastname");
			deferred.resolve(lastname);
		} else {
			fullname().then(function(name) {
				var lastname = __cacheFullname(name, "lastname");
				deferred.resolve(lastname);
			});
		}

		return deferred.promise;
	},
	getFullnameSync: function() {
		if (cacheInfo.fullname)
			return cacheInfo.fullname;
		cacheInfo.fullname = require('fullname-native');
		return cacheInfo.fullname;
	},
	getUsernameSync: function() {
		if (cacheInfo.username)
			return cacheInfo.username;
		return __cacheUsername(username.sync());
	},
	getFirstnameSync: function() {
		if (cacheInfo.firstname)
			return cacheInfo.firstname;
		else if (cacheInfo.fullname)
			return __cacheFullname(cacheInfo.fullname, "firstname");
		return __cacheFullname(this.getFullnameSync(), "firstname");
	},
	getLastnameSync: function() {
		if (cacheInfo.lastname)
			return cacheInfo.lastname;
		else if (cacheInfo.fullname)
			return __cacheFullname(cacheInfo.fullname, "lastname");
		return __cacheFullname(this.getFullnameSync(), "lastname");
	}
};

function __cacheFullname(fullName, returnValue) {
	returnValue = returnValue || "fullname";

	/** Cache Full Name */
	if (!cacheInfo.fullname || (cacheInfo.fullname !== fullName))
		cacheInfo.fullname = fullName;

	var fullnameSplit = fullName.split(" ");
	/** Cache First Name */
	if (fullnameSplit[0].length) {
		if (!cacheInfo.firstname || (cacheInfo.firstname !== fullnameSplit[0]))
			cacheInfo.firstname = fullnameSplit[0];
	}

	/** Cache Last Name */
	if (fullnameSplit[1].length) {
		if (!cacheInfo.lastname || (cacheInfo.lastname !== fullnameSplit[1]))
			cacheInfo.lastname = fullnameSplit[1];
	}

	return cacheInfo[returnValue];
}

function __cacheUsername(userName) {
	if (!cacheInfo.username || (cacheInfo.username !== userName))
		cacheInfo.username = userName;
	return cacheInfo.username;
}