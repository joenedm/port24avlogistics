import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronRight, ChevronLeft, CheckCircle2, Plus, Trash2, Info, Package, ArrowLeft, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';

// ── Calibration scenario definitions ─────────────────────────────────────────
// Each scenario teaches the AI what we would pull for a given production need
export const CALIBRATION_SCENARIOS = [
  // AUDIO
  { key: 'audio_speech_small',    label: 'Speech Reinforcement — Small Room (<50 pax)',  category: 'audio', quality: 'basic',    description: 'Simple PA for speech in a small room. What mic and speaker combo would you deploy?' },
  { key: 'audio_speech_medium',   label: 'Speech Reinforcement — Medium Room (50–150)',   category: 'audio', quality: 'standard', description: 'Standard PA package for a medium general session or breakout. What is your go-to rig?' },
  { key: 'audio_speech_large',    label: 'Speech Reinforcement — Large Room (150+)',      category: 'audio', quality: 'premium',  description: 'Full PA for a large general session. What is your full-production audio rig?' },
  { key: 'audio_handheld_pkg',    label: 'Wireless Handheld Mic Package',                 category: 'audio', quality: 'standard', description: 'Handheld wireless mics for presenters. What units do you use?' },
  { key: 'audio_lav_pkg',         label: 'Wireless Lavalier Package',                     category: 'audio', quality: 'standard', description: 'Lav/clip-on wireless mics. What is your preferred lav package?' },
  { key: 'audio_panel_discussion',label: 'Panel Discussion Mic Setup',                    category: 'audio', quality: 'standard', description: 'Multi-speaker panel table setup. Mics, DI, table setup — what do you use?' },
  { key: 'audio_mixer_basic',     label: 'Mixing Console — Basic',                        category: 'audio', quality: 'basic',    description: 'Small mixer for a basic show. What desk do you use for simple setups?' },
  { key: 'audio_mixer_standard',  label: 'Mixing Console — Standard',                     category: 'audio', quality: 'standard', description: 'Standard digital console for a full show.' },
  { key: 'audio_stage_monitors',  label: 'Stage Monitors / IEM',                          category: 'audio', quality: 'standard', description: 'On-stage monitoring for presenters or performers.' },
  // VIDEO
  { key: 'video_display_basic',   label: 'Presentation Display — Basic (1–2 screens)',    category: 'video', quality: 'basic',    description: 'Basic flat panel or monitor for slides. What would you use for a simple breakout?' },
  { key: 'video_display_standard',label: 'Presentation Display — Standard',                category: 'video', quality: 'standard', description: 'Multiple displays for a general session or conference room.' },
  { key: 'video_projector_basic', label: 'Projector Package — Basic',                      category: 'video', quality: 'basic',    description: 'Entry-level projector setup. What do you use for small rooms?' },
  { key: 'video_projector_std',   label: 'Projector Package — Standard',                   category: 'video', quality: 'standard', description: 'Standard throw projector for a general session.' },
  { key: 'video_projector_prem',  label: 'Projector Package — Premium',                    category: 'video', quality: 'premium',  description: 'High-lumen premium projector for large or bright spaces.' },
  { key: 'video_confidence_mon',  label: 'Confidence Monitor / DSM',                       category: 'video', quality: 'standard', description: 'Stage-facing confidence monitor for presenters. What do you use?' },
  { key: 'video_switcher_basic',  label: 'Video Switcher — Basic',                         category: 'video', quality: 'basic',    description: 'Simple switcher or scaler for source switching.' },
  { key: 'video_switcher_full',   label: 'Video Switcher — Full Production',                category: 'video', quality: 'premium',  description: 'Full production switcher for live show video.' },
  { key: 'video_camera_pkg',      label: 'Camera Package — Recording / IMAG',              category: 'video', quality: 'standard', description: 'Cameras for recording or IMAG. What cameras do you own?' },
  // LIGHTING
  { key: 'lighting_wash_basic',   label: 'Stage Wash — Basic',                             category: 'lighting', quality: 'basic',    description: 'Basic stage wash lighting. Pars or simple LEDs for presenter coverage.' },
  { key: 'lighting_wash_std',     label: 'Stage Wash — Standard',                          category: 'lighting', quality: 'standard', description: 'Standard stage lighting with good presenter key and fill.' },
  { key: 'lighting_moving_lights',label: 'Moving Lights Package',                           category: 'lighting', quality: 'premium',  description: 'Moving heads for effects and atmosphere. What movers do you own?' },
  { key: 'lighting_audience',     label: 'Audience Wash / House Lighting',                 category: 'lighting', quality: 'standard', description: 'Audience area lighting or house wash.' },
  { key: 'lighting_uplighting',   label: 'Uplighting / Décor Lighting',                    category: 'lighting', quality: 'standard', description: 'Uplights for room décor or scenic elements.' },
  { key: 'lighting_console',      label: 'Lighting Console / DMX Control',                  category: 'lighting', quality: 'standard', description: 'DMX controller or lighting console for show control.' },
  // GENERAL PACKAGES
  { key: 'pkg_breakout_basic',    label: 'Complete Breakout Room — Basic',                  category: 'general', quality: 'basic',    description: 'Everything you would put in a basic breakout room: display, basic audio, no lighting.' },
  { key: 'pkg_breakout_std',      label: 'Complete Breakout Room — Standard',               category: 'general', quality: 'standard', description: 'Full standard breakout room package with display, mics, basic audio.' },
  { key: 'pkg_general_session',   label: 'General Session — Standard',                      category: 'general', quality: 'standard', description: 'Full general session rig: PA, mics, projector, screen, lighting, confidence mon.' },
  { key: 'pkg_general_premium',   label: 'General Session — Premium',                       category: 'general', quality: 'premium',  description: 'Premium general session with full lighting, redundancy, premium audio and video.' },
  { key: 'pkg_awards',            label: 'Awards / Gala Package',                           category: 'general', quality: 'premium',  description: 'Full awards show: theatrical lighting, full PA, cameras, screens, stage.' },
];

const CATEGORY_LABELS = { audio: 'Audio', video: 'Video', lighting: 'Lighting', general: 'General Packages' };
const CATEGORY_ORDER = ['audio', 'video', 'lighting', 'general'];
const QUALITY_COLORS = {
  basic:    'bg-slate-500/10 text-slate-500 border-slate-500/20',
  standard: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  premium:  'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

// ── Asset picker inline search ────────────────────────────────────────────────
function AssetPicker({ assets, kits, onSelect, placeholder = 'Search inventory…' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const assetMatches = assets
      .filter(a => a.name.toLowerCase().includes(q) || (a.category || '').toLowerCase().includes(q))
      .slice(0, 12)
      .map(a => ({ type: 'asset', id: a.id, name: a.name, category: a.category, daily_rate: a.daily_rate }));
    const kitMatches = kits
      .filter(k => k.name.toLowerCase().includes(q))
      .slice(0, 4)
      .map(k => ({ type: 'kit', id: k.id, name: k.name, category: 'Kit', daily_rate: k.daily_rate }));
    return [...assetMatches, ...kitMatches];
  }, [query, assets, kits]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="pl-8 h-8 text-sm"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {filtered.map(item => (
            <button
              key={item.id}
              onMouseDown={() => { onSelect(item); setQuery(''); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between gap-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                {item.type === 'kit' && <Package className="w-3.5 h-3.5 text-primary shrink-0" />}
                <span className="truncate font-medium">{item.name}</span>
                <Badge variant="outline" className="text-xs shrink-0">{item.category || 'Misc'}</Badge>
              </div>
              {item.daily_rate > 0 && <span className="text-xs text-muted-foreground shrink-0">{fmt(item.daily_rate)}/day</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Single scenario editor card ───────────────────────────────────────────────
function ScenarioCard({ scenario, calibration, assets, kits, onSave, saving }) {
  const existing = calibration || {
    scenario_key: scenario.key,
    scenario_label: scenario.label,
    category: scenario.category,
    quality_level: scenario.quality,
    description: scenario.description,
    preferred_items: [],
    alternate_items: [],
    roundtable_note: '',
    notes: '',
    is_active: true,
  };

  const [preferred, setPreferred] = useState(existing.preferred_items || []);
  const [alternates, setAlternates] = useState(existing.alternate_items || []);
  const [roundtableNote, setRoundtableNote] = useState(existing.roundtable_note || '');
  const [notes, setNotes] = useState(existing.notes || '');
  const [dirty, setDirty] = useState(false);

  const addItem = (list, setList, item) => {
    if (list.find(i => i.asset_id === item.id)) return;
    setList(prev => [...prev, { asset_id: item.id, asset_name: item.name, category: item.category, daily_rate: item.daily_rate, quantity: 1, notes: '' }]);
    setDirty(true);
  };
  const removeItem = (list, setList, idx) => { setList(prev => prev.filter((_, i) => i !== idx)); setDirty(true); };

  const handleSave = () => {
    onSave({
      ...existing,
      preferred_items: preferred,
      alternate_items: alternates,
      roundtable_note: roundtableNote,
      notes,
      is_active: true,
    });
    setDirty(false);
  };

  const isConfigured = preferred.length > 0;

  return (
    <Card className={`border transition-colors ${isConfigured ? 'border-primary/20 bg-primary/3' : 'border-border'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <CardTitle className="text-sm">{scenario.label}</CardTitle>
              <Badge className={`text-xs border capitalize ${QUALITY_COLORS[scenario.quality]}`}>{scenario.quality}</Badge>
              {isConfigured && <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" />Calibrated</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">{scenario.description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preferred items */}
        <div>
          <Label className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Preferred Owned Items (in priority order)</Label>
          <p className="text-xs text-muted-foreground mb-2">What owned gear would you pull first for this scenario?</p>
          {preferred.map((item, i) => (
            <div key={i} className="flex items-center gap-2 mb-1.5 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-sm">
              <span className="text-xs text-emerald-700 font-bold w-5 shrink-0">#{i + 1}</span>
              <span className="flex-1 truncate font-medium">{item.asset_name}</span>
              <Badge variant="outline" className="text-xs">{item.category}</Badge>
              {item.daily_rate > 0 && <span className="text-xs text-muted-foreground">{fmt(item.daily_rate)}/day</span>}
              <button onClick={() => removeItem(preferred, setPreferred, i)} className="text-muted-foreground hover:text-destructive shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <AssetPicker assets={assets} kits={kits} onSelect={item => addItem(preferred, setPreferred, item)} placeholder="Add preferred item…" />
        </div>

        {/* Alternate items */}
        <div>
          <Label className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Acceptable Alternates (substitutes if preferred unavailable)</Label>
          <p className="text-xs text-muted-foreground mb-2">What would you use as a second-choice substitute?</p>
          {alternates.map((item, i) => (
            <div key={i} className="flex items-center gap-2 mb-1.5 p-2 rounded-lg bg-blue-500/5 border border-blue-500/10 text-sm">
              <span className="text-xs text-blue-600 font-bold w-5 shrink-0">Alt</span>
              <span className="flex-1 truncate font-medium">{item.asset_name}</span>
              <Badge variant="outline" className="text-xs">{item.category}</Badge>
              {item.daily_rate > 0 && <span className="text-xs text-muted-foreground">{fmt(item.daily_rate)}/day</span>}
              <button onClick={() => removeItem(alternates, setAlternates, i)} className="text-muted-foreground hover:text-destructive shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <AssetPicker assets={assets} kits={kits} onSelect={item => addItem(alternates, setAlternates, item)} placeholder="Add alternate item…" />
        </div>

        {/* Roundtable fallback */}
        <div>
          <Label className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Roundtable Fallback Note</Label>
          <Input
            value={roundtableNote}
            onChange={e => { setRoundtableNote(e.target.value); setDirty(true); }}
            placeholder="e.g. Partner AV Co can provide this, or 'Any Roundtable audio partner'"
            className="h-8 text-sm mt-1"
          />
        </div>

        {/* Extra notes for AI */}
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes for the AI</Label>
          <Textarea
            value={notes}
            onChange={e => { setNotes(e.target.value); setDirty(true); }}
            placeholder="Any extra context — e.g. 'we never use X for outdoor', 'always add a DI with this setup', etc."
            rows={2}
            className="text-sm mt-1"
          />
        </div>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || (!dirty && isConfigured)}
          className="w-full"
          variant={dirty ? 'default' : 'outline'}
        >
          {saving ? 'Saving…' : isConfigured && !dirty ? '✓ Saved' : 'Save Calibration'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FulfillmentCalibrationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState('audio');
  const [savingKey, setSavingKey] = useState(null);

  const { data: assets = [] } = useQuery({
    queryKey: ['assets_cal'],
    queryFn: () => base44.entities.Asset.filter({ status: 'available' }, '-updated_date', 500),
  });
  const { data: kits = [] } = useQuery({
    queryKey: ['kits_cal'],
    queryFn: () => base44.entities.Kit.list('-created_date', 100),
  });
  const { data: calibrations = [] } = useQuery({
    queryKey: ['fulfillment_calibrations'],
    queryFn: () => base44.entities.FulfillmentCalibration.list(),
  });

  const availableAssets = assets.filter(a => !a.is_lost && a.item_type !== 'consumable');

  const calibrationMap = useMemo(() => {
    const map = {};
    calibrations.forEach(c => { map[c.scenario_key] = c; });
    return map;
  }, [calibrations]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const existing = calibrationMap[data.scenario_key];
      if (existing?.id) {
        return base44.entities.FulfillmentCalibration.update(existing.id, data);
      }
      return base44.entities.FulfillmentCalibration.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fulfillment_calibrations'] });
      toast.success('Calibration saved');
    },
    onError: () => toast.error('Failed to save'),
    onSettled: () => setSavingKey(null),
  });

  const handleSave = (scenarioKey, data) => {
    setSavingKey(scenarioKey);
    saveMutation.mutate(data);
  };

  const scenariosInCategory = CALIBRATION_SCENARIOS.filter(s => s.category === activeCategory);
  const calibratedCount = CALIBRATION_SCENARIOS.filter(s => calibrationMap[s.key]?.preferred_items?.length > 0).length;
  const totalCount = CALIBRATION_SCENARIOS.length;

  return (
    <div>
      <PageHeader
        title="AI Fulfillment Calibration"
        description="Teach the AI which owned inventory to use for different production scenarios"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/smart-builder')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Builder
            </Button>
          </div>
        }
      />

      {/* Progress bar */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Calibration Progress</span>
            </div>
            <span className="text-sm font-mono text-primary">{calibratedCount} / {totalCount} scenarios configured</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(calibratedCount / totalCount) * 100}%` }}
            />
          </div>
          {calibratedCount === 0 && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> Configure at least a few scenarios below — the AI will use these exact inventory choices when building shows.
            </p>
          )}
          {calibratedCount >= totalCount * 0.5 && calibratedCount < totalCount && (
            <p className="text-xs text-emerald-600 mt-2">Good progress! The AI will now prefer your mapped inventory for calibrated scenarios.</p>
          )}
          {calibratedCount === totalCount && (
            <p className="text-xs text-emerald-600 mt-2 font-medium">✓ Fully calibrated — the AI will use your preferred inventory for all scenarios.</p>
          )}
        </CardContent>
      </Card>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORY_ORDER.map(cat => {
          const scenarios = CALIBRATION_SCENARIOS.filter(s => s.category === cat);
          const done = scenarios.filter(s => calibrationMap[s.key]?.preferred_items?.length > 0).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all flex items-center gap-2 ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              {CATEGORY_LABELS[cat]}
              <Badge variant={activeCategory === cat ? 'secondary' : 'outline'} className="text-xs">
                {done}/{scenarios.length}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Scenario cards */}
      <div className="space-y-4">
        {scenariosInCategory.map(scenario => (
          <ScenarioCard
            key={scenario.key}
            scenario={scenario}
            calibration={calibrationMap[scenario.key]}
            assets={availableAssets}
            kits={kits}
            onSave={(data) => handleSave(scenario.key, data)}
            saving={savingKey === scenario.key}
          />
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="mt-8 flex justify-center">
        <Button size="lg" onClick={() => navigate('/smart-builder')} className="gap-2">
          <Sparkles className="w-4 h-4" />
          Go Build a Project with Calibrated AI
        </Button>
      </div>
    </div>
  );
}