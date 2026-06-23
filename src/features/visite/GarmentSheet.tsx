import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import type { PieceLite } from "./types";

const COMMISSION_RATE = 0.1;

export function GarmentSheet({
  piece,
  open,
  onClose,
}: {
  piece: PieceLite | null;
  open: boolean;
  onClose: () => void;
}) {
  const [purchased, setPurchased] = useState(false);
  if (!piece) return null;

  const total = piece.price_cents;
  const commission = Math.round(total * COMMISSION_RATE);
  const toBrand = total - commission;
  const fmt = (cents: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: piece.currency || "EUR" }).format(
      cents / 100,
    );

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setPurchased(false);
          onClose();
        }
      }}
    >
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto bg-[#F4F1EA]">
        <SheetHeader className="text-left">
          <SheetTitle className="font-serif text-2xl text-[#2b2218]">{piece.name}</SheetTitle>
        </SheetHeader>

        {piece.photos && piece.photos[0] && (
          <img
            src={piece.photos[0]}
            alt={piece.name}
            className="mt-4 aspect-[3/4] w-full rounded-sm object-cover"
          />
        )}

        {piece.description && (
          <p className="mt-4 font-serif text-sm leading-relaxed text-[#2b2218]/90">
            {piece.description}
          </p>
        )}

        <div className="mt-5 space-y-1 rounded-sm border border-[#B08D57]/30 bg-white/60 p-3 text-sm">
          <div className="flex justify-between">
            <span>Prix</span>
            <span className="font-medium">{fmt(total)}</span>
          </div>
          <div className="flex justify-between text-[#2b2218]/70">
            <span>Reversé à la maison (90%)</span>
            <span>{fmt(toBrand)}</span>
          </div>
          <div className="flex justify-between text-[#B08D57]">
            <span>Commission Musée (10%)</span>
            <span>{fmt(commission)}</span>
          </div>
        </div>

        <button
          onClick={() => {
            setPurchased(true);
            toast.success("Achat simulé enregistré.");
          }}
          disabled={purchased}
          className="mt-5 w-full rounded-sm border border-[#B08D57] bg-[#B08D57] py-3 text-sm uppercase tracking-wider text-[#F4F1EA] transition hover:bg-[#9c7a48] disabled:opacity-60"
        >
          {purchased ? "Acheté — merci" : "Acheter"}
        </button>
      </SheetContent>
    </Sheet>
  );
}
