const appJson = require('./app.json');

const baseExpoConfig = appJson.expo ?? {};

module.exports = () => {
  return {
    expo: {
      ...baseExpoConfig,
      extra: {
        ...baseExpoConfig.extra,
      },
    },
  };
};
