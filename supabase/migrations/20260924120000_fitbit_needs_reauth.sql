-- Tracks whether a Fitbit/Google Health connection's refresh token has
-- died (Google returns invalid_grant — most commonly the 7-day forced
-- refresh-token expiry Google applies to OAuth apps still in "Testing"
-- publishing status). Previously the row just sat there looking connected
-- forever, so Settings kept claiming "Connected" while sync silently failed
-- every 4 hours.
alter table fitbit_connections
  add column needs_reauth boolean not null default false;
