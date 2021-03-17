const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

module.exports = {
    mode: 'development',
    devtool: false,
    entry: {
        index: './src/index.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: [
                            '@babel/preset-env',
                        ],
                        plugins: [
                            '@babel/plugin-proposal-class-properties',
                        ]
                    }
                }
            },
        ]
    },
    plugins: [
        new CleanWebpackPlugin(),
    ],
    output: {
        libraryTarget: 'umd',
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js'
    }
}
