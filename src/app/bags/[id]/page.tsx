import { Suspense } from "react";
import { BagDetailClient } from "@/components/BagDetailClient";

export default function BagDetailPage() {
  return (
    <Suspense fallback={<main className="p-4 text-zinc-500">Chargement…</main>}>
      <BagDetailClient />
    </Suspense>
  );
}
