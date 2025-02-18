var webpack = require("webpack");
var extractTextWebpackPlugin = require("extract-text-webpack-plugin");
var dedupePlugin = new webpack.optimize.DedupePlugin();
var definePlugin = new webpack.DefinePlugin({
	"process.env": {
		"NODE_ENV": JSON.stringify( process.env.NODE_ENV || "production" )
	}
});
var extractSass = new extractTextWebpackPlugin("./css/[name].css");
var provideJQuery = new webpack.ProvidePlugin({
	$: "jquery",
	jQuery: "jquery"
});
var entries = [{
	name: "checkout",
	src: "./server/scripts/checkout.js"
}, {
	name: "home",
	src: "./server/scripts/home.js"
}, {
	name: "login",
	src: "./server/scripts/login.js"
}, {
	name: "signup",
	src: "./server/scripts/signup.js"
}, {
	name: "account",
	src: "./server/scripts/account.js"
}, {
	name: "locations",
	src: "./server/scripts/locations.js"
}];
var webpackConfig = entries.map(function(entry, index, array) {
	var config = {
		// devtool: "source-map",
		watchOptions: {
		   poll: true
		},
		entry: {},
		module: {
			loaders: [{
				test: /\.jsx?$/,
				loader: "babel",
				query: {
					presets: ["es2015", "react"]
				},
				exclude: /(node_modules|bower_components)/
			}, {
				test: /\.s?css$/,
				loader: extractSass.extract("style", ["css?sourceMap", "sass?sourceMap"])
			}, {
				test: /\.(gif|jpg|jpeg|png|svg)$/,
				loader: `file?name=img/${ entry.name }/[name].[ext]`,
			}, {
				test: /\.(eot|otf|ttf|woff|woff2)$/,
				loader: `file?name=fonts/[name].[ext]`,
			}]
		},
		output: {
			path: "./release",
			publicPath: "../",
			filename: "./js/[name].js"
		},
		plugins: [
			dedupePlugin,
			definePlugin,
			extractSass,
			provideJQuery
		]
	};
	config.entry[entry.name] = entry.src;
	return config;
});
module.exports = webpackConfig;