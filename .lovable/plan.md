# Refonte 360° — Moteur Pannellum + structure entrée/couloir/salles

## Objectif

Abandonner la projection maison (yaw/pitch calculés à la main, hotspots HTML overlay) qui a généré bug sur bug. Basculer sur **Pannellum** (MIT, mature, scènes multiples natives) et restructurer le parcours en `entree-escalier → couloir-etage-1 → salle-N` (6 marques max par salle, pas 1 marque par salle comme aujourd'hui).

## 1. Moteur : Pannellum

- `bun add pannellum` (lib vanilla — pas de wrapper React maintenu fiable).
- Nouveau composant `PannellumViewer.tsx` : div conteneur + ref, instancie `pannellum.viewer(el, config)` au mount, `viewer.destroy()` au unmount (libère le contexte WebGL — résout les fuites entre routes).
- Config Pannellum : `default.sceneFadeDuration: 600`, `autoLoad: true`, `showControls: false` (on garde notre HUD), `mouseZoom: true`, `friction: 0.15` (inertie native).
- Hotspots déclarés dans le config Pannellum :
  - `type: "scene"` + `sceneId` → navigation inter-scène **gérée nativement** (plus de `goToRoom` custom, plus de calcul d'orientation initiale).
  - `type: "info"` + `clickHandlerFunc` → ouvre nos sheets (`GarmentSheet`, `BrandIdentitySheet`).
- CSS override dans `src/styles.css` : ré-habiller les hotspots Pannellum (`.pnlm-hotspot`) avec nos couleurs/typo existantes.

## 2. Structure de données (migration DB)

Le modèle actuel = 1 brand_room par marque. Le nouveau modèle = 1 `salle` regroupe jusqu'à 6 marques (chacune avec sa zone cintres/mannequins/wall dans la même scène 360).

Nouveau schéma `rooms` :
- `slug` text unique (`entree-escalier`, `couloir-etage-1`, `salle-1`, ...) — sert d'ID de scène Pannellum.
- `kind`: `'entrance' | 'corridor' | 'salle'` (remplace `brand_room`).
- Suppression de `brand_id` sur rooms (une salle n'appartient plus à 1 marque).

Nouvelle table `salle_brands` :
- `salle_id` fk rooms, `brand_id` fk brands, `slot_index` 0–5, `is_demo` bool.
- Détermine quelle marque occupe quel emplacement (gauche/centre/droite × cintres/mannequins/mur) dans la scène.

`hotspots` : ajout colonne `slot_index` (à quelle marque dans la salle ce hotspot appartient), et `subtype` parmi `'hangers' | 'mannequin' | 'wall'` quand pertinent.

Seed :
- 3 scènes (`entree-escalier`, `couloir-etage-1`, `salle-1`).
- `salle-1` peuplée avec 2 marques `is_demo=true` (complètes : pieces + wall rempli) et 4 marques vides pour exposer l'état par défaut.
- Hotspots de nav : entrée→couloir, couloir↔salle-1.

## 3. Images neutres temporaires

Génère 3 panoramas équirectangulaires placeholder 2048×1024, dégradés sobres avec grille faible (juste pour repérer l'orientation) :
- `pano-entree.jpg` — dégradé pierre claire
- `pano-couloir.jpg` — dégradé marbre froid
- `pano-salle.jpg` — dégradé chaud (utilisé par toutes les salles tant que pas remplacé)

Stockage : `src/assets/` + asset.json (via lovable-assets). Champ `panorama_url` en DB pointe vers ces URLs CDN — remplaçables 1-par-1 plus tard sans toucher au code.

## 4. Rendu d'une salle (état vide vs configuré)

Pour chaque slot 0-5 d'une salle, **toujours** afficher les hotspots de structure :
- 1 hotspot `wall` au fond du slot (cliquable seulement si la marque a logo/bio/réseaux → ouvre `BrandIdentitySheet`, sinon affiche tooltip "Stand disponible").
- N hotspots `garmentInfo` sur cintres/mannequins (cliquables seulement si pieces liées).

Filtre actuel "garde défensive" (`if !garment_id return false`) **supprimé** : on garde le hotspot visible mais inactif (curseur normal, opacity réduite) — c'est ce qui matérialise la structure vide demandée.

## 5. Interface

- Suppression des composants devenus inutiles : `PanoramaScene.tsx`, `HotspotLayer.tsx`, `projection.ts` (Pannellum gère tout).
- `HUD.tsx` conservé : un **seul** groupe de contrôles fixes (retour, zoom +/−, plein écran, vignettes scènes). Vérifier qu'aucun contrôle Pannellum natif n'est rendu en parallèle (`showControls: false`, `showZoomCtrl: false`, `showFullscreenCtrl: false`).
- Store zustand : simplifié — ne garde que `currentSceneId` + `sheet`. Plus de yaw/pitch/fov dans le store (Pannellum est source de vérité).

## 6. Admin calibration

`admin-calibrate.tsx` : adapté pour utiliser le mode debug Pannellum (`hotSpotDebug: true` affiche les coords au clic console) → admin clique sur la position voulue, on récupère pitch/yaw, on update le hotspot en DB. Plus simple que le drag custom actuel.

## 7. Critères d'acceptation (à valider avant photos Skybox)

- [x] Pannellum installé, scènes déclarées, navigation scene-à-scène native.
- [x] Parcours `entrée → couloir → salle-1 → couloir → entrée` fonctionnel sans erreur console.
- [x] Salle-1 affiche les 6 stands : 2 démo complets, 4 stands vides avec structure visible.
- [x] HUD unique, pas de doublon de contrôles.
- [x] Achat sur piece de marque démo → commission 90/10 (logique existante conservée).
- [x] Testable sur mobile (Pannellum supporte le touch nativement).

## Détails techniques (annexe)

**Fichiers créés :**
- `src/features/visite/PannellumViewer.tsx` (remplace PanoramaViewer)
- `src/features/visite/pannellumConfig.ts` (builder qui transforme rooms+hotspots+brands en config Pannellum)
- `src/assets/pano-entree.jpg.asset.json`, `pano-couloir.jpg.asset.json` (réutilise pano-brand-room pour salle)

**Fichiers supprimés :**
- `PanoramaScene.tsx`, `HotspotLayer.tsx`, `projection.ts`

**Fichiers modifiés :**
- `store.ts` (simplification), `usePanoramaData.ts` (ajout `useSalleBrands`), `types.ts`, `etage.$num.tsx`, `admin-calibrate.tsx`, `HUD.tsx`, `styles.css` (override Pannellum CSS).

**Migration SQL :**
1. ALTER rooms : add `slug` unique, change `kind` check constraint, drop `brand_id`.
2. CREATE TABLE `salle_brands` + GRANT + RLS (lecture publique, écriture admin).
3. ALTER hotspots : add `slot_index`, `subtype`.
4. Seed : entrée, couloir, salle-1 (6 slots dont 2 demo).

**Limitations assumées :**
- Pannellum charge ~150KB gz — acceptable pour la valeur apportée vs custom buggy.
- L'avertissement React 19 / refs : Pannellum DOM-only, isolé dans un useEffect, pas de souci.
- Pas de pg_cron pour le recalcul de score nuit (déjà absent aujourd'hui — pas dans le scope de cette refonte).
