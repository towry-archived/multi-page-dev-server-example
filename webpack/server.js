
// views, aka templates in this case.

const path = require('path');
const fs = require('fs');
const Express = require('express');
const webpack = require('webpack');
const MultiEntryPlugin = require('webpack/lib/MultiEntryPlugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const webpackConfig = require('./webpack.config');
const entries = require('./bundle.config');
const views = require('./view.config');

const serverOptions = {
	contentBase: path.resolve(__dirname, '../temp/'),
	quiet: true,
	noInfo: false,
	hot: true,
	inline: true,
	lazy: false,
	publicPath: webpackConfig.output.publicPath,
	headers: {'Access-Control-Allow-Origin': '*'},
	stats: {colors: true},
};

// The key is the template name without chunks,
// the value is the template name with chunsk.
var templateItemMap = function () {
	var map = {};
	views.forEach(function (item) {
		if (item.indexOf('shared/') === 0) {
			return;
		}

		var templateName = getTemplateName(item);
		if (templateName[0] === '/') {
			templateName = templateName.substr(1);
		}
		map[templateName] = item;
	});

	return map;
}.call(null);
const compiler = webpack(webpackConfig);
const devMiddlewareInstance = webpackDevMiddleware(compiler, serverOptions);
var entryInUse = {};
// caches
var pageCache = {};
var app = Express();

app.get('/', function (req, res) {
	// usually, i will list the templates,
	// so people can click the link and redirect to the page that
	// they want to develop.
	res.end('ok');
});

// main
app.get('/page/*', function (req, res) {
	// First, we get the template(view) name,
	// for example, if the request path is `/page/index.html`, then the
	// template name is `index.html`.

	var templateName = getTemplateNameFromReqUrl(req.path);
	// pass invalid request.
	if (!templateName || !(templateName in templateItemMap)) {
		res.status(404).end("template not exists");
		return;
	}

	res.type('.html');

	handleRequest(templateName, function (content) {
		res.end(content);
	});
});

// add middlewares.
app.use(devMiddlewareInstance);
app.use(webpackHotMiddleware(compiler));

// handle the page request, add chunks to the webpack compiler.
function handleRequest(templateName, cb) {
	// use cache.
	if (templateName in pageCache) {
		cb && cb(pageCache[templateName]);
		return;
	}

	if (applyPlugins(templateItemMap[templateName], compiler)) {
		devMiddlewareInstance.invalidate();
		devMiddlewareInstance.waitUntilValid(function () {
			try {
				var template = path.join(webpackConfig.output.path, "./index.html");
				var content = devMiddlewareInstance.fileSystem.readFileSync(template);
				pageCache[templateName] = content;
				cb && cb(content);
			} catch (e) {
				cb && cb(e.toString());
			}
		});
	}
}

function applyPlugins(template, compiler) {
	if (!template) {
		throw new Error("no such template: " + template);
	}

	var templatePath;
	var chunks = [];
	var chunksInTemplate = getChunks(template);
	templatePath = chunksInTemplate[0];
	chunksInTemplate = chunksInTemplate.slice(1);
	chunks = chunksInTemplate;

	// add entry.
	chunksInTemplate.forEach(function (chunk) {
		// already added.
		if (chunk in entryInUse) {
			return;
		}

		var item = entries[chunk];
		if (!item) {
			return;
		}
		if (Object.prototype.toString.call(item) !== '[object Array]') {
			item = [item];
		}

		entryInUse[chunk] = true;
		compiler.apply(new MultiEntryPlugin(null, item, chunk));
	});

	// Add html webpack plugin.
	var htmlPlugin = new HtmlWebpackPlugin({
		filename: './index.html',
		template: path.join(path.resolve(__dirname, '../views'), templatePath),
		cache: false,
		chunks: chunks,
	});
	compiler.apply(htmlPlugin);

	return true;
}

function getTemplateNameFromReqUrl(url) {
	if (url.indexOf('.html') === -1) {
		return null;
	}

	var parts = url.split('/page');
	if (parts.length <= 1) {
		return null;
	}

	var template = parts[1];
	if (template[0] === '/') {
		return template.substr(1);
	} else {
		return template;
	}
}

function getChunks(p) {
	return p.split('!');
}

function getTemplateName(p) {
	var a = p.split('!');
	return a[0];
}
