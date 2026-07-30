-- auth.uid()를 (select auth.uid())로 감싸 행마다 재평가되지 않게 한다 (Supabase 성능 어드바이저 권고)
drop policy admins_select_self on admins;
create policy admins_select_self on admins for select using (user_id = (select auth.uid()));
