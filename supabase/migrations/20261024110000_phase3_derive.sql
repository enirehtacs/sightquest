-- Phase 3: fill in a route's search facts from what the builder adds, so new
-- routes show up properly in Explore and Search without extra questions:
--   continent      from the first country code
--   went_month/year from the start date (the public month you went)
--   best_months    the month you went, until the creator says otherwise
--   modes          every way of getting around used in the legs
--   distance_km    the straight-line distance from day to day

create or replace function public.route_derive()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.country_codes is distinct from coalesce(old.country_codes, '{}') or new.continent is null then
    new.continent := coalesce(
      (select c.continent from public.countries c where c.code = new.country_codes[1]),
      new.continent);
  end if;
  if new.start_date is not null and (tg_op = 'INSERT' or new.start_date is distinct from old.start_date) then
    new.went_month := extract(month from new.start_date)::smallint;
    new.went_year := extract(year from new.start_date)::smallint;
  end if;
  if cardinality(new.best_months) = 0 and new.went_month is not null then
    new.best_months := array[new.went_month];
  end if;
  return new;
end;
$$;

-- `old` is null on insert; plpgsql is fine with that inside coalesce.
create trigger routes_derive
  before insert or update on public.routes
  for each row execute function public.route_derive();

-- Ways of getting around, from the legs.
create or replace function public.refresh_route_modes(p_route uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.routes r set modes = coalesce((
    select array_agg(distinct l.mode order by l.mode)
    from public.legs l join public.days d on d.id = l.day_id
    where d.route_id = p_route
      and l.mode in ('walk','bicycle','moto','bus','train','boat','plane','hitch','horse')
  ), '{}')
  where r.id = p_route;
$$;

create or replace function public.legs_refresh_modes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_route_modes(public.day_route(coalesce(new.day_id, old.day_id)));
  return null;
end;
$$;

create trigger legs_refresh_modes
  after insert or update of mode or delete on public.legs
  for each row execute function public.legs_refresh_modes();

-- Distance: day to day, as the crow flies (exact pins, not the blurred ones).
create or replace function public.refresh_route_distance(p_route uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.routes r set distance_km = (
    select round(coalesce(sum(public.km_between(a.lat, a.lng, b.lat, b.lng)), 0)::numeric, 1)
    from (
      select coalesce(stay_lat, lat) lat, coalesce(stay_lng, lng) lng,
             lead(coalesce(stay_lat, lat)) over (order by day_number) nlat,
             lead(coalesce(stay_lng, lng)) over (order by day_number) nlng
      from public.days where route_id = p_route and lat is not null
    ) a
    cross join lateral (select a.nlat lat, a.nlng lng) b
    where b.lat is not null)
  where r.id = p_route;
$$;

create or replace function public.days_refresh_distance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_route_distance(coalesce(new.route_id, old.route_id));
  return null;
end;
$$;

create trigger days_refresh_distance
  after insert or update of lat, lng, day_number or delete on public.days
  for each row execute function public.days_refresh_distance();

revoke all on function public.refresh_route_modes(uuid) from public, anon, authenticated;
revoke all on function public.refresh_route_distance(uuid) from public, anon, authenticated;
