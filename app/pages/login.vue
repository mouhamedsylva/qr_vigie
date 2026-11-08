<script setup lang="ts">
import * as z from 'zod';
import type { FormSubmitEvent } from '@nuxt/ui';

definePageMeta({ layout: 'auth', public: true });
useHead({ title: 'Connexion · Vigie' });

const auth = useAuthStore();
const route = useRoute();

const schema = z.object({
  email: z.string().trim().pipe(z.email('Adresse email invalide')),
  password: z.string().min(1, 'Mot de passe requis'),
});
type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({ email: '', password: '' });
const showPassword = ref(false);
const error = ref<string | null>(
  route.query.denied ? 'Ce compte n\'a pas accès à la console d\'administration.' : null,
);
const loading = ref(false);
// Le message d'erreur disparaît dès que l'utilisateur corrige sa saisie.
watch(() => [state.email, state.password], () => (error.value = null));

async function onSubmit(event: FormSubmitEvent<Schema>) {
  error.value = null;
  loading.value = true;
  try {
    await auth.login(event.data.email, event.data.password);
    if (!auth.user?.isSuperAdmin) {
      await auth.logout();
      error.value = 'Ce compte n\'a pas accès à la console d\'administration.';
      return;
    }
    await navigateTo((route.query.redirect as string) || '/');
  } catch (err) {
    error.value =
      apiErrorCode(err) === 'ACCOUNT_LOCKED'
        ? 'Compte temporairement verrouillé après plusieurs essais. Réessayez dans 15 minutes.'
        : apiErrorMessage(err);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="space-y-8">
    <div class="space-y-2">
      <UBadge color="primary" variant="subtle" icon="i-lucide-shield" label="Accès restreint" />
      <h1 class="font-display text-3xl font-semibold text-highlighted">Connexion à Vigie</h1>
      <p class="text-muted">Console d'administration de la plateforme QR-Order.</p>
    </div>

    <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="error" />

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Email" name="email">
        <UInput v-model="state.email" type="email" autocomplete="username" autofocus class="w-full" size="lg" />
      </UFormField>
      <UFormField label="Mot de passe" name="password">
        <UInput v-model="state.password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" class="w-full" size="lg">
          <template #trailing>
            <UButton
              color="neutral"
              variant="link"
              size="sm"
              :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              :aria-label="showPassword ? 'Masquer' : 'Afficher'"
              @click="showPassword = !showPassword"
            />
          </template>
        </UInput>
      </UFormField>
      <UButton type="submit" block size="lg" label="Se connecter" :loading="loading" />
    </UForm>

    <p class="text-xs text-muted">
      Mot de passe oublié : utilisez « Mot de passe oublié » du back-office avec la même adresse, puis revenez ici.
    </p>
  </div>
</template>
