/**
 * Crew role pricing calculations
 * Shared utility for consistent pricing across projects, quotes, and invoices
 */

export function calculateCrewCost(role, quantity = 1, overrides = {}) {
  if (!role) return { internal: 0, billable: 0 };

  const internal = overrides.internal_rate !== undefined
    ? parseFloat(overrides.internal_rate) * quantity
    : getBaseInternalCost(role) * quantity;

  const billable = overrides.billable_rate !== undefined
    ? parseFloat(overrides.billable_rate) * quantity
    : getBaseBillableCost(role) * quantity;

  return { internal, billable, margin: billable - internal };
}

export function getBaseInternalCost(role) {
  if (!role) return 0;
  
  switch (role.pricing_method) {
    case 'hourly':
      return parseFloat(role.hourly_rate_internal) || 0;
    case 'fixed':
      return parseFloat(role.fixed_cost_internal) || 0;
    case 'days':
      const days = parseFloat(role.days_count) || 0;
      const dailyRate = parseFloat(role.daily_rate_internal) || 0;
      return days * dailyRate;
    default:
      return 0;
  }
}

export function getBaseBillableCost(role) {
  if (!role) return 0;
  
  switch (role.pricing_method) {
    case 'hourly':
      return parseFloat(role.hourly_rate_billable) || 0;
    case 'fixed':
      return parseFloat(role.fixed_cost_billable) || 0;
    case 'days':
      const days = parseFloat(role.days_count) || 0;
      const dailyRate = parseFloat(role.daily_rate_billable) || 0;
      return days * dailyRate;
    default:
      return 0;
  }
}

export function formatPricingDisplay(role) {
  if (!role) return '';
  
  switch (role.pricing_method) {
    case 'hourly':
      return `$${parseFloat(role.hourly_rate_billable || 0).toLocaleString()}/hr`;
    case 'fixed':
      return `$${parseFloat(role.fixed_cost_billable || 0).toLocaleString()}`;
    case 'days':
      const days = parseFloat(role.days_count) || 0;
      const rate = parseFloat(role.daily_rate_billable) || 0;
      const total = days * rate;
      return `${days} Days @ $${rate.toLocaleString()} = $${total.toLocaleString()}`;
    default:
      return '';
  }
}

export function getPricingMethodLabel(method) {
  const labels = {
    hourly: 'Hourly',
    fixed: 'Fixed Total',
    days: 'Days @ Price = Total'
  };
  return labels[method] || method;
}