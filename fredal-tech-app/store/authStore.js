// store/authStore.js
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../lib/api';

export const useAuthStore = create((set) => ({
  user: null,
  isLoading: true,

  loadUser: async () => {
    set({ isLoading: true });

    const token = await SecureStore.getItemAsync('access_token');
    if (!token) {
      set({ user: null, isLoading: false });
      return;
    }

    try {
      const user = await authAPI.me();
      set({ user, isLoading: false });
    } catch {
      set((state) => ({ user: state.user, isLoading: false }));
    }
  },

  login: async (username, password) => {
    await authAPI.login(username, password);
    const user = await authAPI.me();
    set({ user, isLoading: false });
  },

  logout: async () => {
    await authAPI.logout();
    set({ user: null, isLoading: false });
  },
}));