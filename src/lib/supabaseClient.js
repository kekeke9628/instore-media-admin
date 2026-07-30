import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      // PKCE: 메일 링크가 발급 당시의 브라우저(code_verifier 보관 위치)에서만 소비되도록 강제한다.
      // implicit flow는 링크를 다른 브라우저/기기에서 열거나 메일 보안 스캐너가 먼저 열어버리면
      // 토큰이 그쪽에서 소비되어 "otp_expired"가 뜨는 문제가 있었다.
      flowType: 'pkce',
      detectSessionInUrl: true,
    },
  }
);
