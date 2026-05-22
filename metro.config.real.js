console.log('--- METRO CONFIG LOADED ---');
const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const config = getDefaultConfig(__dirname);

// EXCLUDE the /api directory from the Expo Metro bunder.
// This ensures that server-side code (and Mongoose) is NOT bundled into 
// the mobile/web app, which was causing the Vercel build to fail.
config.resolver.blacklistRE = exclusionList([
  /api\/.*/,
]);

module.exports = config;
