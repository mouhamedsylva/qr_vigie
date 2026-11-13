<script setup lang="ts">
import { PlanFormModal } from '#components';
import type { Plan } from '~/types/api';
import { FEATURES } from '~/utils/labels';

useHead({ title: 'Forfaits · Vigie' });

const api = useApi();
const overlay = useOverlay();
const modal = overlay.create(PlanFormModal);

const { data: plans, status, refresh } = useAsyncData('admin-plans', () => api<Plan[]>('/admin/plans'), { default: () => [] });

async function open(plan: Plan | null) {
  if (await modal.open({ plan })) await refresh();
}

const showInactive = ref(false);
const visible = computed(() => plans.value.filter((p) => p.isActive || showInactive.value));
const inactiveCount = computed(() => plans.value.filter((p) => !p.isActive).length);

const quota = (v: number | null) => (v === null ? 'Illimité' : v.toLocaleString('fr-FR'));
const ALL_FEATURES = Object.keys(FEATURES);
</script>

<template>
  <UDashboardPanel id="plans">
    <template #header>
      <UDashboardNavbar title="Forfaits">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <USwitch v-if="inactiveCount" v-model="showInactive" size="sm" :label="`Afficher les inactifs (${inactiveCount})`" class="hidden sm:flex" />
          <UButton to="/settings" color="neutral" variant="ghost" icon="i-lucide-calendar-clock" label="Période d’essai" class="hidden sm:inline-flex" />
          <UButton icon="i-lucide-plus" label="Forfait" @click="open(null)" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="status === 'pending' && !plans.length" class="grid gap-4 lg:grid-cols-3">
        <USkeleton v-for="n in 3" :key="n" class="h-96 rounded-xl" />
      </div>

      <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="p in visible"
          :key="p.id"
          class="flex flex-col rounded-xl border bg-default p-5"
          :class="p.isActive ? 'border-default' : 'border-dashed border-default opacity-70'"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="font-mono text-xs font-semibold text-muted">{{ p.code }}</p>
              <p class="font-display text-2xl font-semibold text-highlighted">{{ p.name }}</p>
            </div>
            <UBadge v-if="!p.isActive" color="neutral" variant="outline" label="Inactif" />
            <UBadge v-else-if="p.code === 'PRO'" color="info" variant="subtle" icon="i-lucide-gift" label="Offert en essai" />
          </div>

          <p class="mt-4">
            <span class="tabular font-display text-3xl font-semibold text-highlighted">{{ formatMoney(p.priceMonthly, p.currency) }}</span>
            <span class="text-sm text-muted"> / mois</span>
          </p>
          <p class="text-sm text-muted">ou {{ formatMoney(p.priceYearly, p.currency) }} / an</p>

          <ul class="mt-5 space-y-1.5 text-sm">
            <li class="flex justify-between"><span class="text-muted">Restaurants</span><span class="font-medium">{{ quota(p.maxRestaurants) }}</span></li>
            <li class="flex justify-between"><span class="text-muted">Tables / restaurant</span><span class="font-medium">{{ quota(p.maxTables) }}</span></li>
            <li class="flex justify-between"><span class="text-muted">Membres</span><span class="font-medium">{{ quota(p.maxMembers) }}</span></li>
          </ul>

          <USeparator class="my-4" />
          <ul class="flex-1 space-y-1.5 text-sm">
            <li v-for="f in ALL_FEATURES" :key="f" class="flex items-center gap-2" :class="!p.features.includes(f) && 'text-dimmed'">
              <UIcon :name="p.features.includes(f) ? 'i-lucide-check' : 'i-lucide-minus'" :class="p.features.includes(f) ? 'text-success' : ''" />
              {{ FEATURES[f]!.label }}
            </li>
          </ul>

          <UButton class="mt-5" block color="neutral" variant="outline" icon="i-lucide-pencil" label="Modifier" @click="open(p)" />
        </article>
      </div>
    </template>
  </UDashboardPanel>
</template>
