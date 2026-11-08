/**
 * Accès à Vigie : session restaurée au premier chargement, connexion exigée,
 * et réservé aux super-administrateurs (l'API le vérifie aussi sur /admin).
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore();
  if (!auth.initialized) await auth.init();

  const isPublic = to.meta.public === true;
  if (!auth.isLoggedIn && !isPublic) {
    return navigateTo({ path: '/login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} });
  }
  // Session valide mais sans droits d'administration : on ferme la session.
  if (auth.isLoggedIn && !auth.user?.isSuperAdmin) {
    await auth.logout();
    return navigateTo({ path: '/login', query: { denied: '1' } });
  }
  if (auth.isLoggedIn && isPublic) return navigateTo('/');
});
