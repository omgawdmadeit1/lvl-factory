import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { CommandPalette } from "@/components/edge/command-palette";
import { PerformanceProbe } from "@/components/edge/performance-probe";
import { AppShell } from "@/components/factory/app-shell";
import { HostRewrite } from "@/components/marketplace/host-rewrite";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      {
        title: "LVL Marketplace — shop · pay · agents | lvlltd.com",
      },
      {
        name: "description",
        content:
          "LVL marketplace on lvlltd.com: merch store, multi-rail pay, agent catalog, seller tools, and Printify POD across factory and subdomains.",
      },
      { name: "theme-color", content: "#0a0a0b" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/favicon.svg" },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <HostRewrite />
        <PerformanceProbe />
        <AppShell>
          <Outlet />
        </AppShell>
        <CommandPalette />
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            className: "border border-border bg-surface text-fg",
          }}
        />
        <Scripts />
      </body>
    </html>
  );
}
