
-- ============ Extend brands with socials + badges (idempotent) ============
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS socials jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS display_badges text[] NOT NULL DEFAULT '{}';

-- ============ rooms ============
CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('corridor','brand_room')),
  floor integer NOT NULL DEFAULT 1,
  order_index integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  panorama_url text NOT NULL,
  brand_id uuid NULL REFERENCES public.brands(id) ON DELETE SET NULL,
  next_room_id uuid NULL REFERENCES public.rooms(id) ON DELETE SET NULL,
  prev_room_id uuid NULL REFERENCES public.rooms(id) ON DELETE SET NULL,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rooms TO anon, authenticated;
GRANT ALL ON public.rooms TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rooms_public_read" ON public.rooms;
CREATE POLICY "rooms_public_read" ON public.rooms FOR SELECT USING (is_published = true);
DROP POLICY IF EXISTS "rooms_admin_write" ON public.rooms;
CREATE POLICY "rooms_admin_write" ON public.rooms FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
DROP TRIGGER IF EXISTS trg_rooms_touch ON public.rooms;
CREATE TRIGGER trg_rooms_touch BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ hotspots ============
CREATE TABLE IF NOT EXISTS public.hotspots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('nav','garmentInfo','brandWall')),
  yaw double precision NOT NULL DEFAULT 0,
  pitch double precision NOT NULL DEFAULT 0,
  label text NULL,
  target_room_id uuid NULL REFERENCES public.rooms(id) ON DELETE SET NULL,
  garment_id uuid NULL REFERENCES public.pieces(id) ON DELETE CASCADE,
  brand_id uuid NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  featured boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hotspots TO anon, authenticated;
GRANT ALL ON public.hotspots TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.hotspots TO authenticated;
ALTER TABLE public.hotspots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hotspots_public_read" ON public.hotspots;
CREATE POLICY "hotspots_public_read" ON public.hotspots FOR SELECT USING (true);
DROP POLICY IF EXISTS "hotspots_admin_write" ON public.hotspots;
CREATE POLICY "hotspots_admin_write" ON public.hotspots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
DROP TRIGGER IF EXISTS trg_hotspots_touch ON public.hotspots;
CREATE TRIGGER trg_hotspots_touch BEFORE UPDATE ON public.hotspots
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_hotspots_room ON public.hotspots(room_id);
CREATE INDEX IF NOT EXISTS idx_rooms_floor_order ON public.rooms(floor, order_index);

-- ============ brand score recompute ============
CREATE OR REPLACE FUNCTION public.recompute_brand_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.brands b SET rank_score =
    (COALESCE(b.sales_total,0) / NULLIF((SELECT MAX(sales_total) FROM public.brands),0) * 50)
    + (COALESCE(b.satisfaction_score,0) * 30)
    + (COALESCE(b.recent_activity_score,0) / NULLIF((SELECT MAX(recent_activity_score) FROM public.brands),0) * 20);
END;
$$;
-- TODO: schedule via pg_cron at 00:00 — SELECT cron.schedule('brand_scores','0 0 * * *','SELECT public.recompute_brand_scores();');
