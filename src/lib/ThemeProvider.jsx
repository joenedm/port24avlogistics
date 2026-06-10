/**
 * ThemeProvider — loads BrandSettings and injects a FULL set of CSS variable overrides.
 *
 * Strategy: derive ALL dependent variables from the 4 brand colors so the entire
 * CSS token cascade updates consistently — sidebar, cards, muted layers, borders, etc.
 *
 * Brand inputs:
 *   primary_color  → teal buttons, active nav highlight (#1FB8A0)
 *   accent_color   → cyan secondary accent (#3DC9C0)
 *   bg_color       → deepest background — midnight (#0E1117)
 *   card_color     → card/panel surface (#171D27)
 *
 * Derived automatically:
 *   secondary      → slightly lighter than card
 *   muted          → slightly lighter than secondary
 *   border         → subtle border between bg and card
 *   sidebar-accent → hover bg in sidebar (between sidebar-bg and card)
 *   popover        → same as card
 *   input          → same as border
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';

const ThemeContext = createContext({ brand: {} });
export const useBrand = () => useContext(ThemeContext);

// Parse hex → { r, g, b } (0-1 range)
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
  };
}

// RGB (0-1) → "H S% L%"
function rgbToHslStr({ r, g, b }) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hexToHslStr(hex) {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHslStr(rgb) : null;
}

// Parse "H S% L%" → { h, s, l }
function parseHsl(hslStr) {
  if (!hslStr) return null;
  const [h, s, l] = hslStr.split(' ').map(v => parseFloat(v));
  return { h, s: s / 100, l: l / 100 };
}

// Lighten/darken a parsed HSL object by a delta (positive = lighter)
function shiftL({ h, s, l }, delta) {
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(Math.min(1, Math.max(0, l + delta)) * 100)}%`;
}

function applyVar(name, value) {
  if (value != null) document.documentElement.style.setProperty(name, value);
  else document.documentElement.style.removeProperty(name);
}

function clearVar(name) {
  document.documentElement.style.removeProperty(name);
}

export default function ThemeProvider({ children }) {
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    db.auth.isAuthenticated().then(setIsAuthed);
  }, []);

  const { data: brandList = [] } = useQuery({
    queryKey: ['brand'],
    queryFn: () => db.entities.BrandSettings.list(),
    staleTime: 0,
    enabled: isAuthed,
    retry: false,
  });

  const brand = brandList[0] || {};

  useEffect(() => {
    const hasBg = !!brand.bg_color;
    const hasCard = !!brand.card_color;
    const hasPrimary = !!brand.primary_color;
    const hasAccent = !!brand.accent_color;
    const hasSidebar = !!brand.sidebar_color;
    const hasBorder = !!brand.border_color;

    // If nothing is set, remove all overrides → CSS defaults in index.css take over
    if (!hasBg && !hasCard && !hasPrimary && !hasAccent && !hasSidebar && !hasBorder) {
      [
        '--background', '--card', '--card-foreground', '--popover', '--popover-foreground',
        '--primary', '--primary-foreground', '--accent', '--accent-foreground', '--sidebar-primary-foreground',
        '--secondary', '--secondary-foreground',
        '--muted', '--muted-foreground',
        '--border', '--input', '--ring',
        '--sidebar-background', '--sidebar-foreground',
        '--sidebar-primary', '--sidebar-primary-foreground',
        '--sidebar-accent', '--sidebar-accent-foreground',
        '--sidebar-border', '--sidebar-ring',
      ].forEach(clearVar);
      return;
    }

    // ── Background (deepest layer) ──────────────────────────────────
    const bgHsl = hasBg ? hexToHslStr(brand.bg_color) : null;
    const bgParsed = bgHsl ? parseHsl(bgHsl) : null;

    // ── Card (panel surface) ────────────────────────────────────────
    const cardHsl = hasCard ? hexToHslStr(brand.card_color) : (bgParsed ? shiftL(bgParsed, 0.06) : null);
    const cardParsed = cardHsl ? parseHsl(cardHsl) : null;

    // ── Derived layer: secondary (slightly lighter than card) ───────
    const secondaryHsl = cardParsed ? shiftL(cardParsed, 0.05) : null;

    // ── Derived layer: muted (slightly lighter than secondary) ──────
    const mutedHsl = cardParsed ? shiftL(cardParsed, 0.08) : null;

    // ── Derived: border (between bg and card) ───────────────────────
    const borderHsl = hasBorder ? hexToHslStr(brand.border_color)
      : (bgParsed && cardParsed)
        ? shiftL(bgParsed, (cardParsed.l - bgParsed.l) * 0.6)
        : (cardParsed ? shiftL(cardParsed, 0.10) : null);

    // ── Primary ─────────────────────────────────────────────────────
    const primaryHsl = hasPrimary ? hexToHslStr(brand.primary_color) : null;

    // ── Primary foreground: white text on dark colors, dark text on light colors ──
    let primaryFgHsl = null;
    if (hasPrimary) {
      const primaryRgb = hexToRgb(brand.primary_color);
      if (primaryRgb) {
        // Relative luminance (WCAG formula)
        const toLinear = c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        const lum = 0.2126 * toLinear(primaryRgb.r) + 0.7152 * toLinear(primaryRgb.g) + 0.0722 * toLinear(primaryRgb.b);
        // Use white text on dark backgrounds, dark text on light backgrounds
        primaryFgHsl = lum < 0.35 ? '0 0% 98%' : '249 25% 10%';
      }
    }

    // ── Accent ──────────────────────────────────────────────────────
    const accentHsl = hasAccent ? hexToHslStr(brand.accent_color) : primaryHsl;

    // ── Accent foreground: same luminance logic ──────────────────────
    let accentFgHsl = null;
    if (hasAccent) {
      const accentRgb = hexToRgb(brand.accent_color);
      if (accentRgb) {
        const toLinear = c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        const lum = 0.2126 * toLinear(accentRgb.r) + 0.7152 * toLinear(accentRgb.g) + 0.0722 * toLinear(accentRgb.b);
        accentFgHsl = lum < 0.35 ? '0 0% 98%' : '249 25% 10%';
      }
    }

    // ── Sidebar background (can be independently overridden) ────────
    const sidebarBgHsl = hasSidebar ? hexToHslStr(brand.sidebar_color) : bgHsl;
    const sidebarBgParsed = sidebarBgHsl ? parseHsl(sidebarBgHsl) : bgParsed;

    // ── Sidebar accent (hover bg): slightly lighter than sidebar bg ──
    const sidebarAccentHsl = sidebarBgParsed ? shiftL(sidebarBgParsed, 0.05) : null;

    // ── Sidebar foreground text: light enough to read on dark bg ────
    // We don't override foreground — let it stay from index.css (98% light)

    // Apply everything
    applyVar('--background', bgHsl);
    applyVar('--card', cardHsl);
    applyVar('--popover', cardHsl);
    applyVar('--secondary', secondaryHsl);
    applyVar('--muted', mutedHsl);
    applyVar('--border', borderHsl);
    applyVar('--input', borderHsl);
    applyVar('--ring', primaryHsl);
    applyVar('--primary', primaryHsl);
    applyVar('--primary-foreground', primaryFgHsl);
    applyVar('--accent', accentHsl);
    applyVar('--accent-foreground', accentFgHsl);

    // Sidebar variables — this is what actually drives sidebar rendering
    applyVar('--sidebar-background', sidebarBgHsl);
    applyVar('--sidebar-primary', primaryHsl);
    applyVar('--sidebar-accent', sidebarAccentHsl);
    applyVar('--sidebar-border', borderHsl);
    applyVar('--sidebar-ring', primaryHsl);

    applyVar('--sidebar-primary-foreground', primaryFgHsl);
  }, [brand.primary_color, brand.accent_color, brand.bg_color, brand.card_color, brand.sidebar_color, brand.border_color]);

  return (
    <ThemeContext.Provider value={{ brand }}>
      {children}
    </ThemeContext.Provider>
  );
}