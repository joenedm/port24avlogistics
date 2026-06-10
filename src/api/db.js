import { supabase } from './supabaseClient';
import { entities } from './entities';

export const db = {
  entities,

  auth: {
    async me() {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    async isAuthenticated() {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    },
    async loginViaEmailPassword(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async logout() {
      await supabase.auth.signOut();
      window.location.href = '/signin';
    },
    async verifyOtp({ email, otpCode }) {
      const { error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'email' });
      if (error) throw error;
    },
    async resendOtp(email) {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
    },
  },

  functions: {
    async clientCall(name, args) {
      console.warn(`db.functions.clientCall('${name}') not yet migrated`);
      return { data: null };
    },
    async invoke(name, args) {
      console.warn(`db.functions.invoke('${name}') not yet migrated`);
      return { data: null };
    },
  },

  integrations: {},
};
