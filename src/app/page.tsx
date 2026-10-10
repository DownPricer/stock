import { Suspense } from "react";
import { InventoryClient } from "@/components/InventoryClient";

export default function HomePage() {
  return (
    <Suspense fallback={<main className="p-4 text-zinc-500">Chargement…</main>}>
      <InventoryClient />
    </Suspense>
  );
}
