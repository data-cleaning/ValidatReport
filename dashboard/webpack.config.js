const path = require('path');

module.exports = {
  entry: './src/validationDashboard.js',
  //entry: './src/validationDashboard0.0.5Alpha.js',
  output: {
    path: path.resolve(__dirname, 'js'),
    filename: 'validationDashBoard.js'
	//filename: 'validationDashBoard0.0.5.Alpha.js'
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
