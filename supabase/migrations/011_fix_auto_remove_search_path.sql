-- security advisor: function_search_path_mutable — SECURITY DEFINER 함수는 search_path를
-- 고정해야 search_path 하이재킹을 막을 수 있다.
alter function auto_remove_superseded_postings() set search_path = public;
