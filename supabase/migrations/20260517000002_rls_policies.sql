alter table public.users enable row level security;
create policy "users: 自分のレコードのみ読取可" on public.users for select using (auth.uid() = id);
create policy "users: 自分のレコードのみ更新可" on public.users for update using (auth.uid() = id);

alter table public.artists enable row level security;
create policy "artists: 自分の推しのみ読取可" on public.artists for select using (auth.uid() = user_id);
create policy "artists: 自分の推しのみ作成可" on public.artists for insert with check (auth.uid() = user_id);
create policy "artists: 自分の推しのみ更新可" on public.artists for update using (auth.uid() = user_id);
create policy "artists: 自分の推しのみ削除可" on public.artists for delete using (auth.uid() = user_id);

alter table public.venues enable row level security;
create policy "venues: 全ユーザー読取可" on public.venues for select using (true);

alter table public.plans enable row level security;
create policy "plans: 自分のプランのみ読取可" on public.plans for select using (auth.uid() = user_id);
create policy "plans: share_token 匿名読取可" on public.plans for select
  using (share_token is not null and share_token = current_setting('request.jwt.claims', true)::jsonb ->> 'share_token');
create policy "plans: 誰でも作成可" on public.plans for insert
  with check ((auth.uid() is not null and auth.uid() = user_id) or (auth.uid() is null and user_id is null));
create policy "plans: 自分のプランのみ更新可" on public.plans for update using (auth.uid() = user_id);
create policy "plans: 自分のプランのみ削除可" on public.plans for delete using (auth.uid() = user_id);

alter table public.affiliate_clicks enable row level security;
create policy "affiliate_clicks: 誰でも INSERT 可" on public.affiliate_clicks for insert with check (true);

alter table public.plan_records enable row level security;
create policy "plan_records: 自分の記録のみ読取可" on public.plan_records for select using (auth.uid() = user_id);
create policy "plan_records: 自分の記録のみ作成可" on public.plan_records for insert with check (auth.uid() = user_id);
create policy "plan_records: 自分の記録のみ更新可" on public.plan_records for update using (auth.uid() = user_id);
create policy "plan_records: 自分の記録のみ削除可" on public.plan_records for delete using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
