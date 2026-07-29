import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
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
        <HostRewrite />
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
