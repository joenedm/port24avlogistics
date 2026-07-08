/**
 * Analytics — PostHog wrapper.
 * Set VITE_POSTHOG_KEY in .env.local (or Vercel env vars) to activate.
 * All calls are no-ops when the key is absent, so the app works without it.
 *
 * PostHog setup:
 *   1. Create a free account at posthog.com
 *   2. Copy your Project API key from Settings → Project → API Keys
 *   3. Add VITE_POSTHOG_KEY=phc_xxxxx to .env.local and to Vercel
 */

const KEY = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let _ph = null;

export async function initAnalytics() {
  if (!KEY) return;
  const { default: posthog } = await import('posthog-js');
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    persistence: 'localStorage',
  });
  _ph = posthog;
}

export function identifyUser(userId, traits = {}) {
  if (!_ph) return;
  _ph.identify(userId, traits);
}

export function trackEvent(name, properties = {}) {
  if (!_ph) return;
  _ph.capture(name, properties);
}

export function resetAnalyticsUser() {
  if (!_ph) return;
  _ph.reset();
}
