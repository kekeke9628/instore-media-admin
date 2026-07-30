-- 배치도(배너 시스템 center-map 버킷)와 동일한 구조: 고정 파일명 하나를 덮어쓰는 방식.
-- 차이점: 이 시스템은 공개 접근이 전혀 없으므로(사양서 1·5장) 읽기도 is_staff()로 제한한다
-- (배너 시스템은 public read였으나, 이 프로젝트는 비공개 버킷 + 서명 URL로 읽는다).
insert into storage.buckets (id, name, public)
values ('center-map', 'center-map', false)
on conflict (id) do nothing;

create policy center_map_select on storage.objects
  for select using (bucket_id = 'center-map' and is_staff());

create policy center_map_insert on storage.objects
  for insert with check (bucket_id = 'center-map' and is_editor());

create policy center_map_update on storage.objects
  for update using (bucket_id = 'center-map' and is_editor())
  with check (bucket_id = 'center-map' and is_editor());

create policy center_map_delete on storage.objects
  for delete using (bucket_id = 'center-map' and is_editor());
