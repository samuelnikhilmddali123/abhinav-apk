const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

// Resolve the real path to handle potential junction/symlink issues on Windows
const projectRoot = fs.realpathSync(__dirname);
const config = getDefaultConfig(projectRoot);

// Explicitly set project root and watch folders using the REAL path
config.projectRoot = projectRoot;
config.watchFolders = [projectRoot];

// EXCLUDE the /api directory from the Expo Metro bunder.
config.resolver.blacklistRE = /api\/.*/;

// Ensure that we can resolve modules correctly even with spaces in the path
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

module.exports = config;
