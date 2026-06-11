export const PLANS = {
  trial: {
    label: 'Trial',
    price: 'Free',
    maxUsers: 3,
    maxAssets: 50,
    maxShows: 5,
    branding: false,
    crewManagement: false,
    documentsExport: false,
    scanning: false,
  },
  starter: {
    label: 'Starter',
    price: '$49/mo',
    maxUsers: 10,
    maxAssets: 500,
    maxShows: null, // unlimited
    branding: 'logo', // logo only
    crewManagement: true,
    documentsExport: true,
    scanning: true,
  },
  pro: {
    label: 'Pro',
    price: '$99/mo',
    maxUsers: 25,
    maxAssets: null,
    maxShows: null,
    branding: 'full', // logo + colors
    crewManagement: true,
    documentsExport: true,
    scanning: true,
  },
  enterprise: {
    label: 'Enterprise',
    price: '$199/mo',
    maxUsers: null,
    maxAssets: null,
    maxShows: null,
    branding: 'full',
    crewManagement: true,
    documentsExport: true,
    scanning: true,
  },
};

export function getPlanLimits(plan) {
  return PLANS[plan] ?? PLANS.trial;
}

export function canAddUser(plan, currentUserCount) {
  const limits = getPlanLimits(plan);
  if (limits.maxUsers === null) return { allowed: true };
  if (currentUserCount >= limits.maxUsers) {
    return { allowed: false, reason: `Your ${limits.label} plan allows up to ${limits.maxUsers} users. Upgrade to add more.` };
  }
  return { allowed: true };
}

export function canAddAsset(plan, currentAssetCount) {
  const limits = getPlanLimits(plan);
  if (limits.maxAssets === null) return { allowed: true };
  if (currentAssetCount >= limits.maxAssets) {
    return { allowed: false, reason: `Your ${limits.label} plan allows up to ${limits.maxAssets} assets. Upgrade to add more.` };
  }
  return { allowed: true };
}

export function canAddShow(plan, currentShowCount) {
  const limits = getPlanLimits(plan);
  if (limits.maxShows === null) return { allowed: true };
  if (currentShowCount >= limits.maxShows) {
    return { allowed: false, reason: `Your ${limits.label} plan allows up to ${limits.maxShows} active shows. Upgrade to add more.` };
  }
  return { allowed: true };
}

export function canUseBranding(plan) {
  const limits = getPlanLimits(plan);
  return limits.branding !== false;
}

export function canUseFullBranding(plan) {
  const limits = getPlanLimits(plan);
  return limits.branding === 'full';
}
