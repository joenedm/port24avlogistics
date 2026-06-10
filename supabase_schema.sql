-- ============================================================
-- PORT 24 AV LOGISTICS — SUPABASE SCHEMA
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- USERS (mirrors auth.users, stores app-level profile data)
-- ============================================================
create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique,
  full_name     text,
  role          text default 'crew',  -- 'admin', 'director', 'manager', 'coordinator', 'crew'
  phone_number  text,
  avatar_url    text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- CLIENTS
-- ============================================================
create table public.clients (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  company_name            text,
  display_name            text,
  industry                text,
  billing_contact_name    text,
  billing_email           text,
  billing_address         text,
  billing_city            text,
  billing_state           text,
  billing_zip             text,
  payment_terms           text,
  payment_terms_custom    text,
  invoice_delivery        text,
  quote_format            text,
  preferred_communication text,
  po_required             boolean default false,
  po_notes                text,
  coi_required            boolean default false,
  coi_holder_name         text,
  coi_notes               text,
  requires_union          boolean default false,
  preferred_load_in_time  text,
  preferred_quote_format  text,
  venue_logistics         text,
  venue_logistics_notes   text,
  billing_notes           text,
  general_notes           text,
  internal_notes          text,
  first_show_date         date,
  last_show_date          date,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- ============================================================
-- CLIENT CONTACTS
-- ============================================================
create table public.client_contacts (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references public.clients(id) on delete cascade,
  name          text,
  email         text,
  phone         text,
  role          text,
  is_primary    boolean default false,
  notes         text,
  created_at    timestamptz default now()
);

-- ============================================================
-- CLIENT FILES
-- ============================================================
create table public.client_files (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references public.clients(id) on delete cascade,
  name        text,
  url         text,
  file_type   text,
  size_bytes  bigint,
  uploaded_by uuid references public.users(id),
  created_at  timestamptz default now()
);

-- ============================================================
-- CLIENT NOTES
-- ============================================================
create table public.client_notes (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references public.clients(id) on delete cascade,
  content     text,
  created_by  uuid references public.users(id),
  created_at  timestamptz default now()
);

-- ============================================================
-- CLIENT PREFERENCES
-- ============================================================
create table public.client_preferences (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references public.clients(id) on delete cascade,
  key         text,
  value       text,
  created_at  timestamptz default now()
);

-- ============================================================
-- VENUES
-- ============================================================
create table public.venues (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  address                  text,
  city                     text,
  state                    text,
  zip                      text,
  contact_name             text,
  contact_email            text,
  contact_phone            text,
  capacity                 integer,
  length                   numeric,
  dock_height              text,
  freight_elevator         boolean default false,
  house_engineer_required  boolean default false,
  house_equipment_available boolean default false,
  exclusive_vendors        text,
  load_in_dock_address     text,
  load_in_hours            text,
  load_in_rules            text,
  power_available          text,
  parking_notes            text,
  map                      text,
  notes                    text,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

-- ============================================================
-- SHOWS
-- ============================================================
create table public.shows (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  status               text default 'inquiry',  -- inquiry, confirmed, in_progress, completed, cancelled
  client_id            uuid references public.clients(id),
  client_name          text,
  venue_id             uuid references public.venues(id),
  venue_name           text,
  contact_name         text,
  contact_email        text,
  contact_phone        text,
  start_date           date,
  end_date             date,
  load_out_date        date,
  return_date          date,
  sub_locations        jsonb default '[]',
  invoice_status       text default 'not_invoiced',
  total_value          numeric default 0,
  internal_notes       text,
  client_visible_notes text,
  notes                text,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz default now()
);

-- ============================================================
-- ASSETS
-- ============================================================
create table public.assets (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  item_type                 text,
  category                  text,
  description               text,
  manufacturer              text,
  model                     text,
  barcode                   text unique,
  asset_number              text unique,
  serial_number             text,
  serial_numbers            jsonb default '[]',
  mfr_serial                text,
  status                    text default 'available',  -- available, checked_out, maintenance, retired
  condition                 text,
  tracking                  text default 'individual',  -- individual, quantity
  quantity                  integer default 1,
  unit_of_measure           text,
  reorder_level             integer,
  location                  text,
  current_show_id           uuid references public.shows(id),
  current_sub_location_id   text,
  current_sub_location_name text,
  locked_to_show_id         uuid references public.shows(id),
  locked_to_show_name       text,
  locked_at                 timestamptz,
  kit_id                    uuid,
  ownership_type            text default 'owned',  -- owned, rented, partner
  partner_owner_id          uuid,
  partner_owner_name        text,
  partner_use_allowed       boolean default true,
  partner_approval_required boolean default false,
  partner_agreement_notes   text,
  daily_rate                numeric default 0,
  replacement_value         numeric default 0,
  purchase_price            numeric default 0,
  purchase_date             date,
  subrent_cost              numeric default 0,
  cost_per_unit             numeric default 0,
  max_discount_pct          numeric default 0,
  weight_kg                 numeric,
  country_of_origin         text,
  vendor                    text,
  warranty_expiry           date,
  image_url                 text,
  custom_fields             jsonb default '{}',
  notes                     text,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

-- ============================================================
-- ASSET MOVEMENTS
-- ============================================================
create table public.asset_movements (
  id            uuid primary key default gen_random_uuid(),
  asset_id      uuid references public.assets(id) on delete cascade,
  show_id       uuid references public.shows(id),
  movement_type text,  -- checked_out, returned, transferred
  from_location text,
  to_location   text,
  quantity      integer default 1,
  moved_by      uuid references public.users(id),
  moved_at      timestamptz default now(),
  notes         text
);

-- ============================================================
-- ASSET REVIEW ITEMS
-- ============================================================
create table public.asset_review_items (
  id          uuid primary key default gen_random_uuid(),
  asset_id    uuid references public.assets(id) on delete cascade,
  review_id   uuid,
  status      text,
  notes       text,
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  created_at  timestamptz default now()
);

-- ============================================================
-- YEARLY ASSET REVIEWS
-- ============================================================
create table public.yearly_asset_reviews (
  id          uuid primary key default gen_random_uuid(),
  year        integer not null,
  status      text default 'open',
  started_by  uuid references public.users(id),
  started_at  timestamptz,
  closed_at   timestamptz,
  notes       text,
  created_at  timestamptz default now()
);

-- ============================================================
-- KITS
-- ============================================================
create table public.kits (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  kit_type                text,
  category                text,
  location                text,
  barcode                 text unique,
  asset_number            text,
  status                  text default 'available',
  daily_rate              numeric default 0,
  auto_price              boolean default true,
  description             text,
  is_sealed               boolean default false,
  require_complete_checkin boolean default false,
  linked_asset_ids        jsonb default '[]',
  kit_contents            jsonb default '[]',
  notes                   text,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- ============================================================
-- CONTAINERS
-- ============================================================
create table public.containers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  location    text,
  barcode     text,
  status      text,
  notes       text,
  created_at  timestamptz default now()
);

-- ============================================================
-- CONTAINER LABELS
-- ============================================================
create table public.container_labels (
  id            uuid primary key default gen_random_uuid(),
  container_id  uuid references public.containers(id) on delete cascade,
  label_data    jsonb,
  printed_by    uuid references public.users(id),
  printed_at    timestamptz,
  created_at    timestamptz default now()
);

-- ============================================================
-- CREW MEMBERS
-- ============================================================
create table public.crew_members (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.users(id),
  full_name    text,
  email        text,
  phone_number text,
  role         text,
  status       text default 'active',
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ============================================================
-- CREW ROLES
-- ============================================================
create table public.crew_roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz default now()
);

-- ============================================================
-- LABOR RATES
-- ============================================================
create table public.labor_rates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  rate        numeric not null,
  rate_type   text,  -- hourly, daily, flat
  description text,
  created_at  timestamptz default now()
);

-- ============================================================
-- PROJECT CREW (crew assigned to a show)
-- ============================================================
create table public.project_crew (
  id                   uuid primary key default gen_random_uuid(),
  show_id              uuid references public.shows(id) on delete cascade,
  show_name            text,
  crew_member_id       uuid references public.crew_members(id),
  crew_member_name     text,
  crew_member_email    text,
  role                 text,
  assignment_date      date,
  end_date             date,
  start_time           text,
  end_time             text,
  hours                numeric,
  quantity             integer default 1,
  rate_type            text,
  internal_cost        numeric default 0,
  billable_cost        numeric default 0,
  internal_rate        numeric default 0,
  billable_rate        numeric default 0,
  labor_rate_id        uuid references public.labor_rates(id),
  notes                text,
  assignment_status    text default 'pending',
  billable_rate_missing boolean default false,
  crew_booking_id      uuid,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- ============================================================
-- CREW BOOKINGS
-- ============================================================
create table public.crew_bookings (
  id                   uuid primary key default gen_random_uuid(),
  show_id              uuid references public.shows(id) on delete cascade,
  show_name            text,
  crew_id              uuid references public.crew_members(id),
  crew_name            text,
  crew_email           text,
  crew_phone           text,
  project_crew_id      uuid references public.project_crew(id),
  role                 text,
  status               text default 'not_sent',  -- not_sent, sent, confirmed, declined
  start_date           date,
  end_date             date,
  start_time           text,
  end_time             text,
  location             text,
  rate                 numeric,
  rate_type            text,
  notes                text,
  billable_rate_missing boolean default false,
  email_sent_at        timestamptz,
  sent_by              uuid references public.users(id),
  responded_at         timestamptz,
  attached_at          timestamptz,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- ============================================================
-- CREW BOOKING EMAIL TEMPLATES
-- ============================================================
create table public.crew_booking_email_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  subject     text,
  body        text,
  is_default  boolean default false,
  created_at  timestamptz default now()
);

-- ============================================================
-- SHOW REQUIREMENTS
-- ============================================================
create table public.show_requirements (
  id            uuid primary key default gen_random_uuid(),
  show_id       uuid references public.shows(id) on delete cascade,
  show_name     text,
  room_id       text,
  room_name     text,
  product_name  text,
  quantity_needed integer default 1,
  asset_id      uuid references public.assets(id),
  kit_id        uuid references public.kits(id),
  category      text,
  sort_order    integer default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- SHOW FULFILLMENTS
-- ============================================================
create table public.show_fulfillments (
  id              uuid primary key default gen_random_uuid(),
  show_id         uuid references public.shows(id) on delete cascade,
  show_name       text,
  requirement_id  uuid references public.show_requirements(id),
  asset_id        uuid references public.assets(id),
  asset_name      text,
  asset_barcode   text,
  asset_serial    text,
  room_id         text,
  room_name       text,
  movement_state  text default 'pending',  -- pending, picked, on_truck, at_venue, returned
  scanned_by      uuid references public.users(id),
  scanned_at      timestamptz,
  packed_by       uuid references public.users(id),
  packed_at       timestamptz,
  sent_by         uuid references public.users(id),
  sent_at         timestamptz,
  returned_by     uuid references public.users(id),
  returned_at     timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- TRUCK PACKS
-- ============================================================
create table public.truck_packs (
  id          uuid primary key default gen_random_uuid(),
  show_id     uuid references public.shows(id) on delete cascade,
  show_name   text,
  name        text,
  truck_type  text,
  capacity    text,
  items       jsonb default '[]',
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- TRAVEL LOGISTICS
-- ============================================================
create table public.travel_logistics (
  id                    uuid primary key default gen_random_uuid(),
  show_id               uuid references public.shows(id) on delete cascade,
  show_name             text,
  logistics_type        text,  -- flight, hotel, rental_car, transport
  description           text,
  quantity              integer default 1,
  assigned_person       text,
  origin                text,
  destination           text,
  pickup_datetime       timestamptz,
  delivery_datetime     timestamptz,
  load_in_datetime      timestamptz,
  load_out_datetime     timestamptz,
  confirmation_number   text,
  vendor                text,
  unit_cost             numeric default 0,
  unit_billable         numeric default 0,
  cost                  numeric default 0,
  billable_amount       numeric default 0,
  mileage               numeric,
  mileage_rate          numeric,
  billable_mileage_rate numeric,
  bank_record_id        uuid,
  bank_record_name      text,
  status                text default 'pending',
  notes                 text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ============================================================
-- POST EVENT COSTS
-- ============================================================
create table public.post_event_costs (
  id                  uuid primary key default gen_random_uuid(),
  show_id             uuid references public.shows(id) on delete cascade,
  show_name           text,
  cost_name           text,
  category            text,
  quantity            numeric default 1,
  unit_cost           numeric default 0,
  unit_sell_price     numeric default 0,
  total_internal_cost numeric default 0,
  total_billable_cost numeric default 0,
  is_billable         boolean default true,
  notes               text,
  date_added          date,
  added_by            uuid references public.users(id),
  created_at          timestamptz default now()
);

-- ============================================================
-- ADDITIONAL EQUIPMENT REQUESTS
-- ============================================================
create table public.additional_equipment_requests (
  id          uuid primary key default gen_random_uuid(),
  show_id     uuid references public.shows(id) on delete cascade,
  item_name   text,
  quantity    integer default 1,
  category    text,
  notes       text,
  status      text default 'pending',
  requested_by uuid references public.users(id),
  approved_by  uuid references public.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- QUOTES
-- ============================================================
create table public.quotes (
  id                  uuid primary key default gen_random_uuid(),
  number              text unique,
  show_id             uuid references public.shows(id),
  show_name           text,
  client_id           uuid references public.clients(id),
  client_name         text,
  status              text default 'draft',  -- draft, sent, approved, declined
  template_id         uuid,
  line_items          jsonb default '[]',
  discount_pct        numeric default 0,
  tax_pct             numeric default 0,
  total               numeric default 0,
  notes               text,
  show_daily_breakdown boolean default false,
  confirmed_at        timestamptz,
  confirmed_by        text,
  sent_at             timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ============================================================
-- INVOICES
-- ============================================================
create table public.invoices (
  id                     uuid primary key default gen_random_uuid(),
  invoice_number         text unique,
  show_id                uuid references public.shows(id),
  show_name              text,
  client_id              uuid references public.clients(id),
  client_name            text,
  status                 text default 'draft',  -- draft, sent, paid, overdue, void
  total                  numeric default 0,
  amount_paid            numeric default 0,
  amount_due             numeric default 0,
  deposit_required       numeric default 0,
  deposit_paid           boolean default false,
  due_date               date,
  sent_date              date,
  client_visible_notes   text,
  stripe_hosted_invoice_url text,
  stripe_pdf_url         text,
  stripe_receipt_url     text,
  line_items             jsonb default '[]',
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
create table public.payments (
  id               uuid primary key default gen_random_uuid(),
  invoice_id       uuid references public.invoices(id) on delete cascade,
  show_id          uuid references public.shows(id),
  client_id        uuid references public.clients(id),
  amount           numeric not null,
  method           text,   -- check, wire, credit_card, cash, stripe
  type             text,   -- deposit, final, partial
  reference_number text,
  date             date,
  notes            text,
  created_at       timestamptz default now()
);

-- ============================================================
-- LOGISTICS BANK (sub-rent / vendor cost pool)
-- ============================================================
create table public.logistics_bank (
  id              uuid primary key default gen_random_uuid(),
  show_id         uuid references public.shows(id) on delete cascade,
  name            text,
  vendor          text,
  amount          numeric default 0,
  category        text,
  notes           text,
  created_at      timestamptz default now()
);

-- ============================================================
-- ROUNDTABLE ITEMS
-- ============================================================
create table public.roundtable_items (
  id          uuid primary key default gen_random_uuid(),
  show_id     uuid references public.shows(id) on delete cascade,
  title       text,
  description text,
  status      text,
  assigned_to uuid references public.users(id),
  due_date    date,
  created_at  timestamptz default now()
);

-- ============================================================
-- ROUNDTABLE PARTNERS
-- ============================================================
create table public.roundtable_partners (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text,
  phone       text,
  company     text,
  notes       text,
  created_at  timestamptz default now()
);

-- ============================================================
-- ROUNDTABLE SUBRENTS
-- ============================================================
create table public.roundtable_subrents (
  id               uuid primary key default gen_random_uuid(),
  show_id          uuid references public.shows(id) on delete cascade,
  show_name        text,
  room_id          text,
  room_name        text,
  item_name        text,
  partner_name     text,
  quantity         integer default 1,
  internal_cost    numeric default 0,
  total_cost       numeric default 0,
  billable_amount  numeric default 0,
  notes            text,
  vendor_reference text,
  source_type      text,
  added_by         uuid references public.users(id),
  created_at       timestamptz default now()
);

-- ============================================================
-- AV HOSPITAL (damaged / repair tracking)
-- ============================================================
create table public.av_hospital (
  id           uuid primary key default gen_random_uuid(),
  asset_id     uuid references public.assets(id),
  asset_name   text,
  show_id      uuid references public.shows(id),
  issue        text,
  status       text default 'open',  -- open, in_repair, resolved
  reported_by  uuid references public.users(id),
  repaired_by  uuid references public.users(id),
  reported_at  timestamptz default now(),
  resolved_at  timestamptz,
  notes        text,
  created_at   timestamptz default now()
);

-- ============================================================
-- ALERTS
-- ============================================================
create table public.alerts (
  id          uuid primary key default gen_random_uuid(),
  type        text,
  title       text,
  message     text,
  show_id     uuid references public.shows(id),
  asset_id    uuid references public.assets(id),
  is_read     boolean default false,
  created_for uuid references public.users(id),
  created_at  timestamptz default now()
);

-- ============================================================
-- FULFILLMENT CALIBRATIONS
-- ============================================================
create table public.fulfillment_calibrations (
  id          uuid primary key default gen_random_uuid(),
  show_id     uuid references public.shows(id) on delete cascade,
  name        text,
  settings    jsonb default '{}',
  created_at  timestamptz default now()
);

-- ============================================================
-- IMPORT TEMPLATES
-- ============================================================
create table public.import_templates (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  entity_type  text,
  column_map   jsonb default '{}',
  created_by   uuid references public.users(id),
  created_at   timestamptz default now()
);

-- ============================================================
-- QUICKBOOKS CONNECTION
-- ============================================================
create table public.quickbooks_connections (
  id              uuid primary key default gen_random_uuid(),
  realm_id        text,
  access_token    text,
  refresh_token   text,
  token_expires   timestamptz,
  company_name    text,
  connected_by    uuid references public.users(id),
  connected_at    timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- STRIPE ACCOUNTS
-- ============================================================
create table public.stripe_accounts (
  id                  uuid primary key default gen_random_uuid(),
  stripe_account_id   text unique,
  account_name        text,
  connected_by        uuid references public.users(id),
  connected_at        timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ============================================================
-- SETTINGS TABLES
-- ============================================================
create table public.brand_settings (
  id              uuid primary key default gen_random_uuid(),
  company_name    text,
  logo_url        text,
  primary_color   text,
  secondary_color text,
  font            text,
  address         text,
  phone           text,
  email           text,
  website         text,
  updated_at      timestamptz default now()
);

create table public.invoice_settings (
  id              uuid primary key default gen_random_uuid(),
  default_terms   text,
  default_notes   text,
  tax_rate        numeric default 0,
  logo_url        text,
  footer_text     text,
  updated_at      timestamptz default now()
);

create table public.document_settings (
  id          uuid primary key default gen_random_uuid(),
  settings    jsonb default '{}',
  updated_at  timestamptz default now()
);

create table public.workspace_email_settings (
  id              uuid primary key default gen_random_uuid(),
  from_name       text,
  from_email      text,
  reply_to        text,
  smtp_host       text,
  smtp_port       integer,
  smtp_user       text,
  smtp_password   text,
  updated_at      timestamptz default now()
);

create table public.code_settings (
  id          uuid primary key default gen_random_uuid(),
  settings    jsonb default '{}',
  updated_at  timestamptz default now()
);

create table public.email_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  subject     text,
  body        text,
  type        text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table public.email_field_controls (
  id          uuid primary key default gen_random_uuid(),
  entity_type text,
  field_name  text,
  is_visible  boolean default true,
  is_required boolean default false,
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

create table public.print_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text,
  html        text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table public.custom_fields (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null,
  name         text not null,
  field_type   text,   -- text, number, boolean, date, select
  options      jsonb default '[]',
  is_required  boolean default false,
  sort_order   integer default 0,
  created_at   timestamptz default now()
);

create table public.user_dashboards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.users(id) on delete cascade,
  layout      jsonb default '[]',
  widgets     jsonb default '[]',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY — basic policy: authenticated users only
-- (Customize per table as needed)
-- ============================================================
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.client_contacts enable row level security;
alter table public.client_files enable row level security;
alter table public.client_notes enable row level security;
alter table public.client_preferences enable row level security;
alter table public.venues enable row level security;
alter table public.shows enable row level security;
alter table public.categories enable row level security;
alter table public.assets enable row level security;
alter table public.asset_movements enable row level security;
alter table public.asset_review_items enable row level security;
alter table public.yearly_asset_reviews enable row level security;
alter table public.kits enable row level security;
alter table public.containers enable row level security;
alter table public.container_labels enable row level security;
alter table public.crew_members enable row level security;
alter table public.crew_roles enable row level security;
alter table public.labor_rates enable row level security;
alter table public.project_crew enable row level security;
alter table public.crew_bookings enable row level security;
alter table public.crew_booking_email_templates enable row level security;
alter table public.show_requirements enable row level security;
alter table public.show_fulfillments enable row level security;
alter table public.truck_packs enable row level security;
alter table public.travel_logistics enable row level security;
alter table public.post_event_costs enable row level security;
alter table public.additional_equipment_requests enable row level security;
alter table public.quotes enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.logistics_bank enable row level security;
alter table public.roundtable_items enable row level security;
alter table public.roundtable_partners enable row level security;
alter table public.roundtable_subrents enable row level security;
alter table public.av_hospital enable row level security;
alter table public.alerts enable row level security;
alter table public.fulfillment_calibrations enable row level security;
alter table public.import_templates enable row level security;
alter table public.quickbooks_connections enable row level security;
alter table public.stripe_accounts enable row level security;
alter table public.brand_settings enable row level security;
alter table public.invoice_settings enable row level security;
alter table public.document_settings enable row level security;
alter table public.workspace_email_settings enable row level security;
alter table public.code_settings enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_field_controls enable row level security;
alter table public.print_templates enable row level security;
alter table public.custom_fields enable row level security;
alter table public.user_dashboards enable row level security;

-- Allow authenticated users full access to all tables
-- (Tighten these per-table after launch)
do $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format(
      'create policy "authenticated_full_access" on public.%I
       for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- Allow users to read/update only their own user record
drop policy if exists "authenticated_full_access" on public.users;
create policy "users_own_record" on public.users
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- UPDATED_AT TRIGGER (auto-update timestamps)
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply updated_at trigger to tables that have the column
do $$
declare
  t text;
begin
  for t in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'updated_at'
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute procedure public.set_updated_at()',
      t, t
    );
  end loop;
end $$;
