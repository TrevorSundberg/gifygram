/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const {CleanWebpackPlugin} = require("clean-webpack-plugin");

const mode = process.env.NODE_ENV || "production";

module.exports = {
  devtool: "source-map",
  entry: "./src/index.ts",
  externals: (context, request, callback) => {
    // Only bundle relative paths that start with . (e.g. './src/index.ts').
    if ((/^\./u).test(request)) {
      return callback();
    }
    return callback(null, `commonjs ${request}`);
  },
  mode,
  module: {
    rules: [
      {
        loader: "ts-loader",
        test: /\.ts$/u
      }
    ]
  },
  optimization: {minimize: false},
  output: {
    libraryTarget: "commonjs",
    filename: "[name].js",
    path: path.join(__dirname, "dist")
  },
  plugins: [new CleanWebpackPlugin()],
  resolve: {
    extensions: [
      ".ts",
      ".tsx",
      ".js"
    ]
  },
  target: "node",
  watch: false
};
