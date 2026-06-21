import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center">
      <div className="max-w-md">
        <p className="text-[10px] tracking-museum uppercase text-gold/70">Égaré dans le musée</p>
        <h1 className="mt-4 font-display text-5xl text-foreground">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Cette salle ne figure pas dans le plan du Musée.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center justify-center rounded-sm border border-gold/40 px-5 py-2 text-[10px] tracking-room uppercase text-gold-soft transition-colors hover:bg-gold hover:text-primary-foreground"
        >
          Retour au Hall
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center">
      <div className="max-w-md">
        <h1 className="font-display text-2xl text-foreground">Le musée a vacillé</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Une porte s'est refermée. Vous pouvez réessayer ou rejoindre le Hall.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-sm border border-gold/40 px-4 py-2 text-[10px] tracking-room uppercase text-gold-soft hover:bg-gold hover:text-primary-foreground"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="rounded-sm border border-border px-4 py-2 text-[10px] tracking-room uppercase text-muted-foreground hover:text-foreground"
          >
            Hall
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0B0B0F" },
      { title: "Le Musée par Delanoche Paris" },
      { name: "description", content: "Musée numérique et réseau de créateurs de mode. Découvrez les portes des maisons, leurs expositions et leur livre d'or." },
      { property: "og:title", content: "Le Musée par Delanoche Paris" },
      { property: "og:description", content: "Musée numérique des créateurs de mode. Mystère, prestige, découverte." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster theme="dark" position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
