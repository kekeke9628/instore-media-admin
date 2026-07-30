-- 사양서 3장 — 데이터 모델
create extension if not exists btree_gist;

-- 3.1 media_types (매체 유형)
create table media_types (
  code         text primary key,
  label        text not null,
  default_spec text,
  faces        int  not null default 1,        -- 면수
  glyph        text not null default '▪',      -- 지도·카드에 쓰는 아이콘(이모지/기호)
  color        text not null,
  movable      boolean not null default false,
  open_ended   boolean not null default false,
  sort_order   int  not null default 0,
  active       boolean not null default true
);

-- 3.2 spots (지점) — 구역은 5개로 고정
create table spots (
  id         text primary key,
  name       text not null,
  zone       text not null check (zone in ('EAST_LOW','EAST_HIGH','WEST_LOW','WEST_MIDDLE','WEST_HIGH')),
  x          numeric(5,2) not null,
  y          numeric(5,2) not null,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.3 media (매체)
create table media (
  id         text primary key,
  spot_id    text not null references spots(id),
  type       text not null references media_types(code),
  name       text not null,
  faces      int  not null default 1,     -- 유형 기본값을 불러오되 개별 조정 가능
  spec       text,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on media (spot_id);

-- 3.4 postings (게시물) — 승인 절차가 없으므로 게시건과 시안을 하나의 테이블로 합친다
create table postings (
  id                 uuid primary key default gen_random_uuid(),
  media_id           text not null references media(id),
  brand              text not null,        -- 업체명 (필수)
  title              text,                 -- 내용 (선택 — 비어 있으면 화면에서 brand로 표시)
  start_date         date not null,        -- 게시 예정일
  end_date           date,                 -- 철거 예정일. null = 종료일 미정(미정 상태)
  removed_at         date,                 -- 실제 철거일
  removal_source     text check (removal_source in ('manual','auto')),
  thumb_path         text,
  view_path          text,
  origin_url         text,                 -- 구글드라이브 원본 링크
  install_photo_path text,
  created_by         uuid references auth.users(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (end_date >= start_date)
);
create index on postings (media_id, start_date);
create index on postings (end_date) where removed_at is null;

-- 같은 매체에 기간이 겹치는 게시물은 물리적으로 존재할 수 없다 — DB 제약으로 강제
alter table postings add constraint postings_no_overlap
  exclude using gist (
    media_id with =,
    -- 종료일 미정(null)이면 무한대로 취급해 이후 게시물과 겹치지 않게 한다
    daterange(start_date, end_date, '[]') with &&
  );

-- 3.5 admins (허용 직원)
create table admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text,
  role       text not null default 'editor' check (role in ('editor','viewer')),
  created_at timestamptz not null default now()
);
