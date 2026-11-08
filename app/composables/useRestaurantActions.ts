import { ModerationModal, SubscriptionModal } from '#components';
import type { AdminRestaurant, UserStatus } from '~/types/api';

/** Modération d'un restaurant, du compte de son propriétaire et de son abonnement. */
export function useRestaurantActions() {
  const api = useApi();
  const toast = useToast();
  const overlay = useOverlay();
  const moderation = overlay.create(ModerationModal);
  const subscription = overlay.create(SubscriptionModal);

  async function setRestaurantStatus(r: Pick<AdminRestaurant, 'id' | 'name' | 'status'>): Promise<boolean> {
    const result = await moderation.open({
      title: `Statut de « ${r.name} »`,
      description: 'Suspendu ou banni, le restaurant n\'est plus accessible à ses clients ni à son équipe.',
      current: r.status,
      options: [
        { value: 'ACTIVE', label: 'Actif', description: 'Fonctionnement normal' },
        { value: 'SUSPENDED', label: 'Suspendu', description: 'Blocage temporaire (impayé, vérification…)' },
        { value: 'BANNED', label: 'Banni', description: 'Exclusion définitive de la plateforme' },
      ],
    });
    if (!result) return false;
    try {
      await api(`/admin/restaurants/${r.id}/status`, { method: 'PATCH', body: result });
      toast.add({ title: `${r.name} : statut mis à jour`, color: 'success', icon: 'i-lucide-check' });
      return true;
    } catch {
      return false;
    }
  }

  async function setOwnerStatus(owner: AdminRestaurant['owner'], current: UserStatus = 'ACTIVE'): Promise<boolean> {
    const result = await moderation.open({
      title: `Compte de ${owner.firstName} ${owner.lastName}`,
      description: 'La suspension ferme immédiatement toutes ses sessions, sur tous ses restaurants.',
      current,
      options: [
        { value: 'ACTIVE', label: 'Actif', description: 'Peut se connecter' },
        { value: 'SUSPENDED', label: 'Suspendu', description: 'Connexion impossible, sessions fermées' },
      ],
    });
    if (!result) return false;
    try {
      await api(`/admin/users/${owner.id}/status`, { method: 'PATCH', body: result });
      toast.add({ title: 'Statut du compte mis à jour', color: 'success', icon: 'i-lucide-check' });
      return true;
    } catch {
      return false;
    }
  }

  async function editSubscription(owner: AdminRestaurant['owner']): Promise<boolean> {
    return !!(await subscription.open({ owner }));
  }

  return { setRestaurantStatus, setOwnerStatus, editSubscription };
}
