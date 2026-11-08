<template>
  <div class="grid min-h-dvh lg:grid-cols-2">
    <!-- Panneau d'identité -->
    <aside class="relative hidden overflow-hidden bg-nuit-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div
        class="pointer-events-none absolute -top-32 -right-32 size-[36rem] rounded-full border border-nuit-400/20"
        aria-hidden="true"
      />
      <div class="pointer-events-none absolute -top-12 -right-12 size-[26rem] rounded-full border border-nuit-400/20" aria-hidden="true" />
      <div class="pointer-events-none absolute top-24 right-24 size-[16rem] rounded-full border border-safran-400/30" aria-hidden="true" />

      <VigieLogo inverted />

      <div class="relative max-w-md space-y-6">
        <h2 class="font-display text-4xl leading-tight font-semibold">Toute la plateforme, sous un seul regard.</h2>
        <ul class="space-y-3 text-nuit-200">
          <li class="flex gap-3"><UIcon name="i-lucide-radar" class="mt-0.5 size-5 text-safran-400" /> Activité, revenus récurrents et résiliations en temps réel</li>
          <li class="flex gap-3"><UIcon name="i-lucide-store" class="mt-0.5 size-5 text-safran-400" /> Restaurants, abonnements et modération</li>
          <li class="flex gap-3"><UIcon name="i-lucide-scroll-text" class="mt-0.5 size-5 text-safran-400" /> Journal d'audit de toutes les actions sensibles</li>
        </ul>
      </div>

      <p class="relative text-xs text-nuit-300">Accès réservé à l'équipe QR-Order. Toutes les actions sont journalisées.</p>
    </aside>

    <main class="flex items-center justify-center p-6 sm:p-12">
      <div class="w-full max-w-sm">
        <div class="mb-8 lg:hidden"><VigieLogo /></div>
        <slot />
      </div>
    </main>
  </div>
</template>
