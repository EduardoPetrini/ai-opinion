// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxtjs/tailwindcss'],

  runtimeConfig: {
    // Private keys only available server-side
    openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://ai.movydata.com',
      siteName: process.env.NUXT_PUBLIC_SITE_NAME || 'AI Opinion App',
      wsUrl: process.env.NUXT_PUBLIC_WS_URL || 'ws://localhost:3001',
    }
  }
})
