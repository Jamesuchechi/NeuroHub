-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- SNIPPETS
-- ─────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE snippet_visibility AS ENUM ('private', 'workspace', 'public');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

create table if not exists snippets (
  id            uuid primary key default uuid_generate_v4(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  description   text,
  code          text not null,
  language      text not null default 'javascript',
  tags          text[] not null default '{}',
  visibility    snippet_visibility not null default 'workspace',
  parent_id     uuid references snippets(id) on delete set null,
  fork_count    integer not null default 0,
  star_count    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists snippets_workspace_id_idx on snippets(workspace_id);
create index if not exists snippets_author_id_idx on snippets(author_id);
create index if not exists snippets_parent_id_idx on snippets(parent_id);
create index if not exists snippets_tags_gin_idx on snippets using gin(tags);
create index if not exists snippets_language_idx on snippets(language);

-- Full-text search index
do $$ begin
  alter table snippets add column fts tsvector
    generated always as (
      to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(code,''))
    ) stored;
exception
  when duplicate_column then null;
end $$;

create index if not exists snippets_fts_idx on snippets using gin(fts);

-- ─────────────────────────────────────────
-- SNIPPET STARS
-- ─────────────────────────────────────────
create table if not exists snippet_stars (
  snippet_id  uuid not null references snippets(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  starred_at  timestamptz not null default now(),
  primary key (snippet_id, user_id)
);

-- ─────────────────────────────────────────
-- API TESTS
-- ─────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE http_method AS ENUM ('GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

create table if not exists api_tests (
  id             uuid primary key default uuid_generate_v4(),
  workspace_id   uuid not null references workspaces(id) on delete cascade,
  author_id      uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  method         http_method not null default 'GET',
  url            text not null,
  headers        jsonb not null default '{}',
  body           text,
  last_response  jsonb,
  last_run_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists api_tests_workspace_id_idx on api_tests(workspace_id);
create index if not exists api_tests_author_id_idx on api_tests(author_id);

-- ─────────────────────────────────────────
-- API ENVIRONMENT VARIABLES
-- ─────────────────────────────────────────
create table if not exists api_environments (
  id            uuid primary key default uuid_generate_v4(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  name          text not null,
  variables     jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create index if not exists api_envs_workspace_id_idx on api_environments(workspace_id);

-- ─────────────────────────────────────────
-- UPDATED_AT TRIGGERS
-- ─────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists snippets_updated_at on snippets;
create trigger snippets_updated_at before update on snippets
  for each row execute function update_updated_at();

drop trigger if exists api_tests_updated_at on api_tests;
create trigger api_tests_updated_at before update on api_tests
  for each row execute function update_updated_at();

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
alter table snippets enable row level security;
alter table snippet_stars enable row level security;
alter table api_tests enable row level security;
alter table api_environments enable row level security;

-- Snippets: workspace members can read workspace/public snippets; authors manage own
drop policy if exists "snippets_select" on snippets;
create policy "snippets_select" on snippets for select using (
  visibility = 'public'
  or (
    visibility = 'workspace'
    and exists (
      select 1 from workspace_members
      where workspace_id = snippets.workspace_id
      and user_id = auth.uid()
    )
  )
  or author_id = auth.uid()
);

drop policy if exists "snippets_insert" on snippets;
create policy "snippets_insert" on snippets for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from workspace_members
      where workspace_id = snippets.workspace_id
      and user_id = auth.uid()
    )
  );

drop policy if exists "snippets_update" on snippets;
create policy "snippets_update" on snippets for update
  using (author_id = auth.uid());

drop policy if exists "snippets_delete" on snippets;
create policy "snippets_delete" on snippets for delete
  using (author_id = auth.uid());

-- Stars: any authenticated member can star
drop policy if exists "stars_select" on snippet_stars;
create policy "stars_select" on snippet_stars for select using (true);
drop policy if exists "stars_insert" on snippet_stars;
create policy "stars_insert" on snippet_stars for insert with check (auth.uid() = user_id);
drop policy if exists "stars_delete" on snippet_stars;
create policy "stars_delete" on snippet_stars for delete using (auth.uid() = user_id);

-- API tests: workspace members only
drop policy if exists "api_tests_select" on api_tests;
create policy "api_tests_select" on api_tests for select using (
  exists (
    select 1 from workspace_members
    where workspace_id = api_tests.workspace_id
    and user_id = auth.uid()
  )
);
drop policy if exists "api_tests_insert" on api_tests;
create policy "api_tests_insert" on api_tests for insert
  with check (auth.uid() = author_id);

drop policy if exists "api_tests_update" on api_tests;
create policy "api_tests_update" on api_tests for update
  using (author_id = auth.uid());

drop policy if exists "api_tests_delete" on api_tests;
create policy "api_tests_delete" on api_tests for delete
  using (author_id = auth.uid());

-- Environments: workspace members read, authors write
drop policy if exists "envs_select" on api_environments;
create policy "envs_select" on api_environments for select using (
  exists (
    select 1 from workspace_members
    where workspace_id = api_environments.workspace_id
    and user_id = auth.uid()
  )
);
drop policy if exists "envs_insert" on api_environments;
create policy "envs_insert" on api_environments for insert with check (true);
drop policy if exists "envs_update" on api_environments;
create policy "envs_update" on api_environments for update using (true);
drop policy if exists "envs_delete" on api_environments;
create policy "envs_delete" on api_environments for delete using (true);

-- ─────────────────────────────────────────
-- STAR COUNT SYNC FUNCTION
-- ─────────────────────────────────────────
create or replace function sync_star_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update snippets set star_count = star_count + 1 where id = NEW.snippet_id;
  elsif TG_OP = 'DELETE' then
    update snippets set star_count = greatest(0, star_count - 1) where id = OLD.snippet_id;
  end if;
  return null;
end;
$$;

drop trigger if exists snippet_stars_count on snippet_stars;
create trigger snippet_stars_count
after insert or delete on snippet_stars
for each row execute function sync_star_count();

-- Fork count sync
create or replace function sync_fork_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' and NEW.parent_id is not null then
    update snippets set fork_count = fork_count + 1 where id = NEW.parent_id;
  end if;
  return null;
end;
$$;

drop trigger if exists snippet_fork_count on snippets;
create trigger snippet_fork_count
after insert on snippets
for each row execute function sync_fork_count();
