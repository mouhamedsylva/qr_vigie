<script setup lang="ts">
/** Entrées du journal d'audit, avec le détail avant / après dépliable (ADM-05). */
import type { AuditLog } from '~/types/api';
import { actionDomain, actionLabel, isSensitive } from '~/utils/labels';

defineProps<{ logs: AuditLog[]; loading?: boolean; showRestaurant?: boolean }>();
const emit = defineEmits<{ filter: [key: 'actorId' | 'restaurantId', value: string] }>();

const openId = ref<string | null>(null);

/** Champs modifiés entre « avant » et « après ». */
function changes(log: AuditLog) {
  const before = log.before ?? {};
  const after = log.after ?? {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return keys
    .map((k) => ({ key: k, before: before[k], after: after[k] }))
    .filter((c) => JSON.stringify(c.before) !== JSON.stringify(c.after));
}

const show = (v: unknown) => (v === undefined ? '—' : v === null ? 'vide' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const when = (d: string) =>
  new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
</script>

<template>
  <div>
    <div v-if="loading && !logs.length" class="space-y-2 p-4">
      <USkeleton v-for="n in 6" :key="n" class="h-12 w-full" />
    </div>
    <p v-else-if="!logs.length" class="py-10 text-center text-sm text-muted">Aucune entrée.</p>
    <ul v-else class="divide-y divide-default">
      <li v-for="log in logs" :key="log.id">
        <button
          type="button"
          class="flex w-full items-center gap-3 px-4 py-2.5 text-start transition hover:bg-elevated/60"
          :aria-expanded="openId === log.id"
          @click="openId = openId === log.id ? null : log.id"
        >
          <span
            class="flex size-8 shrink-0 items-center justify-center rounded-lg"
            :class="isSensitive(log.action) ? 'bg-warning/15 text-warning' : 'bg-elevated text-muted'"
          >
            <UIcon :name="actionDomain(log.action).icon" class="size-4" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium">{{ actionLabel(log.action) }}</span>
            <span class="block truncate text-xs text-muted">
              {{ log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'Système' }}
              <template v-if="log.entity"> · {{ log.entity }}</template>
              <template v-if="log.ip"> · {{ log.ip }}</template>
            </span>
          </span>
          <span class="tabular hidden shrink-0 text-xs text-muted sm:block">{{ when(log.createdAt) }}</span>
          <UIcon name="i-lucide-chevron-down" class="size-4 shrink-0 text-dimmed transition" :class="openId === log.id && 'rotate-180'" />
        </button>

        <div v-if="openId === log.id" class="space-y-3 bg-elevated/40 px-4 py-3 text-sm sm:ps-15">
          <p class="text-xs text-muted sm:hidden">{{ when(log.createdAt) }}</p>
          <div class="flex flex-wrap gap-x-6 gap-y-1 text-xs">
            <span><span class="text-muted">Action :</span> <code>{{ log.action }}</code></span>
            <span v-if="log.entityId"><span class="text-muted">Objet :</span> <code>{{ log.entityId }}</code></span>
            <button v-if="log.actor" type="button" class="text-primary hover:underline" @click="emit('filter', 'actorId', log.actor.id)">
              Toutes les actions de {{ log.actor.email }}
            </button>
            <button
              v-if="showRestaurant && log.restaurantId"
              type="button"
              class="text-primary hover:underline"
              @click="emit('filter', 'restaurantId', log.restaurantId)"
            >
              Ce restaurant uniquement
            </button>
            <NuxtLink v-if="showRestaurant && log.restaurantId" :to="`/restaurants/${log.restaurantId}`" class="text-primary hover:underline">
              Ouvrir la fiche
            </NuxtLink>
          </div>
          <table v-if="changes(log).length" class="w-full text-xs">
            <thead class="text-left text-muted">
              <tr>
                <th class="py-1 pe-3 font-medium">Champ</th>
                <th class="py-1 pe-3 font-medium">Avant</th>
                <th class="py-1 font-medium">Après</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="c in changes(log)" :key="c.key" class="align-top">
                <td class="py-1 pe-3 font-mono">{{ c.key }}</td>
                <td class="max-w-64 py-1 pe-3 break-all text-error/90"><del>{{ show(c.before) }}</del></td>
                <td class="max-w-64 py-1 break-all text-success">{{ show(c.after) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-xs text-muted">Pas de détail enregistré.</p>
          <p v-if="log.userAgent" class="truncate text-xs text-dimmed" :title="log.userAgent">{{ log.userAgent }}</p>
        </div>
      </li>
    </ul>
  </div>
</template>
