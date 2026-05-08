-- Slipstream MVP — Cycle 2: profile auto-create trigger
-- On auth.users INSERT, create a profiles row. Role pulled from raw_user_meta_data.role
-- (set during signUp via lib/actions/auth.ts or admin.createUser({ user_metadata }).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text := coalesce(new.raw_user_meta_data->>'role', 'broker');
  resolved_role user_role;
begin
  -- defensive cast; default to broker if role is unexpected
  begin
    resolved_role := meta_role::user_role;
  exception when invalid_text_representation then
    resolved_role := 'broker'::user_role;
  end;

  insert into public.profiles (id, email, full_name, org_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'org_name',
    resolved_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
