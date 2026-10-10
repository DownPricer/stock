"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { compressImage } from "@/lib/compress-image";
import { useToast } from "@/components/Toast";

export default function NewBagPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);

  async function onPhotoChange(file: File | null) {
    if (!file) {
      setPreview(null);
      setPhotoBlob(null);
      return;
    }
    const blob = await compressImage(file);
    setPhotoBlob(blob);
    setPreview(URL.createObjectURL(blob));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const form = new FormData();
      form.set("name", name.trim());
      form.set("quantity", quantity);
      form.set("purchasePrice", purchasePrice.replace(",", "."));
      form.set("targetPrice", targetPrice.replace(",", "."));
      if (photoBlob) {
        form.set("photo", photoBlob, "photo.jpg");
      }

      const res = await fetch("/api/bags", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Création impossible");
        return;
      }
      showToast("Sac ajouté");
      router.push(`/bags/${data.bag.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="px-4 pt-4">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Nouveau sac</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm text-zinc-600 dark:text-zinc-300">
            Photo
          </span>
          <div className="mb-2 aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                Aperçu
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="min-h-12 w-full text-sm"
            onChange={(e) => void onPhotoChange(e.target.files?.[0] || null)}
          />
        </label>

        <label className="block text-sm text-zinc-600 dark:text-zinc-300">
          Nom *
          <input
            required
            className="mt-1 min-h-12 w-full rounded-xl border border-zinc-200 px-3 dark:border-zinc-700 dark:bg-zinc-900"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="block text-sm text-zinc-600 dark:text-zinc-300">
          Quantité reçue *
          <input
            required
            type="number"
            inputMode="numeric"
            min={0}
            className="mt-1 min-h-12 w-full rounded-xl border border-zinc-200 px-3 dark:border-zinc-700 dark:bg-zinc-900"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm text-zinc-600 dark:text-zinc-300">
            Prix d&apos;achat *
            <input
              required
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              className="mt-1 min-h-12 w-full rounded-xl border border-zinc-200 px-3 dark:border-zinc-700 dark:bg-zinc-900"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
            />
          </label>
          <label className="block text-sm text-zinc-600 dark:text-zinc-300">
            Prix visé *
            <input
              required
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              className="mt-1 min-h-12 w-full rounded-xl border border-zinc-200 px-3 dark:border-zinc-700 dark:bg-zinc-900"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-teal-700 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </main>
  );
}
