/** Formes des réponses de l'API qr_api utilisées par Vigie. */

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface Me {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isSuperAdmin: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export type RestaurantStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED';
export type BillingCycle = 'MONTHLY' | 'YEARLY';

export interface AdminRestaurant {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country: string;
  status: RestaurantStatus;
  currency: string;
  createdAt: string;
  owner: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    subscription: {
      status: SubscriptionStatus;
      trialEndsAt: string | null;
      currentPeriodEnd: string | null;
      plan: { code: string };
    } | null;
  };
  /** Commandes des 30 derniers jours, tables et membres actifs. */
  _count: { orders: number; tables: number; memberships: number };
}

export interface PlatformAnalytics {
  period: { from: string; to: string };
  restaurants: { byStatus: Partial<Record<RestaurantStatus, number>>; new: number };
  orders: { count: number };
  /** Volume d'affaires par devise (plus petite unité). */
  gmv: Record<string, number>;
  subscriptions: Partial<Record<SubscriptionStatus, number>>;
  /** Revenu mensuel récurrent par devise. */
  mrr: Record<string, number>;
  churnRate: number;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  trialDays: number;
  maxRestaurants: number | null;
  maxTables: number | null;
  maxMembers: number | null;
  features: string[];
  isActive: boolean;
  position: number;
}

export interface AuditLog {
  id: string;
  restaurantId: string | null;
  actorId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { id: string; email: string; firstName: string; lastName: string } | null;
}

/** Détail d'un restaurant (accès super-admin aux routes de l'établissement). */
export interface RestaurantDetails {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  brandColors: { primary?: string } | null;
  currency: string;
  locale: string;
  timezone: string;
  status: RestaurantStatus;
  stripeChargesEnabled?: boolean;
  createdAt: string;
}

export interface RestaurantDashboard {
  isOpen: boolean;
  salesTotal: number;
  ordersCount: number;
  ordersInProgress: number;
  averageBasket: number;
  tablesOccupied: number;
}

export interface Member {
  id: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  staffProfile: string | null;
  user: { id: string; email: string; phone: string | null; firstName: string; lastName: string; status: UserStatus };
  createdAt: string;
}

export interface OrderSummary {
  id: string;
  number: number;
  status: string;
  mode: 'DINE_IN' | 'TAKEAWAY';
  source: 'CUSTOMER' | 'STAFF';
  paymentStatus: string;
  total: number;
  currency: string;
  createdAt: string;
  table: { label: string } | null;
}
