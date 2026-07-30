-- 사양서 5장 — 권한 (RLS). 공개 접근이 전혀 없다: anon은 모든 테이블에서 차단한다.

create or replace function is_staff()
returns boolean language sql security definer stable as $$
  select exists (select 1 from admins where user_id = auth.uid())
$$;

create or replace function is_editor()
returns boolean language sql security definer stable as $$
  select exists (select 1 from admins where user_id = auth.uid() and role = 'editor')
$$;

alter table media_types enable row level security;
alter table spots       enable row level security;
alter table media       enable row level security;
alter table postings    enable row level security;
alter table admins      enable row level security;

-- media_types: SELECT is_staff() / 쓰기 is_editor()
create policy media_types_select on media_types for select using (is_staff());
create policy media_types_insert on media_types for insert with check (is_editor());
create policy media_types_update on media_types for update using (is_editor()) with check (is_editor());
create policy media_types_delete on media_types for delete using (is_editor());

-- spots
create policy spots_select on spots for select using (is_staff());
create policy spots_insert on spots for insert with check (is_editor());
create policy spots_update on spots for update using (is_editor()) with check (is_editor());
create policy spots_delete on spots for delete using (is_editor());

-- media
create policy media_select on media for select using (is_staff());
create policy media_insert on media for insert with check (is_editor());
create policy media_update on media for update using (is_editor()) with check (is_editor());
create policy media_delete on media for delete using (is_editor());

-- postings
create policy postings_select on postings for select using (is_staff());
create policy postings_insert on postings for insert with check (is_editor());
create policy postings_update on postings for update using (is_editor()) with check (is_editor());
create policy postings_delete on postings for delete using (is_editor());

-- admins: 본인 행만 조회, 쓰기는 정책 없음(=차단, Supabase 콘솔에서 직접 추가)
create policy admins_select_self on admins for select using (user_id = auth.uid());

-- 뷰는 authenticated에만 SELECT 허용, anon에는 아무 권한도 주지 않는다
grant select on v_posting_status to authenticated;
grant select on v_media_state   to authenticated;
revoke all on v_posting_status from anon;
revoke all on v_media_state    from anon;
