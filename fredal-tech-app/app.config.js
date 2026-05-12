const appJson = require('./app.json');

const baseExpoConfig = appJson.expo ?? {};
const shouldEnableEasUpdates = process.env.EXPO_USE_EAS_UPDATES === '1';

module.exports = () => {
  const config = {
    ...baseExpoConfig,
    extra: {
      ...baseExpoConfig.extra,
    },
  };

  if (shouldEnableEasUpdates) {
    config.runtimeVersion = {
      policy: 'appVersion',
    };
    config.updates = {
      url: 'https://u.expo.dev/5f96fc08-8d68-431f-b4b5-bcd9b2268d94',
    };
  } else {
    delete config.runtimeVersion;
    delete config.updates;
  }

  return {
    expo: config,
  };
};
