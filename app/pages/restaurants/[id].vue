<script setup lang="ts">
import type { AdminRestaurant, AuditLog, Member, OrderSummary, Paginated, RestaurantDashboard, RestaurantDetails } from '~/types/api';
import { RESTAURANT_STATUS, ROLE_LABEL, SUBSCRIPTION_STATUS } from '~/utils/labels';

const route = useRoute();
const api = useApi();
const actions = useRestaurantActions();
const id = computed(() => String(route.params.id));

// Accès super-admin aux routes de l'établissement (le TenantGuard le laisse passer).
const { data: details, error } = useAsyncData(`restaurant-${id.value}`, () => api<RestaurantDetails>(`/restaurants/${id.value}`, { silent: true }));
useHead({ title: () => `${details.value?.name ?? 'Restaurant'} · Vigie` });

// Propriétaire, abonnement et compteurs : via la liste d'administration, filtrée sur le slug.
const { data: admin, refresh: refreshAdmin } = useAsyncData(
  `restaurant-admin-${id.value}`,
  async () => {
    if (!details.value) return null;
    const res = await api<Paginated<AdminRestaurant>>('/admin/restaurants', { query: { search: details.value.slug, limit: 100 } });
    return res.data.find((r) => r.id === id.value) ?? null;
  },
  { watch: [details] },
);

const { data: today } = useAsyncData(`restaurant-dashboard-${id.value}`, () =>
  api<RestaurantDashboard>(`/restaurants/${id.value}/dashboard`, { silent: true }).catch(() => null),
);
const { data: members, refresh: refreshMembers } = useAsyncData(
  `restaurant-team-${id.value}`,
  () => api<Member[]>(`/restaurants/${id.value}/team/members`, { silent: true }).catch(() => []),
  { default: () => [] },
);
const { data: orders } = useAsyncData(`restaurant-orders-${id.value}`, () =>
  api<Paginated<OrderSummary>>(`/restaurants/${id.value}/orders`, { query: { limit: 10 }, silent: true }).catch(() => null),
);
const { data: logs, status: logsStatus, refresh: refreshLogs } = useAsyncData(`restaurant-audit-${id.value}`, () =>
  api<Paginated<AuditLog>>('/admin/audit-logs', { query: { restaurantId: id.value, limit: 30 } }),
);

const status = computed(() => admin.value?.status ?? details.value?.status ?? 'ACTIVE');
const sub = computed(() => admin.value?.owner.subscription ?? null);
const money = (v: number) => formatMoney(v, details.value?.currency ?? 'XOF', details.value?.locale);
const date = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

async function afterAction(ok: boolean) {
  if (!ok) return;
  await Promise.all([refreshAdmin(), refreshLogs(), refreshMembers()]);
}

const ORDER_STATUS: Record<string, string> = {
  PENDING: 'En attente', ACCEPTED: 'Acceptée', PREPARING: 'En préparation', READY: 'Prête',
  SERVED: 'Servie', COMPLETED: 'Terminée', CANCELLED: 'Annulée', REJECTED: 'Refusée',
};
</script>

<template>
  <UDashboardPanel id="restaurant">
    <template #header>
      <UDashboardNavbar :title="details?.name ?? 'Restaurant'">
        <template #leading>
          <UButton to="/restaurants" icon="i-lucide-arrow-left" color="neutral" variant="ghost" aria-label="Retour à la liste" />
        </template>
        <template #trailing>
          <UBadge :color="RESTAURANT_STATUS[status].color" variant="subtle" :icon="RESTAURANT_STATUS[status].icon" :label="RESTAURANT_STATUS[status].label" />
        </template>
        <template v-if="admin" #right>
          <UButton color="neutral" variant="outline" icon="i-lucide-credit-card" label="Abonnement" class="hidden sm:inline-flex" @click="actions.editSubscription(admin.owner).then(afterAction)" />
          <UButton
            :color="status === 'ACTIVE' ? 'error' : 'success'"
            variant="soft"
            :icon="status === 'ACTIVE' ? 'i-lucide-shield-alert' : 'i-lucide-shield-check'"
            :label="status === 'ACTIVE' ? 'Suspendre' : 'Réactiver'"
            @click="actions.setRestaurantStatus(admin).then(afterAction)"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UEmpty
        v-if="error"
        icon="i-lucide-store"
        title="Restaurant introuvable"
        description="Il a peut-être été supprimé."
        :actions="[{ label: 'Retour à la liste', to: '/restaurants' }]"
      />

      <div v-else class="space-y-6">
        <!-- Identité -->
        <div class="flex flex-wrap items-start gap-4">
          <UAvatar :src="details?.logoUrl ?? undefined" :text="details?.name.slice(0, 2).toUpperCase()" size="3xl" />
          <div class="min-w-0 flex-1">
            <h1 class="font-display text-2xl font-semibold text-highlighted">{{ details?.name }}</h1>
            <p class="text-sm text-muted">
              {{ [details?.address, details?.city, details?.country].filter(Boolean).join(', ') }}
            </p>
            <p class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span><UIcon name="i-lucide-link" class="align-middle" /> {{ details?.slug }}</span>
              <span v-if="details?.phone"><UIcon name="i-lucide-phone" class="align-middle" /> {{ details.phone }}</span>
              <span v-if="details?.email"><UIcon name="i-lucide-mail" class="align-middle" /> {{ details.email }}</span>
              <span><UIcon name="i-lucide-globe" class="align-middle" /> {{ details?.currency }} · {{ details?.timezone }}</span>
              <span><UIcon name="i-lucide-calendar" class="align-middle" /> Inscrit le {{ date(details?.createdAt) }}</span>
            </p>
          </div>
        </div>

        <!-- Aujourd'hui -->
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardKpiCard label="CA du jour" :value="money(today?.salesTotal ?? 0)" icon="i-lucide-banknote" :hint="today ? (today.isOpen ? 'Ouvert actuellement' : 'Fermé actuellement') : undefined" :loading="!today" />
          <DashboardKpiCard label="Commandes du jour" :value="String(today?.ordersCount ?? 0)" icon="i-lucide-receipt-text" :hint="`${today?.ordersInProgress ?? 0} en cours`" :loading="!today" />
          <DashboardKpiCard label="Commandes 30 jours" :value="(admin?._count.orders ?? 0).toLocaleString('fr-FR')" icon="i-lucide-trending-up" :loading="!admin" />
          <DashboardKpiCard label="Tables · membres" :value="`${admin?._count.tables ?? 0} · ${admin?._count.memberships ?? 0}`" icon="i-lucide-armchair" :loading="!admin" />
        </div>

        <div class="grid gap-4 xl:grid-cols-3">
          <!-- Propriétaire & abonnement -->
          <UCard>
            <template #header>
              <p class="font-semibold text-highlighted">Propriétaire & abonnement</p>
            </template>
            <USkeleton v-if="!admin" class="h-32 w-full" />
            <div v-else class="space-y-4 text-sm">
              <div>
                <p class="font-medium">{{ admin.owner.firstName }} {{ admin.owner.lastName }}</p>
                <p class="text-muted">{{ admin.owner.email }}</p>
              </div>
              <div v-if="sub" class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <span class="text-muted">Forfait</span>
                  <span class="font-mono font-semibold">{{ sub.plan.code }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-muted">Statut</span>
                  <UBadge :color="SUBSCRIPTION_STATUS[sub.status].color" variant="subtle" :label="SUBSCRIPTION_STATUS[sub.status].label" />
                </div>
                <div v-if="sub.trialEndsAt && sub.status === 'TRIALING'" class="flex justify-between">
                  <span class="text-muted">Fin de l'essai</span><span>{{ date(sub.trialEndsAt) }}</span>
                </div>
                <div v-if="sub.currentPeriodEnd" class="flex justify-between">
                  <span class="text-muted">Fin de période</span><span>{{ date(sub.currentPeriodEnd) }}</span>
                </div>
              </div>
              <p v-else class="text-muted">Aucun abonnement.</p>
              <div class="flex flex-wrap gap-2">
                <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-credit-card" label="Modifier l'abonnement" @click="actions.editSubscription(admin.owner).then(afterAction)" />
                <UButton size="sm" color="error" variant="ghost" icon="i-lucide-user-x" label="Suspendre le compte" @click="actions.setOwnerStatus(admin.owner).then(afterAction)" />
              </div>
            </div>
          </UCard>

          <!-- Équipe -->
          <UCard :ui="{ body: 'p-0 sm:p-0' }">
            <template #header>
              <p class="font-semibold text-highlighted">Équipe <span class="text-sm font-normal text-muted">· {{ members.length }}</span></p>
            </template>
            <ul class="max-h-80 divide-y divide-default overflow-y-auto">
              <li v-for="m in members" :key="m.id" class="flex items-center gap-3 px-4 py-2.5">
                <UAvatar :text="`${m.user.firstName[0] ?? ''}${m.user.lastName[0] ?? ''}`" size="sm" />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium">{{ m.user.firstName }} {{ m.user.lastName }}</p>
                  <p class="truncate text-xs text-muted">{{ m.user.email }}</p>
                </div>
                <UBadge color="neutral" variant="subtle" size="sm" :label="ROLE_LABEL[m.role] ?? m.role" />
                <UBadge v-if="m.user.status === 'SUSPENDED'" color="error" variant="subtle" size="sm" label="Suspendu" />
                <UTooltip :text="m.user.status === 'SUSPENDED' ? 'Réactiver le compte' : 'Suspendre le compte'">
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    :icon="m.user.status === 'SUSPENDED' ? 'i-lucide-user-check' : 'i-lucide-user-x'"
                    :aria-label="m.user.status === 'SUSPENDED' ? 'Réactiver le compte' : 'Suspendre le compte'"
                    @click="actions.setOwnerStatus({ ...m.user, subscription: null }, m.user.status).then(afterAction)"
                  />
                </UTooltip>
              </li>
              <li v-if="!members.length" class="px-4 py-6 text-center text-sm text-muted">Aucun membre.</li>
            </ul>
          </UCard>

          <!-- Commandes récentes -->
          <UCard :ui="{ body: 'p-0 sm:p-0' }">
            <template #header>
              <p class="font-semibold text-highlighted">Dernières commandes</p>
            </template>
            <ul class="max-h-80 divide-y divide-default overflow-y-auto">
              <li v-for="o in orders?.data ?? []" :key="o.id" class="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span class="tabular w-12 font-semibold">n°{{ o.number }}</span>
                <span class="min-w-0 flex-1 truncate text-muted">
                  {{ new Date(o.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
                  · {{ ORDER_STATUS[o.status] ?? o.status }}
                </span>
                <span class="tabular">{{ formatMoney(o.total, o.currency, details?.locale) }}</span>
              </li>
              <li v-if="orders && !orders.data.length" class="px-4 py-6 text-center text-sm text-muted">Aucune commande.</li>
            </ul>
          </UCard>
        </div>

        <!-- Journal -->
        <UCard :ui="{ body: 'p-0 sm:p-0' }">
          <template #header>
            <div class="flex items-center justify-between">
              <p class="font-semibold text-highlighted">Journal d'activité</p>
              <UButton :to="{ path: '/audit', query: { restaurantId: id } }" variant="link" color="neutral" trailing-icon="i-lucide-arrow-right" label="Journal complet" />
            </div>
          </template>
          <AuditList :logs="logs?.data ?? []" :loading="logsStatus === 'pending'" @filter="(k, v) => navigateTo({ path: '/audit', query: { [k]: v } })" />
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
