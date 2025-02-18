// Configuring the master routes for the site.
var auth = require( "./routes/auth" );
var brands = require( "./routes/brands" );
var dealers = require( "./routes/dealers" );
var email = require( "./routes/email" );
var headerimage = require( "./routes/headerimage" );
var order = require( "./routes/order" );
var ordersfull = require( "./routes/ordersfull" );
var returns = require( "./routes/returns" );
var products = require( "./routes/products" );
var users = require( "./routes/users" );

module.exports = {
    route: function(app) {
        app.use( "/", auth.Router );
        app.use( "/brands", brands.Router );
        app.use( "/dealers", dealers.Router );
        app.use( "/email", email.Router );
        app.use( "/headerimage", headerimage.Router );
        app.use( "/order", order.Router );
        app.use( "/ordersfull", ordersfull.Router );
        app.use( "/returns", returns.Router );
        app.use( "/products", products.Router );
        app.use( "/users", users.Router );
    }
};