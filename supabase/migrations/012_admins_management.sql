-- 관리자(admins) 목록을 앱 안에서 편집자가 직접 관리할 수 있도록 연다.
-- 003_rls.sql에서는 의도적으로 admins 쓰기를 막아뒀었다(콘솔에서만 추가) — 이제 편집자에게
-- 다른 데이터(매체/게시물 등)와 같은 수준의 신뢰로 admins 쓰기도 허용한다.

drop policy if exists admins_select_self on admins;
create policy admins_select_self   on admins for select using (user_id = auth.uid());
create policy admins_select_editor on admins for select using (is_editor());
create policy admins_insert        on admins for insert with check (is_editor());

-- 본인 행은 editor -> viewer로 못 내리게 막는다(마지막 편집자가 스스로 강등되면
-- 아무도 admins를 못 고치는 상태로 잠기므로). 다른 편집자가 남아있으면 허용.
create policy admins_update on admins for update
  using (is_editor())
  with check (
    is_editor()
    and (
      role = 'editor'
      or user_id <> auth.uid()
      or exists (select 1 from admins a where a.role = 'editor' and a.user_id <> auth.uid())
    )
  );

-- 본인 행은 스스로 삭제 못 한다(잠금 방지). 필요하면 다른 편집자가 대신 제거한다.
create policy admins_delete on admins for delete using (is_editor() and user_id <> auth.uid());

-- auth.users는 PostgREST에 노출되지 않으므로, 이메일로 해당 유저가 이미 로그인을
-- 시도한 적이 있는지(=user_id 존재 여부)만 편집자가 조회할 수 있는 전용 함수를 둔다.
-- auth.users의 다른 정보는 일절 반환하지 않는다.
create or replace function admin_find_user_id(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_editor() then
    raise exception 'not authorized';
  end if;
  return (select id from auth.users where lower(email) = lower(p_email) limit 1);
end;
$$;

revoke all on function admin_find_user_id(text) from public;
grant execute on function admin_find_user_id(text) to authenticated;
