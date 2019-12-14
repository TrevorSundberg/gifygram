/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  devtool: "source-map",
  entry: "./src/index.tsx",
  module: {
    rules: [
      {
        loader: "awesome-typescript-loader",
        test: /\.tsx?$/u
      }
    ]
  },
  output: {
    filename: "bundle.min.js",
    path: path.join(
      __dirname,
      "/dist"
    )
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html"
    })
  ],
  resolve: {
    extensions: [
      ".ts",
      ".tsx",
      ".js"
    ]
  }
};
