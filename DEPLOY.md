# Deployment Guide

This deploys:

- **Backend** to a Hetzner VM at `https://<vm-ip>.sslip.io` (Let's Encrypt TLS, no domain needed).
- **Frontend** to Vercel as a PWA, pointed at the backend.

You'll need:

- A Hetzner VM running Ubuntu 24.04 LTS (or 22.04), with a public IPv4 address and SSH access.
- A Vercel account (free) linked to your GitHub.

---

## Part 1 — Backend on Hetzner

### 1.1 Open ports on the VM

Hetzner Cloud firewall (if enabled in the Cloud Console): allow inbound **TCP 22, 80, 443**. The
install script also configures `ufw` on the VM itself for the same ports.

### 1.2 SSH in and run the install script

```bash
ssh root@<vm-ip>
```

Find the VM's public IPv4. Suppose it's `203.0.113.42`. Then your `sslip.io` hostname is
`203.0.113.42.sslip.io` (no DNS setup needed — sslip.io always resolves `a.b.c.d.sslip.io` to
`a.b.c.d`).

Then, **on the VM**:

```bash
curl -fsSL https://raw.githubusercontent.com/jesusredondofilloy/fit-file-tools/main/deploy/install.sh \
  | sudo bash -s -- \
    --host 203.0.113.42.sslip.io \
    --email you@example.com
```

(You can omit `--email`; certbot will register without one. Adding it gets you cert-expiry
warnings from Let's Encrypt.)

You'll skip `--vercel-origin` for now — we don't know the Vercel URL yet. We'll add it after
Part 2.

This script does (idempotent — safe to re-run):

1. Installs `python3.12`, `nginx`, `certbot`, `ufw`.
2. Creates a `fittools` system user.
3. Clones the repo to `/srv/fit-file-tools`.
4. Creates a virtualenv and installs the Python deps.
5. Writes `/srv/fit-file-tools/backend/.env`.
6. Installs the `fit-file-tools` systemd service.
7. Installs the nginx vhost with rate limiting.
8. Configures `ufw` (SSH + HTTP + HTTPS).
9. Issues a Let's Encrypt cert and redirects HTTP → HTTPS.

### 1.3 Verify

```bash
curl https://203.0.113.42.sslip.io/health
# → {"status":"ok"}
```

If anything fails:

```bash
sudo systemctl status fit-file-tools
sudo journalctl -u fit-file-tools -e --no-pager
sudo nginx -t
```

---

## Part 2 — Frontend on Vercel

### 2.1 Import the repo

1. Go to <https://vercel.com/new>.
2. Click **Import** next to `jesusredondofilloy/fit-file-tools`.
3. Leave all defaults — the root `vercel.json` already tells Vercel:
   - Build command: `cd frontend && npm install && npm run build`
   - Output directory: `frontend/dist`
4. Under **Environment Variables**, add:

   | Name           | Value                                  |
   | -------------- | -------------------------------------- |
   | `VITE_API_URL` | `https://203.0.113.42.sslip.io`        |

   (Use **your** sslip.io hostname.)

5. Click **Deploy**.

After ~1 minute you get a URL like `https://fit-file-tools-abc123.vercel.app`. Open it on Android,
tap the browser's ⋮ menu → **Install app**. Now it's an installable PWA.

### 2.2 Tell the backend to trust the Vercel origin

Back on the VM, edit `/srv/fit-file-tools/backend/.env`:

```bash
sudo nano /srv/fit-file-tools/backend/.env
```

Set:

```
ALLOWED_ORIGINS=http://localhost:5173,https://fit-file-tools-abc123.vercel.app
```

(Use **your** Vercel URL. If you set a custom domain in Vercel later, add that too, separated by
commas.)

Then restart:

```bash
sudo systemctl restart fit-file-tools
```

Test from your phone or laptop: pick two `.fit` files, tap **Merge**, the merged file
downloads.

---

## Day-2 — Pushing updates

After you commit and push to `main`:

- **Frontend**: Vercel auto-deploys.
- **Backend**: SSH to the VM and run:

  ```bash
  sudo /srv/fit-file-tools/deploy/update.sh
  ```

  Which fetches main, reinstalls deps if needed, restarts the systemd service.

Tail logs:

```bash
sudo journalctl -u fit-file-tools -f
```

---

## Troubleshooting

**CORS error in the browser console.** The backend's `ALLOWED_ORIGINS` doesn't include the
Vercel URL. Edit `/srv/fit-file-tools/backend/.env` and `sudo systemctl restart fit-file-tools`.

**413 Request Entity Too Large.** Bump `client_max_body_size` in
`deploy/nginx/fit-file-tools.conf` (currently 25M), then re-run the install script (or
`sudo nginx -t && sudo systemctl reload nginx`).

**Certbot fails.** Make sure the VM's public IP actually resolves through sslip.io:

```bash
dig +short 203.0.113.42.sslip.io   # should print 203.0.113.42
```

And that port 80 is open from the public internet (Hetzner Cloud firewall + ufw).

**Want a real domain later.** Point an `A` record at the VM's IP, then on the VM:

```bash
sudo certbot --nginx -d api.yourdomain.com
sudo nano /etc/nginx/sites-available/fit-file-tools.conf   # update server_name
sudo systemctl reload nginx
```

And update `VITE_API_URL` in Vercel.
