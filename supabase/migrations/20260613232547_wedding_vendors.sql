-- Wedding vendor network (R-Q4-S-009) — Q4 multi-vendor onboarding
-- 65 verified vendors target: 30 photographers + 20 caterers + 15 decorators
-- Founder/sales-hire executes outreach; agent ships infra.

create table if not exists wedding_vendors (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  vendor_type text not null check (vendor_type in ('photographer','caterer','decorator')),
  service_city text,
  contact_phone text,
  instagram_handle text,
  gst_number text,
  portfolio_url text,
  verification_status text not null default 'pending' check (
    verification_status in ('pending','contacted','meeting','verified','onboarded','rejected')
  ),
  verified_at timestamptz,
  notes_for_outreach text,
  created_at timestamptz not null default now()
);

create index if not exists wedding_vendors_type_city_idx
  on wedding_vendors (vendor_type, service_city);

create index if not exists wedding_vendors_status_idx
  on wedding_vendors (verification_status);

-- RLS: admin-only writes; service_role bypass for seed scripts.
alter table wedding_vendors enable row level security;

drop policy if exists "wedding_vendors_admin_read" on wedding_vendors;
create policy "wedding_vendors_admin_read"
  on wedding_vendors for select
  using (
    exists (
      select 1 from "UserRoleAssignment"
      where "UserRoleAssignment"."userId" = auth.uid()::text
        and "UserRoleAssignment".role = 'admin'
    )
  );

drop policy if exists "wedding_vendors_admin_write" on wedding_vendors;
create policy "wedding_vendors_admin_write"
  on wedding_vendors for all
  using (
    exists (
      select 1 from "UserRoleAssignment"
      where "UserRoleAssignment"."userId" = auth.uid()::text
        and "UserRoleAssignment".role = 'admin'
    )
  );

comment on table wedding_vendors is
  'R-Q4-S-009 — Wedding ecosystem vendor pipeline. 65 target verified across photog/cater/decor.';
