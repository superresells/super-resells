# Store Manager (CMS) — how to log in & use it

The dashboard is **built and already connected.** The site lives on
**Cloudflare Pages** and auto-deploys from GitHub, so when your brother edits
products in the dashboard and hits **Publish**, the live site updates itself in
about a minute. No code, ever.

**Live site:** https://super-resells.pages.dev
**Dashboard:** https://super-resells.pages.dev/admin

> Already set up (you don't need to redo these): the site is on GitHub
> (`superresells/super-resells`) and connected to Cloudflare Pages on the
> `main` branch. Every push — including dashboard edits — deploys automatically.

---

## The only setup step: the login token  (≈3 min, once)

The dashboard (Sveltia CMS) logs in with a **GitHub Personal Access Token** —
no extra accounts, no OAuth. Generate one once and you're set:

1. On **github.com**, top-right avatar → **Settings** → scroll to **Developer
   settings** → **Personal access tokens → Fine-grained tokens** →
   **Generate new token**.
2. **Name:** "Super Resells CMS". **Expiration:** pick a date (or "no
   expiration"). **Repository access:** *Only select repositories* →
   `superresells/super-resells`. **Permissions:** under *Repository
   permissions*, set **Contents = Read and write** (this also auto-enables
   Metadata = Read). That's all it needs.
   *(Prefer the simpler classic tokens? Tokens (classic) → check the top-level
   `repo` box instead — same result, just broader.)*
3. **Generate token** → **copy it** (you only see it once — keep it private,
   like a password).
4. Go to **https://super-resells.pages.dev/admin** → choose **sign in with a
   personal access token** → paste it → done. He's in.

> The token is saved in his browser, so he rarely re-enters it. If he clears
> his browser or switches devices, he just signs in with the token again (or
> generates a fresh one). **Never paste the token into the website itself or
> share it** — it's the key to editing the store.

---

## Using the dashboard (for your brother)

Go to **https://super-resells.pages.dev/admin**, log in, and you'll see three
sections:

- **🛍️ Shop Products** — Add a product (click **+**), type a title, set the
  price, pick the color + which **sizes are in stock**, and **drag in the front
  & back photos**. To take something off the site, delete it. Sold out of one
  size? Just uncheck it. **Hit Publish** when done.
- **⭐ Reviews** — Customer reviews get **emailed to you first**. To post a good
  one, add it here (name, stars, text) → Publish. Trolls never auto-appear.
- **🔥 Sold-Out Wall** — When a piece sells, delete it from Products and add it
  here (name + photo) to flex it on the "Recently Copped" wall.

Every **Publish** saves to GitHub and **Cloudflare rebuilds the live site
automatically** (about a minute). That's it — he never touches code.

---

## Keeping it secure

The store is a plain static site, so there's very little to attack — but lock
down the two keys that *can* change it:

- **Turn on 2-factor authentication on the GitHub account** (github.com →
  Settings → Password and authentication). This is the real lock on your store;
  the dashboard can only change things through this account.
- **Keep the access token private.** Don't email it, post it, or commit it to
  the repo. If it ever leaks, delete it on GitHub (Developer settings → revoke)
  and generate a new one.
- **Spam on the forms:** in your **Formspree** dashboard you can flip on
  reCAPTCHA for the order/contact forms — the easiest way to stop bot spam.
- The site already ships security headers (see `_headers`) that block
  clickjacking and content injection automatically.

---

## Editing without the dashboard (backup)

Everything the CMS manages is just three plain files you can also edit by hand:
`data/products.json`, `data/reviews.json`, `data/sold.json`. The CMS is only a
friendly front-end for those. Edit, commit, and push (via GitHub Desktop) and
Cloudflare redeploys the same way.
