# Stock SiteReady

PWA personnelle d’inventaire de sacs (achat-revente).  
En ligne : [https://stock.sitereadyshd.fr](https://stock.sitereadyshd.fr)  
Stack : Next.js (App Router) · TypeScript · Tailwind · Prisma · SQLite.

Interface 100 % française, montants en euros. Un seul utilisateur (mot de passe unique).

## Phase 1 (livrée)

- Connexion (cookie httpOnly, rate limit)
- Inventaire +/− (réception / vente / perte / correction) + toast Annuler 5 s
- Nouveau sac (photo compressée côté client)
- Comptes de vente (créer / renommer / archiver)
- Fiche sac + historique
- Manifest PWA installable + `noindex`
- Tests unitaires de la logique stock

Phases suivantes : mise en vente par compte & alertes UI, chiffres, historique global, offline queue, sauvegardes automatisées.

## Structure

```
prisma/                 Schéma + migrations SQLite
src/app/                Pages App Router + routes API
src/components/         UI mobile (cartes, sheets, nav, toasts)
src/lib/auth/           Session JWT (jose) + rate limit
src/lib/stock/          Règles métier (transactions Movement)
src/proxy.ts            Garde d'auth (Next.js Proxy)
public/manifest…        PWA
data/                   Local uniquement (gitignore) — DB + photos
DEPLOY.md               Commandes VPS + diagnostic
```

## Modèles Prisma

| Modèle | Rôle |
|--------|------|
| `Bag` | Sac : nom, photo, prix, stock, seuil, notes, archivage |
| `Account` | Compte de vente : nom, plateforme, couleur, commission % |
| `Listing` | Quantité d’un sac en vente sur un compte |
| `Movement` | Journal : RECEPTION, MISE_EN_VENTE, RETRAIT_VENTE, VENTE, AJUSTEMENT, PERTE |

Toute mutation de stock passe par un `Movement` en transaction. Stock jamais &lt; 0.

## Routes pages

| Route | Description |
|-------|-------------|
| `/login` | Connexion |
| `/` | Inventaire |
| `/bags/new` | Nouveau sac |
| `/bags/[id]` | Fiche sac |
| `/accounts` | Comptes |

## Routes API

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/logout` | Déconnexion |
| GET | `/api/auth/me` | Session |
| GET/POST | `/api/bags` | Liste / création |
| GET/PATCH | `/api/bags/[id]` | Détail / màj / archive |
| GET/POST | `/api/accounts` | Liste / création |
| PATCH | `/api/accounts/[id]` | Renommer / archiver |
| POST | `/api/movements` | Appliquer un mouvement |
| POST | `/api/movements/[id]/undo` | Annuler |
| GET | `/api/uploads/[...path]` | Photo (auth requise) |

## Dev local

```bash
cp .env.example .env
# Ajuster DATABASE_URL=file:../data/db/dev.db et UPLOAD_DIR=./data/uploads
# Générer APP_PASSWORD_HASH et SESSION_SECRET

mkdir -p data/db data/uploads
npm install
npx prisma migrate dev
npm run dev
```

Mot de passe de dev par défaut si tu gardes le hash du `.env` local généré : `changeme` (à changer).

```bash
npm test          # vitest — logique stock
npm run build
npm start
```

## Données persistantes

En production, SQLite et photos vivent **hors du dépôt** (`/var/www/stock-data/…`).  
Voir [DEPLOY.md](./DEPLOY.md).
