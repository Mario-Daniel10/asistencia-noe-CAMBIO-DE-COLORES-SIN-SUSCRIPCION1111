// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Agregar resolución para módulos de Node.js
config.resolver.extraNodeModules = {
  stream: require.resolve("stream-browserify"),
  path: require.resolve("path-browserify"),
  buffer: require.resolve("buffer"),
};

module.exports = config;
