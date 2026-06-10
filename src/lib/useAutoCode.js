/**
 * useAutoCode — centralized QR / asset code generation hook
 *
 * Reads CodeSettings records, generates the next code for any record type,
 * and increments the next_number counter after use.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';

// Default settings for each record type (used as fallback if no DB record exists)
export const CODE_TYPE_DEFAULTS = {
  physical_item:       { label: 'Physical Item',           prefix: 'ITEM',      separator: '-', padding: 5 },
  physical_kit:        { label: 'Physical Kit',            prefix: 'KIT',       separator: '-', padding: 5 },
  container:           { label: 'Container',               prefix: 'CASE',      separator: '-', padding: 5 },
  consumable:          { label: 'Consumable',              prefix: 'CON',       separator: '-', padding: 5 },
  bulk:                { label: 'Bulk Item',               prefix: 'BULK',      separator: '-', padding: 5 },
  show_container:      { label: 'Temporary Show Container',prefix: 'SHOWCASE',  separator: '-', padding: 5 },
  warehouse_location:  { label: 'Warehouse Location',      prefix: 'LOC',       separator: '-', padding: 5 },
  project_code:        { label: 'Project Code',            prefix: 'PROJ',      separator: '-', padding: 5 },
  pick_bin:            { label: 'Pick Bin',                prefix: 'BIN',       separator: '-', padding: 5 },
  cart:                { label: 'Cart',                    prefix: 'CART',      separator: '-', padding: 5 },
  rack:                { label: 'Rack',                    prefix: 'RACK',      separator: '-', padding: 5 },
  road_case:           { label: 'Road Case',               prefix: 'RCASE',     separator: '-', padding: 5 },
  pelican:             { label: 'Pelican',                 prefix: 'PEL',       separator: '-', padding: 5 },
  custom_container:    { label: 'Custom Container Type',   prefix: 'CUST',      separator: '-', padding: 5 },
};

export function buildCode(prefix, separator, padding, number) {
  return `${prefix}${separator}${String(number).padStart(padding, '0')}`;
}

export function previewCode(settings) {
  const sep = settings.separator ?? '-';
  const pad = settings.padding ?? 5;
  const next = settings.next_number ?? 1;
  return buildCode(settings.prefix || '???', sep, pad, next);
}

/**
 * Hook: load all CodeSettings records
 */
export function useCodeSettings() {
  return useQuery({
    queryKey: ['codeSettings'],
    queryFn: () => db.entities.CodeSettings.list(),
    staleTime: 60_000,
  });
}

/**
 * Get merged settings for a record type (DB record overrides defaults)
 */
export function getMergedSettings(allSettings, recordType) {
  const defaults = CODE_TYPE_DEFAULTS[recordType] || { label: recordType, prefix: 'CODE', separator: '-', padding: 5 };
  const dbRecord = allSettings.find(s => s.record_type === recordType);
  if (!dbRecord) return { ...defaults, record_type: recordType, next_number: 1, auto_generate: true, qr_enabled: true };
  return {
    ...defaults,
    ...dbRecord,
    prefix: dbRecord.prefix || defaults.prefix,
    separator: dbRecord.separator ?? defaults.separator,
    padding: dbRecord.padding ?? defaults.padding,
    next_number: dbRecord.next_number ?? 1,
  };
}

/**
 * generateNextCode — fetch fresh settings, build code, increment counter
 * Returns the generated code string.
 */
export async function generateNextCode(recordType) {
  const allSettings = await db.entities.CodeSettings.list();
  const settings = getMergedSettings(allSettings, recordType);

  if (!settings.auto_generate) return null;

  const code = buildCode(settings.prefix, settings.separator ?? '-', settings.padding ?? 5, settings.next_number ?? 1);

  // Increment next_number
  const nextNum = (settings.next_number ?? 1) + 1;
  if (settings.id) {
    await db.entities.CodeSettings.update(settings.id, { next_number: nextNum });
  } else {
    // Create new settings record
    await db.entities.CodeSettings.create({
      record_type: recordType,
      label: CODE_TYPE_DEFAULTS[recordType]?.label || recordType,
      prefix: settings.prefix,
      separator: settings.separator ?? '-',
      padding: settings.padding ?? 5,
      next_number: nextNum,
      auto_generate: true,
      qr_enabled: true,
    });
  }

  return code;
}