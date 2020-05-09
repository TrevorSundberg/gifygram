/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

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
        test: /\.(woff|woff2|ttf|eot|svg)$/u,
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
  node: {
    fs: "empty"
  },
  optimization: {
  },
  output: {
    chunkFilename: "[name]-[id].js",
    filename: "[name]-[id].js",
    path: path.join(
      __dirname,
      "../www/static"
    )
  },
  plugins: [
    new HtmlWebpackPlugin({
      favicon: "./src/public/favicon.png",
      template: "./src/index.html"
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
