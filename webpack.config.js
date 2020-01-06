/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const FaviconsWebpackPlugin = require("favicons-webpack-plugin");

module.exports = {
  devServer: {
    host: "0.0.0.0"
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
        loader: "style-loader!css-loader",
        test: /\.css$/u
      },
      {
        test: /\.(png|mp4)$/u,
        use: [
          {
            loader: "url-loader",
            options: {
              limit: 4096,
              name: "public/[hash]-[name].[ext]"
            }
          }
        ]
      },
      {
        test: /(\.(woff|woff2|ttf|eot|svg)$)|(worker.min.js|ffmpeg-core.js)/u,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "public/[hash]-[name].[ext]"
            }
          }
        ]
      }
    ]
  },
  optimization: {
  },
  output: {
    chunkFilename: "[name]-[id].js",
    filename: "[name]-[id].js",
    path: path.join(
      __dirname,
      "/dist"
    )
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html"
    }),
    new FaviconsWebpackPlugin({
      logo: "./src/public/sample.png",
      prefix: "assets",
      publicPath: "/caketown"
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
