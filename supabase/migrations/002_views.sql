-- 사양서 4.4 — 상태는 저장하지 않고 날짜에서 계산한다
create or replace view v_posting_status as
select p.*,
  case
    when p.removed_at is not null then 'removed'
    when p.start_date > (now() at time zone 'Asia/Seoul')::date then 'upcoming'
    when p.end_date is null then 'open'                                       -- 미정
    when p.end_date < (now() at time zone 'Asia/Seoul')::date then 'overdue'  -- 만료
    else 'live'
  end as status
from postings p;

create or replace view v_media_state as
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
  m.id, m.spot_id, m.type, m.name,
  s.zone, s.name as spot_name, s.x, s.y,
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
join spots s on s.id = m.spot_id
left join cur on cur.media_id = m.id
left join opn on opn.media_id = m.id
left join ovd on ovd.media_id = m.id
left join nxt on nxt.media_id = m.id
left join rm  on rm.media_id  = m.id
where m.active and s.active;
