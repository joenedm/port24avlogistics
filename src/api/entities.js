/**
 * Supabase entity layer — drop-in replacement for db.entities.*
 *
 * Every entity exposes: list(sort?, limit?), filter(where, sort?), read(id),
 * get(id), create(data), update(id, data), delete(id)
 *
 * sort strings match Base44 convention: '-field_name' = descending, 'field_name' = ascending.
 * where objects are plain key=value equality filters (AND-joined).
 */

import { supabase } from './supabaseClient';

// Fields that exist in the app state but are NOT database columns — strip before insert/update
const VIRTUAL_FIELDS = new Set(['client', 'venue', '_isKit', 'assignment_history']);

// Convert empty strings to null so Postgres numeric/date fields don't reject them
// Also strip virtual fields and ensure name is populated from company_name when present
function sanitize(data) {
  if (!data || typeof data !== 'object') return data;
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (VIRTUAL_FIELDS.has(k)) continue;
    out[k] = v === '' ? null : v;
  }
  // clients: copy company_name → name if name is missing
  if (out.company_name && !out.name) out.name = out.company_name;
  return out;
}

// subscribe(callback) — real-time listener using Supabase Realtime
// Returns an unsubscribe function matching Base44's interface
function buildSubscribe(table) {
  return function subscribe(callback) {
    const channel = supabase
      .channel(`realtime:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        callback(payload);
      })
      .subscribe();
    // Return unsubscribe function
    return () => supabase.removeChannel(channel);
  };
}

// Map Base44 sort string ('-created_date') → Supabase options ({ column, ascending })
function parseSort(sort) {
  if (!sort) return null;
  const descending = sort.startsWith('-');
  const column = sort.replace(/^-/, '')
    // Base44 uses 'created_date' but schema uses 'created_at' — normalise
    .replace(/^created_date$/, 'created_at')
    .replace(/^updated_date$/, 'updated_at');
  return { column, ascending: !descending };
}

// cols: explicit column list — omit server-side secrets from client responses
function buildEntity(table, cols = '*') {
  return {
    // list(sort?, limit?) — fetch all rows
    async list(sort, limit) {
      let q = supabase.from(table).select(cols);
      const s = parseSort(sort);
      if (s) q = q.order(s.column, { ascending: s.ascending });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },

    // filter(where, sort?) — equality filter on one or more fields
    async filter(where, sort) {
      let q = supabase.from(table).select(cols);
      if (where) {
        for (const [key, value] of Object.entries(where)) {
          if (Array.isArray(value)) {
            q = q.in(key, value);
          } else if (value === null) {
            q = q.is(key, null);
          } else {
            q = q.eq(key, value);
          }
        }
      }
      const s = parseSort(sort);
      if (s) q = q.order(s.column, { ascending: s.ascending });
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },

    // read(id) / get(id) — fetch single row by primary key
    async read(id) {
      const { data, error } = await supabase.from(table).select(cols).eq('id', id).single();
      if (error) throw error;
      return data;
    },

    async get(id) {
      return this.read(id);
    },

    // create(data) — insert and return the new row
    async create(data) {
      const { data: row, error } = await supabase.from(table).insert(sanitize(data)).select().single();
      if (error) throw error;
      return row;
    },

    // update(id, data) — patch a row by id, return updated row
    async update(id, data) {
      const { data: row, error } = await supabase.from(table).update(sanitize(data)).eq('id', id).select().single();
      if (error) throw error;
      return row;
    },

    // delete(id) — remove a row by id
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return true;
    },

    // subscribe(callback) — real-time updates, returns unsubscribe fn
    subscribe: buildSubscribe(table),
  };
}

// ── Entity map ────────────────────────────────────────────────
// Keys match exactly what the app uses: db.entities.<Key>
export const entities = {
  Show:                        buildEntity('shows'),
  Asset:                       buildEntity('assets'),
  AssetMovement:               buildEntity('asset_movements'),
  AssetReviewItem:             buildEntity('asset_review_items'),
  YearlyAssetReview:           buildEntity('yearly_asset_reviews'),
  Kit:                         buildEntity('kits'),
  Container:                   buildEntity('containers'),
  ContainerLabel:              buildEntity('container_labels'),
  Category:                    buildEntity('categories'),
  Client:                      buildEntity('clients'),
  ClientContact:               buildEntity('client_contacts'),
  ClientFile:                  buildEntity('client_files'),
  ClientNote:                  buildEntity('client_notes'),
  ClientPreference:            buildEntity('client_preferences'),
  Venue:                       buildEntity('venues'),
  CrewMember:                  buildEntity('crew_members'),
  CrewRole:                    buildEntity('crew_roles'),
  LaborRate:                   buildEntity('labor_rates'),
  ProjectCrew:                 buildEntity('project_crew'),
  CrewBooking:                 buildEntity('crew_bookings'),
  CrewBookingEmailTemplate:    buildEntity('crew_booking_email_templates'),
  ShowRequirement:             buildEntity('show_requirements'),
  ShowFulfillment:             buildEntity('show_fulfillments'),
  TruckPack:                   buildEntity('truck_packs'),
  TravelLogistic:              buildEntity('travel_logistics'),
  PostEventCost:               buildEntity('post_event_costs'),
  AdditionalEquipmentRequest:  buildEntity('additional_equipment_requests'),
  Quote:                       buildEntity('quotes'),
  Invoice:                     buildEntity('invoices'),
  Payment:                     buildEntity('payments'),
  LogisticsBank:               buildEntity('logistics_bank'),
  RoundtableItem:              buildEntity('roundtable_items'),
  RoundtablePartner:           buildEntity('roundtable_partners'),
  RoundtableSubrent:           buildEntity('roundtable_subrents'),
  AVHospital:                  buildEntity('av_hospital'),
  Alert:                       buildEntity('alerts'),
  FulfillmentCalibration:      buildEntity('fulfillment_calibrations'),
  ImportTemplate:              buildEntity('import_templates'),
  // OAuth tokens (access_token, refresh_token) and SMTP password are server-side secrets
  // and must never be returned to the browser. Explicit column lists omit them.
  QuickBooksConnection: buildEntity(
    'quickbooks_connections',
    'id,org_id,realm_id,company_name,connected_at,status,' +
    'income_account_equipment,income_account_labor,income_account_logistics,' +
    'income_account_consumables,income_account_discounts,deposit_account,' +
    'default_terms,sales_tax_code,default_service_item,' +
    'auto_sync_on_invoice_send,sync_customers,sync_invoices,sync_payments,token_expires'
  ),
  StripeAccount:               buildEntity('stripe_accounts'),
  BrandSettings:               buildEntity('brand_settings'),
  InvoiceSettings:             buildEntity('invoice_settings'),
  DocumentSettings:            buildEntity('document_settings'),
  WorkspaceEmailSettings: buildEntity(
    'workspace_email_settings',
    'id,org_id,from_name,from_email,smtp_host,smtp_port,smtp_user,resend_api_key_set'
  ),
  CodeSettings:                buildEntity('code_settings'),
  EmailTemplate:               buildEntity('email_templates'),
  EmailFieldControl:           buildEntity('email_field_controls'),
  PrintTemplate:               buildEntity('print_templates'),
  CustomField:                 buildEntity('custom_fields'),
  UserDashboard:               buildEntity('user_dashboards'),
  User:                        buildEntity('users'),
};
