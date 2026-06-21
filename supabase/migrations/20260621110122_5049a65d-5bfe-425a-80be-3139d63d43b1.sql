
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('visiteur','createur_en_attente','createur_valide','admin','super_admin');
CREATE TYPE public.musee_category AS ENUM ('vetements','art','livres');

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profils visibles par tous les authentifiés"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Modifier son propre profil"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Créer son propre profil"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- =========================================================
-- USER ROLES (séparé, security definer pour éviter récursion)
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lire ses propres rôles"
  ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- =========================================================
-- BADGES (catalogue + attributions)
-- =========================================================
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badges TO anon, authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges publics"
  ON public.badges FOR SELECT TO anon, authenticated USING (true);

-- =========================================================
-- BRANDS (marques) — catégorie générique pour extension future
-- =========================================================
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category public.musee_category NOT NULL DEFAULT 'vetements',
  tagline TEXT,
  bio TEXT,
  history TEXT,
  logo_url TEXT,
  cover_url TEXT,
  website_url TEXT,
  instagram_handle TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_founder BOOLEAN NOT NULL DEFAULT false,
  level INT NOT NULL DEFAULT 1,
  -- Stats brutes pour le classement (50% ventes, 30% satisfaction, 20% activité)
  sales_total NUMERIC NOT NULL DEFAULT 0,
  satisfaction_score NUMERIC NOT NULL DEFAULT 0,
  recent_activity_score NUMERIC NOT NULL DEFAULT 0,
  rank_score NUMERIC GENERATED ALWAYS AS (
    (sales_total * 0.5) + (satisfaction_score * 0.3) + (recent_activity_score * 0.2)
  ) STORED,
  followers_count INT NOT NULL DEFAULT 0,
  collections_count INT NOT NULL DEFAULT 0,
  joined_museum_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brands TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Marques publiées visibles par tous"
  ON public.brands FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "Propriétaire gère sa marque"
  ON public.brands FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE INDEX brands_rank_idx ON public.brands (category, rank_score DESC);

-- =========================================================
-- BRAND BADGES (M:N)
-- =========================================================
CREATE TABLE public.brand_badges (
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (brand_id, badge_id)
);
GRANT SELECT ON public.brand_badges TO anon, authenticated;
GRANT ALL ON public.brand_badges TO service_role;
ALTER TABLE public.brand_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brand badges publics"
  ON public.brand_badges FOR SELECT TO anon, authenticated USING (true);

-- =========================================================
-- COLLECTIONS (structure prête)
-- =========================================================
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  season TEXT,
  released_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.collections TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Collections publiques"
  ON public.collections FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Propriétaire de marque gère ses collections"
  ON public.collections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_id = auth.uid()));

-- =========================================================
-- PIECES (oeuvres / vêtements) — structure prête pour V1.1
-- =========================================================
CREATE TABLE public.pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL,
  category public.musee_category NOT NULL DEFAULT 'vetements',
  name TEXT NOT NULL,
  description TEXT,
  story TEXT,
  photos TEXT[] NOT NULL DEFAULT '{}',
  edition_size INT,
  price_cents INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  sizes TEXT[] NOT NULL DEFAULT '{}',
  stock_quantity INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pieces TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pieces TO authenticated;
GRANT ALL ON public.pieces TO service_role;
ALTER TABLE public.pieces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pieces publiées visibles par tous"
  ON public.pieces FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "Propriétaire de marque gère ses pièces"
  ON public.pieces FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_id = auth.uid()));

-- =========================================================
-- FOLLOWS (suivi des marques)
-- =========================================================
CREATE TABLE public.follows (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, brand_id)
);
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Voir ses propres suivis"
  ON public.follows FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Suivre une marque"
  ON public.follows FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Ne plus suivre"
  ON public.follows FOR DELETE TO authenticated USING (user_id = auth.uid());

-- =========================================================
-- GUESTBOOK (Livre d'Or par marque)
-- =========================================================
CREATE TABLE public.guestbook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.guestbook_entries TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.guestbook_entries TO authenticated;
GRANT ALL ON public.guestbook_entries TO service_role;
ALTER TABLE public.guestbook_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Entrées visibles publiquement"
  ON public.guestbook_entries FOR SELECT TO anon, authenticated USING (is_hidden = false);
CREATE POLICY "Écrire dans le Livre d'Or (connecté)"
  ON public.guestbook_entries FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Supprimer son entrée"
  ON public.guestbook_entries FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Modérer (admin)"
  ON public.guestbook_entries FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE INDEX guestbook_brand_idx ON public.guestbook_entries (brand_id, created_at DESC);

-- =========================================================
-- TRIGGER: créer profil + rôle visiteur à l'inscription
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'visiteur');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- TRIGGER: updated_at sur brands
-- =========================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER brands_touch BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
