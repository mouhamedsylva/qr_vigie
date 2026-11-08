import type { ApiClient } from '~/plugins/api';

/** Client de l'API (voir plugins/api.ts). */
export function useApi(): ApiClient {
  return useNuxtApp().$api;
}
