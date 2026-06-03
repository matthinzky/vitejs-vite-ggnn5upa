import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bmhhmgzrtsypzyadurfr.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaGhtZ3pydHN5cHp5YWR1cmZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0Nzg0ODksImV4cCI6MjA5NjA1NDQ4OX0.-d6T2xyU93vP9QiQ8pg5OT6xGs0_ANaJfzyIh79yk3U';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
