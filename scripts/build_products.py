#!/usr/bin/env python3
"""
SUPER RESELLS — product page generator.

Reads data/products.json (CMS-managed) and writes one SEO page per product to
/product/<slug>.html, plus a sitemap.xml that includes them. Run automatically
by .github/workflows/product-pages.yml whenever products change, and locally via
`python3 scripts/build_products.py`. Stdlib only — no dependencies.
"""
import json, re, html, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://super-resells.pages.dev"
ANALYTICS_TOKEN = "4c189458e020437a9e2981de7402ff9c"
FAVICON = ('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22>'
           '<rect width=%2264%22 height=%2264%22 rx=%2212%22 fill=%22%230a0a0b%22/>'
           '<path d=%22M32 11 L36.5 23.9 L50.1 24.1 L39.2 32.4 L43.2 45.4 L32 37.6 L20.8 45.4 '
           'L24.8 32.4 L13.9 24.1 L27.5 23.9 Z%22 fill=%22%23c8a24c%22/></svg>')


def load(rel, default):
    try:
        return json.load(open(ROOT / rel, encoding="utf-8"))
    except Exception:
        return default


products = load("data/products.json", {"items": []}).get("items", [])
settings = load("data/settings.json", {})
base_price = ((settings.get("pricing") or {}).get("basePrice")) or 50


def slugify(s):
    s = re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")
    return s or "piece"


# Deterministic unique slugs in file order (the storefront JS computes these the
# same way, so card links match the generated filenames).
_seen = {}
for p in products:
    s = slugify(p.get("name"))
    n = _seen.get(s, 0) + 1
    _seen[s] = n
    p["_slug"] = s if n == 1 else f"{s}-{n}"


def sizes_for(p):
    sz = p.get("sizes")
    if isinstance(sz, list) and sz:
        return sz
    if p.get("cat") == "Headwear":
        return ["One Size"]
    return ["S", "M", "L", "XL", "2XL"]


def money(n):
    n = float(n)
    return f"${int(n)}" if n == int(n) else f"${n:.2f}"


def webp(src):
    return re.sub(r"\.(jpe?g|png)$", ".webp", src or "", flags=re.I)


def e(s):
    return html.escape("" if s is None else str(s), quote=True)


SIZE_GUIDE = [("S", "18", "28"), ("M", "20", "29"), ("L", "22", "30"),
              ("XL", "24", "31"), ("2XL", "26", "32")]

HEADER = '''<header class="site-header">
  <nav class="nav container">
    <a href="/" class="brand" aria-label="SUPER RESELLS home">
      <svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="12" fill="#111113" stroke="#26262b"/><path d="M32 14.5 L35.9 25.7 L47.7 25.9 L38.3 33 L41.7 44.4 L32 37.6 L22.3 44.4 L25.7 33 L16.3 25.9 L28.1 25.7 Z" fill="url(#g)"/><defs><linearGradient id="g" x1="0" y1="0" x2="64" y2="64"><stop stop-color="#e9c76b"/><stop offset="1" stop-color="#9c7a2f"/></linearGradient></defs></svg>
      <span class="wordmark"><b>SUPER</b><span>RESELLS</span></span>
    </a>
    <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false"><span></span><span></span><span></span></button>
    <ul class="nav-links">
      <li><a href="/">Home</a></li>
      <li><a href="/shop">Shop</a></li>
      <li><a href="/#bulk">Stack &amp; Save</a></li>
      <li><a href="/about">About</a></li>
      <li><a href="/contact">Contact</a></li>
    </ul>
    <div class="nav-right">
      <button class="cart-btn" data-open-cart aria-label="Open cart">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>
        <span class="lbl">Order</span><span class="cart-count">0</span>
      </button>
    </div>
  </nav>
</header>'''

FOOTER = '''<footer class="site-footer">
  <div class="container">
    <div class="foot-top">
      <div class="foot-brand">
        <a href="/" class="brand"><svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="12" fill="#111113" stroke="#26262b"/><path d="M32 14.5 L35.9 25.7 L47.7 25.9 L38.3 33 L41.7 44.4 L32 37.6 L22.3 44.4 L25.7 33 L16.3 25.9 L28.1 25.7 Z" fill="#c8a24c"/></svg><span class="wordmark"><b>SUPER</b><span>RESELLS</span></span></a>
        <p>Curated premium streetwear — hand-picked graphic heat, shipped nationwide, priced fair.</p>
        <div class="foot-social" id="footSocial"></div>
      </div>
      <div class="foot-col"><h4>Shop</h4><a href="/shop">All Products</a><a href="/shop">New Arrivals</a><a href="/#bulk">Stack &amp; Save</a><a href="/contact">Custom Requests</a></div>
      <div class="foot-col"><h4>Company</h4><a href="/about">About</a><a href="/contact">Contact</a><a href="/contact">Bulk &amp; Custom Orders</a><a data-order-email href="#">Email Us</a></div>
    </div>
    <div class="foot-bottom">
      <span>&copy; <span data-year></span> SUPER RESELLS</span>
      <span>Curated with intent. Worn with pride.</span>
    </div>
  </div>
</footer>'''

DRAWER = '''<div class="scrim" id="scrim"></div>
<aside class="drawer" id="cartDrawer" aria-label="Your order">
  <div class="drawer-head"><h3>Your Order</h3><button class="drawer-close" data-close-cart aria-label="Close">&times;</button></div>
  <div class="drawer-body" id="cartBody"></div>
  <div class="drawer-foot" id="cartFoot"></div>
</aside>
<div class="modal-scrim" id="modalScrim"><div class="modal" id="modalContent"></div></div>
<div class="mobile-cta">
  <a href="/shop" class="btn btn-gold">Shop the Heat</a>
  <button class="btn btn-ghost" data-open-cart>Order</button>
</div>'''

BEACON = ("<script defer src='https://static.cloudflareinsights.com/beacon.min.js' "
          "data-cf-beacon='{\"token\": \"" + ANALYTICS_TOKEN + "\"}'></script>")

LOCK = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">'
        '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>')


def stock_line(p):
    n = len(sizes_for(p))
    if n <= 1:
        return '<div class="stock-line urgent"><span class="dot"></span>Only 1 left — last piece</div>'
    if n <= 3:
        return f'<div class="stock-line low"><span class="dot"></span>Only {n} left in stock</div>'
    return f'<div class="stock-line"><span class="dot"></span>{n} in stock</div>'


def gallery(p):
    if not p.get("img"):
        return f'<div class="pdp-media placeholder"><span class="ph-text">{e(p.get("name"))}</span></div>'
    figs = [f'<figure><img src="{e(webp(p["img"]))}" data-fb="{e(p["img"])}" alt="{e(p.get("name"))} front" onerror="imgFallback(this)"></figure>']
    if p.get("back"):
        figs.append(f'<figure><img src="{e(webp(p["back"]))}" data-fb="{e(p["back"])}" alt="{e(p.get("name"))} back" loading="lazy" onerror="imgFallback(this)"></figure>')
    return '<div class="pdp-gallery">' + "".join(figs) + "</div>"


def size_guide_html(sizes):
    if len(sizes) <= 1:
        return ""
    rows = "".join(f"<tr><td class='sg-size'>{e(s)}</td><td>{c}</td><td>{l}</td></tr>" for s, c, l in SIZE_GUIDE)
    return ('<details class="size-guide"><summary>Size guide</summary>'
            '<table class="sg-table"><thead><tr><th>Size</th><th>Chest</th><th>Length</th></tr></thead>'
            f'<tbody>{rows}</tbody></table>'
            '<p class="sg-note">Measurements in inches, laid flat. Roughly true to size — size up for an oversized fit.</p></details>')


def buy_box(p):
    sizes = sizes_for(p)
    price = p.get("price", base_price)
    default = "M" if "M" in sizes else sizes[0]
    addbtn = (f'<button class="btn btn-gold btn-block btn-lg" data-add="{e(p["id"])}" data-size="{e(default)}" '
              f'data-add-close>Add to Order — {money(price)}</button>')
    assure = (f'<p class="qv-assure">{LOCK}<span><b>No payment now.</b> Send your order and pay only once we '
              "confirm it's yours — zero risk.</span></p>")
    if len(sizes) > 1:
        pills = "".join(f'<button class="sz-pill {"active" if s == default else ""}" data-sz="{e(s)}">{e(s)}</button>' for s in sizes)
        inner = (f'<span class="sz-label">Select size</span><div class="sz-row">{pills}</div>'
                 f'{size_guide_html(sizes)}{addbtn}{assure}')
    else:
        inner = f'<span class="sz-label">Size: <b>{e(sizes[0])}</b></span>{addbtn}{assure}'
    return f'<div class="pdp-buy" data-pdp>{inner}</div>'


def related_html(p):
    pool = [q for q in products if q["_slug"] != p["_slug"] and sizes_for(q)]
    pool.sort(key=lambda q: (q.get("cat") != p.get("cat"), q.get("badge") != "Just Dropped"))
    picks = pool[:4]
    if not picks:
        return ""
    cards = []
    for q in picks:
        thumb = (f'<img src="{e(webp(q["img"]))}" data-fb="{e(q["img"])}" alt="{e(q.get("name"))}" loading="lazy" onerror="imgFallback(this)">'
                 if q.get("img") else f'<span class="ph-text">{e(q.get("name"))}</span>')
        cards.append(
            f'<a class="rel-card" href="/product/{e(q["_slug"])}"><span class="rel-media">{thumb}</span>'
            f'<span class="rel-name">{e(q.get("name"))}</span>'
            f'<span class="rel-price">{money(q.get("price", base_price))}</span></a>')
    return ('<section class="section"><div class="container"><div class="section-head reveal">'
            '<span class="eyebrow">Keep Stacking</span><h2>More Heat</h2></div>'
            f'<div class="rel-grid">{"".join(cards)}</div></div></section>')


def page(p):
    name = p.get("name") or "Piece"
    price = p.get("price", base_price)
    desc = p.get("desc") or f"{name} — hand-picked premium streetwear from SUPER RESELLS. One-of-a-few, stack the cart to save."
    url = f"{SITE}/product/{p['_slug']}"
    images = [f"{SITE}/{p['img']}"] if p.get("img") else [f"{SITE}/images/social-card.jpg"]
    if p.get("back"):
        images.append(f"{SITE}/{p['back']}")
    schema = {
        "@context": "https://schema.org", "@type": "Product", "name": name,
        "image": images, "description": desc, "sku": p.get("id"),
        "brand": {"@type": "Brand", "name": "SUPER RESELLS"},
        "category": p.get("cat"),
        "offers": {"@type": "Offer", "priceCurrency": "USD", "price": str(int(float(price))),
                   "availability": "https://schema.org/InStock", "url": url,
                   "seller": {"@type": "Organization", "name": "SUPER RESELLS"}},
    }
    og_img = images[0]
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base href="/">
  <title>{e(name)} — SUPER RESELLS</title>
  <meta name="description" content="{e(desc)}">
  <meta name="theme-color" content="#0a0a0b">
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="SUPER RESELLS">
  <meta property="og:title" content="{e(name)} — SUPER RESELLS">
  <meta property="og:description" content="{e(desc)}">
  <meta property="og:url" content="{e(url)}">
  <meta property="og:image" content="{e(og_img)}">
  <meta property="product:price:amount" content="{int(float(price))}">
  <meta property="product:price:currency" content="USD">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="{e(og_img)}">
  <link rel="canonical" href="{e(url)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="icon" href="{FAVICON}">
  <link rel="stylesheet" href="style.css">
  <noscript><style>.reveal{{opacity:1!important;transform:none!important}}</style></noscript>
  <script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
</head>
<body>
{HEADER}

<nav class="breadcrumb container" aria-label="Breadcrumb">
  <a href="/">Home</a><span>/</span><a href="/shop">Shop</a><span>/</span><span>{e(name)}</span>
</nav>

<section class="pdp container">
  {gallery(p)}
  <div class="pdp-info reveal">
    <span class="eyebrow">{e(p.get("cat") or "Streetwear")}</span>
    <h1>{e(name)}</h1>
    <div class="pdp-price">{money(price)} <small>/ each</small></div>
    <div class="pdp-meta">{e(p.get("colors") or "")}</div>
    {stock_line(p)}
    <p class="lead pdp-desc">{e(desc)}</p>
    {buy_box(p)}
    <div class="order-summary pdp-stack">
      <div class="os-line"><span>Just this one</span><span>{money(base_price)}</span></div>
      <div class="os-line"><span>Stack 3</span><span style="color:var(--gold)">{money(_each(3))} each</span></div>
      <div class="os-line"><span>Stack 10+</span><span style="color:var(--gold)">{money(_each(10))} each</span></div>
      <a href="/#bulk" class="pdp-stacklink">See the full deal sheet →</a>
    </div>
  </div>
</section>

{related_html(p)}

{FOOTER}
{DRAWER}
<script src="script.js"></script>
{BEACON}
</body>
</html>'''


# --- stack price helpers (mirror script.js priceForQty for the static summary) ---
def _price_for_qty(n):
    table = ((settings.get("pricing") or {}).get("table"))
    if isinstance(table, list) and table:
        T = sorted([(r["qty"], r["price"]) for r in table if isinstance(r, dict) and "qty" in r and "price" in r])
    else:
        T = [(1, 50), (2, 85), (3, 120), (4, 140), (5, 160), (6, 180), (7, 200), (8, 220),
             (9, 240), (10, 260), (12, 300), (15, 360), (20, 460), (25, 550), (30, 660)]
    if n <= T[0][0]:
        return base_price * n
    if n >= T[-1][0]:
        (qa, pa), (qb, pb) = T[-2], T[-1]
        return round(pb + (n - qb) * (pb - pa) / (qb - qa))
    for i in range(len(T) - 1):
        (q0, p0), (q1, p1) = T[i], T[i + 1]
        if q0 <= n <= q1:
            return round(p0 + (p1 - p0) * (n - q0) / (q1 - q0))
    return n * base_price


def _each(n):
    return _price_for_qty(n) / n if n else 0


# --- write product pages ---
out_dir = ROOT / "product"
out_dir.mkdir(exist_ok=True)
for old in out_dir.glob("*.html"):
    old.unlink()
for p in products:
    (out_dir / f"{p['_slug']}.html").write_text(page(p), encoding="utf-8")

# --- regenerate sitemap with the product pages included ---
urls = [("/", "1.0", "daily"), ("/shop", "0.9", "daily"),
        ("/about", "0.6", "monthly"), ("/contact", "0.6", "monthly")]
urls += [(f"/product/{p['_slug']}", "0.8", "weekly") for p in products]
entries = "\n".join(
    f"  <url>\n    <loc>{SITE}{loc}</loc>\n    <changefreq>{cf}</changefreq>\n    <priority>{pr}</priority>\n  </url>"
    for loc, pr, cf in urls)
(ROOT / "sitemap.xml").write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + entries + "\n</urlset>\n",
    encoding="utf-8")

print(f"Generated {len(products)} product pages + sitemap ({len(urls)} urls).")
