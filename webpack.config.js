const webpack = require("webpack");
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

var tsDir = path.resolve(__dirname, 'ts');
var webDir = path.resolve(__dirname, 'web');

module.exports = {
  entry: './ts/eden.ts',
  mode: 'development',
  devtool: 'inline-source-map',

  optimization: {
    minimize: false
  },

  resolve: {
    extensions: ['.js', '.ts', '.kurt'],
  },

  output: {
    filename: 'eden.js',
    path: webDir
  },

  module: {
    rules: [
      { test: /\.ts$/, use: 'ts-loader' },
      { test: /\.kurt$/, use: 'raw-loader' },
    ]
  },

  devServer: {
    contentBase: webDir,
  },

  plugins: [
    new webpack.IgnorePlugin(/(fs)/),
    // new CopyPlugin({patterns:[
    //   { from: 'src', to: webDir },
    // ]})
  ],
};
