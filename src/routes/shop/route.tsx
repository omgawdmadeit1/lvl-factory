import { Outlet, createFileRoute } from "@tanstack/react-router";
import { StoreShell } from "@/components/store/store-shell";

export const Route = createFileRoute("/shop")({
  component: ShopLayout,
  head: () => ({
    meta: [
      {
        title: "LVL Store — Merch & Art | lvlltd.com",
      },
      {
        name: "description",
        content:
          "LVL Ltd merch and art shop. Printify POD, multi-rail agent checkout on factory.lvlltd.com.",
      },
    ],
  }),
});

function ShopLayout() {
  return (
    <StoreShell>
      <Outlet />
    </StoreShell>
  );
}
