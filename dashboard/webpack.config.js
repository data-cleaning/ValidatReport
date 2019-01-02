const path = require('path');

module.exports = {
  entry: './src/validationDashboard.js',
  output: {
    path: path.resolve(__dirname, 'js'),
    filename: 'validationDashBoard.js'
  },
	module: {
	  rules: [
		{
		  test: /\.m?js$/,
		  exclude: /(node_modules|bower_components)/,
		  use: {
			loader: 'babel-loader',
			options: {
			  presets: ['@babel/preset-env']
			}
		  }
		}
	  ]
	}
};
