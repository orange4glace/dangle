const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
  entry: {
    carouselExample: './example/carousel/index.ts',
  }, 
  output: {
    filename: "./example/[name].bundle.js" ,
  },
  resolve: {
    extensions: [".js", ".ts"]
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      hash: true,
      title: 'Carousel Example',
      template: './example/carousel/index.html',
      chunks: ['carouselExample'],
      filename: './example/carousel/index.html'
    }),
  ]
}