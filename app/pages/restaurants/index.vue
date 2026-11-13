<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import { refDebounced } from '@vueuse/core';
import type { AdminRestaurant, Paginated, RestaurantStatus } from '~/types/api';
import { DeleteRestaurantsModal, ModerationModal } from '#components';
import { downloadBlob } from '~/utils/download';
import { RESTAURANT_STATUS, SUBSCRIPTION_STATUS } from '~/utils/labels';

useHead({ title: 'Restaurants · Vigie' });

const api = useApi();
const route = useRoute();
const router = useRouter();
const actions = useRestaurantActions();
const toast = useToast();
const overlay = useOverlay();
const moderation = overlay.create(ModerationModal);
const deletion = overlay.create(DeleteRestaurantsModal);

const search = ref(String(route.query.search ?? ''));
const searchDebounced = refDebounced(search, 350);
const status = ref<RestaurantStatus | 'ALL'>('ALL');
const page = ref(1);
const limit = 25;

/** Filtres « à surveiller » venus de la vue d'ensemble (calculés côté console). */
const FOCUS: Record<string, { label: string; test: (r: AdminRestaurant) => boolean }> = {
  planRequest: {
    label: 'Souscriptions à vérifier (règlement)',
    test: (r) => !!r.owner.subscription?.requestedPlan,
  },
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
  { id: 'select' },
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
      ...(r.owner.subscription?.requestedPlan
        ? [{ label: 'Paiement vérifié', icon: 'i-lucide-badge-check', onSelect: () => markPaid(r) }]
        : []),
      { label: 'Abonnement…', icon: 'i-lucide-credit-card', onSelect: async () => (await actions.editSubscription(r.owner)) && refresh() },
      { label: 'Changer le statut…', icon: 'i-lucide-shield-alert', onSelect: async () => (await actions.setRestaurantStatus(r)) && refresh() },
      { label: 'Suspendre le propriétaire…', icon: 'i-lucide-user-x', color: 'error', onSelect: async () => (await actions.setOwnerStatus(r.owner)) && refresh() },
    ],
    [{ label: 'Supprimer le restaurant…', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => deleteRestaurants([r]) }],
  ];
}

// ─── Sélection multiple (conservée d'une page à l'autre) ───
const selected = ref<Map<string, AdminRestaurant>>(new Map());
const isSelected = (id: string) => selected.value.has(id);
const pageAllSelected = computed(() => rows.value.length > 0 && rows.value.every((r) => isSelected(r.id)));
const pageCheck = computed<boolean | 'indeterminate'>(() =>
  pageAllSelected.value ? true : rows.value.some((r) => isSelected(r.id)) ? 'indeterminate' : false,
);
function toggleRow(r: AdminRestaurant) {
  const next = new Map(selected.value);
  if (next.has(r.id)) next.delete(r.id);
  else next.set(r.id, r);
  selected.value = next;
}
function togglePage() {
  const next = new Map(selected.value);
  if (pageAllSelected.value) rows.value.forEach((r) => next.delete(r.id));
  else rows.value.forEach((r) => next.set(r.id, r));
  selected.value = next;
}
function clearSelection() {
  selected.value = new Map();
}
// Nouveau filtre : la sélection repart de zéro.
watch([searchDebounced, status, focus], clearSelection);

/** Tous les restaurants correspondant aux filtres, toutes pages confondues. */
const total = computed(() => (focus.value ? rows.value.length : (data.value?.meta.total ?? 0)));
const selectingAll = ref(false);
async function selectAllMatching() {
  selectingAll.value = true;
  try {
    const next = new Map<string, AdminRestaurant>();
    for (let p = 1; ; p++) {
      const res = await api<Paginated<AdminRestaurant>>('/admin/restaurants', {
        query: {
          page: p,
          limit: 100,
          ...(searchDebounced.value.trim() && { search: searchDebounced.value.trim() }),
          ...(status.value !== 'ALL' && { status: status.value }),
        },
      });
      res.data.filter((r) => !focus.value || FOCUS[focus.value]!.test(r)).forEach((r) => next.set(r.id, r));
      if (p >= res.meta.totalPages || focus.value) break;
    }
    selected.value = next;
  } finally {
    selectingAll.value = false;
  }
}

// ─── Actions groupées ───
const progress = ref<{ done: number; total: number } | null>(null);

/** Applique une action à chaque élément, à la suite (le journal d'audit garde une ligne par restaurant). */
async function runEach<T>(list: T[], run: (x: T) => Promise<unknown>, label: (x: T) => string) {
  progress.value = { done: 0, total: list.length };
  const failed: string[] = [];
  for (const x of list) {
    try {
      await run(x);
    } catch (err) {
      failed.push(`${label(x)} : ${apiErrorMessage(err)}`);
    }
    progress.value.done++;
  }
  progress.value = null;
  return failed;
}

function report(okCount: number, failed: string[], what: string) {
  toast.add({
    title: `${okCount} ${what}`,
    description: failed.length ? `Échec (${failed.length}) — ${failed.slice(0, 3).join(' · ')}${failed.length > 3 ? ' …' : ''}` : undefined,
    color: failed.length ? 'warning' : 'success',
    icon: failed.length ? 'i-lucide-triangle-alert' : 'i-lucide-check',
    duration: failed.length ? 10000 : 4000,
  });
}

async function bulkRestaurantStatus() {
  const list = [...selected.value.values()];
  const result = await moderation.open({
    title: `Statut de ${list.length} restaurant${list.length > 1 ? 's' : ''}`,
    description: 'Le même statut et le même motif seront appliqués à chaque restaurant sélectionné.',
    current: '',
    options: [
      { value: 'ACTIVE', label: 'Actif', description: 'Fonctionnement normal' },
      { value: 'SUSPENDED', label: 'Suspendu', description: 'Blocage temporaire (impayé, vérification…)' },
      { value: 'BANNED', label: 'Banni', description: 'Exclusion définitive de la plateforme' },
    ],
  });
  if (!result) return;
  // Inutile de toucher les restaurants déjà dans ce statut.
  const targets = list.filter((r) => r.status !== result.status);
  const failed = await runEach(
    targets,
    (r) => api(`/admin/restaurants/${r.id}/status`, { method: 'PATCH', body: result, silent: true }),
    (r) => r.name,
  );
  report(targets.length - failed.length, failed, `restaurant(s) passé(s) en « ${RESTAURANT_STATUS[result.status as RestaurantStatus].label} »`);
  clearSelection();
  await refresh();
}

async function bulkOwnerStatus() {
  // Un propriétaire peut avoir plusieurs restaurants : un seul changement par compte.
  const owners = [...new Map([...selected.value.values()].map((r) => [r.owner.id, r.owner])).values()];
  const result = await moderation.open({
    title: `Comptes de ${owners.length} propriétaire${owners.length > 1 ? 's' : ''}`,
    description: 'La suspension ferme immédiatement toutes leurs sessions, sur tous leurs restaurants.',
    current: '',
    options: [
      { value: 'SUSPENDED', label: 'Suspendre', description: 'Connexion impossible, sessions fermées' },
      { value: 'ACTIVE', label: 'Réactiver', description: 'Peut de nouveau se connecter' },
    ],
  });
  if (!result) return;
  const failed = await runEach(
    owners,
    (o) => api(`/admin/users/${o.id}/status`, { method: 'PATCH', body: result, silent: true }),
    (o) => o.email,
  );
  report(owners.length - failed.length, failed, result.status === 'SUSPENDED' ? 'compte(s) suspendu(s)' : 'compte(s) réactivé(s)');
  clearSelection();
  await refresh();
}

/** Suppression (logique) d'un ou plusieurs restaurants, après confirmation. */
async function deleteRestaurants(list: AdminRestaurant[]) {
  const reason = await deletion.open({ names: list.map((r) => r.name) });
  if (!reason) return;
  const failed = await runEach(
    list,
    (r) => api(`/admin/restaurants/${r.id}`, { method: 'DELETE', body: { reason }, silent: true }),
    (r) => r.name,
  );
  report(list.length - failed.length, failed, 'restaurant(s) supprimé(s)');
  clearSelection();
  await refresh();
}
const bulkDelete = () => deleteRestaurants([...selected.value.values()]);

function exportSelection() {
  const header = ['restaurant', 'slug', 'ville', 'pays', 'devise', 'statut', 'proprietaire', 'email', 'forfait', 'abonnement', 'commandes_30j', 'tables', 'membres', 'inscrit_le'];
  const esc = (v: unknown) => {
    const t = String(v ?? '');
    return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const lines = [...selected.value.values()].map((r) => [
    r.name, r.slug, r.city ?? '', r.country, r.currency, RESTAURANT_STATUS[r.status].label,
    `${r.owner.firstName} ${r.owner.lastName}`, r.owner.email,
    r.owner.subscription?.plan.code ?? '', r.owner.subscription ? SUBSCRIPTION_STATUS[r.owner.subscription.status].label : '',
    r._count.orders, r._count.tables, r._count.memberships, r.createdAt.slice(0, 10),
  ]);
  const csv = `\uFEFF${[header, ...lines].map((l) => l.map(esc).join(';')).join('\r\n')}\r\n`;
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `restaurants-${new Date().toISOString().slice(0, 10)}.csv`);
}

/** Règlement constaté : la souscription faite par le propriétaire n'est plus « à vérifier ». */
async function markPaid(r: AdminRestaurant) {
  try {
    await api(`/admin/subscriptions/${r.owner.id}`, { method: 'PATCH', body: { status: 'ACTIVE' } });
    toast.add({ title: `${r.name} : paiement vérifié`, color: 'success', icon: 'i-lucide-badge-check' });
    await refresh();
  } catch {
    // erreur déjà notifiée
  }
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
      <div
        v-if="selected.size"
        class="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 backdrop-blur"
      >
        <span class="text-sm font-medium text-highlighted">
          {{ selected.size }} restaurant{{ selected.size > 1 ? 's' : '' }} sélectionné{{ selected.size > 1 ? 's' : '' }}
        </span>
        <UButton
          v-if="pageAllSelected && selected.size < total"
          size="sm"
          variant="link"
          :label="`Sélectionner les ${total} restaurants`"
          :loading="selectingAll"
          @click="selectAllMatching"
        />
        <span v-if="progress" class="flex items-center gap-2 text-sm text-muted">
          <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" /> {{ progress.done }} / {{ progress.total }}
        </span>
        <div class="ml-auto flex flex-wrap gap-2">
          <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-shield-alert" label="Changer le statut" :disabled="!!progress" @click="bulkRestaurantStatus" />
          <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-user-cog" label="Comptes propriétaires" :disabled="!!progress" @click="bulkOwnerStatus" />
          <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-download" label="Exporter (CSV)" :disabled="!!progress" @click="exportSelection" />
          <UButton size="sm" color="error" variant="soft" icon="i-lucide-trash-2" label="Supprimer" :disabled="!!progress" @click="bulkDelete" />
          <UButton size="sm" color="neutral" variant="ghost" icon="i-lucide-x" aria-label="Tout désélectionner" :disabled="!!progress" @click="clearSelection" />
        </div>
      </div>

      <UTable
        :data="rows"
        :columns="columns"
        :loading="fetchStatus === 'pending'"
        sticky
        class="rounded-lg border border-default"
        :ui="{ tr: 'cursor-pointer', td: 'py-2.5', th: 'first:w-10' }"
        :meta="{ class: { tr: (row: { original: AdminRestaurant }) => (isSelected(row.original.id) ? 'bg-primary/5' : '') } }"
        @select="(_e: Event, row) => navigateTo(`/restaurants/${row.original.id}`)"
      >
        <template #select-header>
          <UCheckbox
            :model-value="pageCheck"
            :aria-label="pageAllSelected ? 'Désélectionner la page' : 'Sélectionner la page'"
            @update:model-value="togglePage"
          />
        </template>
        <template #select-cell="{ row }">
          <div @click.stop>
            <UCheckbox
              :model-value="isSelected(row.original.id)"
              :aria-label="`Sélectionner ${row.original.name}`"
              @update:model-value="toggleRow(row.original)"
            />
          </div>
        </template>
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
          <UBadge
            v-if="row.original.owner.subscription?.requestedPlan"
            color="warning"
            variant="subtle"
            size="sm"
            icon="i-lucide-receipt"
            :label="`À vérifier : ${row.original.owner.subscription.requestedPlan.code}`"
            class="mt-1"
          />
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
