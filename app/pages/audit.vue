<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import type { AuditLog, Paginated } from '~/types/api';
import { DOMAIN_OPTIONS } from '~/utils/labels';

useHead({ title: 'Journal d\'audit · Vigie' });

const api = useApi();
const route = useRoute();
const router = useRouter();

// Les filtres vivent dans l'URL : un lien vers une recherche se partage.
const q = (k: string) => (typeof route.query[k] === 'string' ? (route.query[k] as string) : '');
const domain = ref(q('domain') || 'ALL');
const action = ref(q('action'));
const actionDebounced = refDebounced(action, 400);
const from = ref(q('from'));
const to = ref(q('to'));
const restaurantId = computed(() => q('restaurantId'));
const actorId = computed(() => q('actorId'));
const page = ref(1);
const limit = 50;

const filters = computed(() => {
  // Action précise (préfixe libre) prioritaire sur le domaine.
  const prefix = actionDebounced.value.trim() || (domain.value !== 'ALL' ? `${domain.value}.` : '');
  return {
    ...(prefix && { action: prefix }),
    ...(restaurantId.value && { restaurantId: restaurantId.value }),
    ...(actorId.value && { actorId: actorId.value }),
    ...(from.value && { from: new Date(`${from.value}T00:00:00`).toISOString() }),
    ...(to.value && { to: new Date(`${to.value}T23:59:59.999`).toISOString() }),
  };
});

watch([domain, actionDebounced, from, to], () => {
  page.value = 1;
  router.replace({
    query: {
      ...route.query,
      domain: domain.value !== 'ALL' ? domain.value : undefined,
      action: actionDebounced.value || undefined,
      from: from.value || undefined,
      to: to.value || undefined,
    },
  });
});
watch([restaurantId, actorId], () => (page.value = 1));

const { data, status } = useAsyncData(
  'audit',
  () => api<Paginated<AuditLog>>('/admin/audit-logs', { query: { ...filters.value, page: page.value, limit } }),
  { watch: [filters, page] },
);

function setFilter(key: 'actorId' | 'restaurantId', value: string) {
  router.replace({ query: { ...route.query, [key]: value } });
}
function clearScope(key: 'actorId' | 'restaurantId') {
  const { [key]: _omit, ...rest } = route.query;
  router.replace({ query: rest });
}
function clearAll() {
  domain.value = 'ALL';
  action.value = '';
  from.value = '';
  to.value = '';
  router.replace({ query: {} });
}

const hasFilters = computed(() => Object.keys(filters.value).length > 0);
// Nom affiché du filtre acteur, retrouvé dans les entrées chargées.
const actorName = computed(() => {
  const a = data.value?.data.find((l) => l.actor?.id === actorId.value)?.actor;
  return a ? a.email : `${actorId.value.slice(0, 8)}…`;
});
</script>

<template>
  <UDashboardPanel id="audit">
    <template #header>
      <UDashboardNavbar title="Journal d'audit">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #trailing>
          <UBadge v-if="data" color="neutral" variant="subtle" :label="`${data.meta.total.toLocaleString('fr-FR')} entrées`" />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <template #left>
          <USelect
            v-model="domain"
            :items="[{ label: 'Tous les domaines', value: 'ALL', icon: 'i-lucide-layers' }, ...DOMAIN_OPTIONS]"
            class="w-48"
          />
          <UInput v-model="action" icon="i-lucide-search" placeholder="Action (ex. payments.refund)" class="w-56 font-mono" />
          <div class="flex items-center gap-1">
            <UInput v-model="from" type="date" aria-label="Du" class="w-36" />
            <span class="text-muted">→</span>
            <UInput v-model="to" type="date" aria-label="Au" class="w-36" />
          </div>
        </template>
        <template #right>
          <UButton v-if="hasFilters" color="neutral" variant="link" icon="i-lucide-x" label="Effacer les filtres" @click="clearAll" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <div v-if="restaurantId || actorId" class="flex flex-wrap gap-2">
          <UBadge v-if="restaurantId" color="primary" variant="subtle" size="lg" icon="i-lucide-store">
            Restaurant
            <NuxtLink :to="`/restaurants/${restaurantId}`" class="font-mono underline">{{ restaurantId.slice(0, 8) }}…</NuxtLink>
            <UButton size="xs" variant="link" icon="i-lucide-x" aria-label="Retirer" class="p-0" @click="clearScope('restaurantId')" />
          </UBadge>
          <UBadge v-if="actorId" color="primary" variant="subtle" size="lg" icon="i-lucide-user" :label="`Par ${actorName}`">
            <template #trailing>
              <UButton size="xs" variant="link" icon="i-lucide-x" aria-label="Retirer" class="p-0" @click="clearScope('actorId')" />
            </template>
          </UBadge>
        </div>

        <UCard :ui="{ body: 'p-0 sm:p-0' }">
          <AuditList :logs="data?.data ?? []" :loading="status === 'pending'" show-restaurant @filter="setFilter" />
        </UCard>

        <div v-if="data && data.meta.totalPages > 1" class="flex justify-end">
          <UPagination v-model:page="page" :total="data.meta.total" :items-per-page="limit" />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
