import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, LogOut, Shield, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function MuseumHeader() {
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onAuthPage = pathname.startsWith("/auth");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) setIsAdmin(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
        <Link to="/" className="group flex flex-col leading-none">
          <span className="font-display text-[15px] text-gold-soft">Le Musée</span>
          <span className="font-sans text-[9px] tracking-museum text-muted-foreground uppercase">
            par Delanoche Paris
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {user ? (
            <>
              <Link
                to="/favoris"
                className="flex h-9 w-9 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-gold"
                aria-label="Mes marques suivies"
              >
                <Heart className="h-4 w-4" />
              </Link>
              <button
                onClick={() => signOut()}
                className="flex h-9 w-9 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-gold"
                aria-label="Quitter le musée"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : !onAuthPage ? (
            <Link
              to="/auth"
              className="flex items-center gap-2 rounded-sm border border-gold/40 px-3 py-1.5 text-[10px] tracking-room uppercase text-gold-soft transition-colors hover:bg-gold hover:text-primary-foreground"
            >
              <UserIcon className="h-3 w-3" />
              Entrer
            </Link>
          ) : null}
        </nav>
      </div>
      <div className="gold-rule" />
    </header>
  );
}

export function PageFrame({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-5xl px-5 py-8 fade-up">{children}</div>;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-[10px] tracking-museum uppercase text-gold/80">
      <span className="h-px w-6 bg-gold/50" />
      {children}
    </div>
  );
}
