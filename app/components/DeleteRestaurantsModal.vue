<script setup lang="ts">
/**
 * Confirmation d'une suppression de restaurant(s) par l'administration :
 * liste des restaurants concernés, motif obligatoire (journal d'audit) et
 * saisie de « SUPPRIMER » pour éviter toute suppression par mégarde.
 */
const props = defineProps<{ names: string[] }>();
const emit = defineEmits<{ close: [reason: string | null] }>();

const reason = ref('');
const confirmation = ref('');
const SUGGESTIONS = ['Compte de test', 'Doublon', 'Demande du propriétaire', 'Fraude avérée', 'Restaurant fermé définitivement'];
const CONFIRM_WORD = 'SUPPRIMER';

const count = computed(() => props.names.length);
const valid = computed(
  () => reason.value.trim().length >= 3 && reason.value.trim().length <= 255 && confirmation.value.trim().toUpperCase() === CONFIRM_WORD,
);
const shown = computed(() => props.names.slice(0, 8));
</script>

<template>
  <UModal
    :title="count > 1 ? `Supprimer ${count} restaurants ?` : `Supprimer « ${names[0]} » ?`"
    description="Le restaurant disparaît de la plateforme : menu, QR codes et back-office ne sont plus accessibles. Les commandes et paiements restent dans l’historique."
    @update:open="(o) => !o && emit('close', null)"
  >
    <template #body>
      <div class="space-y-4">
        <div class="rounded-lg border border-error/30 bg-error/5 p-3 text-sm">
          <p class="mb-1.5 flex items-center gap-2 font-medium text-error">
            <UIcon name="i-lucide-triangle-alert" class="size-4" />
            {{ count }} restaurant{{ count > 1 ? 's' : '' }} concerné{{ count > 1 ? 's' : '' }}
          </p>
          <ul class="list-disc space-y-0.5 pl-5 text-highlighted">
            <li v-for="n in shown" :key="n">{{ n }}</li>
          </ul>
          <p v-if="count > shown.length" class="mt-1 pl-5 text-muted">… et {{ count - shown.length }} autre(s)</p>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton v-for="s in SUGGESTIONS" :key="s" size="xs" color="neutral" variant="soft" :label="s" @click="reason = s" />
        </div>
        <UFormField label="Motif" required help="Conservé dans le journal d'audit, pour chaque restaurant.">
          <UTextarea v-model="reason" :rows="2" :maxlength="255" class="w-full" />
        </UFormField>
        <UFormField :label="`Tapez ${CONFIRM_WORD} pour confirmer`" required>
          <UInput v-model="confirmation" :placeholder="CONFIRM_WORD" autocomplete="off" class="w-full font-mono" />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" label="Annuler" @click="emit('close', null)" />
        <UButton
          color="error"
          icon="i-lucide-trash-2"
          :label="count > 1 ? `Supprimer les ${count} restaurants` : 'Supprimer le restaurant'"
          :disabled="!valid"
          @click="emit('close', reason.trim())"
        />
      </div>
    </template>
  </UModal>
</template>
