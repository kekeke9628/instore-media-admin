// 자동 철거 처리 배치 (사양서 4.2) — 후속 게시물이 이미 시작된 게시물의 removed_at을
// 자동으로 채운다. 일 1회 크론에서 Slack 알람 조회 직전에 실행해야 한다(사양서 7장) —
// 그래야 기록 누락이 "만료"로 잘못 잡히지 않는다.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('필수 환경변수 누락: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const { error } = await supabase.rpc('auto_remove_superseded_postings');
if (error) throw error;
console.log('자동 철거 처리 완료');
