/* eslint-disable @typescript-eslint/no-var-requires */
const nodeExternals = require("webpack-node-externals");

module.exports = {
  entry: "./test.ts",
  externals: [nodeExternals()],
  mode: "development",
  module: {
    rules: [
      {
        loader: "ts-loader",
        options: {
          transpileOnly: true
        },
        test: /\.tsx?$/u
      }
    ]
  },
  resolve: {
    extensions: [
      ".ts",
      ".tsx",
      ".js"
    ],
    plugins: []
  },
  target: "node",
  node: {
    __dirname: false
  },
  watch: true
};
