import { Link, useRouterState } from "@tanstack/react-router";
import { Landmark, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function AdminTabBar() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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

  if (!isAdmin) return null;
  if (pathname.startsWith("/auth") || pathname.startsWith("/admin-login")) return null;

  const onAdmin = pathname.startsWith("/admin");

  return (
    <>
      {/* spacer so content isn't hidden behind fixed bar */}
      <div aria-hidden className="h-16" />
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-gold/30 bg-background/95 backdrop-blur-md"
        aria-label="Navigation administrateur"
      >
        <div className="mx-auto grid max-w-5xl grid-cols-2">
          <Link
            to="/etage/$num"
            params={{ num: "1" }}
            className={`flex flex-col items-center justify-center gap-1 py-3 text-[10px] tracking-room uppercase transition-colors ${
              !onAdmin ? "text-gold" : "text-muted-foreground hover:text-gold-soft"
            }`}
          >
            <Landmark className="h-4 w-4" />
            Musée
          </Link>
          <Link
            to="/admin"
            className={`flex flex-col items-center justify-center gap-1 py-3 text-[10px] tracking-room uppercase transition-colors ${
              onAdmin ? "text-gold" : "text-muted-foreground hover:text-gold-soft"
            }`}
          >
            <Shield className="h-4 w-4" />
            Cabinet du Musée
          </Link>
        </div>
      </nav>
    </>
  );
}
