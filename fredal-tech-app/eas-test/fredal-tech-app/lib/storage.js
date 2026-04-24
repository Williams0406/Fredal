// lib/storage.js
import * as SecureStore from 'expo-secure-store';

export const storage = {
  setToken: (key, value) =>
    SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
  getToken: (key) => SecureStore.getItemAsync(key),
  deleteToken: (key) => SecureStore.deleteItemAsync(key),
  clearAll: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
  },
};