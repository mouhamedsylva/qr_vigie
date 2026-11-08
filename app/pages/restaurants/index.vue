<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import { refDebounced } from '@vueuse/core';
import type { AdminRestaurant, Paginated, RestaurantStatus } from '~/types/api';
import { RESTAURANT_STATUS, SUBSCRIPTION_STATUS } from '~/utils/labels';

useHead({ title: 'Restaurants · Vigie' });

const api = useApi();
const route = useRoute();
const router = useRouter();
const actions = useRestaurantActions();

const search = ref(String(route.query.search ?? ''));
const searchDebounced = refDebounced(search, 350);
const status = ref<RestaurantStatus | 'ALL'>('ALL');
const page = ref(1);
const limit = 25;

/** Filtres « à surveiller » venus de la vue d'ensemble (calculés côté console). */
const FOCUS: Record<string, { label: string; test: (r: AdminRestaurant) => boolean }> = {
  pastDue: { label: 'Abonnements impayés', test: (r) => r.owner.subscription?.status === 'PAST_DUE' },
  trialEnding: {
    label: 'Essais finissant sous 7 jours',
    test: (r) => {
      const s = r.owner.subscription;
      if (s?.status !== 'TRIALING' || !s.trialEndsAt) return false;
      const end = new Date(s.trialEndsAt).getTime();
      return end > Date.now() && end <= Date.now() + 7 * 864e5;
    },
  },
  suspended: { label: 'Suspendus ou bannis', test: (r) => r.status !== 'ACTIVE' },
  inactive: {
    label: 'Aucune commande depuis 30 jours',
    test: (r) => r.status === 'ACTIVE' && r._count.orders === 0 && Date.now() - new Date(r.createdAt).getTime() > 14 * 864e5,
  },
};
const focus = computed(() => (typeof route.query.focus === 'string' && FOCUS[route.query.focus] ? route.query.focus : null));
const clearFocus = () => router.replace({ query: {} });

watch([searchDebounced, status], () => (page.value = 1));

const { data, status: fetchStatus, refresh } = useAsyncData(
  'admin-restaurants',
  () =>
    api<Paginated<AdminRestaurant>>('/admin/restaurants', {
      query: {
        page: focus.value ? 1 : page.value,
        limit: focus.value ? 100 : limit,
        ...(searchDebounced.value.trim() && { search: searchDebounced.value.trim() }),
        ...(status.value !== 'ALL' && { status: status.value }),
      },
    }),
  { watch: [page, searchDebounced, status, focus] },
);

const rows = computed(() => {
  const list = data.value?.data ?? [];
  return focus.value ? list.filter(FOCUS[focus.value]!.test) : list;
});

const columns: TableColumn<AdminRestaurant>[] = [
  { accessorKey: 'name', header: 'Restaurant' },
  { id: 'owner', header: 'Propriétaire' },
  { id: 'plan', header: 'Forfait' },
  { id: 'activity', header: () => h('span', { class: 'block text-right' }, 'Activité 30 j') },
  { accessorKey: 'status', header: 'Statut' },
  { accessorKey: 'createdAt', header: 'Inscrit le' },
  { id: 'actions' },
];

function menu(r: AdminRestaurant): DropdownMenuItem[][] {
  return [
    [
      { label: 'Voir la fiche', icon: 'i-lucide-panel-right-open', to: `/restaurants/${r.id}` },
    ],
    [
      { label: 'Abonnement…', icon: 'i-lucide-credit-card', onSelect: async () => (await actions.editSubscription(r.owner)) && refresh() },
      { label: 'Changer le statut…', icon: 'i-lucide-shield-alert', onSelect: async () => (await actions.setRestaurantStatus(r)) && refresh() },
      { label: 'Suspendre le propriétaire…', icon: 'i-lucide-user-x', color: 'error', onSelect: async () => (await actions.setOwnerStatus(r.owner)) && refresh() },
    ],
  ];
}

const date = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const trialLeft = (iso: string | null) => (iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5)) : null);
</script>

<template>
  <UDashboardPanel id="restaurants">
    <template #header>
      <UDashboardNavbar title="Restaurants">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #trailing>
          <UBadge v-if="data" color="neutral" variant="subtle" :label="data.meta.total.toLocaleString('fr-FR')" />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <template #left>
          <UInput v-model="search" icon="i-lucide-search" placeholder="Nom, ville, slug ou email du propriétaire…" class="w-full sm:w-80" />
          <USelect
            v-model="status"
            :items="[
              { label: 'Tous les statuts', value: 'ALL' },
              ...Object.entries(RESTAURANT_STATUS).map(([value, s]) => ({ label: s.label, value })),
            ]"
            class="w-44"
          />
        </template>
        <template #right>
          <UBadge v-if="focus" color="primary" variant="subtle" size="lg" :label="FOCUS[focus]!.label">
            <template #trailing>
              <UButton size="xs" color="primary" variant="link" icon="i-lucide-x" aria-label="Retirer le filtre" class="-me-1 p-0" @click="clearFocus" />
            </template>
          </UBadge>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UTable
        :data="rows"
        :columns="columns"
        :loading="fetchStatus === 'pending'"
        sticky
        class="rounded-lg border border-default"
        :ui="{ tr: 'cursor-pointer', td: 'py-2.5' }"
        @select="(_e: Event, row) => navigateTo(`/restaurants/${row.original.id}`)"
      >
        <template #name-cell="{ row }">
          <div class="flex items-center gap-3">
            <UAvatar :text="row.original.name.slice(0, 2).toUpperCase()" size="sm" />
            <div class="min-w-0">
              <p class="truncate font-medium text-highlighted">{{ row.original.name }}</p>
              <p class="truncate text-xs text-muted">{{ row.original.city ?? '—' }}, {{ row.original.country }} · {{ row.original.currency }}</p>
            </div>
          </div>
        </template>
        <template #owner-cell="{ row }">
          <p class="truncate text-sm">{{ row.original.owner.firstName }} {{ row.original.owner.lastName }}</p>
          <p class="truncate text-xs text-muted">{{ row.original.owner.email }}</p>
        </template>
        <template #plan-cell="{ row }">
          <template v-if="row.original.owner.subscription">
            <p class="font-mono text-xs font-semibold">{{ row.original.owner.subscription.plan.code }}</p>
            <UBadge
              :color="SUBSCRIPTION_STATUS[row.original.owner.subscription.status].color"
              variant="subtle"
              size="sm"
              :label="
                row.original.owner.subscription.status === 'TRIALING'
                  ? `Essai · ${trialLeft(row.original.owner.subscription.trialEndsAt)} j`
                  : SUBSCRIPTION_STATUS[row.original.owner.subscription.status].label
              "
            />
          </template>
          <span v-else class="text-xs text-dimmed">Aucun</span>
        </template>
        <template #activity-cell="{ row }">
          <p class="tabular text-right text-sm font-medium">{{ row.original._count.orders.toLocaleString('fr-FR') }} cmd</p>
          <p class="tabular text-right text-xs text-muted">{{ row.original._count.tables }} tables · {{ row.original._count.memberships }} membres</p>
        </template>
        <template #status-cell="{ row }">
          <UBadge
            :color="RESTAURANT_STATUS[row.original.status].color"
            variant="subtle"
            :icon="RESTAURANT_STATUS[row.original.status].icon"
            :label="RESTAURANT_STATUS[row.original.status].label"
          />
        </template>
        <template #createdAt-cell="{ row }">
          <span class="text-sm text-muted">{{ date(row.original.createdAt) }}</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end" @click.stop>
            <UDropdownMenu :items="menu(row.original)" :content="{ align: 'end' }">
              <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" aria-label="Actions" />
            </UDropdownMenu>
          </div>
        </template>
        <template #empty>
          <UEmpty icon="i-lucide-store" title="Aucun restaurant" description="Aucun résultat pour ces critères." variant="naked" />
        </template>
      </UTable>

      <p v-if="focus && data && data.meta.total > 100" class="mt-3 text-xs text-muted">
        Filtre appliqué aux 100 inscriptions les plus récentes.
      </p>
      <div v-if="!focus && data && data.meta.totalPages > 1" class="mt-4 flex items-center justify-between">
        <p class="text-sm text-muted">{{ data.meta.total.toLocaleString('fr-FR') }} restaurants</p>
        <UPagination v-model:page="page" :total="data.meta.total" :items-per-page="limit" />
      </div>
    </template>
  </UDashboardPanel>
</template>
