/**
 * ITEM TYPE DEFINITIONS — Single source of truth for all platform behavior.
 * Type drives creation, scanning, review, hospital, availability, quoting logic.
 * Category is classification only (Audio, Video, Lighting, etc.)
 */

export const ITEM_TYPES = [
  {
    value: 'physical_item',
    label: 'Physical Item',
    shortLabel: 'Physical',
    description: 'A single real piece of gear with its own asset identity.',
    examples: 'Monitor, mic, tripod, speaker, cable tester',
    icon: 'Package',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
  },
  {
    value: 'physical_kit',
    label: 'Physical Kit',
    shortLabel: 'Kit',
    description: 'A real grouped kit that physically exists and can be tracked/scanned as one unit.',
    examples: 'Comms kit, IEM kit, camera support kit',
    icon: 'PackageOpen',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  {
    value: 'cloud_kit',
    label: 'Cloud Kit',
    shortLabel: 'Cloud Kit',
    description: 'A virtual planning/quote bundle. Not a physical asset on the shelf.',
    examples: 'Ballroom audio package, streaming bundle, flypack template',
    icon: 'Cloud',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/30',
  },
  {
    value: 'consumable',
    label: 'Consumable',
    shortLabel: 'Consumable',
    description: 'A stock item tracked by quantity, not by individual serialized asset lifecycle.',
    examples: 'Batteries, tape, zip ties, gels, markers',
    icon: 'ShoppingCart',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    borderColor: 'border-emerald-400/30',
  },
];

export const ITEM_TYPE_MAP = Object.fromEntries(ITEM_TYPES.map(t => [t.value, t]));

/** Returns the label for a given type value */
export function getItemTypeLabel(value) {
  return ITEM_TYPE_MAP[value]?.label || value || '—';
}

/** Types that are real physical assets (can be scanned, reviewed, sent to hospital) */
export const PHYSICAL_TYPES = ['physical_item', 'physical_kit'];

/** Types that should appear in Asset Review Portal */
export const REVIEWABLE_TYPES = ['physical_item', 'physical_kit'];

/** Types that can be sent to Hospital / Lost */
export const HOSPITAL_ELIGIBLE_TYPES = ['physical_item', 'physical_kit'];

/** Types that appear on Availability Calendar as real blocked assets */
export const CALENDAR_TYPES = ['physical_item', 'physical_kit'];

/** Types that can be scanned out on a pick list */
export const SCANNABLE_TYPES = ['physical_item', 'physical_kit'];

/** Returns true if this asset type should be included in asset review */
export function isReviewable(item_type) {
  return REVIEWABLE_TYPES.includes(item_type || 'physical_item');
}

/** Returns true if this asset type can be scanned out */
export function isScannable(item_type) {
  return SCANNABLE_TYPES.includes(item_type || 'physical_item');
}

/** Returns true if this type can go to Hospital / Lost */
export function isHospitalEligible(item_type) {
  return HOSPITAL_ELIGIBLE_TYPES.includes(item_type || 'physical_item');
}

/** For legacy records without item_type: infer from existing data */
export function inferItemType(asset) {
  if (asset._isKit) {
    return asset.kit_type === 'cloud' ? 'cloud_kit' : 'physical_kit';
  }
  if (asset.item_type) return asset.item_type;
  // Legacy: category was sometimes used for type labels — migrate
  if (asset.category === 'Cloud Kit' || asset.category === 'Virtual combination') return 'cloud_kit';
  if (asset.category === 'Serialized Kit' || asset.category === 'Physical combination') return 'physical_kit';
  return 'physical_item';
}