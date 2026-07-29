import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AppShell } from "@/components/factory/app-shell";
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
        title: "LVL Factory — Skill + Music Pack Factory | lvlltd.com",
      },
      {
        name: "description",
        content:
          "Local operator factory for music release kits and x402 sealed skill packs under the lvlltd.com domain family.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
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
        <AppShell>
          <Outlet />
        </AppShell>
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
