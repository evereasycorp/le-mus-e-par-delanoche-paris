// Local panorama asset registry. DB stores a short key; we resolve it here.
// When real Skybox AI panoramas arrive, upload them then add new keys below
// — no other code needs to change.
import entree from "@/assets/pano-entree.jpg";
import couloir from "@/assets/pano-couloir.jpg";
import salle from "@/assets/pano-salle.jpg";
// Legacy placeholders kept for backwards compatibility with any existing seed.
import corridorLegacy from "@/assets/pano-corridor.jpg";
import brandRoomLegacy from "@/assets/pano-brand-room.jpg";

const REGISTRY: Record<string, string> = {
  "pano-entree": entree,
  "pano-couloir": couloir,
  "pano-salle": salle,
  "pano-corridor": corridorLegacy,
  "pano-brand-room": brandRoomLegacy,
};

export function resolvePanoramaUrl(key: string | null | undefined): string {
  if (!key) return couloir;
  if (key.startsWith("http") || key.startsWith("/")) return key;
  return REGISTRY[key] ?? couloir;
}
