const { createClient } = require('@supabase/supabase-js');

let supabase;
let isInitialized = false;

function initSupabase() {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      console.log('❌ Supabase URL or key not configured');
      return false;
    }
    
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    isInitialized = true;
    return true;
  } catch (error) {
    console.error('Supabase initialization error:', error);
    return false;
  }
}

async function storeInSupabase(data) {
  if (!isInitialized) return false;
  
  try {
    const { error } = await supabase
      .from('memories')
      .insert([data]);
    
    return !error;
  } catch (error) {
    console.error('Supabase storage error:', error);
    return false;
  }
}

module.exports = {
  initSupabase,
  storeInSupabase
};
