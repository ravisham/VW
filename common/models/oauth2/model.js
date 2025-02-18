
/**
 * Module dependencies.
 */

var Q = require("q"),
	_ = require("underscore"),
	Helprs = require("helprs"),
  //  oauthNodeServer = require('oauth2-server'),
    db = require("libs/db");
    

/*
 * Get access token.
 */
module.exports = {
    getAccessToken: function(bearerToken) {
        var deferred = Q.defer();
        
        let params = [bearerToken];
        console.log('bearer',bearerToken);
         console.log('PARAMS',params);
        // db.connect();
        db.getToken(params, function(err, items) { console.log('db get');
            if (err) {
                console.log(err);
                deferred.reject(err);
            } else {
                deferred.resolve(items);
            }
        });
        return deferred.promise;
    },
    getClient: function (clientId, clientSecret) {
        var deferred = Q.defer();
        let params = [clientId, clientSecret];
         console.log('PARAMS',params);
        db.getClient(params, function(err, result) {
            console.log('result',result);
            var oAuthClient = result[0];
      
            if (err) {
                console.log('err',err);
                return;
            }
            console.log('resolve');
            deferred.resolve({
              clientId: oAuthClient.client_id,
              clientSecret: oAuthClient.client_secret,
              access_token: '123456',
              grants: ['password'], // the list of OAuth2 grant types that should be allowed
            });
        });
        return deferred.promise;
    },

    getRefreshToken: function *(bearerToken) {
        var deferred = Q.defer();
        var params = [bearerToken];
        db.getRefreshToken(params, function(err, result) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(result.rowCount ? result.rows[0] : false);
            }
        });
        return deferred.promise;
    },

      getUser: function (username, password) {
        var deferred = Q.defer();
        var params = [username, passowrd];
        db.getUser(params, function(err, result) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(result.rowCount ? result.rows[0] : false);
            }
        });
          return deferred.promise;
      },

      saveAccessToken: function *(token, client, user) {
        var deferred = Q.defer();
        data = [
            token.accessToken,
            token.accessTokenExpiresOn,
            client.id,
            token.refreshToken,
            token.refreshTokenExpiresOn,
            user.id
        ]
        db.saveAccessToken(data, function(err, result) {
            if (err) {
                 deferred.reject(err);
            } else {
                 deferred.resolve(result.rowCount ? result.rows[0] : false);
            }
        });
        return deferred.promise;
    }

}
