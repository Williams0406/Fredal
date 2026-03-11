// store/authStore.js
import { create } from 'zustand';
import { authAPI } from '../lib/api';

export const useAuthStore = create((set) => ({
  user: null,
  isLoading: true,

  loadUser: async () => {
    try {
      const user = await authAPI.me();
      set({ user, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
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