<script setup lang="ts">
/** Changement de statut avec motif obligatoire (ADM-02) — restaurant ou compte. */
interface Option {
  value: string;
  label: string;
  description: string;
}
const props = defineProps<{ title: string; description?: string; current: string; options: Option[] }>();
const emit = defineEmits<{ close: [result: { status: string; reason: string } | null] }>();

const status = ref(props.options.find((o) => o.value !== props.current)?.value ?? props.current);
const reason = ref('');
const SUGGESTIONS = ['Impayé', 'Fraude suspectée', 'Contenu non conforme', 'Demande du client', 'Régularisé'];
const valid = computed(() => status.value !== props.current && reason.value.trim().length >= 3 && reason.value.trim().length <= 255);
const danger = computed(() => status.value !== 'ACTIVE');
</script>

<template>
  <UModal :title="title" :description="description" @update:open="(o) => !o && emit('close', null)">
    <template #body>
      <div class="space-y-4">
        <URadioGroup
          v-model="status"
          variant="card"
          :items="options.map((o) => ({ ...o, disabled: o.value === current, description: o.value === current ? 'Statut actuel' : o.description }))"
        />
        <div class="flex flex-wrap gap-2">
          <UButton v-for="s in SUGGESTIONS" :key="s" size="xs" color="neutral" variant="soft" :label="s" @click="reason = s" />
        </div>
        <UFormField label="Motif" required help="Conservé dans le journal d'audit.">
          <UTextarea v-model="reason" :rows="2" :maxlength="255" class="w-full" />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" label="Annuler" @click="emit('close', null)" />
        <UButton :color="danger ? 'error' : 'success'" label="Confirmer" :disabled="!valid" @click="emit('close', { status, reason: reason.trim() })" />
      </div>
    </template>
  </UModal>
</template>
