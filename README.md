# SUPER RESELLS — store guide

A premium streetwear storefront. Customers browse, add to an order, and send
it — **no online payment**. You confirm availability + total, then collect
payment your way (Venmo / Zelle / PayPal / Stripe invoice).

Everything you'll normally touch lives in **`script.js`**, right at the top.

---

## 1. Change the products

**The easy way → the Store Manager dashboard.** It's already connected (see
**`CMS-SETUP.md`**), so your brother just goes to `super-resells.pages.dev/admin`,
logs in, and adds/edits/deletes products — renaming titles, dragging in photos,
checking which **sizes are in stock** — then hits **Publish**. No code.

**Under the hood**, every product lives in **`data/products.json`** (the dashboard
just edits this file). Each entry:

```json
{ "id": "hs25", "name": "New Drop Tee", "price": 50, "cat": "Black",
  "badge": "Just Dropped", "sizes": ["M", "L"], "colors": "Black · Pink print",
  "img": "images/p/hs25-f.jpg", "back": "images/p/hs25-b.jpg",
  "desc": "Short sell-line about the shirt." }
```

- **id** — any unique short code (hs25, hs26, …). Must be unique.
- **price** — number only. (Everything is **$50** right now; the stack pricing in
  `script.js → PRICE_TABLE` handles the multi-buy deals.)
- **cat** — color filter group: `Black`, `White`, `Blue`, `Tan`.
- **badge** — `"Just Dropped"` / `"Best Seller"` (also feature on the homepage),
  `"Last One"` / `"Limited"` (red urgency badge), or `""` for none.
- **sizes** — the sizes **in stock**. Sold a size? Remove it. Whole piece gone?
  Delete the entry (and add it to `data/sold.json` for the sold wall).
- **img / back** — front and back photos. Leave `img` blank for a clean placeholder.

### Photos  (front + back)
The cards show the **front** photo; hover (and the quick view) reveals the **back**.
The dashboard uploads photos straight into **`images/p/`**. Editing by hand instead?
Drop the file in `images/p/` and point `img`/`back` at it. (Originals are kept in
`images/products/`.)

---

## 2. Change the stack pricing  (`script.js` → `PRICE_TABLE`)

This is the official "X for $Y" deal guide. The total depends only on **how many
pieces** are in the cart. Edit a row and the whole site updates — the slider, the
homepage deal sheet, the cart, the checkout, and the savings toast.

```js
const BASE_PRICE = 50;             // single-piece price
const PRICE_TABLE = [              // [ quantity, total price ]
  [1, 50], [2, 85], [3, 120], [4, 140], [5, 160], [6, 180], [7, 200],
  [8, 220], [9, 240], [10, 260], [12, 300], [15, 360], [20, 460],
  [25, 550], [30, 660],
];
```
Quantities between rows are filled in automatically (e.g. 11 → $280). The
`STACK_MILESTONES` list right below controls which quantities pop the gold
"stack savings" toast. *(If you change `BASE_PRICE` from $50, also update each
product's `price` so the math lines up.)*

### Sold-out wall  (`script.js` → `SOLD`)
When a piece sells, cut its block from `PRODUCTS` and add a quick line to `SOLD`:
```js
const SOLD = [
  { name: "Ghostface Cough Syrup Tee", img: "images/p/hs04-f.jpg" },
];
```
It shows on the homepage **"Recently Copped"** wall with a SOLD stamp (great for
FOMO). Empty `SOLD` = the section hides itself. **Don't list pieces here that
haven't actually sold** — it's real social proof, keep it honest.

---

## 3. Where orders go  (`script.js`, top section)

Right now, when a customer sends an order it opens **their email app**
pre-filled to you. That works today with zero setup — just set your email:

```js
const ORDER_EMAIL = "yourname@gmail.com";
const ORDER_PHONE = "(512) 555-0142";   // optional, shown to customers
```

**Better (recommended): get orders automatically.**
1. Go to **formspree.io**, make a free account, create a form.
2. Copy your form ID (looks like `xayzgwpq`).
3. Paste it here:
   ```js
   const FORMSPREE_ID = "xayzgwpq";
   ```
Now every order is emailed to you instantly — no customer email app needed.
The same setup also powers the Contact page form.

---

## 4. It's already online (Cloudflare Pages)

The site is **live at https://super-resells.pages.dev**, hosted free on
**Cloudflare Pages** and connected to the GitHub repo `superresells/super-resells`.

**You don't deploy by hand.** Any change to the `main` branch auto-publishes in
about a minute. That includes:
- edits your brother makes in the **dashboard** (they save to GitHub), and
- code/file changes you commit and **push with GitHub Desktop**.

> Want a custom domain like `superresells.com`? Buy one, then in Cloudflare →
> your Pages project → **Custom domains** → add it. (The free `.pages.dev`
> address keeps working too.)

---

## 5. Keeping the site secure

It's a static site with no logins or database on it, so there's very little to
break into. The protections in place:

- **`_headers`** ships security headers on every page (blocks clickjacking,
  content/script injection, MIME sniffing). Don't delete this file.
- **The dashboard can only be used with a private GitHub token.** Anyone can
  *open* `/admin`, but nobody can change anything without it.
- **Do these two things to stay safe:** turn on **2-factor authentication** on
  the GitHub account, and keep the access token private (revoke + regenerate it
  on GitHub if it ever leaks). Details in `CMS-SETUP.md`.
- **Form spam:** turn on **reCAPTCHA** in your Formspree dashboard to stop bots
  on the order/contact forms.
- **Optional extra:** Cloudflare's free **Bot Fight Mode** (dashboard →
  Security) adds automatic bot blocking.

---

## Reviews, social, size guide, FAQ

All in **`script.js`** (top section) except the FAQ:

- **Reviews are moderated by you.** Customers tap **"★ Leave a Review"** on the
  homepage, pick a star rating, and write a review. It gets **emailed to you**
  (via Formspree) — nothing posts automatically, so trolls never show up. To
  publish a good one, paste it into the `REVIEWS` list:
  ```js
  const REVIEWS = [
    { stars: 5, text: "Quality is unreal, shipped fast.", who: "Marcus T." },
  ];
  ```
  While it's empty, the homepage shows honest brand promises instead of fake quotes.
  Add real ones and they take over the "Worn & Trusted" section, with a live average
  rating. The `where` field is optional. (Don't post anything that wasn't really
  submitted — keep it honest.)
- **Payment method** — the order form asks the customer to pick Apple Pay, Cash App,
  or Zelle; their choice is included in the order that lands in your inbox. To change
  the options, edit the `<select name="payment">` list in `script.js` → `openCheckout`.
- **Social links** → set a handle in `SOCIAL` (just the handle, no @). The icon only
  appears once a handle is filled in, so there are never dead links.
- **Size guide** → edit the measurements in `SIZE_GUIDE` to match his blanks. It shows
  in each shirt's quick view.
- **FAQ** → on `contact.html`. A few answers are marked `<!-- EDIT -->` (payment methods,
  pickup spot, turnaround time, return policy) — set those to how he actually runs things.
  If you change the wording, update the matching FAQ schema in the `<head>` too.

## Brand kit & logos

- **`brand-kit.html`** — open it in a browser for the full brand sheet (logos,
  exact colors, fonts, voice, usage rules). Hit **Print / Save as PDF** to make a
  shareable PDF for a print shop or partner. It's an internal reference, not linked
  from the store.
- **`brand/`** — the logo files: `logo-dark.svg` (on dark), `logo-light.svg`
  (on white), `logo-stacked.svg` (badge), `mark.svg` (crown icon — great as a
  social avatar/profile pic). Use these on tags, packaging, and Instagram.

## Quick checklist before going live
- [ ] Set `ORDER_EMAIL` (and `FORMSPREE_ID` if you want auto-emails)
- [ ] Swap in real product photos + prices
- [ ] Update the price/discount wording if you changed the tiers
- [ ] Add your real phone (or remove `ORDER_PHONE`)
- [ ] Replace the placeholder reviews on the homepage with real ones
