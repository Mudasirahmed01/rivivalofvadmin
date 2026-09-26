// ============================================
// SUPABASE CLIENT CONFIGURATION
// ============================================
// Real Supabase connection for REVIVAL OF V
// Dashboard: https://supabase.com/dashboard/project/fgcizeertupxnmpediic

import { createClient } from '@supabase/supabase-js';

// Get credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate credentials
if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL. Add it to .env before starting the app.');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY. Add it to .env before starting the app.');
}

// Create Supabase client with optimized settings
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-client-info': 'revival-of-v-web',
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if Supabase connection is working
 */
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('products').select('count').limit(1);
    if (error) {
      console.error('❌ Supabase connection error:', error.message);
      return false;
    }
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    return false;
  }
};

/**
 * Get current user session
 */
export const getCurrentSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

/**
 * Subscribe to realtime changes
 */
export const subscribeToTable = (tableName: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`table-${tableName}-changes`)
    .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, callback)
    .subscribe();
};

export default supabase;
