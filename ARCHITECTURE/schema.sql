-- Sync Blogs V1 schema draft
-- Last updated: February 27, 2026

create extension if not exists "pgcrypto";

create table app_user (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);

create table post (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user(id) on delete cascade,
  title text not null,
  status text not null check (status in ('draft', 'published', 'archived')) default 'draft',
  visibility text not null check (visibility in ('private', 'public')) default 'private',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table post_revision (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references post(id) on delete cascade,
  revision_number int not null,
  content text not null,
  content_hash text not null,
  source text not null check (source in ('manual', 'generated', 'imported')),
  created_at timestamptz not null default now(),
  unique(post_id, revision_number)
);

create table draft_suggestion (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references post(id) on delete cascade,
  input_text text not null,
  mode text not null check (mode in ('argument', 'narrative', 'brief')),
  output_text text not null,
  style_profile_used boolean not null default true,
  created_at timestamptz not null default now()
);

create table persona (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user(id) on delete cascade,
  name text not null,
  role text not null,
  style text not null,
  prompt_template text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table review_run (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references post(id) on delete cascade,
  revision_id uuid not null references post_revision(id) on delete cascade,
  intensity text not null check (intensity in ('gentle', 'balanced', 'rigorous')),
  status text not null check (status in ('queued', 'running', 'completed', 'failed')) default 'queued',
  summary text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table review_item (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references review_run(id) on delete cascade,
  persona_id uuid not null references persona(id) on delete cascade,
  priority_bucket text not null check (priority_bucket in ('now', 'soon', 'optional')),
  issue text not null,
  suggestion text not null,
  evidence text,
  confidence numeric(4,3),
  action_status text not null check (action_status in ('open', 'accepted', 'dismissed', 'pinned')) default 'open',
  created_at timestamptz not null default now()
);

create table tracked_claim (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references post(id) on delete cascade,
  claim_text text not null,
  claim_type text not null check (claim_type in ('version', 'date', 'stat', 'policy', 'price', 'other')),
  volatility text not null check (volatility in ('high', 'medium', 'low')) default 'medium',
  monitoring_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table freshness_check (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references post(id) on delete cascade,
  checked_at timestamptz not null default now(),
  status text not null check (status in ('ok', 'drift_found', 'error')),
  details text
);

create table freshness_update (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references post(id) on delete cascade,
  check_id uuid not null references freshness_check(id) on delete cascade,
  severity text not null check (severity in ('low', 'medium', 'high')),
  confidence numeric(4,3) not null,
  suggested_action text not null check (suggested_action in ('notice', 'addendum', 'revision')),
  summary text not null,
  source_links jsonb not null default '[]'::jsonb,
  status text not null check (status in ('needs_review', 'approved', 'dismissed', 'snoozed')) default 'needs_review',
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now()
);

create table post_tag (
  post_id uuid not null references post(id) on delete cascade,
  tag text not null,
  primary key (post_id, tag)
);

create index idx_post_user_status on post(user_id, status);
create index idx_post_revision_post on post_revision(post_id, revision_number desc);
create index idx_draft_suggestion_post on draft_suggestion(post_id, created_at desc);
create index idx_review_run_post on review_run(post_id, created_at desc);
create index idx_review_item_run on review_item(run_id);
create index idx_freshness_update_status on freshness_update(status, severity, created_at desc);
