/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");

const mode = process.env.NODE_ENV || "production";

module.exports = {
  devtool: "source-map",
  mode,
  module: {
    rules: [
      {
        loader: "ts-loader",
        options: {
          transpileOnly: true
        },
        test: /\.tsx?$/u
      },
      {
        enforce: "pre",
        loader: "source-map-loader",
        test: /\.js$/u
      }
    ]
  },
  node: {
    fs: "empty"
  },
  output: {
    filename: `worker.${mode}.js`,
    path: path.join(__dirname, "dist")
  },
  resolve: {
    extensions: [
      ".ts",
      ".tsx",
      ".js"
    ],
    plugins: []
  }
};
