<script setup lang="ts">
/** Réglages de la plateforme : période d'essai offerte aux nouveaux restaurants. */
import type { Plan, TrialSettings } from '~/types/api';

useHead({ title: 'Réglages · Vigie' });

const api = useApi();
const toast = useToast();

const { data: settings, refresh } = useAsyncData('admin-trial-settings', () => api<TrialSettings>('/admin/settings/trial'));
const { data: plans } = useAsyncData('admin-plans', () => api<Plan[]>('/admin/plans'), { default: () => [] });
/** Forfait testé pendant l'essai (fixé côté plateforme). */
const trialPlan = computed(() => plans.value.find((p) => p.code === 'PRO') ?? null);

const state = reactive({ trialDays: 14, trialReminderDays: 3 });
watch(
  settings,
  (s) => {
    if (s) Object.assign(state, { trialDays: s.trialDays, trialReminderDays: s.trialReminderDays });
  },
  { immediate: true },
);

const PRESETS = [0, 7, 14, 30, 60];
const noTrial = computed(() => state.trialDays === 0);
const error = computed(() => {
  if (!Number.isInteger(state.trialDays) || state.trialDays < 0 || state.trialDays > 365) return 'Entre 0 et 365 jours.';
  if (!Number.isInteger(state.trialReminderDays) || state.trialReminderDays < 0 || state.trialReminderDays > 30) return 'Rappel entre 0 et 30 jours.';
  if (!noTrial.value && state.trialReminderDays >= state.trialDays) return 'Le rappel doit partir avant la fin de l’essai.';
  return null;
});
const dirty = computed(
  () => !!settings.value && (settings.value.trialDays !== state.trialDays || settings.value.trialReminderDays !== state.trialReminderDays),
);

const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`;
const summary = computed(() => {
  if (noTrial.value) return 'Pas d’essai : les nouveaux restaurants démarrent sur le forfait Starter et choisissent leur forfait depuis la page Abonnement.';
  const plan = trialPlan.value?.name ?? 'Pro';
  const reminder = state.trialReminderDays
    ? `Un rappel par email part ${plural(state.trialReminderDays, 'jour')} avant la fin, puis à la fin de l’essai.`
    : 'Aucun rappel avant la fin ; un email est envoyé à la fin de l’essai.';
  return `Les nouveaux restaurants testent le forfait ${plan} pendant ${plural(state.trialDays, 'jour')}. ${reminder}`;
});

const saving = ref(false);
async function save() {
  if (error.value) return;
  saving.value = true;
  try {
    await api('/admin/settings/trial', { method: 'PATCH', body: { ...state } });
    toast.add({ title: 'Période d’essai mise à jour', description: 'Appliquée aux prochaines inscriptions.', color: 'success', icon: 'i-lucide-check' });
    await refresh();
  } catch {
    // erreur déjà notifiée
  } finally {
    saving.value = false;
  }
}
function reset() {
  if (settings.value) Object.assign(state, { trialDays: settings.value.trialDays, trialReminderDays: settings.value.trialReminderDays });
}
const updated = computed(() =>
  settings.value ? new Date(settings.value.updatedAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : '',
);
</script>

<template>
  <UDashboardPanel id="settings">
    <template #header>
      <UDashboardNavbar title="Réglages">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-3xl space-y-6">
        <UPageCard
          title="Période d’essai"
          description="Offerte à chaque nouveau restaurant à l’inscription, avant qu’il choisisse son forfait."
          variant="subtle"
        >
          <div v-if="!settings" class="space-y-3">
            <USkeleton class="h-10 w-full" />
            <USkeleton class="h-10 w-full" />
          </div>
          <form v-else class="space-y-6" @submit.prevent="save">
            <!-- Durée -->
            <UFormField label="Durée de l’essai" help="0 = pas d’essai.">
              <div class="flex flex-wrap items-center gap-3">
                <UInputNumber v-model="state.trialDays" :min="0" :max="365" class="w-36" />
                <span class="text-sm text-muted">jours</span>
                <div class="flex flex-wrap gap-1.5">
                  <UButton
                    v-for="d in PRESETS"
                    :key="d"
                    size="xs"
                    :color="state.trialDays === d ? 'primary' : 'neutral'"
                    :variant="state.trialDays === d ? 'solid' : 'outline'"
                    :label="d === 0 ? 'Pas d’essai' : `${d} j`"
                    @click="state.trialDays = d"
                  />
                </div>
              </div>
            </UFormField>

            <!-- Rappel -->
            <UFormField label="Rappel avant la fin" help="Email au propriétaire, et bandeau dans son back-office. 0 = pas de rappel.">
              <div class="flex items-center gap-3">
                <UInputNumber v-model="state.trialReminderDays" :min="0" :max="30" :disabled="noTrial" class="w-36" />
                <span class="text-sm text-muted">jours avant la fin</span>
              </div>
            </UFormField>

            <!-- Aperçu -->
            <div class="flex gap-3 rounded-lg bg-elevated/60 p-4 text-sm">
              <UIcon name="i-lucide-calendar-clock" class="mt-0.5 size-5 shrink-0 text-primary" />
              <div class="space-y-1">
                <p class="text-highlighted">{{ summary }}</p>
                <p class="text-muted">
                  S’applique aux prochaines inscriptions. Les essais en cours gardent leur date de fin, modifiable restaurant par restaurant
                  (Restaurants → ⋮ → Abonnement…).
                </p>
              </div>
            </div>

            <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="error" />

            <div class="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4">
              <p class="text-xs text-muted">Dernière modification : {{ updated }}</p>
              <div class="flex gap-2">
                <UButton v-if="dirty" color="neutral" variant="ghost" label="Annuler" @click="reset" />
                <UButton type="submit" icon="i-lucide-save" label="Enregistrer" :loading="saving" :disabled="!dirty || !!error" />
              </div>
            </div>
          </form>
        </UPageCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
