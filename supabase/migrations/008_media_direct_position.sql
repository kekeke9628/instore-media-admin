-- 지점(spots) 레이어를 제거하고, 매체(media)가 직접 좌표와 구역을 갖도록 전환한다.
-- 배경: 낱개 매체를 지도에 각각 표시하고(유형 아이콘), 자유롭게 추가·삭제·이동하기 위함.

alter table media add column x numeric(5,2);
alter table media add column y numeric(5,2);
alter table media add column zone text;

-- 기존 spots 위치로 백필한다. 같은 지점에 여러 매체가 있던 경우 겹치지 않도록 격자로 살짝 퍼뜨린다.
with ranked as (
  select id, spot_id, row_number() over (partition by spot_id order by id) - 1 as idx
  from media
)
update media m
set x = s.x + (r.idx % 4) * 1.5 - 2.25,
    y = s.y + (r.idx / 4) * 1.5 - 1.5,
    zone = s.zone
from spots s, ranked r
where m.spot_id = s.id and m.id = r.id;

alter table media alter column x set not null;
alter table media alter column y set not null;
alter table media alter column zone set not null;
alter table media add constraint media_zone_check
  check (zone in ('EAST_LOW','EAST_HIGH','WEST_LOW','WEST_MIDDLE','WEST_HIGH'));

-- v_media_state를 지점 조인 없이 media 컬럼만으로 먼저 재작성해 spot_id 의존성을 없앤다
-- (그래야 media.spot_id 컬럼과 spots 테이블을 뒤에서 안전하게 지울 수 있다).
-- 컬럼 구성이 바뀌므로 create or replace 대신 drop 후 새로 만든다.
drop view v_media_state;
create view v_media_state as
with t as (select (now() at time zone 'Asia/Seoul')::date as d),
cur  as (select distinct on (media_id) * from v_posting_status
         where status='live'     order by media_id, start_date desc),
opn  as (select distinct on (media_id) * from v_posting_status
         where status='open'     order by media_id, start_date desc),
ovd  as (select distinct on (media_id) * from v_posting_status
         where status='overdue'  order by media_id, end_date  desc),
nxt  as (select distinct on (media_id) * from v_posting_status
         where status='upcoming' order by media_id, start_date asc),
rm   as (select distinct on (media_id) * from v_posting_status
         where removed_at is not null order by media_id, removed_at desc)
select
  m.id, m.type, m.name,
  m.zone, m.x, m.y,
  cur.id as current_id, cur.title as current_title, cur.end_date as remove_due,
  (cur.end_date - t.d) as d_to_remove,
  opn.id as open_id, opn.title as open_title,
  (t.d - opn.start_date) as open_days,
  ovd.id as overdue_id, ovd.title as overdue_title, ovd.end_date as overdue_due,
  (t.d - ovd.end_date) as overdue_days,
  nxt.id as next_id, nxt.brand as next_brand, nxt.start_date as next_start,
  (cur.id is null and opn.id is null and ovd.id is null) as is_empty,
  case when cur.id is null and opn.id is null and ovd.id is null
       then (t.d - rm.removed_at) end as empty_days
from media m
cross join t
left join cur on cur.media_id = m.id
left join opn on opn.media_id = m.id
left join ovd on ovd.media_id = m.id
left join nxt on nxt.media_id = m.id
left join rm  on rm.media_id  = m.id
where m.active;

-- create or replace가 security_invoker 설정을 보존하는지 확실치 않으므로 명시적으로 다시 지정한다
-- (005_security_fixes.sql에서 이미 적용했던 RLS 우회 방지 설정).
alter view v_media_state set (security_invoker = true);

grant select on v_media_state to authenticated;
revoke all on v_media_state from anon;

-- 뷰가 더 이상 spot_id를 참조하지 않으므로 이제 안전하게 지울 수 있다.
alter table media drop column spot_id;
drop table spots cascade;
