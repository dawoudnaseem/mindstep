const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Firebase ships both ESM and CJS builds of @firebase/app. When firebase/app
// is imported as ESM it loads the ESM2017 build, while @firebase/auth (React
// Native build) does a CJS require of @firebase/app — two separate module
// instances with different component registries. That causes the
// "Component auth has not been registered yet" error. Force every import of
// @firebase/app to the same CJS file so there is only one instance.
const firebaseAppCjs = path.resolve(
  __dirname,
  'node_modules/@firebase/app/dist/index.cjs.js'
);

const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@firebase/app') {
    return { filePath: firebaseAppCjs, type: 'sourceFile' };
  }
  if (defaultResolve) {
    return defaultResolve(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
