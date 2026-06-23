import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { MuseumHeader, PageFrame, SectionLabel } from "@/components/museum-chrome";
import { useVisiteStore } from "@/features/visite/store";
import {
  useRooms,
  useAllHotspots,
  useAllBrands,
  usePiecesByBrand,
} from "@/features/visite/usePanoramaData";
import {
  PannellumViewer,
  type PannellumViewerHandle,
} from "@/features/visite/PannellumViewer";
import { HUD } from "@/features/visite/HUD";
import { GarmentSheet } from "@/features/visite/GarmentSheet";
import { BrandIdentitySheet } from "@/features/visite/BrandIdentitySheet";

export const Route = createFileRoute("/etage/$num")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: `Étage ${params.num} — Le Musée par Delanoche Paris` },
      {
        name: "description",
        content: `Visite 360° de l'étage ${params.num} : galerie immersive des maisons exposées.`,
      },
    ],
  }),
  component: FloorPage,
});

const FLOORS: Record<string, { label: string; subtitle: string; open: boolean }> = {
  "1": { label: "Vêtements", subtitle: "Galerie des créateurs", open: true },
  "2": { label: "Art", subtitle: "En préparation", open: false },
  "3": { label: "Littérature", subtitle: "En préparation", open: false },
};

function FloorPage() {
  const { num } = Route.useParams();
  const floor = FLOORS[num];
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  if (!floor) {
    return (
      <div className="min-h-screen">
        <MuseumHeader />
        <PageFrame>
          <p className="text-center text-sm text-muted-foreground">Cet étage n'existe pas.</p>
        </PageFrame>
      </div>
    );
  }

  if (!floor.open) {
    return (
      <div className="min-h-screen">
        <MuseumHeader />
        <PageFrame>
          <div className="mx-auto max-w-md text-center">
            <Lock className="mx-auto h-8 w-8 text-gold/70" />
            <SectionLabel>
              <span className="mx-auto mt-4 block">Étage {num}</span>
            </SectionLabel>
            <h1 className="mt-4 font-display text-3xl text-foreground">{floor.label}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Cet étage du Musée n'a pas encore été inauguré. Revenez le visiter prochainement.
            </p>
            <Link
              to="/"
              className="mt-8 inline-block text-[10px] tracking-room uppercase text-gold hover:text-gold-soft"
            >
              ← Retour au Hall
            </Link>
          </div>
        </PageFrame>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0a07]">
      <MuseumHeader />
      <FloorViewer floor={Number(num)} />
    </div>
  );
}

function FloorViewer({ floor }: { floor: number }) {
  const { data: rooms = [] } = useRooms(floor);
  const { data: hotspots = [] } = useAllHotspots(floor);
  const { data: brands = [] } = useAllBrands();

  const currentRoomId = useVisiteStore((s) => s.currentRoomId);
  const setRoom = useVisiteStore((s) => s.setRoom);
  const activeBrandId = useVisiteStore((s) => s.activeBrandId);
  const setActiveBrand = useVisiteStore((s) => s.setActiveBrand);
  const sheet = useVisiteStore((s) => s.sheet);
  const openGarment = useVisiteStore((s) => s.openGarment);
  const openBrand = useVisiteStore((s) => s.openBrand);
  const closeSheet = useVisiteStore((s) => s.closeSheet);

  // Initial scene: entrance
  useEffect(() => {
    if (!currentRoomId && rooms.length > 0) {
      const first =
        rooms.find((r) => r.kind === "entrance") ??
        rooms.find((r) => r.kind === "corridor") ??
        rooms[0];
      setRoom(first.id);
    }
  }, [rooms, currentRoomId, setRoom]);

  const currentRoom = useMemo(
    () => rooms.find((r) => r.id === currentRoomId) ?? null,
    [rooms, currentRoomId],
  );

  // Pieces of the currently-selected creator (drives mannequins + penderies)
  const { data: activeBrandPieces = [] } = usePiecesByBrand(activeBrandId);

  const brandsById = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);
  const piecesById = useMemo(
    () => new Map(activeBrandPieces.map((p) => [p.id, p])),
    [activeBrandPieces],
  );

  const viewerRef = useRef<PannellumViewerHandle | null>(null);

  const activeGarment =
    sheet.kind === "garment" ? (piecesById.get(sheet.garmentId) ?? null) : null;
  const activeSheetBrand =
    sheet.kind === "brand" ? (brandsById.get(sheet.brandId) ?? null) : null;

  return (
    <div className="relative h-[calc(100vh-56px)] w-full overflow-hidden">
      <PannellumViewer
        rooms={rooms}
        hotspots={hotspots}
        brands={brands}
        activeBrandId={activeBrandId}
        activeBrandPieces={activeBrandPieces}
        currentRoomId={currentRoomId}
        onChangeRoom={setRoom}
        onOpenGarment={openGarment}
        onOpenBrand={openBrand}
        onSelectBrand={setActiveBrand}
        viewerRef={viewerRef}
      />
      <HUD
        currentRoom={currentRoom}
        rooms={rooms}
        onGoToRoom={setRoom}
        onZoomIn={() => viewerRef.current?.zoomIn()}
        onZoomOut={() => viewerRef.current?.zoomOut()}
      />
      <GarmentSheet
        piece={activeGarment}
        open={sheet.kind === "garment"}
        onClose={closeSheet}
      />
      <BrandIdentitySheet
        brand={activeSheetBrand}
        open={sheet.kind === "brand"}
        onClose={closeSheet}
      />
    </div>
  );
}
