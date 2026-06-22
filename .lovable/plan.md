
# Visite 360° — Galerie immersive r3f

Refonte complète du couloir actuel (`corridor-scene.tsx` scrollable) en vraie scène 3D react-three-fiber, dans l'esthétique d'une galerie de musée bien exposée.

## 1. Dépendances

Install via `bun add` :
- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `zustand` (état de visite : portes ouvertes, waypoint courant, salle débloquée)
- `@types/three` (dev)

## 2. Architecture fichiers

```text
src/
  features/visite/
    store.ts                 # zustand: currentWaypointId, openedDoors, fov, fullscreen
    types.ts                 # Waypoint, Door, Garment
    useGalleryData.ts        # query brands publiées → portes + waypoints dérivés
    Gallery3D.tsx            # <Canvas> + lights + fog + camera rig
    scene/
      CorridorArchitecture.tsx  # voûte berceau, arches, murs, sol pierre, bandeau lumineux
      DoorMesh.tsx              # porte 3D pivotante + cadre doré + cartel
      WaypointMarker.tsx        # point or au sol, hidden si locked
      GarmentHotspot.tsx        # icône "i" projetée écran depuis pos 3D
      CameraRig.tsx             # gestion yaw/pitch drag + interpolation déplacement
    hud/
      ControlsBar.tsx           # flèches gauche/droite, fullscreen, zoom +/-
      ThumbnailFilm.tsx         # pellicule waypoints en bas
      DoorHoldRing.tsx          # anneau progression (overlay 2D au-dessus de la porte ciblée)
      GarmentSheet.tsx          # bottom-sheet produit + bouton Acheter (90/10)
  routes/
    etage.$num.tsx           # remplace CorridorScene par <Gallery3D floor={num} />
```

Suppression de `src/components/corridor-scene.tsx` (remplacé).
Les keyframes `doorLeftOpen/Right/Light` dans `src/styles.css` deviennent obsolètes → retirées.

## 3. Direction artistique (lumière galerie)

Palette appliquée via matériaux three :
- Murs `#EFEAE0` (MeshStandardMaterial, roughness 0.85)
- Sol `#D9D2C4` avec normalMap subtile (joints), légèrement réfléchissant
- Voûte `#F4F1EA`
- Cadres portes `#B08D57` / poignées `#D4AF6A` (MeshStandardMaterial metalness 0.6)

Éclairage :
- `ambientLight` intensity 1.9
- `hemisphereLight` skyColor `#FFFBF2`, groundColor `#C9C0AE`, intensity 0.8
- Bandeau zénithal : `RectAreaLight` linéaire le long de la voûte (avec `RectAreaLightUniformsLib` via drei)
- `SpotLight` doux au-dessus de chaque porte (cone large, intensity 0.6, pas d'ombre dure)
- `fog` couleur `#EDE9E1`, near 18, far 45 (profondeur sans assombrir)
- `ContactShadows` drei sous portes et banquette (opacity 0.25)

## 4. Architecture du couloir

- Voûte en berceau : 6–8 arches successives (`extrudeGeometry` d'un arc + répétition)
- Murs latéraux avec pilastres entre les arches
- Sol carrelé en pierre, lignes de fuite visibles via UV repeat
- Banquette centrale à mi-couloir (simple box + cylinder pieds)
- Portes positionnées symétriquement gauche/droite, espacées de 6 unités
- Cartel sous chaque porte : `<Html>` drei (HTML positionné dans le 3D) avec nom marque + score

## 5. Interactions

### 5.1 Regard 360°
- `CameraRig` : capture `pointerdown/move/up` sur le canvas
- Drag horizontal → yaw illimité ; vertical → pitch clamp `[-30°, 35°]`
- Inertie : décélération exponentielle (~250ms) sur dernière vélocité
- Pointer events delegated to canvas, pas de OrbitControls (trop générique)

### 5.2 Déplacement par points
- `WaypointMarker` rendu **uniquement si `!locked`** (early return, jamais dans le DOM)
- Tap → `useGalleryStore.setCurrentWaypoint(id)` → CameraRig interpole position (ease-out cubic, 700ms via `useFrame`)
- Waypoints derrière une porte fermée : `locked: true` tant que `openedDoors` ne contient pas la door associée

### 5.3 Porte (appui long)
- `DoorMesh` détecte `pointerdown` sur la poignée → démarre timer 800ms
- Pendant l'appui, `DoorHoldRing` (SVG overlay 2D positionné via projection écran) se remplit
- `pointermove` avec delta > 12px → annule, anneau se vide
- Fin du timer : `door.opened = true`, animation rotation Y de 0 → -95° sur 600ms (`useFrame` + easing), `navigator.vibrate?.(20)`, déverrouille `unlocksWaypoints`
- Une fois ouverte, tap sur la porte → navigation vers `/salle/$slug` (route existante)

### 5.4 Flèches + fullscreen + zoom
- `ControlsBar` (fixed bottom) :
  - ← / → : `currentIndex ± 1` dans la liste filtrée des waypoints débloqués (disabled si suivant locked)
  - Fullscreen : `document.documentElement.requestFullscreen()` / `exitFullscreen()`
  - Zoom +/- : `camera.fov` clamp [40, 80], `camera.updateProjectionMatrix()`
- `ThumbnailFilm` : liste waypoints, locked grisé + icône cadenas, click = setCurrentWaypoint

### 5.5 Vêtements (préparé, salle = phase 2)
- `GarmentHotspot` calcule projection écran via `camera.project()` dans `useFrame`
- Masqué si hors champ (`z > 1` ou hors viewport) ou salle locked
- Tap → bottom-sheet (shadcn `Sheet`) : photo, nom, marque, prix
- Bouton "Acheter" : affiche `Math.round(price * 0.9)` à la marque / `Math.round(price * 0.1)` commission Le Musée (calcul dynamique, pas hardcodé). Pas de Stripe.

## 6. Données

`useGalleryData(floor)` :
- `useQuery` → `supabase.from('brands').select('id, slug, name, score').eq('floor', floor).eq('published', true)`
- Map → `Door[]` avec positions calculées (alternance G/D, z = -6 * index)
- Génère `Waypoint[]` : 1 point devant chaque porte (locked: false pour le premier, locked: true pour les suivants tant que la porte précédente n'est pas ouverte) — règle ajustable
- Pas de mock : fallback liste vide + message si aucune brand

## 7. Performance mobile

- `dpr={[1, 2]}` sur `<Canvas>`
- `frameloop="demand"` + invalidate sur interaction (regard, animation porte)
- Spot lights : `castShadow={false}` sauf 2 plus proches
- Culling distance : portes > 30u retirées du render
- Geometries partagées (une seule `BoxGeometry` mur instanciée)
- `<Suspense fallback={<LoadingGallery />}>` autour de la scène

## 8. État global (zustand)

```ts
type VisiteState = {
  currentWaypointId: string | null;
  openedDoors: Set<string>;
  fov: number;
  setCurrentWaypoint(id: string): void;
  openDoor(id: string, unlocks: string[]): void;
  zoomIn(): void; zoomOut(): void;
}
```

## 9. Critères d'acceptation couverts

- [x] Lumière galerie claire, jamais noir (ambient 1.9 + hemi + rect area + fog clair)
- [x] Aucun élément verrouillé rendu (early return sur `locked`, pas d'opacity 0)
- [x] Appui long fonctionne tactile (pointerdown + pointermove cancel, vibrate)
- [x] Flèches, zoom, fullscreen, déplacement = tous branchés (API réelles)
- [x] Commission 10% calculée dynamiquement
- [x] dpr cappé + frameloop demand + culling pour 60fps mobile

## 10. Hors scope (à valider ensuite)

- Refonte 3D de la **Salle** (Wall + Expo) — phase 2 une fois le couloir validé
- Stripe Connect réel — phase 3
- Modèles GLTF custom pour banquette/portes (on reste sur primitives + matériaux pour cette V1)
