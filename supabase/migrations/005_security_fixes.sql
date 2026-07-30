-- 보안 어드바이저 대응
-- 1) PG15+에서 뷰의 security_invoker 기본값은 false → 뷰가 소유자 권한으로 실행되어
--    postings/media 등 하부 테이블의 RLS(is_staff 등)를 우회한다. 반드시 querying user 권한으로 실행되게 한다.
alter view v_posting_status set (security_invoker = true);
alter view v_media_state    set (security_invoker = true);

-- 2) search_path가 고정되지 않은 SECURITY DEFINER 함수는 검색 경로 하이재킹에 취약할 수 있다.
alter function is_staff()  set search_path = public, pg_temp;
alter function is_editor() set search_path = public, pg_temp;
