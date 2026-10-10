# Déploiement — stock.sitereadyshd.fr

Tu déploies à la main sur le VPS. Ce fichier commence par le **diagnostic** : lance l’étape 0, colle le résultat dans le chat, et on adaptera le reverse proxy / le process manager / le port avant la première install définitive.

Ne redémarre et ne modifie **aucun autre site**.

---

## Étape 0 — Diagnostic VPS (à lancer en premier)

Connecte-toi en SSH, puis exécute **toutes** ces commandes et conserve la sortie :

```bash
echo "=== OS ==="
uname -a
cat /etc/os-release | head -n 5

echo "=== Ports 80/443 et écoute ==="
ss -tlnp | grep -E ':80|:443' || true
ss -tlnp

echo "=== Nginx ==="
command -v nginx && nginx -v 2>&1 || echo "nginx: absent"
ls -la /etc/nginx/sites-enabled 2>/dev/null || true
ls -la /etc/nginx/conf.d 2>/dev/null || true

echo "=== Caddy ==="
command -v caddy && caddy version 2>&1 || echo "caddy: absent"
ls -la /etc/caddy 2>/dev/null || true

echo "=== Apache ==="
command -v apache2 && apache2 -v 2>&1 || command -v httpd && httpd -v 2>&1 || echo "apache: absent"

echo "=== Process managers ==="
command -v pm2 && pm2 list || echo "pm2: absent"
systemctl list-units --type=service --state=running | grep -Ei 'node|next|pm2|caddy|nginx|docker|traefik' || true

echo "=== Docker ==="
command -v docker && docker ps || echo "docker: absent"

echo "=== Node ==="
command -v node && node -v || echo "node: absent"
command -v npm && npm -v || echo "npm: absent"

echo "=== Certbot / acme ==="
command -v certbot && certbot --version 2>&1 || echo "certbot: absent"
ls /etc/letsencrypt/live 2>/dev/null || true

echo "=== Autres sites connus ==="
ls /var/www 2>/dev/null || true
ls /home 2>/dev/null || true
```

**DNS à créer (dès maintenant, TTL bas si possible) :**

| Type | Nom / hôte | Valeur |
|------|------------|--------|
| `A` | `stock` | *IP publique du VPS* |

→ `stock.sitereadyshd.fr` doit pointer vers le VPS (ou `CNAME` `stock` → le hostname du VPS si tu utilises déjà ça).

---

## Première installation (à adapter après le diagnostic)

Les chemins / le port `3007` / nginx vs Caddy / pm2 vs systemd sont des **propositions**. On les confirmera avec ta sortie d’étape 0.

### 1. Dossiers code + données persistantes

```bash
# Code (exemple)
sudo mkdir -p /var/www/stock.sitereadyshd.fr
sudo chown "$USER":"$USER" /var/www/stock.sitereadyshd.fr

# Données HORS dépôt (ne jamais git pull ici)
sudo mkdir -p /var/www/stock-data/db /var/www/stock-data/uploads /var/www/stock-data/backups
sudo chown -R "$USER":"$USER" /var/www/stock-data
```

### 2. Clone / pull

```bash
cd /var/www/stock.sitereadyshd.fr
git clone <URL_DU_DEPOT> .
# ou, si déjà cloné :
# git pull
```

### 3. Variables d’environnement

```bash
cp .env.example .env
nano .env
```

Renseigner au minimum :

- `DATABASE_URL="file:/var/www/stock-data/db/prod.db"`
- `UPLOAD_DIR="/var/www/stock-data/uploads"`
- `APP_PASSWORD_HASH` (voir ci-dessous)
- `SESSION_SECRET` (`openssl rand -base64 48`)
- `NEXT_PUBLIC_APP_URL="https://stock.sitereadyshd.fr"`
- `PORT=3007` *(changer si le port est pris — voir `ss -tlnp`)*

Générer le hash du mot de passe :

```bash
cd /var/www/stock.sitereadyshd.fr
node -e "require('bcryptjs').hash('TON_MOT_DE_PASSE',10).then(console.log)"
```

Coller le résultat dans `APP_PASSWORD_HASH` en **échappant chaque `$`**  
(ex. `APP_PASSWORD_HASH=\$2b\$10\$…`) — sinon Next.js (dotenv-expand) mange le hash.

### 4. Dépendances, migration, build

```bash
cd /var/www/stock.sitereadyshd.fr
npm ci
npx prisma migrate deploy
npm run build
```

### 5. Lancement (exemple PM2)

```bash
npm i -g pm2
cd /var/www/stock.sitereadyshd.fr
pm2 start npm --name stock-siteready -- start -- -p 3007
pm2 save
pm2 startup
```

Ne touche pas aux autres process PM2.

### 6. Reverse proxy + HTTPS

**Exemple Nginx** (fichier dédié uniquement à ce host) :

```nginx
# /etc/nginx/sites-available/stock.sitereadyshd.fr
server {
    listen 80;
    server_name stock.sitereadyshd.fr;

    location / {
        proxy_pass http://127.0.0.1:3007;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 8m;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/stock.sitereadyshd.fr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d stock.sitereadyshd.fr
```

**Si tu utilises Caddy** à la place, un bloc du type :

```
stock.sitereadyshd.fr {
    reverse_proxy 127.0.0.1:3007
}
```

puis recharger Caddy **sans** toucher aux autres hosts.

### 7. Sauvegarde quotidienne (ébauche Phase 3)

```bash
# Exemple cron — à valider plus tard
# 0 3 * * * rsync -a /var/www/stock-data/ /var/www/stock-data/backups/$(date +\%Y\%m\%d)/ && find /var/www/stock-data/backups -mindepth 1 -maxdepth 1 -mtime +14 -exec rm -rf {} \;
```

---

## Mise à jour

```bash
cd /var/www/stock.sitereadyshd.fr
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 restart stock-siteready
# ou équivalent systemd / process manager détecté à l'étape 0
```

Ne jamais `git pull` dans `/var/www/stock-data`.

---

## Checklist après go-live

- [ ] `https://stock.sitereadyshd.fr` répond (cadenas OK)
- [ ] Écran de connexion, puis inventaire
- [ ] Installable sur l’écran d’accueil (manifest PWA)
- [ ] Création d’un compte + d’un sac avec photo
- [ ] + / − et toast Annuler
- [ ] Les autres sites du VPS fonctionnent toujours
