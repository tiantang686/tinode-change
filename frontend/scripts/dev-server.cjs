const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const createConfig = require('../webpack.config');

const config = createConfig({ WEBPACK_SERVE: true }, { mode: 'development' });
const { devServer, ...compilerOptions } = config;
const compiler = webpack({ ...compilerOptions, mode: 'development' });

new WebpackDevServer(devServer, compiler).start().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
