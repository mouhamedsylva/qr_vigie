<script setup lang="ts">
/** Ajustement manuel de l'abonnement d'un propriétaire (ADM-04, PAY-12). */
import type { AdminRestaurant, BillingCycle, Plan, SubscriptionStatus } from '~/types/api';
import { SUBSCRIPTION_STATUS } from '~/utils/labels';

const props = defineProps<{ owner: AdminRestaurant['owner'] }>();
const emit = defineEmits<{ close: [saved: boolean] }>();

const api = useApi();
const toast = useToast();
const { data: plans } = useAsyncData('admin-plans', () => api<Plan[]>('/admin/plans'), { default: () => [] });

const sub = props.owner.subscription;
const toDate = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '');

const state = reactive({
  planCode: sub?.plan.code ?? 'STARTER',
  status: (sub?.status ?? 'ACTIVE') as SubscriptionStatus,
  billingCycle: 'MONTHLY' as BillingCycle,
  changeCycle: false,
  currentPeriodEnd: toDate(sub?.currentPeriodEnd),
  graceUntil: '',
  force: false,
});

const planItems = computed(() =>
  plans.value.map((p) => ({ label: `${p.name} (${p.code})${p.isActive ? '' : ' · inactif'}`, value: p.code })),
);

const saving = ref(false);
const quotaError = ref<string | null>(null);

async function submit() {
  saving.value = true;
  quotaError.value = null;
  try {
    await api(`/admin/subscriptions/${props.owner.id}`, {
      method: 'PATCH',
      silent: true,
      body: {
        planCode: state.planCode,
        status: state.status,
        ...(state.changeCycle && { billingCycle: state.billingCycle }),
        ...(state.currentPeriodEnd && { currentPeriodEnd: new Date(`${state.currentPeriodEnd}T23:59:59`).toISOString() }),
        ...(state.status === 'PAST_DUE'
          ? { graceUntil: state.graceUntil ? new Date(`${state.graceUntil}T23:59:59`).toISOString() : null }
          : { graceUntil: null }),
        ...(state.force && { force: true }),
      },
    });
    toast.add({ title: 'Abonnement mis à jour', color: 'success', icon: 'i-lucide-check' });
    emit('close', true);
  } catch (err) {
    // Forfait trop petit pour l'usage actuel : on propose de forcer.
    if (['PLAN_LIMIT_EXCEEDED', 'PLAN_LIMIT_REACHED'].includes(apiErrorCode(err) ?? '')) quotaError.value = apiErrorMessage(err);
    else toast.add({ title: 'Action impossible', description: apiErrorMessage(err), color: 'error', icon: 'i-lucide-circle-alert' });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UModal
    title="Abonnement"
    :description="`${owner.firstName} ${owner.lastName} · ${owner.email}`"
    @update:open="(o) => !o && emit('close', false)"
  >
    <template #body>
      <form id="sub-form" class="space-y-4" @submit.prevent="submit">
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Forfait">
            <USelect v-model="state.planCode" :items="planItems" class="w-full" />
          </UFormField>
          <UFormField label="Statut">
            <USelect
              v-model="state.status"
              :items="(Object.keys(SUBSCRIPTION_STATUS) as SubscriptionStatus[]).map((s) => ({ label: SUBSCRIPTION_STATUS[s].label, value: s }))"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Fin de la période en cours" hint="facultatif">
            <UInput v-model="state.currentPeriodEnd" type="date" class="w-full" />
          </UFormField>
          <UFormField v-if="state.status === 'PAST_DUE'" label="Grâce jusqu'au" hint="vide = aucune">
            <UInput v-model="state.graceUntil" type="date" class="w-full" />
          </UFormField>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <USwitch v-model="state.changeCycle" label="Changer la périodicité" />
          <URadioGroup
            v-if="state.changeCycle"
            v-model="state.billingCycle"
            orientation="horizontal"
            :items="[
              { label: 'Mensuel', value: 'MONTHLY' },
              { label: 'Annuel', value: 'YEARLY' },
            ]"
          />
        </div>
        <UAlert v-if="quotaError" color="warning" variant="subtle" icon="i-lucide-triangle-alert" :title="quotaError">
          <template #description>
            <USwitch v-model="state.force" class="mt-2" label="Appliquer quand même (le client dépasse les quotas du forfait)" />
          </template>
        </UAlert>
        <p class="text-xs text-muted">Modification enregistrée dans le journal d'audit. Le propriétaire n'est pas facturé depuis cet écran.</p>
      </form>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" label="Annuler" @click="emit('close', false)" />
        <UButton type="submit" form="sub-form" label="Enregistrer" :loading="saving" />
      </div>
    </template>
  </UModal>
</template>
