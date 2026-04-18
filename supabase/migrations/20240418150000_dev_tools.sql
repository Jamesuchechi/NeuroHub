-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- SNIPPETS
-- ─────────────────────────────────────────
create type snippet_visibility as enum ('private', 'workspace', 'public');

create table snippets (
  id            uuid primary key default uuid_generate_v4(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  author_id     uuid not null references auth.users(id) on delete cascade,
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

create index on snippets(workspace_id);
create index on snippets(author_id);
create index on snippets(parent_id);
create index on snippets using gin(tags);
create index on snippets(language);

-- Full-text search index
alter table snippets add column fts tsvector
  generated always as (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(code,''))
  ) stored;
create index on snippets using gin(fts);

-- ─────────────────────────────────────────
-- SNIPPET STARS
-- ─────────────────────────────────────────
create table snippet_stars (
  snippet_id  uuid not null references snippets(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  starred_at  timestamptz not null default now(),
  primary key (snippet_id, user_id)
);

-- ─────────────────────────────────────────
-- API TESTS
-- ─────────────────────────────────────────
create type http_method as enum ('GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS');

create table api_tests (
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

create index on api_tests(workspace_id);
create index on api_tests(author_id);

-- ─────────────────────────────────────────
-- API ENVIRONMENT VARIABLES
-- ─────────────────────────────────────────
create table api_environments (
  id            uuid primary key default uuid_generate_v4(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  name          text not null,
  variables     jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create index on api_environments(workspace_id);

-- ─────────────────────────────────────────
-- UPDATED_AT TRIGGERS
-- ─────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger snippets_updated_at before update on snippets
  for each row execute function update_updated_at();

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

create policy "snippets_insert" on snippets for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from workspace_members
      where workspace_id = snippets.workspace_id
      and user_id = auth.uid()
    )
  );

create policy "snippets_update" on snippets for update
  using (author_id = auth.uid());

create policy "snippets_delete" on snippets for delete
  using (author_id = auth.uid());

-- Stars: any authenticated member can star
create policy "stars_select" on snippet_stars for select using (true);
create policy "stars_insert" on snippet_stars for insert with check (auth.uid() = user_id);
create policy "stars_delete" on snippet_stars for delete using (auth.uid() = user_id);

-- API tests: workspace members only
create policy "api_tests_select" on api_tests for select using (
  exists (
    select 1 from workspace_members
    where workspace_id = api_tests.workspace_id
    and user_id = auth.uid()
  )
);
create policy "api_tests_insert" on api_tests for insert
  with check (auth.uid() = author_id);
create policy "api_tests_update" on api_tests for update
  using (author_id = auth.uid());
create policy "api_tests_delete" on api_tests for delete
  using (author_id = auth.uid());

-- Environments: workspace members read, authors write
create policy "envs_select" on api_environments for select using (
  exists (
    select 1 from workspace_members
    where workspace_id = api_environments.workspace_id
    and user_id = auth.uid()
  )
);
create policy "envs_insert" on api_environments for insert with check (true);
create policy "envs_update" on api_environments for update using (true);
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

create trigger snippet_fork_count
after insert on snippets
for each row execute function sync_fork_count();
