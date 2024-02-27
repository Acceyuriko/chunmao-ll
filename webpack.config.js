/* eslint-disable @typescript-eslint/no-var-requires */
// import path from "path";
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const lodash = require('lodash');

const base = {
  // target: 'node',
  mode: 'production',
  entry: {
    // main: './src/main.ts',
    // preload: './src/preload.ts'
  }, // 入口文件路径
  target: 'node',
  output: {
    // 输出文件配置
    path: path.resolve(__dirname, 'dist'), // 输出目录路径
    filename: '[name].js', // 输出文件名
    // libraryTarget: "commonjs2",
    // chunkFormat: "commonjs",
  },
  externals: [
    // "express",
    'electron',
    'fs',
    'path',
    'util',
    'crypto',
  ],
  experiments: {
    // outputModule: true
  },
  resolve: {
    extensions: ['.js', '.ts'],
  },
  module: {
    // 模块配置
    rules: [
      // 模块规则
      {
        test: /\.(js|ts)$/, // 匹配.js文件
        exclude: /node_modules/, // 排除node_modules目录
        use: {
          // 使用的loader
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-typescript'],
          },
        },
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
      }),
    ],
  },
};

const main = lodash.cloneDeep(base);
main.target = 'electron-main';
main.entry = {
  main: './src/main.ts',
  // preload: './src/preload.ts',
};
main.output.chunkFormat = 'commonjs';
main.output.libraryTarget = 'commonjs2';

const preload = lodash.cloneDeep(base);
preload.target = 'electron-preload';
preload.entry = {
  preload: './src/preload.ts',
};

preload.output.chunkFormat = 'commonjs';
preload.output.libraryTarget = 'commonjs2';

const renderer = lodash.cloneDeep(base);
renderer.target = 'electron-renderer';
renderer.entry = {
  renderer: './src/renderer.ts',
};
renderer.output.libraryTarget = 'module';
renderer.output.chunkFormat = 'module';
renderer.experiments.outputModule = true;

module.exports = [main, preload, renderer];
