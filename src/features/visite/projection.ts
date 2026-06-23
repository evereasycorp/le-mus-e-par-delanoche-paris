// Pure-math helpers for projecting hotspots from yaw/pitch onto a 2D viewport
// and the inverse (pixel → world yaw/pitch) used by the admin calibration drag.

export type Projection = { x: number; y: number; visible: boolean };

function wrap(a: number) {
  let v = a;
  while (v > Math.PI) v -= Math.PI * 2;
  while (v < -Math.PI) v += Math.PI * 2;
  return v;
}

export function project(
  hotspotYawRad: number,
  hotspotPitchRad: number,
  cameraYaw: number,
  cameraPitch: number,
  fovDeg: number,
  width: number,
  height: number,
): Projection {
  const relYaw = wrap(hotspotYawRad - cameraYaw);
  const relPitch = hotspotPitchRad - cameraPitch;

  const cosY = Math.cos(relYaw);
  const cosP = Math.cos(relPitch);
  const sinY = Math.sin(relYaw);
  const sinP = Math.sin(relPitch);

  // Direction vector in camera-local space (camera looks down -Z)
  const dx = sinY * cosP;
  const dy = sinP;
  const dz = -cosY * cosP;

  if (dz >= -0.001) {
    return { x: 0, y: 0, visible: false };
  }

  const fovY = (fovDeg * Math.PI) / 180;
  const aspect = width / Math.max(1, height);
  const tanY = Math.tan(fovY / 2);
  const tanX = tanY * aspect;

  // Perspective divide
  const ndcX = dx / -dz / tanX;
  const ndcY = dy / -dz / tanY;

  const x = (ndcX + 1) * 0.5 * width;
  const y = (1 - ndcY) * 0.5 * height;

  const visible =
    Math.abs(ndcX) <= 1.5 && Math.abs(ndcY) <= 1.5; // small margin for edge hotspots

  return { x, y, visible };
}

export function unproject(
  pixelX: number,
  pixelY: number,
  cameraYaw: number,
  cameraPitch: number,
  fovDeg: number,
  width: number,
  height: number,
): { yawRad: number; pitchRad: number } {
  const ndcX = (pixelX / width) * 2 - 1;
  const ndcY = 1 - (pixelY / height) * 2;
  const fovY = (fovDeg * Math.PI) / 180;
  const aspect = width / Math.max(1, height);
  const tanY = Math.tan(fovY / 2);
  const tanX = tanY * aspect;

  // Ray in camera-local space
  const cx = ndcX * tanX;
  const cy = ndcY * tanY;
  const cz = -1;
  const len = Math.hypot(cx, cy, cz);
  const lx = cx / len;
  const ly = cy / len;
  const lz = cz / len;

  // Rotate by camera pitch (X) then yaw (Y)
  const cosP = Math.cos(cameraPitch);
  const sinP = Math.sin(cameraPitch);
  const x1 = lx;
  const y1 = ly * cosP - lz * sinP;
  const z1 = ly * sinP + lz * cosP;

  const cosY = Math.cos(cameraYaw);
  const sinY = Math.sin(cameraYaw);
  const wx = x1 * cosY + z1 * sinY;
  const wy = y1;
  const wz = -x1 * sinY + z1 * cosY;

  // Convert world dir → world yaw/pitch (forward = -Z)
  const yaw = Math.atan2(wx, -wz);
  const pitch = Math.asin(Math.max(-1, Math.min(1, wy)));
  return { yawRad: yaw, pitchRad: pitch };
}

export const degToRad = (d: number) => (d * Math.PI) / 180;
export const radToDeg = (r: number) => (r * 180) / Math.PI;
