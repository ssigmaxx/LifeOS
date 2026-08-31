-- Splits the flat monthly budget into an explicit weekly plan vs. monthly
-- max per category (a category can have either, both, or neither), and adds
-- purchase mode (online/offline) + condition (new/secondhand) to expense
-- logs for more granular tracking. Both new log columns are nullable —
-- existing rows stay valid with no backfill.

alter table public.budgets
  drop constraint budgets_user_id_category_key;

alter table public.budgets
  add column period text not null default 'month' check (period in ('week', 'month'));

alter table public.budgets
  add constraint budgets_user_id_category_period_key unique (user_id, category, period);

alter table public.carbon_purchase_logs
  add column purchase_mode text check (purchase_mode in ('online', 'offline')),
  add column condition text check (condition in ('new', 'secondhand'));
