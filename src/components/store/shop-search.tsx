import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ShopSearch({
  className,
  defaultQuery = "",
  compact,
}: {
  className?: string;
  defaultQuery?: string;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState(defaultQuery);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    void navigate({
      to: "/shop/search",
      search: { q: query || undefined },
    });
  }

  return (
    <form
      onSubmit={submit}
      className={cn("relative", className)}
      role="search"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={compact ? "Search" : "Search merch, art, SKUs…"}
        className={cn("pl-10", compact ? "min-h-10" : "min-h-11")}
        aria-label="Search store"
        name="q"
      />
    </form>
  );
}
