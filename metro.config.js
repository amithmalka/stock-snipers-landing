const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Inline requires: delay module initialization until first use.
// Reduces JS parse/eval time on startup.
config.transformer.getTransformOptions = async () => ({
  transform: {
    inlineRequires: true,
  },
});

module.exports = config;
