/**
 * useStatusFlow — React hook that loads admin-configured status flow
 * from BrandSettings and exposes label/color/config helpers.
 * All UI areas that render project status should use this hook.
 */
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import {
  parseStatusFlow,
  getStatusLabel,
  getStatusColor,
  getStatusStyle,
  getStatusClassName,
  getStatusConfig,
  normalizeStatusKey,
  DEFAULT_STATUS_FLOW,
} from './projectStatusEngine';

export function useStatusFlow() {
  const { data: brandSettings = [] } = useQuery({
    queryKey: ['brand_settings'],
    queryFn: () => db.entities.BrandSettings.list(),
    staleTime: 30_000,
  });

  const flow = parseStatusFlow(brandSettings);

  return {
    flow,
    label:     (key, opts) => getStatusLabel(normalizeStatusKey(key), flow, opts),
    color:     (key)       => getStatusColor(normalizeStatusKey(key), flow),
    style:     (key)       => getStatusStyle(normalizeStatusKey(key), flow),
    className: (key)       => getStatusClassName(normalizeStatusKey(key), flow),
    config:    (key)       => getStatusConfig(normalizeStatusKey(key), flow),
    normalize: normalizeStatusKey,
    // Enabled statuses for dropdowns / scan workflows
    enabledStatuses: flow.filter(s => s.enabled),
    scanStatuses:    flow.filter(s => s.enabled && s.show_in_scan),
    listStatuses:    flow.filter(s => s.enabled && s.show_in_list),
    dashboardStatuses: flow.filter(s => s.enabled && s.show_on_dashboard),
  };
}