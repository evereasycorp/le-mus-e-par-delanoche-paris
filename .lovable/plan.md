# Refonte Visite 360° — Panoramas equirectangulaires

## Stack technique
- **Viewer** : Three.js sphère inversée + texture equirectangulaire (pas de Pannellum, on garde notre contrôle complet sur inertie/hotspots/zoom). On réutilise `three` et `@react-three/fiber` déjà installés.
- **Hotspots** : projection yaw/pitch → coordonnées écran via `Vector3.project(camera)`, rendus en HTML overlay (zones 44×44 garanties, regroupement auto).
- **Data** : tables Supabase `rooms`, `hotspots`, extension de `brands` (bio, socials, badges, logo_url, score).

## Étapes

### 1. Base de données
Migration ajoutant :
- `rooms` (id, kind: 'corridor'|'brand_room', floor, order_index, panorama_url, brand_id?, next_room_id?)
- `hotspots` (id, room_id, type: 'nav'|'garmentInfo'|'brandWall', yaw, pitch, target_room_id?, garment_id?, brand_id?)
- `brands` : ajout colonnes `bio`, `socials jsonb`, `badges text[]`, `logo_url`, `score` (calculé 50% ventes / 30% satisfaction / 20% activité — fonction SQL `recompute_brand_scores()` + comment indiquant le cron à venir).
- Seed : 1 couloir + 3 salles de marque chaînées avec 4-6 marques.
- GRANT + RLS publiques en lecture, écriture admin only.

### 2. Placeholders panoramas 360°
- Génération d'1 image equirectangulaire 2048×1024 pour le couloir Louvre (pierre claire, voûte en berceau, vitrines ouvertes sur les côtés, sol lignes laiton).
- Génération d'1 image equirectangulaire 2048×1024 pour salle de marque (cintres murs G/D, 3 mannequins centre, mur d'identité au fond).
- Upload via `lovable-assets`.

### 3. Viewer Panorama (`src/features/visite/`)
- `PanoramaViewer.tsx` : Canvas r3f, sphère inversée, texture chargée avec preload de la scène suivante (TextureLoader cache).
- `CameraController.tsx` : drag-look avec **inertie ease-out 400ms** sur release, FOV zoom, distinction tap (<8px) vs drag.
- `HotspotLayer.tsx` : projection yaw/pitch→écran, zones touch 44×44, **regroupement <30px en badge "+N"**, désactivation pointer-events quand bottom-sheet ouverte.
- `store.ts` (zustand) : `currentRoomId`, `isSheetOpen` (verrouille contrôles), `cameraYaw`, `cameraPitch`, `fov`.
- Transitions entre rooms : fade noir→nouveau panorama, easing cubic 600ms.

### 4. HUD
- Flèches Next/Prev (état désactivé en bord de chaîne).
- Filmstrip vignettes des rooms (verrouillées grisées).
- Zoom +/−, plein écran (Fullscreen API).
- Cartel marque sticky en bas dans le couloir (nom + score).

### 5. Couloir
- **Aucune porte.** Rendu = panorama couloir + hotspots `nav` positionnés sur chaque vitrine + hotspots `brandWall` pour ouvrir la marque.
- Mise en lumière à l'approche : quand un hotspot nav est dans un cône de ±15° du regard, son cartel fade-in et un glow CSS s'allume.
- Score affiché sous chaque cartel.

### 6. Salles de marque
- Panorama unique (placeholder partagé pour l'instant).
- Hotspots `garmentInfo` (12 cintres + 3 mannequins featured) → BottomSheet fiche produit (réutilise la logique 90/10 existante).
- Hotspot `brandWall` → BottomSheet **Identité marque** (distincte) : logo, nom Fraunces, badges pastilles, socials cliquables, bio.

### 7. Admin calibration hotspots
- Route `_authenticated/admin/calibrate.$roomId.tsx` (gated `admin` role via `has_role`).
- Ouvre le panorama de la room, affiche tous les hotspots en mode draggable.
- Drag = update yaw/pitch en temps réel (via projection inverse de la position souris sur la sphère).
- Bouton "Sauvegarder" → server fn `updateHotspot` (requireSupabaseAuth + check role admin).

### 8. Nettoyage
- Suppression `Gallery3D.tsx`, `DoorMesh.tsx` (obsolètes).
- Conservation de `HUD.tsx` adapté.

## Critères couverts
- Inertie regard ✅ / easing transitions ✅ / tap vs drag ✅ / touch 44px ✅ / regroupement ✅ / préchargement ✅ / lock pendant sheet ✅ / état flèches ✅
- Couloir sans portes ✅ / score ✅ / 4-6 marques ✅ / cartel ✅ / mise en lumière à l'approche ✅
- Composition salle (cintres G/D, 3 mannequins, mur fond) ✅ / panneau identité distinct ✅ / admin calibration drag&drop ✅

## Limites assumées
- Calcul du score : fonction SQL prête mais sans cron pg_cron (à activer plus tard).
- Panoramas : placeholders IA — calibration fine des hotspots à refaire quand les vraies images Skybox arrivent (c'est précisément le rôle de l'admin).
- Achat : simulation visuelle uniquement (déjà acté).
