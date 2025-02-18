var webpack = require( "webpack" );
var extractTextWebpackPlugin = require( "extract-text-webpack-plugin" );
var dedupePlugin = new webpack.optimize.DedupePlugin();
var extractSass = new extractTextWebpackPlugin( "css/[name].css" );
var provideJQuery = new webpack.ProvidePlugin({
  $: "jquery",
  jQuery: "jquery"
});
var entries = [
  {
    name: "login",
    src: "./server/scripts/login.js"
  },
  {
    name: "admin",
    src: "./server/scripts/admin.js"
  },
  {
    name: "order",
    src: "./server/scripts/order.js"
  },
  {
    name: "product",
    src: "./server/scripts/product.js"
  },
  {
    name: "items",
    src: "./server/scripts/items.js"
  },
  {
    name: "users",
    src: "./server/scripts/users.js"
  },
  {
    name: "dealers",
    src: "./server/scripts/dealers.js"
  },
  {
    name: "brands",
    src: "./server/scripts/brands.js"
  }
];
var webpackConfig = entries.map(function( entry, index, array ) {
  var config = {
    // devtool: "source-map",
    entry: {},
    module: {
      loaders: [
        {
          test: /\.jsx?$/,
          loader: "babel",
          query: {
            presets: ["es2015", "react"]
          },
          exclude: /(node_modules|bower_components)/
        },
        {
          test: /\.s?css$/,
          loader: extractSass.extract( "style", ["css?sourceMap", "sass?sourceMap"] )
        },
        {
          test: /\.svg/, loader: "svg-url-loader"
        },
        {
          test: /\.(gif|jpg|jpeg|png)$/,
          loader: `file?name=img/${ entry.name }/[name].[ext]`,
        },
        {
          test: /\.(eot|otf|ttf|woff|woff2)$/,
          loader: `file?name=fonts/[name].[ext]`,
        }
      ]
    },
    output: {
      path: "./release",
      publicPath: "../",
      filename: "js/[name].js"
    },
    plugins: [
      dedupePlugin,
      extractSass,
      provideJQuery
    ]
  };
  config.entry[entry.name] = entry.src;
  return config;
});
module.exports = webpackConfig;