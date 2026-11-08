import { describe, expect, it } from 'vitest';
import { actionDomain, actionLabel, isSensitive, moneyByCurrency } from '~/utils/labels';

const plain = (s: string) => s.replace(new RegExp(`[${String.fromCharCode(0xa0, 0x202f)}]`, 'g'), ' ');

describe('journal d\'audit', () => {
  it('traduit les actions connues et dérive un libellé pour les autres', () => {
    expect(actionLabel('payments.refund')).toBe('Remboursement');
    expect(actionLabel('menu.item_create')).toBe('Item create');
  });

  it('range chaque action dans son domaine', () => {
    expect(actionDomain('admin.plan_update').label).toBe('Administration');
    expect(actionDomain('inconnu.truc').label).toBe('Autre');
  });

  it('signale les actions sensibles', () => {
    expect(isSensitive('admin.restaurant_status')).toBe(true);
    expect(isSensitive('payments.refund')).toBe(true);
    expect(isSensitive('payments.cash_collected')).toBe(false);
    expect(isSensitive('menu.item_update')).toBe(false);
  });
});

describe('moneyByCurrency', () => {
  it('juxtapose les devises sans les convertir', () => {
    expect(plain(moneyByCurrency({ XOF: 125000, EUR: 34000 }))).toBe('125 000 F CFA · 340,00 €');
    expect(plain(moneyByCurrency({}))).toBe('0 F CFA');
  });
});
