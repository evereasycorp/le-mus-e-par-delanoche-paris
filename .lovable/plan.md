# Plan de refonte — Le Musée par DELANOCHE PARIS

La demande est vaste. Je propose de la livrer en **4 lots indépendants** pour garder chaque itération maîtrisée et te permettre de valider visuellement à chaque étape.

---

## Lot 1 — Expérience 360° (immersion + navigation)

**Couloir des Créateurs**

- Repositionner les hotspots de salle **devant chaque ouverture architecturale** (alignement précis sur l'axe des portes, pas regroupés au centre).
- Réduire la taille visuelle des disques de sol (~30 % plus petits).
- Conserver **un hotspot central d'avancée** dans le couloir.

**Hall d'entrée — progression spatiale réaliste**

- Hotspot 1 : pied de l'escalier → monter vers le palier.
- Scène intermédiaire "palier" (réutilise le panorama couloir avec yaw/pitch d'arrivée différent).
- Hotspot 2 : haut de l'escalier → couloir des créateurs.
- Hotspot **Aile gauche — Art** et hotspot **Aile droite — Littérature** → toast élégant : _« Cette aile du musée ouvrira prochainement. »_ (pas d'erreur, pas de navigation).

**Caméra & immersion**

- FOV par défaut **75°** (au lieu de 100°), `maxHfov` 95°, `minHfov` 45° → moins de fisheye, zoom avant plus précis.
- Inertie caméra activée (`friction` + `autoRotateInactivityDelay` désactivé).
- Transitions inter-panoramas : fondu noir 600 ms + zoom-in cinématographique (déjà en place, à affiner).

## Lot 2 — Refonte du discours page d'accueil

Ton premium / parisien / culturel. Sections :

1. **Hero** — _« Un musée numérique pour les maisons de création »_ + CTA _Commencer la visite_ / _Exposer au musée_.
2. **Le concept** — explication du parcours 360°, scénographie inspirée des grands musées parisiens, achat sans quitter la visite.
3. **Pourquoi exposer ?** — 4 piliers : Stand gratuit · Commission unique 10 % · Visibilité premium · Image de marque institutionnelle.
4. **Disciplines à venir** — Mode (ouvert) · Art (bientôt) · Littérature (bientôt).
5. **Footer** — réseaux sociaux conservés.

## Lot 3 — Espace Créateur (architecture évolutive)

**Base de données** (migration Lovable Cloud)

- `creator_applications` (nom marque, créateur, email, site, IG, présentation, univers, photos[], statut `en_attente|acceptee|refusee`).
- Extension `brands` : rattachement à un `owner_user_id` + `discipline` (mode/art/litterature).
- Rôle `createur` ajouté à l'enum `app_role` (s'il n'existe pas).
- RLS : créateur lit/écrit uniquement sa marque ; admin gère candidatures.

**Pages**

- `/exposer` — page publique de candidature (concept, avantages, formulaire).
- `/_authenticated/createur` — tableau de bord (logo, description, produits, stocks, commandes, ventes, revenus).
- `/_authenticated/admin/candidatures` — modération (accepter/refuser).

**Génération automatique du stand** — à l'acceptation, une salle est provisionnée et les produits sont injectés automatiquement sur mannequins + penderies (logique de placement déjà présente, à brancher).

## Lot 4 — Vision multi-étages

- Modèle `floors` (mode, art, littérature) déjà partiellement présent via `etage.$num`.
- Étages Art & Littérature : routes existent mais affichent _« Ouverture prochaine »_ + capture d'email d'intérêt.

---

## Détails techniques (à ignorer si non technique)

- `PannellumViewer.tsx` : ajout d'une scène `palier`, table de hotspots `entrance` étendue (escalier, art, littérature) avec callback `onSoon()` déclenchant `sonner.toast`.
- Calibration des yaws de portes par scène dans `usePanoramaData` plutôt que distribués artificiellement.
- `config.haov`/`vaov` conservés ; ajustement `hfov` initial à 75.
- Migration SQL unique pour Lot 3 (création table + GRANT + RLS + policies + enum role).

---

## Ce que je te demande

**Veux-tu que je démarre par le Lot 1 (expérience 360°) seul** — celui qui débloque la navigation immédiatement — puis qu'on enchaîne les lots suivants un par un après validation visuelle ?

Ou préfères-tu un autre ordre (ex. discours d'accueil d'abord, candidatures créateur d'abord) ?
