
-- Wipe old visite data (rebuild from scratch with new structure)
DELETE FROM public.hotspots;
DELETE FROM public.rooms;

-- Rooms: add slug, change kind, drop brand_id
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE public.rooms DROP COLUMN IF EXISTS brand_id;
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_kind_check;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_kind_check CHECK (kind IN ('entrance','corridor','salle'));

-- Hotspots: add slot_index, subtype
ALTER TABLE public.hotspots ADD COLUMN IF NOT EXISTS slot_index integer;
ALTER TABLE public.hotspots ADD COLUMN IF NOT EXISTS subtype text;

-- New table linking brands to a salle slot
CREATE TABLE IF NOT EXISTS public.salle_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salle_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  slot_index integer NOT NULL CHECK (slot_index BETWEEN 0 AND 5),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (salle_id, slot_index)
);

GRANT SELECT ON public.salle_brands TO anon, authenticated;
GRANT ALL ON public.salle_brands TO service_role;
ALTER TABLE public.salle_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read salle_brands" ON public.salle_brands FOR SELECT USING (true);
CREATE POLICY "Admin write salle_brands" ON public.salle_brands FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed: entrée → couloir → salle-1
WITH ins AS (
  INSERT INTO public.rooms (slug, kind, floor, order_index, title, panorama_url, is_published)
  VALUES
    ('entree-escalier', 'entrance', 1, 0, 'Entrée', 'pano-entree', true),
    ('couloir-etage-1', 'corridor', 1, 1, 'Couloir des Créateurs', 'pano-couloir', true),
    ('salle-1',          'salle',    1, 2, 'Salle 1',               'pano-salle',   true)
  RETURNING id, slug
),
linked AS (
  UPDATE public.rooms r
  SET next_room_id = nxt.id, prev_room_id = prv.id
  FROM ins r2
  LEFT JOIN ins nxt ON
    (r2.slug = 'entree-escalier' AND nxt.slug = 'couloir-etage-1') OR
    (r2.slug = 'couloir-etage-1' AND nxt.slug = 'salle-1')
  LEFT JOIN ins prv ON
    (r2.slug = 'couloir-etage-1' AND prv.slug = 'entree-escalier') OR
    (r2.slug = 'salle-1' AND prv.slug = 'couloir-etage-1')
  WHERE r.id = r2.id
  RETURNING r.id
)
SELECT 1;

-- Nav hotspots
INSERT INTO public.hotspots (room_id, type, yaw, pitch, label, target_room_id, order_index)
SELECT r.id, 'nav', 0, -10, 'Entrer dans le musée', t.id, 0
FROM public.rooms r, public.rooms t
WHERE r.slug = 'entree-escalier' AND t.slug = 'couloir-etage-1';

INSERT INTO public.hotspots (room_id, type, yaw, pitch, label, target_room_id, order_index)
SELECT r.id, 'nav', 0, -10, 'Entrer en Salle 1', t.id, 0
FROM public.rooms r, public.rooms t
WHERE r.slug = 'couloir-etage-1' AND t.slug = 'salle-1';

INSERT INTO public.hotspots (room_id, type, yaw, pitch, label, target_room_id, order_index)
SELECT r.id, 'nav', 180, -10, 'Retour au couloir', t.id, 99
FROM public.rooms r, public.rooms t
WHERE r.slug = 'salle-1' AND t.slug = 'couloir-etage-1';

INSERT INTO public.hotspots (room_id, type, yaw, pitch, label, target_room_id, order_index)
SELECT r.id, 'nav', 180, -10, 'Retour à l''entrée', t.id, 99
FROM public.rooms r, public.rooms t
WHERE r.slug = 'couloir-etage-1' AND t.slug = 'entree-escalier';

-- Populate salle-1 with 6 slots: 2 demo (real brands) + 4 empty
INSERT INTO public.salle_brands (salle_id, brand_id, slot_index, is_demo)
SELECT
  (SELECT id FROM public.rooms WHERE slug = 'salle-1'),
  b.id,
  ROW_NUMBER() OVER (ORDER BY b.rank_score DESC NULLS LAST) - 1,
  true
FROM public.brands b
WHERE b.is_verified = true OR b.rank_score > 0
ORDER BY b.rank_score DESC NULLS LAST
LIMIT 2;

-- Add 4 empty slots
INSERT INTO public.salle_brands (salle_id, brand_id, slot_index, is_demo)
SELECT
  (SELECT id FROM public.rooms WHERE slug = 'salle-1'),
  NULL,
  gs,
  false
FROM generate_series(2, 5) gs;

-- Brand wall hotspots for each slot (yaw spaced around the room: -120, -60, 0, 60, 120, 180)
INSERT INTO public.hotspots (room_id, type, yaw, pitch, label, brand_id, slot_index, subtype, order_index)
SELECT
  sb.salle_id,
  'brandWall',
  (-120 + sb.slot_index * 60)::numeric,
  5,
  'Mur de la marque',
  sb.brand_id,
  sb.slot_index,
  'wall',
  10 + sb.slot_index
FROM public.salle_brands sb
WHERE sb.salle_id = (SELECT id FROM public.rooms WHERE slug = 'salle-1');

-- GarmentInfo hotspots for the 2 demo slots (use first piece of each brand)
INSERT INTO public.hotspots (room_id, type, yaw, pitch, label, garment_id, brand_id, slot_index, subtype, order_index)
SELECT
  sb.salle_id,
  'garmentInfo',
  (-120 + sb.slot_index * 60 - 15)::numeric,
  -5,
  'Vêtement',
  p.id,
  sb.brand_id,
  sb.slot_index,
  'mannequin',
  20 + sb.slot_index
FROM public.salle_brands sb
JOIN LATERAL (
  SELECT id FROM public.pieces WHERE brand_id = sb.brand_id LIMIT 1
) p ON true
WHERE sb.is_demo = true AND sb.brand_id IS NOT NULL;
