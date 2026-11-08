<script setup lang="ts">
defineProps<{ collapsed?: boolean; inverted?: boolean }>();
</script>

<template>
  <span class="flex items-center gap-2.5">
    <svg viewBox="0 0 32 32" class="size-8 shrink-0" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#1E1B4B" />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="#A5B4FC" stroke-width="2" />
      <circle cx="16" cy="16" r="3" fill="#F59F00" />
      <path d="M16 4v4M16 24v4M4 16h4M24 16h4" stroke="#A5B4FC" stroke-width="2" stroke-linecap="round" />
    </svg>
    <span v-if="!collapsed" class="leading-tight">
      <span class="block font-display text-lg font-bold tracking-tight" :class="inverted ? 'text-white' : 'text-highlighted'">Vigie</span>
      <span class="block text-[11px] tracking-wide uppercase" :class="inverted ? 'text-nuit-200' : 'text-muted'">QR-Order · Administration</span>
    </span>
  </span>
</template>
