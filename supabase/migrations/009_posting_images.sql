-- 마일스톤 7 — 게시물 이미지 실제 업로드. 웨더워리어(2면)는 앞/뒤 이미지와 방향을
-- 각각 가질 수 있어 단일 thumb_path/view_path로는 표현할 수 없다 — faces(jsonb)에
-- [{direction, thumb_path, view_path, bytes_orig, bytes_light}, ...]로 담는다.
-- 1면 매체는 기존 thumb_path/view_path를 그대로 쓰고 faces는 null로 둔다.
alter table postings add column bytes_orig  integer not null default 0;
alter table postings add column bytes_light integer not null default 0;
alter table postings add column faces       jsonb;

-- 배치도(center-map)와 동일한 구조: 비공개 버킷 + 서명 URL. 공개 접근이 전혀 없다(사양서 1·5장).
insert into storage.buckets (id, name, public)
values ('posting-images', 'posting-images', false)
on conflict (id) do nothing;

create policy posting_images_select on storage.objects
  for select using (bucket_id = 'posting-images' and is_staff());

create policy posting_images_insert on storage.objects
  for insert with check (bucket_id = 'posting-images' and is_editor());

create policy posting_images_update on storage.objects
  for update using (bucket_id = 'posting-images' and is_editor())
  with check (bucket_id = 'posting-images' and is_editor());

create policy posting_images_delete on storage.objects
  for delete using (bucket_id = 'posting-images' and is_editor());
