import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Instagram, Globe, Music2, CheckCircle2 } from "lucide-react";
import type { BrandLite } from "./types";

export function BrandIdentitySheet({
  brand,
  open,
  onClose,
}: {
  brand: BrandLite | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!brand) return null;
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto bg-[#F4F1EA]">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-3">
            {brand.logo_url ? (
              <img
                src={brand.logo_url}
                alt={brand.name}
                className="h-14 w-14 rounded-full border border-[#B08D57]/30 object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#B08D57]/30 bg-[#EDE9E1] font-serif text-xl text-[#2b2218]">
                {brand.name.charAt(0)}
              </div>
            )}
            <div>
              <SheetTitle className="font-serif text-2xl text-[#2b2218]">{brand.name}</SheetTitle>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-[#B08D57]">
                Score {Math.round(brand.rank_score)}
              </div>
            </div>
          </div>
        </SheetHeader>

        {brand.display_badges.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {brand.display_badges.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1 rounded-full border border-[#B08D57]/40 bg-white/60 px-3 py-1 text-[10px] uppercase tracking-wider text-[#2b2218]"
              >
                <CheckCircle2 className="h-3 w-3 text-[#B08D57]" />
                {b}
              </span>
            ))}
          </div>
        )}

        {brand.socials.length > 0 && (
          <div className="mt-4 flex gap-2">
            {brand.socials.map((s) => {
              const Icon =
                s.platform === "instagram" ? Instagram : s.platform === "tiktok" ? Music2 : Globe;
              return (
                <a
                  key={s.platform + s.url}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#B08D57]/40 bg-white/60 text-[#2b2218] transition hover:bg-white"
                  aria-label={s.platform}
                >
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
          </div>
        )}

        {brand.bio && (
          <p className="mt-5 font-serif text-sm leading-relaxed text-[#2b2218]/90">{brand.bio}</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
