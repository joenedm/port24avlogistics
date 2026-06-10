import React, { useState } from 'react';
import { Sparkles, ChevronRight, ChevronLeft, AlertCircle, CheckCircle2, Building2, LayoutGrid, Star, Heart, Radio, Users, MessageSquare } from 'lucide-react';

const ARCHETYPE_ICONS = { Building2, LayoutGrid, Star, Heart, Radio, Users };
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ARCHETYPES } from '@/lib/smartBuildRules';

const SHOW_TYPES = [
  'Corporate Conference', 'Awards Ceremony', 'Concert / Live Music', 'Wedding',
  'Product Launch', 'Trade Show', 'Town Hall', 'Gala / Fundraiser',
  'Graduation', 'Sporting Event', 'Political Event', 'Other',
];
const VENUE_TYPES = [
  'Hotel Ballroom', 'Convention Center', 'Theater / Auditorium', 'Outdoor Tent',
  'Open Air / Festival', 'Warehouse / Industrial', 'Club / Nightclub',
  'House of Worship', 'Stadium / Arena', 'Other',
];
const NEED_LEVELS = ['None', 'Basic', 'Standard', 'Full Production'];
const STREAMING_OPTIONS = ['None', 'Recording Only', 'Live Stream', 'Recording + Live Stream', 'Broadcast Quality'];

const DEFAULT_FORM = {
  show_name: '',
  show_type: '',
  venue_type: '',
  indoor_outdoor: 'Indoor',
  audience_size: '',
  room_count: '1',
  show_days: '1',
  budget_target: '',
  quality_level: 'standard',
  audio_needs: 'Standard',
  video_needs: 'Standard',
  lighting_needs: 'Basic',
  streaming_needs: 'None',
  screens_needed: 'Yes',
  complexity: 'moderate',
  service_level: 'full_service',
  notes: '',
  // Smart follow-up fields
  has_led_wall: '',
  display_count: '',
  display_size: '',
  confidence_monitor: '',
  presenter_count: '',
  mic_types: '',
  pa_need: '',
  audience_coverage: '',
  stage_lighting: '',
  moving_lights: '',
  room_setup_type: '',
  crew_needs: '',
};

const STEP_REQUIRED = {
  1: ['show_type', 'audience_size', 'room_count'],
  2: [],
  3: [],
  4: [],
};

// ── Derive which follow-up questions to show based on form values ─────────────
function getFollowUpQuestions(form) {
  const questions = [];
  const aud = parseInt(form.audience_size) || 0;
  const hasVideo = form.video_needs !== 'None';
  const hasAudio = form.audio_needs !== 'None';
  const hasLighting = form.lighting_needs !== 'None';
  const isFullService = form.service_level !== 'dry_hire';

  // Display / Video questions
  if (hasVideo) {
    questions.push({
      key: 'has_led_wall',
      label: 'Will there be an LED wall?',
      type: 'select',
      options: ['No', 'Yes — small (up to 10ft wide)', 'Yes — medium (10–20ft wide)', 'Yes — large (20ft+ wide)'],
    });
    questions.push({
      key: 'display_count',
      label: 'How many displays / monitors are needed?',
      type: 'select',
      options: ['1–2', '3–4', '5–8', '9+'],
    });
    if (form.video_needs !== 'Basic') {
      questions.push({
        key: 'confidence_monitor',
        label: 'Is a confidence monitor or teleprompter needed on stage?',
        type: 'select',
        options: ['No', 'Yes — confidence monitor only', 'Yes — teleprompter', 'Yes — both'],
      });
    }
  }

  // Audio questions
  if (hasAudio) {
    questions.push({
      key: 'presenter_count',
      label: 'How many presenters / speakers will be on stage?',
      type: 'select',
      options: ['1', '2–3', '4–6', '7+', 'Panel discussion (multiple simultaneous)'],
    });
    questions.push({
      key: 'mic_types',
      label: 'What mic types are needed?',
      type: 'select',
      options: [
        'Handheld only',
        'Lavalier (clip-on) only',
        'Podium mic only',
        'Handheld + Lavalier mix',
        'Full mix (handheld, lav, podium, Q&A)',
      ],
    });
    if (aud > 50 || form.audio_needs === 'Full Production' || form.audio_needs === 'Standard') {
      questions.push({
        key: 'pa_need',
        label: 'What level of PA / sound reinforcement is needed?',
        type: 'select',
        options: [
          'Speech reinforcement only — small/intimate room',
          'Standard PA — clear coverage for seated audience',
          'Full PA with subs — large room or high-energy content',
          'Playback / music reinforcement needed (band, DJ, or heavy music playback)',
        ],
      });
    }
  }

  // Lighting questions
  if (hasLighting) {
    questions.push({
      key: 'stage_lighting',
      label: 'What stage lighting is needed?',
      type: 'select',
      options: [
        'Basic wash only — presenters lit, nothing fancy',
        'Standard stage lighting — focused looks for stage areas',
        'Full production — programming, effects, specials',
      ],
    });
    if (form.lighting_needs !== 'Basic') {
      questions.push({
        key: 'moving_lights',
        label: 'Are moving lights or theatrical effects needed?',
        type: 'select',
        options: ['No — static fixtures only', 'Yes — a few movers for looks', 'Yes — full moving light package'],
      });
    }
  }

  // Room setup
  questions.push({
    key: 'room_setup_type',
    label: 'What is the room setup / seating style?',
    type: 'select',
    options: [
      'Theater / auditorium style',
      'Classroom / schoolroom style',
      'Banquet / rounds',
      'Cocktail / standing',
      'U-shape / boardroom',
      'Mixed / varies by space',
    ],
  });

  // Crew questions (only for service shows)
  if (isFullService) {
    questions.push({
      key: 'crew_needs',
      label: 'What crew support is expected?',
      type: 'select',
      options: [
        'Full crew — we run everything soup to nuts',
        'Partial — client has some staff, we supplement',
        'Setup / strike only — client runs the show live',
        'Operators only — no setup/strike crew needed',
      ],
    });
  }

  return questions;
}

function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => i + 1).map(step => (
        <React.Fragment key={step}>
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold border-2 transition-all ${
            step < current ? 'bg-primary border-primary text-primary-foreground' :
            step === current ? 'border-primary text-primary' :
            'border-border text-muted-foreground'
          }`}>
            {step < current ? <CheckCircle2 className="w-4 h-4" /> : step}
          </div>
          {step < total && <div className={`h-0.5 flex-1 ${step < current ? 'bg-primary' : 'bg-border'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function MissingFields({ form, required }) {
  const labels = { show_type: 'Show Type', audience_size: 'Audience Size', room_count: 'Number of Rooms', budget_target: 'Budget Target', venue_type: 'Venue Type' };
  const missing = required.filter(f => !form[f]);
  if (!missing.length) return null;
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-600">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>Required before continuing: <strong>{missing.map(f => labels[f] || f).join(', ')}</strong></span>
    </div>
  );
}

export default function BuilderInputForm({ onGenerate, generating, error }) {
  const [step, setStep] = useState(0); // 0=archetype, 1=core, 2=tech, 3=followup, 4=build level
  const [form, setForm] = useState(DEFAULT_FORM);

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const applyArchetype = (archetype) => {
    setForm(prev => ({ ...prev, ...archetype.defaults }));
    setStep(1);
  };

  const canAdvance = (s) => STEP_REQUIRED[s]?.every(f => !!form[f]) ?? true;

  const handleSubmit = () => {
    if (!form.show_type || !form.audience_size) return;
    onGenerate(form);
  };

  const followUpQuestions = getFollowUpQuestions(form);

  // ── Step 0: Archetype picker ──────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-1">Start with a template or build from scratch</h2>
          <p className="text-sm text-muted-foreground">Pick an archetype to pre-fill common settings, or start fresh.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ARCHETYPES.map(arch => (
            <button
              key={arch.id}
              onClick={() => applyArchetype(arch)}
              className="text-left p-4 rounded-xl border border-border bg-card hover:border-primary/60 hover:bg-primary/5 transition-all group"
            >
              <div className="mb-2 text-muted-foreground group-hover:text-primary transition-colors">
                {(() => { const Icon = ARCHETYPE_ICONS[arch.icon]; return Icon ? <Icon className="w-5 h-5" /> : null; })()}
              </div>
              <div className="font-semibold text-sm group-hover:text-primary">{arch.label}</div>
              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{arch.description}</div>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setStep(1)}>
            Start from Scratch <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Step 1: Core required inputs ──────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="space-y-5">
        <StepIndicator current={1} total={4} />
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Step 1 — Core Show Details</CardTitle>
            <CardDescription>These are required to generate any draft.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Show / Event Name</Label>
              <Input value={form.show_name} onChange={e => set('show_name', e.target.value)} placeholder="e.g. TechCorp Annual Summit 2026" />
            </div>
            <div>
              <Label>Show Type <span className="text-destructive">*</span></Label>
              <Select value={form.show_type} onValueChange={v => set('show_type', v)}>
                <SelectTrigger className={!form.show_type ? 'border-amber-500/60' : ''}>
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  {SHOW_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Venue Type</Label>
              <Select value={form.venue_type} onValueChange={v => set('venue_type', v)}>
                <SelectTrigger><SelectValue placeholder="Select venue…" /></SelectTrigger>
                <SelectContent>
                  {VENUE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Indoor / Outdoor</Label>
              <Select value={form.indoor_outdoor} onValueChange={v => set('indoor_outdoor', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Indoor">Indoor</SelectItem>
                  <SelectItem value="Outdoor">Outdoor</SelectItem>
                  <SelectItem value="Both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Audience Size <span className="text-destructive">*</span></Label>
              <Input
                type="number" min="1"
                value={form.audience_size}
                onChange={e => set('audience_size', e.target.value)}
                placeholder="e.g. 300"
                className={!form.audience_size ? 'border-amber-500/60' : ''}
              />
            </div>
            <div>
              <Label>Number of Rooms / Areas <span className="text-destructive">*</span></Label>
              <Input
                type="number" min="1" max="10"
                value={form.room_count}
                onChange={e => set('room_count', e.target.value)}
                className={!form.room_count ? 'border-amber-500/60' : ''}
              />
            </div>
            <div>
              <Label>Budget Target ($)</Label>
              <Input
                type="number" min="0"
                value={form.budget_target}
                onChange={e => set('budget_target', e.target.value)}
                placeholder="e.g. 15000"
              />
            </div>
            <div>
              <Label>Number of Show Days</Label>
              <Input
                type="number" min="1" max="14"
                value={form.show_days}
                onChange={e => set('show_days', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
        <MissingFields form={form} required={['show_type', 'audience_size', 'room_count']} />
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(0)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button onClick={() => setStep(2)} disabled={!canAdvance(1)}>
            Next: Technical Needs <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Step 2: Technical needs ───────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="space-y-5">
        <StepIndicator current={2} total={4} />
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Step 2 — Technical Requirements</CardTitle>
            <CardDescription>What does this show need technically? The AI will search your owned inventory and Roundtable partners for each category.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Audio Needs</Label>
              <Select value={form.audio_needs} onValueChange={v => set('audio_needs', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{NEED_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Video / Projection Needs</Label>
              <Select value={form.video_needs} onValueChange={v => set('video_needs', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{NEED_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lighting Needs</Label>
              <Select value={form.lighting_needs} onValueChange={v => set('lighting_needs', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{NEED_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Recording / Streaming</Label>
              <Select value={form.streaming_needs} onValueChange={v => set('streaming_needs', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STREAMING_OPTIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Service Level</Label>
              <Select value={form.service_level} onValueChange={v => set('service_level', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dry_hire">Dry Hire — equipment only, no crew</SelectItem>
                  <SelectItem value="partial">Partial Support — some crew, client runs show</SelectItem>
                  <SelectItem value="full_service">Full Service — full crew, we run the show</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Show Complexity</Label>
              <Select value={form.complexity} onValueChange={v => set('complexity', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple — 1–2 crew, basic setup</SelectItem>
                  <SelectItem value="moderate">Moderate — standard team, full rig</SelectItem>
                  <SelectItem value="complex">Complex — multi-room, large team</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Any special requirements — band, interpreter, signing, special rigging, unique room layouts, etc."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(1)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button onClick={() => setStep(3)}>
            Next: Production Detail <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Step 3: Smart follow-up questions ─────────────────────────────────────
  if (step === 3) {
    return (
      <div className="space-y-5">
        <StepIndicator current={3} total={4} />
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Step 3 — Production Detail
            </CardTitle>
            <CardDescription>
              These questions help the AI build a more accurate show — matching your real inventory first, then Roundtable partners, then flagging true gaps.
              Answer as many as are relevant; skip any that don't apply.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {followUpQuestions.map(q => (
              <div key={q.key}>
                <Label className="leading-snug">{q.label}</Label>
                {q.type === 'select' && (
                  <Select value={form[q.key] || ''} onValueChange={v => set(q.key, v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {q.options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
            {followUpQuestions.length === 0 && (
              <div className="md:col-span-2 text-sm text-muted-foreground italic">
                No additional production questions needed based on your selections. Click Next to continue.
              </div>
            )}
          </CardContent>
        </Card>
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(2)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button onClick={() => setStep(4)}>
            Next: Build Level <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Step 4: Build level + confirm ────────────────────────────────────────
  if (step === 4) {
    const summaryItems = [
      { label: 'Type', value: form.show_type },
      { label: 'Audience', value: `${form.audience_size} people` },
      { label: 'Venue', value: `${form.venue_type || '—'} (${form.indoor_outdoor})` },
      { label: 'Rooms', value: form.room_count },
      { label: 'Budget', value: form.budget_target ? `$${Number(form.budget_target).toLocaleString()}` : 'Open' },
      { label: 'Audio', value: form.audio_needs },
      { label: 'Video', value: form.video_needs },
      { label: 'Lighting', value: form.lighting_needs },
      { label: 'Streaming', value: form.streaming_needs },
    ];

    // Count filled follow-up fields
    const followUpFilled = Object.keys(DEFAULT_FORM)
      .filter(k => !['show_name','show_type','venue_type','indoor_outdoor','audience_size','room_count','show_days','budget_target','quality_level','audio_needs','video_needs','lighting_needs','streaming_needs','screens_needed','complexity','service_level','notes'].includes(k))
      .filter(k => !!form[k]).length;

    return (
      <div className="space-y-5">
        <StepIndicator current={4} total={4} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Step 4 — Quality & Build Level</CardTitle>
              <CardDescription>Final settings before generating.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Quality Tier</Label>
                <Select value={form.quality_level} onValueChange={v => set('quality_level', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="budget">Budget — essentials only, lean crew</SelectItem>
                    <SelectItem value="standard">Standard — full coverage, standard rig</SelectItem>
                    <SelectItem value="premium">Premium — redundancy, top-tier gear</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Build Summary</CardTitle>
              <CardDescription>Confirm before generating</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                {summaryItems.map(item => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">{item.label}</dt>
                    <dd className="font-medium text-right">{item.value || '—'}</dd>
                  </div>
                ))}
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">Service Level</dt>
                  <dd className="font-medium">{form.service_level?.replace('_', ' ')}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">Quality</dt>
                  <dd><Badge variant="outline" className="capitalize">{form.quality_level}</Badge></dd>
                </div>
                {followUpFilled > 0 && (
                  <div className="flex justify-between text-sm pt-1 border-t">
                    <dt className="text-muted-foreground">Production detail answers</dt>
                    <dd className="text-primary font-medium">{followUpFilled} provided</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(3)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={generating || !form.show_type || !form.audience_size}
            size="lg"
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {generating ? 'Generating…' : 'Generate Smart Draft'}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}