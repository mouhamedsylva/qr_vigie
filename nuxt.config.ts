// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  // Console interne derrière authentification : application monopage.
  ssr: false,
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxt/eslint'],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:3000/api/v1',
    },
  },

  app: {
    head: {
      title: 'Vigie · QR-Order',
      htmlAttrs: { lang: 'fr' },
      meta: [
        { name: 'theme-color', content: '#4F46E5' },
        // Console interne : jamais indexée.
        { name: 'robots', content: 'noindex, nofollow' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  // Pré-chargé pour éviter un redémarrage du serveur à la première visite de /login.
  vite: { optimizeDeps: { include: ['zod'] } },

  eslint: { config: { stylistic: false } },
});
