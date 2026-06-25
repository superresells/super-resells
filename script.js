/* ============================================================
   SUPER RESELLS — store engine
   Cart, bulk pricing, drawer, quick-view, order submission.
   ============================================================ */

/* ------------------------------------------------------------
   1) PRODUCTS  —  EDIT THIS LIST TO CHANGE THE STORE
   To add "what he got this week": copy a block, change the
   fields, drop the photo in images/products/, point img to it.
   No photo yet? Leave img as "" and a clean placeholder shows.
   ------------------------------------------------------------ */
// Each piece is one-of-a-few resale inventory. `sizes` = what's IN STOCK (sold-out
// sizes are simply left out). `img` = front photo, `back` = back photo.
// To restock a size, add it back to `sizes`. To remove a sold-out piece, delete the block.
let PRODUCTS = [];   // managed in the CMS — loaded at runtime from data/products.json

/* ------------------------------------------------------------
   2) STACK PRICING  —  the official "X for $Y" deal guide.
   Total depends only on HOW MANY pieces are in the cart (every
   piece is one flat single price). Edit a row and the whole site
   updates — slider, cart, checkout, toast, all of it.
   ------------------------------------------------------------ */
let BASE_PRICE = 50;                           // single-piece price (editable in Store Settings)
let PRICE_TABLE = [                            // [ quantity, total price ] (editable in Store Settings)
  [1, 50], [2, 85], [3, 120], [4, 140], [5, 160], [6, 180], [7, 200],
  [8, 220], [9, 240], [10, 260], [12, 300], [15, 360], [20, 460],
  [25, 550], [30, 660],
];
// Milestones that trigger the "stack savings" toast (must exist in table).
const STACK_MILESTONES = [
  { qty: 2,  label: "Stack unlocked" },
  { qty: 3,  label: "Stack starter" },
  { qty: 6,  label: "Plug pricing" },
  { qty: 10, label: "Heavy stacker" },
  { qty: 20, label: "Reseller rate" },
];

/* ------------------------------------------------------------
   3) ORDER DESTINATION  —  where orders go
   ▸ FORMSPREE_ID: create a free form at formspree.io and paste
     your form id (looks like "xayzgwpq") here. Until then the
     site falls back to opening the customer's email app.
   ▸ ORDER_EMAIL / ORDER_PHONE: shown to customers + used by the
     email fallback. Replace with his real contact info.
   ------------------------------------------------------------ */
let FORMSPREE_ID = "maqgwqrr";                  // orders auto-send here (editable in Store Settings)
let ORDER_EMAIL  = "super.resells@yahoo.com";   // his real inbox (editable in Store Settings)
let ORDER_PHONE  = "";                            // optional (editable in Store Settings)
const BIZ = { name: "SUPER RESELLS", city: "Buda / Kyle, TX" };

/* ------------------------------------------------------------
   4) SOCIAL  —  add a handle to make its icon appear in the footer.
   Leave "" and the icon stays hidden (no dead links).
   ------------------------------------------------------------ */
const SOCIAL = {
  instagram: "supe.rresells",   // just the handle, no @
  tiktok:    "supe.rresells",
};

/* ------------------------------------------------------------
   5) REVIEWS  —  paste REAL customer testimonials here.
   While this is empty, the homepage shows brand promises instead
   of fake quotes. Add real ones and they take over automatically.
   Format:  { stars: 5, text: "…", who: "First L.", where: "Kyle, TX" }
   ------------------------------------------------------------ */
let REVIEWS = [];    // managed in the CMS — loaded from data/reviews.json

/* ------------------------------------------------------------
   5b) SOLD WALL  —  when a piece sells out, cut its block from
   PRODUCTS above and drop a quick entry here. It shows on the
   homepage "Recently Copped" wall with a SOLD stamp (FOMO + proof).
   Empty = the whole section hides itself. Keep the newest first.
   Format:  { name: "Ghostface Cough Syrup Tee", img: "images/p/hs04-f.jpg" }
   ------------------------------------------------------------ */
let SOLD = [];       // managed in the CMS — loaded from data/sold.json

/* ------------------------------------------------------------
   6) SIZE GUIDE  —  shown in each shirt's quick view.
   Update the measurements to match his actual blanks (inches).
   ------------------------------------------------------------ */
const SIZE_GUIDE = {
  note: "Measurements in inches, laid flat. Roughly true to size — size up for an oversized fit.",
  cols: ["Size", "Chest", "Length"],
  rows: [
    ["S",   "18", "28"],
    ["M",   "20", "29"],
    ["L",   "22", "30"],
    ["XL",  "24", "31"],
    ["2XL", "26", "32"],
  ],
};

/* ============================================================
   Helpers
   ============================================================ */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = n => "$" + (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2 });
const byId = id => PRODUCTS.find(p => p.id === id);

// Total price for n pieces — exact at table points, linearly interpolated
// between them, and extended at the final rate beyond the table.
function priceForQty(n) {
  n = Math.round(n);
  if (n <= 0) return 0;
  const T = PRICE_TABLE;
  if (n <= T[0][0]) return BASE_PRICE * n;
  if (n >= T[T.length - 1][0]) {
    const [qa, pa] = T[T.length - 2], [qb, pb] = T[T.length - 1];
    return Math.round(pb + (n - qb) * (pb - pa) / (qb - qa));
  }
  for (let i = 0; i < T.length - 1; i++) {
    const [q0, p0] = T[i], [q1, p1] = T[i + 1];
    if (n >= q0 && n <= q1) return Math.round(p0 + (p1 - p0) * (n - q0) / (q1 - q0));
  }
  return n * BASE_PRICE;
}
const eachForQty = n => (n > 0 ? priceForQty(n) / n : 0);
// The next stack milestone above the current quantity (for cart nudges).
function nextMilestone(qty) {
  return STACK_MILESTONES.find(m => m.qty > qty) || null;
}

/* ============================================================
   Cart  (localStorage-backed)
   ============================================================ */
const CART_KEY = "heir_cart_v1";

// Sizes per product. Add `sizes: ["S","M","L"]` to a product to override.
function sizesFor(p) {
  if (Array.isArray(p.sizes) && p.sizes.length) return p.sizes;
  if (p.cat === "Headwear") return ["One Size"];
  return ["S", "M", "L", "XL", "2XL"];
}
const keyOf = (id, size) => id + "__" + size;

// Load CMS-managed content (products, reviews, sold) from /data at startup.
// Falls back to empty so the page never hard-crashes if a file is missing.
async function loadData() {
  const grab = async f => { try { const r = await fetch(f, { cache: "no-cache" }); return r.ok ? await r.json() : null; } catch { return null; } };
  const [prod, rev, sld, settings] = await Promise.all([
    grab("/data/products.json"), grab("/data/reviews.json"), grab("/data/sold.json"), grab("/data/settings.json"),
  ]);
  PRODUCTS = (prod && prod.items) || [];
  REVIEWS  = (rev  && rev.items)  || [];
  SOLD     = (sld  && sld.items)  || [];
  // safety net: every product needs a unique id (cart keys depend on it)
  const seen = {};
  PRODUCTS.forEach((p, i) => {
    let id = (p.id || "").toString().trim();
    if (!id) id = (p.name ? p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : "") || "item";
    if (seen[id]) id += "-" + i;
    seen[id] = true; p.id = id;
  });
  if (settings) applySettings(settings);
}

// Apply editable Store Settings (data/settings.json) over the code defaults.
// Anything missing or invalid is ignored, so the site always has safe values.
function applySettings(s) {
  try {
    if (s.pricing) {
      if (Number.isFinite(s.pricing.basePrice) && s.pricing.basePrice > 0) BASE_PRICE = s.pricing.basePrice;
      if (Array.isArray(s.pricing.table)) {
        const rows = s.pricing.table
          .filter(r => r && Number.isFinite(r.qty) && Number.isFinite(r.price) && r.qty > 0 && r.price > 0)
          .map(r => [r.qty, r.price])
          .sort((a, b) => a[0] - b[0]);
        if (rows.length) PRICE_TABLE = rows;
      }
    }
    if (s.contact) {
      if (typeof s.contact.formspreeId === "string") FORMSPREE_ID = s.contact.formspreeId.trim();
      if (s.contact.orderEmail) ORDER_EMAIL = String(s.contact.orderEmail).trim();
      if (typeof s.contact.orderPhone === "string") ORDER_PHONE = s.contact.orderPhone.trim();
    }
    if (s.social) {
      if (typeof s.social.instagram === "string") SOCIAL.instagram = s.social.instagram.trim();
      if (typeof s.social.tiktok === "string") SOCIAL.tiktok = s.social.tiktok.trim();
    }
    if (s.copy) {
      const set = (id, val) => { const el = document.getElementById(id); if (el && typeof val === "string" && val.trim()) el.textContent = val.trim(); };
      set("heroEyebrow", s.copy.heroEyebrow);
      set("heroLead", s.copy.heroLead);
    }
  } catch (e) { /* bad settings → keep code defaults */ }
}

let cart = [];

function load() {
  let raw; try { raw = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
  return raw.map(l => { const p = byId(l.id); if (!p) return null; return { id: l.id, size: l.size || sizesFor(p)[0], qty: l.qty }; }).filter(Boolean);
}
function save() { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
function cartCount() { return cart.reduce((n, l) => n + l.qty, 0); }
function cartTotals() {
  const qty = cartCount();
  const base = qty * BASE_PRICE;          // what it'd cost at single price
  const total = priceForQty(qty);         // the stack price from the guide
  const saved = base - total;
  return { qty, base, total, saved, each: eachForQty(qty), pct: base ? Math.round(saved / base * 100) : 0 };
}
const findLine = key => cart.find(l => keyOf(l.id, l.size) === key);

function addToCart(id, size, qty = 1) {
  if (!size) size = sizesFor(byId(id))[0];
  const prev = cartCount();
  const line = cart.find(l => l.id === id && l.size === size);
  if (line) line.qty += qty; else cart.push({ id, size, qty });
  save(); renderCart(); bumpCount();
  maybeStackToast(prev, cartCount());
}
function setQty(key, qty) {
  const line = findLine(key); if (!line) return;
  const prev = cartCount();
  line.qty = qty;
  if (line.qty <= 0) cart = cart.filter(l => keyOf(l.id, l.size) !== key);
  save(); renderCart();
  maybeStackToast(prev, cartCount());
}
function removeLine(key) { cart = cart.filter(l => keyOf(l.id, l.size) !== key); save(); renderCart(); }
function changeSize(key, newSize) {
  const line = findLine(key); if (!line || line.size === newSize) return;
  const merge = cart.find(l => l.id === line.id && l.size === newSize && l !== line);
  if (merge) { merge.qty += line.qty; cart = cart.filter(l => l !== line); }
  else line.size = newSize;
  save(); renderCart();
}

function bumpCount() {
  const el = $(".cart-count");
  if (!el) return;
  const n = cartCount();
  el.textContent = n;
  el.classList.toggle("show", n > 0);
  el.classList.remove("bump"); void el.offsetWidth;     // restart the pop animation
  if (n > 0) el.classList.add("bump");
}

/* ============================================================
   Stack-savings toast — celebrates crossing a stack milestone
   ============================================================ */
let toastTimer;
function showToast(html) {
  let el = $("#toast");
  if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.innerHTML = html;
  el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 4200);
}
function maybeStackToast(prev, now) {
  if (now <= prev) return;
  const crossed = STACK_MILESTONES.filter(m => m.qty > prev && m.qty <= now).pop();
  if (!crossed) return;
  const each = eachForQty(now), saved = now * BASE_PRICE - priceForQty(now);
  showToast(`<div class="toast-title">★ ${crossed.label} unlocked</div>
    <div class="toast-body">${now} pieces · just <b>${money(each)} each</b> — you're saving <b>${money(saved)}</b>.</div>`);
}

/* ============================================================
   Render product grids
   ============================================================ */
const PLUS_ICON = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>`;

// Live scarcity readout. We treat each in-stock size as 1 unit (resale = 1-of-1
// per size). Single-piece pieces get a pulsing urgency cue.
function stockLine(p) {
  const n = sizesFor(p).length;
  if (n <= 1) return `<div class="stock-line urgent"><span class="dot"></span>Only 1 left — last piece</div>`;
  if (n <= 3) return `<div class="stock-line low"><span class="dot"></span>Only ${n} left in stock</div>`;
  return `<div class="stock-line"><span class="dot"></span>${n} in stock</div>`;
}

function productCard(p, i = 0) {
  const scarce = /last|limited|left/i.test(p.badge || "") ? " scarce" : "";
  const badge = p.badge ? `<span class="card-badge${scarce}">${p.badge}</span>` : "";
  // Front img sits on top of the placeholder; if it 404s we hide it and the placeholder shows.
  // Back img (if any) layers on top and cross-fades in on hover.
  // First row (i < 4) loads eagerly so the shop's LCP image isn't deferred by lazy-loading;
  // the very first image also gets high fetch priority. Everything below the fold stays lazy.
  const front = `loading="${i < 4 ? "eager" : "lazy"}"${i === 0 ? ' fetchpriority="high"' : ""} decoding="async"`;
  const img = p.img
    ? `<img class="card-front" src="${p.img}" alt="${p.name}" ${front} onerror="this.style.display='none';this.closest('.card-media').classList.add('placeholder')">${p.back ? `<img class="card-back" src="${p.back}" alt="" aria-hidden="true" loading="lazy" decoding="async">` : ""}`
    : "";
  const addBtn = sizesFor(p).length > 1
    ? `<button class="add-btn" data-pick="${p.id}">${PLUS_ICON} Add</button>`
    : `<button class="add-btn" data-add="${p.id}" data-size="${sizesFor(p)[0]}">${PLUS_ICON} Add</button>`;
  return `
  <article class="card reveal" data-cat="${p.cat}">
    <div class="card-media${p.img ? "" : " placeholder"}">
      ${badge}
      ${img}
      <span class="ph-text">${p.name}</span>
      <button class="card-quick" data-quick="${p.id}">Quick View</button>
    </div>
    <div class="card-body">
      <div class="card-name">${p.name}</div>
      <div class="card-meta">${p.colors} · ${sizesFor(p).join(" / ")}</div>
      ${stockLine(p)}
      <div class="card-foot">
        <div class="card-price">${money(p.price)} <small>/ each</small></div>
        ${addBtn}
      </div>
    </div>
  </article>`;
}

function renderGrid(target, list) {
  const el = $(target);
  if (!el) return;
  el.innerHTML = list.map((p, i) => productCard(p, i)).join("");
  observeReveals(el);
}

/* ============================================================
   Cart drawer render
   ============================================================ */
function renderCart() {
  bumpCount();
  const body = $("#cartBody"), foot = $("#cartFoot");
  if (!body) return;

  if (!cart.length) {
    body.innerHTML = `<div class="drawer-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>
      <p>Your order is empty.</p></div>`;
    foot.innerHTML = "";
    return;
  }

  const t = cartTotals();
  body.innerHTML = cart.map(l => {
    const p = byId(l.id);
    const thumb = p.img
      ? `<img class="thumb" src="${p.img}" alt="" onerror="this.style.visibility='hidden'">`
      : `<div class="thumb"></div>`;
    const key = keyOf(l.id, l.size);
    const sizes = sizesFor(p);
    const sizeCtrl = sizes.length > 1
      ? `<select class="ci-resize" data-resize="${key}" aria-label="Size">${sizes.map(s => `<option ${s === l.size ? "selected" : ""}>${s}</option>`).join("")}</select>`
      : `<span class="ci-onesize">${l.size}</span>`;
    return `<div class="cart-line">
      ${thumb}
      <div>
        <div class="ci-name">${p.name}</div>
        <div class="ci-meta">${money(p.price)} · ${p.cat}</div>
        <div class="ci-controls">
          ${sizeCtrl}
          <div class="qty-step">
            <button data-dec="${key}" aria-label="Decrease">−</button>
            <span>${l.qty}</span>
            <button data-inc="${key}" aria-label="Increase">+</button>
          </div>
        </div>
      </div>
      <div style="text-align:right">
        <div class="ci-line-price">${money(p.price * l.qty)}</div>
        <button class="ci-remove" data-rm="${key}">Remove</button>
      </div>
    </div>`;
  }).join("");

  const next = nextMilestone(t.qty);
  const nudge = next
    ? `<div class="bulk-nudge show">Stack ${next.qty - t.qty} more → <b>${next.qty} for ${money(priceForQty(next.qty))}</b> (just ${money(eachForQty(next.qty))} each).</div>`
    : `<div class="bulk-nudge show">🏆 Top stack pricing unlocked — just ${money(t.each)} a piece.</div>`;

  foot.innerHTML = `
    ${t.qty > 1 ? nudge : ""}
    ${t.saved > 0 ? `<div class="drawer-discount"><span>Stack savings (${t.qty} pieces)</span><span>−${money(t.saved)}</span></div>` : ""}
    <div class="drawer-subtotal"><span class="label">Estimated total</span><span class="val">${money(t.total)}</span></div>
    <p class="drawer-note">${t.qty > 1 ? `That's <b style="color:var(--gold)">${money(t.each)}</b> a piece. ` : ""}No payment now — send your order and we confirm availability + total before you pay.</p>
    <button class="btn btn-gold btn-block btn-lg" id="checkoutBtn">Send Order Request →</button>`;
}

/* ============================================================
   Drawer + modal open/close
   ============================================================ */
function openDrawer()  { $("#cartDrawer")?.classList.add("open"); $("#scrim")?.classList.add("open"); document.body.style.overflow = "hidden"; }
function closeDrawer() { $("#cartDrawer")?.classList.remove("open"); $("#scrim")?.classList.remove("open"); document.body.style.overflow = ""; }
function openModal(html) {
  const m = $("#modalScrim"); if (!m) return;
  $("#modalContent").innerHTML = html;
  m.classList.add("open"); document.body.style.overflow = "hidden";
}
function closeModal() { $("#modalScrim")?.classList.remove("open"); document.body.style.overflow = ""; }

/* ---- Quick view ---- */
function quickView(id) {
  const p = byId(id);
  const sizes = sizesFor(p);
  const def = sizes.includes("M") ? "M" : sizes[0];
  const pills = sizes.map(s => `<button class="sz-pill ${s === def ? "active" : ""}" data-sz="${s}">${s}</button>`).join("");
  const guide = sizes.length > 1 ? sizeGuideHTML() : "";
  const gallery = p.img ? `<div class="qv-gallery">
      <figure><img src="${p.img}" alt="${p.name} front" loading="lazy"><figcaption>Front</figcaption></figure>
      ${p.back ? `<figure><img src="${p.back}" alt="${p.name} back" loading="lazy"><figcaption>Back</figcaption></figure>` : ""}
    </div>` : "";
  openModal(`
    <div class="modal-head"><div><h3>${p.name}</h3><p>${p.colors}</p></div>
      <button class="drawer-close" data-close-modal>×</button></div>
    <div class="modal-body">
      ${gallery}
      <p class="lead" style="margin-bottom:1.2rem">${p.desc}</p>
      <span class="sz-label">${sizes.length > 1 ? "Select size" : "Size"}</span>
      <div class="sz-row">${pills}</div>
      ${guide}
      <div class="order-summary">
        <div class="os-line"><span>Just this one</span><span>${money(BASE_PRICE)}</span></div>
        <div class="os-line"><span>Stack 3</span><span style="color:var(--gold)">${money(eachForQty(3))} each</span></div>
        <div class="os-line"><span>Stack 10+</span><span style="color:var(--gold)">${money(eachForQty(10))} each</span></div>
      </div>
      <button class="btn btn-gold btn-block btn-lg" data-add="${p.id}" data-size="${def}" data-add-close>Add to Order — ${money(p.price)}</button>
      <p class="form-hint">Stack the cart with any pieces and the price per shirt drops automatically.</p>
    </div>`);
}

function sizeGuideHTML() {
  const head = SIZE_GUIDE.cols.map(c => `<th>${c}</th>`).join("");
  const body = SIZE_GUIDE.rows.map(r => `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="sg-size"' : ""}>${c}</td>`).join("")}</tr>`).join("");
  return `<details class="size-guide">
    <summary><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 8l4-4 14 14-4 4zM7 8l2 2M11 6l2 2M15 10l2 2"/></svg> Size guide</summary>
    <table class="sg-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    <p class="sg-note">${SIZE_GUIDE.note}</p>
  </details>`;
}

/* ============================================================
   Order / checkout flow
   ============================================================ */
function openCheckout() {
  if (!cart.length) return;
  const t = cartTotals();
  const lines = cart.map(l => { const p = byId(l.id); return `<div class="os-line"><span>${l.qty}× ${p.name} · ${l.size}</span><span>${money(p.price * l.qty)}</span></div>`; }).join("");
  closeDrawer();
  openModal(`
    <div class="modal-head"><div><h3>Send Your Order</h3><p>No payment now — he'll confirm and send a payment request.</p></div>
      <button class="drawer-close" data-close-modal>×</button></div>
    <div class="modal-body">
      <div class="order-summary">
        ${lines}
        ${t.saved > 0 ? `<div class="os-line" style="color:var(--good)"><span>Stack savings (${t.qty} pieces)</span><span>−${money(t.saved)}</span></div>` : ""}
        <div class="os-total"><span>Estimated total</span><span>${money(t.total)}${t.qty > 1 ? ` <span style="font-weight:400;color:var(--muted)">(${money(t.each)}/ea)</span>` : ""}</span></div>
      </div>
      <form id="orderForm" novalidate>
        <div class="field"><label>Your name</label><input name="name" required placeholder="First and last"></div>
        <div class="field-row">
          <div class="field"><label>Email</label><input type="email" name="email" required placeholder="you@email.com"></div>
          <div class="field"><label>Phone</label><input name="phone" placeholder="(optional)"></div>
        </div>
        <div class="field"><label>Form of payment</label>
          <select name="payment">
            <option>Apple Pay</option>
            <option>Cash App</option>
            <option>Zelle</option>
          </select>
        </div>
        <div class="field"><label>Anything else? <span style="text-transform:none;letter-spacing:0;color:var(--muted-2)">(optional)</span></label><textarea name="notes" placeholder="Deadline, color preferences, custom requests…"></textarea></div>
        <button type="submit" class="btn btn-gold btn-block btn-lg">Place Order Request →</button>
        <p class="form-hint">By sending, you're requesting these items — not paying yet. He'll confirm, then send a request via your chosen method.</p>
      </form>
    </div>`);
  $("#orderForm")?.addEventListener("submit", submitOrder);
}

function orderText(data, t) {
  const lines = cart.map(l => { const p = byId(l.id); return `  • ${l.qty}× ${p.name} — Size ${l.size}`; }).join("\n");
  return `NEW ORDER REQUEST — ${BIZ.name}
--------------------------------------
${lines}
--------------------------------------
${t.qty} pieces${t.saved > 0 ? `  ·  stack savings -${money(t.saved)}` : ""}
Estimated total: ${money(t.total)}${t.qty > 1 ? ` (${money(t.each)}/ea)` : ""}
--------------------------------------
Name:    ${data.name}
Email:   ${data.email}
Phone:   ${data.phone || "—"}
Payment: ${data.payment}
Notes:   ${data.notes || "—"}`;
}

async function submitOrder(e) {
  e.preventDefault();
  const form = e.target;
  if (!form.name.value.trim() || !form.email.value.trim()) { form.reportValidity?.(); return; }
  const data = { name: form.name.value.trim(), email: form.email.value.trim(), phone: form.phone.value.trim(), payment: form.payment.value, notes: form.notes.value.trim() };
  const t = cartTotals();
  const summary = orderText(data, t);
  const btn = form.querySelector("button[type=submit]");
  btn.textContent = "Sending…"; btn.disabled = true;

  let sent = false;
  if (FORMSPREE_ID) {
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST", headers: { Accept: "application/json" },
        body: (() => { const f = new FormData(); f.append("name", data.name); f.append("email", data.email); f.append("phone", data.phone); f.append("payment", data.payment); f.append("order", summary); f.append("_subject", `New order from ${data.name} (${data.payment})`); return f; })()
      });
      sent = res.ok;
    } catch { sent = false; }
  }

  // Success either way: confirm to customer; if no Formspree, give email fallback.
  showOrderSuccess(sent, summary);
  // Only clear once the order is truly delivered (Formspree). In the email-fallback
  // path we keep the cart so nothing is lost if they don't finish sending the email.
  if (sent) { cart = []; save(); renderCart(); }
}

function showOrderSuccess(sent, summary) {
  const mailto = `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent("New order — " + BIZ.name)}&body=${encodeURIComponent(summary)}`;
  openModal(`
    <div class="modal-body form-success">
      <div class="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m5 13 4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <h3 style="font-size:1.6rem">Order Sent</h3>
      <p class="lead" style="margin:.8rem auto 0">${sent
        ? "Your request is on its way. Expect a text or email confirming availability and your total."
        : "Almost there — tap below to fire off your order email and you're done."}</p>
      ${sent ? "" : `<a class="btn btn-gold btn-lg" style="margin-top:1.4rem" href="${mailto}">Send Order Email →</a>`}
      ${ORDER_PHONE ? `<p class="form-hint">Questions? Text ${ORDER_PHONE}</p>` : ""}
      <p style="margin-top:1.6rem"><button class="btn btn-ghost" data-close-modal>Keep Shopping</button></p>
    </div>`);
}

/* ============================================================
   Bulk pricing calculator (home page)
   ============================================================ */
const SLIDER_TICKS = [1, 5, 10, 20, 30];
function initBulkCalc() {
  const slider = $("#bulkSlider");
  if (!slider) return;
  const qtyEl = $("#bulkQty"), eachEl = $("#bulkEach"), wasEl = $("#bulkWas"),
        totalEl = $("#bulkTotal"), saveEl = $("#bulkSave");

  // Render the official "X for $Y" guide + slider ticks from PRICE_TABLE.
  const table = $("#stackTable");
  if (table) table.innerHTML = PRICE_TABLE.map(([q, p]) => {
    const saved = q * BASE_PRICE - p;
    return `<div class="tier-row" data-min="${q}">
      <span class="t-qty">${q}</span>
      <span class="t-desc">${money(p / q)} <span style="color:var(--muted-2)">/ piece</span></span>
      <span class="t-off">${money(p)}${saved > 0 ? `<small>save ${money(saved)}</small>` : ""}</span>
    </div>`;
  }).join("");
  const rows = $$(".tier-row", table || document);
  const ticksEl = $("#stackTicks");
  if (ticksEl) ticksEl.innerHTML = SLIDER_TICKS.map(n => `<span>${n}${n === 30 ? "+" : ""}</span>`).join("");
  const ticks = $$("#stackTicks span");

  function update() {
    const qty = +slider.value;
    const each = eachForQty(qty), total = priceForQty(qty), saved = qty * BASE_PRICE - total;
    qtyEl.textContent = qty;
    eachEl.textContent = money(each);
    wasEl.style.visibility = saved > 0 ? "visible" : "hidden";
    wasEl.textContent = money(BASE_PRICE);
    totalEl.textContent = money(total);
    saveEl.textContent = saved > 0
      ? `You save ${money(saved)} — just ${money(each)} a piece`
      : "Stack 2+ and your price per piece starts dropping";
    const pct = (qty - slider.min) / (slider.max - slider.min) * 100;
    slider.style.background = `linear-gradient(90deg, var(--gold) ${pct}%, var(--ink-3) ${pct}%)`;
    ticks.forEach((s, i) => s.classList.toggle("hit", qty >= SLIDER_TICKS[i]));
    let activeQ = PRICE_TABLE[0][0];
    for (const [q] of PRICE_TABLE) if (qty >= q) activeQ = q;
    rows.forEach(r => r.classList.toggle("active", +r.dataset.min === activeQ));
  }
  slider.addEventListener("input", update);
  update();
}

/* ============================================================
   Reviews — real testimonials, or honest promises until they land
   ============================================================ */
const PROMISES = [
  { title: "Hand-Picked Heat", text: "Every piece is curated personally — graphic streetwear we'd rock ourselves. If it doesn't pass the wall test, we don't list it." },
  { title: "Stack The Cart, Save More", text: "Grab multiple pieces and the price per shirt drops to as low as $22 — automatic, no codes, no haggling." },
  { title: "Zero-Risk Ordering", text: "Send your order first, pay only once it's confirmed. Simple and safe." },
];

const clampStars = n => Math.max(1, Math.min(5, Math.round(n || 5)));
function renderReviews() {
  const grid = $("#reviewsGrid");
  if (!grid) return;
  const eyebrow = $("#reviewsEyebrow"), head = $("#reviewsHead"), meta = $("#reviewsMeta");
  if (REVIEWS.length) {
    if (eyebrow) eyebrow.textContent = "The Word";
    if (head) head.textContent = "Worn & Trusted";
    const avg = REVIEWS.reduce((s, r) => s + clampStars(r.stars), 0) / REVIEWS.length;
    const full = Math.round(avg);
    if (meta) meta.innerHTML = `<div class="rating-badge"><span class="rb-stars">${"★".repeat(full)}<span class="rb-dim">${"★".repeat(5 - full)}</span></span><b>${avg.toFixed(1)}</b> out of 5 · ${REVIEWS.length} review${REVIEWS.length > 1 ? "s" : ""}</div>`;
    grid.innerHTML = REVIEWS.map(r => `
      <div class="review reveal">
        <div class="stars">${"★".repeat(clampStars(r.stars))}<span class="rb-dim">${"★".repeat(5 - clampStars(r.stars))}</span></div>
        <p>${r.text}</p>
        <div class="who"><b>${r.who}</b>${r.where ? ` · ${r.where}` : ""}</div>
      </div>`).join("");
  } else {
    if (eyebrow) eyebrow.textContent = "Why SUPER";
    if (head) head.textContent = "Built On A Promise";
    if (meta) meta.innerHTML = `<div class="rating-badge">Be the first to rate us ★</div>`;
    grid.innerHTML = PROMISES.map(p => `
      <div class="review reveal">
        <h3 style="color:var(--gold);font-size:1.15rem;margin-bottom:.6rem">${p.title}</h3>
        <p>${p.text}</p>
      </div>`).join("");
  }
  observeReveals(grid);
}

/* ---- Leave a review (customer submits → admin moderates) ---- */
function openReviewForm() {
  openModal(`
    <div class="modal-head"><div><h3>Rate Super Resells</h3><p>Real reviews only — every one's checked before it goes live.</p></div>
      <button class="drawer-close" data-close-modal>×</button></div>
    <div class="modal-body">
      <form id="reviewForm" novalidate>
        <div class="field"><label>Your rating</label>
          <div class="star-pick" id="starPick">${[1,2,3,4,5].map(n => `<button type="button" class="star" data-star="${n}" aria-label="${n} star${n>1?"s":""}">★</button>`).join("")}</div>
          <input type="hidden" name="rating" value="5">
        </div>
        <div class="field"><label>Your name</label><input name="name" required placeholder="First name + last initial"></div>
        <div class="field"><label>Your review</label><textarea name="text" required placeholder="What'd you cop? How was the quality, the speed, the heat?"></textarea></div>
        <button type="submit" class="btn btn-gold btn-block btn-lg">Submit Review →</button>
        <p class="form-hint">Reviews are checked before posting — no spam, no trolls.</p>
      </form>
    </div>`);
  const pick = $("#starPick"); let rating = 5;
  const paint = (hover) => $$(".star", pick).forEach((s, i) => { s.classList.toggle("on", i < rating); s.classList.toggle("hover", hover != null && i < hover); });
  pick.addEventListener("click", e => { const b = e.target.closest("[data-star]"); if (b) { rating = +b.dataset.star; $("#reviewForm [name=rating]").value = rating; paint(); } });
  pick.addEventListener("mousemove", e => { const b = e.target.closest("[data-star]"); paint(b ? +b.dataset.star : null); });
  pick.addEventListener("mouseleave", () => paint(null));
  paint();
  $("#reviewForm").addEventListener("submit", submitReview);
}

async function submitReview(e) {
  e.preventDefault();
  const f = e.target;
  if (!f.name.value.trim() || !f.text.value.trim()) { f.reportValidity?.(); return; }
  const data = { name: f.name.value.trim(), rating: f.rating.value, text: f.text.value.trim() };
  const btn = f.querySelector("button[type=submit]"); btn.textContent = "Sending…"; btn.disabled = true;
  const body = `NEW REVIEW (pending approval) — ${BIZ.name}\n--------------------------------------\nRating: ${data.rating}/5\nName:   ${data.name}\nReview: ${data.text}\n--------------------------------------\nTo publish: add to the REVIEWS list as { stars: ${data.rating}, text: "...", who: "${data.name}" }`;
  let sent = false;
  if (FORMSPREE_ID) {
    try {
      const fd = new FormData();
      fd.append("name", data.name); fd.append("rating", data.rating + "/5"); fd.append("review", data.text);
      fd.append("_subject", `New review (${data.rating}★) from ${data.name} — pending`);
      const r = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, { method: "POST", headers: { Accept: "application/json" }, body: fd });
      sent = r.ok;
    } catch { sent = false; }
  }
  const mailto = `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent("New review — " + BIZ.name)}&body=${encodeURIComponent(body)}`;
  openModal(`
    <div class="modal-body form-success">
      <div class="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m5 13 4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <h3 style="font-size:1.5rem">Thanks for the love</h3>
      <p class="lead" style="margin:.7rem auto 0">${sent ? "Your review's in — we'll post it once it's approved." : "Almost — tap below to send your review."}</p>
      ${sent ? "" : `<a class="btn btn-gold btn-lg" style="margin-top:1.3rem" href="${mailto}">Send Review →</a>`}
      <p style="margin-top:1.6rem"><button class="btn btn-ghost" data-close-modal>Done</button></p>
    </div>`);
}

/* ============================================================
   Just Sold wall — "Recently Copped" social proof (homepage)
   ============================================================ */
function renderSold() {
  const wall = $("#soldWall"), sec = $("#soldSection");
  if (!wall || !sec) return;
  if (!SOLD.length) { sec.hidden = true; return; }
  sec.hidden = false;
  wall.innerHTML = SOLD.map(s => `
    <figure class="sold-card reveal">
      ${s.img ? `<img src="${s.img}" alt="${s.name}" loading="lazy" onerror="this.style.display='none'">` : `<span class="sold-ph">${s.name}</span>`}
      <span class="sold-stamp">Sold</span>
      <figcaption>${s.name}</figcaption>
    </figure>`).join("");
  observeReveals(wall);
}

/* ============================================================
   Social icons (footer) — only render handles that are set
   ============================================================ */
function renderSocial() {
  const wrap = $("#footSocial");
  if (!wrap) return;
  const icons = {
    instagram: { url: h => `https://instagram.com/${h}`, svg: `<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>` },
    tiktok:    { url: h => `https://tiktok.com/@${h}`,     svg: `<path d="M16 4c.5 2.5 2 4 4.5 4.2V11c-1.7 0-3.2-.5-4.5-1.4V15a5 5 0 1 1-5-5c.3 0 .6 0 1 .1v2.8a2.3 2.3 0 1 0 1.5 2.1V4Z"/>` },
  };
  const html = Object.entries(SOCIAL).filter(([, h]) => h).map(([k, h]) => {
    const i = icons[k]; if (!i) return "";
    return `<a href="${i.url(h)}" target="_blank" rel="noopener" aria-label="${k}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${i.svg}</svg></a>`;
  }).join("");
  wrap.innerHTML = html;
}

/* ============================================================
   Reveal on scroll
   ============================================================ */
let io;
function observeReveals(root = document) {
  const els = $$(".reveal:not(.in)", root);
  if (!("IntersectionObserver" in window)) { els.forEach(e => e.classList.add("in")); return; }
  io ||= new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: .12, rootMargin: "0px 0px -40px" });
  const vh = window.innerHeight || 800;
  els.forEach(e => {
    // Anything already in (or above) the viewport reveals immediately — no wait
    // on the observer, so above-the-fold content is never momentarily blank.
    if (e.getBoundingClientRect().top < vh - 40) e.classList.add("in");
    else io.observe(e);
  });
}

/* ============================================================
   Shop filtering
   ============================================================ */
function initShopFilters() {
  const bar = $("#shopToolbar");
  if (!bar) return;
  const cats = ["All", ...new Set(PRODUCTS.map(p => p.cat))];
  bar.innerHTML = cats.map((c, i) => `<button class="chip ${i === 0 ? "active" : ""}" data-filter="${c}">${c}</button>`).join("");
  bar.addEventListener("click", e => {
    const btn = e.target.closest("[data-filter]"); if (!btn) return;
    $$(".chip", bar).forEach(c => c.classList.remove("active")); btn.classList.add("active");
    const f = btn.dataset.filter;
    renderGrid("#shopGrid", f === "All" ? PRODUCTS : PRODUCTS.filter(p => p.cat === f));
  });
}

/* ============================================================
   Boot
   ============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  // year + dynamic contact bits
  $$("[data-year]").forEach(e => e.textContent = new Date().getFullYear());
  $$("[data-biz-city]").forEach(e => e.textContent = BIZ.city);
  if (ORDER_EMAIL) $$("[data-order-email]").forEach(e => { e.textContent = ORDER_EMAIL; if (e.tagName === "A") e.href = "mailto:" + ORDER_EMAIL; });

  // reveal static above-the-fold content right away (don't wait on the data fetch)
  observeReveals();

  // pull CMS-managed content, then build the cart (needs products to exist)
  await loadData();
  cart = load();

  // render grids
  renderGrid("#featuredGrid", PRODUCTS.filter(p => p.badge === "Just Dropped" || p.badge === "Best Seller").slice(0, 4));
  if ($("#shopGrid")) { renderGrid("#shopGrid", PRODUCTS); initShopFilters(); }

  renderCart();
  initBulkCalc();
  renderReviews();
  renderSold();
  renderSocial();
  observeReveals();

  // nav toggle
  const tog = $(".nav-toggle"), links = $(".nav-links");
  tog?.addEventListener("click", () => { const o = links.classList.toggle("open"); tog.classList.toggle("open", o); tog.setAttribute("aria-expanded", o); });
  $$(".nav-links a").forEach(a => a.addEventListener("click", () => { links.classList.remove("open"); tog.classList.remove("open"); }));

  // global click delegation
  document.addEventListener("click", e => {
    const sz = e.target.closest("[data-sz]");
    if (sz) { sz.parentElement.querySelectorAll(".sz-pill").forEach(b => b.classList.remove("active")); sz.classList.add("active"); const ab = document.querySelector("#modalContent [data-add]"); if (ab) ab.dataset.size = sz.dataset.sz; return; }
    const add = e.target.closest("[data-add]");
    if (add) { addToCart(add.dataset.add, add.dataset.size); flashAdd(add); if (add.hasAttribute("data-add-close")) { closeModal(); openDrawer(); } return; }
    const pick = e.target.closest("[data-pick]"); if (pick) { quickView(pick.dataset.pick); return; }
    const quick = e.target.closest("[data-quick]"); if (quick) { quickView(quick.dataset.quick); return; }
    if (e.target.closest("[data-open-cart]")) { openDrawer(); return; }
    if (e.target.closest("#scrim") || e.target.closest("[data-close-cart]")) { closeDrawer(); return; }
    if (e.target.closest("[data-close-modal]") || e.target.id === "modalScrim") { closeModal(); return; }
    if (e.target.closest("#checkoutBtn")) { openCheckout(); return; }
    if (e.target.closest("[data-review]")) { openReviewForm(); return; }
    const inc = e.target.closest("[data-inc]"); if (inc) { const l = findLine(inc.dataset.inc); if (l) setQty(inc.dataset.inc, l.qty + 1); return; }
    const dec = e.target.closest("[data-dec]"); if (dec) { const l = findLine(dec.dataset.dec); if (l) setQty(dec.dataset.dec, l.qty - 1); return; }
    const rm = e.target.closest("[data-rm]"); if (rm) { removeLine(rm.dataset.rm); return; }
  });
  document.addEventListener("change", e => { const r = e.target.closest("[data-resize]"); if (r) changeSize(r.dataset.resize, r.value); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeDrawer(); closeModal(); } });
});

function flashAdd(btn) {
  if (!btn.classList.contains("add-btn")) return;
  const orig = btn.innerHTML;
  btn.classList.add("added"); btn.innerHTML = "✓ Added";
  setTimeout(() => { btn.classList.remove("added"); btn.innerHTML = orig; }, 1100);
}

/* ============================================================
   BACKGROUND MUSIC  —  floating play / mute toggle (site-wide)
   ------------------------------------------------------------
   • Off by default — browsers block autoplay-with-sound, and a
     surprise track makes shoppers bounce. Visitor taps to start.
   • Choice is remembered across pages for the session. If they
     had it on, it picks back up on their next click after a page
     change (browsers won't let it auto-restart silently).

   >>> GOING LIVE WITH A REAL TRACK <<<
   1. Drop a royalty-free hip hop .mp3 into  audio/track.mp3
      (free, sounds-the-part sources: pixabay.com/music,
       uppbeat.io, chosic.com — search "trap" / "lofi hip hop".
       Use one licensed for commercial/web use.)
   2. Set  placeholder: false  in the MUSIC config just below.
   That's it — the synth demo beat is replaced by your file.
   ============================================================ */
(function () {
  const MUSIC = {
    src: "audio/track.mp3", // your royalty-free track goes here
    placeholder: true,      // true = built-in NBA YoungBoy-style trap beat | false = play the .mp3
    volume: 0.36,           // 0–1, kept low so it sits under the page
  };

  const STORE_KEY = "hs_music_on";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- styles (injected so it works on every page) ---------- */
  const style = document.createElement("style");
  style.textContent = `
    .hs-music{position:fixed;left:18px;bottom:18px;z-index:80;width:48px;height:48px;
      display:flex;align-items:center;justify-content:center;border-radius:50%;
      background:var(--ink-2,#111113);border:1px solid var(--line,#26262b);
      color:var(--muted,#9a9aa2);cursor:pointer;transition:border-color .2s,color .2s,box-shadow .3s;
      -webkit-tap-highlight-color:transparent}
    .hs-music:hover{border-color:var(--gold,#c8a24c);color:var(--gold,#c8a24c)}
    .hs-music:focus-visible{outline:2px solid var(--gold,#c8a24c);outline-offset:2px}
    .hs-music svg{width:20px;height:20px;display:block}
    .hs-music .hs-eq{display:none;align-items:flex-end;gap:2px;height:16px}
    .hs-music .hs-eq span{width:3px;height:6px;background:currentColor;border-radius:2px;
      animation:hsEq .9s ease-in-out infinite}
    .hs-music .hs-eq span:nth-child(2){animation-delay:.2s}
    .hs-music .hs-eq span:nth-child(3){animation-delay:.4s}
    .hs-music .hs-eq span:nth-child(4){animation-delay:.1s}
    .hs-music.is-on{color:var(--gold,#c8a24c);border-color:var(--gold,#c8a24c);
      box-shadow:0 0 0 1px var(--gold,#c8a24c),0 6px 22px -6px rgba(200,162,76,.5)}
    .hs-music.is-on .hs-ico{display:none}
    .hs-music.is-on .hs-eq{display:flex}
    .hs-music::after{content:attr(data-label);position:absolute;left:58px;white-space:nowrap;
      font:600 .68rem/1 var(--body,system-ui);letter-spacing:.12em;text-transform:uppercase;
      color:var(--bone,#f4f1ea);background:var(--ink-2,#111113);border:1px solid var(--line,#26262b);
      padding:.5rem .65rem;border-radius:var(--radius,4px);opacity:0;transform:translateX(-4px);
      pointer-events:none;transition:opacity .2s,transform .2s}
    .hs-music:hover::after{opacity:1;transform:translateX(0)}
    @keyframes hsEq{0%,100%{height:5px}50%{height:16px}}
    @media (max-width:560px){.hs-music{width:44px;height:44px;left:14px;bottom:14px}
      .hs-music::after{display:none}}
    ${reduceMotion ? ".hs-music .hs-eq span{animation:none;height:12px}" : ""}
  `;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "hs-music";
  btn.setAttribute("aria-pressed", "false");
  btn.setAttribute("aria-label", "Play background music");
  btn.setAttribute("data-label", "Play the vibe");
  btn.innerHTML =
    '<span class="hs-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg></span>' +
    '<span class="hs-eq" aria-hidden="true"><span></span><span></span><span></span><span></span></span>';

  /* ---- audio engine: real file OR synth demo beat ----------- */
  let playing = false;
  let engine = null;

  function buildFileEngine() {
    const el = document.createElement("audio");
    el.src = MUSIC.src;
    el.loop = true;
    el.preload = "none";
    el.volume = MUSIC.volume;
    return {
      start: () => el.play(),                // returns a promise (may reject)
      stop: () => el.pause(),
    };
  }

  function buildSynthEngine() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return buildFileEngine(); // ancient browser fallback
    let ctx, master, timer = null, step = 0, nextTime = 0, noise;
    const BPM = 150, sixteenth = 15 / BPM; // ~0.1s — fast hats, half-time drums
    // Dark melodic trap (NBA YoungBoy-style), A minor:
    // i – VII – VI – V  →  Am, G, F, E  (somber descending; G# over E = tension)
    const ROOTS = [55.00, 49.00, 43.65, 41.20]; // A1 G1 F1 E1 — sliding-808 roots
    // sparse minor melody: 64-step grid → note frequency (Hz)
    const MEL = {
      0: 659.25, 4: 523.25, 8: 493.88, 10: 523.25, 12: 440.00, // Am: E5 C5 B4 C5 A4
      16: 587.33, 20: 493.88, 24: 440.00, 28: 493.88,          // G : D5 B4 A4 B4
      32: 523.25, 36: 440.00, 40: 392.00, 44: 440.00,          // F : C5 A4 G4 A4
      48: 493.88, 52: 415.30, 56: 329.63, 60: 415.30,          // E : B4 G#4 E4 G#4
    };
    // saturation curve → harmonics that make the 808 audible/felt on small speakers
    const sat = (() => {
      const n = 1024, c = new Float32Array(n);
      for (let i = 0; i < n; i++) { const x = (i / n) * 2 - 1; c[i] = Math.tanh(x * 3.2); }
      return c;
    })();

    function ensure() {
      if (ctx) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      const comp = ctx.createDynamicsCompressor(); // glue + stop clipping
      comp.threshold.value = -10; comp.knee.value = 6; comp.ratio.value = 4;
      comp.attack.value = 0.003; comp.release.value = 0.2;
      master.connect(comp); comp.connect(ctx.destination);
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      noise = buf;
    }
    function env(node, t, peak, dur, atk) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + (atk || 0.005));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      node.connect(g); g.connect(master); return g;
    }
    function kick(t) { // hard trap kick
      const o = ctx.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(170, t);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.10);
      env(o, t, 0.9, 0.34); o.start(t); o.stop(t + 0.36);
    }
    function sub808(freq, t, dur) { // hard 808: pitch-drop knock + saturated sub, long boom
      const o = ctx.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(freq * 2, t);                  // attack blip…
      o.frequency.exponentialRampToValueAtTime(freq, t + 0.04); // …fast drop = the knock
      const sh = ctx.createWaveShaper(); sh.curve = sat;        // grit / harmonics
      const tone = ctx.createBiquadFilter();                    // tame the harsh top
      tone.type = "lowpass"; tone.frequency.value = 3500; tone.Q.value = 0.6;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.95, t + 0.006);     // hard attack
      g.gain.setValueAtTime(0.95, t + 0.06);                    // hold…
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);     // …then long boom tail
      o.connect(sh); sh.connect(tone); tone.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.05);
    }
    function clap(t) { // layered noise bursts = snappy clap on the backbeat
      for (const off of [0, 0.012, 0.024]) {
        const s = ctx.createBufferSource(); s.buffer = noise;
        const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1700; bp.Q.value = 1.1;
        s.connect(bp); env(bp, t + off, 0.4, 0.12, 0.001); s.start(t + off); s.stop(t + off + 0.14);
      }
    }
    function hat(t, peak, len) { // crisp trap hi-hat
      const s = ctx.createBufferSource(); s.buffer = noise;
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 8000;
      s.connect(hp); env(hp, t, peak, len || 0.03, 0.001); s.start(t); s.stop(t + (len || 0.03) + 0.02);
    }
    function bell(freq, t, dur) { // melody — two detuned triangles
      [0, 7].forEach((det) => {
        const o = ctx.createOscillator(); o.type = "triangle";
        o.frequency.value = freq; o.detune.value = det;
        env(o, t, 0.13, dur, 0.012); o.start(t); o.stop(t + dur + 0.05);
      });
    }
    function scheduleStep(s, t) {
      const b = s % 16, root = ROOTS[Math.floor(s / 16) % 4];
      if (b === 0 || b === 10) kick(t);                 // half-time: boom .. b-boom
      if (b === 8) clap(t);                             // backbeat clap
      hat(t, b % 4 === 0 ? 0.22 : 0.12);                // 16th-note trap hats
      if (b === 7 || b === 14 || b === 15) hat(t + sixteenth / 2, 0.10); // 32nd rolls
      if (b === 0) sub808(root, t, sixteenth * 9);      // 808 follows the root
      if (b === 10) sub808(root, t, sixteenth * 6);
      if (MEL[s]) bell(MEL[s], t, sixteenth * 3.5);     // melody
    }
    function loop() {
      while (nextTime < ctx.currentTime + 0.12) {
        scheduleStep(step, nextTime);
        nextTime += sixteenth;
        step = (step + 1) % 64;
      }
      timer = setTimeout(loop, 25);
    }
    return {
      start: () => {
        ensure();
        return ctx.resume().then(() => {
          master.gain.cancelScheduledValues(ctx.currentTime);
          master.gain.linearRampToValueAtTime(MUSIC.volume, ctx.currentTime + 0.4);
          if (timer == null) { nextTime = ctx.currentTime + 0.05; loop(); }
        });
      },
      stop: () => {
        if (!ctx) return;
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
        clearTimeout(timer); timer = null;
      },
    };
  }

  function getEngine() {
    if (!engine) engine = MUSIC.placeholder ? buildSynthEngine() : buildFileEngine();
    return engine;
  }

  function setUI(on) {
    playing = on;
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("aria-label", on ? "Mute background music" : "Play background music");
    btn.setAttribute("data-label", on ? "Mute" : "Play the vibe");
  }

  function play() {
    Promise.resolve(getEngine().start())
      .then(() => { setUI(true); try { sessionStorage.setItem(STORE_KEY, "1"); } catch (e) {} })
      .catch(() => setUI(false)); // blocked by browser — stay off, wait for a tap
  }
  function stop() {
    getEngine().stop();
    setUI(false);
    try { sessionStorage.setItem(STORE_KEY, "0"); } catch (e) {}
  }

  btn.addEventListener("click", () => (playing ? stop() : play()));

  /* ---- resume across page changes (needs the next gesture) -- */
  function wantsOn() { try { return sessionStorage.getItem(STORE_KEY) === "1"; } catch (e) { return false; } }
  function init() {
    document.head.appendChild(style);
    document.body.appendChild(btn);
    if (wantsOn()) {
      play(); // works if the browser already trusts this site; otherwise:
      const resume = () => { if (!playing && wantsOn()) play(); };
      window.addEventListener("pointerdown", resume, { once: true });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
