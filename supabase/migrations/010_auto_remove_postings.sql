-- 사양서 4.2 — 자동 철거 처리. 지류 매체라 후속 게시물이 시작됐다면 이전 게시물은
-- 반드시 철거된 것이다. removed_at이 비어 있는 건 현장 문제가 아니라 기록 누락이므로
-- 시스템이 자동으로 채운다(사람에게 알리지 않는다). 일 1회 크론이 알람 조회 직전에 호출한다.
create or replace function auto_remove_superseded_postings()
returns void language sql security definer as $$
  update postings p
  set    removed_at = n.start_date,
         removal_source = 'auto',
         updated_at = now()
  from   postings n
  where  p.removed_at is null
    and  n.media_id = p.media_id
    and  n.start_date > p.start_date
    and  n.start_date <= (now() at time zone 'Asia/Seoul')::date
    and  not exists (              -- 바로 다음 게시물만
           select 1 from postings x
           where x.media_id = p.media_id
             and x.start_date > p.start_date and x.start_date < n.start_date);
$$;

-- 크론에서 service_role로만 호출한다 — 일반 사용자(anon/authenticated)에게는 실행 권한을 주지 않는다.
revoke execute on function auto_remove_superseded_postings() from public, anon, authenticated;
