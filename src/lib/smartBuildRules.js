/**
 * Rules-based fallback engine for Smart Project Builder.
 * Used when the LLM returns empty results or fails entirely.
 * Generates a deterministic baseline draft from inputs alone.
 */

// ── Archetype definitions ────────────────────────────────────────────────────
export const ARCHETYPES = [
  {
    id: 'corporate_general_session',
    label: 'Corporate General Session',
    icon: 'Building2',
    description: 'Main plenary with stage, screens, PA, and professional lighting',
    defaults: {
      show_type: 'Corporate Conference',
      venue_type: 'Hotel Ballroom',
      indoor_outdoor: 'Indoor',
      quality_level: 'standard',
      audio_needs: 'Standard',
      video_needs: 'Full Production',
      lighting_needs: 'Standard',
      streaming_needs: 'Recording Only',
      complexity: 'standard',
      service_level: 'full_service',
      room_count: '1',
    },
  },
  {
    id: 'breakout_room',
    label: 'Breakout Room',
    icon: 'LayoutGrid',
    description: 'Small meeting room with basic AV and minimal crew',
    defaults: {
      show_type: 'Corporate Conference',
      venue_type: 'Hotel Ballroom',
      indoor_outdoor: 'Indoor',
      quality_level: 'budget',
      audio_needs: 'Basic',
      video_needs: 'Basic',
      lighting_needs: 'None',
      streaming_needs: 'None',
      complexity: 'simple',
      service_level: 'partial',
      room_count: '1',
    },
  },
  {
    id: 'gala',
    label: 'Gala / Awards',
    icon: 'Star',
    description: 'Evening event with theatrical lighting, entertainment audio, and video screens',
    defaults: {
      show_type: 'Gala / Fundraiser',
      venue_type: 'Hotel Ballroom',
      indoor_outdoor: 'Indoor',
      quality_level: 'premium',
      audio_needs: 'Full Production',
      video_needs: 'Standard',
      lighting_needs: 'Full Production',
      streaming_needs: 'Recording Only',
      complexity: 'complex',
      service_level: 'full_service',
      room_count: '2',
    },
  },
  {
    id: 'wedding',
    label: 'Wedding',
    icon: 'Heart',
    description: 'Ceremony and reception with sound, lighting, and DJ/band support',
    defaults: {
      show_type: 'Wedding',
      venue_type: 'Hotel Ballroom',
      indoor_outdoor: 'Both',
      quality_level: 'standard',
      audio_needs: 'Standard',
      video_needs: 'Basic',
      lighting_needs: 'Full Production',
      streaming_needs: 'Recording Only',
      complexity: 'moderate',
      service_level: 'full_service',
      room_count: '2',
    },
  },
  {
    id: 'livestream',
    label: 'Livestream / Hybrid',
    icon: 'Radio',
    description: 'Live broadcast or hybrid event with cameras, streaming encoder, and broadcast audio',
    defaults: {
      show_type: 'Corporate Conference',
      venue_type: 'Theater / Auditorium',
      indoor_outdoor: 'Indoor',
      quality_level: 'standard',
      audio_needs: 'Full Production',
      video_needs: 'Full Production',
      lighting_needs: 'Standard',
      streaming_needs: 'Recording + Live Stream',
      complexity: 'complex',
      service_level: 'full_service',
      room_count: '1',
    },
  },
  {
    id: 'small_meeting',
    label: 'Small Meeting',
    icon: 'Users',
    description: 'Simple meeting room with mic, display, and no dedicated crew',
    defaults: {
      show_type: 'Town Hall',
      venue_type: 'Hotel Ballroom',
      indoor_outdoor: 'Indoor',
      quality_level: 'budget',
      audio_needs: 'Basic',
      video_needs: 'Basic',
      lighting_needs: 'None',
      streaming_needs: 'None',
      complexity: 'simple',
      service_level: 'dry_hire',
      room_count: '1',
    },
  },
];

// ── Baseline equipment packages by need level ─────────────────────────────────
const AUDIO_PACKAGES = {
  None: [],
  Basic: [
    { name: 'Wireless Handheld Microphone', category: 'Audio', quantity: 1, daily_rate: 75, reason: 'Basic speech reinforcement' },
    { name: 'Small PA System (8" Tops)', category: 'Audio', quantity: 2, daily_rate: 100, reason: 'Basic room coverage' },
    { name: 'Audio Mixer (12ch)', category: 'Audio', quantity: 1, daily_rate: 125, reason: 'Essential mixing for basic audio' },
  ],
  Standard: [
    { name: 'Line Array PA System', category: 'Audio', quantity: 1, daily_rate: 500, reason: 'Main PA for audience coverage' },
    { name: 'Wireless Handheld Microphone', category: 'Audio', quantity: 2, daily_rate: 75, reason: 'Presenter and Q&A use' },
    { name: 'Wireless Lavalier Microphone', category: 'Audio', quantity: 2, daily_rate: 100, reason: 'Hands-free presenter mics' },
    { name: 'Digital Audio Mixer (32ch)', category: 'Audio', quantity: 1, daily_rate: 300, reason: 'Full show mixing console' },
    { name: 'Stage Monitor Wedge', category: 'Audio', quantity: 2, daily_rate: 75, reason: 'Stage monitoring for presenters' },
    { name: 'Audio Snake / Stage Box', category: 'Audio', quantity: 1, daily_rate: 100, reason: 'Stage to FOH connectivity' },
  ],
  'Full Production': [
    { name: 'Line Array PA System (L/R)', category: 'Audio', quantity: 2, daily_rate: 750, reason: 'Full stereo main PA' },
    { name: 'Subwoofer Array', category: 'Audio', quantity: 4, daily_rate: 150, reason: 'Low-frequency reinforcement' },
    { name: 'Digital Audio Console (64ch)', category: 'Audio', quantity: 1, daily_rate: 600, reason: 'Full production mixing' },
    { name: 'Wireless Handheld Microphone', category: 'Audio', quantity: 4, daily_rate: 75, reason: 'Multiple presenter mics' },
    { name: 'Wireless Lavalier Microphone', category: 'Audio', quantity: 4, daily_rate: 100, reason: 'Lavalier package for talent' },
    { name: 'In-Ear Monitor System', category: 'Audio', quantity: 2, daily_rate: 150, reason: 'Personal monitoring for performers' },
    { name: 'Broadcast Audio Interface', category: 'Audio', quantity: 1, daily_rate: 200, reason: 'Broadcast / stream audio output' },
  ],
};

const VIDEO_PACKAGES = {
  None: [],
  Basic: [
    { name: '65" LED Display / Monitor', category: 'Video', quantity: 1, daily_rate: 200, reason: 'Basic display for presentations' },
    { name: 'HDMI Switcher', category: 'Video', quantity: 1, daily_rate: 75, reason: 'Source switching for display' },
  ],
  Standard: [
    { name: 'HD Projector (10K lm)', category: 'Video', quantity: 1, daily_rate: 400, reason: 'Main stage projection' },
    { name: 'Projection Screen (16:9, 12ft)', category: 'Video', quantity: 1, daily_rate: 150, reason: 'Main content screen' },
    { name: 'Confidence Monitor', category: 'Video', quantity: 2, daily_rate: 150, reason: 'Presenter confidence / IMAG feed' },
    { name: 'Video Switcher / Scaler', category: 'Video', quantity: 1, daily_rate: 300, reason: 'Multi-source video switching' },
    { name: 'Presentation Laptop', category: 'Video', quantity: 1, daily_rate: 100, reason: 'Backup/show laptop for slides' },
    { name: 'Video Distribution Amp', category: 'Video', quantity: 1, daily_rate: 100, reason: 'Signal distribution to multiple screens' },
  ],
  'Full Production': [
    { name: '4K Projector (20K lm)', category: 'Video', quantity: 2, daily_rate: 900, reason: 'Dual 4K main stage projection' },
    { name: 'LED Video Wall Panel (3x3)', category: 'Video', quantity: 1, daily_rate: 1200, reason: 'LED video wall display' },
    { name: 'Broadcast Camera (PTZ)', category: 'Video', quantity: 3, daily_rate: 350, reason: 'Multi-angle camera coverage' },
    { name: 'Video Production Switcher', category: 'Video', quantity: 1, daily_rate: 600, reason: 'Live video production switching' },
    { name: 'Streaming Encoder', category: 'Video', quantity: 1, daily_rate: 300, reason: 'Live stream / broadcast encoding' },
    { name: 'Stage Confidence Monitor', category: 'Video', quantity: 4, daily_rate: 150, reason: 'Full confidence monitor package' },
    { name: 'Video Recording System', category: 'Video', quantity: 1, daily_rate: 250, reason: 'Multi-track video recording' },
  ],
};

const LIGHTING_PACKAGES = {
  None: [],
  Basic: [
    { name: 'LED Par Can', category: 'Lighting', quantity: 4, daily_rate: 50, reason: 'Basic stage wash lighting' },
    { name: 'Lighting Controller (DMX)', category: 'Lighting', quantity: 1, daily_rate: 100, reason: 'Basic DMX control' },
  ],
  Standard: [
    { name: 'LED Par Can', category: 'Lighting', quantity: 12, daily_rate: 50, reason: 'Stage wash and audience lighting' },
    { name: 'LED Moving Head Spot', category: 'Lighting', quantity: 4, daily_rate: 150, reason: 'Dynamic stage movement' },
    { name: 'Lighting Console (Ma Dot2)', category: 'Lighting', quantity: 1, daily_rate: 350, reason: 'Show control console' },
    { name: 'Followspot', category: 'Lighting', quantity: 1, daily_rate: 200, reason: 'Presenter followspot' },
    { name: 'Lighting Truss Section (10ft)', category: 'Lighting', quantity: 4, daily_rate: 75, reason: 'Overhead lighting positions' },
  ],
  'Full Production': [
    { name: 'LED Moving Head Beam', category: 'Lighting', quantity: 12, daily_rate: 200, reason: 'Full beam package for atmosphere' },
    { name: 'LED Moving Head Spot', category: 'Lighting', quantity: 8, daily_rate: 150, reason: 'Spot coverage for stage' },
    { name: 'LED Par Can', category: 'Lighting', quantity: 24, daily_rate: 50, reason: 'Full wash package' },
    { name: 'Lighting Console (GrandMA2)', category: 'Lighting', quantity: 1, daily_rate: 800, reason: 'Full production lighting desk' },
    { name: 'Followspot (High-Power)', category: 'Lighting', quantity: 2, daily_rate: 300, reason: 'Dual followspots for talent' },
    { name: 'Haze Machine', category: 'Lighting', quantity: 2, daily_rate: 150, reason: 'Atmospheric haze for beam visibility' },
    { name: 'Lighting Truss Section (10ft)', category: 'Lighting', quantity: 12, daily_rate: 75, reason: 'Full truss grid system' },
  ],
};

const STREAMING_PACKAGES = {
  None: [],
  'Recording Only': [
    { name: 'Video Recording System', category: 'Video', quantity: 1, daily_rate: 200, reason: 'Show recording' },
    { name: 'Broadcast Camera (PTZ)', category: 'Video', quantity: 1, daily_rate: 350, reason: 'Recording camera' },
  ],
  'Live Stream': [
    { name: 'Streaming Encoder', category: 'Video', quantity: 1, daily_rate: 300, reason: 'Live stream encoder' },
    { name: 'Broadcast Camera (PTZ)', category: 'Video', quantity: 2, daily_rate: 350, reason: 'Multi-angle live cameras' },
    { name: 'Dedicated Streaming Internet (Bonded)', category: 'Video', quantity: 1, daily_rate: 400, reason: 'Reliable bonded internet for streaming' },
  ],
  'Recording + Live Stream': [
    { name: 'Streaming Encoder', category: 'Video', quantity: 1, daily_rate: 300, reason: 'Live stream and recording encoder' },
    { name: 'Broadcast Camera (PTZ)', category: 'Video', quantity: 2, daily_rate: 350, reason: 'Multi-angle live cameras' },
    { name: 'Video Recording System', category: 'Video', quantity: 1, daily_rate: 200, reason: 'Simultaneous recording' },
    { name: 'Dedicated Streaming Internet (Bonded)', category: 'Video', quantity: 1, daily_rate: 400, reason: 'Reliable bonded internet for streaming' },
  ],
  'Broadcast Quality': [
    { name: 'Broadcast Production Switcher', category: 'Video', quantity: 1, daily_rate: 1200, reason: 'Broadcast-grade switching' },
    { name: 'Broadcast Camera (ENG)', category: 'Video', quantity: 3, daily_rate: 600, reason: 'Broadcast camera package' },
    { name: 'Streaming Encoder (Redundant)', category: 'Video', quantity: 2, daily_rate: 400, reason: 'Redundant encoders for broadcast' },
    { name: 'Broadcast Recording System', category: 'Video', quantity: 1, daily_rate: 500, reason: 'Broadcast-quality recording' },
  ],
};

// ── Crew packages by service level + complexity ───────────────────────────────
const CREW_PACKAGES = {
  dry_hire: [],
  partial: {
    simple: [
      { role_name: 'AV Technician', department: 'Audio', quantity: 1, days: 1, daily_rate_billable: 600, reason: 'Setup and operation support' },
    ],
    moderate: [
      { role_name: 'Audio Technician', department: 'Audio', quantity: 1, days: 1, daily_rate_billable: 600, reason: 'Audio operation' },
      { role_name: 'Video Technician', department: 'Video', quantity: 1, days: 1, daily_rate_billable: 600, reason: 'Video/projection operation' },
    ],
    complex: [
      { role_name: 'Audio Engineer (A1)', department: 'Audio', quantity: 1, days: 2, daily_rate_billable: 800, reason: 'Lead audio engineer' },
      { role_name: 'Video Engineer', department: 'Video', quantity: 1, days: 2, daily_rate_billable: 800, reason: 'Video systems engineer' },
      { role_name: 'Lighting Technician', department: 'Lighting', quantity: 1, days: 1, daily_rate_billable: 600, reason: 'Lighting setup and programming' },
    ],
  },
  full_service: {
    simple: [
      { role_name: 'AV Lead Technician', department: 'Audio', quantity: 1, days: 1, daily_rate_billable: 700, reason: 'Full-service AV lead' },
      { role_name: 'AV Technician', department: 'Audio', quantity: 1, days: 1, daily_rate_billable: 500, reason: 'Show support' },
    ],
    moderate: [
      { role_name: 'Audio Engineer (A1)', department: 'Audio', quantity: 1, days: 2, daily_rate_billable: 800, reason: 'Lead audio for show' },
      { role_name: 'Video Engineer', department: 'Video', quantity: 1, days: 2, daily_rate_billable: 800, reason: 'Video/projection lead' },
      { role_name: 'Lighting Designer', department: 'Lighting', quantity: 1, days: 2, daily_rate_billable: 900, reason: 'Lighting design and operation' },
      { role_name: 'Show Caller / Stage Manager', department: 'Production', quantity: 1, days: 2, daily_rate_billable: 700, reason: 'Show calling and production management' },
    ],
    complex: [
      { role_name: 'Audio Engineer (A1)', department: 'Audio', quantity: 1, days: 3, daily_rate_billable: 900, reason: 'Lead FOH audio engineer' },
      { role_name: 'Audio Technician (A2)', department: 'Audio', quantity: 1, days: 3, daily_rate_billable: 650, reason: 'Stage audio / RF technician' },
      { role_name: 'Video Engineer (V1)', department: 'Video', quantity: 1, days: 3, daily_rate_billable: 900, reason: 'Lead video engineer' },
      { role_name: 'Camera Operator', department: 'Video', quantity: 2, days: 2, daily_rate_billable: 700, reason: 'Camera coverage for IMAG/recording' },
      { role_name: 'Lighting Designer', department: 'Lighting', quantity: 1, days: 3, daily_rate_billable: 1000, reason: 'Full lighting design and operation' },
      { role_name: 'Lighting Technician', department: 'Lighting', quantity: 1, days: 2, daily_rate_billable: 650, reason: 'Lighting setup and rig' },
      { role_name: 'Show Caller / Stage Manager', department: 'Production', quantity: 1, days: 3, daily_rate_billable: 800, reason: 'Full show production management' },
      { role_name: 'Production Manager', department: 'Production', quantity: 1, days: 3, daily_rate_billable: 1200, reason: 'Overall event production coordination' },
    ],
  },
};

// ── Room name templates by show type ──────────────────────────────────────────
const ROOM_TEMPLATES = {
  'Corporate Conference': ['General Session', 'Breakout Room A', 'Breakout Room B', 'Registration / Lobby', 'Green Room'],
  'Awards Ceremony': ['Main Stage / Ballroom', 'Pre-Function / Cocktail Area', 'Backstage / Green Room'],
  'Concert / Live Music': ['Main Stage', 'Front of House', 'Backstage / Greenroom', 'Merch / Entry'],
  'Wedding': ['Ceremony Room', 'Reception Room', 'Cocktail Hour Area', 'Bridal Suite'],
  'Gala / Fundraiser': ['Main Ballroom', 'Cocktail / Pre-Function', 'VIP Area'],
  'Town Hall': ['Main Room', 'Overflow Room'],
  'Product Launch': ['Main Presentation Room', 'Demo / Experience Area', 'Media Room'],
  'Trade Show': ['Main Booth / Stage', 'Demo Area', 'Meeting Room'],
  'Graduation': ['Main Auditorium', 'Overflow Room', 'Photo Area'],
  'default': ['Main Room', 'Support Area'],
};

// ── Main rules-based generator ────────────────────────────────────────────────
export function buildFallbackDraft(inputs) {
  const roomCount = Math.min(parseInt(inputs.room_count) || 1, 6);
  const days = parseInt(inputs.show_days) || 1;
  const serviceLevel = inputs.service_level || 'full_service';
  const complexity = inputs.complexity || 'moderate';
  const showType = inputs.show_type || 'Corporate Conference';

  // Build room names
  const roomNames = ROOM_TEMPLATES[showType] || ROOM_TEMPLATES['default'];
  const rooms = [];

  for (let i = 0; i < roomCount; i++) {
    const isMainRoom = i === 0;
    const roomName = roomNames[i] || `Room ${i + 1}`;

    // Main room gets full tech package; secondary rooms get reduced
    const audioLevel = isMainRoom ? inputs.audio_needs : (inputs.audio_needs === 'Full Production' ? 'Standard' : inputs.audio_needs === 'Standard' ? 'Basic' : inputs.audio_needs);
    const videoLevel = isMainRoom ? inputs.video_needs : (inputs.video_needs === 'Full Production' ? 'Standard' : inputs.video_needs === 'Standard' ? 'Basic' : inputs.video_needs);
    const lightingLevel = isMainRoom ? inputs.lighting_needs : (inputs.lighting_needs === 'Full Production' ? 'Standard' : 'Basic');
    const streamingLevel = isMainRoom ? inputs.streaming_needs : 'None';

    const equipment = [
      ...(AUDIO_PACKAGES[audioLevel] || []),
      ...(VIDEO_PACKAGES[videoLevel] || []),
      ...(LIGHTING_PACKAGES[lightingLevel] || []),
      ...(isMainRoom ? (STREAMING_PACKAGES[streamingLevel] || []) : []),
    ].map(e => ({
      ...e,
      asset_id: null,
      not_in_inventory: true,
      days,
    }));

    rooms.push({
      name: roomName,
      type: isMainRoom ? 'stage' : 'room',
      purpose: isMainRoom ? `Primary ${showType.toLowerCase()} space` : `Secondary space for breakout or support`,
      equipment,
      kits: [],
    });
  }

  // Crew
  const crewMap = CREW_PACKAGES[serviceLevel];
  const crew = Array.isArray(crewMap) ? [] : (crewMap?.[complexity] || crewMap?.['moderate'] || []);
  const crewWithDays = crew.map(c => ({ ...c, days: Math.max(c.days, days), rooms: [rooms[0]?.name || 'Main Room'] }));

  // Costing
  const equipTotal = rooms.flatMap(r => r.equipment).reduce((s, e) => s + (e.daily_rate || 0) * (e.quantity || 1) * (e.days || 1), 0);
  const crewTotal = crewWithDays.reduce((s, c) => s + (c.daily_rate_billable || 0) * (c.quantity || 1) * (c.days || 1), 0);
  const roughTotal = equipTotal + crewTotal;
  const budget = Number(inputs.budget_target || 0);

  return {
    show_name: inputs.show_name || `${showType} Draft`,
    summary: `Baseline draft for a ${showType.toLowerCase()} with ${inputs.audience_size} attendees across ${roomCount} space${roomCount > 1 ? 's' : ''}. Generated using rules-based defaults — inventory items are marked as not-in-inventory and should be verified against your actual stock.`,
    based_on_show: null,
    quality_level: inputs.quality_level || 'standard',
    confidence: 'baseline',
    rooms,
    crew: crewWithDays,
    costing: {
      days,
      equipment_subtotal: equipTotal,
      crew_subtotal: crewTotal,
      rough_total: roughTotal,
      rough_billable: Math.round(roughTotal * 1.4),
      over_budget: budget > 0 && roughTotal > budget,
      budget_note: budget > 0
        ? (roughTotal > budget ? `Estimated cost exceeds your $${budget.toLocaleString()} budget by $${(roughTotal - budget).toLocaleString()}.` : `Estimated cost is within your $${budget.toLocaleString()} budget.`)
        : 'No budget target set. Using standard pricing.',
    },
  };
}