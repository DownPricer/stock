# Déploiement — stock.sitereadyshd.fr

Procédure alignée sur le **guide VPS** (section 7 et suivantes).  
Stack : conteneur `fastbag-web` derrière le reverse proxy central `downpricer-nginx`, réseau Docker externe `downpricer_downpricer-network`.

**Règles absolues**

- Ne modifier **aucune** conf Nginx d’un autre site.
- Jamais `docker system prune`, `docker volume prune`, ni `docker compose down -v`.
- Aucun secret dans Git ni dans le chat (mot de passe, `SESSION_SECRET`, hash).
- Données (SQLite + photos) uniquement dans `/opt/fastbag-data` (bind mount → `/data`).

Fichiers utiles dans ce dépôt :

| Fichier | Rôle |
|---------|------|
| `Dockerfile` | Image Next.js standalone + OpenSSL / Prisma |
| `docker-compose.yml` | Service `fastbag-web`, `expose: 3000`, pas de `ports:` |
| `deploy/nginx/stock-sitereadyshd.http.conf` | Vhost HTTP seul |
| `deploy/nginx/stock-sitereadyshd.https.conf` | Vhost HTTP→HTTPS + TLS |
| `.env.example` | Modèle pour `/opt/fastbag/.env` (à créer à la main) |

---

## 1. Découverte (avant tout)

Sur le VPS, lance **d’abord** ce bloc (commandes de découverte du guide + RAM / disque) et garde la sortie :

```bash
echo "=== Découverte (guide p.2) ==="
hostname
uname -a
cat /etc/os-release | head -n 8
whoami
pwd

echo "=== RAM / disque ==="
free -h
df -h /

echo "=== Docker ==="
docker --version
docker compose version
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
docker network ls
docker network inspect downpricer_downpricer-network --format '{{.Name}} containers={{range .Containers}}{{.Name}} {{end}}'

echo "=== Proxy central ==="
ls -la /opt/downpricer/nginx/conf.d
ls -la /opt/downpricer/nginx/ssl
docker exec downpricer-nginx nginx -t
docker exec downpricer-nginx nginx -T 2>/dev/null | grep -E 'server_name|listen ' | head -n 60
```

**Si la RAM libre est faible** (souvent &lt; 1 Go disponible) : construis l’image **en local** (PC), exporte-la, et importe-la sur le VPS au lieu de `docker compose up -d --build` sur le serveur.

```bash
# Sur le PC (Docker Desktop), depuis le clone du dépôt stock :
docker build -t fastbag-web:latest .
docker save fastbag-web:latest | gzip > fastbag-web.tar.gz
# Transfert vers le VPS (scp), puis sur le VPS :
gunzip -c fastbag-web.tar.gz | docker load
# Dans docker-compose.yml tu peux alors utiliser image: fastbag-web:latest
# et lancer : docker compose up -d   (sans --build)
```

---

## 2. DNS

Chez OVH (ou ton registrar), zone `sitereadyshd.fr` :

| Type | Nom | Valeur |
|------|-----|--------|
| `A` | `stock` | `51.210.179.212` |

- **Pas de AAAA** pour `stock`.
- Attends la propagation (`dig +short stock.sitereadyshd.fr A` → `51.210.179.212`) avant le certificat.

---

## 3. Clone, données, `.env`

```bash
sudo mkdir -p /opt/fastbag /opt/fastbag-data/db /opt/fastbag-data/uploads
sudo chown -R "$USER":"$USER" /opt/fastbag
# UID 1001 = user nextjs dans l'image (écriture SQLite + photos)
sudo chown -R 1001:1001 /opt/fastbag-data

cd /opt/fastbag
git clone https://github.com/DownPricer/stock.git .

# Créer le .env À LA MAIN (ne pas committer)
cp .env.example .env
nano .env
```

Dans `.env` (valeurs **réelles**, jamais `changeme`) :

- `DATABASE_URL="file:/data/db/prod.db"`
- `UPLOAD_DIR="/data/uploads"`
- `APP_PASSWORD_HASH=...` (hash bcrypt, chaque `$` échappé en `\$`)
- `SESSION_SECRET=...` (`openssl rand -base64 48`)
- `NEXT_PUBLIC_APP_URL="https://stock.sitereadyshd.fr"`
- `NODE_ENV="production"`
- `PORT=3000`
- `HOSTNAME=0.0.0.0`

Générer le hash (exemple, sans afficher le mot de passe dans l’historique si tu peux) :

```bash
cd /opt/fastbag
# Installer bcryptjs une fois si besoin, ou via conteneur node :
docker run --rm -v "$PWD":/app -w /app node:20-bookworm-slim \
  bash -lc 'npm install bcryptjs@3 --no-save && node -e "require(\"bcryptjs\").hash(process.argv[1],10).then(console.log)" "TON_MOT_DE_PASSE"'
```

Coller le hash dans `.env` en échappant les `$`.

---

## 4. Build & démarrage + test depuis le proxy

```bash
cd /opt/fastbag
docker compose up -d --build
docker compose ps
docker compose logs --tail=80 web
```

**Test obligatoire depuis le conteneur Nginx** (ne passe à la suite que si ça répond) :

```bash
docker exec downpricer-nginx sh -lc 'curl -sI http://fastbag-web:3000 | head -n 20'
```

Tu dois voir une réponse HTTP (ex. `HTTP/1.1 200` ou `307`/`302` vers `/login`).  
Si `Could not resolve host` : vérifier que `fastbag-web` est bien sur `downpricer_downpricer-network` (`docker network inspect downpricer_downpricer-network`).

---

## 5. Nginx — HTTP seul

```bash
# Sauvegarde des confs existantes (ne touche pas aux autres vhosts)
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p "/opt/downpricer/nginx/conf.d.bak-$TS"
cp -a /opt/downpricer/nginx/conf.d/. "/opt/downpricer/nginx/conf.d.bak-$TS/"

# Ajouter UNIQUEMENT le vhost stock (HTTP)
cp /opt/fastbag/deploy/nginx/stock-sitereadyshd.http.conf \
  /opt/downpricer/nginx/conf.d/stock-sitereadyshd.conf

docker exec downpricer-nginx nginx -t
```

**Si `nginx -t` échoue : ne pas reload.** Corrige ou retire le fichier, puis reteste.

```bash
# Uniquement si nginx -t est OK :
docker exec downpricer-nginx nginx -s reload
curl -sI -H 'Host: stock.sitereadyshd.fr' http://127.0.0.1/ | head -n 20
```

---

## 6. Certificat Let's Encrypt (standalone — section 9 du guide)

Le proxy doit être **arrêté** pendant l’opération (port 80 libre).  
Prépare tout, puis exécute **ce bloc d’un seul tenant** :

```bash
DOMAIN=stock.sitereadyshd.fr
EMAIL=contact@sitereadyshd.fr

docker stop downpricer-nginx

sudo docker run --rm \
  -p 80:80 \
  -v /opt/downpricer/nginx/ssl:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  --cert-name "$DOMAIN" \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email

sudo mkdir -p "/opt/downpricer/nginx/ssl/$DOMAIN"
sudo cp -L "/opt/downpricer/nginx/ssl/live/$DOMAIN/fullchain.pem" \
  "/opt/downpricer/nginx/ssl/$DOMAIN/fullchain.pem"
sudo cp -L "/opt/downpricer/nginx/ssl/live/$DOMAIN/privkey.pem" \
  "/opt/downpricer/nginx/ssl/$DOMAIN/privkey.pem"
sudo chmod 640 "/opt/downpricer/nginx/ssl/$DOMAIN/privkey.pem"

docker start downpricer-nginx
docker exec downpricer-nginx nginx -t
docker exec downpricer-nginx nginx -s reload
```

Vérifie les fichiers :

```bash
sudo ls -la /opt/downpricer/nginx/ssl/stock.sitereadyshd.fr/
```

---

## 7. Nginx — passage HTTPS

```bash
cp /opt/fastbag/deploy/nginx/stock-sitereadyshd.https.conf \
  /opt/downpricer/nginx/conf.d/stock-sitereadyshd.conf

docker exec downpricer-nginx nginx -t
```

**Si `nginx -t` échoue : ne pas reload.** Remets la conf HTTP ou corrige les chemins SSL.

```bash
docker exec downpricer-nginx nginx -s reload
curl -sI https://stock.sitereadyshd.fr | head -n 20
```

---

## 8. Vérifications (section 10) + non-régression

```bash
# Stock
curl -sI https://stock.sitereadyshd.fr | head -n 20
curl -sI http://stock.sitereadyshd.fr | head -n 20   # doit rediriger vers https

# Depuis le proxy
docker exec downpricer-nginx sh -lc 'curl -sI http://fastbag-web:3000 | head -n 10'

# Conteneur / données
docker ps --filter name=fastbag-web
ls -la /opt/fastbag-data/db /opt/fastbag-data/uploads

# Autres sites — ne doivent PAS avoir bougé
curl -sI https://sitereadyshd.fr | head -n 15
curl -sI https://downpricer.com | head -n 15
```

Checklist manuelle :

- [ ] Connexion avec le vrai mot de passe
- [ ] Inventaire + création d’un sac avec photo
- [ ] Cookie de session OK en HTTPS (pas de boucle login)
- [ ] `sitereadyshd.fr` et `downpricer.com` inchangés

---

## 9. Mise à jour

```bash
cd /opt/fastbag
git status
git pull origin main
docker compose up -d --build
docker compose logs --tail=80 web
docker exec downpricer-nginx sh -lc 'curl -sI http://fastbag-web:3000 | head -n 10'
```

Ne jamais `git pull` dans `/opt/fastbag-data`.  
Jamais `docker compose down -v`.

---

## 10. Sauvegarde quotidienne de `/opt/fastbag-data`

```bash
sudo mkdir -p /opt/fastbag-backups
sudo tee /usr/local/bin/backup-fastbag-data.sh >/dev/null <<'EOF'
#!/bin/bash
set -eu
SRC=/opt/fastbag-data
DEST=/opt/fastbag-backups
KEEP_DAYS=14
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$DEST"
tar -czf "$DEST/fastbag-data-$STAMP.tar.gz" -C "$(dirname "$SRC")" "$(basename "$SRC")"
find "$DEST" -type f -name 'fastbag-data-*.tar.gz' -mtime +$KEEP_DAYS -delete
EOF
sudo chmod +x /usr/local/bin/backup-fastbag-data.sh

# Cron : tous les jours à 03:15
( sudo crontab -l 2>/dev/null | grep -v backup-fastbag-data ; \
  echo '15 3 * * * /usr/local/bin/backup-fastbag-data.sh >> /var/log/backup-fastbag.log 2>&1' \
) | sudo crontab -
```

---

## 11. Renouvellement du certificat (sync section 6, avant 90 jours)

Après un renouvellement Certbot (standalone : même principe — arrêter Nginx, `certbot renew` / `certonly`, redémarrer), **resynchroniser** les fichiers utilisés par Nginx :

```bash
DOMAIN=stock.sitereadyshd.fr

sudo mkdir -p "/opt/downpricer/nginx/ssl/$DOMAIN"
sudo cp -L "/opt/downpricer/nginx/ssl/live/$DOMAIN/fullchain.pem" \
  "/opt/downpricer/nginx/ssl/$DOMAIN/fullchain.pem"
sudo cp -L "/opt/downpricer/nginx/ssl/live/$DOMAIN/privkey.pem" \
  "/opt/downpricer/nginx/ssl/$DOMAIN/privkey.pem"

docker exec downpricer-nginx nginx -t
docker exec downpricer-nginx nginx -s reload
curl -sI "https://$DOMAIN" | head -n 15
```

À refaire **avant 90 jours** (ou après chaque `certbot renew` qui a régénéré le cert).

---

## Interdits (rappel)

```bash
# NE PAS lancer :
# docker system prune
# docker volume prune
# docker compose down -v
# nano sur un autre *.conf que stock-sitereadyshd.conf
```
