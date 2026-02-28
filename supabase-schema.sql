-- ЛДПР: схема базы данных Supabase
-- Выполните этот скрипт в Supabase: SQL Editor → New query → вставьте и Run

-- Пользователи (вход, роли: superadmin, admin, admin_pending, volunteer)
CREATE TABLE IF NOT EXISTS public.users (
  id text PRIMARY KEY,
  name text,
  login text,
  email text,
  password text,
  role text DEFAULT 'volunteer',
  avatar text,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- Волонтёры (список принятых волонтёров)
CREATE TABLE IF NOT EXISTS public.volunteers (
  id text PRIMARY KEY,
  user_id text,
  name text,
  phone text,
  email text,
  direction text,
  notes text,
  registered_at date,
  created_at timestamptz DEFAULT now()
);

-- Мероприятия
CREATE TABLE IF NOT EXISTS public.events (
  id text PRIMARY KEY,
  name text NOT NULL,
  date timestamptz,
  place text,
  description text,
  status text DEFAULT 'planned',
  image text,
  created_at timestamptz DEFAULT now()
);

-- Заявки на вступление в волонтёры
CREATE TABLE IF NOT EXISTS public.applications (
  id text PRIMARY KEY,
  user_id text,
  user_login text,
  name text,
  phone text,
  email text,
  direction text,
  message text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Заявки на участие в мероприятиях
CREATE TABLE IF NOT EXISTS public.event_participations (
  id text PRIMARY KEY,
  event_id text NOT NULL,
  user_id text,
  user_login text,
  user_name text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Включить RLS (Row Level Security), разрешить все операции для anon (для простоты; позже можно ограничить)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for volunteers" ON public.volunteers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for events" ON public.events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for applications" ON public.applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for event_participations" ON public.event_participations FOR ALL USING (true) WITH CHECK (true);
