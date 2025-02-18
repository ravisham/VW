/** Configuring the master routes for the site. */
let account = require("./routes/account"),
    auth = require("./routes/auth"),
    api = require("./routes/api"),
    apiV2 = require("./routes/api.v2"),
    cart = require("./routes/cart"),
    checkout = require("./routes/checkout"),
    contact = require("./routes/contact"),
    locations = require("./routes/locations"),
    // signup = require("./routes/signup"),
    debugRte = require("./routes/debug"),
    fitment = require("./routes/fitmentguide"),
    /** Common Libs */
    colors = require("libs/colors"),
    debug = require("libs/buglog"),
    log = debug("routes");
    oauthServer = require('express-oauth-server');

module.exports = {
    route: function (app) {

        /** Request Logger Middleware */
        app.use("*", function (req, res, next) {
            log("\t%O", __deviceDetectionLog(req));
            next();
        });
        app.oauth = new oauthServer({
            model: require("models/oauth2")
        });


        app.use("/api2", apiV2.Router);
        app.use("/api", api.Router);
        app.use("/", auth.Router);

        app.use("*", function (req, res, next) {
            if (req.user && (req.user.disabled || req.user.dealer && req.user.dealer.disabled)) {
                 res.redirect('/logout?error=disabled');
            } else {
                next();
            }
        });

        app.use("/account", account.Router);
        app.use("/cart", cart.Router);
        app.use("/checkout", checkout.Router);
        app.use("/contact", contact.Router);
        app.use("/locations", locations.Router);
        // app.use("/signup", signup.Router);
        app.use("/fitmentguide", fitment.Router);

        /** For Debugging */
        app.use("/debug", debugRte.Router);
    }
};

function __deviceDetectionLog(req) {
    let device = req.device;
    let useragent = device.parser.useragent;

    let dispatch = req.protocol + "://";
    dispatch += " " + req.method + " " + req.get("host") + " " + req.originalUrl;

    let agent = useragent.family;
    agent += " v" + useragent.major + "." + useragent.minor + "." + useragent.patch;

    return {
        Dispatch: dispatch,
        Device: __capitalize(device.type),
        Useragent: agent,
        User_Session: Boolean(req.user)
    };
}

function __capitalize(str) {
    return str.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}