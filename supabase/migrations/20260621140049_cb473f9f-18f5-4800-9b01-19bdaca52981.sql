
-- Display mode for pieces (cintre vs mannequin)
ALTER TABLE public.pieces
  ADD COLUMN IF NOT EXISTS display_mode text NOT NULL DEFAULT 'cintre'
    CHECK (display_mode IN ('cintre','mannequin'));

-- Suspension utilisateur (modération admin)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

-- Marquer 2 marques existantes en attente de validation pour visualiser le flow admin
UPDATE public.brands SET is_published = false WHERE slug IN ('voile-dorée','hermine-blanche');

-- Attribuer quelques badges à 4 marques de démo
WITH b AS (
  SELECT id, slug FROM public.brands WHERE slug IN ('maison-aurelia','atelier-noctis','sablier-couture','marbre-blanc')
),
bd AS (SELECT id, slug FROM public.badges)
INSERT INTO public.brand_badges (brand_id, badge_id)
SELECT b.id, bd.id FROM b JOIN bd ON (
  (b.slug='maison-aurelia'  AND bd.slug IN ('verified','founder','confirmed','sales_10')) OR
  (b.slug='atelier-noctis'  AND bd.slug IN ('verified','renowned','first_sale')) OR
  (b.slug='sablier-couture' AND bd.slug IN ('verified','master','sales_1000')) OR
  (b.slug='marbre-blanc'    AND bd.slug IN ('verified','legend','renowned','sales_1000'))
)
ON CONFLICT DO NOTHING;

-- Collections de démo
INSERT INTO public.collections (id, brand_id, name, season)
SELECT gen_random_uuid(), b.id, 'Collection capsule', 'AH26'
FROM public.brands b
WHERE b.slug IN ('maison-aurelia','atelier-noctis','sablier-couture','marbre-blanc')
ON CONFLICT DO NOTHING;

-- Pièces de démonstration (4 marques x 4 pièces, mix cintre/mannequin)
WITH b AS (SELECT id, slug FROM public.brands WHERE slug IN ('maison-aurelia','atelier-noctis','sablier-couture','marbre-blanc'))
INSERT INTO public.pieces (brand_id, name, description, story, photos, price_cents, currency, sizes, stock_quantity, display_mode, edition_size)
SELECT b.id, p.name, p.description, p.story, p.photos, p.price_cents, 'EUR', p.sizes, p.stock_quantity, p.display_mode, p.edition_size
FROM b
JOIN (VALUES
  ('maison-aurelia','Manteau Phébé','Manteau en laine vierge, coupe couture','Pièce inaugurale de la maison.','{https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=900}'::text[],89000,'{XS,S,M,L}'::text[],6,'mannequin',12),
  ('maison-aurelia','Veste Lumen','Veste structurée à boutons dorés','Hommage aux ateliers Place Vendôme.','{https://images.unsplash.com/photo-1520975922323-eb7d6ae8b1cf?w=900}'::text[],62000,'{S,M,L}'::text[],10,'cintre',NULL),
  ('maison-aurelia','Robe Soir 19h','Soie sauvage, ourlet biseauté','Édition Hiver — 24 numéros.','{https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=900}'::text[],138000,'{34,36,38,40}'::text[],8,'mannequin',24),
  ('maison-aurelia','Chemise Albâtre','Coton longues fibres, col italien','Atelier blanc, pièce signature.','{https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900}'::text[],24000,'{S,M,L,XL}'::text[],30,'cintre',NULL),

  ('atelier-noctis','Trench Obsidienne','Gabardine noire, doublure satin','Ligne d''ombre — capsule de nuit.','{https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=900}'::text[],95000,'{S,M,L}'::text[],5,'mannequin',8),
  ('atelier-noctis','Pantalon Astre','Tailoring fluide, taille haute','Coupe maison.','{https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=900}'::text[],32000,'{36,38,40,42}'::text[],14,'cintre',NULL),
  ('atelier-noctis','Pull Comète','Cachemire 2 fils, encolure ronde','Tricoté en Écosse.','{https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=900}'::text[],28000,'{XS,S,M,L,XL}'::text[],20,'cintre',NULL),
  ('atelier-noctis','Cape Lune Noire','Drap de laine, fermeture cuir','Pièce d''hiver, sur commande.','{https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=900}'::text[],152000,'{TU}'::text[],3,'mannequin',6),

  ('sablier-couture','Robe Heure Bleue','Mousseline plissée main','Atelier Sablier, 80h de couture.','{https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=900}'::text[],245000,'{34,36,38}'::text[],4,'mannequin',10),
  ('sablier-couture','Jupe Méridienne','Sergé de soie, taille corsetée','Coupe couture historique.','{https://images.unsplash.com/photo-1551803091-e20673f15770?w=900}'::text[],78000,'{34,36,38,40}'::text[],8,'cintre',NULL),
  ('sablier-couture','Blouse Aurore','Crêpe rosé, manches bouffantes','Pour les matins lumineux.','{https://images.unsplash.com/photo-1485518882345-15568b007407?w=900}'::text[],42000,'{XS,S,M,L}'::text[],12,'cintre',NULL),
  ('sablier-couture','Bustier Vespérale','Satin duchesse, baleines main','Pièce de gala — édition limitée.','{https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900}'::text[],168000,'{34,36,38}'::text[],5,'mannequin',15),

  ('marbre-blanc','Costume Carrare','Laine froide blanche, deux pièces','Inspiré des marbres italiens.','{https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=900}'::text[],185000,'{46,48,50,52}'::text[],7,'mannequin',20),
  ('marbre-blanc','Chemise Statuaire','Popeline ivoire, col cassé','Soirée d''ouverture.','{https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=900}'::text[],29000,'{S,M,L,XL}'::text[],25,'cintre',NULL),
  ('marbre-blanc','Manteau Galatée','Cachemire double face','Édition Mariée — 12 pièces.','{https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=900}'::text[],225000,'{S,M,L}'::text[],4,'mannequin',12),
  ('marbre-blanc','Pantalon Albe','Crêpe blanc, plis nets','Pièce de bureau couture.','{https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=900}'::text[],58000,'{36,38,40,42,44}'::text[],16,'cintre',NULL)
) AS p(brand_slug,name,description,story,photos,price_cents,sizes,stock_quantity,display_mode,edition_size)
  ON b.slug = p.brand_slug
WHERE NOT EXISTS (SELECT 1 FROM public.pieces ex WHERE ex.brand_id = b.id AND ex.name = p.name);
