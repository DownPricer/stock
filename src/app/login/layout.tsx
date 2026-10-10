import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion — Stock SiteReady",
  description:
    "Connexion à Stock, inventaire de sacs. Créé par SiteReady.",
  robots: { index: true, follow: true },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
