/**
 * Here is just a simple webpack config, you can add other features you like,
 * like eslint etc.
 */

const path = require('path');
const webpack = require('webpack');

const hotReloadUrl = 'webpack-hot-middleware/client';

var entry = {};
entry.common = ['vue', /* ... */];

module.exports = {
	devtool: 'cheap-eval-source-map',
	context: path.resolve(__dirname, '../'),
	entry: entry,

	output: {
		path: path.resolve(__dirname, '../temp'),
		filename: 'js/[name].js',
		chunkFilename: 'js/[name].js',
		publicPath: '/',
	},

	module: {
		loaders: [
			{ test: /\.js$/, exclude: /node_modules/, loaders: ['babel'] },
			{ test: /\.less$/, exclude: /node_modules/, loaders: ['style', 'css', 'less'] },
			{ test: /\.html$/, exclude: /views/, loader: 'vue-html?attrs=img:src img:data-src' },
			{ test: /\.html$/, include: /views/, loaders: 'html?attrs=img:src img:data-src' },
		]
	},

	alias: {
		vue: 'vue/dist/vue.js',
	},

	plugins: [
		new webpack.optimize.OccurrenceOrderPlugin(),
		new webpack.HotModuleReplacementPlugin(),
		new webpack.NoErrorsPlugin(),
		new webpack.optimize.CommonsChunkPlugin(
			"common",
			"js/common.js"
		),
		new webpack.ProvidePlugin({
			Vue: 'vue',
		}),
	],

	// for special template, like tornado template.
	htmlLoader: {
		ignoreCustomFragments: [/\{\{.*?}}|\{%.*?%}/],
		attrs: ['img:src', 'link:href', 'img:data-src']
	}
}
