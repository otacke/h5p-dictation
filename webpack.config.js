const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const nodeEnv = process.env.NODE_ENV || 'development';
const libraryName = process.env.npm_package_name;

module.exports = {
  mode: nodeEnv,
  resolve: {
    alias: {
      '@services': path.resolve(__dirname, 'src/scripts/services'),
      '@scripts': path.resolve(__dirname, 'src/scripts'),
      '@styles': path.resolve(__dirname, 'src/styles')
    }
  },
  optimization: {
    minimize: nodeEnv === 'production',
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
          }
        }
      })
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: `${libraryName}.css`
    })
  ],
  entry: {
    dist: './src/entries/dist.js'
  },
  output: {
    filename: `${libraryName}.js`,
    path: path.resolve(__dirname, 'dist')
  },
  target: ['browserslist'],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
      {
        test: /\.(s[ac]ss|css)$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: ''
            }
          },
          {
            loader: 'css-loader'
          },
          {
            loader: 'sass-loader'
          }
        ]
      },
      {
        test: /\.svg|\.jpg|\.png$/,
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
  ...(nodeEnv !== 'production' && { devtool: 'eval-cheap-module-source-map' })
};
