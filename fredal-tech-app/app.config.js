const appJson = require('./app.json');

const baseExpoConfig = appJson.expo ?? {};

module.exports = () => {
  return {
    expo: {
      ...baseExpoConfig,
      plugins: [
        ...(baseExpoConfig.plugins ?? []),
        'expo-sharing',
      ],
      extra: {
        ...baseExpoConfig.extra,
      },
    },
  };
};
