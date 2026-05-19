-- daily_ai_used をインクリメントする RPC 関数
create or replace function public.increment_daily_ai_used(user_id_arg uuid)
returns void
language plpgsql
security definer
as $$
declare
  today date := current_date;
begin
  update public.users
  set
    daily_ai_used = coalesce(daily_ai_used, 0) + 1,
    daily_ai_reset_at = today
  where id = user_id_arg
    and (daily_ai_reset_at = today or daily_ai_reset_at is null);
end;
$$;
