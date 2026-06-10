import React, { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Wand2, AlertCircle, Check, RefreshCw, ShieldCheck, ShieldAlert, ShieldX, ArrowRight, Moon, Sun, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Color math ───────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function relativeLuminance({ r, g, b }) {
  const c = v => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

function getLightness(hex) { return rgbToHsl(hexToRgb(hex)).l; }
function getSaturation(hex) { return rgbToHsl(hexToRgb(hex)).s; }

function clampLightness(hex, min, max) {
  const { h, s, l } = rgbToHsl(hexToRgb(hex));
  return hslToHex(h, s, Math.min(max, Math.max(min, l)));
}

function ensureContrast(fgHex, bgHex, minRatio = 3.5) {
  const { h, s } = rgbToHsl(hexToRgb(fgHex));
  let l = rgbToHsl(hexToRgb(fgHex)).l;
  const bgL = getLightness(bgHex);
  for (let i = 0; i < 40; i++) {
    if (contrastRatio(hslToHex(h, s, l), bgHex) >= minRatio) break;
    l = bgL < 50 ? Math.min(95, l + 2.5) : Math.max(5, l - 2.5);
  }
  return hslToHex(h, s, l);
}

// ─── Per-palette usability fix ────────────────────────────────────────────────

function fixPalette(p, mode) {
  const fixed = { ...p };
  const adj = [];

  const isDark = mode === 'dark' || mode === 'unique';
  const isLight = mode === 'light';

  // Background layering
  if (isDark) {
    ['bg_color', 'card_color', 'sidebar_color'].forEach(f => {
      if (getLightness(fixed[f]) > 25) {
        fixed[f] = clampLightness(fixed[f], 8, 22);
        adj.push(`${f} darkened`);
      }
    });
    // Enforce bg < card < sidebar step
    const bgL = getLightness(fixed.bg_color);
    const cardL = getLightness(fixed.card_color);
    if (cardL <= bgL + 1) {
      const { h, s } = rgbToHsl(hexToRgb(fixed.card_color));
      fixed.card_color = hslToHex(h, s, bgL + 4);
      adj.push('card lightened for separation');
    }
    if (getLightness(fixed.sidebar_color) >= bgL) {
      const { h, s } = rgbToHsl(hexToRgb(fixed.sidebar_color));
      fixed.sidebar_color = hslToHex(h, s, Math.max(5, bgL - 3));
      adj.push('sidebar darkened for separation');
    }
  }

  if (isLight) {
    ['bg_color', 'card_color', 'sidebar_color'].forEach(f => {
      if (getLightness(fixed[f]) < 80) {
        fixed[f] = clampLightness(fixed[f], 88, 98);
        adj.push(`${f} lightened for light mode`);
      }
    });
    const bgL = getLightness(fixed.bg_color);
    if (getLightness(fixed.card_color) <= bgL - 1) {
      const { h, s } = rgbToHsl(hexToRgb(fixed.card_color));
      fixed.card_color = hslToHex(h, s, bgL - 4);
      adj.push('card slightly darker than bg');
    }
    if (getLightness(fixed.sidebar_color) >= bgL - 1) {
      const { h, s } = rgbToHsl(hexToRgb(fixed.sidebar_color));
      fixed.sidebar_color = hslToHex(h, s, Math.min(95, bgL - 6));
      adj.push('sidebar slightly darker for light mode');
    }
  }

  // Primary: clamp saturation and lightness for comfort
  const primSat = getSaturation(fixed.primary_color);
  const primL = getLightness(fixed.primary_color);
  if (primSat > 85) {
    const { h, l } = rgbToHsl(hexToRgb(fixed.primary_color));
    fixed.primary_color = hslToHex(h, 78, l);
    adj.push('primary desaturated from neon');
  }
  const targetPrimL = isLight ? [35, 55] : [42, 68];
  if (primL < targetPrimL[0] || primL > targetPrimL[1]) {
    fixed.primary_color = clampLightness(fixed.primary_color, targetPrimL[0], targetPrimL[1]);
    adj.push(`primary lightness adjusted to ${targetPrimL[0]}–${targetPrimL[1]}%`);
  }

  // Ensure primary contrasts on bg
  const minContrast = isLight ? 4.5 : 3;
  const prOnBg = contrastRatio(fixed.primary_color, fixed.bg_color);
  if (prOnBg < minContrast) {
    fixed.primary_color = ensureContrast(fixed.primary_color, fixed.bg_color, minContrast);
    adj.push(`primary contrast boosted (was ${prOnBg.toFixed(1)}:1)`);
  }

  // Accent: distinct from primary
  if (contrastRatio(fixed.accent_color, fixed.primary_color) < 1.2) {
    const { h, s, l } = rgbToHsl(hexToRgb(fixed.primary_color));
    fixed.accent_color = hslToHex((h + 22) % 360, Math.max(s - 10, 30), Math.min(l + 10, 75));
    adj.push('accent shifted to differ from primary');
  }

  // Border
  const cardL2 = getLightness(fixed.card_color);
  const { h: bh, s: bs } = rgbToHsl(hexToRgb(fixed.card_color));
  const borderTarget = isLight ? cardL2 - 10 : cardL2 + 7;
  fixed.border_color = hslToHex(bh, Math.max(bs - 5, 0), Math.min(Math.max(borderTarget, 5), 92));

  return { fixed, adjustments: adj };
}

// ─── Audit & score ────────────────────────────────────────────────────────────

function auditPalette(p, mode) {
  const issues = [];
  const warnings = [];
  const isLight = mode === 'light';

  const bgFields = ['bg_color', 'card_color', 'sidebar_color'];
  bgFields.forEach(f => {
    const l = getLightness(p[f]);
    if (!isLight && l > 28) issues.push(`${f} too light for dark mode (${l.toFixed(0)}%)`);
    if (isLight && l < 75) issues.push(`${f} too dark for light mode (${l.toFixed(0)}%)`);
  });

  const minContrast = isLight ? 4.5 : 3;
  const prOnBg = contrastRatio(p.primary_color, p.bg_color);
  if (prOnBg < minContrast) issues.push(`Primary/BG contrast ${prOnBg.toFixed(1)}:1 (need ≥ ${minContrast}:1)`);

  if (getSaturation(p.primary_color) > 90) warnings.push('Primary is very saturated — may feel harsh');
  if (contrastRatio(p.accent_color, p.primary_color) < 1.15) warnings.push('Accent and primary look identical');

  return { issues, warnings };
}

function scoreLabel(issues, warnings) {
  const score = Math.max(0, 100 - issues.length * 25 - warnings.length * 8);
  if (score >= 90) return { label: 'Excellent', color: 'text-emerald-400', Icon: ShieldCheck };
  if (score >= 65) return { label: 'Good', color: 'text-amber-400', Icon: ShieldAlert };
  return { label: 'Needs work', color: 'text-red-400', Icon: ShieldX };
}

// ─── Mini app preview ─────────────────────────────────────────────────────────

function MiniPreview({ palette }) {
  const isLight = getLightness(palette.bg_color) > 60;
  const textColor = isLight ? '#1a1a1a' : '#f0f0f0';
  const mutedColor = isLight ? '#666' : '#aaa';

  return (
    <div className="rounded-lg overflow-hidden border border-white/10 flex h-20 text-[8px]" style={{ backgroundColor: palette.bg_color }}>
      {/* Sidebar */}
      <div className="w-12 flex flex-col p-1.5 gap-1 shrink-0" style={{ backgroundColor: palette.sidebar_color }}>
        <div className="h-2 rounded-sm w-full opacity-40" style={{ backgroundColor: textColor }} />
        {[palette.primary_color, mutedColor, mutedColor, mutedColor].map((c, i) => (
          <div key={i} className="h-1.5 rounded-sm w-3/4" style={{ backgroundColor: c, opacity: i === 0 ? 1 : 0.3 }} />
        ))}
      </div>
      {/* Main */}
      <div className="flex-1 flex flex-col gap-1 p-1.5">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="h-1.5 rounded w-1/3 opacity-40" style={{ backgroundColor: textColor }} />
          <div className="h-4 rounded px-1.5 flex items-center font-bold" style={{ backgroundColor: palette.primary_color, color: '#fff', fontSize: 6 }}>+ New</div>
        </div>
        {/* Card */}
        <div className="rounded flex-1 p-1 flex flex-col gap-0.5" style={{ backgroundColor: palette.card_color, border: `1px solid ${palette.border_color}` }}>
          <div className="h-1.5 rounded w-2/3 opacity-40" style={{ backgroundColor: textColor }} />
          <div className="h-1.5 rounded w-1/2 opacity-30" style={{ backgroundColor: textColor }} />
          <div className="h-1.5 rounded w-1/3 mt-0.5" style={{ backgroundColor: palette.accent_color, opacity: 0.7 }} />
        </div>
      </div>
    </div>
  );
}

function ContrastBadge({ ratio, label }) {
  const grade = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA lg' : 'FAIL';
  const cls = ratio >= 4.5
    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    : ratio >= 3
    ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
    : 'text-red-400 border-red-500/30 bg-red-500/10';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 border text-[10px] font-mono', cls)}>
      {label} {ratio.toFixed(1)}:1 <b>{grade}</b>
    </span>
  );
}

const THEME_META = {
  dark:   { Icon: Moon,     label: 'Dark Theme',   hint: 'Logo-inspired · Dark background · Easy on the eyes' },
  light:  { Icon: Sun,      label: 'Light Theme',  hint: 'Logo-inspired · Clean white background · Professional' },
  unique: { Icon: Sparkles, label: 'Unique Theme',  hint: 'Logo-inspired · Creative palette · Polished & distinct' },
};

function PaletteCard({ palette, mode, selected, onSelect }) {
  const { issues, warnings } = auditPalette(palette, mode);
  const { label: scoreText, color: scoreColor, Icon: ScoreIcon } = scoreLabel(issues, warnings);
  const { Icon: ThemeIcon, label: themeLabel, hint } = THEME_META[mode];

  const swatches = [
    { key: 'bg_color', label: 'BG' },
    { key: 'sidebar_color', label: 'Sidebar' },
    { key: 'card_color', label: 'Card' },
    { key: 'border_color', label: 'Border' },
    { key: 'primary_color', label: 'Primary' },
    { key: 'accent_color', label: 'Accent' },
  ];

  return (
    <div
      className={cn(
        'border-2 rounded-xl p-4 cursor-pointer transition-all',
        selected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-muted-foreground/40'
      )}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ThemeIcon className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">{themeLabel}</span>
          <span className={cn('flex items-center gap-1 text-xs', scoreColor)}>
            <ScoreIcon className="w-3 h-3" />{scoreText}
          </span>
        </div>
        {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
      </div>
      <p className="text-xs text-muted-foreground mb-3">{hint}</p>

      {/* Preview + swatches row */}
      <div className="flex gap-3 mb-3">
        <div className="w-44 shrink-0">
          <MiniPreview palette={palette} />
        </div>
        <div className="flex flex-wrap gap-2 content-start">
          {swatches.map(({ key, label }) => (
            <div key={key} className="flex flex-col items-center gap-0.5">
              <div className="w-7 h-7 rounded border border-white/20 shadow" style={{ backgroundColor: palette[key] }} />
              <span className="text-[9px] text-muted-foreground">{label}</span>
              <span className="text-[9px] font-mono text-muted-foreground/60">{palette[key]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Contrast badges */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        <ContrastBadge ratio={contrastRatio(palette.primary_color, palette.bg_color)} label="Primary/BG" />
        <ContrastBadge ratio={contrastRatio(palette.primary_color, palette.card_color)} label="Primary/Card" />
        <ContrastBadge ratio={contrastRatio('#ffffff', palette.primary_color)} label="Text/Button" />
      </div>

      {/* Raw → adjusted */}
      {palette.raw_primary && palette.raw_primary !== palette.primary_color && (
        <div className="flex items-center gap-2 p-2 rounded bg-muted/30 border border-border text-xs mb-2">
          <span className="text-muted-foreground">Logo color:</span>
          <div className="w-4 h-4 rounded border border-white/20" style={{ backgroundColor: palette.raw_primary }} />
          <span className="font-mono text-muted-foreground/70">{palette.raw_primary}</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">Adjusted:</span>
          <div className="w-4 h-4 rounded border border-white/20" style={{ backgroundColor: palette.primary_color }} />
          <span className="font-mono text-muted-foreground/70">{palette.primary_color}</span>
        </div>
      )}

      {/* Adjustments */}
      {palette.adjustments?.length > 0 && (
        <div className="p-2 rounded bg-primary/5 border border-primary/20 text-xs text-muted-foreground mb-2">
          <span className="text-primary font-medium">Auto-adjusted: </span>{palette.adjustments.join(' · ')}
        </div>
      )}

      {/* Issues & warnings */}
      {issues.map((msg, i) => (
        <div key={i} className="flex items-start gap-1.5 text-xs text-red-400 mt-1">
          <ShieldX className="w-3 h-3 mt-0.5 shrink-0" />{msg}
        </div>
      ))}
      {warnings.map((msg, i) => (
        <div key={i} className="flex items-start gap-1.5 text-xs text-amber-400/80 mt-1">
          <ShieldAlert className="w-3 h-3 mt-0.5 shrink-0" />{msg}
        </div>
      ))}

      {palette.rationale && (
        <p className="text-xs text-muted-foreground mt-2 italic">{palette.rationale}</p>
      )}
    </div>
  );
}

// ─── Extracted logo color swatches ───────────────────────────────────────────

function LogoColorsRow({ colors }) {
  if (!colors?.length) return null;
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
      <span className="text-xs text-muted-foreground shrink-0">Detected logo colors:</span>
      <div className="flex gap-2 flex-wrap">
        {colors.map((c, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div className="w-6 h-6 rounded border border-white/20 shadow" style={{ backgroundColor: c }} />
            <span className="text-[9px] font-mono text-muted-foreground/70">{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function AutoBrandModal({ open, onClose, onApply, logoUrl }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [themes, setThemes] = useState(null); // { dark, light, unique }
  const [logoColors, setLogoColors] = useState([]);
  const [selected, setSelected] = useState('dark');

  // Auto-analyze when modal opens and logoUrl is available
  useEffect(() => {
    if (open && logoUrl && !themes && !loading) {
      handleAnalyze();
    }
  }, [open, logoUrl]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    setThemes(null);
    setLogoColors([]);

    try {
      const result = await db.integrations.Core.InvokeLLM({
        prompt: `You are an expert UI/UX color designer specializing in branded app themes.

Analyze this company logo image carefully. Your goal is to extract the brand colors and generate 3 distinct app themes that feel on-brand while being fully usable and readable.

STEP 1 — COLOR EXTRACTION
Identify the dominant and accent colors in the logo. List them as raw hex values. Include:
- Primary brand color (most prominent non-white/black color)
- Secondary / accent color (if present)
- Any additional key colors

STEP 2 — GENERATE 3 THEMES

Theme 1: "dark" — Dark UI, logo-inspired
- bg_color: very dark, e.g. near-black with a faint brand hue tint (lightness 8–16%)
- sidebar_color: slightly darker than bg (lightness 5–13%)  
- card_color: slightly lighter than bg (lightness 13–22%)
- border_color: subtle step above card (lightness card+5 to card+10%)
- primary_color: the main brand color adapted for dark backgrounds — lightness 42–68%, saturation 55–80%
- accent_color: a complementary brand-inspired hue, lightness 45–72%
- login_background_color: deep dark version of primary hue, lightness 6–12%

Theme 2: "light" — Light UI, logo-inspired  
- bg_color: near-white with faint brand tint (lightness 94–98%)
- sidebar_color: slightly darker than bg (lightness 88–94%)
- card_color: pure or near-white (lightness 97–100%)
- border_color: very light gray-tinted (lightness 85–92%)
- primary_color: brand color adapted for light backgrounds — darker, lightness 30–55%, saturation 55–80%
- accent_color: slightly lighter/shifted from primary, lightness 35–60%
- login_background_color: light tint of the brand hue (lightness 92–96%)

Theme 3: "unique" — Creative, distinct, polished
- Use the brand's secondary/accent color as the PRIMARY for a fresh angle
- Or use a split-complementary palette inspired by the logo
- Dark background preferred but can be deep-jewel-toned (e.g., deep teal, plum, ink blue)
- bg_color: distinctive dark (lightness 8–20%) — can have more color personality than theme 1
- sidebar_color: darker variant (lightness 5–16%)
- card_color: slightly lighter (lightness 14–24%)  
- border_color: subtle step above card
- primary_color: creative brand-inspired color, lightness 42–68%, saturation 55–85%
- accent_color: complementary pop color
- login_background_color: deep creative bg color

HARD RULES (all themes):
- All hex values: 6-digit, # prefix
- Do NOT use pure black (#000000) or pure white (#ffffff)
- primary_color MUST contrast ≥ 3:1 against bg_color
- white text on primary_color MUST be ≥ 3:1
- Include "raw_primary": the exact logo color before any adjustments
- Include "rationale": 1-2 sentences on design intent and any adjustments made

Return JSON only, no markdown:
{
  "logo_colors": ["#hex1", "#hex2", "#hex3"],
  "dark": {
    "raw_primary": "#hex",
    "primary_color": "#hex",
    "accent_color": "#hex",
    "bg_color": "#hex",
    "card_color": "#hex",
    "sidebar_color": "#hex",
    "border_color": "#hex",
    "login_background_color": "#hex",
    "rationale": "..."
  },
  "light": { "raw_primary": "#hex", "primary_color": "#hex", "accent_color": "#hex", "bg_color": "#hex", "card_color": "#hex", "sidebar_color": "#hex", "border_color": "#hex", "login_background_color": "#hex", "rationale": "..." },
  "unique": { "raw_primary": "#hex", "primary_color": "#hex", "accent_color": "#hex", "bg_color": "#hex", "card_color": "#hex", "sidebar_color": "#hex", "border_color": "#hex", "login_background_color": "#hex", "rationale": "..." }
}`,
        file_urls: [logoUrl],
        response_json_schema: {
          type: 'object',
          properties: {
            logo_colors: { type: 'array', items: { type: 'string' } },
            dark: { type: 'object' },
            light: { type: 'object' },
            unique: { type: 'object' },
          },
        },
      });

      if (!result?.dark) {
        setError('Could not extract colors from the logo. Try a cleaner logo image.');
        return;
      }

      if (result.logo_colors?.length) setLogoColors(result.logo_colors);

      // Client-side safety fix pass
      const fixed = {};
      for (const mode of ['dark', 'light', 'unique']) {
        const raw = result[mode] || {};
        const { fixed: f, adjustments } = fixPalette(raw, mode);
        fixed[mode] = { ...f, raw_primary: raw.raw_primary, adjustments, rationale: raw.rationale };
      }
      setThemes(fixed);
      setSelected('dark');
    } catch (err) {
      setError('Failed to analyze the logo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    const palette = themes?.[selected];
    if (!palette) return;
    onApply({
      primary_color: palette.primary_color,
      accent_color: palette.accent_color,
      bg_color: palette.bg_color,
      card_color: palette.card_color,
      sidebar_color: palette.sidebar_color,
      border_color: palette.border_color,
      ...(palette.login_background_color ? { login_background_color: palette.login_background_color } : {}),
    });
    onClose();
  };

  const handleClose = () => {
    setError('');
    setThemes(null);
    setLogoColors([]);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" /> Auto Brand from Logo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Logo preview */}
          {logoUrl && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border border-border">
              <img src={logoUrl} alt="Logo" className="h-12 max-w-40 object-contain" />
              <div>
                <p className="text-sm font-medium">Analyzing your logo</p>
                <p className="text-xs text-muted-foreground">Extracting brand colors and generating 3 theme options</p>
              </div>
              {!loading && themes && (
                <Button variant="outline" size="sm" onClick={handleAnalyze} className="ml-auto shrink-0">
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Regenerate
                </Button>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
              <Button variant="ghost" size="sm" onClick={handleAnalyze} className="ml-auto shrink-0">Retry</Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <p className="text-sm">Extracting logo colors…</p>
              <p className="text-xs">Generating Dark, Light & Unique themes</p>
              <p className="text-xs opacity-50">This takes 10–20 seconds</p>
            </div>
          )}

          {themes && !loading && (
            <div className="space-y-4">
              <LogoColorsRow colors={logoColors} />

              <Label>Choose your theme:</Label>

              <div className="space-y-3">
                {['dark', 'light', 'unique'].map(mode => (
                  <PaletteCard
                    key={mode}
                    palette={themes[mode]}
                    mode={mode}
                    selected={selected === mode}
                    onSelect={() => setSelected(mode)}
                  />
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Colors will populate the form fields — you can fine-tune before saving.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          {themes && !loading && (
            <Button onClick={handleApply}>
              <Check className="w-4 h-4 mr-1.5" /> Apply Theme
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}