<script setup lang="ts">
import type { AdminRestaurant, Paginated, PlatformAnalytics, SubscriptionStatus } from '~/types/api';
import { moneyByCurrency, RESTAURANT_STATUS, SUBSCRIPTION_STATUS } from '~/utils/labels';

useHead({ title: 'Vue d\'ensemble · Vigie' });

const api = useApi();
const auth = useAuthStore();

const { data: stats, status, refresh } = useAsyncData('platform-analytics', () => api<PlatformAnalytics>('/admin/analytics'));
// Les 100 derniers restaurants inscrits suffisent pour les points d'attention du jour.
const { data: recent, refresh: refreshRecent } = useAsyncData('recent-restaurants', () =>
  api<Paginated<AdminRestaurant>>('/admin/restaurants', { query: { limit: 100, order: 'desc' } }),
);

const loading = computed(() => status.value === 'pending' && !stats.value);
const totalRestaurants = computed(() => Object.values(stats.value?.restaurants.byStatus ?? {}).reduce((a, b) => a + (b ?? 0), 0));
const paying = computed(() => stats.value?.subscriptions.ACTIVE ?? 0);

const subscriptionChart = computed(() =>
  (Object.keys(SUBSCRIPTION_STATUS) as SubscriptionStatus[])
    .map((s) => ({ statut: SUBSCRIPTION_STATUS[s].label, total: stats.value?.subscriptions[s] ?? 0 }))
    .filter((s) => s.total > 0),
);

const now = Date.now();
const in7days = now + 7 * 864e5;
const attention = computed(() => {
  const list = recent.value?.data ?? [];
  return {
    pastDue: list.filter((r) => r.owner.subscription?.status === 'PAST_DUE'),
    trialEnding: list.filter((r) => {
      const s = r.owner.subscription;
      if (s?.status !== 'TRIALING' || !s.trialEndsAt) return false;
      const end = new Date(s.trialEndsAt).getTime();
      return end > now && end <= in7days;
    }),
    suspended: list.filter((r) => r.status !== 'ACTIVE'),
    inactive: list.filter((r) => r.status === 'ACTIVE' && r._count.orders === 0 && now - new Date(r.createdAt).getTime() > 14 * 864e5),
  };
});

const latest = computed(() => (recent.value?.data ?? []).slice(0, 8));
const dateFmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const hello = new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir';
</script>

<template>
  <UDashboardPanel id="overview">
    <template #header>
      <UDashboardNavbar title="Vue d'ensemble">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <span class="hidden text-xs text-muted sm:inline">30 derniers jours</span>
          <UButton color="neutral" variant="ghost" icon="i-lucide-refresh-cw" aria-label="Actualiser" @click="() => { refresh(); refreshRecent(); }" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <div>
          <h1 class="font-display text-2xl font-semibold text-highlighted sm:text-3xl">{{ hello }} {{ auth.user?.firstName }}</h1>
          <p class="text-muted">Voici l'état de la plateforme QR-Order.</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardKpiCard
            label="Revenu mensuel récurrent"
            :value="moneyByCurrency(stats?.mrr ?? {})"
            icon="i-lucide-repeat"
            :hint="`${paying} abonnement(s) payant(s)`"
            :loading="loading"
          />
          <DashboardKpiCard
            label="Volume d'affaires (GMV)"
            :value="moneyByCurrency(stats?.gmv ?? {})"
            icon="i-lucide-banknote"
            :hint="`${(stats?.orders.count ?? 0).toLocaleString('fr-FR')} commandes`"
            :loading="loading"
          />
          <DashboardKpiCard
            label="Restaurants"
            :value="totalRestaurants.toLocaleString('fr-FR')"
            icon="i-lucide-store"
            :hint="`+${stats?.restaurants.new ?? 0} sur 30 jours`"
            :loading="loading"
          />
          <DashboardKpiCard
            label="Taux de résiliation"
            :value="`${(stats?.churnRate ?? 0).toLocaleString('fr-FR')} %`"
            icon="i-lucide-user-x"
            hint="Abonnements résiliés / actifs"
            :loading="loading"
          />
        </div>

        <div class="grid gap-4 xl:grid-cols-3">
          <!-- Points d'attention -->
          <UCard class="xl:col-span-2">
            <template #header>
              <p class="font-semibold text-highlighted">À surveiller</p>
            </template>
            <div class="grid gap-3 sm:grid-cols-2">
              <NuxtLink
                v-for="w in [
                  { key: 'pastDue', label: 'Abonnements impayés', icon: 'i-lucide-credit-card', color: 'text-warning bg-warning/10', list: attention.pastDue },
                  { key: 'trialEnding', label: 'Essais finissant sous 7 jours', icon: 'i-lucide-hourglass', color: 'text-info bg-info/10', list: attention.trialEnding },
                  { key: 'suspended', label: 'Suspendus ou bannis', icon: 'i-lucide-ban', color: 'text-error bg-error/10', list: attention.suspended },
                  { key: 'inactive', label: 'Aucune commande depuis 30 jours', icon: 'i-lucide-moon', color: 'text-muted bg-elevated', list: attention.inactive },
                ]"
                :key="w.key"
                :to="{ path: '/restaurants', query: { focus: w.key } }"
                class="flex items-start gap-3 rounded-lg border border-default p-3 transition hover:bg-elevated/60"
              >
                <span class="flex size-9 shrink-0 items-center justify-center rounded-lg" :class="w.color">
                  <UIcon :name="w.icon" class="size-5" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="flex items-baseline justify-between gap-2">
                    <span class="text-sm font-medium">{{ w.label }}</span>
                    <span class="tabular font-display text-xl font-semibold text-highlighted">{{ w.list.length }}</span>
                  </span>
                  <span class="block truncate text-xs text-muted">
                    {{ w.list.length ? w.list.slice(0, 3).map((r) => r.name).join(', ') : 'Rien à signaler' }}
                  </span>
                </span>
              </NuxtLink>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <p class="font-semibold text-highlighted">Abonnements</p>
            </template>
            <USkeleton v-if="loading" class="h-44 w-full" />
            <template v-else>
              <UChart
                v-if="subscriptionChart.length"
                type="donut"
                :data="subscriptionChart"
                index="statut"
                :categories="['total']"
                :colors="['var(--color-sky-500)', 'var(--color-emerald-500)', 'var(--color-amber-500)', 'var(--color-red-500)', 'var(--color-slate-400)']"
                :height="160"
                aria-label="Abonnements par statut"
              />
              <ul class="mt-3 space-y-1 text-sm">
                <li v-for="s in Object.keys(SUBSCRIPTION_STATUS) as SubscriptionStatus[]" :key="s" class="flex justify-between">
                  <UBadge :color="SUBSCRIPTION_STATUS[s].color" variant="subtle" size="sm" :label="SUBSCRIPTION_STATUS[s].label" />
                  <span class="tabular">{{ stats?.subscriptions[s] ?? 0 }}</span>
                </li>
              </ul>
            </template>
          </UCard>
        </div>

        <!-- Dernières inscriptions -->
        <UCard :ui="{ body: 'p-0 sm:p-0' }">
          <template #header>
            <div class="flex items-center justify-between">
              <p class="font-semibold text-highlighted">Dernières inscriptions</p>
              <UButton to="/restaurants" variant="link" color="neutral" trailing-icon="i-lucide-arrow-right" label="Tous les restaurants" />
            </div>
          </template>
          <ul class="divide-y divide-default">
            <li v-for="r in latest" :key="r.id">
              <NuxtLink :to="`/restaurants/${r.id}`" class="flex items-center gap-4 px-4 py-3 transition hover:bg-elevated/60 sm:px-6">
                <UAvatar :text="r.name.slice(0, 2).toUpperCase()" size="sm" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium">{{ r.name }}</span>
                  <span class="block truncate text-xs text-muted">{{ r.city ?? r.country }} · {{ r.owner.email }}</span>
                </span>
                <UBadge
                  v-if="r.owner.subscription"
                  :color="SUBSCRIPTION_STATUS[r.owner.subscription.status].color"
                  variant="subtle"
                  :label="`${r.owner.subscription.plan.code} · ${SUBSCRIPTION_STATUS[r.owner.subscription.status].label}`"
                  class="hidden sm:inline-flex"
                />
                <UBadge :color="RESTAURANT_STATUS[r.status].color" variant="outline" :label="RESTAURANT_STATUS[r.status].label" />
                <span class="hidden w-16 text-right text-xs text-muted md:block">{{ dateFmt(r.createdAt) }}</span>
              </NuxtLink>
            </li>
            <li v-if="recent && !latest.length" class="px-6 py-10 text-center text-sm text-muted">Aucun restaurant inscrit.</li>
          </ul>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
