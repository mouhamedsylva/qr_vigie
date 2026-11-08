/** Libellés de la console — miroir des énumérations de qr_api. */
import type { RestaurantStatus, SubscriptionStatus } from '~/types/api';
import { formatMoney } from '~/utils/format';

type Color = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

export const RESTAURANT_STATUS: Record<RestaurantStatus, { label: string; color: Color; icon: string }> = {
  ACTIVE: { label: 'Actif', color: 'success', icon: 'i-lucide-circle-check' },
  SUSPENDED: { label: 'Suspendu', color: 'warning', icon: 'i-lucide-circle-pause' },
  BANNED: { label: 'Banni', color: 'error', icon: 'i-lucide-ban' },
};

export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, { label: string; color: Color }> = {
  TRIALING: { label: 'Essai', color: 'info' },
  ACTIVE: { label: 'Actif', color: 'success' },
  PAST_DUE: { label: 'Impayé', color: 'warning' },
  SUSPENDED: { label: 'Suspendu', color: 'error' },
  CANCELLED: { label: 'Résilié', color: 'neutral' },
};

/** Fonctionnalités activables par forfait (FEATURES côté API). */
export const FEATURES: Record<string, { label: string; icon: string }> = {
  online_payments: { label: 'Paiement en ligne', icon: 'i-lucide-credit-card' },
  analytics: { label: 'Analytics', icon: 'i-lucide-chart-line' },
  loyalty: { label: 'Fidélité', icon: 'i-lucide-heart-handshake' },
  promotions: { label: 'Codes promo', icon: 'i-lucide-ticket-percent' },
  kds: { label: 'Écran cuisine', icon: 'i-lucide-chef-hat' },
  inventory: { label: 'Stocks', icon: 'i-lucide-package' },
  api: { label: 'API & webhooks', icon: 'i-lucide-webhook' },
  white_label: { label: 'Marque blanche', icon: 'i-lucide-tag' },
};

export const ROLE_LABEL: Record<string, string> = { OWNER: 'Propriétaire', MANAGER: 'Manager', STAFF: 'Équipier' };

const DOMAINS: Record<string, { label: string; icon: string }> = {
  admin: { label: 'Administration', icon: 'i-lucide-shield' },
  auth: { label: 'Connexion', icon: 'i-lucide-key-round' },
  restaurant: { label: 'Restaurant', icon: 'i-lucide-store' },
  menu: { label: 'Menu', icon: 'i-lucide-book-open' },
  tables: { label: 'Tables', icon: 'i-lucide-qr-code' },
  team: { label: 'Équipe', icon: 'i-lucide-users' },
  payments: { label: 'Paiements', icon: 'i-lucide-wallet' },
  promotions: { label: 'Promotions', icon: 'i-lucide-ticket-percent' },
  loyalty: { label: 'Fidélité', icon: 'i-lucide-heart-handshake' },
  reviews: { label: 'Avis', icon: 'i-lucide-star' },
  privacy: { label: 'Données personnelles', icon: 'i-lucide-lock' },
  integrations: { label: 'Intégrations', icon: 'i-lucide-plug' },
};

const ACTIONS: Record<string, string> = {
  'admin.restaurant_status': 'Statut d\'un restaurant modifié',
  'admin.user_status': 'Statut d\'un compte modifié',
  'admin.subscription_update': 'Abonnement modifié',
  'admin.plan_create': 'Forfait créé',
  'admin.plan_update': 'Forfait modifié',
  'auth.register': 'Inscription',
  'auth.account_locked': 'Compte verrouillé (tentatives)',
  'auth.password_reset': 'Mot de passe réinitialisé',
  'restaurant.create': 'Restaurant créé',
  'restaurant.delete': 'Restaurant supprimé',
  'restaurant.update_profile': 'Profil modifié',
  'restaurant.update_branding': 'Identité visuelle modifiée',
  'restaurant.update_regional': 'Paramètres régionaux modifiés',
  'restaurant.update_tax': 'Taxes modifiées',
  'restaurant.set_opening_hours': 'Horaires modifiés',
  'menu.price_change': 'Prix modifié',
  'payments.refund': 'Remboursement',
  'payments.cash_collected': 'Encaissement espèces',
  'payments.amount_mismatch': 'Écart de montant au paiement',
  'team.invite': 'Invitation envoyée',
  'team.member_update': 'Accès d\'un membre modifié',
  'team.member_remove': 'Membre retiré',
  'tables.qr_regenerate': 'QR code régénéré',
  'reviews.hide': 'Avis masqué',
  'reviews.publish': 'Avis republié',
  'loyalty.adjust': 'Points ajustés',
  'privacy.account_deleted': 'Compte supprimé (RGPD)',
  'privacy.customer_anonymized': 'Client anonymisé (RGPD)',
};

export function actionLabel(action: string): string {
  if (ACTIONS[action]) return ACTIONS[action];
  const [, rest = action] = action.split('.');
  const text = rest.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function actionDomain(action: string) {
  return DOMAINS[action.split('.')[0] ?? ''] ?? { label: 'Autre', icon: 'i-lucide-circle-dot' };
}

/** Actions sensibles mises en évidence dans le journal. */
export function isSensitive(action: string): boolean {
  return /^(admin\.|privacy\.|payments\.(refund|amount_mismatch)|auth\.account_locked|restaurant\.delete)/.test(action);
}

export const DOMAIN_OPTIONS = Object.entries(DOMAINS).map(([value, d]) => ({ value, label: d.label, icon: d.icon }));

/** Montants par devise : « 125 000 F CFA · 340 € ». */
export function moneyByCurrency(values: Record<string, number>): string {
  const entries = Object.entries(values).filter(([, v]) => v);
  if (!entries.length) return formatMoney(0, 'XOF');
  return entries.map(([currency, v]) => formatMoney(v, currency)).join(' · ');
}
