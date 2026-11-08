import { defineStore } from 'pinia';
import type { Me, TokenPair } from '~/types/api';

const REFRESH_KEY = 'vigie.refreshToken';

/**
 * Session : jeton d'accès en mémoire (15 min), refresh token en
 * localStorage. Limite connue : en production, préférer un cookie httpOnly
 * via un proxy serveur — d'autant plus pour une console d'administration.
 */
export const useAuthStore = defineStore('auth', () => {
  const config = useRuntimeConfig();
  const accessToken = ref<string | null>(null);
  const user = ref<Me | null>(null);
  const initialized = ref(false);

  const isLoggedIn = computed(() => !!accessToken.value && !!user.value);

  // Appels sans intercepteur (évite toute boucle avec le rafraîchissement).
  const raw = $fetch.create({ baseURL: config.public.apiBase });

  function storeTokens(tokens: TokenPair) {
    accessToken.value = tokens.accessToken;
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  }

  function clear() {
    accessToken.value = null;
    user.value = null;
    localStorage.removeItem(REFRESH_KEY);
  }

  async function fetchMe() {
    user.value = await raw<Me>('/auth/me', {
      headers: { Authorization: `Bearer ${accessToken.value}` },
    });
  }

  async function login(email: string, password: string) {
    const res = await raw<{ tokens: TokenPair }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    storeTokens(res.tokens);
    await fetchMe();
  }

  /** Un seul rafraîchissement à la fois, partagé par les 401 simultanés. */
  const refresh = singleFlight(async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return false;
    try {
      storeTokens(await raw<TokenPair>('/auth/refresh', { method: 'POST', body: { refreshToken } }));
      return true;
    } catch {
      clear();
      return false;
    }
  });

  async function init() {
    if (initialized.value) return;
    initialized.value = true;
    if (await refresh()) {
      await fetchMe().catch(() => clear());
    }
  }

  async function logout() {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (refreshToken) {
      await raw('/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => undefined);
    }
    clear();
  }

  return { accessToken, user, initialized, isLoggedIn, login, refresh, fetchMe, init, logout, clear };
});
