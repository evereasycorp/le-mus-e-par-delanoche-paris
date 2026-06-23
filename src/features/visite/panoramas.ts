// Local panorama asset registry. DB stores a short key; we resolve it here.
// When real Skybox AI panoramas arrive, upload them and add new keys.
import corridor from "@/assets/pano-corridor.jpg";
import brandRoom from "@/assets/pano-brand-room.jpg";

const REGISTRY: Record<string, string> = {
  "pano-corridor": corridor,
  "pano-brand-room": brandRoom,
};

export function resolvePanoramaUrl(key: string | null | undefined): string {
  if (!key) return corridor;
  if (key.startsWith("http") || key.startsWith("/")) return key;
  return REGISTRY[key] ?? corridor;
}
