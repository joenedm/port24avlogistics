/**
 * useConflictCheck — shared hook that determines if an asset or kit is
 * reserved/conflicted for a given show's date window.
 *
 * Conflict logic (additive — does NOT replace existing scan/fulfillment logic):
 *  - An asset is "conflicted" if another show that overlaps the current show's
 *    date window has it assigned (via ShowRequirement.asset_id or ShowRequirement.kit_id)
 *    AND that show is NOT the current show.
 *  - "Assigned" = listed as a ShowRequirement on another show (planning reservation).
 *  - "Checked out" = has an active ShowFulfillment with a hard movement_state on another show.
 *
 * Returns:
 *   isConflicted(assetId)   → boolean
 *   conflictInfo(assetId)   → { showName, showId, level: 'hard'|'soft' } | null
 *   conflictsReady          → boolean (data loaded)
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { parseISO, isWithinInterval, startOfDay, endOfDay, areIntervalsOverlapping } from 'date-fns';

const HARD_OUT_STATES = new Set(['picked', 'on_truck', 'on_location', 'returning']);

function getShowWindow(show) {
  const start = show.load_out_date || show.start_date;
  const end = show.return_date || show.end_date;
  if (!start || !end) return null;
  try {
    return { start: startOfDay(parseISO(start)), end: endOfDay(parseISO(end)) };
  } catch {
    return null;
  }
}

export function useConflictCheck({ currentShowId, currentShow }) {
  // Fetch all requirements across shows — limited to 500, enough for conflict detection
  const { data: allRequirements = [], isSuccess: reqReady } = useQuery({
    queryKey: ['all_show_requirements_conflict'],
    queryFn: () => base44.entities.ShowRequirement.list('-created_date', 500),
    staleTime: 30000,
  });

  const { data: allFulfillments = [], isSuccess: fulfReady } = useQuery({
    queryKey: ['all_show_fulfillments_conflict'],
    queryFn: () => base44.entities.ShowFulfillment.list('-scanned_at', 1000),
    staleTime: 30000,
  });

  const { data: allShows = [], isSuccess: showsReady } = useQuery({
    queryKey: ['shows'],
    queryFn: () => base44.entities.Show.list(),
    staleTime: 30000,
  });

  const conflictsReady = reqReady && fulfReady && showsReady;

  // Build show window map
  const showWindows = useMemo(() => {
    const map = {};
    allShows.forEach(s => {
      const w = getShowWindow(s);
      if (w) map[s.id] = { ...w, name: s.name };
    });
    return map;
  }, [allShows]);

  // Current show window
  const currentWindow = useMemo(() => {
    if (!currentShow) return null;
    return getShowWindow(currentShow);
  }, [currentShow]);

  /**
   * Build per-asset conflict map:
   * assetId → { showId, showName, level: 'hard'|'soft' }
   * Considers requirements on OTHER shows that overlap with the current show window.
   */
  const conflictMap = useMemo(() => {
    if (!currentWindow || !currentShowId) return {};

    const map = {}; // assetId or kitId → conflict info

    // Check planning-level conflicts (ShowRequirements on other shows)
    allRequirements.forEach(req => {
      if (req.show_id === currentShowId) return; // same show, not a conflict

      // Only check if the other show's window overlaps
      const otherWindow = showWindows[req.show_id];
      if (!otherWindow) return;

      const overlaps = areIntervalsOverlapping(
        { start: currentWindow.start, end: currentWindow.end },
        { start: otherWindow.start, end: otherWindow.end },
        { inclusive: true }
      );
      if (!overlaps) return;

      // Mark asset conflict (soft = planned reservation)
      if (req.asset_id && !map[req.asset_id]) {
        map[req.asset_id] = { showId: req.show_id, showName: otherWindow.name || req.show_name, level: 'soft' };
      }
      if (req.kit_id && !map[req.kit_id]) {
        map[req.kit_id] = { showId: req.show_id, showName: otherWindow.name || req.show_name, level: 'soft' };
      }
    });

    // Check hard conflicts (ShowFulfillments with active movement state on other shows)
    allFulfillments.forEach(f => {
      if (f.show_id === currentShowId) return;
      if (!HARD_OUT_STATES.has(f.movement_state)) return;

      const otherWindow = showWindows[f.show_id];
      if (!otherWindow) return;

      const overlaps = areIntervalsOverlapping(
        { start: currentWindow.start, end: currentWindow.end },
        { start: otherWindow.start, end: otherWindow.end },
        { inclusive: true }
      );
      if (!overlaps) return;

      // Hard conflict overrides soft
      if (f.asset_id) {
        map[f.asset_id] = { showId: f.show_id, showName: otherWindow.name, level: 'hard' };
      }
    });

    return map;
  }, [allRequirements, allFulfillments, showWindows, currentWindow, currentShowId]);

  /**
   * Name-level conflict map — for requirements that have no asset_id/kit_id.
   * Maps lowercase product_name → conflict info from another overlapping show.
   */
  const nameConflictMap = useMemo(() => {
    if (!currentWindow || !currentShowId) return {};
    const map = {};
    allRequirements.forEach(req => {
      if (req.show_id === currentShowId) return;
      if (!req.product_name) return;
      const otherWindow = showWindows[req.show_id];
      if (!otherWindow) return;
      const overlaps = areIntervalsOverlapping(
        { start: currentWindow.start, end: currentWindow.end },
        { start: otherWindow.start, end: otherWindow.end },
        { inclusive: true }
      );
      if (!overlaps) return;
      const key = req.product_name.trim().toLowerCase();
      if (!map[key]) {
        map[key] = { showId: req.show_id, showName: otherWindow.name || req.show_name, level: 'soft' };
      }
    });
    return map;
  }, [allRequirements, showWindows, currentWindow, currentShowId]);

  const isConflicted = (id) => !!conflictMap[id];
  const conflictInfo = (id) => conflictMap[id] || null;

  /** Check conflict for a requirement that may have no asset_id — falls back to name lookup */
  const reqConflictInfo = (req) => {
    if (req.asset_id && conflictMap[req.asset_id]) return conflictMap[req.asset_id];
    if (req.kit_id && conflictMap[req.kit_id]) return conflictMap[req.kit_id];
    if (!req.asset_id && !req.kit_id && req.product_name) {
      return nameConflictMap[req.product_name.trim().toLowerCase()] || null;
    }
    return null;
  };

  return { isConflicted, conflictInfo, reqConflictInfo, conflictsReady };
}