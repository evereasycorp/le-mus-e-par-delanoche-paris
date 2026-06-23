
-- Wipe legacy hotspots & salle_brands (corridor doors and salle content are now dynamic)
DELETE FROM public.hotspots;
DELETE FROM public.salle_brands;

-- Nav: Hall (entrance) -> Couloir, looking at base of stairs
INSERT INTO public.hotspots (room_id, type, yaw, pitch, label, target_room_id)
SELECT e.id, 'nav', 0, -22, 'Monter l''escalier', c.id
FROM public.rooms e, public.rooms c
WHERE e.slug='entree-escalier' AND c.slug='couloir-etage-1';

-- Nav: Couloir -> Hall (back)
INSERT INTO public.hotspots (room_id, type, yaw, pitch, label, target_room_id)
SELECT c.id, 'nav', 180, -25, 'Retour au Hall', e.id
FROM public.rooms c, public.rooms e
WHERE c.slug='couloir-etage-1' AND e.slug='entree-escalier';

-- Nav: Salle -> Couloir (back)
INSERT INTO public.hotspots (room_id, type, yaw, pitch, label, target_room_id)
SELECT s.id, 'nav', 180, -22, 'Retour au couloir', c.id
FROM public.rooms s, public.rooms c
WHERE s.slug='salle-1' AND c.slug='couloir-etage-1';

-- Salle: 3 mannequins centraux (subtype=mannequin, slot_index 0..2)
-- positions correspondant aux 3 mannequins centraux du panorama
INSERT INTO public.hotspots (room_id, type, subtype, slot_index, yaw, pitch, label)
SELECT s.id, 'garmentInfo', 'mannequin', 0, -8, -8, 'Pièce vedette'
FROM public.rooms s WHERE s.slug='salle-1';
INSERT INTO public.hotspots (room_id, type, subtype, slot_index, yaw, pitch, label)
SELECT s.id, 'garmentInfo', 'mannequin', 1, 0, -8, 'Pièce vedette'
FROM public.rooms s WHERE s.slug='salle-1';
INSERT INTO public.hotspots (room_id, type, subtype, slot_index, yaw, pitch, label)
SELECT s.id, 'garmentInfo', 'mannequin', 2, 8, -8, 'Pièce vedette'
FROM public.rooms s WHERE s.slug='salle-1';

-- Salle: 2 penderies (subtype=hangers) latérales gauche/droite
INSERT INTO public.hotspots (room_id, type, subtype, slot_index, yaw, pitch, label)
SELECT s.id, 'garmentInfo', 'hangers', 3, -75, -5, 'Penderie'
FROM public.rooms s WHERE s.slug='salle-1';
INSERT INTO public.hotspots (room_id, type, subtype, slot_index, yaw, pitch, label)
SELECT s.id, 'garmentInfo', 'hangers', 4, 75, -5, 'Penderie'
FROM public.rooms s WHERE s.slug='salle-1';

-- Salle: mur d'identité de marque derrière les mannequins
INSERT INTO public.hotspots (room_id, type, subtype, slot_index, yaw, pitch, label)
SELECT s.id, 'brandWall', 'wall', 0, 0, 5, 'Identité de la maison'
FROM public.rooms s WHERE s.slug='salle-1';
