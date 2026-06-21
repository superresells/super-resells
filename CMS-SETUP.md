# Store Manager (CMS) — one-time setup

The dashboard code is **already built** (`/admin` + `/data/*.json`). This guide
connects it so your brother can log in at **superresells.netlify.app/admin** and
manage products, photos, stock, reviews, and the sold wall — then hit **Publish**
and the live site updates itself in ~1 minute. No code, ever.

You only do this **once.** Ping me at any step and I'll walk you through it live.

---

## Step 1 — Put the site on GitHub  (≈10 min)

1. Make a free account at **github.com**.
2. Easiest path: install **GitHub Desktop** (desktop.github.com) → sign in.
3. In GitHub Desktop: **File → New repository** → name it `super-resells` →
   set the local path to the **`heir-standard` folder on your Desktop** → Create.
4. It'll show all the files as changes → write "first commit" → **Commit** →
   **Publish repository** (Private is fine).

> That uploads everything — `index.html`, `script.js`, `style.css`, and the
> `images/`, `brand/`, `data/`, and `admin/` folders.

## Step 2 — Connect the repo to your Netlify site  (≈5 min)

Keeps the **same superresells.netlify.app URL**, just swaps drag-drop for auto-deploy.

1. Netlify → your site → **Site configuration → Build & deploy → Continuous
   deployment** → **Link repository** → pick GitHub → choose `super-resells`.
2. Build settings: **Build command = empty**, **Publish directory = empty** (or `.`).
   It's a plain static site — no build step.
3. Save & deploy. From now on, every change (including ones your brother makes in
   the dashboard) auto-publishes.

## Step 3 — Turn on his login  (≈5 min)

1. Netlify site → **Identity** tab → **Enable Identity**.
2. **Identity → Registration preferences → Invite only** (so randoms can't sign up).
3. **Identity → Services → Git Gateway → Enable Git Gateway.**
4. **Identity → Invite users →** invite **super.resells@yahoo.com**.
5. He gets an email → clicks **Accept the invite** → it opens the site → he sets a
   password → he's dropped into **/admin**. Done.

> ⚠️ **If you don't see an "Identity" tab** (Netlify is phasing Identity out for some
> new sites), don't worry — tell me and I'll switch the dashboard to a **GitHub
> login** instead (one small config change on my end + a 2-minute step on yours).

---

## Using the dashboard (for your brother)

Go to **superresells.netlify.app/admin**, log in, and you'll see three sections:

- **🛍️ Shop Products** — Add a product (click **+**), type a title, set the price,
  pick the color + which **sizes are in stock**, and **drag in the front & back
  photos**. To take something off the site, delete it. Sold out of one size?
  Just uncheck it. **Hit Publish** when done.
- **⭐ Reviews** — Customer reviews get **emailed to you first**. To post a good one,
  add it here (name, stars, text) → Publish. Trolls never auto-appear.
- **🔥 Sold-Out Wall** — When a piece sells, delete it from Products and add it here
  (name + photo) to flex it on the "Recently Copped" wall.

Every **Publish** saves to GitHub and Netlify rebuilds the live site automatically
(about a minute). That's it — he never touches code.

---

## Editing without the dashboard (backup)

Everything the CMS manages is just three plain files you can also edit by hand:
`data/products.json`, `data/reviews.json`, `data/sold.json`. The CMS is only a
friendly front-end for those.
