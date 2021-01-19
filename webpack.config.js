const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require('terser-webpack-plugin');

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = (nodeEnv === 'production');

module.exports = {
  mode: nodeEnv,
  optimization: {
    minimize: isProd,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress:{
            drop_console: true,
          }
        }
      }),
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'h5p-dictation.css'
    })
  ],
  entry: {
    dist: './src/entries/h5p-dictation.js'
  },
  output: {
    filename: 'h5p-dictation.js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: ''
            }
          },
          {
            loader: 'css-loader'
          }
        ],
      },
      {
        test: /\.svg$/,
        include: path.join(__dirname, 'src/images'),
        type: 'asset/resource'
      },
      {
        test: /\.woff$/,
        include: path.join(__dirname, 'src/fonts'),
        type: 'asset/resource'
      }
    ]
  },
  stats: {
    colors: true
  },
  devtool: (isProd) ? undefined : 'eval-cheap-module-source-map'
};
