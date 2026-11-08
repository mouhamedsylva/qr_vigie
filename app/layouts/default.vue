<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui';

const auth = useAuthStore();
const colorMode = useColorMode();
const open = ref(false);

const links: NavigationMenuItem[] = [
  { label: 'Vue d\'ensemble', icon: 'i-lucide-radar', to: '/' },
  { label: 'Restaurants', icon: 'i-lucide-store', to: '/restaurants' },
  { label: 'Forfaits', icon: 'i-lucide-layers', to: '/plans' },
  { label: 'Journal d\'audit', icon: 'i-lucide-scroll-text', to: '/audit' },
].map((l) => ({ ...l, onSelect: () => (open.value = false) }));

const userMenu = computed<DropdownMenuItem[][]>(() => [
  [{ type: 'label', label: `${auth.user?.firstName} ${auth.user?.lastName}`, description: auth.user?.email }],
  [
    {
      label: 'Thème',
      icon: 'i-lucide-sun-moon',
      children: [
        { label: 'Clair', icon: 'i-lucide-sun', type: 'checkbox', checked: colorMode.preference === 'light', onSelect: () => (colorMode.preference = 'light') },
        { label: 'Sombre', icon: 'i-lucide-moon', type: 'checkbox', checked: colorMode.preference === 'dark', onSelect: () => (colorMode.preference = 'dark') },
        { label: 'Système', icon: 'i-lucide-monitor', type: 'checkbox', checked: colorMode.preference === 'system', onSelect: () => (colorMode.preference = 'system') },
      ],
    },
    { label: 'Ouvrir le back-office', icon: 'i-lucide-external-link', to: 'http://localhost:3001', target: '_blank' },
  ],
  [
    {
      label: 'Se déconnecter',
      icon: 'i-lucide-log-out',
      color: 'error',
      onSelect: async () => {
        await auth.logout();
        await navigateTo('/login');
      },
    },
  ],
]);

const searchGroups = [{ id: 'pages', label: 'Pages', items: links.map((l) => ({ label: l.label, icon: l.icon, to: l.to })) }];
</script>

<template>
  <UDashboardGroup unit="rem" storage="local" storage-key="vigie-dashboard">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-nuit-950 text-nuit-100"
      :ui="{ footer: 'border-t border-white/10', header: 'border-b border-white/10' }"
    >
      <template #header="{ collapsed }">
        <NuxtLink to="/" class="py-1">
          <VigieLogo :collapsed="collapsed" inverted />
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-white/5 text-nuit-100 ring-white/10" />
        <UNavigationMenu
          :collapsed="collapsed"
          :items="links"
          orientation="vertical"
          tooltip
          :ui="{
            link: 'text-nuit-200 hover:text-white data-active:text-white before:data-active:bg-white/10 hover:before:bg-white/5',
            linkLeadingIcon: 'text-nuit-300 group-data-active:text-safran-400 group-hover:text-white',
          }"
        />
      </template>

      <template #footer="{ collapsed }">
        <UDropdownMenu :items="userMenu" :content="{ align: 'center', collisionPadding: 12 }" class="w-full">
          <UButton
            :avatar="{ text: `${auth.user?.firstName?.[0] ?? ''}${auth.user?.lastName?.[0] ?? ''}` }"
            :label="collapsed ? undefined : `${auth.user?.firstName} ${auth.user?.lastName}`"
            trailing-icon="i-lucide-chevrons-up-down"
            color="neutral"
            variant="ghost"
            block
            :square="collapsed"
            class="text-nuit-100 hover:bg-white/5"
            :ui="{ trailingIcon: 'text-nuit-300' }"
          />
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="searchGroups" placeholder="Aller à…" />

    <slot />
  </UDashboardGroup>
</template>
