/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const uuidv4 = require("uuid/v4");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  devServer: {
    host: "0.0.0.0",
    historyApiFallback: true
  },
  devtool: "source-map",
  entry: "./src/index.tsx",
  module: {
    rules: [
      {
        loader: "raw-loader",
        test: /\.html$/u
      },
      {
        loader: "ts-loader",
        test: /\.tsx?$/u
      },
      {
        include: /\.module\.css$/u,
        test: /\.css$/u,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              importLoaders: 1,
              modules: true
            }
          }
        ]
      },
      {
        exclude: /\.module\.css$/u,
        test: /\.css$/u,
        use: [
          "style-loader",
          "css-loader"
        ]
      },
      {
        test: /\.(png|mp4|webm)$/u,
        use: [
          {
            loader: "url-loader",
            options: {
              limit: 4096,
              name: "public/[name]-[contenthash].[ext]"
            }
          }
        ]
      },
      {
        test: /\.(woff|woff2|ttf|eot|svg)$/u,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "public/[name]-[contenthash].[ext]"
            }
          }
        ]
      }
    ]
  },
  node: {
    fs: "empty"
  },
  optimization: {
  },
  output: {
    chunkFilename: "[name]-[chunkhash].js",
    filename: "[name]-[hash].js",
    path: path.join(
      __dirname,
      "../backend/static"
    )
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.htm",
      title: require("./title")
    }),
    new webpack.DefinePlugin({
      CACHE_GUID: JSON.stringify(uuidv4())
    })
  ],
  resolve: {
    extensions: [
      ".ts",
      ".tsx",
      ".js",
      ".css"
    ]
  }
};
