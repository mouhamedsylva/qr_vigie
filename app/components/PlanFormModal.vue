<script setup lang="ts">
/** Création / modification d'un forfait : prix, essai, quotas, fonctionnalités (ADM-04). */
import type { Plan } from '~/types/api';
import { FEATURES } from '~/utils/labels';

const props = defineProps<{ plan?: Plan | null }>();
const emit = defineEmits<{ close: [saved: boolean] }>();

const api = useApi();
const toast = useToast();
const editing = props.plan ?? null;
const currency = editing?.currency ?? 'XOF';

type Quota = 'maxRestaurants' | 'maxTables' | 'maxMembers';
const QUOTAS: { key: Quota; label: string; icon: string }[] = [
  { key: 'maxRestaurants', label: 'Restaurants', icon: 'i-lucide-store' },
  { key: 'maxTables', label: 'Tables par restaurant', icon: 'i-lucide-armchair' },
  { key: 'maxMembers', label: 'Membres d\'équipe', icon: 'i-lucide-users' },
];

const state = reactive({
  code: editing?.code ?? '',
  name: editing?.name ?? '',
  priceMonthly: fromMinorUnits(editing?.priceMonthly ?? 0, currency),
  priceYearly: fromMinorUnits(editing?.priceYearly ?? 0, currency),
  trialDays: editing?.trialDays ?? 14,
  quotas: Object.fromEntries(QUOTAS.map((q) => [q.key, editing ? editing[q.key] : 1])) as Record<Quota, number | null>,
  features: [...(editing?.features ?? [])],
  isActive: editing?.isActive ?? true,
});

const yearlySaving = computed(() => {
  const full = state.priceMonthly * 12;
  return full > 0 && state.priceYearly > 0 ? Math.round((1 - state.priceYearly / full) * 100) : null;
});
const codeValid = computed(() => /^[A-Z][A-Z0-9_]{1,29}$/.test(state.code));
const valid = computed(() => (editing || codeValid.value) && state.name.trim().length > 0 && state.priceMonthly >= 0 && state.priceYearly >= 0);
const moneyFormat = { style: 'currency' as const, currency, currencyDisplay: 'narrowSymbol' as const, maximumFractionDigits: fractionDigits(currency) };

function toggleUnlimited(key: Quota, unlimited: boolean) {
  state.quotas[key] = unlimited ? null : 1;
}

const saving = ref(false);
async function submit() {
  if (!valid.value) return;
  const body = {
    name: state.name.trim(),
    priceMonthly: toMinorUnits(state.priceMonthly, currency),
    priceYearly: toMinorUnits(state.priceYearly, currency),
    trialDays: state.trialDays,
    ...state.quotas,
    features: state.features,
    isActive: state.isActive,
  };
  saving.value = true;
  try {
    if (editing) await api(`/admin/plans/${editing.code}`, { method: 'PATCH', body });
    else await api('/admin/plans', { method: 'POST', body: { ...body, code: state.code } });
    toast.add({ title: editing ? 'Forfait modifié' : 'Forfait créé', color: 'success', icon: 'i-lucide-check' });
    emit('close', true);
  } catch {
    // erreur déjà notifiée
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UModal :title="editing ? `Forfait ${editing.name}` : 'Nouveau forfait'" :ui="{ content: 'sm:max-w-2xl' }" @update:open="(o) => !o && emit('close', false)">
    <template #body>
      <form id="plan-form" class="space-y-5" @submit.prevent="submit">
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Code" required :error="!editing && state.code && !codeValid ? 'Majuscules, chiffres et _ (ex. PRO_PLUS)' : undefined" :help="editing ? 'Le code est figé.' : 'Identifiant technique, non modifiable ensuite.'">
            <UInput
              :model-value="state.code"
              :disabled="!!editing"
              class="w-full font-mono"
              placeholder="PRO_PLUS"
              @update:model-value="(v) => (state.code = String(v).toUpperCase().replace(/[^A-Z0-9_]/g, ''))"
            />
          </UFormField>
          <UFormField label="Nom affiché" required>
            <UInput v-model="state.name" class="w-full" placeholder="Pro+" />
          </UFormField>
          <UFormField label="Prix mensuel">
            <UInputNumber v-model="state.priceMonthly" :min="0" :step="1000" class="w-full" :format-options="moneyFormat" />
          </UFormField>
          <UFormField label="Prix annuel" :hint="yearlySaving !== null ? `${yearlySaving > 0 ? '−' : '+'}${Math.abs(yearlySaving)} % vs mensuel` : undefined">
            <UInputNumber v-model="state.priceYearly" :min="0" :step="10000" class="w-full" :format-options="moneyFormat" />
          </UFormField>
          <UFormField label="Durée d'essai" hint="jours">
            <UInputNumber v-model="state.trialDays" :min="0" :max="365" class="w-full" />
          </UFormField>
        </div>

        <USeparator label="Quotas" />
        <div class="grid gap-3 sm:grid-cols-3">
          <div v-for="q in QUOTAS" :key="q.key" class="space-y-2 rounded-lg border border-default p-3">
            <p class="flex items-center gap-2 text-sm font-medium"><UIcon :name="q.icon" class="text-muted" /> {{ q.label }}</p>
            <USwitch :model-value="state.quotas[q.key] === null" size="sm" label="Illimité" @update:model-value="toggleUnlimited(q.key, $event)" />
            <UInputNumber v-if="state.quotas[q.key] !== null" v-model="state.quotas[q.key]" :min="q.key === 'maxMembers' ? 0 : 1" size="sm" class="w-full" />
          </div>
        </div>

        <USeparator label="Fonctionnalités incluses" />
        <UCheckboxGroup
          v-model="state.features"
          :items="Object.entries(FEATURES).map(([value, f]) => ({ value, label: f.label }))"
          class="grid grid-cols-2 gap-2 sm:grid-cols-4"
        />

        <USwitch v-model="state.isActive" label="Proposé à l'inscription et au changement de forfait" />
        <UAlert
          v-if="editing"
          color="info"
          variant="subtle"
          icon="i-lucide-info"
          description="Les changements s'appliquent immédiatement à tous les abonnés de ce forfait (fonctionnalités et quotas)."
        />
      </form>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" label="Annuler" @click="emit('close', false)" />
        <UButton type="submit" form="plan-form" :disabled="!valid" :loading="saving" :label="editing ? 'Enregistrer' : 'Créer le forfait'" />
      </div>
    </template>
  </UModal>
</template>
