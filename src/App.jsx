import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";

// Paint the document background the moment this bundle parses — before React
// mounts. When Telegram revives a backgrounded mini app it reloads the webview,
// and without this the blank page flashes white until the app paints. Set only
// on documentElement (html), NOT on body — body gets the brand gradient from CSS;
// overriding body inline kills it.
try {
  if (typeof document !== "undefined") {
    let _th = "light";
    try {
      _th = localStorage.getItem("gt_theme_v4") ? (localStorage.getItem("gt_theme") || "light") : "light";
    } catch { /* noop */ }
    document.documentElement.setAttribute("data-theme", _th);
    document.documentElement.style.background = _th === "light" ? "#f2f2f7" : "#000000";
  }
} catch { /* noop */ }

/* ════════════════════════════════════════════════════════════════════════
   GiftTrove — Telegram Gift Scouting Mini App
   ────────────────────────────────────────────────────────────────────────
   Background color is intentionally UNCHANGED (see :root --bg-base / --bg-gradient).

   DATA MODEL (all live data comes from the backend; nothing is hardcoded):
     GET  /api/collections                     -> { collections:[{name,slug,gift_id,supply,preview}] }
     GET  /api/attributes?gift_id=...          -> { models:[{name,rarity}], symbols:[{name,rarity}],
                                                     backdrops:[{name,hex,rarity}] }
     GET  /api/search?gift=&gift_id=&slug=&num=&model=&symbol=&backdrop=&markets=
                                               -> { results:[{ id,slug,num,name,model,modelRarity,
                                                     symbol,backdrop,backdropHex,price,currency,
                                                     market,url,image,animation }] }
     GET  /api/gift?slug=...                   -> { ...unique gift detail... }
     GET  /api/referrals?uid=...               -> { count }
     POST /api/referral { uid, by }            -> { ok }

   Images/animations load CLIENT-SIDE straight from Fragment's CDN:
     static    https://nft.fragment.com/gift/{slug}-{num}.large.jpg
     animated  https://nft.fragment.com/gift/{slug}-{num}.lottie.json
   ════════════════════════════════════════════════════════════════════════ */

// ─── CONFIG ─────────────────────────────────────────────────────────────────
// Resolution order: (1) a runtime global you can inject on the page, (2) the
// Vite build-time env var VITE_BACKEND_URL (set this in Vercel → it's baked into
// the bundle at build, so you MUST redeploy after changing it), (3) a hardcoded
// fallback. NOTE: referencing import.meta.env is what actually makes the Vercel
// env var take effect — without it, setting VITE_BACKEND_URL does nothing.
const BACKEND_URL = (
  (typeof window !== "undefined" && window.__GIFTTROVE_API__) ||
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BACKEND_URL) ||
  "https://betatest-rjhx.onrender.com"
).replace(/\/+$/, "");   // strip trailing slash(es) — otherwise "URL/" + "/api/x" => "URL//api/x" (404s every call)
const BACKEND_CONFIGURED = /^https?:\/\//.test(BACKEND_URL);

const FRAGMENT_CDN = "https://nft.fragment.com/gift";

// Brand logo (sits between GIFT and TROVE, the Scout tab icon, and the headline mark).
// Served from /public/logo.svg — brand-blue gradient background baked into the SVG.
const LOGO_URL = "/logo.svg";
// GiftTrove animated plush mascot — used on the launch splash and as the default
// profile avatar when a user has no Telegram photo. Served from /public/mascot.svg.
// The SVG has built-in squish-and-stretch animateTransform animations.
const MASCOT_URL = "/mascot.svg";

// Animated gold star for the Hoton "Need Stars?" CTA.
const HOTON_STAR_LOTTIE = "/lottie/star_motion.json";

const REF_BOT_LINK = "https://t.me/gifttrovebot/app?startapp="; // + payload

// This user sees an analytics dashboard instead of the normal search UI.
const ADMIN_DASHBOARD_ID = "8124847664";

// Referral codes are a reversible base36 of the Telegram user id — unique per
// user, derivable from the id alone (no database needed), short & alphanumeric.
function refCodeFor(uid) {
  const n = Number(uid);
  return Number.isFinite(n) && n > 0 ? n.toString(36) : "";
}
function decodeRef(code) {
  if (!code) return null;
  const n = parseInt(String(code), 36);
  return Number.isFinite(n) && n > 0 ? String(n) : null;
}
// Short deep-link to a specific gift, with the sharer's referral code attached.
function giftDeepLink(item, myRef) {
  const slug = (item?.slug || "").trim();
  if (!slug) return REF_BOT_LINK + (myRef || "");
  return `${REF_BOT_LINK}g_${slug}_${myRef || ""}`;
}

// Profile -> Community links
const COMMUNITY = {
  channel: "https://t.me/gifttrove",
  insideMajek: "https://t.me/insidemajek",
  otc: "https://t.me/troveotc",
  x: "https://x.com/gifttrove",
  support: "https://t.me/asktrove",
};

// Tiny offline fallback so search/autocomplete still works before the backend answers.
// The LIVE, always-up-to-date list is fetched from /api/collections — this is only a safety net.
const FALLBACK_COLLECTIONS = [
  "Plush Pepe", "Durov's Cap", "Heart Locket", "Precious Peach", "Astral Shard",
  "Toy Bear", "Vintage Cigar", "Signet Ring", "Scared Cat", "Nail Bracelet",
  "Neko Helmet", "Bonded Ring", "Perfume Bottle", "Eternal Rose", "Swiss Watch",
  "Magic Potion", "Jelly Bunny", "Spiced Wine", "Santa Hat", "B-Day Candle",
  "Homemade Cake", "Snake Box", "Crystal Ball", "Mini Oscar", "Sharp Tongue",
];

const MARKETPLACES = ["All", "Telegram", "MarketApp", "Fragment", "GetGems", "Portals", "MRKT", "Tonnel"];
// Markets we have real listing data for (Telegram-native via MTProto; MarketApp
// aggregator via API; Fragment via scraper). The others get a "view" link only.
const LIVE_MARKETS = new Set(["Telegram", "Fragment", "MarketApp"]);  // live & clickable; others greyed

const LANGS = { EN: "English", RU: "Русский", ZH: "中文" };

// ─── TINY API CLIENT (graceful: never throws the UI down) ─────────────────────
async function api(path, { method = "GET", body, timeout = 10000 } = {}) {
  if (!BACKEND_CONFIGURED) throw new Error("backend-not-configured");
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeout);
  // Signed Telegram initData proves the caller's identity to the backend.
  const initData = (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) || "";
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (initData) headers["X-Init-Data"] = initData;
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers: Object.keys(headers).length ? headers : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`http-${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(tid);
  }
}

/* ════════════════════════════════════════════════════════════════════════════
   INSTANT SEARCH ENGINE  (Google-inspired)
   ----------------------------------------------------------------------------
   Google returns results from billions of pages in a fraction of a second by
   never scanning documents at query time — it consults an *inverted index*
   (term -> list of docs) instead. Our gift catalogue is tiny (~hundreds of
   collections), so we can run the same idea entirely in the browser and make
   gift-name lookup feel instant:

     1. INVERTED / PREFIX INDEX  — build once from the catalogue. Maps every
        token + every prefix to the collections that contain it, so a keystroke
        is an O(1) map lookup, not an O(n) scan of every name on every render.
     2. RELEVANCE RANKING        — exact > prefix(starts-with) > word-start >
        contains, with shorter names winning ties. The "right" gift surfaces
        first, the way Google puts the best hit on top.
     3. LRU RESULT CACHE         — repeated queries (backspacing, re-searching)
        return from memory with no network round-trip, like Google/FB caching
        recent queries.
     4. RACE-GUARD               — only the freshest query's response is allowed
        to update the UI, so a slow earlier request can never clobber a newer
        one (kills out-of-order flicker).
   ════════════════════════════════════════════════════════════════════════════ */

// Normalise for matching: lowercase, strip punctuation/diacritics, collapse spaces.
function _norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Build an inverted/prefix index over collection names. Cheap to build, and
// rebuilt only when the catalogue actually changes (guarded by a signature).
function buildSearchIndex(collections) {
  const items = (collections || [])
    .map((c) => (typeof c === "string" ? { name: c } : c))
    .filter((c) => c && c.name);
  // term -> Set(itemIndex). Includes whole tokens AND their growing prefixes.
  const prefix = new Map();
  const add = (key, idx) => {
    let bucket = prefix.get(key);
    if (!bucket) { bucket = new Set(); prefix.set(key, bucket); }
    bucket.add(idx);
  };
  const norms = [];
  items.forEach((it, idx) => {
    const n = _norm(it.name);
    norms.push(n);
    const tokens = n.split(" ").filter(Boolean);
    tokens.forEach((tok) => {
      // index every prefix of every token: "pepe" -> p, pe, pep, pepe
      for (let i = 1; i <= tok.length; i++) add(tok.slice(0, i), idx);
    });
  });
  return { items, norms, prefix };
}

// Rank candidates for a query. Returns the matching items, best first.
function searchIndex(index, query, limit = 12) {
  if (!index) return [];
  const q = _norm(query);
  if (!q) return index.items.slice(0, limit);
  const qTokens = q.split(" ").filter(Boolean);

  // Candidate set = items matching the LAST (in-progress) token via the prefix
  // map, intersected with earlier complete tokens. For a single token this is a
  // direct map hit — no scan.
  let candidates = null;
  qTokens.forEach((tok) => {
    const bucket = index.prefix.get(tok) || new Set();
    if (candidates === null) candidates = new Set(bucket);
    else candidates = new Set([...candidates].filter((i) => bucket.has(i)));
  });
  if (!candidates || candidates.size === 0) {
    // fall back to a substring pass only when the index misses (rare, typos)
    candidates = new Set();
    index.norms.forEach((n, i) => { if (n.includes(q)) candidates.add(i); });
  }

  const scored = [];
  candidates.forEach((i) => {
    const n = index.norms[i];
    let score;
    if (n === q) score = 0;                       // exact
    else if (n.startsWith(q)) score = 1;          // starts-with
    else if ((" " + n).includes(" " + q)) score = 2; // a word starts with q
    else score = 3;                               // contains
    // shorter names win ties (closer to what the user meant)
    scored.push([score, n.length, index.items[i]]);
  });
  scored.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return scored.slice(0, limit).map((s) => s[2]);
}

// Tiny LRU cache for search *results* (query+filters key -> payload).
function makeLRU(max = 40) {
  const map = new Map();
  return {
    get(k) {
      if (!map.has(k)) return undefined;
      const v = map.get(k); map.delete(k); map.set(k, v); // mark fresh
      return v;
    },
    set(k, v) {
      if (map.has(k)) map.delete(k);
      map.set(k, v);
      if (map.size > max) map.delete(map.keys().next().value); // evict oldest
    },
    clear() { map.clear(); },
  };
}

// ─── URL HELPERS (validated; no guessed links) ────────────────────────────────
const nano = (ton) => Math.round((parseFloat(ton) || 0) * 1e9);

function giftImage(slug, num) {
  return slug && num != null ? `${FRAGMENT_CDN}/${slug}-${num}.large.jpg` : null;
}
function giftAnimation(slug, num) {
  return slug && num != null ? `${FRAGMENT_CDN}/${slug}-${num}.lottie.json` : null;
}

// Use the marketplace-provided URL when present (already validated by the backend),
// otherwise fall back to Telegram's canonical native collectible link t.me/nft/<slug>.
function marketplaceUrl(item) {
  if (item?.url && /^https?:\/\//.test(item.url)) return item.url;
  if (item?.slug && item?.num != null) return `https://t.me/nft/${item.slug}-${item.num}`;
  return null;
}

// Compact, mobile-safe number formatting: 2,562,062 -> 2.5M, 12,500 -> 12.5K,
// but small values keep their real decimals (8.94 stays 8.94, not 9).
function compactNum(n) {
  n = Number(n);
  if (!Number.isFinite(n)) return "0";
  const trim = (v) => (v % 1 === 0 ? String(v) : v.toFixed(1).replace(/\.0$/, ""));
  if (n >= 1e9) return trim(Math.floor(n / 1e8) / 10) + "B";
  if (n >= 1e6) return trim(Math.floor(n / 1e5) / 10) + "M";
  if (n >= 1e3) return trim(Math.floor(n / 100) / 10) + "K";
  if (n === 0) return "0";
  if (Number.isInteger(n)) return n.toLocaleString("en-US");
  // keep up to 2 decimals for fractional values, trimming trailing zeros
  const s = (Math.round(n * 100) / 100).toFixed(2).replace(/\.?0+$/, "");
  return s;
}

// Wallet deeplinks — TON spec, address in the PATH, amount in nanotons, comment as `text`.
// TonKeeper + MyTonWallet only. TG Wallet is handled via copy-address (no public transfer deeplink).
// Open links the Telegram-friendly way; validate scheme/host first.
function safeOpen(url) {
  if (!url) return false;
  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null;
  const platform = (tg?.platform || "").toLowerCase();
  // Desktop/web Telegram minimizes the Mini App to show an opened link, which
  // feels jarring on a big screen. On those platforms we open links in a new
  // browser tab so the Mini App stays put. On mobile we keep the native
  // behavior — the link slides over the app and it minimizes to a pill you can
  // tap to come right back, which is the nice flow you want to preserve.
  const isDesktop = ["tdesktop", "macos", "weba", "webk", "web"].includes(platform);
  const isTme = /^https:\/\/t\.me\//.test(url) || /^tg:\/\//.test(url);
  try {
    if (isDesktop && /^https?:\/\//.test(url)) { window.open(url, "_blank", "noopener"); return true; }
    if (tg && isTme && tg.openTelegramLink) { tg.openTelegramLink(url); return true; }
    if (tg && tg.openLink && /^https:\/\//.test(url)) { tg.openLink(url); return true; }
    window.open(url, "_blank", "noopener");
    return true;
  } catch {
    return false;
  }
}

function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text); return true; }
  } catch { /* noop */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    return true;
  } catch { return false; }
}

// rarity: accepts "1.2%", 1.2, or permille; returns a CSS tier class
function rarityClass(r) {
  let v = typeof r === "number" ? r : parseFloat(r);
  if (Number.isNaN(v)) return "rarity-common";
  if (v > 100) v = v / 10; // permille -> percent, just in case
  if (v < 2) return "rarity-ultra";
  if (v < 10) return "rarity-rare";
  if (v < 25) return "rarity-uncommon";
  return "rarity-common";
}
const fmtRarity = (r) => {
  let v = typeof r === "number" ? r : parseFloat(r);
  if (Number.isNaN(v)) return "";
  if (v > 100) v = v / 10;
  return `${v}%`;
};

function preloadImages(urls) {
  urls.filter(Boolean).forEach((url) => { const img = new Image(); img.src = url; });
}

const haptic = (style = "light") => {
  try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style); } catch { /* noop */ }
};

// ─── LOGO ─────────────────────────────────────────────────────────────────────
const GiftTroveLogo = ({ size = 28, className }) => (
  <img
    src={LOGO_URL}
    alt="GiftTrove"
    className={className}
    style={{ width: size, height: size, objectFit: "contain", display: "block", flexShrink: 0 }}
  />
);

// ─── ANIMATED ICONS (dependency-free; play on tap via the `trigger` prop) ─────
// Equivalent behaviour to the Framer-Motion icons, but pure CSS so no extra
// npm packages / TypeScript are needed and the Vercel build stays simple.
function useIconPlay(trigger) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!trigger) return;
    setOn(true);
    const t = setTimeout(() => setOn(false), 850);
    return () => clearTimeout(t);
  }, [trigger]);
  return on;
}

const IconSearch = ({ size = 22 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const IconBookmarkFilled = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
// ── Marketplace brand icons (traced from official logos) ──────────────────────
const IconGramLogo = ({size=16}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="#0098EA"/>
    {/* Gem/diamond body */}
    <path d="M18 44 L50 16 L82 44 L50 86 Z" fill="white"/>
    {/* Top facet highlight */}
    <path d="M18 44 L28 36 L50 28 L72 36 L82 44 L50 44 Z" fill="#0098EA" opacity="0.25"/>
    {/* 4-pointed sparkle */}
    <path d="M50 35 L53.5 45.5 L64 49 L53.5 52.5 L50 63 L46.5 52.5 L36 49 L46.5 45.5 Z" fill="#0098EA"/>
  </svg>
);

// mktIcon: lowercase plain function (not a component) so it is always safe to call
// from inside render helper functions like renderGiftCard / renderPromoCard.
const mktIcon = (market, size = 13) => {
  if (!market) return null;
  const s = size;
  switch ((market || "").toLowerCase()) {
    case "telegram":
      return (
        <svg width={s} height={s} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <rect width="512" height="512" rx="112" fill="#0098EA"/>
          <path d="M74.12,252.09 C180.90,205.77 251.85,175.05 287.44,160.18 C388.87,118.00 410.08,110.69 423.73,110.44 C426.66,110.44 433.48,111.17 437.87,114.59 C441.53,117.51 442.75,121.66 443.23,124.58 C443.72,127.51 444.21,133.85 443.72,138.97 C438.11,196.75 414.47,336.94 402.28,401.79 C397.16,429.09 387.16,438.36 377.41,439.33 C356.20,441.28 339.86,425.19 319.38,411.78 C287.20,390.57 268.92,377.41 237.71,356.93 C201.63,333.04 225.27,320.36 245.75,298.90 C251.12,293.30 344.74,208.21 346.44,200.41 C346.69,199.43 346.93,195.77 344.74,193.82 C342.54,191.87 339.37,192.85 337.18,193.34 C334.01,194.07 282.57,227.96 182.85,295.25 C168.22,305.24 155.30,310.12 143.36,309.87 C130.19,309.63 105.32,302.56 86.55,296.46 C63.63,289.15 45.35,285.01 47.05,272.33 C47.79,265.75 56.81,259.16 74.12,252.09 Z" fill="#FFFFFF"/>
        </svg>
      );
    case "fragment":
      return (
        <svg width={s} height={s} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <rect width="512" height="512" rx="112" fill="#1C1C1E"/>
          <path d="M246.13,210.45 C246.13,210.45 109.05,148.65 109.05,148.65 C99.09,144.16 102.30,129.27 113.22,129.27 C113.22,129.27 399.88,129.27 399.88,129.27 C410.80,129.27 414.00,144.16 404.04,148.65 C404.04,148.65 266.97,210.45 266.97,210.45 C260.35,213.44 252.75,213.44 246.13,210.45 Z" fill="#FFFFFF"/>
          <path d="M430.52,185.85 C435.99,177.33 426.98,166.94 417.78,171.15 C417.78,171.15 285.64,231.50 285.64,231.50 C276.63,235.62 270.83,244.65 270.83,254.56 C270.83,254.56 270.83,399.74 270.83,399.74 C270.83,409.85 284.02,413.73 289.49,405.22 C289.49,405.22 430.52,185.85 430.52,185.85 Z" fill="#FFFFFF"/>
          <path d="M95.25,171.15 C86.05,166.94 77.04,177.33 82.51,185.85 C82.51,185.85 223.54,405.23 223.54,405.23 C229.01,413.74 242.20,409.86 242.20,399.74 C242.20,399.74 242.20,254.56 242.20,254.56 C242.20,244.65 236.40,235.62 227.39,231.51 C227.39,231.51 95.25,171.14 95.25,171.14 Z" fill="#FFFFFF"/>
        </svg>
      );
    case "marketapp":
      return (
        <svg width={s} height={s} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <rect width="512" height="512" rx="112" fill="#007AFF"/>
          <path d="M220.73,92.40 C322.68,92.40 373.66,92.40 412.60,112.24 C446.86,129.69 474.71,157.54 492.16,191.80 C512.00,230.74 512.00,281.72 512.00,383.67 C512.00,387.91 512.00,390.02 511.44,391.73 C510.32,395.20 507.60,397.92 504.13,399.04 C502.42,399.60 500.31,399.60 496.07,399.60 L427.80,399.60 C421.43,399.60 418.24,399.60 415.81,398.36 C413.67,397.27 411.93,395.53 410.84,393.39 C409.60,390.96 409.60,387.77 409.60,381.39 L409.60,322.23 C409.60,277.62 409.60,255.32 400.92,238.28 C393.28,223.30 381.10,211.11 366.11,203.48 C349.08,194.80 326.78,194.80 282.17,194.80 L120.61,194.80 C114.23,194.80 111.04,194.80 108.61,193.56 C106.47,192.47 104.73,190.73 103.64,188.59 C102.40,186.15 102.40,182.96 102.40,176.59 L102.40,110.60 C102.40,104.23 102.40,101.04 103.64,98.61 C104.73,96.47 106.47,94.73 108.61,93.64 C111.04,92.40 114.23,92.40 120.61,92.40 Z" fill="#FFFFFF"/>
          <path d="M290.13,268.75 C306.06,268.75 314.03,268.75 320.11,271.86 C325.47,274.58 329.82,278.93 332.54,284.28 C335.64,290.37 335.64,298.33 335.64,314.27 L335.64,381.39 C335.64,387.77 335.64,390.96 334.40,393.39 C333.31,395.53 331.57,397.27 329.43,398.36 C327.00,399.60 323.81,399.60 317.44,399.60 L194.56,399.60 C188.19,399.60 185.00,399.60 182.57,398.36 C180.43,397.27 178.69,395.53 177.59,393.39 C176.35,390.96 176.36,387.77 176.36,381.39 L176.36,286.96 C176.36,280.59 176.35,277.40 177.59,274.97 C178.69,272.82 180.43,271.08 182.57,270.00 C185.00,268.75 188.19,268.75 194.56,268.75 Z" fill="#FFFFFF"/>
          <path d="M84.19,194.80 C90.57,194.80 93.75,194.80 96.19,196.04 C98.33,197.13 100.07,198.87 101.16,201.01 C102.40,203.44 102.40,206.63 102.40,213.00 L102.40,381.39 C102.40,387.77 102.40,390.96 101.16,393.39 C100.07,395.53 98.33,397.27 96.19,398.36 C93.75,399.60 90.57,399.60 84.19,399.60 L18.21,399.60 C11.83,399.60 8.65,399.60 6.21,398.36 C4.07,397.27 2.33,395.53 1.24,393.39 C0,390.96 0,387.77 0,381.39 L0,213.00 C0,206.63 0,203.44 1.24,201.01 C2.33,198.87 4.07,197.13 6.21,196.04 C8.65,194.80 11.83,194.80 18.21,194.80 Z" fill="#FFFFFF"/>
        </svg>
      );
    default:
      return null;
  }
};
const IconChevronRight = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const IconChevronLeft = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const IconClose = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconFlag = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;
const IconEdit = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>;

const IconBell = ({ trigger, size = 22 }) => {
  const on = useIconPlay(trigger);
  return <svg className={`ai${on ? " ai-bell" : ""}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
};
const IconBookmark = ({ trigger, size = 22 }) => {
  const on = useIconPlay(trigger);
  return <svg className={`ai${on ? " ai-bookmark" : ""}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
};
const IconUser = ({ trigger, size = 22 }) => {
  const on = useIconPlay(trigger);
  return <svg className={`ai${on ? " ai-user" : ""}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
};
const IconGlobe = ({ trigger, size = 20 }) => {
  const on = useIconPlay(trigger);
  return <svg className={`ai${on ? " ai-globe" : ""}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
};
const IconRefresh = ({ trigger, spinning = false, size = 22 }) => {
  const on = useIconPlay(trigger);
  const cls = spinning ? "ai-loader ai-spin" : on ? "ai-loader ai-refresh" : "ai-loader";
  return <svg className={`ai ${cls}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><g className="ai-refresh-g"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></g></svg>;
};
const IconContrast = ({ trigger, size = 20 }) => {
  const on = useIconPlay(trigger);
  return <svg className={`ai${on ? " ai-contrast" : ""}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><g className="ai-contrast-rot"><path className="ai-contrast-half" d="M12 18a6 6 0 0 0 0-12v12z" fill="currentColor" stroke="none"/></g></svg>;
};
const IconSearchAnim = ({ trigger, size = 22 }) => {
  const on = useIconPlay(trigger);
  return <svg className={`ai${on ? " ai-search" : ""}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle className="ai-search-lens" cx="11" cy="11" r="7"/><line className="ai-search-handle" x1="21" y1="21" x2="16.5" y2="16.5"/></svg>;
};
const IconClipboard = ({ trigger, size = 22 }) => {
  const on = useIconPlay(trigger);
  return <svg className={`ai${on ? " ai-clip" : ""}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4h6a1 1 0 0 1 1 1v0a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v0a1 1 0 0 1 1-1z"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/><line className="ai-clip-l1" x1="8.5" y1="11" x2="15.5" y2="11"/><line className="ai-clip-l2" x1="8.5" y1="15" x2="13.5" y2="15"/></svg>;
};

// Gold-gradient definitions for the Telegram Star (rendered once per shell).
const GoldDefs = () => (
  <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
    <defs>
      <linearGradient id="tgStarGold" x1="5" y1="2" x2="18" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#FFE7A0" />
        <stop offset="0.45" stopColor="#FFC93C" />
        <stop offset="1" stopColor="#F39A0E" />
      </linearGradient>
    </defs>
  </svg>
);

// The Telegram Star mark — a faceted gold star (no emoji).
// The Telegram Star — traced exactly from Telegram’s own Star emoji (orange
// outline + cream highlight + gold body with the signature crease). Inline SVG.
const TGStar = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="6 6 60 60" aria-hidden="true"
    style={{ display: "inline-block", verticalAlign: "-0.16em", flexShrink: 0, filter: "drop-shadow(0 1px 1.5px rgba(180,110,0,0.4))" }}>
    <path d="M37.47 8.99C35.31 7.9 32.69 8.77 31.61 10.93C31.61 10.93 25.2 23.69 25.2 23.69C25.04 24.01 24.73 24.23 24.38 24.27C24.38 24.27 11.68 25.91 11.68 25.91C10.48 26.06 9.38 26.68 8.62 27.62C6.99 29.64 7.3 32.6 9.31 34.24C9.31 34.24 14.27 38.29 14.27 38.29C16.36 39.99 19.05 40.74 21.71 40.36C21.71 40.36 32.22 38.85 32.22 38.85C32.22 38.85 23.98 43.06 23.98 43.06C20.89 44.64 18.77 47.62 18.28 51.06C18.28 51.06 17.4 57.18 17.4 57.18C17.27 58.11 17.42 59.05 17.85 59.89C18.98 62.12 21.72 63.01 23.95 61.87C23.95 61.87 34.9 56.25 34.9 56.25C35.26 56.06 35.69 56.07 36.05 56.27C36.05 56.27 46.62 62.04 46.62 62.04C47.51 62.53 48.54 62.73 49.55 62.6C52.22 62.26 54.1 59.81 53.77 57.15C53.77 57.15 52.11 43.82 52.11 43.82C52.09 43.69 52.14 43.55 52.23 43.46C52.23 43.46 62.24 33.59 62.24 33.59C62.97 32.86 63.44 31.91 63.56 30.89C63.85 28.4 62.09 26.14 59.6 25.84C59.6 25.84 46.94 24.32 46.94 24.32C46.31 24.25 45.75 23.85 45.46 23.27C45.46 23.27 39.42 10.96 39.42 10.96C39 10.11 38.31 9.42 37.47 8.99Z" fill="#E5880D" />
    <path d="M26.45 24.31C26.45 24.31 32.85 11.56 32.85 11.56C33.59 10.09 35.38 9.5 36.84 10.24C37.41 10.53 37.87 11 38.16 11.58C38.16 11.58 44.21 23.88 44.21 23.88C44.7 24.89 45.67 25.57 46.78 25.7C46.78 25.7 59.43 27.22 59.43 27.22C61.15 27.43 62.38 29 62.18 30.73C62.09 31.44 61.77 32.1 61.26 32.6C61.26 32.6 51.25 42.47 51.25 42.47C50.84 42.87 50.65 43.43 50.72 44C50.72 44 52.39 57.32 52.39 57.32C52.63 59.23 51.28 60.97 49.38 61.21C48.66 61.3 47.94 61.17 47.3 60.82C47.3 60.82 36.73 55.04 36.73 55.04C35.96 54.62 35.04 54.61 34.27 55.01C34.27 55.01 23.31 60.63 23.31 60.63C21.77 61.42 19.89 60.8 19.1 59.25C18.8 58.67 18.7 58.02 18.79 57.38C18.79 57.38 19.66 51.26 19.66 51.26C20.09 48.27 21.94 45.67 24.62 44.3C24.62 44.3 36.78 38.09 36.78 38.09C37.1 37.93 37.23 37.53 37.07 37.2C36.94 36.95 36.67 36.8 36.39 36.84C36.39 36.84 21.51 38.98 21.51 38.98C19.24 39.3 16.94 38.66 15.15 37.2C15.15 37.2 10.2 33.16 10.2 33.16C8.79 32.01 8.56 29.91 9.71 28.49C10.25 27.83 11.02 27.4 11.86 27.29C11.86 27.29 24.56 25.66 24.56 25.66C25.37 25.55 26.08 25.05 26.45 24.31Z" fill="#FCEFC4" />
    <path d="M34.1 12.18C34.49 11.4 35.44 11.09 36.21 11.48C36.51 11.63 36.76 11.89 36.91 12.2C36.91 12.2 42.96 24.5 42.96 24.5C43.66 25.93 45.03 26.9 46.61 27.09C46.61 27.09 59.27 28.61 59.27 28.61C60.22 28.72 60.9 29.59 60.79 30.56C60.74 30.96 60.56 31.33 60.28 31.61C60.28 31.61 50.27 41.48 50.27 41.48C49.56 42.18 49.22 43.17 49.34 44.17C49.34 44.17 51 57.5 51 57.5C51.14 58.65 50.33 59.69 49.21 59.83C48.78 59.88 48.34 59.8 47.96 59.59C47.96 59.59 37.39 53.81 37.39 53.81C36.22 53.17 34.81 53.16 33.62 53.77C33.62 53.77 22.67 59.39 22.67 59.39C21.82 59.82 20.78 59.48 20.34 58.62C20.18 58.3 20.12 57.93 20.17 57.57C20.17 57.57 21.04 51.46 21.04 51.46C21.4 48.92 22.98 46.71 25.25 45.55C25.25 45.55 37.41 39.34 37.41 39.34C38.43 38.82 38.83 37.58 38.32 36.57C37.92 35.78 37.07 35.34 36.19 35.46C36.19 35.46 21.31 37.59 21.31 37.59C19.42 37.86 17.51 37.33 16.03 36.12C16.03 36.12 11.08 32.07 11.08 32.07C10.26 31.4 10.13 30.19 10.8 29.37C11.11 28.99 11.55 28.74 12.03 28.68C12.03 28.68 24.73 27.04 24.73 27.04C26.01 26.88 27.12 26.09 27.7 24.94Z" fill="#FFC83E" />
  </svg>
);

// The GRAM mark — the official Telegram GRAM gem, traced exactly from Telegram’s own
// emoji (blue diamond + white sparkle). Inline SVG so it stays crisp at any size, no image load.
const GramMark = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 4 101 89" aria-hidden="true"
    style={{ display: "inline-block", verticalAlign: "-0.18em", flexShrink: 0 }}>
    <path d="M66.71 9C66.71 9 34.57 9 34.57 9C30.29 9 28.14 9 26.21 9.6C24.49 10.13 22.9 11 21.53 12.15C19.98 13.45 18.82 15.25 16.51 18.85C16.51 18.85 6.29 34.73 6.29 34.73C4.76 37.11 3.99 38.3 3.79 39.55C3.6 40.66 3.73 41.79 4.14 42.83C4.61 44.01 5.61 45 7.61 47C7.61 47 45.58 84.94 45.58 84.94C47.35 86.71 48.24 87.6 49.26 87.93C50.16 88.22 51.12 88.22 52.02 87.93C53.04 87.6 53.93 86.71 55.7 84.94C55.7 84.94 93.67 47 93.67 47C95.67 45 96.67 44.01 97.14 42.83C97.56 41.79 97.68 40.66 97.49 39.55C97.29 38.3 96.52 37.11 94.99 34.73C94.99 34.73 84.77 18.85 84.77 18.85C82.46 15.25 81.3 13.45 79.75 12.15C78.38 11 76.79 10.13 75.07 9.6C73.14 9 70.99 9 66.71 9Z" fill="#30A1F5" />
    <path d="M60.63 21.53C61.15 20.12 63.15 20.12 63.67 21.53C63.67 21.53 67.28 31.28 67.28 31.28C67.5 31.86 67.96 32.32 68.54 32.54C68.54 32.54 78.3 36.15 78.3 36.15C79.71 36.67 79.71 38.66 78.3 39.18C78.3 39.18 68.54 42.79 68.54 42.79C67.96 43.01 67.5 43.47 67.28 44.05C67.28 44.05 63.67 53.8 63.67 53.8C63.15 55.21 61.15 55.21 60.63 53.8C60.63 53.8 57.02 44.05 57.02 44.05C56.8 43.47 56.34 43.01 55.75 42.79C55.75 42.79 46 39.18 46 39.18C44.59 38.66 44.59 36.67 46 36.15C46 36.15 55.75 32.54 55.75 32.54C56.34 32.32 56.8 31.86 57.02 31.28C57.02 31.28 60.63 21.53 60.63 21.53Z" fill="#fff" />
  </svg>
);

// USDT (Tether) mark — exact uploaded Tether logo.
const UsdtMark = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true"
    style={{ display: "inline-block", verticalAlign: "-0.18em", flexShrink: 0 }}>
    <polygon fill="#4db6ac" points="24,44 2,22.5 10,5 38,5 46,22.5" />
    <path fill="#fff" d="M38,22c0-1.436-4.711-2.635-11-2.929V16h8v-6H13v6h8v3.071C14.711,19.365,10,20.564,10,22 s4.711,2.635,11,2.929V36h6V24.929C33.289,24.635,38,23.436,38,22z M24,24c-6.627,0-12-1.007-12-2.25c0-1.048,3.827-1.926,9-2.176 v3.346c0.96,0.06,1.96,0.08,3,0.08s2.04-0.02,3-0.08v-3.346c5.173,0.25,9,1.128,9,2.176C36,22.993,30.627,24,24,24z" />
  </svg>
);

// Price with the right currency mark + compact number. In the detail view we
// pass `label` to show the currency as a word (Stars / GRAM / USDT) instead of a mark.
const PriceTag = ({ item, size = 16, exact = false, label = false }) => {
  const cur = item?.currency || "GRAM";
  const n = Number(item?.price);
  const txt = exact && Number.isFinite(n) ? n.toLocaleString("en-US") : compactNum(item?.price);
  if (label) {
    const word = cur === "Stars" ? "Stars" : cur === "USDT" ? "USDT" : "GRAM";
    return <span className="price-tag">{txt} <span className="cur-word">{word}</span></span>;
  }
  if (cur === "Stars") return <span className="price-tag"><TGStar size={size} />{txt}</span>;
  if (cur === "USDT") return <span className="price-tag">{txt} <UsdtMark size={size} /></span>;
  return <span className="price-tag">{txt} <GramMark size={size} /></span>;
};

const IconShare = ({ size = 19 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>;

const IconMinimize = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>;
const IconExpand = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>;
const IconArrowUp = ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V6M6 12l6-6 6 6"/></svg>;
const IconArrowDown = ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v13M6 12l6 6 6-6"/></svg>;
const IconGiftBox = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8"/><path d="M2 8h20v4H2z"/><path d="M12 8v13"/><path d="M12 8S10.5 3.5 7.5 4.2C5.7 4.6 5.6 7 7.2 7.6 9 8.2 12 8 12 8z"/><path d="M12 8s1.5-4.5 4.5-3.8C18.3 4.6 18.4 7 16.8 7.6 15 8.2 12 8 12 8z"/></svg>;
const IconHeart = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const IconXLogo = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/></svg>;
const IconInfo = ({ size = 15 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>;
const IconBack = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const IconCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconLock = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
const IconCopy = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const IconTrash = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;

// ─── LOTTIE GIFT (loads lottie-web from CDN on demand; falls back to static jpg) ─
let _lottiePromise = null;
const _animCache = {};   // cache fetched animation JSON by src (avoids refetch)

// Lottie instantiation (fetch JSON + parse + build SVG) is heavy and runs on
// the main thread. During a fast scroll fling, many cards become "visible" at
// once; without a gate they'd all call loadAnimation simultaneously and jank
// the scroll. This tiny FIFO gate lets only a few build concurrently — the
// rest wait their turn (cards still show their poster image meanwhile, so
// nothing looks blank).
const _LOTTIE_MAX_CONCURRENT = 4;
let _lottieActive = 0;
const _lottieQueue = [];
function _lottieGateAcquire() {
  return new Promise((resolve) => {
    if (_lottieActive < _LOTTIE_MAX_CONCURRENT) { _lottieActive++; resolve(); }
    else _lottieQueue.push(resolve);
  });
}
function _lottieGateRelease() {
  _lottieActive = Math.max(0, _lottieActive - 1);
  const next = _lottieQueue.shift();
  if (next) { _lottieActive++; next(); }
}

// Every playing animation registers here so a single global listener can pause
// them all when Telegram backgrounds the app (battery + no catch-up jank on
// resume) and resume them the moment it's visible again.
const _liveAnims = new Set();
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    const hidden = document.hidden;
    _liveAnims.forEach((a) => { try { if (hidden) a.pause(); else a.play(); } catch { /* noop */ } });
  });
}

// Warm the lottie-web library the moment the app boots, so the splash's
// animations don't wait on the CDN round-trip.
if (typeof window !== "undefined") {
  setTimeout(() => { try { loadLottie(); } catch { /* noop */ } }, 0);
}
function loadLottie() {
  if (typeof window === "undefined") return Promise.reject(new Error("no-window"));
  if (window.lottie) return Promise.resolve(window.lottie);
  if (_lottiePromise) return _lottiePromise;
  _lottiePromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie_light.min.js";
    s.async = true;
    s.onload = () => (window.lottie ? resolve(window.lottie) : reject(new Error("lottie-missing")));
    s.onerror = () => reject(new Error("lottie-cdn-failed"));
    document.head.appendChild(s);
  });
  return _lottiePromise;
}

// Sits a comfortable distance below the bottom of the currently-rendered
// chunk. Its huge rootMargin means it fires while it's still far off-screen,
// so the next chunk is already mounted by the time the user actually scrolls
// there — content waits for the user, not the other way around.
function RevealSentinel({ onReveal }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { onReveal(); return; }
    const io = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) onReveal(); },
      { rootMargin: "2600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div ref={ref} style={{ height: 1 }} aria-hidden="true" />;
}

// Shimmering placeholder cards whose structure mirrors the REAL result card
// exactly, so the layout doesn't shift at all when content arrives:
//   ① hero square (same dimensions as the LottieGift)
//   ② name line (full-width-ish)
//   ③④ two meta rows (market + backdrop, shorter)
//   ⑤ foot: price stub left, buy-button stub right
// Clean line/area earnings graph -- smooth curve, no bars, no candle-like
// rectangles. Colored green when the period trended up overall, red when
// down, matching a typical portfolio value chart rather than a trading chart.
function AffEarningsChart({ series }) {
  const data = (series || []).map((d) => d.v || 0);
  const [hover, setHover] = React.useState(null);
  if (!data.length) return null;
  const W = 200, H = 80, pad = 8;
  const maxV = Math.max(1, ...data);
  const stepX = data.length > 1 ? (W - pad * 2) / (data.length - 1) : 0;
  const yp = (v) => H - pad - (v / maxV) * (H - pad * 2);
  const xp = (i) => pad + i * stepX;
  const pts = data.map((v, i) => [xp(i), yp(v)]);
  let linePath = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    linePath += ` Q ${x0} ${y0} ${mx} ${(y0 + y1) / 2} Q ${x1} ${y1} ${x1} ${y1}`;
  }
  const fillPath = `${linePath} L ${pts[pts.length - 1][0]} ${H} L ${pts[0][0]} ${H} Z`;
  const trendUp = (data[data.length - 1] || 0) >= (data[0] || 0);
  const tone = trendUp ? "#30d158" : "#ff453a";
  const STAR = "\u2605";
  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(cx * (data.length - 1)))));
  };
  // Only show the floating readout for a day that actually earned something —
  // a "0 [star]" bubble floating over empty chart is just noise, not information.
  const showTip = hover !== null && data[hover] > 0;
  return (
    <div style={{ position: "relative", userSelect: "none" }}
      onMouseMove={onMove} onTouchMove={onMove} onMouseLeave={() => setHover(null)} onTouchEnd={() => setHover(null)}>
      {showTip && (
        <div style={{ position: "absolute", top: 0, left: `${(hover / (data.length - 1 || 1)) * 100}%`, transform: "translateX(-50%)",
          background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8,
          fontSize: 11, fontWeight: 800, padding: "3px 8px", color: "var(--text-primary)", whiteSpace: "nowrap", zIndex: 2, pointerEvents: "none" }}>
          {data[hover].toLocaleString()} {STAR}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 140, display: "block" }}>
        <defs>
          <linearGradient id="affAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tone} stopOpacity="0.30" />
            <stop offset="100%" stopColor={tone} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((v) => (
          <line key={v} x1={0} y1={H * v} x2={W} y2={H * v}
            stroke="rgba(255,255,255,0.07)" strokeWidth="0.6" strokeDasharray="3 3" />
        ))}
        <path d={fillPath} fill="url(#affAreaGrad)" />
        <path d={linePath} fill="none" stroke={tone} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        {hover !== null && (
          <>
            <line x1={xp(hover)} y1={0} x2={xp(hover)} y2={H} stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />
            <circle cx={xp(hover)} cy={yp(data[hover])} r="3" fill={tone} stroke="var(--bg-card)" strokeWidth="1.5" />
          </>
        )}
        {hover === null && <circle cx={xp(data.length - 1)} cy={yp(data[data.length - 1])} r="2.5" fill={tone} />}
      </svg>
    </div>
  );
}

function SkeletonCard() {  return (
    <div className="skel-card">
      <div className="skel-hero" />
      <div className="skel-name" />
      <div className="skel-meta" />
      <div className="skel-meta skel-meta-b" />
      <div className="skel-foot">
        <div className="skel-price" />
        <div className="skel-btn" />
      </div>
    </div>
  );
}
function SkeletonCards({ n = 6, desktop = false }) {
  return (
    <div className={desktop ? "results-grid desktop" : "results-grid"} aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

function LottieGift({ src, fallbackSrc, poster, fallbackPoster, backdropColor, symbolPattern, size = 96, radius = 18, eager = false }) {
  const wrapRef = useRef(null);
  const animRef = useRef(null);
  const loadedRef = useRef(false);   // true once an animation has actually been built for the current effective src
  const [visible, setVisible] = useState(eager);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(!src);
  const [posterLoaded, setPosterLoaded] = useState(false);
  const [posterSrc, setPosterSrc] = useState(poster);
  const [posterFailed, setPosterFailed] = useState(false);
  // fallbackPoster may be a single URL or an ARRAY of candidates tried in
  // order (e.g. [our exact Telegram model image, the generic collection
  // preview]) — normalized here so callers can pass either shape.
  const fallbackChain = Array.isArray(fallbackPoster) ? fallbackPoster.filter(Boolean) : [fallbackPoster].filter(Boolean);
  const fallbackIdxRef = useRef(0);
  // Animation fallback chain: try `src` (Fragment's guess) first; if that
  // fails to fetch/parse, fall back ONCE to `fallbackSrc` (our Telegram-
  // sourced version). Fragment stays preferred — once it's properly crawled
  // and composited a collection, that's a better render than our bare model-
  // only one, and this means results switch over to Fragment automatically
  // the moment it catches up, with no extra logic needed.
  const [animSrc, setAnimSrc] = useState(src);
  const triedAnimFallbackRef = useRef(false);

  // If the primary poster prop changes (new item), reset the fallback chain.
  useEffect(() => {
    setPosterSrc(poster); setPosterLoaded(false); setPosterFailed(false); fallbackIdxRef.current = 0;
  }, [poster]);

  // Same reset, for the animation source, whenever the underlying gift's
  // PRIMARY src actually changes (not on a mere fallback swap).
  useEffect(() => {
    setAnimSrc(src); triedAnimFallbackRef.current = false; setFailed(!src);
  }, [src]);

  // Lazy: only start building the animation once the card first comes on (or
  // near) screen — this is what keeps a long results list smooth to load.
  useEffect(() => {
    if (eager) { setVisible(true); return; }
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => setVisible(e.isIntersecting)),
      { rootMargin: "800px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager]);

  // Reset the "already built" flag whenever the EFFECTIVE animation source
  // changes (a different gift, OR a fallback swap) — NOT when visibility
  // merely toggles.
  useEffect(() => { loadedRef.current = false; setReady(false); }, [animSrc]);

  // Build the animation the first time this card is visible. On every LATER
  // visibility change we just pause/resume the SAME instance — no re-fetch,
  // no re-parse, no concurrency-gate wait. Previously this whole thing was
  // torn down and rebuilt from scratch on every single scroll in/out, which
  // is exactly what caused already-loaded cards to flash blank again on
  // scroll-back-up, and — under a fast scroll re-triggering many cards at
  // once — genuinely visible stalling.
  useEffect(() => {
    if (!animSrc || !visible) return;
    if (loadedRef.current) {
      // Already built for this src — just resume it, instantly, no reload.
      try { animRef.current?.play(); } catch { /* noop */ }
      return;
    }
    let cancelled = false;
    let gated = false;
    (async () => {
      try {
        const lottie = await loadLottie();
        let data = _animCache[animSrc];
        if (!data) {
          const res = await fetch(animSrc);
          if (!res.ok) throw new Error("no anim");
          data = await res.json();
          if (Object.keys(_animCache).length < 80) _animCache[animSrc] = data;
        }
        if (cancelled || !wrapRef.current) return;
        // Very brief settle: if the user is mid-fling this card may unmount
        // before claiming a build slot, keeping the gate free for cards at rest.
        await new Promise((r) => setTimeout(r, 18));
        if (cancelled || !wrapRef.current) return;
        await _lottieGateAcquire();
        gated = true;
        if (cancelled || !wrapRef.current) { _lottieGateRelease(); gated = false; return; }
        const container = wrapRef.current.querySelector(".lg-anim");
        if (!container) { _lottieGateRelease(); gated = false; return; }
        animRef.current = lottie.loadAnimation({
          container, renderer: "svg", loop: true, autoplay: true, animationData: data,
          rendererSettings: { progressiveLoad: true, hideOnTransparent: true, viewBoxOnly: true },
        });
        try { animRef.current.setSubframe(false); } catch { /* noop */ }
        _liveAnims.add(animRef.current);
        if (document.hidden) { try { animRef.current.pause(); } catch { /* noop */ } }
        loadedRef.current = true;
        setReady(true);
        _lottieGateRelease(); gated = false;
      } catch {
        if (gated) { _lottieGateRelease(); gated = false; }
        if (cancelled) return;
        // Fragment's guess failed — try our Telegram-sourced fallback ONCE
        // before giving up entirely.
        if (!triedAnimFallbackRef.current && fallbackSrc && fallbackSrc !== animSrc) {
          triedAnimFallbackRef.current = true;
          setAnimSrc(fallbackSrc);
        } else {
          setFailed(true);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (gated) { _lottieGateRelease(); gated = false; }
      // NOTE: deliberately NOT destroying animRef here — this cleanup also
      // runs on ordinary visibility toggles (dependency includes `visible`),
      // and destroying on every scroll-away is exactly the bug this rewrite
      // removes. Real teardown happens only in the effect below, keyed to
      // `src` and unmount alone.
    };
  }, [animSrc, visible]);

  // Cheap pause/resume of an EXISTING instance as the card scrolls off/back
  // on screen — no rebuild, so nothing flashes blank on scroll-back-up.
  useEffect(() => {
    if (!animRef.current) return;
    try { visible ? animRef.current.play() : animRef.current.pause(); } catch { /* noop */ }
  }, [visible]);

  // True teardown: only on unmount, or when the src actually changes to a
  // different gift (not on a mere scroll-driven visibility toggle).
  useEffect(() => {
    return () => {
      if (animRef.current) {
        _liveAnims.delete(animRef.current);
        try { animRef.current.destroy(); } catch { /* noop */ }
        animRef.current = null;
      }
    };
  }, [animSrc]);

  // Poster (static .jpg) paints fast and stays UNDERNEATH the Lottie as a
  // permanent backing layer, so a card is never blank — even mid fast-scroll
  // when the animation is still parsing/instantiating. The Lottie simply fades
  // in on top once ready. eager loading + sync decode get the poster on screen
  // as quickly as possible.
  return (
    <div ref={wrapRef} style={{ width: size, height: size, borderRadius: radius, overflow: "hidden", background: backdropColor || "var(--bg-input)", position: "relative" }}>
      {/* Shimmer stays visible until the poster actually paints — same sweep
          language as SkeletonCards, so a still-loading hero reads as "loading",
          never as a flat dead box. */}
      {!posterLoaded && !posterFailed && <div className="lg-shimmer" aria-hidden="true" />}
      {symbolPattern && (
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${symbolPattern})`, backgroundSize: "14%",
          backgroundRepeat: "repeat", opacity: ready ? 0.14 : 0,
          transition: "opacity .3s",
        }} />
      )}
      {posterSrc && !posterFailed && (
        <img src={posterSrc} alt="" loading="eager" decoding="async"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: (posterLoaded && !ready) ? 1 : 0, transition: "opacity .3s" }}
          onLoad={() => setPosterLoaded(true)}
          onError={() => {
            // Fragment's CDN hasn't crawled this collection yet (common for
            // anything Telegram released in the last day or two), or this
            // specific image 404s for some other reason — walk down the
            // fallback chain (our exact Telegram model image, then the
            // generic collection preview) before giving up entirely.
            const next = fallbackChain[fallbackIdxRef.current];
            if (next && next !== posterSrc) {
              fallbackIdxRef.current += 1;
              setPosterSrc(next); setPosterLoaded(false);
            } else {
              setPosterFailed(true); setPosterLoaded(true);
            }
          }} />
      )}
      {posterFailed && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
          <IconGiftBox />
        </div>
      )}
      {!failed && !posterFailed && <div className="lg-anim" style={{ position: "absolute", inset: 0, opacity: ready ? 1 : 0, transition: "opacity .3s", transform: "scale(1.12)" }} />}
    </div>
  );
}


// ─── LEGAL / FAQ CONTENT (English by design; legal text stays canonical) ─────
// Per-marketplace "coming soon" detail text shown via the ⓘ on greyed-out
// chips. Plain straight apostrophes only — no \u escapes — to avoid any risk
// of a literal "\u2019" rendering in the UI.
const MARKET_SOON_TEXT = {
  GetGems: [
    "This marketplace is still being worked on. We cannot guarantee it will be successfully integrated.",
    "Using MarketApp would give you available listings from GetGems.",
  ],
  Portals: [
    "This marketplace is still being worked on. We cannot guarantee it will be successfully integrated.",
    "Using MarketApp would give you available listings from Portals.",
  ],
  Tonnel: [
    "This marketplace is still being worked on. We cannot guarantee it will be successfully integrated.",
    "Using MarketApp would give you available listings from Tonnel.",
  ],
  MRKT: [
    "This marketplace is still being worked on. We cannot guarantee it will be successfully integrated.",
  ],
};

const LEGAL = {
  faq: [
    ["What is GiftTrove?", "GiftTrove is a Telegram Mini App for scouting, comparing, and tracking collectible Telegram gifts across multiple marketplaces. We display listings — we never buy, sell, hold, or custody any gifts or funds."],
    ["Is it free?", "Scouting and browsing are fully free. Scout+ and Scout Pro memberships unlock advanced filters and features. Any purchase you make happens directly on the marketplace, not through us."],
    ["Does GiftTrove earn anything from purchases?", "No. Tapping through to a marketplace is a plain redirect. GiftTrove takes zero commission and receives nothing from your purchases — what you see is what goes to the marketplace."],
    ["What marketplaces are supported?", "Currently Telegram (native listings), Fragment, and MarketApp. GetGems, Portals, MRKT, and Tonnel are planned as their APIs become available."],
    ["Are prices accurate?", "Prices reflect live marketplace listings at the time of your search. They are informational only, can change before you complete a purchase, and are not advice or valuations."],
    ["Why do some gifts show no results?", "No active resale listings exist for that collection at that moment. Listings update in near real-time — check back soon."],
    ["What is the Promote feature?", "Promote lets you pin a specific gift listing to the top of matching scout results for a fixed number of days. The bot auto-fetches the listing price, model, and attributes. If the gift is sold or de-listed, it is automatically removed and you are notified."],
    ["What is the Affiliate Program?", "Scout Pro members earn a percentage of each subscription payment from members who sign up through their referral link. Earnings are tracked as Stars and withdrawn in GRAM to your TON wallet."],
    ["Is my data safe?", "We store only an anonymised identifier, your saved gifts, and your recent searches. No name, username, phone number, or payment info is collected. See the Privacy Policy for the full picture."],
    ["How do I delete my data?", "Tap Clear my data in the footer of the Profile tab. Your data is deleted immediately."],
    ["How do I get support?", "Use the Support link in the Community section of the Profile tab."],
  ],
  terms: [
    ["Independence", "GiftTrove is an independent third-party tool. It is not affiliated with, endorsed by, or connected to Telegram, the TON Foundation, Fragment, GetGems, MarketApp, or any other marketplace. All trademarks, gift artwork, and collectible designs belong to their respective owners."],
    ["Informational only", "Everything shown in GiftTrove — prices, rarity, supply, attributes — is informational only and not financial, investment, or trading advice. You bear full responsibility for any purchase or trading decision."],
    ["Data accuracy", "Listing data is fetched live from third-party sources. We make reasonable efforts to display accurate data but cannot guarantee completeness, accuracy, or timeliness, and accept no liability for decisions based on displayed data."],
    ["Third-party purchases", "Purchases made after tapping to a marketplace are entirely between you and that marketplace. GiftTrove is not a party to those transactions, takes no cut, holds no funds, and bears no liability for failed, disputed, or fraudulent transactions."],
    ["Promoted listings", "Promote placements are paid by users and appear at the top of matching scout results as a direct redirect to the listed gift. GiftTrove takes no commission on promoted gift sales. Promotion fees are non-refundable. GiftTrove reserves the right to remove any promotion at any time. A promoted gift that is de-listed or sold will automatically stop displaying."],
    ["Affiliate program", "Scout Pro members may earn a percentage of referred subscription payments. Referral rewards are discretionary and subject to change. Fake, automated, or self-referrals forfeit all earnings and may result in removal from the program."],
    ["Subscriptions", "Scout+ and Scout Pro are billed monthly in Telegram Stars and renew automatically. You can cancel at any time through Telegram. All Star purchases are non-refundable per Telegram's policy."],
    ["No custody", "GiftTrove never holds, transfers, or controls your gifts, GRAM, TON, Stars, or any digital assets."],
    ["Acceptable use", "You agree not to scrape data, disrupt the service, or use GiftTrove for any unlawful purpose."],
    ["Availability", "GiftTrove is provided as-is. We may modify, suspend, or discontinue any part of the service at any time without notice."],
    ["Acceptance", "By using GiftTrove you agree to these Terms and the Privacy Policy. If you do not agree, please stop using the app."],
  ],
  privacy: [
    ["What we collect", "An anonymised identifier derived from your Telegram ID (for visit counting, saved-gifts sync, and referral tracking), your saved gift list, your recent search terms, and aggregate usage counts. These are never linked to identifiable individuals."],
    ["What we never collect", "Your name, username, phone number, message content, payment information, location, or any data beyond the technical launch parameters Telegram provides to every Mini App."],
    ["How it's used", "Your saved gifts and recent searches are synced so they follow you across devices. Aggregate, anonymised analytics are used to improve the product. Referral records are used to attribute earned commissions."],
    ["Third parties", "Data is processed on reputable hosting and database infrastructure under industry-standard protections. Marketplace links open third-party platforms governed by their own privacy policies."],
    ["Your rights", "Tap Clear my data in the Profile footer to delete your synced data instantly. You can also contact Support for anything else."],
    ["Bot messages", "If you have interacted with the GiftTrove bot, we may send you promotion status updates (sold, expired, unlisted) and occasional product announcements. Clearing your data also opts you out of further messages."],
    ["Changes", "We may update this policy as the product evolves. Continued use after an update constitutes acceptance."],
  ],
};

// Detail-text translations, index-aligned with the English arrays in LEGAL above.
// Titles/questions stay English; only the body is localized. Missing entries
// fall back to English at render time.
const LEGAL_TR = {
  faq: {
    ru: [
      "GiftTrove — это Telegram Mini App для поиска, сравнения и отслеживания коллекционных подарков Telegram на разных маркетплейсах. Мы показываем объявления — мы никогда не покупаем, не продаём, не храним подарки или средства.",
      "Поиск и просмотр полностью бесплатны. Подписки Scout+ и Scout Pro открывают расширенные фильтры и функции. Любая покупка совершается напрямую на маркетплейсе, а не через нас.",
      "Нет. Переход на маркетплейс — это обычное перенаправление. GiftTrove не берёт комиссию и ничего не получает с ваших покупок — вся сумма идёт маркетплейсу.",
      "Сейчас это Telegram (нативные объявления), Fragment и MarketApp. GetGems, Portals, MRKT и Tonnel запланированы по мере появления их API.",
      "Цены отражают актуальные объявления маркетплейсов на момент поиска. Они носят справочный характер, могут измениться до завершения покупки и не являются советом или оценкой.",
      "В этот момент нет активных объявлений о перепродаже для этой коллекции. Объявления обновляются почти в реальном времени — загляните позже.",
      "Promote позволяет закрепить конкретное объявление вверху подходящих результатов поиска на определённое число дней. Бот автоматически подтягивает цену, модель и атрибуты. Если подарок продан или снят с продажи, он автоматически удаляется, и вы получаете уведомление.",
      "Участники Scout Pro получают процент с каждого платежа по подписке от пользователей, зарегистрировавшихся по их реферальной ссылке. Доход учитывается в Stars и выводится в GRAM на ваш TON-кошелёк.",
      "Мы храним только анонимный идентификатор, ваши сохранённые подарки и недавние поиски. Имя, имя пользователя, номер телефона и платёжные данные не собираются. Полную информацию смотрите в Политике конфиденциальности.",
      "Нажмите «Очистить мои данные» внизу вкладки «Профиль». Ваши данные удаляются немедленно.",
      "Воспользуйтесь ссылкой «Поддержка» в разделе «Сообщество» вкладки «Профиль».",
    ],
    zh: [
      "GiftTrove 是一款 Telegram 小程序，用于在多个市场上侦测、比较和追踪可收藏的 Telegram 礼物。我们仅展示挂单——绝不买卖、持有或托管任何礼物或资金。",
      "侦测和浏览完全免费。Scout+ 和 Scout Pro 会员可解锁高级筛选和功能。您的任何购买都直接在市场完成，而非通过我们。",
      "不会。跳转到市场只是普通的重定向。GiftTrove 不收取任何佣金，也不会从您的购买中获得任何收益——您所付的全部归市场所有。",
      "目前支持 Telegram（原生挂单）、Fragment 和 MarketApp。GetGems、Portals、MRKT 和 Tonnel 将在其 API 可用后陆续接入。",
      "价格反映搜索时各市场的实时挂单。仅供参考，可能在您完成购买前发生变化，且不构成建议或估值。",
      "该系列此刻没有在售的转售挂单。挂单近乎实时更新——请稍后再查看。",
      "推广功能可将某个礼物挂单在匹配的侦测结果顶部置顶固定天数。机器人会自动获取挂单价格、型号和属性。若礼物售出或下架，将自动移除并通知您。",
      "Scout Pro 会员可从通过其推荐链接注册的会员的每笔订阅付款中赚取一定比例。收益以 Stars 计算，并以 GRAM 提现至您的 TON 钱包。",
      "我们仅存储一个匿名标识符、您保存的礼物和最近的搜索记录。不收集姓名、用户名、电话号码或支付信息。完整信息请参阅隐私政策。",
      "点击「个人」标签页底部的「清除我的数据」。您的数据将立即删除。",
      "使用「个人」标签页「社区」部分中的「支持」链接。",
    ],
  },
  terms: {
    ru: [
      "GiftTrove — независимый сторонний инструмент. Он не связан с Telegram, TON Foundation, Fragment, GetGems, MarketApp или любым другим маркетплейсом и не одобрен ими. Все товарные знаки, изображения подарков и дизайны коллекционных предметов принадлежат их владельцам.",
      "Вся информация в GiftTrove — цены, редкость, предложение, атрибуты — носит исключительно справочный характер и не является финансовым, инвестиционным или торговым советом. Вы несёте полную ответственность за любые решения о покупке или торговле.",
      "Данные об объявлениях загружаются в реальном времени из сторонних источников. Мы прилагаем разумные усилия для отображения точных данных, но не можем гарантировать их полноту, точность или своевременность и не несём ответственности за решения, принятые на их основе.",
      "Покупки, совершённые после перехода на маркетплейс, полностью являются делом между вами и этим маркетплейсом. GiftTrove не участвует в этих сделках, не берёт долю, не хранит средства и не несёт ответственности за неудавшиеся, спорные или мошеннические транзакции.",
      "Места для продвижения оплачиваются пользователями и отображаются вверху подходящих результатов поиска как прямое перенаправление к объявлению. GiftTrove не берёт комиссию с продаж продвигаемых подарков. Плата за продвижение не возвращается. GiftTrove оставляет за собой право удалить любое продвижение в любое время. Продвигаемый подарок, снятый с продажи или проданный, автоматически перестаёт отображаться.",
      "Участники Scout Pro могут получать процент с платежей по приглашённым подпискам. Реферальные вознаграждения предоставляются по нашему усмотрению и могут изменяться. Фальшивые, автоматизированные или само-рефералы лишают всех начислений и могут привести к исключению из программы.",
      "Scout+ и Scout Pro оплачиваются ежемесячно в Telegram Stars и продлеваются автоматически. Вы можете отменить подписку в любое время через Telegram. Все покупки за Stars не возвращаются согласно политике Telegram.",
      "GiftTrove никогда не хранит, не переводит и не контролирует ваши подарки, GRAM, TON, Stars или любые цифровые активы.",
      "Вы соглашаетесь не собирать данные автоматически, не нарушать работу сервиса и не использовать GiftTrove в незаконных целях.",
      "GiftTrove предоставляется «как есть». Мы можем изменять, приостанавливать или прекращать работу любой части сервиса в любое время без уведомления.",
      "Используя GiftTrove, вы соглашаетесь с настоящими Условиями и Политикой конфиденциальности. Если вы не согласны, пожалуйста, прекратите использование приложения.",
    ],
    zh: [
      "GiftTrove 是独立的第三方工具，与 Telegram、TON 基金会、Fragment、GetGems、MarketApp 或任何其他市场均无关联，也未获其认可。所有商标、礼物图案和收藏品设计均归各自所有者所有。",
      "GiftTrove 中显示的一切——价格、稀有度、供应量、属性——均仅供参考，不构成任何财务、投资或交易建议。您需对任何购买或交易决定承担全部责任。",
      "挂单数据实时取自第三方来源。我们尽合理努力展示准确数据，但无法保证其完整性、准确性或及时性，且对基于所示数据作出的决定不承担任何责任。",
      "跳转到市场后进行的购买完全是您与该市场之间的事务。GiftTrove 不是这些交易的一方，不抽成、不持有资金，且对失败、争议或欺诈交易不承担任何责任。",
      "推广位由用户付费，显示在匹配的侦测结果顶部，作为指向该挂单礼物的直接跳转。GiftTrove 不从推广礼物的销售中抽取佣金。推广费用不可退还。GiftTrove 保留随时移除任何推广的权利。已下架或售出的推广礼物将自动停止展示。",
      "Scout Pro 会员可从推荐的订阅付款中赚取一定比例。推荐奖励由我方酌情决定并可能变更。虚假、自动化或自我推荐将丧失所有收益，并可能导致被移出该计划。",
      "Scout+ 和 Scout Pro 以 Telegram Stars 按月计费并自动续订。您可随时通过 Telegram 取消。根据 Telegram 政策，所有 Stars 购买均不可退款。",
      "GiftTrove 绝不持有、转移或控制您的礼物、GRAM、TON、Stars 或任何数字资产。",
      "您同意不抓取数据、不干扰服务，也不将 GiftTrove 用于任何非法目的。",
      "GiftTrove 按「现状」提供。我们可随时修改、暂停或终止服务的任何部分，恕不另行通知。",
      "使用 GiftTrove 即表示您同意本条款和隐私政策。若您不同意，请停止使用本应用。",
    ],
  },
  privacy: {
    ru: [
      "Анонимный идентификатор, полученный из вашего Telegram ID (для подсчёта визитов, синхронизации сохранённых подарков и учёта рефералов), список сохранённых подарков, недавние поисковые запросы и агрегированная статистика использования. Они никогда не связываются с конкретными людьми.",
      "Ваше имя, имя пользователя, номер телефона, содержимое сообщений, платёжные данные, местоположение или любые данные сверх технических параметров запуска, которые Telegram предоставляет каждому Mini App.",
      "Ваши сохранённые подарки и недавние поиски синхронизируются, чтобы следовать за вами на всех устройствах. Агрегированная анонимная аналитика используется для улучшения продукта. Реферальные записи используются для начисления заработанных комиссий.",
      "Данные обрабатываются на надёжной хостинговой и серверной инфраструктуре с защитой по отраслевым стандартам. Ссылки на маркетплейсы открывают сторонние платформы, регулируемые их собственными политиками конфиденциальности.",
      "Нажмите «Очистить мои данные» внизу вкладки «Профиль», чтобы мгновенно удалить синхронизированные данные. По любым другим вопросам обращайтесь в поддержку.",
      "Если вы взаимодействовали с ботом GiftTrove, мы можем отправлять вам обновления статуса продвижения (продано, истекло, снято с продажи) и редкие анонсы продукта. Очистка данных также отключает дальнейшие сообщения.",
      "Мы можем обновлять эту политику по мере развития продукта. Продолжение использования после обновления означает согласие.",
    ],
    zh: [
      "由您的 Telegram ID 派生的匿名标识符（用于访问计数、保存礼物同步和推荐追踪）、您保存的礼物列表、最近的搜索词以及汇总的使用统计。这些数据绝不会与可识别的个人关联。",
      "您的姓名、用户名、电话号码、消息内容、支付信息、位置，或除 Telegram 向每个小程序提供的技术启动参数之外的任何数据。",
      "您保存的礼物和最近的搜索会同步，以便在各设备间随您使用。汇总的匿名分析用于改进产品。推荐记录用于归集所赚取的佣金。",
      "数据在符合行业标准防护的可靠托管与数据库基础设施上处理。市场链接会打开受其各自隐私政策约束的第三方平台。",
      "点击「个人」页底部的「清除我的数据」即可立即删除已同步的数据。其他事项也可联系支持。",
      "若您曾与 GiftTrove 机器人互动，我们可能向您发送推广状态更新（已售出、已过期、已下架）以及偶尔的产品公告。清除数据也会让您退订后续消息。",
      "我们可能随产品发展更新本政策。更新后继续使用即视为接受。",
    ],
  },
};

// Per-marketplace "coming soon" detail, index-aligned with MARKET_SOON_TEXT.
const MARKET_SOON_TR = {
  GetGems: {
    ru: ["Этот маркетплейс ещё в разработке. Мы не можем гарантировать успешную интеграцию.", "Через MarketApp вы получите доступные объявления с GetGems."],
    zh: ["该市场仍在开发中。我们无法保证能够成功接入。", "使用 MarketApp 可获取来自 GetGems 的在售商品。"],
  },
  Portals: {
    ru: ["Этот маркетплейс ещё в разработке. Мы не можем гарантировать успешную интеграцию.", "Через MarketApp вы получите доступные объявления с Portals."],
    zh: ["该市场仍在开发中。我们无法保证能够成功接入。", "使用 MarketApp 可获取来自 Portals 的在售商品。"],
  },
  Tonnel: {
    ru: ["Этот маркетплейс ещё в разработке. Мы не можем гарантировать успешную интеграцию.", "Через MarketApp вы получите доступные объявления с Tonnel."],
    zh: ["该市场仍在开发中。我们无法保证能够成功接入。", "使用 MarketApp 可获取来自 Tonnel 的在售商品。"],
  },
  MRKT: {
    ru: ["Этот маркетплейс ещё в разработке. Мы не можем гарантировать успешную интеграцию."],
    zh: ["该市场仍在开发中。我们无法保证能够成功接入。"],
  },
};

// ─── PROMO BANNER ─────────────────────────────────────────────────────────────
const PROMO_SLIDES = [
  { img: "https://i.ibb.co/d08zfZmg/Inria-Serif-2.png", url: "https://t.me/gifttrove" },
  { img: "https://i.ibb.co/Rk1hB0vS/Inria-Serif.png", url: "https://t.me/troveotc" },
  { img: "https://i.ibb.co/Kp2tJtQT/MGGA-4.png", url: "https://t.me/spinmibot?startapp=7608551523" },
  { img: "https://i.ibb.co/v5NvzS6/MGGA-3.png", url: "https://t.me/hotontgbot/app?startapp=UQBRBt4DBvWYNqP9_p9-nysR55R2PXz9BEZjvrxiPWvVBcJO" },
  { img: "https://i.ibb.co/RkkHPgSV/MGGA-5.png", url: "https://t.me/insidemajek" },
];

// Few slow, faint gifts drifting in the background like they're in a void.
// On desktop they're clickable (redirect); on mobile they're purely decorative.
function VoidGifts({ gifts, onPick, count = 12, portal = false, drift = false }) {
  // ── legacy gentle-bob layer (used on the access gate) ──
  const legacyItems = useMemo(() => {
    if (drift) return [];
    const pics = (gifts || []).filter((g) => g && g.preview).slice(0, count);
    const lefts = [6, 78, 30, 60, 14, 86, 44, 70, 22, 52, 90, 38, 4, 66, 82, 48];
    const tops = [15, 26, 64, 73, 44, 9, 84, 36, 54, 18, 60, 90, 48, 70, 30, 80];
    return pics.map((g, i) => ({
      g, src: g.preview,
      size: 64 + ((i * 23) % 76),
      left: lefts[i % lefts.length],
      top: tops[i % tops.length],
      dur: 20 + ((i * 7) % 18),
      delay: -(i * 4),
    }));
  }, [gifts, count, drift]);

  // ── drift engine (desktop tabs): free motion, spins, black hole ──
  const pool = useMemo(() => (gifts || []).filter((g) => g && g.preview), [gifts]);
  const N = Math.min(8, count, pool.length);
  const reduced = useMemo(() => {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
  }, []);
  const engineOn = drift && !reduced && N > 0;

  const [slots, setSlots] = useState([]);            // [{id, src, size, op}]
  const [hole, setHole] = useState(null);            // {x, y} | null
  const ents = useRef([]);                           // physics entities by slot id
  const elsRef = useRef({});                         // id -> DOM node
  const holeRef = useRef(null);                      // {x, y, born, ttl}
  const rafRef = useRef(0);

  const rand = (a, b) => a + Math.random() * (b - a);
  const pickGift = useCallback(() => pool[Math.floor(Math.random() * pool.length)], [pool]);

  const spawnEnt = useCallback((id, onEdge) => {
    const W = window.innerWidth, H = window.innerHeight;
    const size = Math.round(rand(56, 122));
    const speed = rand(14, 46);                      // px/s
    let x, y, ang;
    if (onEdge) {
      const edge = Math.floor(rand(0, 4));           // 0 top 1 right 2 bottom 3 left
      if (edge === 0) { x = rand(0, W); y = -size - 20; ang = rand(0.35, Math.PI - 0.35); }
      else if (edge === 1) { x = W + 20; y = rand(0, H); ang = rand(Math.PI * 0.6, Math.PI * 1.4); }
      else if (edge === 2) { x = rand(0, W); y = H + 20; ang = rand(Math.PI + 0.35, 2 * Math.PI - 0.35); }
      else { x = -size - 20; y = rand(0, H); ang = rand(-Math.PI * 0.4, Math.PI * 0.4); }
    } else {
      x = rand(0, W - size); y = rand(0, H - size); ang = rand(0, Math.PI * 2);
    }
    const lost = Math.random() < 0.3;                // some tumble like they're lost in the void
    return {
      id, g: pickGift(), size,
      x, y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      rot: rand(0, 360),
      vr: lost ? rand(-70, 70) : rand(-16, 16),      // deg/s
      op: rand(0.34, 0.55),
      scale: 1, bright: 1,
      phase: "drift", suckT: 0,
    };
  }, [pickGift]);

  const syncSlot = useCallback((e) => ({ id: e.id, src: e.g.preview, size: e.size, op: e.op }), []);

  // boot / teardown
  useEffect(() => {
    if (!engineOn) { setSlots([]); setHole(null); ents.current = []; return undefined; }
    const list = [];
    for (let i = 0; i < N; i++) list.push(spawnEnt(i, false));
    ents.current = list;
    setSlots(list.map(syncSlot));

    let last = performance.now();
    const tick = (now) => {
      rafRef.current = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (document.hidden) return;
      const W = window.innerWidth, H = window.innerHeight;

      // black hole lifecycle: rare spawn (~ every 2 min avg), lives ~7s
      const h = holeRef.current;
      if (!h && Math.random() < dt / 120) {
        holeRef.current = { x: rand(W * 0.2, W * 0.8), y: rand(H * 0.25, H * 0.75), born: now, ttl: 7000 };
        setHole({ x: holeRef.current.x, y: holeRef.current.y });
      } else if (h && now - h.born > h.ttl) {
        holeRef.current = null;
        setHole(null);
      }

      // comet event: rare (~ every 70s avg) — one gift streaks across the void
      if (Math.random() < dt / 70) {
        const cands = ents.current.filter((e) => e.phase === "drift");
        if (cands.length) {
          const c = cands[Math.floor(rand(0, cands.length))];
          const ang = Math.atan2(c.vy, c.vx);
          const sp = rand(360, 520);
          c.vx = Math.cos(ang) * sp;
          c.vy = Math.sin(ang) * sp;
          c.vr = rand(-220, 220);
          c.bright = 1.9;
          c.phase = "comet";   // exits fast; respawns fresh off-screen
        }
      }

      let respawned = false;
      for (const e of ents.current) {
        if (e.phase === "sucked") {
          e.suckT += dt / 0.7;                       // 0.7s collapse
          const hh = holeRef.current;
          if (hh) {
            e.x += (hh.x - e.x - e.size / 2) * Math.min(1, dt * 9);
            e.y += (hh.y - e.y - e.size / 2) * Math.min(1, dt * 9);
          }
          e.rot += 720 * dt;
          e.scale = Math.max(0, 1 - e.suckT);
          e.bright = 1 + e.suckT * 2.4;              // star-flash as it collapses
          if (e.suckT >= 1) {
            Object.assign(e, spawnEnt(e.id, true));
            respawned = true;
          }
        } else {
          const hh = holeRef.current;
          if (hh) {
            const dx = hh.x - (e.x + e.size / 2), dy = hh.y - (e.y + e.size / 2);
            const d = Math.hypot(dx, dy) || 1;
            if (d < 300) {
              const pull = 5200 / (d + 40);          // stronger as it nears
              e.vx += (dx / d) * pull * dt;
              e.vy += (dy / d) * pull * dt;
              e.vr += 80 * dt * (e.vr >= 0 ? 1 : -1);
              if (d < 42) { e.phase = "sucked"; e.suckT = 0; }
            }
          }
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          e.rot += e.vr * dt;
          // fully off-screen → fresh gift from a random edge
          if (e.x < -e.size - 60 || e.x > W + 60 || e.y < -e.size - 60 || e.y > H + 60) {
            Object.assign(e, spawnEnt(e.id, true));
            respawned = true;
          }
        }
        const el = elsRef.current[e.id];
        if (el) {
          el.style.transform = `translate3d(${e.x}px, ${e.y}px, 0) rotate(${e.rot}deg) scale(${e.scale})`;
          el.style.filter = e.phase === "comet"
            ? "brightness(1.9) drop-shadow(0 0 14px rgba(120,180,255,0.85))"
            : (e.bright > 1.01 ? `brightness(${e.bright})` : "");
        }
      }
      if (respawned) setSlots(ents.current.map(syncSlot));
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [engineOn, N, spawnEnt, syncSlot]);

  if (engineOn) {
    const layer = (
      <div className="void-layer" aria-hidden="true">
        {hole && (
          <div className="void-hole" style={{ left: hole.x, top: hole.y }}>
            <span className="vh-ring" /><span className="vh-core" />
          </div>
        )}
        {slots.map((s) => {
          const ent = ents.current.find((e) => e.id === s.id);
          return (
            <img key={s.id} src={s.src} alt="" className="void-gift drift"
              ref={(el) => { elsRef.current[s.id] = el; }}
              onClick={() => { if (ent && ent.phase === "drift") onPick?.(ent.g); }}
              style={{ width: s.size, height: s.size, left: 0, top: 0, opacity: s.op }}
              onError={(e) => { e.target.style.display = "none"; }} />
          );
        })}
      </div>
    );
    return typeof document !== "undefined" ? createPortal(layer, document.body) : layer;
  }

  // legacy layer (gate) / static fallback (drift requested but reduced motion)
  const items = legacyItems.length ? legacyItems : (drift && reduced ? pool.slice(0, Math.min(8, count)).map((g, i) => ({
    g, src: g.preview, size: 64 + ((i * 23) % 76),
    left: [6, 78, 30, 60, 14, 86, 44, 70][i % 8], top: [15, 26, 64, 73, 44, 9, 84, 36][i % 8],
    dur: 26, delay: -(i * 4),
  })) : []);
  if (!items.length) return null;
  const layer = (
    <div className="void-layer" aria-hidden="true">
      {items.map((it, i) => (
        <img key={i} src={it.src} alt="" className="void-gift"
          onClick={() => onPick?.(it.g)}
          style={{ width: it.size, height: it.size, left: `${it.left}vw`, top: `${it.top}vh`, animationDuration: `${it.dur}s`, animationDelay: `${it.delay}s` }}
          onError={(e) => { e.target.style.display = "none"; }} />
      ))}
    </div>
  );
  if (portal && typeof document !== "undefined") return createPortal(layer, document.body);
  return layer;
}

// Shared floating-gifts backdrop for BottomSheet panels (premium / promote / affiliate)
function SheetMotion({ gifts }) {
  const picks = (gifts || []).filter((g) => g && g.preview).slice(0, 6);
  if (!picks.length) return null;
  const lefts  = [8, 70, 32, 58, 16, 82];
  const tops   = [6, 16, 52, 72, 36, 88];
  return (
    <div className="sheet-motion" aria-hidden="true">
      {picks.map((g, i) => (
        <img key={i} src={g.preview} alt="" className="void-gift" loading="lazy"
          style={{ width: 56 + ((i * 17) % 46), height: 56 + ((i * 17) % 46),
            left: `${lefts[i % 6]}%`, top: `${tops[i % 6]}%`,
            animationDuration: `${20 + ((i * 5) % 16)}s`, animationDelay: `${-i * 3}s` }}
          onError={(e) => { e.target.style.display = "none"; }} />
      ))}
    </div>
  );
}
function BottomSheet({ onClose, children }) {
  const [y, setY] = useState(1200);          // current translateY in px
  const [dragging, setDragging] = useState(false);
  const [closing, setClosing] = useState(false);
  const startY = useRef(null);
  const curY = useRef(1200);
  const scRef = useRef(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => { curY.current = 0; setY(0); });
    return () => cancelAnimationFrame(id);
  }, []);

  const close = () => {
    if (closing) return;
    setClosing(true); setDragging(false);
    curY.current = 1200; setY(1200);
    setTimeout(() => onClose?.(), 280);
  };
  const setYY = (v) => { curY.current = v; setY(v); };

  const onTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    setDragging(true);
  };
  const onTouchMove = (e) => {
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    setYY(dy > 0 ? dy : dy * 0.2);   // slight rubber-band upward
  };
  const onTouchEnd = () => {
    if (startY.current == null) return;
    startY.current = null;
    setDragging(false);
    if (curY.current > 110) close(); else setYY(0);
  };

  return (
    <div className={`sheet-overlay ${closing ? "sheet-closing" : ""}`} onClick={close}>
      <div ref={scRef} className="sheet-content sheet-js" onClick={(e) => e.stopPropagation()}
        style={{ transform: `translateY(${y}px)`, transition: dragging ? "none" : "transform .36s cubic-bezier(0.32,0.72,0,1)" }}>
        {/* Drag-to-dismiss lives ONLY on the grab zone — content scrolls freely */}
        <div className="sheet-drag" onClick={close}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div className="sheet-grab" />
        </div>
        {children}
      </div>
    </div>
  );
}

function PromoBanner() {
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef(null);

  const start = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setCurrent((p) => (p + 1) % PROMO_SLIDES.length), 5000);
  }, []);

  useEffect(() => {
    preloadImages(PROMO_SLIDES.map((s) => s.img));
    preloadImages([LOGO_URL]);
    start();
    return () => clearInterval(intervalRef.current);
  }, [start]);

  return (
    <div className="promo-banner" onClick={() => safeOpen(PROMO_SLIDES[current].url)}>
      {PROMO_SLIDES.map((slide, i) => (
        <img key={i} src={slide.img} alt={`promo-${i}`} loading="eager"
          fetchpriority={i === 0 ? "high" : "low"}
          className={`promo-banner-img ${i === current ? "active" : "inactive"}`} />
      ))}
      <div className="promo-banner-overlay">
        <div className="promo-spiral promo-spiral-1" />
        <div className="promo-spiral promo-spiral-2" />
        <div className="promo-spiral promo-spiral-3" />
      </div>
      <div className="promo-dots">
        {PROMO_SLIDES.map((_, i) => <div key={i} className={`promo-dot ${i === current ? "active" : ""}`} />)}
      </div>
    </div>
  );
}

// ─── TRANSLATIONS (EN / RU / ZH) ──────────────────────────────────────────────
const T = {
  EN: {
    scout_tab: "Scout", results_tab: "Results", alerts_tab: "Alerts", saved_tab: "Saved", profile_tab: "Profile",
    sort_general: "General", sort_low: "Lowest", sort_high: "Highest", load_more: "Load more", price_range: "Price range", min_label: "Min", max_label: "Max", apply_filter: "Apply", results_empty_title: "No results yet", results_empty_sub: "Search a gift in Scout to see listings here.", showing_n: "Showing {n}", gate_a: "GiftTrove isn't available for public use yet. Reach out to ", gate_link: "majek", gate_b: " for an access code — or wait until the mini app goes live.", gate_checking: "Checking access…", gate_code_ph: "ACCESS CODE", gate_unlock: "Unlock", gate_connecting: "Connecting…", gate_neterr: "Couldn't reach the server (it may be waking up). Try again in a moment.", gate_admin: "Admins are let in automatically.", gate_join: "Join the GiftTrove channel", unknown_gift_title: "Hmm, no such gift", unknown_gift_sub: "We couldn't find a Telegram gift called “{q}”. Check the spelling, or pick one from the suggestions.", no_listings_sub: "No live listings match these filters right now. Try removing a filter or checking back soon.",
    fastest_way: "The fastest way to find any Telegram Gift", splash_eyebrow: "Telegram Gift Scout",
    gift_name: "Gift Name", specific_id: "Specific ID", optional: "(Optional)",
    marketplaces: "Marketplaces", attributes: "Attributes", model: "Model", backdrop: "Backdrop", symbol: "Symbol",
    scout_gift: "Scout Gift", results: "Results", found: "found",
    selected_n: "selected", filter_upsell: "Combine multiple filters with Scout+", filter_cap_hit: "You can pick up to {n}. Upgrade for more.", done: "Done",
    premium_label: "Membership", premium_row: "GiftTrove Premium", tier_free: "Free",
    premium_title: "GiftTrove Premium", you_are_on: "You're on", renews: "renews", per_month: "month",
    current_plan: "Current plan", subscribe: "Subscribe", opening: "Opening\u2026",
    perk_5_filters: "Up to 7 of each filter", perk_unlimited: "Unlimited filters",
    perk_vanity: "Custom referral code", perk_more_soon: "New perks as they land", perk_priority: "Priority on new perks", perk_no_ads: "No promoted gifts in your scouts", perk_affiliate: "Affiliate program access",
    need_stars: "Need Stars?", need_stars_sub: "Get them cheaper on Hoton",
    vanity_title: "Your referral code", vanity_help: "Pick a custom code (letters & numbers). It replaces your random code on the links you share.", vanity_ph: "YOURCODE", claim: "Claim", your_code: "Your code",
    vanity_ok: "Code claimed!", vanity_taken: "That code is taken \u2014 try another.", vanity_premium: "Scout Pro only.", vanity_bad: "Use 3\u201312 letters and numbers (at least one letter).",
    premium_fineprint: "Subscriptions are billed monthly in Telegram Stars and renew automatically. Manage or cancel anytime in Telegram. Stars purchases are non-refundable.",
    open_in_tg: "Open inside Telegram to subscribe.", update_tg: "Update Telegram to subscribe with Stars.",
    sub_thanks: "Subscription active \u2014 thank you!", sub_failed: "Couldn't start the payment. Try again.",
    cancel_sub: "Cancel subscription", cancel_yes: "Cancel subscription", keep_plan: "Keep plan",
    cancel_confirm: "Cancel your subscription? You'll keep your benefits until the current period ends. Remember to also cancel it from Telegram so it doesn't renew.",
    cancel_done: "Subscription cancelled.", cancel_failed: "Couldn't cancel. Try again, or manage it in Telegram.", cancel_none: "No active subscription to cancel.",
    promote_row: "Promote a gift", promoted: "Promoted", promo_on: "on {m}",
    promote_title: "Promote a gift", promote_sub: "Pin a gift to the top of matching scouts for {d} days \u2014 {n} Stars, one-time.",
    promo_collection: "Collection", promo_search_coll: "Search collections\u2026", promo_change: "Change",
    promo_marketplace: "Marketplace", promo_attrs_opt: "Refine (optional)", promo_any: "Any",
    promote_cta: "Promote for {n}", promo_pick_coll: "Pick a collection first.",
    promote_fineprint: "Your promotion appears at the top of scouts for this gift that match what you pick. It is a redirect only \u2014 GiftTrove takes no part in any sale. Stars are non-refundable; GiftTrove may remove promotions that breach the rules.",
    promo_limit: "You\u2019ve hit the max active promotions. Wait for one to expire.", promo_bad_coll: "That collection can\u2019t be promoted right now.",
    promo_failed: "Couldn\u2019t start the promotion. Try again.", promo_live: "Your promotion is live!",
    promo_reported: "Reported \u2014 thanks.", promo_report: "Report this promotion",
    view: "View", tier_pro_short: "Pro",
    promo_tg_note: "Enter the gift ID. The bot finds its listing on Telegram automatically.",
    promo_num_required: "Gift number is required",
    promo_num_label: "Gift number", promo_num_ph: "e.g. 1234",
    promo_frag_link: "Fragment gift link", promo_bad_link: "That doesn\u2019t look like a fragment.com link.",
    promo_frag_note: "Enter the gift ID. The bot finds its listing on Fragment automatically.",
    promo_review: "Submitted \u2014 your promotion goes live once an admin approves it.",
    aff_withdraw_as: "Withdraw as \u2248 {v} GRAM", aff_track_note: "Tracked earnings \u2014 withdrawn as GRAM to your wallet.",
    footer_live: "Live", footer_for_devs: "For Developers", footer_api_agents: "API for Agents", footer_powered: "Powered by GRAM (ex TON)",
    promo_ma_link: "MarketApp listing link", promo_ma_note: "Enter the gift ID. The bot finds its listing on MarketApp automatically.",
    promo_bad_ma_link: "That doesn\u2019t look like a marketapp.org link.",
    aff_earnings_30d: "Earnings (30 days)", aff_no_earnings: "No earnings yet", aff_30d_ago: "30d ago", aff_today: "Today",
    aff_history: "Payout history", aff_st_paid: "Paid", aff_st_pending: "Pending", aff_st_declined: "Declined",
    promo_price_opt: "Asking price (optional)", promo_amount_ph: "e.g. 250", promo_link_opt: "Direct gift link (optional)",
    promo_link_help: "Paste the exact Telegram or Fragment listing so taps go straight to it.",
    affiliate_row: "Affiliate program", affiliate_title: "Affiliate program",
    affiliate_sub: "Earn {n}% of every subscription from members you invite \u2014 for as long as you stay Scout Pro.",
    aff_locked_title: "A Scout Pro perk", aff_locked_sub: "Upgrade to Scout Pro to earn {n}% of every subscription from members you invite.", aff_locked_perk1: "{n}% commission on every subscription you refer", aff_locked_perk2: "Paid out in GRAM, straight to your own wallet", aff_locked_perk3: "Track referrals and payouts in real time", aff_locked_preview: "A live look at your dashboard",
    aff_upgrade: "Upgrade to Scout Pro", aff_available: "Available to withdraw", aff_earned: "Earned", aff_pending: "Pending",
    aff_referred: "Referred", aff_payers: "Paying", aff_ton_addr: "GRAM address or TON DNS", aff_addr_ph: "Address or .ton domain",
    aff_withdraw: "Request payout", aff_min: "Withdraw at {n}\u2605", aff_need_addr: "Enter your GRAM address or TON DNS.", aff_withdraw_earnings: "Withdraw Earnings", aff_amount: "Amount", aff_amount_ph: "0", aff_max: "Max", aff_amount_range: "Minimum {min}\u2605", aff_need_amount: "Enter an amount to withdraw.", aff_amount_invalid: "Enter a valid amount.",
    aff_requested: "Payout request submitted \u2014 you\u2019ll get a confirmation in chat.", aff_pro_only: "Scout Pro only.", aff_failed: "Couldn\u2019t load. Try again.",
    aff_fineprint: "Earnings accrue only while you\u2019re Scout Pro and pause if your plan lapses. Minimum payout {n}\u2605, settled in TON to your wallet. Fake or self-referrals forfeit earnings.",
    scouting_title: "Scouting marketplaces…", scouting_sub: "Finding gems so you don't have to",
    no_results: "No live listings matched your filters.", try_again: "Try again",
    offline_title: "Live data is offline", offline_sub: "Couldn't reach the GiftTrove server. Pull to refresh or try again shortly.",
    select_gift_first: "Select a gift collection first to see its", attrs_loading: "Fetching this gift\u2019s attributes \u2014 just a few seconds\u2026", soon: "soon", soon_title: "Coming soon", soon_note: "This marketplace isn\u2019t live in GiftTrove yet. It\u2019s being worked on \u2014 but it isn\u2019t guaranteed, and there\u2019s no set date.", got_it: "Got it", x_account: "X (Twitter)", frag_attr_note: "Attribute selection is not available for Fragment. Proceed to scout.", attr_search: "Search",
    no_alerts: "No alerts yet", alerts_hint: "Add a gift to your watchlist and get pinged when it lists below your price.",
    add_alert: "Add Watch Alert", watchlist: "Watchlist",
    no_saved: "No gifts saved yet.",
    community: "Community", support: "Contact Support", comm_chat: "Community Chat", comm_channel: "Community Channel",
    inside_majek: "Inside Majek", gifttrove_otc: "GiftTrove OTC", about_legal: "About and legal", data_cleared: "Your data was cleared", data_clear_failed: "Couldn\u2019t clear your data. Open GiftTrove inside Telegram and try again.",
    support_builder: "Support the Builder", donate: "Donate",
    donate_desc: "GiftTrove was created free. Kindly input the amount of GRAM you'd like to donate.",
    amount_ton: "Amount (GRAM)", verify_tx: "Verify Transaction", tx_id: "Transaction ID",
    thank_you: "Thank you for your generous support!",
    referrals: "Referrals", copy_ref: "Copy Referral Link", ref_count: "Referral Count",
    any: "Any", rarity: "Rarity", language: "Language",
    wallet_redirect: "You'll be redirected to {w} with the address and amount pre-filled — just kindly approve.",
    tg_copy_note: "Telegram Wallet has no transfer link. Tap below to copy the address, then send {amt} GRAM from @wallet.",
    copy_address: "Copy Address", address_copied: "Address copied — send from @wallet",
    listed_value: "Listed Value", buy_now: "Buy / View", buy: "Buy", sold: "Sold", save_gift: "Save Gift", remove_saved: "Remove Saved", share_gift: "Share gift",
    floor: "Floor", view_on: "View on Telegram", saved_done: "Saved to your collection", link_copied: "Referral link copied",
  },
  RU: {
    scout_tab: "Поиск", results_tab: "Итоги", alerts_tab: "Алерты", saved_tab: "Сохр.", profile_tab: "Профиль",
    sort_general: "Обычный", sort_low: "Дешевле", sort_high: "Дороже", load_more: "Ещё", price_range: "Диапазон цен", min_label: "Мин", max_label: "Макс", apply_filter: "Применить", results_empty_title: "Пока нет результатов", results_empty_sub: "Найдите подарок во вкладке Поиск.", showing_n: "Показано {n}", gate_a: "GiftTrove пока недоступен публично. Напишите ", gate_link: "majek", gate_b: ", чтобы получить код доступа.", gate_checking: "Проверка доступа…", gate_code_ph: "КОД ДОСТУПА", gate_unlock: "Разблокировать", gate_connecting: "Подключение…", gate_neterr: "Не удалось связаться с сервером (возможно, он просыпается). Повторите попытку.", gate_admin: "Админы входят автоматически.", gate_join: "Подпишитесь на канал GiftTrove", unknown_gift_title: "Такого подарка нет", unknown_gift_sub: "Не нашли подарок «{q}». Проверьте написание или выберите из подсказок.", no_listings_sub: "По этим фильтрам пока нет листингов. Уберите фильтр или зайдите позже.",
    fastest_way: "Самый быстрый способ найти любой Telegram подарок", splash_eyebrow: "Скаут Telegram-подарков",
    gift_name: "Имя подарка", specific_id: "Конкретный ID", optional: "(Необязательно)",
    marketplaces: "Маркетплейсы", attributes: "Атрибуты", model: "Модель", backdrop: "Фон", symbol: "Символ",
    scout_gift: "Искать подарок", results: "Результаты", found: "найдено",
    selected_n: "выбрано", filter_upsell: "Объедините фильтры со Scout+", filter_cap_hit: "Можно выбрать до {n}. Обновите тариф.", done: "Готово",
    premium_label: "Подписка", premium_row: "GiftTrove Premium", tier_free: "Бесплатно",
    premium_title: "GiftTrove Premium", you_are_on: "Ваш тариф:", renews: "продление", per_month: "мес.",
    current_plan: "Текущий тариф", subscribe: "Оформить", opening: "Открываю\u2026",
    perk_5_filters: "До 7 значений каждого фильтра", perk_unlimited: "Безлимит фильтров",
    perk_vanity: "Свой реферальный код", perk_more_soon: "Новые возможности по мере выхода", perk_priority: "Приоритет на новые функции", perk_no_ads: "Без рекламных подарков в поиске", perk_affiliate: "Доступ к партнёрской программе",
    need_stars: "Нужны Stars?", need_stars_sub: "Дешевле на Hoton",
    vanity_title: "Ваш реферальный код", vanity_help: "Выберите свой код (буквы и цифры). Он заменит случайный код в ссылках.", vanity_ph: "ВАШКОД", claim: "Занять", your_code: "Ваш код",
    vanity_ok: "Код закреплён за вами!", vanity_taken: "Код занят — выберите другой.", vanity_premium: "Только для Scout Pro.", vanity_bad: "3–12 букв и цифр (хотя бы одна буква).",
    premium_fineprint: "Подписка списывается ежемесячно в Telegram Stars и продлевается автоматически. Управление и отмена — в Telegram. Покупки за Stars не возвращаются.",
    open_in_tg: "Откройте в Telegram, чтобы оформить.", update_tg: "Обновите Telegram для оплаты Stars.",
    sub_thanks: "Подписка активна — спасибо!", sub_failed: "Не удалось начать оплату. Попробуйте снова.",
    cancel_sub: "Отменить подписку", cancel_yes: "Отменить подписку", keep_plan: "Оставить план",
    cancel_confirm: "Отменить подписку? Преимущества сохранятся до конца текущего периода. Не забудьте также отменить её в Telegram, чтобы она не продлевалась.",
    cancel_done: "Подписка отменена.", cancel_failed: "Не удалось отменить. Попробуйте снова или управляйте в Telegram.", cancel_none: "Нет активной подписки для отмены.",
    promote_row: "Продвинуть подарок", promoted: "Реклама", promo_on: "на {m}",
    promote_title: "Продвинуть подарок", promote_sub: "Закрепите подарок вверху подходящих поисков на {d} дн. — {n} Stars, разово.",
    promo_collection: "Коллекция", promo_search_coll: "Поиск коллекций…", promo_change: "Изменить",
    promo_marketplace: "Маркетплейс", promo_attrs_opt: "Уточнить (необязательно)", promo_any: "Любой",
    promote_cta: "Продвинуть за {n}", promo_pick_coll: "Сначала выберите коллекцию.",
    promote_fineprint: "Ваша реклама показывается вверху поисков по этому подарку, совпадающих с выбором. Это только переход — GiftTrove не участвует в сделках. Stars не возвращаются; GiftTrove может удалить рекламу, нарушающую правила.",
    promo_limit: "Достигнут лимит активной рекламы. Дождитесь окончания одной.", promo_bad_coll: "Эту коллекцию сейчас нельзя продвигать.",
    promo_failed: "Не удалось запустить рекламу. Попробуйте снова.", promo_live: "Ваша реклама запущена!",
    promo_reported: "Жалоба отправлена — спасибо.", promo_report: "Пожаловаться на рекламу",
    view: "Открыть", tier_pro_short: "Pro",
    promo_tg_note: "Введите номер подарка. Бот автоматически найдёт его на Telegram.",
    promo_num_required: "Номер подарка обязателен",
    promo_num_label: "Номер подарка", promo_num_ph: "напр. 1234",
    promo_frag_link: "Ссылка на подарок Fragment", promo_bad_link: "Это не похоже на ссылку fragment.com.",
    promo_frag_note: "Введите номер подарка. Бот автоматически найдёт его на Fragment.",
    promo_review: "Отправлено — реклама появится после одобрения админом.",
    aff_withdraw_as: "Вывод ≈ {v} GRAM", aff_track_note: "Отслеживаемый доход — выводится в GRAM на ваш кошелёк.",
    footer_live: "Активно", footer_for_devs: "Разработчикам", footer_api_agents: "API для агентов", footer_powered: "Работает на GRAM (экс TON)",
    promo_ma_link: "Ссылка на листинг MarketApp", promo_ma_note: "Введите номер подарка. Бот автоматически найдёт его на MarketApp.",
    promo_bad_ma_link: "Это не похоже на ссылку marketapp.org.",
    aff_earnings_30d: "Доход (30 дней)", aff_no_earnings: "Пока нет дохода", aff_30d_ago: "30 дн. назад", aff_today: "Сегодня",
    aff_history: "История выплат", aff_st_paid: "Выплачено", aff_st_pending: "В обработке", aff_st_declined: "Отклонено",
    promo_price_opt: "Цена (необязательно)", promo_amount_ph: "напр. 250", promo_link_opt: "Прямая ссылка на подарок (необязательно)",
    promo_link_help: "Вставьте точную ссылку на Telegram или Fragment, чтобы переход вёл сразу к ней.",
    affiliate_row: "Партнёрская программа", affiliate_title: "Партнёрская программа",
    affiliate_sub: "Получайте {n}% с каждой подписки приглашённых вами участников — пока у вас активен Scout Pro.",
    aff_locked_title: "Привилегия Scout Pro", aff_locked_sub: "Оформите Scout Pro, чтобы получать {n}% с каждой подписки приглашённых участников.", aff_locked_perk1: "{n}% комиссия с каждой подписки по вашей ссылке", aff_locked_perk2: "Выплата в GRAM прямо на ваш кошелёк", aff_locked_perk3: "Отслеживайте рефералов и выплаты в реальном времени", aff_locked_preview: "Так выглядит ваш кабинет",
    aff_upgrade: "Оформить Scout Pro", aff_available: "Доступно к выводу", aff_earned: "Заработано", aff_pending: "В ожидании",
    aff_referred: "Приглашено", aff_payers: "Платящих", aff_ton_addr: "Адрес GRAM или TON DNS", aff_addr_ph: "Адрес или домен .ton",
    aff_withdraw: "Запросить выплату", aff_min: "Вывод от {n}\u2605", aff_need_addr: "Укажите адрес GRAM или TON DNS.", aff_withdraw_earnings: "Вывести доход", aff_amount: "Сумма", aff_amount_ph: "0", aff_max: "Макс", aff_amount_range: "Минимум {min}\u2605", aff_need_amount: "Введите сумму для вывода.", aff_amount_invalid: "Введите корректную сумму.",
    aff_requested: "Запрос на выплату отправлен — подтверждение придёт в чат.", aff_pro_only: "Только для Scout Pro.", aff_failed: "Не удалось загрузить. Попробуйте снова.",
    aff_fineprint: "Начисления идут только при активном Scout Pro и приостанавливаются, если подписка истекает. Минимальная выплата {n}\u2605, переводится в TON на ваш кошелёк. Фейковые или само-рефералы аннулируют начисления.",
    scouting_title: "Сканируем маркетплейсы…", scouting_sub: "Находим самоцветы за вас",
    no_results: "Нет активных объявлений по фильтрам.", try_again: "Повторить",
    offline_title: "Данные недоступны", offline_sub: "Не удалось связаться с сервером GiftTrove. Потяните вниз для обновления.",
    select_gift_first: "Сначала выберите коллекцию, чтобы увидеть", attrs_loading: "Загружаем параметры подарка — пара секунд…", soon: "скоро", soon_title: "Скоро", soon_note: "Этот маркетплейс пока недоступен в GiftTrove. Мы работаем над этим — но это не гарантировано, и точной даты нет.", got_it: "Понятно", x_account: "X (Twitter)", frag_attr_note: "Выбор атрибутов недоступен для Fragment. Продолжайте поиск.", attr_search: "Поиск",
    no_alerts: "Пока нет алертов", alerts_hint: "Добавьте подарок в список наблюдения и получайте уведомление о выгодной цене.",
    add_alert: "Добавить алерт", watchlist: "Список наблюдения",
    no_saved: "Пока нет сохранённых подарков.",
    community: "Сообщество", support: "Поддержка", comm_chat: "Чат сообщества", comm_channel: "Канал сообщества",
    inside_majek: "Inside Majek", gifttrove_otc: "GiftTrove OTC", about_legal: "О приложении и праве", data_cleared: "Ваши данные удалены", data_clear_failed: "Не удалось удалить данные. Откройте GiftTrove в Telegram и повторите.",
    support_builder: "Поддержать создателя", donate: "Пожертвовать",
    donate_desc: "GiftTrove бесплатен. Введите сумму GRAM для пожертвования.",
    amount_ton: "Сумма (GRAM)", verify_tx: "Проверить транзакцию", tx_id: "ID транзакции",
    thank_you: "Спасибо за вашу щедрую поддержку!",
    referrals: "Рефералы", copy_ref: "Копировать ссылку", ref_count: "Кол-во рефералов",
    any: "Любой", rarity: "Редкость", language: "Язык",
    wallet_redirect: "Вы будете перенаправлены в {w} с заполненным адресом и суммой — пожалуйста, подтвердите.",
    tg_copy_note: "У Telegram Wallet нет ссылки для перевода. Скопируйте адрес и отправьте {amt} GRAM из @wallet.",
    copy_address: "Копировать адрес", address_copied: "Адрес скопирован — отправьте из @wallet",
    listed_value: "Цена листинга", buy_now: "Купить / Открыть", buy: "Купить", sold: "Продано", save_gift: "Сохранить", remove_saved: "Убрать", share_gift: "Поделиться",
    floor: "Флор", view_on: "Открыть в Telegram", saved_done: "Добавлено в коллекцию", link_copied: "Ссылка скопирована",
  },
  ZH: {
    scout_tab: "侦测", results_tab: "结果", alerts_tab: "提醒", saved_tab: "收藏", profile_tab: "我的",
    sort_general: "综合", sort_low: "最低", sort_high: "最高", load_more: "加载更多", price_range: "价格范围", min_label: "最低", max_label: "最高", apply_filter: "应用", results_empty_title: "暂无结果", results_empty_sub: "在“侦测”中搜索礼物以查看结果。", showing_n: "显示 {n}", gate_a: "GiftTrove 暂未对公众开放。请联系 ", gate_link: "majek", gate_b: " 获取访问码，或等待小程序上线。", gate_checking: "正在检查访问权限…", gate_code_ph: "访问码", gate_unlock: "解锁", gate_connecting: "连接中…", gate_neterr: "无法连接服务器（可能正在唤醒）。请稍后重试。", gate_admin: "管理员自动进入。", gate_join: "加入 GiftTrove 频道", unknown_gift_title: "没有这个礼物", unknown_gift_sub: "找不到名为“{q}”的礼物。请检查拼写，或从建议中选择。", no_listings_sub: "当前没有符合这些筛选的在售挂单。请移除筛选或稍后再试。",
    fastest_way: "查找任何 Telegram 礼物的最快方法", splash_eyebrow: "Telegram 礼物侦测",
    gift_name: "礼物名称", specific_id: "特定 ID", optional: "（可选）",
    marketplaces: "市场", attributes: "属性", model: "模型", backdrop: "背景", symbol: "符号",
    scout_gift: "侦测礼物", results: "结果", found: "已找到",
    selected_n: "已选", filter_upsell: "使用 Scout+ 组合多个筛选", filter_cap_hit: "最多可选 {n} 个，升级解锁更多。", done: "完成",
    premium_label: "会员", premium_row: "GiftTrove Premium", tier_free: "免费",
    premium_title: "GiftTrove 会员", you_are_on: "当前方案：", renews: "续订", per_month: "月",
    current_plan: "当前方案", subscribe: "订阅", opening: "正在打开\u2026",
    perk_5_filters: "每个筛选最多 7 个", perk_unlimited: "无限筛选",
    perk_vanity: "自定义推荐码", perk_more_soon: "新功能陆续上线", perk_priority: "新功能优先体验", perk_no_ads: "搜索中不显示推广礼物", perk_affiliate: "联盟计划访问权限",
    need_stars: "需要 Stars？", need_stars_sub: "在 Hoton 更便宜",
    vanity_title: "你的推荐码", vanity_help: "选择自定义推荐码（字母和数字）。它会替换分享链接中的随机码。", vanity_ph: "你的码", claim: "认领", your_code: "你的码",
    vanity_ok: "认领成功！", vanity_taken: "该码已被占用，请换一个。", vanity_premium: "仅限 Scout Pro。", vanity_bad: "请使用 3–12 个字母和数字（至少一个字母）。",
    premium_fineprint: "订阅以 Telegram Stars 按月计费并自动续订。可随时在 Telegram 管理或取消。Stars 购买不可退款。",
    open_in_tg: "请在 Telegram 内打开以订阅。", update_tg: "请更新 Telegram 以使用 Stars 订阅。",
    sub_thanks: "订阅已生效，谢谢！", sub_failed: "无法发起支付，请重试。",
    cancel_sub: "取消订阅", cancel_yes: "取消订阅", keep_plan: "保留方案",
    cancel_confirm: "取消订阅？在当前周期结束前仍可享受权益。请记得同时在 Telegram 中取消，以免自动续订。",
    cancel_done: "订阅已取消。", cancel_failed: "无法取消，请重试或在 Telegram 中管理。", cancel_none: "没有可取消的有效订阅。",
    promote_row: "推广礼物", promoted: "推广", promo_on: "在 {m}",
    promote_title: "推广礼物", promote_sub: "将礼物置于匹配搜索的顶部，持续 {d} 天 — {n} Stars，一次性。",
    promo_collection: "系列", promo_search_coll: "搜索系列…", promo_change: "更改",
    promo_marketplace: "市场", promo_attrs_opt: "细化（可选）", promo_any: "任意",
    promote_cta: "支付 {n} 推广", promo_pick_coll: "请先选择一个系列。",
    promote_fineprint: "您的推广会出现在该礼物匹配搜索的顶部。这仅为跳转链接 — GiftTrove 不参与任何交易。Stars 不可退款；GiftTrove 可移除违规推广。",
    promo_limit: "已达到活跃推广上限，请等待其中一个到期。", promo_bad_coll: "该系列暂时无法推广。",
    promo_failed: "无法启动推广，请重试。", promo_live: "您的推广已上线！",
    promo_reported: "已举报 — 谢谢。", promo_report: "举报此推广",
    view: "查看", tier_pro_short: "Pro",
    promo_tg_note: "输入礼物 ID，机器人将在 Telegram 上自动查找。",
    promo_num_required: "礼物编号为必填项",
    promo_num_label: "礼物编号", promo_num_ph: "例如 1234",
    promo_frag_link: "Fragment 礼物链接", promo_bad_link: "这看起来不是 fragment.com 链接。",
    promo_frag_note: "输入礼物 ID，机器人将在 Fragment 上自动查找。",
    promo_review: "已提交 — 管理员批准后推广即上线。",
    aff_withdraw_as: "提现 ≈ {v} GRAM", aff_track_note: "追踪收益 — 以 GRAM 提现至您的钱包。",
    footer_live: "已上线", footer_for_devs: "开发者", footer_api_agents: "智能体 API", footer_powered: "基于 GRAM（原 TON）",
    promo_ma_link: "MarketApp 挂单链接", promo_ma_note: "输入礼物 ID，机器人将在 MarketApp 上自动查找。",
    promo_bad_ma_link: "这看起来不是 marketapp.org 链接。",
    aff_earnings_30d: "收益（30 天）", aff_no_earnings: "暂无收益", aff_30d_ago: "30 天前", aff_today: "今天",
    aff_history: "提现记录", aff_st_paid: "已支付", aff_st_pending: "处理中", aff_st_declined: "已拒绝",
    promo_price_opt: "售价（可选）", promo_amount_ph: "例如 250", promo_link_opt: "礼物直达链接（可选）",
    promo_link_help: "粘贴确切的 Telegram 或 Fragment 链接，点击即可直达。",
    affiliate_row: "推广联盟", affiliate_title: "推广联盟",
    affiliate_sub: "邀请的会员每次订阅，您可赚取 {n}% — 只要您保持 Scout Pro。",
    aff_locked_title: "Scout Pro 专属", aff_locked_sub: "升级 Scout Pro，邀请会员订阅即可赚取 {n}%。", aff_locked_perk1: "每笔推荐订阅赚取 {n}% 佣金", aff_locked_perk2: "以 GRAM 直接提现至您的钱包", aff_locked_perk3: "实时追踪推荐与提现记录", aff_locked_preview: "您的仪表盘预览",
    aff_upgrade: "升级 Scout Pro", aff_available: "可提现", aff_earned: "已赚取", aff_pending: "待处理",
    aff_referred: "已邀请", aff_payers: "付费", aff_ton_addr: "GRAM 地址或 TON DNS", aff_addr_ph: "地址或 .ton 域名",
    aff_withdraw: "申请提现", aff_min: "满 {n}\u2605 可提现", aff_need_addr: "请输入 GRAM 地址或 TON DNS。", aff_withdraw_earnings: "提现收益", aff_amount: "金额", aff_amount_ph: "0", aff_max: "最大", aff_amount_range: "最低 {min}\u2605", aff_need_amount: "请输入提现金额。", aff_amount_invalid: "请输入有效金额。",
    aff_requested: "提现申请已提交 — 确认信息将发送到聊天。", aff_pro_only: "仅限 Scout Pro。", aff_failed: "加载失败，请重试。",
    aff_fineprint: "仅在 Scout Pro 有效期间累积收益，订阅失效则暂停。最低提现 {n}\u2605，以 TON 结算至您的钱包。虚假或自我推荐将取消收益。",
    scouting_title: "正在扫描市场…", scouting_sub: "替你淘到珍宝",
    no_results: "没有符合筛选条件的在售商品。", try_again: "重试",
    offline_title: "实时数据离线", offline_sub: "无法连接 GiftTrove 服务器。请下拉刷新或稍后再试。",
    select_gift_first: "请先选择礼物系列以查看其", attrs_loading: "正在获取该礼物的属性，请稍候几秒…", soon: "即将推出", soon_title: "敬请期待", soon_note: "该市场尚未在 GiftTrove 上线。正在开发中——但不保证上线，也没有确定日期。", got_it: "知道了", x_account: "X (Twitter)", frag_attr_note: "Fragment 不支持属性筛选。直接开始搜索即可。", attr_search: "搜索",
    no_alerts: "暂无提醒", alerts_hint: "将礼物加入关注列表，当价格低于你的设定时获得提醒。",
    add_alert: "添加提醒", watchlist: "关注列表",
    no_saved: "暂无收藏的礼物。",
    community: "社区", support: "联系客服", comm_chat: "社区群组", comm_channel: "社区频道",
    inside_majek: "Inside Majek", gifttrove_otc: "GiftTrove OTC", about_legal: "关于与法律", data_cleared: "您的数据已清除", data_clear_failed: "无法清除数据。请在 Telegram 中打开 GiftTrove 后重试。",
    support_builder: "支持开发者", donate: "捐赠",
    donate_desc: "GiftTrove 是免费的。请输入您想捐赠的 GRAM 数量。",
    amount_ton: "数量 (GRAM)", verify_tx: "验证交易", tx_id: "交易 ID",
    thank_you: "感谢您的慷慨支持！",
    referrals: "推荐", copy_ref: "复制推荐链接", ref_count: "推荐人数",
    any: "任何", rarity: "稀有度", language: "语言",
    wallet_redirect: "您将被跳转到 {w}，地址和金额已预填——请确认即可。",
    tg_copy_note: "Telegram 钱包没有转账链接。点击下方复制地址，然后从 @wallet 发送 {amt} GRAM。",
    copy_address: "复制地址", address_copied: "地址已复制——请从 @wallet 发送",
    listed_value: "挂单价", buy_now: "购买 / 查看", buy: "购买", sold: "已售出", save_gift: "收藏", remove_saved: "取消收藏", share_gift: "分享",
    floor: "地板价", view_on: "在 Telegram 中打开", saved_done: "已加入收藏", link_copied: "推荐链接已复制",
  },
};

// ─── STYLES (background color UNCHANGED) ──────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg-base: #f2f2f7;
    --bg-gradient: radial-gradient(130% 140% at 50% -15%, rgba(51,65,85,0.92) 0%, rgba(51,65,85,0.68) 30%, rgba(51,65,85,0.40) 55%, rgba(51,65,85,0.18) 75%, #f2f2f7 95%);
    --bg-sheet: rgba(255, 255, 255, 0.75);
    --bg-card: rgba(255, 255, 255, 0.6);
    --bg-input: rgba(118, 118, 128, 0.12);
    --bg-input-strong: rgba(255, 255, 255, 0.55);
    --bg-hover: rgba(0, 0, 0, 0.05);
    --text-primary: #000000;
    --text-secondary: rgba(60, 60, 67, 0.6);
    --border: rgba(0, 0, 0, 0.05);
    --tg-blue: #007aff;
    --blur: blur(40px) saturate(200%);
    --radius-xl: 32px;
    --radius-lg: 20px;
    --radius-md: 14px;
    --tab-h: 84px;
    --safe-bottom: env(safe-area-inset-bottom, 16px);
    --safe-top: env(safe-area-inset-top, 0px);
    --font: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
    --bounce: cubic-bezier(0.32, 0.72, 0, 1);
  }

  [data-theme="dark"] {
    --bg-base: #000000;
    --bg-gradient: radial-gradient(120% 120% at 50% -20%, rgba(10, 132, 255, 0.15) 0%, #000000 100%);
    --bg-sheet: rgba(28, 28, 30, 0.75);
    --bg-card: rgba(28, 28, 30, 0.5);
    --bg-input: rgba(44, 44, 46, 0.6);
    --bg-input-strong: rgba(44, 44, 46, 0.85);
    --bg-hover: rgba(58, 58, 60, 0.8);
    --text-primary: #ffffff;
    --text-secondary: rgba(235, 235, 245, 0.6);
    --border: rgba(255, 255, 255, 0.1);
    --tg-blue: #0a84ff;
  }

  body {
    font-family: var(--font);
    background: var(--bg-base);
    background-image: var(--bg-gradient);
    background-attachment: fixed;
    color: var(--text-primary);
    -webkit-font-smoothing: antialiased;
    overscroll-behavior: none;
    transition: background 0.4s ease, color 0.4s ease;
    height: 100vh; overflow: hidden;
  }

  /* ─── LAUNCH SPLASH ─── */
  .splash {
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    background: #0a0e1a;
    background-image: radial-gradient(120% 75% at 50% 105%, rgba(10,132,255,0.42) 0%, rgba(15,45,110,0.22) 45%, #0a0e1a 82%);
    opacity: 1; transition: opacity 0.45s ease;
  }
  [data-theme="light"] .splash {
    background: #f2f2f7;
    background-image: radial-gradient(130% 120% at 50% -10%, rgba(51,65,85,0.88) 0%, rgba(51,65,85,0.44) 45%, #f2f2f7 80%);
  }
  .splash-leaving { opacity: 0; pointer-events: none; transition: opacity 0.45s ease; }
  .splash-glow {
    position: absolute; width: 400px; height: 400px; border-radius: 50%;
    background: radial-gradient(circle, rgba(10,132,255,0.30) 0%, transparent 65%);
    filter: blur(52px); animation: splashGlow 3.2s ease-in-out infinite;
  }
  @keyframes splashGlow { 0%,100% { transform: scale(0.88); opacity: 0.6; } 50% { transform: scale(1.14); opacity: 1; } }
  /* Full-height layout: eyebrow+hero cluster near the top; mascot+bar docked
     low, just above the tagline — a plain, calm composition with a single
     ambient glow behind it. No rings, sparks, beam, or watermark. */
  .splash-layout { position: relative; z-index: 1; width: 100%; height: 100%;
    display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
    padding: calc(64px + var(--safe-top, 0px)) clamp(16px, 5vw, 24px) calc(40px + var(--safe-bottom, 16px)); box-sizing: border-box; }
  .splash-top { display: flex; flex-direction: column; align-items: center; text-align: center; }
  .splash-eyebrow { font-size: clamp(8.5px, 2.8vw, 12px); font-weight: 800; letter-spacing: clamp(1.5px, 0.6vw, 3px); text-transform: uppercase;
    color: rgba(255,255,255,0.42); margin-bottom: 3px; animation: splashRise 0.5s var(--bounce) 0.05s both; }
  [data-theme="light"] .splash-eyebrow { color: var(--text-secondary); }
  .splash-hero {
    font-size: clamp(32px, 12vw, 52px); font-weight: 900; letter-spacing: -1.2px; text-transform: uppercase;
    color: #fff; line-height: 1; text-shadow: 0 4px 32px rgba(10,132,255,0.55);
    animation: splashRise 0.55s var(--bounce) 0.12s both;
  }
  [data-theme="light"] .splash-hero { color: #14171f; text-shadow: 0 2px 16px rgba(51,65,85,0.25); }
  @supports (-webkit-background-clip: text) {
    .splash-hero {
      background: linear-gradient(100deg, #fff 26%, #FFAB00 42%, #54c5f8 58%, #fff 78%);
      background-size: 240% 100%;
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
      animation: splashRise 0.55s var(--bounce) 0.12s both, brandSweep 3.2s ease-in-out 0.7s infinite;
    }
  }
  @keyframes brandSweep { 0% { background-position: 130% 0; } 100% { background-position: -130% 0; } }
  @keyframes splashRise { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: translateY(0); } }
  /* Subject docks toward the bottom (margin-top: auto eats the leftover space
     above it) so the mascot sits low, right above the tagline — not centred
     in the middle of the screen. */
  .splash-subject { display: flex; flex-direction: column; align-items: center; margin-top: auto; }
  .splash-footer { display: flex; flex-direction: column; align-items: center; margin-top: 18px; }
  /* Fixed-size stage the mascot + badges live in — absolute positions inside it
     are the same on every device, which is what keeps the cluster looking
     deliberate instead of shifting around with viewport width. */
  .splash-orbit-wrap { position: relative; width: 290px; height: 290px; display: flex; align-items: center; justify-content: center;
    /* Self-adjusting safety valve: on any viewport narrower than the ~332px
       this cluster (290px stage + badge/charm overflow) needs, shrink the
       WHOLE thing proportionally instead of letting badges/stickers clip
       off-screen. Reference math is exact, not a guessed breakpoint, so it
       holds for any device width rather than only the ones this got tested
       against. */
    --orbit-scale: min(1, (100vw - 56px) / 332px);
    transform: scale(var(--orbit-scale)); }
  .splash-mascot { width: 204px; height: 204px; object-fit: contain; position: relative; z-index: 2;
    filter: drop-shadow(0 16px 28px rgba(0,0,0,0.32));
    animation: splashBob 2.6s ease-in-out infinite; }
  @keyframes splashBob { 0%,100% { transform: translateY(0) rotate(-1.5deg); } 50% { transform: translateY(-12px) rotate(1.5deg); } }
  /* Marketplace badges — inner triangle, the visual anchors. Dark glass so the
     white Telegram/Fragment marks and the blue MarketApp mark all read clearly. */
  .splash-badge { position: absolute; z-index: 3; width: 46px; height: 46px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: rgba(12,18,32,0.72); border: 1px solid rgba(255,255,255,0.16);
    backdrop-filter: blur(10px) saturate(160%); -webkit-backdrop-filter: blur(10px) saturate(160%);
    box-shadow: 0 8px 20px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.14);
    opacity: 0; animation: badgeIn 0.5s var(--bounce) forwards, badgeFloat 3.4s ease-in-out 0.5s infinite; }
  .splash-badge img { width: 24px; height: 24px; object-fit: contain; }
  .b-tg   { top: 4px;   left: -8px; }
  .b-frag { top: 24px;  right: -12px; }
  .b-ma   { bottom: -4px; left: 50%; margin-left: -23px; }
  @keyframes badgeIn { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: scale(1); } }
  @keyframes badgeFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  /* Gift-sticker charms — outer triangle, interleaved in the gaps between the
     badges. Smaller and unbadged (no backing) so they stay secondary. */
  .splash-charm { position: absolute; z-index: 1; opacity: 0; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.25));
    animation: charmIn 0.5s var(--bounce) forwards, charmFloat 3.8s ease-in-out 0.5s infinite; }
  [data-theme="light"] .splash-charm { filter: none; }
  .splash-charm-img { display: block; width: 50px; height: 50px; object-fit: contain; }
  .c-durov { top: -24px; left: 46%; margin-left: -30px; }
  .c-durov .splash-charm-img { width: 60px; height: 60px; }
  .c-cat   { top: 100px; left: -22px; }
  .c-cream { top: 140px; right: -20px; }
  @keyframes charmIn { from { opacity: 0; transform: scale(0.3); } to { opacity: 0.92; transform: scale(1); } }
  .splash-tagline { font-size: clamp(9.5px, 3.3vw, 13px); font-weight: 700; color: rgba(255,255,255,0.7); letter-spacing: 0.2px;
    max-width: 92vw; text-align: center; animation: splashRise 0.5s var(--bounce) 0.24s both; }
  [data-theme="light"] .splash-tagline { color: var(--text-secondary); }
  /* Single solid brand-blue bar — no multi-colour gradient. */
  .splash-bar { position: relative; width: 140px; height: 4px; border-radius: 100px; background: rgba(255,255,255,0.15); overflow: hidden;
    margin-top: 26px; animation: splashRise 0.55s var(--bounce) 0.28s both; }
  [data-theme="light"] .splash-bar { background: rgba(0,0,0,0.12); }
  .splash-bar span { display: block; height: 100%; width: 100%; border-radius: 100px;
    background: var(--tg-blue);
    transform: scaleX(0.06); transform-origin: left center;
    animation: splashFill var(--splash-ms, 3000ms) cubic-bezier(0.22, 0.68, 0.3, 1) forwards; }
  @keyframes splashFill { to { transform: scaleX(1); } }
  .splash-bar::after { content: ""; position: absolute; inset: 0; border-radius: 100px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent);
    transform: translateX(-130%); animation: splashBar 1.4s ease-in-out 0.35s infinite; }
  @keyframes splashBar { 0% { transform: translateX(-130%); } 100% { transform: translateX(130%); } }
  /* profile identity header — brand banner, big centered avatar, white name */
  .profile-hero { display: flex; flex-direction: column; align-items: center; text-align: center;
    gap: 5px; margin: 0 0 18px; padding: 30px 20px 26px; border-radius: 26px;
    background: linear-gradient(155deg, #1FA8F0 0%, #0A84FF 70%, #0061d1 100%);
    box-shadow: 0 16px 40px rgba(10,132,255,0.28);
    position: relative; overflow: hidden; }
  .profile-hero-content { display: flex; flex-direction: column; align-items: center; gap: 5px;
    position: relative; z-index: 1; }
  /* Decorative brand mark — big, flipped, rotated "upward", anchored past the
     bottom-right corner so the container's own overflow:hidden crops it down
     to just the half facing back into the card. Pure decoration: aria-hidden,
     no pointer events, low opacity so it never competes with the real content. */
  .profile-hero-logo-deco { position: absolute; z-index: 0; pointer-events: none;
    width: 220px; height: 220px; right: -70px; bottom: -70px;
    opacity: 0.16; transform: scaleX(-1) rotate(-56deg); filter: brightness(0) invert(1); }
  .profile-hero-avatar { width: 120px; height: 120px; border-radius: 50%; object-fit: cover;
    background: rgba(255,255,255,0.18); border: 4px solid rgba(255,255,255,0.92);
    box-shadow: 0 10px 26px rgba(0,0,0,0.22); margin-bottom: 12px; }
  .profile-hero-name { font-size: 25px; font-weight: 800; color: #ffffff;
    letter-spacing: -0.5px; line-height: 1.15; text-shadow: 0 1px 8px rgba(0,0,0,0.16); }
  .profile-hero-joined { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.88); }

  /* splash gift tiles (Plush Pepe hero + 2 sides) */
  .splash-gifts { display: flex; align-items: center; justify-content: center; gap: 14px; height: 132px; margin-bottom: 2px; }
  .splash-gift { display: flex; align-items: center; justify-content: center; border-radius: 22px;
    background: var(--bg-card); border: 1px solid var(--border);
    backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%);
    box-shadow: 0 10px 30px rgba(0,0,0,0.14); }
  .splash-gift.sg-hero { width: 124px; height: 124px; animation: sgHero 3s ease-in-out infinite, sgIn 0.6s var(--bounce) both; z-index: 2; }
  .splash-gift.sg-left, .splash-gift.sg-right { width: 84px; height: 84px; opacity: 0.96; }
  .splash-gift.sg-left { animation: sgFloat 3.2s ease-in-out infinite, sgIn 0.6s var(--bounce) 0.08s both; transform-origin: center; }
  .splash-gift.sg-right { animation: sgFloat 3.2s ease-in-out infinite 0.4s, sgIn 0.6s var(--bounce) 0.16s both; }
  @keyframes sgHero { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-7px) scale(1.03); } }
  @keyframes sgFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  @keyframes sgIn { from { opacity: 0; transform: translateY(16px) scale(0.85); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .splash-gift-ph { width: 100%; height: 100%; border-radius: 20px; }
  .splash-gift-ph.big { border-radius: 22px; }

  /* ─── ANIMATED ICON KEYFRAMES (dependency-free) ─── */
  .ai { display: block; }
  .tab-logo-icon { border-radius: 7px; }
  .ai-bell { animation: aiBell .85s ease-in-out; transform-origin: top center; }
  @keyframes aiBell { 0%,100% { transform: rotate(0); } 15% { transform: rotate(-13deg); } 35% { transform: rotate(11deg); } 55% { transform: rotate(-8deg); } 75% { transform: rotate(6deg); } }
  .ai-bookmark { animation: aiBookmark .7s ease-out; transform-origin: center; }
  @keyframes aiBookmark { 0% { transform: scaleY(1) scaleX(1); } 30% { transform: scaleY(1.28) scaleX(.88); } 55% { transform: scaleY(.9) scaleX(1.1); } 78% { transform: scaleY(1.04) scaleX(.97); } 100% { transform: scaleY(1) scaleX(1); } }
  .ai-user { animation: aiUser .6s ease-out; transform-origin: center; }
  @keyframes aiUser { 0% { transform: scale(.55); opacity: .25; } 60% { transform: scale(1.12); } 100% { transform: scale(1); opacity: 1; } }
  .ai-globe { animation: aiGlobe .75s ease-in-out; transform-origin: center; }
  @keyframes aiGlobe { from { transform: rotate(0); } to { transform: rotate(360deg); } }
  .ai-refresh .ai-refresh-g { animation: aiSpin .8s ease-in-out; transform-origin: 12px 12px; transform-box: fill-box; }
  .ai-spin .ai-refresh-g { animation: aiSpin .8s linear infinite; transform-origin: 12px 12px; transform-box: fill-box; }
  .ai-loader .ai-refresh-g { transform-origin: 12px 12px; transform-box: fill-box; }
  .icon-btn:hover .ai-loader:not(.ai-spin) .ai-refresh-g,
  .ai-loader:not(.ai-spin):hover .ai-refresh-g { animation: aiSpin 1s linear infinite; }
  @keyframes aiSpin { to { transform: rotate(360deg); } }
  .ai-contrast .ai-contrast-half { animation: aiContrast .6s ease; transform-origin: 12px 12px; transform-box: fill-box; }
  .ai-contrast-rot { transform-origin: 12px 12px; transform-box: fill-box; transition: transform .55s cubic-bezier(.34,1.56,.64,1); }
  .icon-btn:hover .ai-contrast-rot, svg.ai:hover .ai-contrast-rot, .ai-contrast .ai-contrast-rot { transform: rotate(180deg); }
  @keyframes aiContrast { from { transform: rotate(0); } to { transform: rotate(180deg); } }

  /* ─── DESKTOP ─── */
  .desktop-layout { display: flex; height: 100vh; overflow: hidden; }
  .desktop-sidebar {
    width: 260px; flex-shrink: 0; display: flex; flex-direction: column;
    background: var(--bg-sheet); backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    border-right: 1px solid var(--border); padding: 24px 0; gap: 4px; z-index: 10;
  }
  .desktop-logo { padding: 8px 24px 20px; font-size: 22px; font-weight: 800; color: var(--text-primary);
    letter-spacing: -0.5px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border); margin-bottom: 8px; }
  .desktop-nav-btn {
    display: flex; align-items: center; gap: 12px; padding: 14px 24px; font-size: 16px; font-weight: 600;
    color: var(--text-secondary); cursor: pointer; transition: all 0.2s; border: none; background: transparent;
    font-family: var(--font); text-align: left; margin: 0 12px; border-radius: 12px;
  }
  .desktop-nav-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
  .desktop-nav-btn.active { background: var(--tg-blue); color: #fff; }
  .desktop-nav-btn.active svg { stroke: #fff; }
  .desktop-content { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 32px 48px; max-width: 900px; }
  .desktop-content::-webkit-scrollbar { width: 6px; }
  .desktop-content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  .desktop-sidebar-bottom { margin-top: auto; padding: 16px; display: flex; gap: 8px; border-top: 1px solid var(--border); }

  .app-container { height: 100vh; display: flex; flex-direction: column; position: relative; }

  .top-nav { display: flex; justify-content: space-between; align-items: center; padding: calc(16px + var(--safe-top)) 24px 16px; z-index: 50; }
  .top-icons { display: flex; gap: 16px; }
  .icon-btn {
    background: var(--bg-card); backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    border: 1px solid var(--border); border-radius: 50%; width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-primary);
    transition: transform 0.2s var(--bounce);
  }
  .icon-btn:active { transform: scale(0.9); }

  .content { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 0 24px calc(var(--tab-h) + var(--safe-bottom) + 20px); }
  .content::-webkit-scrollbar { display: none; }

  .ptr-container { position: relative; }
  .ptr-indicator { position: absolute; top: -60px; left: 0; right: 0; height: 60px; display: flex; align-items: center; justify-content: center; z-index: 100; transition: top 0.3s var(--bounce); }
  .ptr-indicator.visible { top: 0; }
  .ptr-spinner { width: 28px; height: 28px; border-radius: 50%; border: 2.5px solid rgba(0,122,255,0.15); border-top-color: var(--tg-blue); border-right-color: var(--tg-blue); }
  .ptr-spinner.spinning { animation: iosSpin 0.7s cubic-bezier(0.4,0,0.2,1) infinite; }
  .ptr-spinner-wrap { color: var(--tg-blue); display: flex; align-items: center; justify-content: center; }
  @keyframes iosSpin { 100% { transform: rotate(360deg); } }

  /* ─── SCOUTING LOADER (white, bold, consistent) ─── */
  .scouting-overlay { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64px 24px; text-align: center; animation: fadeInUp 0.4s var(--bounce) forwards; }
  .scouting-spinner { width: 52px; height: 52px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.22); border-top-color: #fff; border-right-color: #fff; animation: iosSpin 0.7s cubic-bezier(0.4,0,0.2,1) infinite; margin-bottom: 26px; }
  .scouting-title { font-size: 19px; font-weight: 700; color: #ffffff; margin-bottom: 8px; letter-spacing: -0.2px; }
  [data-theme="light"] .scouting-title { color: var(--text-primary); }
  .scouting-sub { font-size: 15px; font-weight: 700; color: #ffffff; opacity: 0.82; line-height: 1.4; }
  .scouting-markets { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 26px; }
  .scouting-market-chip { padding: 6px 14px; border-radius: 100px; font-size: 13px; font-weight: 700; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.18); color: #fff; animation: scoutChipPulse 1.5s ease-in-out infinite; }
  [data-theme="light"] .scouting-market-chip { background: rgba(0,0,0,0.06); border-color: rgba(0,0,0,0.1); color: var(--text-primary); }
  .scouting-market-chip:nth-child(2){animation-delay:.2s}.scouting-market-chip:nth-child(3){animation-delay:.4s}.scouting-market-chip:nth-child(4){animation-delay:.6s}.scouting-market-chip:nth-child(5){animation-delay:.8s}
  @keyframes scoutChipPulse { 0%,100% { opacity: .55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); background: rgba(255,255,255,0.22); } }

  /* ─── PROMO BANNER ─── */
  .promo-banner { width: 100%; border-radius: 20px; overflow: hidden; margin-bottom: 24px; position: relative; cursor: pointer; aspect-ratio: 1500 / 450; box-shadow: 0 0 0 1.5px rgba(255,255,255,0.85), 0 0 0 3px rgba(0,0,0,0.55), 0 8px 32px rgba(0,0,0,0.18); }
  .promo-banner-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 20px; transition: opacity 0.7s ease; }
  .promo-banner-img.active { opacity: 1; z-index: 2; } .promo-banner-img.inactive { opacity: 0; z-index: 1; }
  .promo-banner-overlay { position: absolute; inset: 0; border-radius: 20px; z-index: 3; pointer-events: none; overflow: hidden; }
  .promo-spiral { position: absolute; border-radius: 50%; filter: blur(28px); opacity: 0.45; animation: spiralRotate 6s linear infinite; }
  .promo-spiral-1 { width: 120px; height: 120px; background: radial-gradient(circle, rgba(255,45,85,0.7) 0%, transparent 70%); top: -30px; left: -30px; animation-duration: 7s; }
  .promo-spiral-2 { width: 100px; height: 100px; background: radial-gradient(circle, rgba(52,199,89,0.7) 0%, transparent 70%); bottom: -20px; right: 10%; animation-duration: 9s; animation-direction: reverse; }
  .promo-spiral-3 { width: 80px; height: 80px; background: radial-gradient(circle, rgba(0,122,255,0.7) 0%, transparent 70%); top: 10%; right: -20px; animation-duration: 5s; }
  @keyframes spiralRotate { 0% { transform: rotate(0deg) translate(18px,18px) rotate(0deg); } 100% { transform: rotate(360deg) translate(18px,18px) rotate(-360deg); } }
  .promo-dots { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; z-index: 4; }
  .promo-dot { width: 6px; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.5); transition: all 0.3s ease; }
  .promo-dot.active { width: 18px; background: rgba(255,255,255,0.95); }
  .promo-banner::after { content: ""; position: absolute; inset: 0; border-radius: 20px; z-index: 5; pointer-events: none; background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%, rgba(0,0,0,0.08) 100%); border: 1px solid rgba(255,255,255,0.2); }

  /* ─── HERO TITLE (bolder; image at end, text-height) ─── */
  .hero-title { font-size: 34px; font-weight: 800; letter-spacing: -1px; line-height: 1.15; margin-bottom: 24px; color: #ffffff; }
  .hero-title.desktop { font-size: 40px; letter-spacing: -1px; }
  .hero-title-img { display: inline-block; height: 1.18em; width: auto; vertical-align: -0.24em; margin-left: 10px; border-radius: 9px; }

  .section-label { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }

  .input-group { margin-bottom: 24px; position: relative; }
  .ios-input { width: 100%; padding: 18px 20px; border-radius: var(--radius-lg); background: var(--bg-input); border: 1px solid transparent; color: var(--text-primary); font-size: 17px; outline: none; backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur); transition: all 0.3s; font-family: var(--font); }
  .ios-input:focus { border-color: var(--tg-blue); background: var(--bg-card); }

  .suggestions-dropdown { position: absolute; top: 100%; left: 0; right: 0; z-index: 10; background: var(--bg-sheet); backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur); border: 1px solid var(--border); border-radius: var(--radius-lg); max-height: 240px; overflow-y: auto; margin-top: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
  .suggestions-dropdown::-webkit-scrollbar { display: none; }
  .suggestion-item { padding: 14px 20px; border-bottom: 1px solid var(--border); cursor: pointer; font-size: 16px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 10px; }
  .suggestion-item:last-child { border-bottom: none; } .suggestion-item:active { background: var(--bg-hover); }
  .suggestion-gift-img { width: 30px; height: 30px; border-radius: 7px; object-fit: cover; flex-shrink: 0; background: var(--bg-input); }

  .select-btn { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 16px 20px; border-radius: var(--radius-lg); background: var(--bg-card); border: 1px solid var(--border); backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur); font-size: 17px; font-weight: 500; cursor: pointer; color: var(--text-primary); transition: transform 0.2s var(--bounce), background 0.2s; }
  .select-btn:active { transform: scale(0.98); background: var(--bg-hover); }
  .select-btn:disabled { opacity: 0.5; }
  .chip-soon { opacity: 0.5; cursor: default; position: relative; }
  .chip-soon-tag { margin-left: 6px; font-size: 9px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; opacity: 0.8; vertical-align: middle; }
  .chip-info { display: inline-flex; align-items: center; margin-left: 5px; opacity: 0.85; cursor: pointer; vertical-align: middle; }
  .chip-info:active { opacity: 0.5; }
  .note-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(3px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 32px; animation: fadeIn .2s ease; }
  .note-pop { background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border); border-radius: 20px; padding: 20px 22px; max-width: 320px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: popIn .26s var(--bounce); transform-origin: center; }
  .note-pop-title { font-size: 16px; font-weight: 800; margin-bottom: 8px; }
  .note-pop-body { font-size: 14px; line-height: 1.55; color: var(--text-secondary); }
  .note-pop-btn { margin-top: 16px; width: 100%; border: none; background: var(--accent-grad); color: #fff; font-weight: 700; font-size: 14px; padding: 11px 0; border-radius: 12px; cursor: pointer; font-family: var(--font); }
  .select-val { color: var(--tg-blue); font-weight: 600; display: flex; align-items: center; gap: 4px; max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .chips-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; }
  .chip { padding: 12px 18px; border-radius: 100px; font-size: 15px; font-weight: 600; background: var(--bg-card); border: 1px solid var(--border); backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur); color: var(--text-secondary); cursor: pointer; transition: all 0.2s var(--bounce); }
  .chip:active { transform: scale(0.92); }
  .chip.active { background: var(--text-primary); color: var(--bg-base); border-color: transparent; }

  .action-btn { width: 100%; padding: 20px; border-radius: var(--radius-xl); border: none; background: var(--tg-blue); color: #fff; font-size: 18px; font-weight: 700; box-shadow: 0 8px 24px rgba(10,132,255,0.3); cursor: pointer; transition: all 0.3s var(--bounce); margin-top: 10px; font-family: var(--font); }
  .action-btn:active { transform: scale(0.96); box-shadow: 0 4px 12px rgba(10,132,255,0.2); }
  .action-btn:disabled { opacity: 0.5; filter: grayscale(1); }

  /* ─── BOTTOM TAB BAR (adaptive glass pill covers icon + label) ─── */
  .tab-bar-container { position: fixed; bottom: var(--safe-bottom); left: 24px; right: 24px; z-index: 40; }
  /* Back-to-top: amber gem pill floated above the tab bar, right-aligned so it
     never occludes card content. Transform-based show/hide is GPU-composited. */
  .back-to-top {
    position: fixed; z-index: 39;
    right: 28px; bottom: calc(var(--safe-bottom) + var(--tab-h) + 14px);
    width: 44px; height: 44px; border-radius: 50%;
    background: var(--bg-sheet);
    border: 1px solid var(--border);
    backdrop-filter: blur(22px) saturate(180%); -webkit-backdrop-filter: blur(22px) saturate(180%);
    box-shadow: 0 8px 28px rgba(0,0,0,0.22), inset 0 1px 0 var(--glass-hi), 0 0 0 1px rgba(10,132,255,0.18);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    color: var(--tg-blue);
    animation: bttIn 0.32s var(--bounce) both;
    transition: transform 0.18s var(--bounce), box-shadow 0.18s;
  }
  .back-to-top:active { transform: scale(0.88); box-shadow: 0 4px 14px rgba(0,0,0,0.18); }
  @keyframes bttIn { from { opacity: 0; transform: scale(0.6) translateY(14px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  .ios-tab-bar { display: flex; align-items: stretch; height: 72px; border-radius: 36px; padding: 6px; gap: 2px; background: var(--bg-sheet); border: 1px solid var(--border); backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur); box-shadow: 0 12px 44px rgba(0,0,0,0.20), inset 0 1px 0 var(--glass-hi); position: relative; }
  .tab-active-pill { position: absolute; top: 6px; bottom: 6px; border-radius: 28px; background: rgba(0,122,255,0.14); border: 1px solid rgba(0,122,255,0.22); backdrop-filter: blur(20px) saturate(200%); -webkit-backdrop-filter: blur(20px) saturate(200%); transition: left 0.38s var(--bounce), width 0.38s var(--bounce); pointer-events: none; z-index: 0; box-shadow: 0 4px 14px rgba(0,122,255,0.18); }
  [data-theme="dark"] .tab-active-pill { background: rgba(10,132,255,0.2); border-color: rgba(10,132,255,0.3); }
  .tab-btn { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; border: none; background: transparent; color: var(--text-secondary); font-family: var(--font); cursor: pointer; transition: color 0.3s; position: relative; z-index: 1; border-radius: 28px; min-width: 0; padding: 0 4px; }
  .tab-btn.active { color: var(--tg-blue); }
  .tab-icon { transition: transform 0.38s var(--bounce); }
  .tab-icon-active { transform: translateY(-2px) scale(1.12); }
  .tab-label { font-size: 10px; font-weight: 700; letter-spacing: 0.2px; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }

  /* ─── SHEETS ─── */
  .sheet-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.4); backdrop-filter: blur(5px); display: flex; align-items: flex-end; opacity: 0; animation: fadeIn 0.3s forwards; }
  .sheet-content { width: 100%; max-height: 82vh; border-radius: 32px 32px 0 0; padding: 12px 24px calc(40px + var(--safe-bottom)); background: var(--bg-sheet); border-top: 1px solid var(--border); backdrop-filter: blur(50px) saturate(200%); -webkit-backdrop-filter: blur(50px) saturate(200%); transform: translateY(100%); animation: slideUp 0.4s var(--bounce) forwards; overflow-y: auto; color: var(--text-primary); box-shadow: 0 -18px 60px rgba(0,0,0,0.30), inset 0 1px 0 var(--glass-hi); }
  .sheet-content::-webkit-scrollbar { display: none; }
  .sheet-handle { width: 40px; height: 5px; border-radius: 100px; background: var(--text-secondary); margin: 0 auto 24px; opacity: 0.5; }
  .sheet-title { font-size: clamp(17px, 5.5vw, 22px); font-weight: 800; margin-bottom: 20px; text-align: center; color: var(--text-primary); }

  .ios-group { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur); margin-bottom: 24px; box-shadow: inset 0 1px 0 var(--glass-hi); }
  .ios-row { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); cursor: pointer; color: var(--text-primary); font-size: 16px; font-weight: 500; }
  .ios-row:last-child { border-bottom: none; } .ios-row:active { background: var(--bg-hover); }
  .row-left { display: flex; align-items: center; gap: 12px; }
  .row-icon-box { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }

  .sheet-list-item { padding: 18px 20px; font-size: 17px; font-weight: 600; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; cursor: pointer; color: var(--text-primary); }
  .sheet-list-item:active { background: var(--bg-hover); } .sheet-list-item:last-child { border-bottom: none; }
  .sheet-model-item { padding: 14px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; cursor: pointer; color: var(--text-primary); }
  .sheet-model-item:active { background: var(--bg-hover); } .sheet-model-item:last-child { border-bottom: none; }
  .model-left { display: flex; align-items: center; gap: 10px; }
  .model-thumb { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; flex-shrink: 0; background: var(--bg-input); }
  .model-info { display: flex; flex-direction: column; }
  .model-name { font-size: 15px; font-weight: 600; }
  .model-rarity { font-size: 12px; font-weight: 700; padding: 1px 7px; border-radius: 6px; display: inline-block; }
  .rarity-ultra { color: #ff375f; background: rgba(255,55,95,0.12); }
  .rarity-rare { color: #bf5af2; background: rgba(191,90,242,0.12); }
  .rarity-uncommon { color: #0a84ff; background: rgba(10,132,255,0.12); }
  .rarity-common { color: var(--text-secondary); background: var(--bg-input); }
  .color-dot { width: 16px; height: 16px; border-radius: 50%; display: inline-block; border: 1px solid var(--border); flex-shrink: 0; }

  /* ─── RESULT CARDS ─── */
  .results-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 16px; }
  .results-grid.desktop { grid-template-columns: repeat(3, 1fr); }
  .result-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: clamp(10px, 4vw, 16px); position: relative; backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur); display: flex; flex-direction: column; transition: transform 0.2s var(--bounce); cursor: pointer; color: var(--text-primary); animation: cardIn 0.45s var(--bounce) both; }
  .result-card:active { transform: scale(0.96); }
  @keyframes cardIn { from { opacity: 0; transform: translateY(14px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .result-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .result-gift-img { width: 40px; height: 40px; border-radius: 10px; object-fit: cover; flex-shrink: 0; background: var(--bg-input); }
  .badge-buy { background: var(--tg-blue); color: #fff; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 6px; cursor: pointer; letter-spacing: 0.5px; white-space: nowrap; }
  .badge-sold { background: #ff3b30; color: #fff; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 6px; cursor: pointer; letter-spacing: 0.5px; white-space: nowrap; }
  .result-foot .badge-sold { font-size: 12px; padding: 7px 14px; border-radius: 9px; box-shadow: 0 6px 16px rgba(255,59,48,0.35); }

  .skeleton { position: relative; overflow: hidden; background: var(--bg-input); }
  .skeleton::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent); animation: shimmer 1.3s infinite; }
  [data-theme="dark"] .skeleton::after { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent); }
  @keyframes shimmer { 100% { transform: translateX(100%); } }
  .sk-line { height: 12px; border-radius: 6px; margin-top: 8px; }

  .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; min-height: 46vh; padding: 32px 20px; color: var(--text-secondary); }
  .empty-state > svg, .empty-state > div:first-child { margin: 0 auto; }
  .desktop-content .empty-state { min-height: 56vh; }
  .empty-state .es-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 14px 0 6px; }

  .page-header { font-size: clamp(24px, 8vw, 34px); font-weight: 800; letter-spacing: -0.6px; line-height: 1.15; margin-bottom: 24px; color: #ffffff; }
  .page-header.desktop { font-size: 40px; }

  .toast { position: fixed; top: calc(20px + var(--safe-top)); left: 50%; transform: translateX(-50%); white-space: nowrap; max-width: calc(100vw - 32px); background: rgba(0,0,0,0.85); color: #fff; padding: 12px 22px; border-radius: 100px; font-size: 14px; font-weight: 600; z-index: 9998; backdrop-filter: blur(10px); animation: toastIn 0.3s var(--bounce); box-shadow: 0 8px 30px rgba(0,0,0,0.3); }

  @keyframes fadeIn { to { opacity: 1; } }
  @keyframes slideUp { to { transform: translateY(0); } }
  .fade-in-up { animation: fadeInUp 0.5s var(--bounce) forwards; }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  @keyframes popIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }

  @media (min-width: 768px) { .mobile-only { display: none !important; } }
  @media (max-width: 767px) { .desktop-only { display: none !important; } }

  /* ── Bigger animated result card ─────────────────────────────────────── */
  .result-card:hover { transform: translateY(-3px); box-shadow: 0 14px 34px rgba(0,0,0,0.28); }
  .result-gift-hero { position: relative; display: flex; align-items: center; justify-content: center; padding: 12px 0 14px; border-radius: 16px; border: 1px solid var(--border); }

  .result-save { position: absolute; top: 4px; right: 4px; cursor: pointer; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5)); transition: transform .2s var(--bounce); }
  .result-save:active { transform: scale(0.82); }
  .result-name { font-size: clamp(12.5px, 3.6vw, 15px); font-weight: 800; line-height: 1.2; color: var(--text-primary); margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .sheet-title-row { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 4px; }
  .sheet-title-row .sheet-title { margin-bottom: 0; text-align: center; }
  .sheet-info-btn { background: none; border: none; padding: 2px; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; opacity: 0.7; flex-shrink: 0; }
  .sheet-info-btn:active { opacity: 1; color: var(--tg-blue); }
  .result-meta { font-size: clamp(10.5px, 3vw, 12px); color: var(--text-secondary); margin-bottom: 8px; display: flex; flex-direction: column; gap: 3px; }
  .meta-row { display: flex; align-items: center; gap: 6px; }
  .meta-icon-slot { display: flex; align-items: center; justify-content: center; width: 14px; height: 14px; flex-shrink: 0; }
  .result-model { font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; }
  .result-foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; }
  .result-price { font-size: clamp(14px, 4vw, 17px); font-weight: 800; color: var(--tg-blue); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .result-foot .badge-buy { font-size: 12px; padding: 7px 14px; border-radius: 9px; box-shadow: 0 6px 16px rgba(10,132,255,0.35); }

  /* ── Results header + filter bar ─────────────────────────────────────── */
  .results-head { display: flex; align-items: baseline; justify-content: space-between; margin: 2px 2px 12px; }
  .results-title { font-size: 34px; font-weight: 800; letter-spacing: -1px; line-height: 1.15; color: #ffffff; }
  .results-count { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
  .filter-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .sort-toggle { display: inline-flex; background: var(--bg-input); border: 1px solid var(--border); border-radius: 100px; padding: 4px; gap: 4px; }
  .sort-pill { border: none; background: transparent; color: var(--text-secondary); font-weight: 700; font-size: 13px; padding: 7px 14px; border-radius: 100px; cursor: pointer; font-family: var(--font); transition: all .25s var(--bounce); }
  .sort-pill.active { background: var(--tg-blue); color: #fff; box-shadow: 0 4px 12px rgba(10,132,255,0.35); }
  .range-mini { display: inline-flex; align-items: center; gap: 6px; }
  .range-input { width: 64px; padding: 9px 10px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-input-strong); color: var(--text-primary); font-size: 13px; font-family: var(--font); outline: none; backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur); }
  .range-input:focus { border-color: var(--tg-blue); }
  .range-dash { color: var(--text-secondary); }
  .range-go { border: none; background: var(--bg-input-strong); border: 1px solid var(--border); color: var(--text-primary); font-weight: 700; font-size: 13px; padding: 9px 14px; border-radius: 12px; cursor: pointer; font-family: var(--font); backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur); }
  .range-go:active { transform: scale(0.95); }
  .load-more-btn { width: 100%; margin-top: 18px; padding: 16px; border-radius: var(--radius-lg); border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary); font-weight: 700; font-size: 15px; cursor: pointer; font-family: var(--font); display: flex; align-items: center; justify-content: center; transition: all .2s var(--bounce); }
  .load-more-btn:hover { border-color: var(--tg-blue); }
  .load-more-btn:active { transform: scale(0.98); }
  .lm-spin { width: 18px; height: 18px; border: 2px solid var(--border); border-top-color: var(--tg-blue); border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── animate-ui style icon motion ────────────────────────────────────── */
  .ai { display: block; }
  .ai-search .ai-search-lens { transform-origin: 11px 11px; animation: aiSearchLens 0.9s var(--bounce); }
  .ai-search .ai-search-handle { animation: aiSearchHandle 0.9s var(--bounce); }
  @keyframes aiSearchLens { 0% { transform: scale(1) translate(0,0); } 40% { transform: scale(0.82) translate(2px,2px); } 100% { transform: scale(1) translate(0,0); } }
  @keyframes aiSearchHandle { 0%,100% { transform: translate(0,0); } 50% { transform: translate(2px,2px); } }
  .ai-clip .ai-clip-l1 { stroke-dasharray: 8; animation: aiClipLine 0.7s ease both; }
  .ai-clip .ai-clip-l2 { stroke-dasharray: 6; animation: aiClipLine 0.7s ease 0.08s both; }
  @keyframes aiClipLine { from { stroke-dashoffset: 8; opacity: 0.2; } to { stroke-dashoffset: 0; opacity: 1; } }
  .ai-contrast { animation: aiContrastSpin 0.9s var(--bounce); transform-origin: 12px 12px; }
  @keyframes aiContrastSpin { from { transform: rotate(-25deg); } to { transform: rotate(0deg); } }

  /* ── Floating background gifts (space / void) ────────────────────────── */
  .void-layer { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
  .void-gift { position: absolute; opacity: 0.14; filter: blur(0.3px); border-radius: 16px; object-fit: cover; will-change: transform; pointer-events: none; animation: voidFloat linear infinite; }
  @media (min-width: 768px) { .void-gift { pointer-events: auto; cursor: pointer; opacity: 0.46; filter: none; transition: opacity .3s, transform .3s; } .void-gift:hover { opacity: 0.78; transform: scale(1.1); } }
  @keyframes voidFloat { 0% { transform: translateY(8vh) translateX(0) rotate(0deg); } 50% { transform: translateY(-6vh) translateX(14px) rotate(8deg); } 100% { transform: translateY(8vh) translateX(0) rotate(0deg); } }
  /* drift-engine gifts: transforms are driven by JS each frame */
  .void-gift.drift { animation: none; transition: opacity .3s; will-change: transform, filter; }
  @media (min-width: 768px) { .void-gift.drift:hover { opacity: 0.85 !important; } }
  /* the void's black hole */
  .void-hole { position: absolute; width: 120px; height: 120px; margin: -60px 0 0 -60px; pointer-events: none; animation: holeIn .6s var(--ease) both; }
  .void-hole .vh-ring { position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(from 0deg, rgba(10,132,255,0.0), rgba(10,132,255,0.55), rgba(191,90,242,0.45), rgba(10,132,255,0.0)); animation: holeSpin 1.6s linear infinite; filter: blur(6px); }
  .void-hole .vh-core { position: absolute; inset: 22px; border-radius: 50%; background: radial-gradient(circle, #000 58%, rgba(0,0,0,0.85) 72%, transparent 100%); box-shadow: 0 0 34px rgba(10,132,255,0.35), inset 0 0 18px rgba(0,0,0,0.95); animation: holePulse 2.2s ease-in-out infinite; }
  @keyframes holeSpin { to { transform: rotate(360deg); } }
  @keyframes holePulse { 0%,100% { transform: scale(0.94); } 50% { transform: scale(1.06); } }
  @keyframes holeIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }

  /* ── Access gate ─────────────────────────────────────────────────────── */
  .gate { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 26px; text-align: center; position: relative; z-index: 2; }
  .gate-card { width: 100%; max-width: 380px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 28px; padding: 34px 26px; backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur); box-shadow: 0 24px 70px rgba(0,0,0,0.45); animation: fadeInUp 0.6s var(--bounce) both; }
  .gate-logo { width: 76px; height: 76px; border-radius: 22px; margin: 0 auto 18px; display: block; box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    background: linear-gradient(155deg, #1FA8F0, #0A84FF 70%, #0061d1); overflow: hidden; object-fit: contain; }
  .gate-title { font-size: 24px; font-weight: 800; color: var(--text-primary); margin-bottom: 10px; letter-spacing: -0.5px; }
  .gate-sub { font-size: 15px; line-height: 1.55; color: var(--text-secondary); margin-bottom: 22px; }
  .gate-sub a, .gate-note a { color: var(--tg-blue); font-weight: 700; text-decoration: none; cursor: pointer; }
  .gate-input { width: 100%; padding: 16px 18px; border-radius: 16px; border: 1.5px solid var(--border); background: var(--bg-input); color: var(--text-primary); font-size: 17px; text-align: center; letter-spacing: 3px; font-weight: 700; font-family: var(--font); outline: none; transition: border-color .2s; margin-bottom: 14px; }
  .gate-input:focus { border-color: var(--tg-blue); }
  .gate-input.err { border-color: #ff453a; animation: shake 0.4s; }
  @keyframes shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-8px); } 40%,80% { transform: translateX(8px); } }
  .gate-note { font-size: 12px; color: var(--text-secondary); margin-top: 16px; opacity: 0.7; }
  .gate-neterr { color: #ff9f0a; font-size: 12.5px; font-weight: 600; margin-top: 12px; line-height: 1.4; }

  /* ── Desktop compact mode ────────────────────────────────────────────── */
  .desktop-content.compact { max-width: 680px; margin: 0 auto; transform: scale(0.93); transform-origin: top center; }
  .desktop-mini-btn { margin-top: 8px; width: 100%; background: var(--bg-input); border: 1px solid var(--border); color: var(--text-secondary); border-radius: 12px; padding: 11px 12px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: var(--font); display: inline-flex; align-items: center; justify-content: center; gap: 7px; transition: all .2s var(--bounce); }
  .desktop-mini-btn:hover { border-color: var(--tg-blue); color: var(--text-primary); }
  .desktop-mini-btn:active { transform: scale(0.96); }

  /* keep interactive content above the floating-gift void layer */
  .app-container > .content { position: relative; z-index: 1; }
  .desktop-layout > .desktop-content { position: relative; z-index: 1; }
  .desktop-layout > .desktop-sidebar { position: relative; z-index: 2; }

  /* ═══════════════════ UI v2 — iOS 27 liquid glass (legible, fast) ═══════════════════ */
  :root {
    --accent: #0a84ff; --accent-2: #38b0ff;
    --accent-grad: linear-gradient(180deg, #3aacff 0%, #0a84ff 100%);
    --card-solid: rgba(255,255,255,0.92);
    --glass-hi: rgba(255,255,255,0.65);
    --shadow-card: 0 12px 30px rgba(15,23,42,0.10), 0 2px 8px rgba(15,23,42,0.05);
    --shadow-pop: 0 26px 64px rgba(15,23,42,0.26);
    --gold: #FFC93C;
    --radius-xl: 30px; --radius-lg: 22px; --radius-md: 16px; --radius-sm: 12px;
    --blur: blur(26px) saturate(180%);
    --spring: cubic-bezier(0.34, 1.45, 0.5, 1);
    --ease: cubic-bezier(0.22, 1, 0.36, 1);
  }
  [data-theme="dark"] {
    --card-solid: rgba(24,24,29,0.92);
    --glass-hi: rgba(255,255,255,0.14);
    --shadow-card: 0 12px 30px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3);
    --shadow-pop: 0 30px 72px rgba(0,0,0,0.62);
  }

  /* price + Telegram star */
  .price-tag { display: inline-flex; align-items: center; gap: 5px; font-variant-numeric: tabular-nums; }
  .cur-word { font-size: 0.62em; font-weight: 800; letter-spacing: 0.5px; color: var(--text-secondary); }
  .price-cur { font-size: 0.8em; font-weight: 800; opacity: 0.85; letter-spacing: 0.3px; }
  .result-view { font-size: 13px; font-weight: 700; color: var(--text-secondary); }

  /* result cards: NO blur (huge perf win across a long list) + crisp glass + top sheen */
  .result-card { background: var(--card-solid); backdrop-filter: none; -webkit-backdrop-filter: none; border-radius: var(--radius-lg); box-shadow: var(--shadow-card); padding: 12px; overflow: hidden; transition: transform .26s var(--ease), box-shadow .26s var(--ease); contain: content; }

  /* ── skeleton cards: anatomy matches the real result card exactly ── */
  .skel-card { position: relative; border-radius: var(--radius-lg); background: var(--card-solid);
    box-shadow: var(--shadow-card); padding: 12px; overflow: hidden;
    display: flex; flex-direction: column; }
  /* ① hero — same border-radius and visual padding as .result-gift-hero */
  .skel-hero { width: 100%; aspect-ratio: 1 / 1; border-radius: 16px; background: var(--bg-input); margin-bottom: 10px; }
  /* ② name — 80% width, matches .result-name font-height */
  .skel-name { height: 14px; width: 82%; border-radius: 7px; background: var(--bg-input); margin-bottom: 10px; }
  /* ③④ meta rows — two lines at different widths, matches .result-meta */
  .skel-meta { height: 10px; width: 55%; border-radius: 5px; background: var(--bg-input); margin-bottom: 5px; }
  .skel-meta-b { width: 40%; }
  /* ⑤ foot — price stub left, buy button stub right, matches .result-foot */
  .skel-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; padding-top: 8px; }
  .skel-price { height: 18px; width: 42%; border-radius: 6px; background: var(--bg-input); }
  .skel-btn { height: 30px; width: 58px; border-radius: 9px; background: var(--bg-input); }
  /* sweep shimmer — one wave traveling left-to-right across the whole card */
  .skel-card::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%);
    background: linear-gradient(90deg, transparent 0%, var(--glass-hi) 50%, transparent 100%);
    animation: skelSweep 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
  @keyframes skelSweep { to { transform: translateX(100%); } }
  /* LottieGift hero shimmer — same sweep as SkeletonCards, shown until the
     poster image actually paints so a still-loading real card never reads as
     a flat dead box (this was misread as "lag"). */
  .lg-shimmer { position: absolute; inset: 0; background: var(--bg-input); overflow: hidden; }
  .lg-shimmer::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%);
    background: linear-gradient(90deg, transparent 0%, var(--glass-hi) 50%, transparent 100%);
    animation: skelSweep 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
  /* old skel-line aliases kept for safety */
  .skel-line { height: 12px; border-radius: 6px; background: var(--bg-input); margin-top: 10px; }
  .skel-line.w70 { width: 70%; } .skel-line.w45 { width: 45%; }

  /* compact scouting strip above the skeleton grid */
  .scouting-strip { display: flex; align-items: center; gap: 14px; padding: 14px 16px; margin-top: 6px;
    border-radius: var(--radius-lg); background: var(--bg-card); border: 1px solid var(--border);
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    box-shadow: inset 0 1px 0 var(--glass-hi); }
  .scouting-strip .scouting-spinner { width: 26px; height: 26px; margin: 0; flex-shrink: 0; border-width: 2.5px;
    border-color: rgba(10,132,255,0.25); border-top-color: var(--tg-blue); border-right-color: var(--tg-blue); }
  .scouting-strip .scouting-title { font-size: 15px; }
  .scouting-strip .scouting-markets { display: flex; gap: 6px; margin: 6px 0 0; justify-content: flex-start; }
  .scouting-strip .scouting-market-chip { padding: 3px 9px; font-size: 11px; }
  .result-card::after { content: ""; position: absolute; top: 0; left: 12px; right: 12px; height: 1px; background: linear-gradient(90deg, transparent, var(--glass-hi), transparent); pointer-events: none; }
  .result-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-pop); }
  .result-gift-hero { background: radial-gradient(120% 90% at 50% 0%, rgba(120,140,200,0.16), rgba(120,140,200,0.02) 70%); }
  .result-price { font-size: 17px; font-weight: 800; color: var(--text-primary); }

  /* buttons: gradient + glow + gloss + spring press */
  .action-btn { background: var(--accent-grad); border-radius: var(--radius-lg); letter-spacing: 0.2px; box-shadow: 0 12px 26px rgba(10,132,255,0.36), inset 0 1px 0 rgba(255,255,255,0.45); position: relative; overflow: hidden; transition: transform .18s var(--spring), box-shadow .25s ease, opacity .2s; }
  .action-btn::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(255,255,255,0.28), transparent 48%); pointer-events: none; }
  .action-btn:hover { box-shadow: 0 16px 36px rgba(10,132,255,0.46), inset 0 1px 0 rgba(255,255,255,0.55); }
  .action-btn:active { transform: scale(0.975); }
  .action-btn:disabled { opacity: 0.4; box-shadow: none; transform: none; }

  /* inputs: focus glow */
  .ios-input { border-radius: var(--radius-md); border: 1px solid var(--border); transition: border-color .2s, box-shadow .2s, background .2s; }
  .ios-input:focus { border-color: var(--accent); box-shadow: 0 0 0 4px rgba(10,132,255,0.16); }
  .select-btn { border-radius: var(--radius-md); transition: transform .2s var(--spring), background .2s, border-color .2s; }
  .select-btn:active:not(:disabled) { transform: scale(0.985); }

  /* chips */
  .chip { border-radius: 100px; transition: transform .18s var(--spring), background .2s, color .2s, border-color .2s; }
  .chip:active { transform: scale(0.94); }
  .chip.active { background: var(--accent-grad); color: #fff; border-color: transparent; box-shadow: 0 6px 16px rgba(10,132,255,0.32); }

  /* tab bar: liquid glass + glossy pill + lift on active icon */
  .ios-tab-bar { border-radius: 34px; box-shadow: 0 12px 34px rgba(15,23,42,0.20), inset 0 1px 0 var(--glass-hi); }
  .tab-active-pill { background: linear-gradient(180deg, rgba(10,132,255,0.26), rgba(10,132,255,0.16)); border: 1px solid rgba(10,132,255,0.30); box-shadow: 0 6px 16px rgba(10,132,255,0.26), inset 0 1px 0 rgba(255,255,255,0.4); transition: left .42s var(--spring), width .42s var(--spring); }
  .tab-btn.active { color: var(--accent); }
  .tab-btn svg { transition: transform .2s var(--spring); }
  .tab-btn.active svg { transform: translateY(-1px) scale(1.06); }
  .icon-btn { box-shadow: inset 0 1px 0 var(--glass-hi); transition: transform .2s var(--spring), background .2s; }

  /* sheets + dropdown */
  .sheet { border-top-left-radius: var(--radius-xl); border-top-right-radius: var(--radius-xl); box-shadow: 0 -20px 60px rgba(0,0,0,0.3); }
  .sheet-handle { opacity: 0.35; }
  .suggestions-dropdown { border-radius: var(--radius-md); box-shadow: var(--shadow-pop); }

  /* desktop nav gloss */
  .desktop-nav-btn { border-radius: var(--radius-md); transition: background .2s, color .2s, transform .15s var(--spring); }
  .desktop-nav-btn.active { background: var(--accent-grad); box-shadow: 0 8px 20px rgba(10,132,255,0.3), inset 0 1px 0 rgba(255,255,255,0.4); }
  .desktop-content::-webkit-scrollbar { width: 10px; }
  .desktop-content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
  @media (min-width: 768px) { .promo-banner:hover { transform: translateY(-3px); transition: transform .3s var(--ease); } }

  /* results header / filter polish */
  .results-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .results-grid.desktop { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .results-title { letter-spacing: -1px; }
  .results-title.desktop { font-size: 40px; }
  .sort-pill { display: inline-flex; align-items: center; gap: 5px; }
  .sort-pill.active { background: var(--accent-grad); box-shadow: 0 4px 12px rgba(10,132,255,0.3); }
  .load-more-btn { border-radius: var(--radius-md); transition: transform .18s var(--spring), border-color .2s, background .2s; }

  /* gate premium glass */
  .gate-card { border-radius: 30px; box-shadow: var(--shadow-pop), inset 0 1px 0 var(--glass-hi); }

  /* floating gifts: drop blur filter for performance (opacity set above per-viewport) */
  .void-gift { filter: none; }

  /* ── swipeable sheets ── */
  .sheet-content.sheet-js { animation: none; transform: translateY(100%); will-change: transform; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
  .sheet-overlay.sheet-closing { animation: sheetFadeOut .28s forwards; }
  @keyframes sheetFadeOut { from { opacity: 1; } to { opacity: 0; } }
  .sheet-grab { width: 44px; height: 5px; border-radius: 100px; background: var(--text-secondary); opacity: 0.4; margin: 2px auto 22px; cursor: grab; transition: opacity .2s; }
  .sheet-drag { padding: 8px 0 4px; margin: -8px 0 0; touch-action: none; cursor: grab; }
  .sheet-drag:active { cursor: grabbing; }
  .sheet-grab:active { opacity: 0.7; }
  .sheet-content { box-shadow: 0 -24px 70px rgba(0,0,0,0.34); }

  /* ── catalog thumbnails (autocomplete + model/symbol pickers) ── */
  .gift-tile { width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: radial-gradient(120% 120% at 30% 20%, rgba(10,132,255,0.22), rgba(10,132,255,0.06)); color: var(--accent); border: 1px solid var(--border); }
  .gift-tile.sm { width: 34px; height: 34px; border-radius: 10px; }
  .gift-tile svg { width: 60%; height: 60%; }
  .suggestion-item { transition: background .15s; }
  .suggestion-item:active { background: var(--bg-hover); }

  /* ── extra polish / micro-interactions ── */
  .result-card { animation: cardIn .5s var(--ease) both; }
  @keyframes cardIn { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .badge-buy, .badge-sold { transition: transform .16s var(--spring), box-shadow .2s; }
  .badge-buy:active, .badge-sold:active { transform: scale(0.9); }
  .ios-row { transition: background .18s; }
  .sheet-list-item, .sheet-model-item { transition: background .18s; }
  .tab-btn:active svg { transform: scale(0.88); }
  .hero-title { letter-spacing: -1px; }
  ::selection { background: rgba(10,132,255,0.28); }
  * { -webkit-tap-highlight-color: transparent; }

  /* ── logo tile (rounded-square) — brand-blue container so the logo's own blue
        backdrop blends seamlessly into the tile (one blue shape, white C-ring) ── */
  .logo-tile { width: 46px; height: 46px; border-radius: 15px; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(155deg, #1FA8F0, #0A84FF 70%, #0061d1);
    border: 1px solid rgba(255,255,255,0.16); box-shadow: 0 8px 22px rgba(10,90,200,0.30), inset 0 1px 0 rgba(255,255,255,0.28);
    overflow: hidden; }
  .logo-tile img { width: 100%; height: 100%; object-fit: contain; }
  .logo-tile.lg { width: 58px; height: 58px; border-radius: 18px; }

  /* ── marketplace chips back to black & white when active ── */
  .chip.active { background: var(--text-primary); color: var(--bg-base); border-color: var(--text-primary); box-shadow: 0 6px 16px rgba(0,0,0,0.22); }

  /* ── picker thumbnails (real gift / model / symbol art) ── */
  .opt-thumb { width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; object-fit: cover; background: var(--bg-input); border: 1px solid var(--border); image-rendering: auto; }
  /* Symbols are black glyphs on transparent — give them a light tile so they read in dark mode */
  .opt-thumb.sym { object-fit: contain; padding: 5px; background: rgba(255,255,255,0.92); }
  [data-theme="dark"] .opt-thumb.sym { background: #ffffff; border-color: rgba(255,255,255,0.25); }
  .backdrop-swatch { width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; border: 1px solid var(--glass-hi); box-shadow: inset 0 1px 2px rgba(255,255,255,0.3); }

  /* ── share button in gift detail ── */
  .share-btn { width: 46px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-lg); border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary); cursor: pointer; transition: transform .16s var(--spring), background .2s, border-color .2s; }
  .share-btn:hover { border-color: var(--accent); color: var(--accent); }
  .share-btn:active { transform: scale(0.92); }

  /* ── admin analytics dashboard ── */
  .admin-screen { height: 100vh; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: calc(20px + var(--safe-top)) 18px calc(40px + var(--safe-bottom)); position: relative; z-index: 1; }
  .admin-head { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
  .admin-head-text { flex: 1; min-width: 0; }
  .admin-title { font-size: 28px; font-weight: 800; letter-spacing: -0.6px; color: var(--text-primary); line-height: 1.1; }
  .admin-sub { font-size: 13px; color: var(--text-secondary); font-weight: 600; }
  .admin-head-actions { display: flex; gap: 8px; }
  .admin-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 26px; }
  .admin-card { position: relative; background: var(--card-solid); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 18px 16px; box-shadow: var(--shadow-card); overflow: hidden; animation: cardIn .5s var(--ease) both; }
  .admin-card::after { content: ""; position: absolute; top: 0; left: 16px; right: 16px; height: 1px; background: linear-gradient(90deg, transparent, var(--glass-hi), transparent); }
  .admin-dot { position: absolute; top: 16px; right: 16px; width: 9px; height: 9px; border-radius: 50%; box-shadow: 0 0 12px currentColor; }
  .admin-card-val { font-size: 30px; font-weight: 800; letter-spacing: -1px; color: var(--text-primary); font-variant-numeric: tabular-nums; line-height: 1; }
  .admin-card-label { font-size: 12.5px; font-weight: 600; color: var(--text-secondary); margin-top: 7px; }
  .admin-section-title { font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.6px; margin: 4px 4px 12px; }
  .admin-list { background: var(--card-solid); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-card); margin-bottom: 24px; }
  .admin-row { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--border); animation: fadeInUp .4s var(--ease) both; }
  .admin-row:last-child { border-bottom: none; }
  .admin-rank { width: 24px; height: 24px; border-radius: 8px; background: var(--bg-input); color: var(--text-secondary); font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .admin-gift { flex: 1; font-size: 15px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .admin-count { font-size: 15px; font-weight: 800; color: var(--accent); font-variant-numeric: tabular-nums; }
  .admin-empty { padding: 22px 16px; text-align: center; color: var(--text-secondary); font-size: 14px; }
  .admin-actions { display: flex; flex-direction: column; gap: 10px; }
  .admin-action-2 { width: 100%; padding: 15px; border-radius: var(--radius-lg); border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary); font-weight: 700; font-size: 15px; cursor: pointer; font-family: var(--font); transition: transform .16s var(--spring), border-color .2s; }
  .admin-action-2:hover { border-color: var(--accent); }
  .admin-action-2:active { transform: scale(0.98); }
  .admin-foot { text-align: center; font-size: 11.5px; color: var(--text-secondary); opacity: 0.65; margin-top: 18px; }
  .admin-gate-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 70vh; max-width: 340px; margin: 0 auto; padding: 24px; text-align: center; }
  .admin-gate-title { font-size: 22px; font-weight: 800; margin-bottom: 6px; color: var(--text-primary); }
  .admin-gate-sub { font-size: 14px; color: var(--text-secondary); margin-bottom: 20px; }
  .admin-gate-err { font-size: 13px; color: #d12d4d; font-weight: 600; margin-top: 12px; }
  /* multi-select filter cap note */
  .filter-cap-note { font-size: 13px; font-weight: 600; color: var(--text-secondary); text-align: center; margin-bottom: 14px; }
  .filter-cap-note.upsell { color: var(--tg-blue); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 2px; }
  /* premium sheet */
  .premium-status { text-align: center; color: var(--text-secondary); font-size: 14px; margin: -6px 0 18px; }
  .plan-card { border: 1.5px solid var(--border); border-radius: var(--radius-lg); padding: 16px 18px; margin-bottom: 14px; background: var(--bg-card); }
  .plan-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
  .plan-name { font-size: 18px; font-weight: 800; }
  .plan-price { font-size: 20px; font-weight: 800; display: inline-flex; align-items: center; gap: 4px; color: var(--text-primary); }
  .plan-per { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
  .plan-perks { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .plan-perk { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text-primary); }
  .action-btn.secondary { background: var(--bg-input); color: var(--text-secondary); box-shadow: none; opacity: 1; }
  .hoton-cta { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: var(--radius-lg); background: linear-gradient(135deg, rgba(255,184,0,0.16), rgba(255,122,0,0.10)); border: 1px solid rgba(255,160,0,0.4); cursor: pointer; margin-bottom: 18px; box-shadow: 0 6px 20px rgba(255,150,0,0.12); transition: transform .18s var(--spring); }
  .hoton-cta:active { transform: scale(0.985); }
  .hoton-star { flex-shrink: 0; filter: drop-shadow(0 3px 8px rgba(255,150,0,0.4)); }
  .hoton-cta-body { flex: 1; min-width: 0; }
  .hoton-cta-title { font-weight: 700; font-size: 15px; color: var(--text-primary); }
  .hoton-cta-sub { font-size: 12.5px; color: var(--text-secondary); margin-top: 2px; }
  .vanity-box { border-top: 1px solid var(--border); padding-top: 18px; margin-bottom: 6px; }
  .vanity-help { font-size: 13px; color: var(--text-secondary); margin: 0 0 12px; }
  .ref-edit-btn { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); background: var(--bg-input); color: var(--tg-blue); cursor: pointer; flex-shrink: 0; }
  .ref-edit-btn:active { background: var(--bg-card); }
  .vanity-inline { display: block !important; cursor: default; padding: 12px 16px 16px !important; }
  .vanity-row { display: flex; gap: 10px; align-items: stretch; }
  .vanity-row .ios-input { padding: 14px 16px; font-size: 16px; letter-spacing: 0.06em; text-transform: uppercase; }
  .vanity-msg { font-size: 13px; font-weight: 600; color: var(--tg-blue); margin: 10px 0 0; }
  .vanity-current { font-size: 13px; color: var(--text-secondary); margin: 10px 0 0; }
  .premium-fineprint { font-size: 11.5px; line-height: 1.5; color: var(--text-secondary); opacity: 0.8; text-align: center; margin: 18px 0 4px; }
  /* promote-a-gift sheet */
  .promo-field-label { font-size: 13px; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 8px; }
  .promo-coll-list { max-height: 240px; overflow-y: auto; -webkit-overflow-scrolling: touch; border: 1px solid var(--border); border-radius: var(--radius-lg); margin-top: 10px; background: var(--bg-card); }
  .promo-coll-row { display: flex; align-items: center; gap: 12px; padding: 11px 14px; cursor: pointer; border-bottom: 1px solid var(--separator); font-size: 15px; font-weight: 600; }
  .promo-coll-row:last-child { border-bottom: none; }
  .promo-coll-row:active { background: var(--bg-input); }
  .promo-coll-img { width: 34px; height: 34px; border-radius: 9px; object-fit: cover; background: var(--bg-input); flex-shrink: 0; }
  .promo-coll-empty { padding: 18px 14px; text-align: center; font-size: 13px; color: var(--text-secondary); }
  .promo-chosen { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg-card); }
  .promo-change { background: none; border: none; color: var(--tg-blue); font-weight: 700; font-size: 14px; cursor: pointer; font-family: var(--font); padding: 4px 6px; }
  .promo-market-row { display: flex; gap: 10px; }
  .promo-market-btn { flex: 1; padding: 13px 0; border-radius: var(--radius-lg); border: 1.5px solid var(--border); background: var(--bg-card); color: var(--text-primary); font-size: 15px; font-weight: 700; cursor: pointer; font-family: var(--font); transition: all .2s var(--spring); }
  .promo-market-btn.active { border-color: #ff9f0a; background: linear-gradient(135deg, rgba(255,159,10,0.16), rgba(255,55,95,0.10)); color: #ff7a0a; }
  .promo-field { margin-bottom: 12px; }
  .promo-select { width: 100%; box-sizing: border-box; -webkit-appearance: none; appearance: none; background: var(--bg-input); border: 1px solid var(--border); border-radius: 14px; padding: 13px 40px 13px 14px; font-size: 15px; color: var(--text-primary); font-family: var(--font); cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; }
  /* promoted result card */
  .promo-card { position: relative; border: 1.5px solid rgba(255,159,10,0.5) !important; }
  .promo-badge { position: absolute; top: 8px; left: 8px; z-index: 2; background: linear-gradient(135deg, #ff9f0a, #ff375f); color: #fff; font-size: 10px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; padding: 4px 8px; border-radius: 8px; box-shadow: 0 4px 12px rgba(255,90,30,0.35); }
  .promo-flag { position: absolute; top: 8px; right: 8px; z-index: 3; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(0,0,0,0.4); color: #fff; cursor: pointer; }
  .promo-flag:active { background: rgba(0,0,0,0.6); }
  .promo-poster { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 14px; display: block; background: var(--bg-input); }
  .promo-amt { color: var(--text-primary); font-weight: 800; font-size: 15px; }
  .promo-amount-row { display: flex; gap: 10px; align-items: stretch; }
  .promo-hint { font-size: 11.5px; color: var(--text-secondary); opacity: 0.85; margin: 6px 2px 0; line-height: 1.45; }
  /* ── affiliate full-screen page ── */
  .aff-screen { position: fixed; inset: 0; z-index: 1400; background: var(--bg-base); background-image: var(--bg-gradient);
    display: flex; flex-direction: column; height: 100vh; height: 100dvh; overflow: hidden; animation: affSlideIn 0.34s var(--spring); }
  @keyframes affSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
  .aff-screen-leaving { animation: affSlideOut 0.26s ease forwards; }
  @keyframes affSlideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(6%); opacity: 0; } }
  .aff-topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: calc(14px + var(--safe-top, 0px)) 16px 14px;
    background: var(--bg-sheet);
    backdrop-filter: blur(30px) saturate(200%); -webkit-backdrop-filter: blur(30px) saturate(200%);
    box-shadow: inset 0 1px 0 var(--glass-hi), inset 0 -1px 0 var(--border), 0 8px 24px rgba(0,0,0,0.08);
    flex-shrink: 0; position: relative; z-index: 2; }
  .aff-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
    background: none; border: none; color: var(--tg-blue); cursor: pointer; font-size: 18px; }
  .aff-close { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    background: var(--bg-input); border: none; color: var(--text-secondary); cursor: pointer; flex-shrink: 0; }
  .aff-close:active { background: var(--bg-card); }
  .aff-topbar-title { font-size: clamp(15px, 5vw, 19px); font-weight: 800; color: var(--text-primary); }
  .aff-scroll { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;
    padding: 20px 16px calc(48px + env(safe-area-inset-bottom, 0px)); position: relative; z-index: 1; }
  /* hero balance card — richer than the old .aff-balance */
  .aff-hero-card { position: relative; padding: 22px 20px 18px; border-radius: 22px; margin-bottom: 16px; overflow: hidden;
    background: linear-gradient(135deg, rgba(48,209,88,0.18) 0%, rgba(10,132,255,0.12) 100%);
    border: 1px solid rgba(48,209,88,0.32); box-shadow: inset 0 1px 0 rgba(255,255,255,0.12); }
  .aff-hero-label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.55); letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 8px; }
  .aff-hero-value { font-size: clamp(26px, 8vw, 36px); font-weight: 900; color: var(--text-primary); display: flex; align-items: center; gap: 10px; letter-spacing: -0.6px; }
  .aff-hero-sub { font-size: 14px; color: var(--text-secondary); margin-top: 5px; }
  /* section headers */
  .aff-section-head { font-size: 12px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase;
    letter-spacing: 0.06em; margin: 0 2px 10px; }
  .aff-card-title { font-size: 12.5px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; margin: 18px 2px 14px; }
  /* stats grid */
  .aff-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 8px; }
  .aff-stat { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 12px 4px; text-align: center;
    box-shadow: inset 0 1px 0 var(--glass-hi); }
  .aff-stat-n { font-size: 18px; font-weight: 800; color: var(--text-primary); }
  .aff-stat-l { font-size: 10.5px; color: var(--text-secondary); margin-top: 2px; }
  /* chart wrapper */
  .aff-chart-wrap { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg);
    padding: 14px 12px 10px; box-shadow: inset 0 1px 0 var(--glass-hi); }
  .aff-chart-empty { height: 140px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-size: 14px; }
  .aff-chart-axis { display: flex; justify-content: space-between; margin-top: 6px; font-size: 11px; color: var(--text-secondary); }
  .aff-table { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--separator); }
  .aff-table-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 2px; font-size: 13px; }
  .aff-table-day { color: var(--text-secondary); font-weight: 600; }
  .aff-table-v { color: var(--text-secondary); font-weight: 700; font-variant-numeric: tabular-nums; }
  .aff-table-v.pos { color: #30d158; }
  /* payout rows */
  .aff-payout-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--separator); }
  .aff-payout-row:last-child { border-bottom: none; }
  .aff-payout-amt { font-weight: 700; font-size: 15px; color: var(--text-primary); }
  .aff-payout-date { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
  .aff-payout-status { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; }
  .st-paid { background: rgba(48,209,88,0.15); color: #30d158; }
  .st-requested { background: rgba(255,159,10,0.15); color: #ff9f0a; }
  .st-declined, .st-rejected { background: rgba(255,69,58,0.15); color: #ff453a; }
  .aff-locked-hero { text-align: center; padding: 22px 0 6px; }
  .aff-locked-icon { width: 64px; height: 64px; border-radius: 20px; margin: 0 auto 14px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0a84ff, #bf5af2); box-shadow: 0 10px 28px rgba(10,132,255,0.38); }
  .aff-locked-title { font-size: 19px; font-weight: 800; color: var(--text-primary); }
  .aff-locked-sub { font-size: 14px; color: var(--text-secondary); margin-top: 8px; line-height: 1.5; padding: 0 8px; }
  .aff-perk-row { display: flex; align-items: flex-start; gap: 12px; padding: 13px 16px; border-bottom: 1px solid var(--separator); font-size: 14px; color: var(--text-primary); line-height: 1.4; }
  .aff-perk-row:last-child { border-bottom: none; }
  .aff-perk-check { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    background: rgba(48,209,88,0.16); color: #30d158; margin-top: 1px; }
  .aff-perk-check svg { width: 13px; height: 13px; }
  .aff-preview-wrap { position: relative; border-radius: var(--radius-lg); overflow: hidden; }
  .aff-preview-blur { filter: blur(5px); opacity: 0.55; pointer-events: none; user-select: none; transform: scale(1.02); }
  .aff-preview-lock { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    color: var(--text-primary); }
  .aff-preview-lock svg { padding: 14px; border-radius: 50%; background: var(--bg-sheet); border: 1px solid var(--border);
    box-shadow: 0 8px 24px rgba(0,0,0,0.18), inset 0 1px 0 var(--glass-hi); }
  .aff-amount-row { display: flex; align-items: center; gap: 8px; }
  .aff-amount-row .ios-input { flex: 1; }
  .aff-max-btn { flex-shrink: 0; padding: 12px 16px; border-radius: 14px; border: 1px solid var(--border);
    background: var(--bg-input); color: var(--tg-blue); font-weight: 800; font-size: 13px;
    font-family: var(--font); cursor: pointer; }
  .aff-max-btn:active { background: var(--bg-card); }
  .aff-hint { font-size: 12.5px; color: var(--text-secondary); margin-top: 8px; padding: 0 2px; }
  .bc-wrap { display: flex; flex-direction: column; gap: 12px; }
  .cancel-link { display: block; width: 100%; margin-top: 18px; background: none; border: none; color: var(--text-secondary); font-size: 13px; font-weight: 600; font-family: var(--font); cursor: pointer; padding: 8px 0; text-align: center; opacity: 0.75; }
  .cancel-link:active { opacity: 1; color: #ff453a; }
  .cancel-confirm { margin-top: 18px; padding: 16px; border-radius: 16px; border: 1px solid var(--border); background: var(--bg-input); }
  .cancel-confirm-text { font-size: 13.5px; line-height: 1.5; color: var(--text-secondary); margin: 0 0 14px; }
  .cancel-confirm-row { display: flex; gap: 10px; }
  .cancel-confirm-row .bc-cancel { flex: 1; }
  .cancel-go { flex: 1; border: none; background: #ff453a; color: #fff; font-weight: 700; font-size: 14px; padding: 11px 0; border-radius: 12px; cursor: pointer; font-family: var(--font); }
  .cancel-go:disabled { opacity: 0.6; cursor: default; }
  .bc-count { font-size: 13px; font-weight: 700; color: var(--text-secondary); }
  .bc-text, .bc-img { width: 100%; box-sizing: border-box; background: var(--bg-input); border: 1px solid var(--border); border-radius: 14px; padding: 12px 14px; font-size: 14px; color: var(--text-primary); font-family: var(--font); resize: vertical; }
  .bc-text:focus, .bc-img:focus { outline: none; border-color: var(--accent); }
  .bc-result { font-size: 13px; font-weight: 600; padding: 10px 12px; border-radius: 12px; }
  .bc-result.ok { background: rgba(48,209,88,0.14); color: #1f9d4d; }
  .bc-result.err { background: rgba(255,55,95,0.14); color: #d12d4d; }
  .bc-confirm { background: var(--bg-input); border: 1px solid var(--border); border-radius: 14px; padding: 14px; }
  .bc-confirm-q { font-size: 14px; font-weight: 700; margin-bottom: 10px; text-align: center; }
  .bc-confirm-row { display: flex; gap: 10px; }
  .bc-cancel { flex: 1; border: 1px solid var(--border); background: transparent; color: var(--text-primary); font-weight: 700; font-size: 14px; padding: 11px 0; border-radius: 12px; cursor: pointer; font-family: var(--font); }
  .bc-note { font-size: 12px; line-height: 1.5; color: var(--text-secondary); }
  /* ── admin member tools (authenticity scan + test star credit) ── */
  .admin-tool-card { background: var(--card-solid); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 14px; margin-bottom: 10px; box-shadow: var(--shadow-card); }
  .admin-tool-card .ios-input { padding: 14px 16px; font-size: 16px; }
  .scan-result { margin: 4px 2px 4px; }
  .scan-verdict { display: inline-block; font-weight: 800; font-size: 14px; padding: 8px 16px; border-radius: 20px; }
  .scan-verdict.ok { background: rgba(48,209,88,0.16); color: #30d158; }
  .scan-verdict.warn { background: rgba(255,171,0,0.18); color: #ff9f0a; }
  .scan-verdict.bad { background: rgba(255,69,58,0.16); color: #ff453a; }
  .scan-flag { background: rgba(255,69,58,0.08); border: 1px solid rgba(255,69,58,0.28); border-radius: 12px; padding: 10px 12px; margin-bottom: 8px; }
  .scan-flag-title { font-weight: 700; font-size: 13.5px; color: var(--text-primary); }
  .scan-flag-detail { font-size: 12.5px; color: var(--text-secondary); margin-top: 2px; }
  .scan-clear { font-size: 13px; line-height: 1.5; color: var(--text-secondary); padding: 4px 2px; }
  .scan-err-box { background: rgba(255,69,58,0.08); border: 1px solid rgba(255,69,58,0.28); border-radius: 12px; padding: 12px; font-size: 13px; color: #ff453a; margin: 8px 0; }
  .admin-tabs { display: flex; gap: 6px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 100px; padding: 4px; margin-bottom: 20px; }
  .admin-tab { flex: 1; border: none; background: transparent; color: var(--text-secondary); font-weight: 700; font-size: 13.5px; padding: 9px 0; border-radius: 100px; cursor: pointer; font-family: var(--font); transition: all .25s var(--spring); }
  .admin-tab.active { background: var(--accent-grad); color: #fff; box-shadow: 0 4px 12px rgba(10,132,255,0.35); }
  .star-balance-card { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: var(--radius-lg); background: linear-gradient(135deg, rgba(255,184,0,0.16), rgba(255,122,0,0.10)); border: 1px solid rgba(255,160,0,0.4); box-shadow: 0 8px 24px rgba(255,150,0,0.14); }
  .sbc-icon { width: 46px; height: 46px; border-radius: 14px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #ffb800, #ff7a00); box-shadow: 0 4px 12px rgba(255,150,0,0.4); flex-shrink: 0; }
  .sbc-label { font-size: 13px; font-weight: 700; color: var(--text-secondary); }
  .sbc-value { font-size: 26px; font-weight: 800; color: var(--text-primary); line-height: 1.1; margin-top: 2px; }
  .sbc-unit { font-size: 15px; font-weight: 700; color: var(--text-secondary); }
  .sbc-err { font-size: 16px; font-weight: 700; color: var(--text-secondary); }
  .sbc-icon-anim { width: 46px; height: 46px; flex-shrink: 0; filter: drop-shadow(0 3px 8px rgba(255,150,0,0.4)); }
  .sbc-gram { font-size: 13px; font-weight: 700; color: var(--text-secondary); margin-top: 2px; }
  .aff-bal-star { display: inline-flex; filter: drop-shadow(0 2px 6px rgba(255,150,0,0.4)); }
  .sbc-note { font-size: 11.5px; line-height: 1.5; color: var(--text-secondary); opacity: 0.85; margin: 10px 2px 18px; }
  .admin-strip { display: flex; align-items: center; justify-content: space-between; background: var(--card-solid); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 14px 18px; margin-bottom: 18px; box-shadow: var(--shadow-card); font-size: 14px; color: var(--text-secondary); font-weight: 600; }
  .admin-strip strong { color: var(--accent); font-size: 20px; font-variant-numeric: tabular-nums; }
  .admin-chart-card { background: var(--card-solid); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 18px 16px 12px; box-shadow: var(--shadow-card); margin-bottom: 18px; }
  .admin-chart-head { display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 700; color: var(--text-secondary); margin-bottom: 16px; }
  .admin-legend { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; }
  .admin-legend i { width: 9px; height: 9px; border-radius: 3px; display: inline-block; margin-left: 8px; }
  .admin-legend .lg-o { background: #5e5ce6; } .admin-legend .lg-s { background: #ff375f; }
  .admin-bars-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 2px; }
  .admin-bars { display: flex; align-items: flex-end; gap: 4px; height: 150px; min-width: max-content; }
  .admin-bar-col { flex: none; display: flex; flex-direction: column; align-items: center; height: 100%; }
  .admin-bar-pair { flex: 1; display: flex; align-items: flex-end; justify-content: center; gap: 2px; width: 100%; }
  .admin-bar { min-height: 3px; border-radius: 4px 4px 0 0; transition: height .5s var(--ease); }
  .admin-zoom { display: inline-flex; gap: 6px; }
  .admin-zoom-btn { width: 28px; height: 28px; border-radius: 9px; border: 1px solid var(--border); background: var(--bg-input); color: var(--text-primary); font-size: 16px; font-weight: 800; cursor: pointer; line-height: 1; }
  .admin-zoom-btn:hover { border-color: var(--accent); }
  .admin-legend-row { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--text-secondary); margin: 2px 0 10px; }
  .admin-bar.o { background: linear-gradient(180deg, #7a78ff, #5e5ce6); }
  .admin-bar.s { background: linear-gradient(180deg, #ff6a85, #ff375f); }
  .admin-bar-label { font-size: 9.5px; color: var(--text-secondary); margin-top: 8px; font-weight: 600; white-space: nowrap; }
  .admin-range { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
  .admin-showall { display: block; width: 100%; border: 1px dashed var(--border); background: transparent; color: var(--accent); font-weight: 700; font-size: 12.5px; padding: 10px 0; border-radius: 12px; cursor: pointer; font-family: var(--font); margin-top: 8px; transition: all .2s var(--spring); }
  .admin-showall:hover { border-color: var(--accent); background: var(--bg-hover); }
  /* legal sheets */
  .legal-body { max-height: 58vh; overflow-y: auto; -webkit-overflow-scrolling: touch; padding-right: 2px; overscroll-behavior: contain; touch-action: pan-y; }
  .attr-scroll { max-height: 52vh; overflow-y: auto; -webkit-overflow-scrolling: touch; padding-right: 2px; overscroll-behavior: contain; touch-action: pan-y; }
  .attr-search-box { display: flex; align-items: center; gap: 8px; background: var(--bg-input); border-radius: 12px; padding: 9px 12px; margin: 4px 0 10px; color: var(--text-secondary); }
  .attr-search-input { flex: 1; border: none; outline: none; background: transparent; color: var(--text-primary); font-size: 15px; font-family: var(--font); }
  .attr-search-input::placeholder { color: var(--text-secondary); }
  .attr-search-clear { background: none; border: none; padding: 2px; color: var(--text-secondary); display: flex; align-items: center; cursor: pointer; }
  .legal-item { margin-bottom: 16px; }
  .legal-q { font-size: 14.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
  .legal-a { font-size: 13.5px; line-height: 1.55; color: var(--text-secondary); }
  .sheet-motion { position: absolute; inset: 0; overflow: hidden; z-index: 0; pointer-events: none; border-radius: inherit; }
  .sheet-body { position: relative; z-index: 1; }
  .detail-pop { max-height: 82vh; overflow-y: auto; -webkit-overflow-scrolling: touch; }
  .detail-body p { line-height: 1.5; font-size: 14px; }
  .row-detail-mark { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; margin-left: 5px; color: var(--text-secondary); cursor: pointer; vertical-align: middle; flex-shrink: 0; }
  .row-detail-mark:active { color: var(--tg-blue); }
  .mkt-badge { display: inline-block; font-size: 10.5px; font-weight: 800; padding: 3px 9px; border-radius: 10px; letter-spacing: 0.02em; flex-shrink: 0; }
  .mkt-live { background: rgba(48,209,88,0.15); color: #30d158; }
  .mkt-soon { background: rgba(142,142,147,0.12); color: var(--text-secondary); }
  .ios-row-muted { opacity: 0.55; cursor: default; }
  .profile-footer { text-align: center; margin-top: 30px; padding-bottom: 0; margin-bottom: -18px; }
  .footer-links { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px 10px; font-size: 12.5px; color: var(--text-secondary); padding: 0 8px; margin-bottom: 20px; }
  .footer-links span { cursor: pointer; }
  .footer-links span:not(.dot):active { color: var(--tg-blue); }
  .footer-links .dot { opacity: 0.35; cursor: default; font-size: 11px; }
  .footer-api-item { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; }
  .footer-api-item svg { opacity: 0.6; }
  .footer-copy { margin-top: 14px; font-size: 12px; color: var(--text-secondary); font-weight: 600; opacity: 0.7; }
  .footer-powered { margin-top: 5px; font-size: 11.5px; color: var(--text-secondary); font-weight: 700; opacity: 0.55; }
  /* first-launch consent */
  .consent-wrap { position: fixed; inset: 0; z-index: 90; background: rgba(0,0,0,0.45); backdrop-filter: blur(4px); display: flex; align-items: flex-end; justify-content: center; padding: 0 14px calc(var(--safe-bottom, 16px) + 14px); }
  .consent-card { width: 100%; max-width: 430px; max-height: calc(100vh - 48px); overflow-y: auto; background: var(--bg-card); border: 1px solid var(--border); border-radius: 22px; padding: 20px 18px; box-shadow: 0 18px 60px rgba(0,0,0,0.5); animation: fadeInUp .45s var(--bounce) both; }
  .consent-title { font-size: 17px; font-weight: 800; color: var(--text-primary); margin-bottom: 6px; }
  .consent-text { font-size: 13.5px; line-height: 1.55; color: var(--text-secondary); margin-bottom: 14px; }
  .consent-link { color: var(--tg-blue); font-weight: 700; cursor: pointer; }
  .consent-btn { width: 100%; }
  /* desktop launch: scale the whole layout up so it doesn't look tiny on a big screen */
  @media (min-width: 768px) and (min-height: 700px) {
    .splash-layout { transform: scale(1.35); }
    .splash-leaving .splash-layout { transform: scale(1.25); }
    .splash-glow { opacity: 0.9; }
  }
  .admin-range-btn { border: 1px solid var(--border); background: var(--bg-input); color: var(--text-secondary); font-weight: 700; font-size: 12px; padding: 7px 13px; border-radius: 100px; cursor: pointer; font-family: var(--font); transition: all .2s var(--spring); }
  .admin-range-btn:hover { border-color: var(--accent); color: var(--text-primary); }
  .admin-range-btn.active { background: var(--accent-grad); color: #fff; border-color: transparent; box-shadow: 0 3px 10px rgba(10,132,255,0.32); }
  .admin-2col { display: grid; grid-template-columns: 1fr; gap: 8px 28px; }
  @media (min-width: 768px) {
    .admin-screen { max-width: 760px; margin: 0 auto; padding: 36px 32px 60px; }
    .admin-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .admin-screen.desk { max-width: 1080px; padding: 44px 48px 72px; }
    .admin-screen.desk .admin-title { font-size: 30px; }
    .admin-screen.desk .admin-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
    .admin-screen.desk .admin-card { padding: 22px 20px; }
    .admin-screen.desk .admin-card-val { font-size: 32px; }
    .admin-screen.desk .admin-tabs { max-width: 460px; }
    .admin-screen.desk .admin-bars { height: 200px; }
    .admin-screen.desk .admin-2col { grid-template-columns: 1fr 1fr; }
  }
`;

// ════════════════════════════════════════════════════════════════════════════
//  MAIN APP
// ════════════════════════════════════════════════════════════════════════════
// ── Admin analytics dashboard (iOS-style, motion) — only for ADMIN_DASHBOARD_ID ──

// Stable, hook-safe chart (module-level so it never remounts on parent renders)
function AdminActivityChart({ stats, daily, labels, maxDaily, ranges, range, setRange, barW, setBarW, haptic }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [stats, barW]);
  const labelStep = barW >= 22 ? 1 : (daily.length > 8 ? Math.ceil(daily.length / 6) : 1);
  return (
    <div className="admin-chart-card">
      <div className="admin-chart-head">
        <span>Activity{stats && stats.range_start ? ` \u00b7 ${stats.range_start} \u2013 ${stats.range_end}` : ""}</span>
        <span className="admin-zoom">
          <button className="admin-zoom-btn" onClick={() => { haptic(); setBarW((w) => Math.max(8, w - 4)); }}>&minus;</button>
          <button className="admin-zoom-btn" onClick={() => { haptic(); setBarW((w) => Math.min(34, w + 4)); }}>+</button>
        </span>
      </div>
      <div className="admin-legend-row"><i className="lg-o" /> opens <i className="lg-s" /> searches</div>
      <div className="admin-range">
        {ranges.map(([id, lbl]) => (
          <button key={id} className={`admin-range-btn ${range === id ? "active" : ""}`} onClick={() => { haptic(); setRange(id); }}>{lbl}</button>
        ))}
      </div>
      <div className="admin-bars-scroll" ref={scrollRef}>
        <div className="admin-bars">
          {daily.map((d, i) => {
            const showLabel = i % labelStep === 0 || i === daily.length - 1;
            return (
              <div key={i} className="admin-bar-col" style={{ width: barW * 2 + 4 }}>
                <div className="admin-bar-pair">
                  <span className="admin-bar o" style={{ width: barW - 2, height: `${Math.round(((d.opens || 0) / maxDaily) * 100)}%` }} title={`${d.opens} opens`} />
                  <span className="admin-bar s" style={{ width: barW - 2, height: `${Math.round(((d.searches || 0) / maxDaily) * 100)}%` }} title={`${d.searches} searches`} />
                </div>
                <span className="admin-bar-label">{showLabel ? (labels[i] || "") : ""}</span>
              </div>
            );
          })}
          {!daily.length && <div className="admin-empty">No activity yet.</div>}
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ t, uid, code, onToggleTheme, safeOpen, haptic, desktop = false }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spin, setSpin] = useState(0);
  const [tab, setTab] = useState("overview");
  const [range, setRange] = useState("7d");
  const [barW, setBarW] = useState(14);
  const [bcMsg, setBcMsg] = useState("");
  const [bcImg, setBcImg] = useState("");
  const [bcSending, setBcSending] = useState(false);
  const [bcResult, setBcResult] = useState(null);
  const [bcConfirm, setBcConfirm] = useState(false);
  const [adminCode, setAdminCode] = useState("");   // secret admin code (entered each session, never shipped)
  const [codeInput, setCodeInput] = useState("");
  const [starBalance, setStarBalance] = useState(null);   // bot's earned Stars (admin readout)
  // Member tools: authenticity scan + test star credit.
  const [scanId, setScanId] = useState("");
  const [scanBusy, setScanBusy] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [creditId, setCreditId] = useState("");
  const [creditAmt, setCreditAmt] = useState("");
  const [creditBusy, setCreditBusy] = useState(false);
  const [creditResult, setCreditResult] = useState(null);

  const runScan = async () => {
    const target = scanId.replace(/\D/g, "");
    if (!target) return;
    setScanBusy(true); setScanResult(null); haptic();
    try {
      const r = await api(`/api/admin/user-scan?target=${encodeURIComponent(target)}&code=${encodeURIComponent(adminCode)}`, { timeout: 20000 });
      setScanResult(r); haptic("light");
    } catch { setScanResult({ ok: false, error: "failed" }); }
    setScanBusy(false);
  };

  const runCredit = async () => {
    const u = creditId.replace(/\D/g, "");
    const amt = parseInt(creditAmt, 10);
    if (!u || !amt) return;
    setCreditBusy(true); setCreditResult(null); haptic();
    try {
      const r = await api(`/api/admin/credit-stars?code=${encodeURIComponent(adminCode)}`, { method: "POST", body: { uid: u, stars: amt }, timeout: 20000 });
      setCreditResult(r); if (r && r.ok) haptic("medium");
    } catch { setCreditResult({ ok: false, error: "failed" }); }
    setCreditBusy(false);
  };

  const load = useCallback((rng) => {
    if (!adminCode) { setLoading(false); return; }
    setLoading(true);
    api(`/api/analytics?range=${rng || range}&uid=${encodeURIComponent(uid)}&code=${encodeURIComponent(adminCode)}`)
      .then((d) => setStats(d || {}))
      .catch(() => setStats({}))
      .finally(() => setLoading(false));
    api(`/api/star-balance?uid=${encodeURIComponent(uid)}&code=${encodeURIComponent(adminCode)}`)
      .then((d) => setStarBalance(d && d.ok ? d : { error: (d && d.error) || "unavailable" }))
      .catch(() => setStarBalance({ error: "unavailable" }));
  }, [uid, adminCode, range]);

  useEffect(() => { if (adminCode) load(range); /* eslint-disable-next-line */ }, [range, adminCode]);

  const forbidden = !!(stats && stats.error);
  const authed = !!(stats && !stats.error);   // only true once the server returns real data
  const unlock = () => { if (!codeInput.trim()) return; haptic(); setStats(null); setAdminCode(codeInput.trim()); };

  const g = (k) => (stats && stats[k]) || 0;
  const overviewCards = [
    { k: "members_total", label: "Members", c: "#0a84ff" },
    { k: "active_24h", label: "Active · 24h", c: "#ff9f0a" },
    { k: "active_7d", label: "Active · 7d", c: "#bf5af2" },
    { k: "returning_members", label: "Returning", c: "#30d158" },
    { k: "searches_total", label: "Searches", c: "#ff375f" },
    { k: "searches_24h", label: "Searches · 24h", c: "#ffd60a" },
    { k: "opens_24h", label: "Opens · 24h", c: "#5e5ce6" },
    { k: "new_members_24h", label: "New · 24h", c: "#64d2ff" },
  ];
  const growthCards = [
    { k: "new_members_24h", label: "New · 24h", c: "#64d2ff" },
    { k: "new_members_7d", label: "New · 7d", c: "#0a84ff" },
    { k: "referrals_total", label: "Referrals", c: "#30d158" },
    { k: "unique_referrers", label: "Referrers", c: "#bf5af2" },
    { k: "opens_7d", label: "Opens · 7d", c: "#5e5ce6" },
    { k: "avg_searches_per_member", label: "Avg / member", c: "#ff9f0a", raw: true },
  ];
  const top = (stats && stats.top_searches) || [];
  const [allSearches, setAllSearches] = useState(false);
  const daily = (stats && stats.daily) || [];
  const labels = (stats && stats.labels) || [];
  const maxDaily = Math.max(1, ...daily.map((d) => Math.max(d.opens || 0, d.searches || 0)));
  const ranges = [["7d", "7 days"], ["12w", "12 weeks"], ["24m", "24 months"], ["all", "All time"]];
  const rangeLabel = (ranges.find(([id]) => id === range) || [null, "7 days"])[1];

  const sendBroadcast = () => {
    if (!bcMsg.trim() && !bcImg.trim()) return;
    setBcSending(true); setBcResult(null);
    api(`/api/broadcast?uid=${encodeURIComponent(uid)}&code=${encodeURIComponent(adminCode)}`, { method: "POST", body: { text: bcMsg, image_url: bcImg.trim() || undefined }, timeout: 20000 })
      .then((r) => {
        if (r?.ok) { setBcResult({ ok: true, n: r.recipients }); setBcMsg(""); setBcImg(""); }
        else setBcResult({ ok: false, err: r?.error || "failed" });
      })
      .catch(() => setBcResult({ ok: false, err: "network" }))
      .finally(() => { setBcSending(false); setBcConfirm(false); });
  };

  const Cards = ({ list }) => (
    <div className="admin-grid">
      {list.map((c, i) => (
        <div key={c.k} className="admin-card" style={{ animationDelay: `${i * 0.04}s` }}>
          <span className="admin-dot" style={{ background: c.c }} />
          <div className="admin-card-val">{c.raw ? g(c.k) : compactNum(g(c.k))}</div>
          <div className="admin-card-label">{c.label}</div>
        </div>
      ))}
    </div>
  );

  const RankList = ({ rows, expanded, onToggle, emptyText, defaultN }) => (
    <div className="admin-list">
      {rows.length ? (expanded ? rows : rows.slice(0, defaultN)).map((s, i) => (
        <div key={i} className="admin-row" style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}>
          <span className="admin-rank">{i + 1}</span>
          <span className="admin-gift">{s.gift}</span>
          <span className="admin-count">{compactNum(s.count)}</span>
        </div>
      )) : <div className="admin-empty">{emptyText}</div>}
      {rows.length > defaultN && (
        <button className="admin-showall" onClick={onToggle}>
          {expanded ? "Show less" : `Show all (${rows.length})`}
        </button>
      )}
    </div>
  );

  const TopSearches = () => (
    <>
      <div className="admin-section-title">Scouted gifts — all, by times scouted</div>
      <RankList rows={top} expanded={allSearches} onToggle={() => setAllSearches((v) => !v)}
        emptyText="No searches recorded yet." defaultN={desktop ? 12 : 8} />
    </>
  );

  const Reach = () => (
    <>
      <div className="admin-section-title">Reach</div>
      <div className="admin-list">
        <div className="admin-row"><span className="admin-gift">Members total</span><span className="admin-count">{compactNum(g("members_total"))}</span></div>
        <div className="admin-row"><span className="admin-gift">Returning members</span><span className="admin-count">{compactNum(g("returning_members"))}</span></div>
        <div className="admin-row"><span className="admin-gift">Unique gifts searched</span><span className="admin-count">{compactNum(g("unique_gifts"))}</span></div>
        <div className="admin-row"><span className="admin-gift">Total referrals</span><span className="admin-count">{compactNum(g("referrals_total"))}</span></div>
      </div>
      <div className="admin-section-title">Membership</div>
      <div className="admin-list">
        <div className="admin-row"><span className="admin-gift">Free users</span><span className="admin-count">{compactNum(g("subs_free"))}</span></div>
        <div className="admin-row"><span className="admin-gift">Scout+ subscribers</span><span className="admin-count" style={{ color: "#0a84ff" }}>{compactNum(g("subs_plus"))}</span></div>
        <div className="admin-row"><span className="admin-gift">Scout Pro subscribers</span><span className="admin-count" style={{ color: "#bf5af2" }}>{compactNum(g("subs_pro"))}</span></div>
      </div>
    </>
  );

  const tabs = [["overview", "Overview"], ["activity", "Activity"], ["growth", "Growth"], ["members", "Members"], ["broadcast", "Broadcast"]];

  if (!authed) {
    const checking = loading && !!adminCode;
    return (
      <div className={`admin-screen${desktop ? " desk" : ""}`}>
        <div className="admin-gate-wrap">
          <div className="logo-tile" style={{ marginBottom: 18 }}><img src={LOGO_URL} alt="GiftTrove" /></div>
          <div className="admin-gate-title">Analytics access</div>
          <div className="admin-gate-sub">Enter the admin code to continue.</div>
          <input className="ios-input" type="password" inputMode="text" autoComplete="off"
            value={codeInput} onChange={(e) => setCodeInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") unlock(); }} placeholder="Admin code" />
          {forbidden && !checking && <div className="admin-gate-err">That code wasn’t accepted. Try again.</div>}
          <button className="action-btn" onClick={unlock} disabled={checking}>{checking ? "Checking…" : "Unlock"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-screen${desktop ? " desk" : ""}`}>
      <div className="admin-head fade-in-up">
        <div className="logo-tile"><img src={LOGO_URL} alt="GiftTrove" /></div>
        <div className="admin-head-text">
          <div className="admin-title">Analytics</div>
          <div className="admin-sub">GiftTrove · live overview</div>
        </div>
        <div className="admin-head-actions">
          <div className="icon-btn" onClick={() => { haptic(); setSpin((s) => s + 1); load(range); }}><IconRefresh trigger={spin} /></div>
          <div className="icon-btn" onClick={onToggleTheme}><IconContrast /></div>
        </div>
      </div>

      {loading && !stats ? (
        <div className="empty-state"><div className="lm-spin" style={{ margin: "0 auto" }} /></div>
      ) : stats && stats.error ? (
        <div className="empty-state"><div className="es-title">Couldn't load analytics</div><div>{stats.error === "forbidden" ? "Not authorized." : String(stats.error)}</div>
          <button className="action-btn" style={{ marginTop: 18 }} onClick={() => load(range)}>Try again</button></div>
      ) : (
        <>
          <div className="admin-tabs">
            {tabs.map(([id, label]) => (
              <button key={id} className={`admin-tab ${tab === id ? "active" : ""}`} onClick={() => { haptic(); setTab(id); }}>{label}</button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="fade-in-up">
              <div className="star-balance-card">
                <div className="sbc-icon-anim"><LottieGift src={HOTON_STAR_LOTTIE} size={46} radius={12} eager /></div>
                <div className="sbc-body">
                  <div className="sbc-label">Bot Star balance</div>
                  <div className="sbc-value">
                    {starBalance == null ? "\u2026"
                      : starBalance.error ? <span className="sbc-err">unavailable</span>
                      : <>{Number(starBalance.stars || 0).toLocaleString("en-US")} <span className="sbc-unit">Stars</span></>}
                  </div>
                  {starBalance && !starBalance.error && starBalance.gram != null && (
                    <div className="sbc-gram">{"\u2248 "}{Number(starBalance.gram).toLocaleString("en-US")} GRAM</div>
                  )}
                </div>
              </div>
              <p className="sbc-note">Earned by @gifttrovebot. Stars are held ~21 days and need 1,000 minimum to withdraw to TON via Fragment.</p>
              <Cards list={overviewCards} />
              <TopSearches />
            </div>
          )}

          {tab === "activity" && (
            <div className="fade-in-up">
              <AdminActivityChart stats={stats} daily={daily} labels={labels} maxDaily={maxDaily} ranges={ranges} range={range} setRange={setRange} barW={barW} setBarW={setBarW} haptic={haptic} />
              <Cards list={[
                { k: "opens_range", label: `Opens · ${rangeLabel}`, c: "#5e5ce6" },
                { k: "searches_range", label: `Searches · ${rangeLabel}`, c: "#ff375f" },
                { k: "active_range", label: `Active · ${rangeLabel}`, c: "#bf5af2" },
                { k: "new_range", label: `New · ${rangeLabel}`, c: "#0a84ff" },
              ]} />
            </div>
          )}

          {tab === "growth" && (
            <div className="fade-in-up">
              <Cards list={growthCards} />
              <Reach />
            </div>
          )}

          {tab === "broadcast" && (
            <div className="fade-in-up">
              <div className="admin-section-title">Broadcast to all users</div>
              <div className="bc-wrap">
                <div className="bc-count">{compactNum(g("bcast_count"))} recipients</div>
                <textarea className="bc-text" rows={5} maxLength={4000}
                  placeholder="Your message to all GiftTrove users…"
                  value={bcMsg} onChange={(e) => setBcMsg(e.target.value)} />
                <input className="bc-img" placeholder="Image URL (optional, https://…)"
                  value={bcImg} onChange={(e) => setBcImg(e.target.value)} />
                {bcResult && (
                  <div className={`bc-result ${bcResult.ok ? "ok" : "err"}`}>
                    {bcResult.ok
                      ? `Sending to ${compactNum(bcResult.n)} users — you'll get a delivery summary by DM.`
                      : `Couldn't send: ${bcResult.err}`}
                  </div>
                )}
                {!bcConfirm ? (
                  <button className="action-btn" disabled={bcSending || (!bcMsg.trim() && !bcImg.trim())}
                    onClick={() => { haptic(); setBcConfirm(true); }}>Send broadcast</button>
                ) : (
                  <div className="bc-confirm">
                    <div className="bc-confirm-q">Send to {compactNum(g("bcast_count"))} users now?</div>
                    <div className="bc-confirm-row">
                      <button className="bc-cancel" onClick={() => setBcConfirm(false)}>Cancel</button>
                      <button className="action-btn" disabled={bcSending}
                        onClick={() => { haptic(); sendBroadcast(); }}>{bcSending ? "Sending…" : "Confirm send"}</button>
                    </div>
                  </div>
                )}
                <div className="bc-note">Sends a Telegram DM from the bot to everyone who has opened the mini app and not cleared their data. Delivery is throttled automatically, and anyone who blocked the bot is skipped and dropped from the list.</div>
              </div>
            </div>
          )}

          {tab === "members" && (
            <div className="fade-in-up">
              <div className="admin-section-title">User authenticity scan</div>
              <div className="admin-tool-card">
                <input className="ios-input" inputMode="numeric" value={scanId} placeholder="Telegram user ID"
                  onChange={(e) => setScanId(e.target.value)} />
                <button className="action-btn" style={{ marginTop: 12 }} disabled={scanBusy || !scanId.trim()} onClick={runScan}>
                  {scanBusy ? "Scanning\u2026" : "Scan user"}
                </button>
              </div>
              {scanResult && (scanResult.ok ? (
                <div className="scan-result">
                  <div className={`scan-verdict ${scanResult.authentic ? "ok" : (scanResult.verdict === "High risk" ? "bad" : "warn")}`}>
                    {scanResult.verdict} · {scanResult.uid}
                  </div>
                  <div className="admin-grid" style={{ marginTop: 12 }}>
                    {[
                      ["Referrals", compactNum(scanResult.referrals_total || 0)],
                      ["Paid referrals", compactNum(scanResult.paid_referrals || 0)],
                      ["Conversion", `${Math.round((scanResult.conversion || 0) * 100)}%`],
                      ["Peak refs/hr", compactNum(scanResult.max_referrals_per_hour || 0)],
                      ["Earned", `${compactNum(scanResult.stats?.earned || 0)}\u2605`],
                      ["Available", `${compactNum(scanResult.stats?.available || 0)}\u2605`],
                      ["Available GRAM", compactNum(scanResult.available_gram ?? 0)],
                      ["Tier", scanResult.tier],
                      ["Account age", scanResult.member?.seen_app ? `${scanResult.member.age_days}d` : "no app use"],
                      ["Visits", scanResult.member?.seen_app ? compactNum(scanResult.member.visits || 0) : "\u2014"],
                    ].map(([label, val]) => (
                      <div className="admin-card" key={label}>
                        <div className="admin-card-val">{String(val)}</div>
                        <div className="admin-card-label">{label}</div>
                      </div>
                    ))}
                  </div>
                  {scanResult.flags && scanResult.flags.length > 0 ? (
                    <div style={{ marginTop: 14 }}>
                      {scanResult.flags.map((f) => (
                        <div className="scan-flag" key={f.code}>
                          <div className="scan-flag-title">{f.label}</div>
                          <div className="scan-flag-detail">{f.detail}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="scan-clear">No risk signals detected.</div>
                  )}
                  <div className="bc-note" style={{ marginTop: 8 }}>Signals are advisory, not proof — use judgement before approving a payout.</div>
                </div>
              ) : (
                <div className="scan-err-box">
                  {scanResult.error === "forbidden" ? "Not authorized."
                    : scanResult.error === "uid" ? "Enter a valid numeric user ID."
                    : "Scan failed. Try again."}
                </div>
              ))}

              <div className="admin-section-title" style={{ marginTop: 26 }}>Add Star balance (test)</div>
              <div className="admin-tool-card">
                <input className="ios-input" inputMode="numeric" value={creditId} placeholder="Telegram user ID"
                  onChange={(e) => setCreditId(e.target.value)} />
                <input className="ios-input" style={{ marginTop: 10 }} inputMode="numeric" value={creditAmt} placeholder="Amount in Stars (e.g. 1500)"
                  onChange={(e) => setCreditAmt(e.target.value)} />
                <button className="action-btn" style={{ marginTop: 12 }} disabled={creditBusy || !creditId.trim() || !creditAmt.trim()} onClick={runCredit}>
                  {creditBusy ? "Crediting\u2026" : "Credit Stars"}
                </button>
                {creditResult && (creditResult.ok ? (
                  <div className="scan-clear" style={{ marginTop: 12 }}>
                    Credited {Number(creditResult.credited).toLocaleString("en-US")}{"\u2605"} to {creditResult.uid}. Available now {Number(creditResult.available).toLocaleString("en-US")}{"\u2605"} ({"\u2248"} {creditResult.available_gram} GRAM).
                  </div>
                ) : (
                  <div className="scan-err-box" style={{ marginTop: 12 }}>
                    {creditResult.error === "forbidden" ? "Not authorized." : creditResult.error === "input" ? "Enter a user ID and a non-zero amount." : "Couldn't credit."}
                  </div>
                ))}
              </div>
              <div className="bc-note">Test tool only. Credits the affiliate balance so the payout flow can be exercised end-to-end. It does not touch the user's real Telegram Star balance. Use a negative amount to undo a test credit.</div>
            </div>
          )}

          <div className="admin-actions">
            <button className="action-btn" onClick={() => { haptic(); setSpin((s) => s + 1); load(range); }}>Refresh data</button>
            <button className="admin-action-2" onClick={() => safeOpen("https://t.me/gifttrove")}>Open GiftTrove channel</button>
          </div>
          <div className="admin-foot">No personal data is collected · counts are anonymous</div>
        </>
      )}
    </div>
  );
}

export default function App() {
  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null;
  const tgUser = tg?.initDataUnsafe?.user || { id: 12345678, first_name: "Scout" };

  const [theme, setTheme] = useState(() => {
    try {
      // One-time migration: light is now the default again. Bump the flag to
      // v4 so this new default applies once even to users who were
      // auto-defaulted to dark by the v3 migration (an explicit choice a user
      // makes AFTER this point is still preserved under gt_theme as always).
      if (!localStorage.getItem("gt_theme_v4")) { localStorage.setItem("gt_theme_v4", "1"); localStorage.setItem("gt_theme", "light"); return "light"; }
      return localStorage.getItem("gt_theme") || "light";
    } catch { return "light"; }
  });
  const [lang, setLang] = useState(() => localStorage.getItem("gt_lang") || "EN");
  const t = T[lang] || T.EN;
  // Static-panel localization: titles stay English; the detail/body is looked up
  // from a parallel translation overlay by index, falling back to English.
  const lk = (lang || "EN").toLowerCase();

  // Launch splash: show the animated mascot on cold start (long enough for the
  // squish-and-stretch loop to play through), then reveal the app.
  const [booting, setBooting] = useState(true);
  const [splashLeaving, setSplashLeaving] = useState(false);
  const [splashMs, setSplashMs] = useState(3000);
  useEffect(() => {
    // Cold start gets a 3s branded launch (data loads run underneath it the
    // whole time, so this masks the slowest part of boot without ADDING wait).
    // A warm reload — e.g. Telegram reviving a backgrounded mini app — gets a
    // quick 0.65s splash so returning never replays the whole launch.
    let warm = false;
    try { warm = sessionStorage.getItem("gt_booted") === "1"; sessionStorage.setItem("gt_booted", "1"); } catch { /* noop */ }
    const ms = warm ? 650 : 6500;
    setSplashMs(ms);
    const fade = setTimeout(() => setSplashLeaving(true), Math.max(0, ms - 450));
    const tmr = setTimeout(() => setBooting(false), ms);
    return () => { clearTimeout(tmr); clearTimeout(fade); };
  }, []);

  // "Joined" date for the profile. Stored locally on first launch so it works
  // with no backend round-trip. (For a date that's accurate across devices,
  // surface a real first-seen timestamp from /api/userdata later.)
  const [joinedAt] = useState(() => {
    try {
      let j = localStorage.getItem("gt_joined");
      if (!j) { j = String(Date.now()); localStorage.setItem("gt_joined", j); }
      return parseInt(j, 10) || Date.now();
    } catch { return Date.now(); }
  });

  // Avatar: show the mascot INSTANTLY, then upgrade to the real photo only once
  // it has fully decoded in the background. Telegram's photo_url (when present)
  // is fast; the /api/avatar fallback can be slow (MTProto), so we never block
  // the UI on it — the mascot is shown until the real image is actually ready.
  const [avatarSrc, setAvatarSrc] = useState(MASCOT_URL);
  useEffect(() => {
    const candidate =
      tgUser?.photo_url ||
      (BACKEND_CONFIGURED && tgUser?.id
        ? `${BACKEND_URL}/api/avatar?uid=${encodeURIComponent(tgUser.id)}`
        : null);
    if (!candidate) return;
    let alive = true;
    const img = new Image();
    img.onload = () => { if (alive) setAvatarSrc(candidate); };
    img.onerror = () => {};   // keep the mascot
    img.src = candidate;
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tgUser?.photo_url, tgUser?.id]);

  const [savedGifts, setSavedGifts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gt_saved") || "[]"); } catch { return []; }
  });
  const [soldMap, setSoldMap] = useState(() => {
    // Sold state persists across logout/login: a gift stays SOLD until it's
    // confirmed listed again on a marketplace we can reach (see check below).
    try { return JSON.parse(localStorage.getItem("gt_sold") || "{}") || {}; } catch { return {}; }
  });
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gt_recent") || "[]"); } catch { return []; }
  });
  const userSynced = useRef(false);   // becomes true once server data is merged

  const refKey = `gt_ref_count_${tgUser?.id || "guest"}`;
  const [referralCount, setReferralCount] = useState(() => parseInt(localStorage.getItem(refKey) || "0", 10));
  const [myRefCode, setMyRefCode] = useState("");   // friendly referral code (e.g. 888OG) from the server

  // Persisted search (survives a full reload; only replaced by a new search).
  const savedSearch = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("gt_search") || "null") || {}; }
    catch { return {}; }
  }, []);

  const [activeTab, setActiveTab] = useState(savedSearch.hasSearched ? "results" : "scout");
  const [toast, setToast] = useState(null);
  const [soonNote, setSoonNote] = useState(false);
  const [marketSoonNote, setMarketSoonNote] = useState("");   // "" | "GetGems" | "Portals" | "MRKT" | "Tonnel"
  const [detailNote, setDetailNote] = useState(null); // "premium"|"promote"|"affiliate"
  const [isSearching, setIsSearching] = useState(false);
  const [isScouting, setIsScouting] = useState(false);
  const [activeSheet, setActiveSheet] = useState(null);
  // Search text for the model/symbol/backdrop filter sheets — reset any time the
  // sheet changes so a leftover query from one attribute doesn't ghost into another.
  const [attrSearch, setAttrSearch] = useState("");
  useEffect(() => { setAttrSearch(""); }, [activeSheet]);
  const [legalOk, setLegalOk] = useState(() => {
    try { return localStorage.getItem("gt_legal_ok") === "1"; } catch { return true; }
  });
  const [clearArmed, setClearArmed] = useState(false);
  const clearTimerRef = useRef(null);
  const clearMyData = async () => {
    haptic();
    if (!clearArmed) {
      setClearArmed(true);
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => setClearArmed(false), 4000);
      return;
    }
    clearTimeout(clearTimerRef.current);
    setClearArmed(false);
    let cleared = false;
    try { const r = await api("/api/userdata/clear", { method: "POST" }); cleared = !!(r && r.ok); } catch { cleared = false; }
    if (!cleared) { showToast(t.data_clear_failed); return; }
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
      keys.filter((k) => k && k.startsWith("gt_")).forEach((k) => localStorage.removeItem(k));
    } catch { /* noop */ }
    setSavedGifts([]); setRecentSearches([]); setReferralCount(0);
    showToast(t.data_cleared);
    // Full reset: relaunch fresh (access gate + consent will show again).
    setTimeout(() => { try { window.location.reload(); } catch { /* noop */ } }, 1000);
  };
  const acceptLegal = () => {
    haptic();
    try { localStorage.setItem("gt_legal_ok", "1"); } catch { /* noop */ }
    setLegalOk(true);
    // Accepting the Terms opts into broadcasts and lifts any opt-out from a prior
    // data clear — so a returning user who re-accepts is re-subscribed (their old
    // searches/saved/referrals stay cleared; this only re-enables messaging).
    if (window.Telegram?.WebApp?.initData) api("/api/consent", { method: "POST" }).catch(() => {});
  };
  // First-launch Terms popup removed — users land straight on Scout. Terms of
  // Service and Privacy Policy are still reachable from the Profile footer; we
  // simply no longer block the app on an explicit "Agree and continue" tap.
  const consentOverlay = null;
  const [selectedGift, setSelectedGift] = useState(null);

  // results / sorting / pagination
  const [sortBy, setSortBy] = useState(savedSearch.sortBy || "default");        // default (general) | price_asc | price_desc
  const [nextOffset, setNextOffset] = useState(savedSearch.nextOffset || "");
  const [loadingMore, setLoadingMore] = useState(false);
  // Only this many result/saved cards are actually mounted in the DOM at once.
  // Growing it is a pure state update against data already in memory — no
  // network wait — so it can stay well ahead of scroll position instead of
  // the user scrolling into empty space while content "catches up".
  // Cards revealed per step. This was 24 — every sentinel trigger fired 24
  // simultaneous poster-image requests at the external Fragment CDN, which
  // blew past the browser's per-host connection limit and left a visible wave
  // of blank/grey cards mid-scroll ("lag"). Smaller, more frequent chunks (paired
  // with the 2600px early-trigger rootMargin) keep the pipe from ever backing up.
  const RENDER_CHUNK = 8;
  const [renderCount, setRenderCount] = useState(RENDER_CHUNK);
  const [savedRenderCount, setSavedRenderCount] = useState(RENDER_CHUNK);
  const [hasSearched, setHasSearched] = useState(!!savedSearch.hasSearched);
  const [minPrice, setMinPrice] = useState(savedSearch.minPrice || "");
  const [maxPrice, setMaxPrice] = useState(savedSearch.maxPrice || "");
  const lastSearch = useRef(savedSearch.lastSearch || null);   // remembers params for load-more / re-sort

  // access gate (admins auto-pass; everyone else needs the code)
  const [access, setAccess] = useState("granted");        // gate removed — app is open to all
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [codeChecking, setCodeChecking] = useState(false);
  const [netError, setNetError] = useState(false);

  // desktop compact mode
  const [compact, setCompact] = useState(() => localStorage.getItem("gt_compact") === "1");

  // live collection data
  const [collections, setCollections] = useState(() => {
    // Instant catalog from the last session — suggestions + floating gifts
    // paint immediately even if the backend was just redeployed.
    try { return JSON.parse(localStorage.getItem("gt_collections") || "[]"); } catch { return []; }
  }); // [{name,slug,gift_id,supply,preview}]

  // attributes for the selected collection
  const [attrs, setAttrs] = useState({ models: [], symbols: [], backdrops: [] });

  // search inputs
  const [giftQuery, setGiftQuery] = useState(savedSearch.giftQuery || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTouch = useRef({ y: 0, moved: false });
  const [giftId, setGiftId] = useState(savedSearch.giftId || "");
  const [selectedMarkets, setSelectedMarkets] = useState(savedSearch.selectedMarkets || ["All"]);
  // Multi-select attribute filters (premium unlocks more than one of each).
  // _toArr migrates old single-value saved searches ("Red"/"Any") to arrays.
  const _toArr = (v) => (Array.isArray(v) ? v : (v && v !== "Any" ? [v] : []));
  const [selectedModels, setSelectedModels] = useState(_toArr(savedSearch.selectedModels ?? savedSearch.selectedModel));
  const [selectedBackdrops, setSelectedBackdrops] = useState(_toArr(savedSearch.selectedBackdrops ?? savedSearch.selectedBackdrop));
  const [selectedSymbols, setSelectedSymbols] = useState(_toArr(savedSearch.selectedSymbols ?? savedSearch.selectedSymbol));
  // Premium tier — drives the filter caps and the Premium section.
  const [tierInfo, setTierInfo] = useState({ tier: "free", caps: { free: 1, plus: 5, pro: 999 }, prices: { plus: 100, pro: 300 }, expires_at: 0 });
  const [buying, setBuying] = useState("");          // tier currently being purchased
  const [vanityInput, setVanityInput] = useState("");
  const [vanityMsg, setVanityMsg] = useState("");


  // results
  const [results, setResults] = useState(Array.isArray(savedSearch.results) ? savedSearch.results : []);
  const [scoutError, setScoutError] = useState(null);

  // promoted gifts (blended atop matching scouts; hidden for Scout Pro)
  const [promos, setPromos] = useState([]);
  const [hiddenPromos, setHiddenPromos] = useState([]);   // ids reported/dismissed this session
  // promote-a-gift form
  const [promoColl, setPromoColl] = useState(null);       // chosen collection {gift_id,name,slug}
  const [promoCollQuery, setPromoCollQuery] = useState("");
  const [promoAttrs, setPromoAttrs] = useState({ models: [], symbols: [], backdrops: [] });
  const [promoModel, setPromoModel] = useState("");
  const [promoSymbol, setPromoSymbol] = useState("");
  const [promoBackdrop, setPromoBackdrop] = useState("");
  const [promoMarket, setPromoMarket] = useState("Telegram");
  const [promoNum, setPromoNum] = useState("");           // optional exact gift number (Telegram)
  const [promoAmount, setPromoAmount] = useState("");
  const [promoCurrency, setPromoCurrency] = useState("GRAM");
  const [promoLink, setPromoLink] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoMsg, setPromoMsg] = useState("");
  // affiliate program (Scout Pro)
  const [affInfo, setAffInfo] = useState(null);
  const [affAddr, setAffAddr] = useState("");
  const [affAmount, setAffAmount] = useState("");
  const [affBusy, setAffBusy] = useState(false);
  const [affMsg, setAffMsg] = useState("");
  const [affPage, setAffPage] = useState(null); // null | "main" | "history" | "withdraw"
  const [affClosing, setAffClosing] = useState(false);
  const affLoadedRef = useRef(false);
  // Closing the WHOLE affiliate section (not just stepping between its own
  // sub-pages) used to unmount .aff-screen instantly, hard-cutting straight to
  // whatever tab was underneath (often the Profile tab's blue hero banner) —
  // that hard cut is what read as a "flash". This plays the reverse slide
  // first, then actually clears affPage once the animation has had time to run.
  const closeAffiliate = (thenOpenSheet) => {
    haptic();
    setAffClosing(true);
    setTimeout(() => {
      setAffPage(null); setAffClosing(false);
      if (thenOpenSheet) setActiveSheet(thenOpenSheet);   // deferred: only opens once the affiliate screen is truly gone
    }, 260);
  };
  const [pendingScout, setPendingScout] = useState("");   // gift_id from a q_ inline deep link
  const [pendingGiftSlug, setPendingGiftSlug] = useState("");   // slug from a g_ gift deep link — held until access is granted
  const [editingVanity, setEditingVanity] = useState(false);   // inline custom-code editor (Pro)

  // Save the current search so it survives a full page reload.
  useEffect(() => {
    try {
      if (hasSearched) {
        localStorage.setItem("gt_search", JSON.stringify({
          hasSearched: true, results: results.slice(0, 300), nextOffset, sortBy,
          giftQuery, giftId, selectedMarkets, selectedModels, selectedBackdrops, selectedSymbols,
          minPrice, maxPrice, lastSearch: lastSearch.current,
        }));
      }
    } catch { /* storage full — ignore */ }
  }, [results, hasSearched, nextOffset, sortBy, giftQuery, giftId, selectedMarkets, selectedModels, selectedBackdrops, selectedSymbols, minPrice, maxPrice]);

  // pull to refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);
  const touchStartY = useRef(0);
  const contentRef = useRef(null);
  // Boolean, not a raw pixel value — updates ONLY when crossing the back-to-top
  // threshold, rAF-throttled. The previous version stored the live scrollTop in
  // state and updated it on every scroll event, which forced a full re-render of
  // the entire results tree (100+ cards) on every pixel of scroll — that was the
  // real cause of the scroll lag, not image loading.
  const [showBackToTop, setShowBackToTop] = useState(false);
  const scrollRaf = useRef(null);

  // tab pill measuring
  const tabRefs = useRef({});
  const tabBarRef = useRef(null);
  const [pill, setPill] = useState({ left: 6, width: 0 });
  const [pillReady, setPillReady] = useState(false);

  // one-shot icon animations (bump a key to replay)
  const [pulse, setPulse] = useState({});
  const bump = (k) => setPulse((p) => ({ ...p, [k]: (p[k] || 0) + 1 }));

  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;

  // derived (safe: all state above is initialized)
  const collectionNames = collections.length ? collections.map((c) => c.name) : FALLBACK_COLLECTIONS;
  // Google-style instant search: build the inverted/prefix index once per
  // catalogue change; keep an LRU cache of listing results and a monotonic
  // sequence so only the newest search response is allowed to land.
  const searchIdx = useMemo(
    () => buildSearchIndex(collections.length ? collections : FALLBACK_COLLECTIONS.map((n) => ({ name: n }))),
    [collections]
  );
  const searchCache = useRef(makeLRU(40));
  const searchSeq = useRef(0);
  const selectedCollection = collections.find((c) => c.name === giftQuery);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };
  const toggleTheme = () => { haptic(); bump("theme"); setTheme((p) => (p === "dark" ? "light" : "dark")); };

  // ── Telegram init ──
  useEffect(() => {
    if (!tg) return;
    try { tg.ready?.(); tg.expand?.(); } catch { /* noop */ }
    // True full-screen on every entry point (chat list, bot chat, inline link).
    // Bot API 8.0+: requestFullscreen. Mobile only — desktop stays windowed.
    try {
      const plat = String(tg.platform || "").toLowerCase();
      if (typeof tg.requestFullscreen === "function" && (plat === "android" || plat === "ios")) {
        tg.requestFullscreen();
      }
    } catch { /* older clients: expand() above already applied */ }
    // Stop Telegram from hijacking vertical swipes (sheet drag, pull-to-refresh).
    // Users minimize via the header chevron instead. Bot API 7.7+.
    try { tg.disableVerticalSwipes?.(); } catch { /* noop */ }
    // Full-screen mode: offset the UI below Telegram's header controls so the
    // language / theme buttons aren't hidden under the close/collapse buttons.
    const applyInsets = () => {
      try {
        const sa = tg.safeAreaInset || {};
        const csa = tg.contentSafeAreaInset || {};
        const top = Math.max(Number(sa.top) || 0, 0) + Math.max(Number(csa.top) || 0, 0);
        const bottom = Math.max(Number(sa.bottom) || 0, 0) + Math.max(Number(csa.bottom) || 0, 0);
        const root = document.documentElement;
        if (top > 0) root.style.setProperty("--safe-top", `${top}px`);
        if (bottom > 0) root.style.setProperty("--safe-bottom", `${Math.max(bottom, 16)}px`);
      } catch { /* noop */ }
    };
    applyInsets();
    try {
      tg.onEvent?.("safeAreaChanged", applyInsets);
      tg.onEvent?.("contentSafeAreaChanged", applyInsets);
      tg.onEvent?.("fullscreenChanged", applyInsets);
      tg.onEvent?.("viewportChanged", applyInsets);
    } catch { /* noop */ }
    return () => {
      try {
        tg.offEvent?.("safeAreaChanged", applyInsets);
        tg.offEvent?.("contentSafeAreaChanged", applyInsets);
        tg.offEvent?.("fullscreenChanged", applyInsets);
        tg.offEvent?.("viewportChanged", applyInsets);
      } catch { /* noop */ }
    };
  }, [tg]);

  // ── persistence ──
  useEffect(() => {
    localStorage.setItem("gt_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    // The module-top pre-paint puts a SOLID inline background on <html> to kill
    // the white flash during webview reloads — but leaving it there blocks the
    // body's --bg-gradient from propagating to the root canvas (that's what
    // subtly changed dark mode's glow). Clear it the moment React owns the
    // screen; the pre-paint re-applies automatically on the next reload gap.
    try { document.documentElement.style.background = ""; } catch { /* noop */ }
    // Telegram's own backdrop (behind the webview during resize/keyboard) —
    // header colour is deliberately left at Telegram's default.
    const themeColor = theme === "light" ? "#f2f2f7" : "#000000";
    try { tg?.setBackgroundColor?.(themeColor); } catch { /* noop */ }
  }, [theme, tg]);
  useEffect(() => {
    localStorage.setItem("gt_lang", lang);
    // Tell the backend which language to send bot DMs in (promoted-gift alerts,
    // subscription + payout messages, etc.). Fire-and-forget; the backend maps
    // EN/RU/ZH -> en/ru/zh and ignores it when init-data can't be verified.
    api("/api/lang", { method: "POST", body: { lang } }).catch(() => {});
  }, [lang]);
  useEffect(() => { localStorage.setItem("gt_saved", JSON.stringify(savedGifts)); }, [savedGifts]);
  useEffect(() => { localStorage.setItem(refKey, String(referralCount)); }, [referralCount, refKey]);
  useEffect(() => { localStorage.setItem("gt_recent", JSON.stringify(recentSearches)); }, [recentSearches]);

  // Re-check saved gifts' listing status whenever the Saved tab is opened, so a
  // gift that's been bought/de-listed since saving shows SOLD instead of Buy.
  const soldCheckedKey = useRef("");
  useEffect(() => {
    if (activeTab !== "saved" || savedGifts.length === 0) return;
    const checkable = savedGifts.filter((g) => g.num != null && g.market);
    if (checkable.length === 0) return;
    const key = checkable.map((g) => g.id).join(",");
    if (soldCheckedKey.current === key) return;   // already checked this exact set
    soldCheckedKey.current = key;
    api("/api/check_listings", {
      method: "POST",
      body: { items: checkable.map((g) => ({
        id: g.id, gift_id: g.gift_id || "", slug: g.slug || "",
        num: g.num, marketplace: g.market, name: g.name || "",
      })) },
      timeout: 15000,
    }).then((r) => {
      const soldIds = Array.isArray(r?.sold) ? r.sold : [];
      const listedIds = Array.isArray(r?.listed) ? r.listed : [];
      if (soldIds.length || listedIds.length) {
        setSoldMap((prev) => {
          const next = { ...prev };
          soldIds.forEach((id) => { next[id] = true; });    // confirmed gone → SOLD (sticks)
          listedIds.forEach((id) => { delete next[id]; });  // confirmed live again → Buy
          return next;
        });
      }
    }).catch(() => {});
  }, [activeTab, savedGifts]);

  // Persist sold state so a saved-and-sold gift stays SOLD across logout/login
  // until a reachable marketplace confirms it's listed again.
  useEffect(() => { try { localStorage.setItem("gt_sold", JSON.stringify(soldMap)); } catch { /* quota */ } }, [soldMap]);

  // ── cross-device sync: pull saved + searches from the server on launch ──
  useEffect(() => {
    if (!window.Telegram?.WebApp?.initData) { userSynced.current = true; return; }
    api(`/api/userdata?uid=${encodeURIComponent(tgUser?.id || "")}`)
      .then((d) => {
        if (d && d.synced) {
          if (Array.isArray(d.saved) && d.saved.length) {
            setSavedGifts((local) => {
              const byId = new Map();
              [...d.saved, ...local].forEach((gg) => { if (gg && gg.id != null) byId.set(String(gg.id), gg); });
              return Array.from(byId.values());
            });
          }
          if (Array.isArray(d.searches) && d.searches.length) {
            setRecentSearches((local) => {
              const merged = [];
              const seen = new Set();
              [...d.searches, ...local].forEach((q) => { const k = String(q).toLowerCase(); if (q && !seen.has(k)) { seen.add(k); merged.push(q); } });
              return merged.slice(0, 20);
            });
          }
        }
      })
      .catch(() => {})
      .finally(() => { userSynced.current = true; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── push saved gifts to the server when they change (after the first sync) ──
  useEffect(() => {
    if (!userSynced.current || !window.Telegram?.WebApp?.initData) return;
    const id = setTimeout(() => { api("/api/userdata", { method: "POST", body: { saved: savedGifts } }).catch(() => {}); }, 700);
    return () => clearTimeout(id);
  }, [savedGifts]);

  // ── load live collections (dynamic; no hardcoding) ──
  // New users have no cached catalog, so the floating gifts depend entirely on
  // this fetch. Render's free tier can be cold (30–60s), so retry persistently
  // instead of giving up — otherwise a first-time visitor sees an empty stage.
  useEffect(() => {
    let alive = true;
    const tryFetch = (attempt) => api("/api/collections", { timeout: 25000 })
      .then((d) => {
        if (!alive) return;
        if (d?.collections?.length) {
          setCollections(d.collections);
          try {
            const blob = JSON.stringify(d.collections);
            if (blob.length < 3500000) localStorage.setItem("gt_collections", blob);
          } catch { /* storage full: skip */ }
        } else if (attempt < 6) {
          setTimeout(() => { if (alive) tryFetch(attempt + 1); }, 4000);
        }
      })
      .catch(() => { if (alive && attempt < 6) setTimeout(() => { if (alive) tryFetch(attempt + 1); }, 4000); });
    tryFetch(1);
    return () => { alive = false; };
  }, []);

  // ── ACCESS GATE: admins auto-pass; others need the code (verified server-side) ──
  // Render's free tier sleeps after idle and can take 30–60s to wake. We retry
  // through that window with long timeouts and ONLY lock when the server is
  // actually reachable and says no — a timeout must never read as "wrong code".
  const askAccess = async (uid, code, tries = 4) => {
    let lastErr = null;
    for (let i = 0; i < tries; i++) {
      try {
        return await api(`/api/access?uid=${encodeURIComponent(uid)}&code=${encodeURIComponent(code)}`, { timeout: 22000 });
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
      }
    }
    throw lastErr || new Error("unreachable");
  };

  useEffect(() => {
    // Gate removed: the app is open to everyone. We still ping /api/access once
    // (fire-and-forget) so the backend can count the visit and add the user to
    // the broadcast list — but we NEVER block the UI on the result.
    const uid = tgUser?.id || "";
    const savedCode = localStorage.getItem("gt_code") || "";
    askAccess(uid, savedCode).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitCode = async () => {
    const code = codeInput.trim();
    if (!code || codeChecking) return;
    haptic("medium");
    setCodeError(false);
    setCodeChecking(true);
    try {
      const d = await askAccess(tgUser?.id || "", code);
      if (d?.ok) {
        localStorage.setItem("gt_code", code);
        setCodeError(false);
        setAccess("granted");
      } else {
        // Server reachable and rejected → genuinely wrong code.
        setCodeError(true);
        haptic("heavy");
        setTimeout(() => setCodeError(false), 1500);
      }
    } catch {
      // Couldn't reach the server (cold start / network) — not a wrong code.
      setNetError(true);
      setTimeout(() => setNetError(false), 2600);
    } finally {
      setCodeChecking(false);
    }
  };

  // ── load attributes when a known collection is picked ──
  // Keyed on the RESOLVED gift_id (not the whole collections array) so a
  // background catalog refresh can't wipe the user's in-progress selection or
  // cancel an in-flight load. Retries patiently to ride out cold starts.
  const activeGiftId = selectedCollection?.gift_id || "";
  useEffect(() => {
    setSelectedModels([]); setSelectedSymbols([]); setSelectedBackdrops([]);
    if (!activeGiftId) { setAttrs({ models: [], symbols: [], backdrops: [] }); return; }
    let alive = true;
    const load = (attempt) => api(`/api/attributes?gift_id=${encodeURIComponent(activeGiftId)}`, { timeout: 20000 })
      .then((d) => {
        if (!alive) return;
        const got = d && ((d.models || []).length + (d.symbols || []).length + (d.backdrops || []).length > 0);
        if (got) {
          setAttrs({ models: d.models || [], symbols: d.symbols || [], backdrops: d.backdrops || [] });
        } else if (attempt < 5) {
          setTimeout(() => { if (alive) load(attempt + 1); }, 800 * attempt);   // 0.8s,1.6s,2.4s,3.2s
        }
      })
      .catch(() => { if (alive && attempt < 5) setTimeout(() => { if (alive) load(attempt + 1); }, 800 * attempt); });
    load(1);
    return () => { alive = false; };
  }, [activeGiftId]);

  // Load attributes for the collection chosen in the promote form (separate from scouting).
  const promoGiftId = promoColl?.gift_id || "";
  useEffect(() => {
    setPromoModel(""); setPromoSymbol(""); setPromoBackdrop("");
    if (!promoGiftId) { setPromoAttrs({ models: [], symbols: [], backdrops: [] }); return; }
    let alive = true;
    api(`/api/attributes?gift_id=${encodeURIComponent(promoGiftId)}`, { timeout: 20000 })
      .then((d) => { if (alive && d) setPromoAttrs({ models: d.models || [], symbols: d.symbols || [], backdrops: d.backdrops || [] }); })
      .catch(() => {});
    return () => { alive = false; };
  }, [promoGiftId]);

  // Affiliate dashboard: load ONCE per visit to the affiliate section, not every
  // time the user returns to "main" from history/withdraw — re-fetching (and
  // blanking affInfo) on every sub-page return was what made it feel slow.
  useEffect(() => {
    if (affPage !== null && !affLoadedRef.current) {
      affLoadedRef.current = true;
      setAffMsg("");
      api("/api/affiliate").then((d) => setAffInfo(d || { ok: false })).catch(() => setAffInfo({ ok: false }));
    }
    if (affPage === null) {
      affLoadedRef.current = false;   // next open fetches fresh
    }
  }, [affPage]);

  // Telegram's own chrome shows a native back/close control whenever a Mini App
  // is open. Without hooking BackButton, tapping it EXITS the whole app instead
  // of stepping back within our affiliate flow. Show it exactly while we're on
  // a sub-page and route its click through the same in-app back logic as our
  // own arrow, so both controls behave identically.
  useEffect(() => {
    const bb = tg?.BackButton;
    if (!bb) return;
    if (affPage === null) { try { bb.hide(); } catch { /* noop */ } return; }
    const onBack = () => {
      if (affPage === "history" || affPage === "withdraw") { haptic(); setAffPage("main"); }
      else { closeAffiliate(); }
    };
    try { bb.show(); bb.onClick(onBack); } catch { /* noop */ }
    return () => { try { bb.offClick(onBack); } catch { /* noop */ } };
  }, [affPage, tg]);

  // ── referral + deep-link handling on launch ──
  useEffect(() => {
    api(`/api/referrals?uid=${encodeURIComponent(tgUser?.id || "guest")}`)
      .then((d) => { if (typeof d?.count === "number") { setReferralCount(d.count); localStorage.setItem(refKey, String(d.count)); } })
      .catch(() => { /* keep local cache */ });

    // Fetch this member's friendly referral code (e.g. 888OG) for sharing.
    api(`/api/refcode?uid=${encodeURIComponent(tgUser?.id || "guest")}`)
      .then((d) => { if (d?.code) setMyRefCode(d.code); })
      .catch(() => { /* fall back to the derived code */ });

    // Fetch premium tier (drives filter caps + the Premium section).
    api("/api/subscription")
      .then((d) => { if (d?.tier) setTierInfo((prev) => ({ ...prev, ...d })); })
      .catch(() => { /* default to free */ });

    const param = tg?.initDataUnsafe?.start_param || "";
    let refCode = param;
    // Inline-search deep link: q_<gift_id> -> scout that collection once loaded.
    if (param.startsWith("q_")) {
      const gid = param.slice(2).replace(/[^0-9]/g, "");
      if (gid) setPendingScout(gid);
      refCode = "";
    }
    // Gift deep-link: g_<slug>_<refcode>  ->  open that gift once access is granted.
    // (Don't fetch yet — the access-gate screen fully replaces the render tree
    // until `access === "granted"`, so firing this now would set state that
    // never becomes visible and is never retried.)
    if (param.startsWith("g_")) {
      const rest = param.slice(2);
      const u = rest.lastIndexOf("_");
      const slug = u >= 0 ? rest.slice(0, u) : rest;
      refCode = u >= 0 ? rest.slice(u + 1) : "";
      if (slug) setPendingGiftSlug(slug);
    }
    // Send the raw token (friendly code OR legacy link) — the backend resolves it
    // and blocks self-referral, so no client-side decoding is needed.
    if (refCode) {
      api("/api/referral", { method: "POST", body: { uid: refCode, by: tgUser?.id } }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Run a pending q_<gift_id> inline-search once collections have loaded.
  useEffect(() => {
    if (!pendingScout || !collections.length) return;
    const col = collections.find((c) => String(c.gift_id) === String(pendingScout));
    if (col) scoutGift(col);
    setPendingScout("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingScout, collections]);

  // Open a pending g_<slug> gift deep link once the access gate is passed —
  // the gate screen fully replaces the render tree until then, so this must
  // wait rather than fire on mount (see start_param parsing above).
  useEffect(() => {
    if (!pendingGiftSlug || access !== "granted") return;
    const slug = pendingGiftSlug;
    setPendingGiftSlug("");
    api(`/api/gift?slug=${encodeURIComponent(slug)}`)
      .then((g) => { if (g && (g.slug || g.name)) { setSelectedGift(g); setActiveSheet("gift_details"); } })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingGiftSlug, access]);

  // ── keyboard detection (hide tab bar) ──
  useEffect(() => {
    const onResize = () => {
      const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      setKeyboardOpen(vh < window.screen.height * 0.7);
    };
    const vv = window.visualViewport;
    if (vv) { vv.addEventListener("resize", onResize); return () => vv.removeEventListener("resize", onResize); }
    window.addEventListener("resize", onResize); return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── tabs (Scout = animated search, Results = clipboard) ──
  const tabs = [
    { id: "scout", label: t.scout_tab },
    { id: "results", label: t.results_tab },
    { id: "saved", label: t.saved_tab },
    { id: "profile", label: t.profile_tab },
  ];
  const tabIcon = (id, trigger) => {
    if (id === "scout") return <IconSearchAnim trigger={trigger} size={23} />;
    if (id === "results") return <IconClipboard trigger={trigger} size={23} />;
    if (id === "saved") return <IconBookmark trigger={trigger} />;
    if (id === "profile") return <IconUser trigger={trigger} />;
    return null;
  };

  // ── tab pill measurement (adaptive + correctly placed on first reveal) ──
  useLayoutEffect(() => {
    let raf, t1;
    const measure = () => {
      const el = tabRefs.current[activeTab];
      const bar = tabBarRef.current;
      if (el && bar) {
        const er = el.getBoundingClientRect();
        const br = bar.getBoundingClientRect();
        if (er.width > 0) {
          setPill({ left: er.left - br.left, width: er.width });
          setPillReady(true);
        }
      }
    };
    measure();
    raf = requestAnimationFrame(measure);   // after layout settles
    t1 = setTimeout(measure, 140);           // after web fonts swap in
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && tabBarRef.current) ro.observe(tabBarRef.current);
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(raf); clearTimeout(t1); ro?.disconnect(); window.removeEventListener("resize", measure); };
  }, [activeTab, lang, keyboardOpen, booting]);

  // ── pull to refresh (disabled on Scout & Saved — they scroll natively) ──
  const ptrOff = () => activeTab === "scout" || activeTab === "saved";
  const handleTouchStart = (e) => { if (ptrOff()) return; if (contentRef.current?.scrollTop === 0) touchStartY.current = e.touches[0].clientY; };
  const handleTouchMove = (e) => {
    if (ptrOff()) return;
    if (contentRef.current?.scrollTop === 0) {
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy > 0) setPullY(Math.min(dy, 80));
    }
  };
  const handleTouchEnd = () => {
    if (ptrOff()) { if (pullY) setPullY(0); return; }
    if (pullY > 50) {
      setIsRefreshing(true); haptic();
      // re-pull live collections on refresh
      api("/api/collections").then((d) => { if (d?.collections?.length) setCollections(d.collections); }).catch(() => {});
      setTimeout(() => { setIsRefreshing(false); setPullY(0); showToast("Refreshed!"); }, 1100);
    } else setPullY(0);
  };

  // ── markets ──
  const handleMarketToggle = (m) => {
    haptic();
    if (m === "All") { setSelectedMarkets(["All"]); return; }
    let nm = selectedMarkets.filter((x) => x !== "All");
    if (nm.includes(m)) { nm = nm.filter((x) => x !== m); if (!nm.length) nm = ["All"]; }
    else nm.push(m);
    setSelectedMarkets(nm);
  };

  // ── premium tier + multi-select attribute filters ──
  const tier = tierInfo.tier || "free";
  const attrCap = (tierInfo.caps && tierInfo.caps[tier]) || 1;   // max of each filter type
  const _attrState = (typ) => (
    typ === "model" ? [selectedModels, setSelectedModels]
    : typ === "symbol" ? [selectedSymbols, setSelectedSymbols]
    : [selectedBackdrops, setSelectedBackdrops]
  );
  const toggleAttr = (typ, name) => {
    haptic();
    const [cur, setCur] = _attrState(typ);
    if (cur.includes(name)) { setCur(cur.filter((x) => x !== name)); return; }
    if (attrCap <= 1) { setCur([name]); return; }          // free: single-select (no friction)
    if (cur.length >= attrCap) { showToast(t.filter_cap_hit.replace("{n}", attrCap)); return; }
    setCur([...cur, name]);
  };
  const clearAttr = (typ) => { haptic(); _attrState(typ)[1]([]); };
  // Short label for a filter trigger row: "Any" / the one name / "N selected".
  const attrLabel = (arr) => (!arr.length ? t.any : arr.length === 1 ? arr[0] : `${arr.length} ${t.selected_n}`);

  // ── SCOUT (real backend search; results live in the Results tab) ──
  const buildSearchParams = (sort, offset, minOv, maxOv) => {
    // Resolve the typed name to a real collection. An exact match wins;
    // otherwise fall back to the best prefix/fuzzy hit from the search index so
    // a mistyped or half-typed name (user hit Scout without picking a
    // suggestion) still searches the right gift instead of returning nothing.
    let col = collections.find((c) => c.name === giftQuery);
    let giftName = giftQuery;
    if (!col && giftQuery.trim()) {
      const best = searchIndex(searchIdx, giftQuery, 1)[0];
      if (best) {
        col = collections.find((c) => c.name === best.name) || null;
        giftName = best.name;
      }
    }
    const mn = minOv !== undefined ? minOv : minPrice;
    const mx = maxOv !== undefined ? maxOv : maxPrice;
    const p = new URLSearchParams();
    if (giftName) p.set("gift", giftName);
    if (col?.gift_id) p.set("gift_id", col.gift_id);
    if (col?.slug) p.set("slug", col.slug);
    if (giftId) p.set("num", giftId);
    if (selectedModels.length) p.set("model", selectedModels.join(","));
    if (selectedSymbols.length) p.set("symbol", selectedSymbols.join(","));
    if (selectedBackdrops.length) p.set("backdrop", selectedBackdrops.join(","));
    if (!selectedMarkets.includes("All")) p.set("markets", selectedMarkets.join(","));
    if (tgUser?.id) p.set("uid", tgUser.id);
    p.set("sort", sort || sortBy);
    p.set("limit", "100");
    if (mn) p.set("min_price", mn);
    if (mx) p.set("max_price", mx);
    if (offset) p.set("offset", offset);
    return p;
  };

  // Remember a search term (synced across devices via /api/userdata).
  const recordSearch = (q) => {
    q = (q || "").trim();
    if (!q) return;
    setRecentSearches((prev) => {
      const next = [q, ...prev.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 20);
      if (userSynced.current && window.Telegram?.WebApp?.initData) {
        api("/api/userdata", { method: "POST", body: { searches: next } }).catch(() => {});
      }
      return next;
    });
  };

  const handleScout = async () => {
    haptic("medium");
    setScoutError(null);
    setHasSearched(true);
    setResults([]);            // cancel/replace any previous search
    setPromos([]);             // promos re-fetched for the new collection
    setNextOffset("");
    setRenderCount(RENDER_CHUNK);
    setIsScouting(true);
    setActiveTab("results");   // results pop up in the next tab
    // Immediately reset the scroll position so the scouting strip is visible
    // at the top without the user having to scroll up first.
    if (contentRef.current) contentRef.current.scrollTop = 0;
    const newSort = "default"; // a brand-new search always starts in General
    setSortBy(newSort);
    setMinPrice(""); setMaxPrice("");   // clear price range on every fresh scout
    const started = Date.now();
    try {
      const p = buildSearchParams(newSort, "", "", "");
      let q = giftQuery.trim();
      let known = collectionNames.some((n) => n.toLowerCase() === q.toLowerCase());
      // Mistyped / half-typed without picking a suggestion: snap the box to the
      // resolved gift so the user sees what was actually searched.
      if (!known && q) {
        const best = searchIndex(searchIdx, q, 1)[0];
        if (best) { q = best.name; setGiftQuery(best.name); known = true; }
      }
      lastSearch.current = { sort: newSort, query: q, known };
      if (known) recordSearch(q);
      // Race-guard + cache: stamp this search, serve cached results instantly if
      // we have them (stale-while-revalidate), and drop the response if a newer
      // search has started since.
      const seq = ++searchSeq.current;
      const cacheKey = p.toString();
      const cached = searchCache.current.get(cacheKey);
      if (cached) {
        setResults(Array.isArray(cached.results) ? cached.results : []);
        setNextOffset(cached.next_offset || "");
      }
      const d = await api(`/api/search?${p.toString()}`, { timeout: 20000 });
      if (seq !== searchSeq.current) return;   // superseded by a newer search
      searchCache.current.set(cacheKey, { results: d?.results, next_offset: d?.next_offset });
      setResults(Array.isArray(d?.results) ? d.results : []);
      setNextOffset(d?.next_offset || "");
      // Blend promoted gifts for this collection (backend returns none for Scout Pro).
      const gid = selectedCollection?.gift_id || "";
      if (gid && (tierInfo?.tier || "free") !== "pro") {
        api(`/api/promos?gift_id=${encodeURIComponent(gid)}`)
          .then((pr) => setPromos(Array.isArray(pr?.promos) ? pr.promos : []))
          .catch(() => {});
      }
    } catch {
      setScoutError("offline");
      setResults([]);
    }
    const elapsed = Date.now() - started;
    setTimeout(() => { setIsScouting(false); setIsSearching(true); }, Math.max(0, 650 - elapsed));
  };

  // Click a floating background gift -> run a clean in-app search for it
  // (stays inside the app; no window switch).
  const scoutGift = async (col) => {
    if (!col?.name) return;
    haptic("medium");
    setGiftQuery(col.name);
    setGiftId(""); setSelectedModels([]); setSelectedSymbols([]);
    setSelectedBackdrops([]); setSelectedMarkets(["All"]); setMinPrice(""); setMaxPrice("");
    setScoutError(null); setHasSearched(true); setResults([]); setNextOffset("");
    setRenderCount(RENDER_CHUNK);
    setIsScouting(true); setActiveTab("results");
    if (contentRef.current) contentRef.current.scrollTop = 0;
    recordSearch(col.name);
    const newSort = "default"; // a brand-new search always starts in General
    setSortBy(newSort);
    try {
      const p = new URLSearchParams();
      p.set("gift", col.name);
      if (col.gift_id) p.set("gift_id", col.gift_id);
      if (col.slug) p.set("slug", col.slug);
      if (tgUser?.id) p.set("uid", tgUser.id);
      p.set("sort", newSort); p.set("limit", "100");
      lastSearch.current = { sort: newSort, query: col.name, known: true };
      const seq = ++searchSeq.current;
      const cacheKey = p.toString();
      const cached = searchCache.current.get(cacheKey);
      if (cached) {
        setResults(Array.isArray(cached.results) ? cached.results : []);
        setNextOffset(cached.next_offset || "");
      }
      const d = await api(`/api/search?${p.toString()}`, { timeout: 20000 });
      if (seq !== searchSeq.current) return;
      searchCache.current.set(cacheKey, { results: d?.results, next_offset: d?.next_offset });
      setResults(Array.isArray(d?.results) ? d.results : []);
      setNextOffset(d?.next_offset || "");
      setPromos([]);
      if (col.gift_id && (tierInfo?.tier || "free") !== "pro") {
        api(`/api/promos?gift_id=${encodeURIComponent(col.gift_id)}`)
          .then((pr) => setPromos(Array.isArray(pr?.promos) ? pr.promos : []))
          .catch(() => {});
      }
    } catch { setScoutError("offline"); setResults([]); }
    setTimeout(() => { setIsScouting(false); setIsSearching(true); }, 300);
  };

  // Load the next page of listings and append.
  const loadMore = async () => {
    if (!nextOffset || loadingMore) return;
    setLoadingMore(true);
    haptic();
    try {
      const p = buildSearchParams(sortBy, nextOffset);
      const d = await api(`/api/search?${p.toString()}`, { timeout: 20000 });
      const more = Array.isArray(d?.results) ? d.results : [];
      setResults((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        const merged = [...prev, ...more.filter((x) => !seen.has(x.id))];
        setRenderCount((c) => Math.max(c, merged.length));   // new page is immediately visible
        return merged;
      });
      setNextOffset(d?.next_offset || "");
    } catch { /* keep what we have */ }
    setLoadingMore(false);
  };

  // Re-run the current search with a new sort order.
  const reSort = async (sort) => {
    if (sort === sortBy) return;
    setSortBy(sort);
    if (!hasSearched) return;
    haptic();
    setIsScouting(true);
    setResults([]);
    setNextOffset("");
    setRenderCount(RENDER_CHUNK);
    try {
      const p = buildSearchParams(sort, "");
      const d = await api(`/api/search?${p.toString()}`, { timeout: 20000 });
      setResults(Array.isArray(d?.results) ? d.results : []);
      setNextOffset(d?.next_offset || "");
    } catch { setScoutError("offline"); }
    setIsScouting(false);
  };

  const applyPriceFilter = async () => {
    if (!hasSearched) return;
    haptic();
    setIsScouting(true);
    setResults([]);
    setNextOffset("");
    setRenderCount(RENDER_CHUNK);
    try {
      const p = buildSearchParams(sortBy, "");   // uses current minPrice/maxPrice state
      const d = await api(`/api/search?${p.toString()}`, { timeout: 20000 });
      setResults(Array.isArray(d?.results) ? d.results : []);
      setNextOffset(d?.next_offset || "");
    } catch { setScoutError("offline"); }
    setIsScouting(false);
  };

  const exitSearch = () => { setIsSearching(false); setIsScouting(false); setResults([]); setScoutError(null); setHasSearched(false); setNextOffset(""); };

  // ── saved ──
  const isSavedGift = (g) => savedGifts.some((s) => s.id === g.id);
  const toggleSave = (g) => {
    haptic();
    if (isSavedGift(g)) { setSavedGifts(savedGifts.filter((s) => s.id !== g.id)); showToast(t.remove_saved); }
    else { setSavedGifts([...savedGifts, g]); showToast(t.saved_done); }
  };

  // ── buy / view ──
  const handleBuy = (e, item) => {
    e?.stopPropagation?.();
    haptic();
    const url = marketplaceUrl(item);
    if (!url) { showToast(t.no_results); return; }
    safeOpen(url);
  };

  // ── referral + share ──
  // Prefer the friendly server code (888OG); fall back to the derived code until
  // it loads. The backend resolves either form, so links always work.
  const myRef = myRefCode || refCodeFor(tgUser?.id) || "";
  const copyReferral = () => {
    const link = `${REF_BOT_LINK}${myRef}`;
    if (copyText(link)) showToast(t.link_copied);
  };

  // ── premium: subscribe (Stars) + claim a vanity referral code ──
  const HOTON_STARS_LINK = "https://t.me/hotontgbot/app?startapp=UQBRBt4DBvWYNqP9_p9-nysR55R2PXz9BEZjvrxiPWvVBcJO";
  const refreshTier = () => api("/api/subscription").then((d) => { if (d?.tier) setTierInfo((p) => ({ ...p, ...d })); }).catch(() => {});
  const subscribe = async (planTier) => {
    if (!window.Telegram?.WebApp?.initData) { showToast(t.open_in_tg); return; }
    if (!tg?.openInvoice) { showToast(t.update_tg); return; }
    setBuying(planTier);
    try {
      const r = await api("/api/create-invoice", { method: "POST", body: { tier: planTier } });
      if (r?.ok && r.link) {
        tg.openInvoice(r.link, (status) => {
          setBuying("");
          if (status === "paid") { showToast(t.sub_thanks); setTimeout(refreshTier, 1500); }
          else if (status === "failed") showToast(t.sub_failed);
        });
      } else { setBuying(""); showToast(t.sub_failed); }
    } catch { setBuying(""); showToast(t.sub_failed); }
  };
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const cancelSubscription = async () => {
    if (!window.Telegram?.WebApp?.initData) { showToast(t.open_in_tg); return; }
    setCancelling(true);
    try {
      const r = await api("/api/subscription/cancel", { method: "POST", body: {} });
      if (r?.ok) {
        showToast(t.cancel_done);
        setConfirmCancel(false);
        setTimeout(refreshTier, 1200);
      } else {
        showToast(r?.error === "no_active_subscription" ? t.cancel_none : t.cancel_failed);
      }
    } catch { showToast(t.cancel_failed); }
    setCancelling(false);
  };
  const claimVanity = async () => {
    const code = vanityInput.trim().toUpperCase();
    if (!code) return;
    setVanityMsg("");
    try {
      const r = await api("/api/vanity", { method: "POST", body: { code } });
      if (r?.ok) { setMyRefCode(r.code); setVanityInput(""); setVanityMsg(t.vanity_ok); }
      else setVanityMsg(r?.error === "taken" ? t.vanity_taken : (r?.error === "pro" || r?.error === "premium") ? t.vanity_premium : t.vanity_bad);
    } catch { setVanityMsg(t.vanity_bad); }
  };

  // ── promote a gift (one-time Stars, any tier) ──
  const createPromo = async () => {
    if (!promoColl?.gift_id) { setPromoMsg(t.promo_pick_coll); return; }
    if (!window.Telegram?.WebApp?.initData) { showToast(t.open_in_tg); return; }
    if (!tg?.openInvoice) { showToast(t.update_tg); return; }
    setPromoBusy(true); setPromoMsg("");
    const isExternal = promoMarket === "Fragment" || promoMarket === "MarketApp";
    try {
      const r = await api("/api/promote/create", { method: "POST", body: {
        gift_id: promoColl.gift_id, slug: promoColl.slug || "", name: promoColl.name || "",
        marketplace: promoMarket, num: promoNum.trim(),
        model: "", symbol: "", backdrop: "", link: "",
      }, timeout: 20000 });
      if (!r?.ok || !r.link) {
        const m = r?.error === "collection" ? t.promo_bad_coll
                : r?.error === "auth"       ? t.open_in_tg : t.promo_failed;
        setPromoMsg(m); setPromoBusy(false); return;
      }
      tg.openInvoice(r.link, (status) => {
        setPromoBusy(false);
        if (status === "paid") {
          setPromoMsg(t.promo_live); haptic("medium");
          setPromoColl(null); setPromoModel(""); setPromoSymbol(""); setPromoBackdrop(""); setPromoLink(""); setPromoNum("");
          setTimeout(() => { setActiveSheet(null); setPromoMsg(""); }, 2000);
        } else if (status === "failed") { setPromoMsg(t.promo_failed); }
      });
    } catch { setPromoMsg(t.promo_failed); setPromoBusy(false); }
  };
  const reportPromo = (promo) => {
    haptic();
    setHiddenPromos((p) => [...p, promo.id]);   // hide immediately for this user
    showToast(t.promo_reported);
    api("/api/promote/report", { method: "POST", body: { id: promo.id } }).catch(() => {});
  };
  const openPromo = (promo) => {
    haptic();
    // Prefer the exact listing link the promoter supplied.
    if (promo.link && /^https:\/\//.test(promo.link)) { safeOpen(promo.link); return; }
    // Telegram promo pinned to a specific gift number -> open that exact gift.
    if (promo.num && promo.slug) { safeOpen(`https://t.me/nft/${promo.slug}-${promo.num}`); return; }
    if (promo.marketplace === "Fragment" && promo.slug) { safeOpen(`https://fragment.com/gifts/${promo.slug}`); return; }
    // Telegram (or missing slug): open the collection inside GiftTrove so live listings show.
    const col = collections.find((c) => String(c.gift_id) === String(promo.gift_id));
    if (col) { setActiveSheet(null); scoutGift(col); }
    else if (promo.slug) safeOpen(`https://t.me/nft/${promo.slug}`);
  };
  const withdrawAffiliate = async () => {
    const addr = affAddr.trim();
    const amt = parseInt(affAmount, 10);
    if (!addr) { setAffMsg(t.aff_need_addr); return; }
    if (!amt || amt <= 0) { setAffMsg(t.aff_need_amount); return; }
    setAffBusy(true); setAffMsg("");
    try {
      const r = await api("/api/affiliate/withdraw", { method: "POST", body: { ton_address: addr, amount: amt }, timeout: 20000 });
      if (r?.ok) {
        setAffMsg(t.aff_requested); haptic("medium"); setAffAddr(""); setAffAmount("");
        api("/api/affiliate").then((d) => setAffInfo(d || {})).catch(() => {});
        setTimeout(() => setAffPage("main"), 900);
      } else {
        setAffMsg(r?.error === "min" ? t.aff_min.replace("{n}", String(r.min || 1000))
          : r?.error === "pro" ? t.aff_pro_only : r?.error === "address" ? t.aff_need_addr
          : r?.error === "amount" ? t.aff_amount_invalid : t.aff_failed);
      }
    } catch { setAffMsg(t.aff_failed); }
    setAffBusy(false);
  };
  const shareGift = async (item) => {
    haptic();
    const link = giftDeepLink(item, myRef);
    const name = `${item?.name || "Telegram gift"}${item?.num != null ? ` #${item.num}` : ""}`;
    const mkt = item?.market || "Telegram";
    // The exact t.me gift link (item.slug already carries "{collectionSlug}-{num}").
    // Sent so the shared card can hyperlink the gift name AND let Telegram render
    // the gift's own preview under the message.
    const giftUrl = item?.slug ? `https://t.me/nft/${item.slug}` : "";
    let price = "";
    if (item?.price != null) {
      const n = Number(item.price);
      const amt = Number.isFinite(n) ? n.toLocaleString("en-US") : item.price;
      const cur = item.currency === "Stars" ? "Stars" : item.currency === "USDT" ? "USDT" : "GRAM";
      price = `${amt} ${cur}`;
    }
    // Preferred: a prepared message carrying the marketplace's PREMIUM custom
    // emoji (only possible through savePreparedInlineMessage + shareMessage).
    let attempted = false;
    try {
      if (tg?.shareMessage && window.Telegram?.WebApp?.initData) {
        attempted = true;   // backend counts the share on this call
        const r = await api("/api/share", { method: "POST", body: {
          name: item?.name, num: item?.num != null ? String(item.num) : "", market: mkt, price,
          slug: item?.slug || "", marketUrl: item?.url || "", giftUrl,
        } });
        if (r?.ok && r.id) { tg.shareMessage(r.id); return; }
      }
    } catch { /* fall back to the plain share sheet */ }
    // Fallback: plain share sheet — clean text, no emojis (branding rule).
    // Only count here if the prepared path never ran (avoids double-counting).
    try {
      if (!attempted && window.Telegram?.WebApp?.initData) {
        api("/api/share/track", { method: "POST", body: { name: item?.name } }).catch(() => {});
      }
    } catch { /* noop */ }
    const text = [name, `${mkt}${price ? ` \u00b7 ${price}` : ""}`, "", "Scout unique Telegram gifts on GiftTrove"].join("\n");
    safeOpen(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
  };

  // ── donate ──
  // ── card renderer ──
  const renderDetailNote = () => {
    if (!detailNote) return null;
    const promoPrice = Number(tierInfo?.promo_price) || 50;
    const promoDays  = Number(tierInfo?.promo_days)  || 3;
    const affPct     = Number(tierInfo?.affiliate_pct)   || 30;
    const affMin     = Number(tierInfo?.affiliate_min)   || 1000;
    const NOTES = {
      premium: {
        title: "GiftTrove Premium",
        paras: [
          "Subscriptions are billed monthly in Telegram Stars and renew automatically. You can manage or cancel anytime directly inside Telegram.",
          "All Star purchases are non-refundable.",
        ],
      },
      promote: {
        title: "Promote a Gift",
        paras: [
          `Feature your gift at the top of matching search results for ${promoDays} days \u2014 one-time fee of ${promoPrice} Stars.`,
          "Your promotion appears at the top of results matching users\u2019 selected attributes, as a direct redirect to your listing.",
          "GiftTrove takes no percentage or commission. You keep 100% of your revenue. The Stars fee is non-refundable.",
          "GiftTrove reserves the right to remove any promoted gift. A gift not currently listed for sale will not be displayed.",
        ],
      },
      affiliate: {
        title: "Affiliate Program",
        paras: [
          `Earn ${affPct}% of every subscription from members you invite \u2014 for as long as you hold Scout Pro.`,
          "Share your referral link. When someone subscribes through it, you earn a percentage as tracked Stars earnings.",
          `Earnings accrue only while you are Scout Pro. If your plan lapses, earnings pause. Withdrawn in GRAM to your wallet. Minimum: ${affMin} \u2605.`,
          "Fake or self-referrals forfeit all earnings and result in removal from the program.",
        ],
      },
    };
    // Localized note bodies, index-aligned with NOTES[*].paras. Defined here so
    // the interpolated values (promoDays, promoPrice, affPct, affMin) are in scope.
    const NOTES_TR = {
      premium: {
        ru: [
          "Подписки оплачиваются ежемесячно в Telegram Stars и продлеваются автоматически. Вы можете управлять подпиской или отменить её в любое время прямо в Telegram.",
          "Все покупки за Stars не возвращаются.",
        ],
        zh: [
          "订阅以 Telegram Stars 按月计费并自动续订。您可随时直接在 Telegram 内管理或取消。",
          "所有 Stars 购买均不可退款。",
        ],
      },
      promote: {
        ru: [
          `Разместите ваш подарок вверху подходящих результатов поиска на ${promoDays} дн. — разовая плата ${promoPrice} Stars.`,
          "Ваше продвижение появляется вверху результатов, соответствующих выбранным пользователем атрибутам, как прямое перенаправление к вашему объявлению.",
          "GiftTrove не берёт процент или комиссию. Вы оставляете себе 100% дохода. Плата в Stars не возвращается.",
          "GiftTrove оставляет за собой право удалить любой продвигаемый подарок. Подарок, не выставленный сейчас на продажу, не будет отображаться.",
        ],
        zh: [
          `将您的礼物展示在匹配的搜索结果顶部 ${promoDays} 天——一次性费用 ${promoPrice} Stars。`,
          "您的推广会显示在符合用户所选属性的结果顶部，作为指向您挂单的直接跳转。",
          "GiftTrove 不收取任何比例或佣金。您保留 100% 的收益。Stars 费用不可退还。",
          "GiftTrove 保留移除任何推广礼物的权利。当前未上架出售的礼物将不予展示。",
        ],
      },
      affiliate: {
        ru: [
          `Получайте ${affPct}% с каждой подписки приглашённых вами пользователей — пока у вас есть Scout Pro.`,
          "Делитесь своей реферальной ссылкой. Когда кто-то оформляет подписку по ней, вы получаете процент в виде учитываемого дохода в Stars.",
          `Доход начисляется только пока вы Scout Pro. Если подписка прекращается, начисления приостанавливаются. Вывод в GRAM на ваш кошелёк. Минимум: ${affMin} \u2605.`,
          "Фальшивые или само-рефералы лишают всех начислений и приводят к исключению из программы.",
        ],
        zh: [
          `从您邀请的会员的每笔订阅中赚取 ${affPct}%——只要您持有 Scout Pro。`,
          "分享您的推荐链接。当有人通过它订阅时，您将以可追踪的 Stars 收益形式赚取一定比例。",
          `收益仅在您为 Scout Pro 期间累积。若套餐失效，收益暂停。以 GRAM 提现至您的钱包。最低：${affMin} \u2605。`,
          "虚假或自我推荐将丧失所有收益，并导致被移出该计划。",
        ],
      },
    };
    const n = NOTES[detailNote];
    if (!n) return null;
    return (
      <div className="note-overlay" onClick={() => setDetailNote(null)}>
        <div className="note-pop detail-pop" onClick={(e) => e.stopPropagation()}>
          <div className="note-pop-title">{n.title}</div>
          <div className="note-pop-body detail-body">
            {n.paras.map((p, i) => (
              <p key={i} style={{ marginTop: i === 0 ? "0" : "10px", marginBottom: 0 }}>{lk === "en" ? p : ((NOTES_TR[detailNote] && NOTES_TR[detailNote][lk] && NOTES_TR[detailNote][lk][i]) || p)}</p>
            ))}
          </div>
          <button className="note-pop-btn" onClick={() => setDetailNote(null)}>{t.got_it}</button>
        </div>
      </div>
    );
  };

  const renderGiftCard = (item, i = 0, promoted = false, sold = false) => {
    const poster = item.image || giftImage(item.slug, item.num);
    const anim = item.animation || giftAnimation(item.slug, item.num);
    // Fragment's per-item CDN image can lag days behind a brand-new collection
    // (Fragment has to crawl/index it themselves); the collection's own
    // Telegram-sourced preview has no such lag, so it's the fallback.
    const fallbackPoster = collections.find((c) => String(c.gift_id) === String(item.gift_id))?.preview || null;
    const saved = isSavedGift(item);
    const dotHex = item.backdropHex;
    // item.slug already carries "{collectionSlug}-{num}" (see backend cdn_full),
    // so this produces the exact t.me/nft/{gift-name}-{gift-ID} format.
    const giftLink = item.slug ? `https://t.me/nft/${item.slug}` : (item.url || "");
    const handleSoldClick = (e) => { e?.stopPropagation?.(); haptic(); if (giftLink) safeOpen(giftLink); };
    return (
      <div key={item.id} className="result-card" style={{ animationDelay: `${Math.min(i, 16) * 0.035}s` }} onClick={() => { haptic(); setSelectedGift(item); setActiveSheet("gift_details"); }}>
        <div className="result-gift-hero" style={dotHex ? { background: `radial-gradient(circle at 50% 35%, ${dotHex}33, transparent 70%)` } : undefined}>
          <LottieGift src={anim} fallbackSrc={item.animationFallback} poster={poster} fallbackPoster={[item.imageFallback, fallbackPoster]} backdropColor={dotHex} symbolPattern={item.symbolImage} size={132} radius={18} />
          <div className="result-save" onClick={(e) => { e.stopPropagation(); toggleSave(item); }} style={{ color: saved ? "var(--tg-blue)" : "#fff" }}>
            {saved ? <IconBookmarkFilled /> : <IconBookmark />}
          </div>
        </div>
        <div className="result-name">{item.name}{item.num != null ? ` #${item.num}` : ""}</div>
        <div className="result-meta">
          <div className="meta-row"><span className="meta-icon-slot">{mktIcon(item.market, 14)}</span><span>{item.market}</span></div>
          {item.backdrop && (
            <div className="meta-row"><span className="meta-icon-slot">{dotHex ? <span className="color-dot" style={{ width: 10, height: 10, background: dotHex }} /> : null}</span><span>{item.backdrop}</span></div>
          )}
        </div>
        {item.model && (
          <div className="result-model">
            <span className={`model-rarity ${rarityClass(item.modelRarity)}`}>{item.model}</span>
            {item.modelRarity != null && <span style={{ marginLeft: 6 }}>{fmtRarity(item.modelRarity)}</span>}
          </div>
        )}
        <div className="result-foot">
          <div className="result-price">{sold ? null : (item.price != null ? <PriceTag item={item} size={17} exact={isDesktop} /> : <span className="result-view">{t.view_on}</span>)}</div>
          {sold
            ? <div className="badge-sold" onClick={handleSoldClick}>{t.sold}</div>
            : <div className="badge-buy" onClick={(e) => handleBuy(e, item)}>{t.buy}</div>}
        </div>
      </div>
    );
  };

  // Promoted gifts shown for the current scout: filter by the attribute filters the
  // user picked (a promo with no value for a type matches any filter of that type),
  // drop anything reported/dismissed this session.
  const promoMatch = (sel, val) => !val || sel.length === 0 || sel.includes(val);
  const visiblePromos = promos.filter((p) =>
    !hiddenPromos.includes(p.id) &&
    promoMatch(selectedModels, p.model) &&
    promoMatch(selectedSymbols, p.symbol) &&
    promoMatch(selectedBackdrops, p.backdrop));

  const renderPromoCard = (promo, i = 0) => {
    const num = promo.num ? Number(promo.num) : null;
    const collImg = collections.find((c) => String(c.gift_id) === String(promo.gift_id))?.preview;
    const poster = num != null ? giftImage(promo.slug, num) : (collImg || giftImage(promo.slug, 1));
    const anim = promo.animation || giftAnimation(promo.slug, num != null ? num : 1);
    const amt = (promo.amount || "").toString().trim();
    const n = amt ? Number(amt.replace(/,/g, "")) : null;
    const item = {
      id: `promo-${promo.id}`,
      name: promo.collection,
      slug: promo.slug,
      num,
      image: poster,
      price: amt && Number.isFinite(n) ? n : null,
      currency: promo.currency || "GRAM",
      model: promo.model || "",
      symbol: promo.symbol || "",
      backdrop: promo.backdrop || "",
      market: promo.marketplace,
      url: promo.link || "",
      gift_id: promo.gift_id,
      _promo: promo,
    };
    const saved = isSavedGift(item);
    return (
      <div key={item.id} className="result-card" style={{ animationDelay: `${Math.min(i, 16) * 0.035}s` }}
        onClick={() => { haptic(); setSelectedGift(item); setActiveSheet("gift_details"); }}>
        <div className="result-gift-hero">
          <LottieGift src={anim} poster={poster} fallbackPoster={collImg || null} size={132} radius={18} />
          <div className="result-save" onClick={(e) => { e.stopPropagation(); toggleSave(item); }} style={{ color: saved ? "var(--tg-blue)" : "#fff" }}>
            {saved ? <IconBookmarkFilled /> : <IconBookmark />}
          </div>
        </div>
        <div className="result-name">{item.name}{num != null ? ` #${num}` : ""}</div>
        <div className="result-meta">
          <div className="meta-row"><span className="meta-icon-slot">{mktIcon(item.market, 14)}</span><span>{item.market}</span></div>
          {item.backdrop && <div className="meta-row"><span className="meta-icon-slot" /><span>{item.backdrop}</span></div>}
        </div>
        {item.model && (
          <div className="result-model">
            <span className="model-rarity">{item.model}</span>
            {item.modelRarity != null && <span style={{ marginLeft: 6 }}>{fmtRarity(item.modelRarity)}</span>}
          </div>
        )}
        <div className="result-foot">
          <div className="result-price">{item.price != null ? <PriceTag item={item} size={17} exact={isDesktop} /> : <span className="result-view">{t.view_on}</span>}</div>
          <div className="badge-buy" onClick={(e) => { e.stopPropagation(); openPromo(promo); }}>{t.buy}</div>
        </div>
      </div>
    );
  };

  // ── SHEETS ──
  const renderSheet = () => {
    if (activeSheet === "premium") {
      const prices = tierInfo.prices || { plus: 100, pro: 300 };
      const exp = tierInfo.expires_at
        ? new Date(tierInfo.expires_at * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
        : "";
      const isPremium = tier === "plus" || tier === "pro";
      const statusLabel = tier === "pro" ? "Scout Pro" : tier === "plus" ? "Scout+" : t.tier_free;
      const Plan = ({ id, name, price, perks, accent }) => {
        const current = tier === id;
        return (
          <div className="plan-card" style={{ borderColor: current ? accent : "var(--separator)" }}>
            <div className="plan-head">
              <span className="plan-name" style={{ color: accent }}>{name}</span>
              <span className="plan-price"><TGStar size={17} />{price}<span className="plan-per">/{t.per_month}</span></span>
            </div>
            <div className="plan-perks">
              {perks.map((p, i) => (<div key={i} className="plan-perk"><span style={{ color: accent, display: "inline-flex" }}><IconCheck /></span>{p}</div>))}
            </div>
            {current
              ? <button className="action-btn secondary" disabled>{t.current_plan}</button>
              : <button className="action-btn" style={{ background: accent }} disabled={buying === id}
                  onClick={() => subscribe(id)}>{buying === id ? t.opening : t.subscribe}</button>}
          </div>
        );
      };
      return (
        <BottomSheet onClose={() => setActiveSheet(null)}>
          <SheetMotion gifts={collections} />
          <div className="sheet-body">
          <div className="sheet-title-row"><div className="sheet-title">{t.premium_title}</div><button className="sheet-info-btn" onClick={() => setDetailNote("premium")}><IconInfo /></button></div>
          <p className="premium-status">{t.you_are_on} <b>{statusLabel}</b>{isPremium && exp ? ` \u00b7 ${t.renews} ${exp}` : ""}</p>
          <Plan id="plus" name="Scout+" price={prices.plus} accent="#0a84ff" perks={[t.perk_5_filters]} />
          <Plan id="pro" name="Scout Pro" price={prices.pro} accent="#bf5af2" perks={[t.perk_unlimited, t.perk_vanity, t.perk_no_ads, t.perk_affiliate]} />

          <div className="hoton-cta" onClick={() => safeOpen(HOTON_STARS_LINK)}>
            <div className="hoton-star"><LottieGift src={HOTON_STAR_LOTTIE} size={46} radius={12} eager /></div>
            <div className="hoton-cta-body">
              <div className="hoton-cta-title">{t.need_stars}</div>
              <div className="hoton-cta-sub">{t.need_stars_sub}</div>
            </div>
            <IconChevronRight />
          </div>

          {isPremium && (
            confirmCancel ? (
              <div className="cancel-confirm">
                <p className="cancel-confirm-text">{t.cancel_confirm}</p>
                <div className="cancel-confirm-row">
                  <button className="bc-cancel" onClick={() => setConfirmCancel(false)}>{t.keep_plan}</button>
                  <button className="cancel-go" disabled={cancelling} onClick={cancelSubscription}>
                    {cancelling ? t.opening : t.cancel_yes}
                  </button>
                </div>
              </div>
            ) : (
              <button className="cancel-link" onClick={() => { haptic(); setConfirmCancel(true); }}>{t.cancel_sub}</button>
            )
          )}
          </div>
        </BottomSheet>
      );
    }
    if (activeSheet === "promote") {
      const price = tierInfo.promo_price || 50;
      const days = tierInfo.promo_days || 3;
      const PromoSelect = ({ label, options, value, onChange }) => (
        <div className="promo-field">
          <label className="promo-field-label">{label}</label>
          <select className="promo-select" value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">{t.promo_any}</option>
            {options.map((o) => <option key={o.name} value={o.name}>{o.name}</option>)}
          </select>
        </div>
      );
      const collMatches = collections
        .filter((c) => c.name.toLowerCase().includes(promoCollQuery.trim().toLowerCase()))
        .slice(0, 40);
      return (
        <BottomSheet onClose={() => setActiveSheet(null)}>
          <SheetMotion gifts={collections} />
          <div className="sheet-body">
          <div className="sheet-title-row"><div className="sheet-title">{t.promote_title}</div><button className="sheet-info-btn" onClick={() => setDetailNote("promote")}><IconInfo /></button></div>
          <div className="promo-field-label" style={{ marginTop: 4 }}>{t.promo_collection}</div>
          {!promoColl ? (
            <>
              <input className="ios-input" value={promoCollQuery} placeholder={t.promo_search_coll}
                onChange={(e) => setPromoCollQuery(e.target.value)} />
              <div className="promo-coll-list" onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                {collMatches.map((c) => (
                  <div key={c.gift_id} className="promo-coll-row" onClick={() => { haptic(); setPromoColl(c); setPromoCollQuery(""); }}>
                    {c.preview && <img src={c.preview} alt="" loading="lazy" className="promo-coll-img" />}
                    <span>{c.name}</span>
                  </div>
                ))}
                {collMatches.length === 0 && <div className="promo-coll-empty">{t.no_results}</div>}
              </div>
            </>
          ) : (
            <div className="promo-chosen">
              {promoColl.preview && <img src={promoColl.preview} alt="" className="promo-coll-img" />}
              <span style={{ flex: 1, fontWeight: 700 }}>{promoColl.name}</span>
              <button className="promo-change" onClick={() => setPromoColl(null)}>{t.promo_change}</button>
            </div>
          )}

          <div className="promo-field-label" style={{ marginTop: 14 }}>{t.promo_marketplace}</div>
          <div className="promo-market-row">
            {["Telegram", "MarketApp"].map((m) => (
              <button key={m} className={`promo-market-btn ${promoMarket === m ? "active" : ""}`}
                onClick={() => { haptic(); setPromoMarket(m); setPromoLink(""); }}>{m}</button>
            ))}
          </div>

          {promoMarket === "Telegram" ? (
            <>
              <div className="promo-field-label" style={{ marginTop: 14 }}>{t.promo_num_label} <span style={{ color: "#ff3b30" }}>*</span></div>
              <input className="ios-input" inputMode="numeric" value={promoNum}
                placeholder={t.promo_num_ph} onChange={(e) => setPromoNum(e.target.value.replace(/[^\d]/g, ""))} />
              <p className="promo-hint" style={{ marginTop: 10 }}>{t.promo_tg_note}</p>
            </>
          ) : promoMarket === "MarketApp" ? (
            <>
              <div className="promo-field-label" style={{ marginTop: 14 }}>{t.promo_num_label} <span style={{ color: "#ff3b30" }}>*</span></div>
              <input className="ios-input" inputMode="numeric" value={promoNum}
                placeholder={t.promo_num_ph} onChange={(e) => setPromoNum(e.target.value.replace(/[^\d]/g, ""))} />
              <p className="promo-hint">{t.promo_ma_note}</p>
            </>
          ) : (
            <>
              <div className="promo-field-label" style={{ marginTop: 14 }}>{t.promo_num_label} <span style={{ color: "#ff3b30" }}>*</span></div>
              <input className="ios-input" inputMode="numeric" value={promoNum}
                placeholder={t.promo_num_ph} onChange={(e) => setPromoNum(e.target.value.replace(/[^\d]/g, ""))} />
              <p className="promo-hint">{t.promo_frag_note}</p>
            </>
          )}

          <button className="action-btn" style={{ background: "linear-gradient(135deg, #ff9f0a, #ff375f)", marginTop: 16 }}
            disabled={!promoColl || !promoNum.trim() || promoBusy}
            onClick={createPromo}>
            <TGStar size={16} /> &nbsp;{promoBusy ? t.opening : t.promote_cta.replace("{n}", String(price))}
          </button>
          {!promoNum.trim() && promoColl && <p className="promo-hint" style={{ color: "#ff9f0a", textAlign: "center" }}>{t.promo_num_required}</p>}
          {promoMsg && <p className="vanity-msg" style={{ textAlign: "center" }}>{promoMsg}</p>}
          </div>
        </BottomSheet>
      );
    }
    if (activeSheet === "faq" || activeSheet === "terms" || activeSheet === "privacy") {
      const title = activeSheet === "faq" ? "FAQ" : activeSheet === "terms" ? "Terms of Service" : "Privacy Policy";
      const rows = LEGAL[activeSheet] || [];
      return (
        <BottomSheet onClose={() => setActiveSheet(null)}>
            <div className="sheet-title">{title}</div>
            <div className="legal-body" onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
              {rows.map(([h, p], i) => (
                <div key={i} className="legal-item">
                  <div className="legal-q">{h}</div>
                  <div className="legal-a">{lk === "en" ? p : ((LEGAL_TR[activeSheet] && LEGAL_TR[activeSheet][lk] && LEGAL_TR[activeSheet][lk][i]) || p)}</div>
                </div>
              ))}
              <div className="legal-foot">Last updated June 2026</div>
            </div>
        </BottomSheet>
      );
    }
    if (!activeSheet) return null;

    if (activeSheet === "gift_details" && selectedGift) {
      const g = selectedGift;
      const saved = isSavedGift(g);
      const anim = g.animation || giftAnimation(g.slug, g.num);
      const img = g.image || giftImage(g.slug, g.num);
      const detailFallback = collections.find((c) => String(c.gift_id) === String(g.gift_id))?.preview || null;
      const dot = g.backdropHex;
      return (
        <BottomSheet onClose={() => setActiveSheet(null)}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 18 }}>
              <LottieGift src={anim} fallbackSrc={g.animationFallback} poster={img} fallbackPoster={[g.imageFallback, detailFallback]} backdropColor={dot} symbolPattern={g.symbolImage} size={132} radius={24} />
              <div className="sheet-title" style={{ margin: 0 }}>{g.name}{g.num != null ? ` #${g.num}` : ""}</div>
            </div>
            <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 15, fontWeight: 500, marginBottom: 20 }}>{g.market}</div>
            <div className="ios-group" style={{ margin: 0, marginBottom: 24 }}>
              {g.model && (
                <div className="ios-row" style={{ cursor: "default" }}>
                  <span style={{ color: "var(--text-secondary)" }}>{t.model}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {g.model}<span className={`model-rarity ${rarityClass(g.modelRarity)}`}>{fmtRarity(g.modelRarity)}</span>
                  </span>
                </div>
              )}
              {g.backdrop && (
                <div className="ios-row" style={{ cursor: "default" }}>
                  <span style={{ color: "var(--text-secondary)" }}>{t.backdrop}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {dot && <span className="color-dot" style={{ background: dot }} />}{g.backdrop}
                    {g.backdropRarity != null && <span className={`model-rarity ${rarityClass(g.backdropRarity)}`}>{fmtRarity(g.backdropRarity)}</span>}
                  </span>
                </div>
              )}
              {g.symbol && (
                <div className="ios-row" style={{ cursor: "default" }}>
                  <span style={{ color: "var(--text-secondary)" }}>{t.symbol}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {g.symbol}
                    {g.symbolRarity != null && <span className={`model-rarity ${rarityClass(g.symbolRarity)}`}>{fmtRarity(g.symbolRarity)}</span>}
                  </span>
                </div>
              )}
              <div className="ios-row" style={{ cursor: "default" }}>
                <span style={{ color: "var(--text-secondary)" }}>{t.listed_value}</span>
                <span style={{ color: "var(--tg-blue)", fontWeight: 800 }}>
                  {g.price != null ? <PriceTag item={g} size={17} exact label /> : "—"}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="action-btn" style={{ flex: 1, background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border)", marginTop: 0 }} onClick={() => { toggleSave(g); setActiveSheet(null); }}>
                {saved ? t.remove_saved : t.save_gift}
              </button>
              <button className="action-btn" style={{ flex: 1, marginTop: 0 }} onClick={(e) => { e.stopPropagation(); if (g._promo) { setActiveSheet(null); openPromo(g._promo); } else handleBuy(e, g); }}>{t.buy_now}</button>
              <button className="share-btn" onClick={() => shareGift(g)} title={t.share_gift}><IconShare /></button>
            </div>
        </BottomSheet>
      );
    }

    if (activeSheet === "lang") {
      return (
        <BottomSheet onClose={() => setActiveSheet(null)}>
            <div className="sheet-title">{t.language}</div>
            <div className="ios-group" style={{ margin: 0 }}>
              {Object.entries(LANGS).map(([k, v]) => (
                <div key={k} className="sheet-list-item" onClick={() => { haptic(); setLang(k); setActiveSheet(null); }}>
                  <span>{v}</span>{lang === k && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
                </div>
              ))}
            </div>
        </BottomSheet>
      );
    }

    if (activeSheet === "model" || activeSheet === "symbol") {
      const isModel = activeSheet === "model";
      const fragmentOnly = selectedMarkets.length === 1 && selectedMarkets[0] === "Fragment";
      if (fragmentOnly) {
        return (
          <BottomSheet onClose={() => setActiveSheet(null)}>
              <div className="sheet-title">{isModel ? t.model : t.symbol}</div>
              <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: 16, fontSize: 14 }}>
                {t.frag_attr_note}
              </p>
          </BottomSheet>
        );
      }
      const list = isModel ? attrs.models : attrs.symbols;
      const arr = isModel ? selectedModels : selectedSymbols;
      const typ = isModel ? "model" : "symbol";
      const q = attrSearch.trim().toLowerCase();
      const filteredList = q ? list.filter((m) => (m.name || "").toLowerCase().includes(q)) : list;
      return (
        <BottomSheet onClose={() => setActiveSheet(null)}>
            <div className="sheet-title">{isModel ? t.model : t.symbol}</div>
            {attrCap > 1
              ? <div className="filter-cap-note">{arr.length}/{attrCap >= 999 ? "\u221E" : attrCap} {t.selected_n}</div>
              : <div className="filter-cap-note upsell" onClick={() => setActiveSheet("premium")}>{t.filter_upsell}<IconChevronRight /></div>}
            {list.length > 6 && (
              <div className="attr-search-box">
                <IconSearch size={16} />
                <input
                  type="text" value={attrSearch} placeholder={t.attr_search}
                  onChange={(e) => setAttrSearch(e.target.value)}
                  className="attr-search-input"
                />
                {attrSearch && <button className="attr-search-clear" onClick={() => setAttrSearch("")}><IconClose /></button>}
              </div>
            )}
            <div className="attr-scroll" onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
              {list.length === 0 && (
                <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: 16, fontSize: 14 }}>
                  {selectedCollection ? t.attrs_loading : `${t.select_gift_first} ${isModel ? t.model.toLowerCase() : t.symbol.toLowerCase()}`}
                </p>
              )}
              <div className="ios-group" style={{ margin: 0 }}>
                {!q && (
                  <div className="sheet-model-item" onClick={() => clearAttr(typ)}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{t.any}</span>
                    {arr.length === 0 && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
                  </div>
                )}
                {filteredList.map((m) => (
                  <div key={m.name} className="sheet-model-item" onClick={() => toggleAttr(typ, m.name)}>
                    <div className="model-left">
                      {m.img
                        ? <img src={m.img} alt="" className={isModel ? "opt-thumb" : "opt-thumb sym"} onError={(e) => { e.target.style.display = "none"; }} />
                        : <span className="gift-tile"><IconGiftBox /></span>}
                      <div className="model-info">
                        <span className="model-name">{m.name}</span>
                        {m.rarity != null && <span className={`model-rarity ${rarityClass(m.rarity)}`}>{fmtRarity(m.rarity)} {t.rarity}</span>}
                      </div>
                    </div>
                    {arr.includes(m.name) && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
                  </div>
                ))}
                {q && filteredList.length === 0 && (
                  <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "16px 0", fontSize: 14 }}>{t.no_results}</p>
                )}
              </div>
            </div>
            <button className="action-btn" style={{ marginTop: 16 }} onClick={() => setActiveSheet(null)}>{t.done}</button>
        </BottomSheet>
      );
    }

    if (activeSheet === "backdrop") {
      const fragmentOnlyB = selectedMarkets.length === 1 && selectedMarkets[0] === "Fragment";
      if (fragmentOnlyB) {
        return (
          <BottomSheet onClose={() => setActiveSheet(null)}>
              <div className="sheet-title">{t.backdrop}</div>
              <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: 16, fontSize: 14 }}>
                {t.frag_attr_note}
              </p>
          </BottomSheet>
        );
      }
      const list = attrs.backdrops;
      const arr = selectedBackdrops;
      const qb = attrSearch.trim().toLowerCase();
      const filteredBackdrops = qb ? list.filter((c) => (c.name || "").toLowerCase().includes(qb)) : list;
      return (
        <BottomSheet onClose={() => setActiveSheet(null)}>
            <div className="sheet-title">{t.backdrop}</div>
            {attrCap > 1
              ? <div className="filter-cap-note">{arr.length}/{attrCap >= 999 ? "\u221E" : attrCap} {t.selected_n}</div>
              : <div className="filter-cap-note upsell" onClick={() => setActiveSheet("premium")}>{t.filter_upsell}<IconChevronRight /></div>}
            {list.length > 6 && (
              <div className="attr-search-box">
                <IconSearch size={16} />
                <input
                  type="text" value={attrSearch} placeholder={t.attr_search}
                  onChange={(e) => setAttrSearch(e.target.value)}
                  className="attr-search-input"
                />
                {attrSearch && <button className="attr-search-clear" onClick={() => setAttrSearch("")}><IconClose /></button>}
              </div>
            )}
            <div className="attr-scroll" onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
              {list.length === 0 && (
                <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: 16, fontSize: 14 }}>
                  {selectedCollection ? t.attrs_loading : `${t.select_gift_first} ${t.backdrop.toLowerCase()}`}
                </p>
              )}
              <div className="ios-group" style={{ margin: 0 }}>
                {!qb && (
                  <div className="sheet-list-item" onClick={() => clearAttr("backdrop")}>
                    <span>{t.any}</span>{arr.length === 0 && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
                  </div>
                )}
                {filteredBackdrops.map((c) => (
                  <div key={c.name} className="sheet-list-item" onClick={() => toggleAttr("backdrop", c.name)}>
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {c.hex && <span className="backdrop-swatch" style={{ background: c.edge ? `radial-gradient(circle at 50% 35%, ${c.hex}, ${c.edge})` : c.hex }} />}{c.name}
                      {c.rarity != null && <span className={`model-rarity ${rarityClass(c.rarity)}`} style={{ marginLeft: 4 }}>{fmtRarity(c.rarity)}</span>}
                    </span>
                    {arr.includes(c.name) && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
                  </div>
                ))}
                {qb && filteredBackdrops.length === 0 && (
                  <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "16px 0", fontSize: 14 }}>{t.no_results}</p>
                )}
              </div>
            </div>
            <button className="action-btn" style={{ marginTop: 16 }} onClick={() => setActiveSheet(null)}>{t.done}</button>
        </BottomSheet>
      );
    }

    return null;
  };

  // ── SCOUT TAB (search form only — results render in the Results tab) ──
  // Ranked, indexed, memoized — exact > starts-with > word-start > contains.
  // Returns names (same shape as before) so the dropdown below is a drop-in.
  const filteredGifts = useMemo(
    () => searchIndex(searchIdx, giftQuery, 12).map((it) => it.name),
    [searchIdx, giftQuery]
  );
  const renderScout = (desktop = false) => {
    return (
      <div className="fade-in-up">
        <div className={desktop ? "hero-title desktop" : "hero-title"}>
          {t.fastest_way}
          <svg className="hero-title-img" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <rect width="512" height="512" rx="112" fill="#0098EA"/>
            <path d="M74.12,252.09 C180.90,205.77 251.85,175.05 287.44,160.18 C388.87,118.00 410.08,110.69 423.73,110.44 C426.66,110.44 433.48,111.17 437.87,114.59 C441.53,117.51 442.75,121.66 443.23,124.58 C443.72,127.51 444.21,133.85 443.72,138.97 C438.11,196.75 414.47,336.94 402.28,401.79 C397.16,429.09 387.16,438.36 377.41,439.33 C356.20,441.28 339.86,425.19 319.38,411.78 C287.20,390.57 268.92,377.41 237.71,356.93 C201.63,333.04 225.27,320.36 245.75,298.90 C251.12,293.30 344.74,208.21 346.44,200.41 C346.69,199.43 346.93,195.77 344.74,193.82 C342.54,191.87 339.37,192.85 337.18,193.34 C334.01,194.07 282.57,227.96 182.85,295.25 C168.22,305.24 155.30,310.12 143.36,309.87 C130.19,309.63 105.32,302.56 86.55,296.46 C63.63,289.15 45.35,285.01 47.05,272.33 C47.79,265.75 56.81,259.16 74.12,252.09 Z" fill="#FFFFFF"/>
          </svg>
        </div>

        <div className="input-group">
          <div className="section-label">{t.gift_name}</div>
          <input className="ios-input" placeholder="e.g. Plush Pepe" value={giftQuery}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onChange={(e) => { setGiftQuery(e.target.value); setShowSuggestions(true); }} />
          {showSuggestions && giftQuery && filteredGifts.length > 0 && (
            <div className="suggestions-dropdown"
              onTouchStart={(e) => { suggestTouch.current = { y: e.touches[0].clientY, moved: false }; }}
              onTouchMove={(e) => { if (Math.abs(e.touches[0].clientY - suggestTouch.current.y) > 8) suggestTouch.current.moved = true; }}>
              {filteredGifts.slice(0, 12).map((g) => {
                const col = collections.find((c) => c.name === g);
                const pick = () => { setGiftQuery(g); setShowSuggestions(false); };
                return (
                  <div key={g} className="suggestion-item"
                    onMouseDown={(e) => { e.preventDefault(); pick(); }}
                    onTouchEnd={(e) => { if (suggestTouch.current.moved) return; e.preventDefault(); pick(); }}>
                    {col?.preview
                      ? <img src={col.preview} alt={g} className="suggestion-gift-img" onError={(e) => { e.target.style.opacity = 0.2; }} />
                      : <span className="gift-tile sm"><IconGiftBox /></span>}
                    {g}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="input-group">
          <div className="section-label">{t.specific_id} <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>{t.optional}</span></div>
          <input type="number" inputMode="numeric" className="ios-input" placeholder="#12345" value={giftId} onChange={(e) => setGiftId(e.target.value)} />
        </div>

        <div className="input-group">
          <div className="section-label">{t.marketplaces}</div>
          <div className="chips-grid">
            {MARKETPLACES.map((m) => {
              const live = m === "All" || LIVE_MARKETS.has(m);
              return (
                <div key={m}
                  className={`chip ${selectedMarkets.includes(m) ? "active" : ""} ${live ? "" : "chip-soon"}`}
                  onClick={live ? () => handleMarketToggle(m) : undefined}>
                  {m}
                  {!live && <span className="chip-info" onClick={(e) => { e.stopPropagation(); haptic(); setMarketSoonNote(m); }}><IconInfo /></span>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="input-group">
          <div className="section-label">{t.attributes}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button className="select-btn" disabled={!selectedCollection} onClick={() => setActiveSheet("model")}>
              <span>{t.model}</span><span className="select-val">{attrLabel(selectedModels)} <IconChevronRight /></span>
            </button>
            <button className="select-btn" disabled={!selectedCollection} onClick={() => setActiveSheet("backdrop")}>
              <span>{t.backdrop}</span>
              <span className="select-val">
                {selectedBackdrops.length === 1 && (() => { const c = attrs.backdrops.find((x) => x.name === selectedBackdrops[0]); return c?.hex ? <span className="color-dot" style={{ background: c.hex, width: 14, height: 14 }} /> : null; })()}
                {attrLabel(selectedBackdrops)} <IconChevronRight />
              </span>
            </button>
            <button className="select-btn" disabled={!selectedCollection} onClick={() => setActiveSheet("symbol")}>
              <span>{t.symbol}</span><span className="select-val">{attrLabel(selectedSymbols)} <IconChevronRight /></span>
            </button>
          </div>
        </div>

        <button className="action-btn" onClick={handleScout} disabled={!giftQuery}>{t.scout_gift}</button>
      </div>
    );
  };

  // ── RESULTS TAB (persistent; replaces Alerts) ──
  const renderResults = (desktop = false) => {
    if (isScouting) {
      return (
        <div className="fade-in-up">
          <div className="scouting-strip">
            <div className="scouting-spinner" />
            <div>
              <div className="scouting-title">{t.scouting_title}</div>
              <div className="scouting-markets">
                {(selectedMarkets.includes("All")
                  ? ["Telegram", "Fragment", "MarketApp"]
                  : selectedMarkets
                ).map((m) => (
                  <span key={m} className="scouting-market-chip">{m}</span>
                ))}
              </div>
            </div>
          </div>
          <SkeletonCards n={8} desktop={desktop} />
        </div>
      );
    }
    if (scoutError) {
      return (
        <div className="fade-in-up">
          <div className={desktop ? "page-header desktop" : "page-header"}>{t.results_tab}</div>
          <div className="empty-state">
            <IconGlobe />
            <div className="es-title">{t.offline_title}</div>
            <div>{t.offline_sub}</div>
            <button className="action-btn" style={{ marginTop: 20 }} onClick={handleScout}>{t.try_again}</button>
          </div>
        </div>
      );
    }
    if (!hasSearched || (results.length === 0 && visiblePromos.length === 0)) {
      const ls = lastSearch.current || {};
      const unknown = hasSearched && ls.query && ls.known === false;
      const title = !hasSearched ? t.results_empty_title : (unknown ? t.unknown_gift_title : t.no_results);
      const sub = !hasSearched ? t.results_empty_sub : (unknown ? t.unknown_gift_sub.replace("{q}", ls.query) : t.no_listings_sub);
      return (
        <div className="fade-in-up">
          <div className={desktop ? "page-header desktop" : "page-header"}>{t.results_tab}</div>
          <div className="empty-state">
            <IconClipboard trigger={activeTab === "results"} size={30} />
            <div className="es-title">{title}</div>
            <div>{sub}</div>
            <button className="action-btn" style={{ marginTop: 20 }} onClick={() => { haptic(); setActiveTab("scout"); }}>{t.scout_tab}</button>
          </div>
        </div>
      );
    }
    return (
      <div className="fade-in-up" style={{ marginTop: 4 }}>
        <div className="results-head">
          <div className={desktop ? "results-title desktop" : "results-title"}>{t.results}</div>
          <div className="results-count">{results.length > 0 ? t.showing_n.replace("{n}", results.length) : ""}</div>
        </div>

        {/* sort + price filter */}
        <div className="filter-bar">
          <div className="sort-toggle">
            <button className={`sort-pill ${sortBy === "default" ? "active" : ""}`} onClick={() => reSort("default")}>{t.sort_general}</button>
            <button className={`sort-pill ${sortBy === "price_asc" ? "active" : ""}`} onClick={() => reSort("price_asc")}><IconArrowUp /> {t.sort_low}</button>
            <button className={`sort-pill ${sortBy === "price_desc" ? "active" : ""}`} onClick={() => reSort("price_desc")}><IconArrowDown /> {t.sort_high}</button>
          </div>
          <div className="range-mini">
            <input className="range-input" inputMode="numeric" placeholder={t.min_label} value={minPrice} onChange={(e) => setMinPrice(e.target.value.replace(/[^\d.]/g, ""))} />
            <span className="range-dash">–</span>
            <input className="range-input" inputMode="numeric" placeholder={t.max_label} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d.]/g, ""))} />
            <button className="range-go" onClick={applyPriceFilter}>{t.apply_filter}</button>
          </div>
        </div>

        <div className={desktop ? "results-grid desktop" : "results-grid"}>
          {visiblePromos.map((p, i) => renderPromoCard(p, i))}
          {results.slice(0, renderCount).map((item, i) => renderGiftCard(item, i))}
        </div>

        {renderCount < results.length && (
          <RevealSentinel onReveal={() => setRenderCount((c) => Math.min(results.length, c + RENDER_CHUNK))} />
        )}

        {nextOffset && renderCount >= results.length && (
          loadingMore
            ? <div className="load-more-btn" style={{ pointerEvents: "none" }}><span className="lm-spin" /></div>
            : <RevealSentinel onReveal={loadMore} />
        )}
      </div>
    );
  };

  // ── SAVED TAB ──
  const renderSaved = (desktop = false) => (
    <div className="fade-in-up">
      <div className={desktop ? "page-header desktop" : "page-header"}>{t.saved_tab}</div>
      {savedGifts.length === 0 ? (
        <div className="ios-group" style={{ padding: 20, textAlign: "center", color: "var(--text-secondary)" }}>{t.no_saved}</div>
      ) : (
        <>
          <div className={desktop ? "results-grid desktop" : "results-grid"}>
            {savedGifts.slice(0, savedRenderCount).map((item) => renderGiftCard(item, 0, false, !!soldMap[item.id]))}
          </div>
          {savedRenderCount < savedGifts.length && (
            <RevealSentinel onReveal={() => setSavedRenderCount((c) => Math.min(savedGifts.length, c + RENDER_CHUNK))} />
          )}
        </>
      )}
    </div>
  );

  // ── PROFILE TAB ──
  const renderProfile = (desktop = false) => (
    <div className="fade-in-up">
      {/* Profile header — a brand banner with a big centered avatar, the name in
          white (reads in both themes against the gradient), and the join date. */}
      <div className="profile-hero">
        <img className="profile-hero-logo-deco" src={LOGO_URL} alt="" aria-hidden="true" />
        <div className="profile-hero-content">
          <img className="profile-hero-avatar" src={avatarSrc} alt="" />
          <div className="profile-hero-name">
            {[tgUser?.first_name, tgUser?.last_name].filter(Boolean).join(" ") || "Scout"}
          </div>
          <div className="profile-hero-joined">
            {t.joined_label || "Joined"}{" "}
            {new Date(joinedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </div>
        </div>
      </div>

      <div className="section-label" style={{ marginTop: 12 }}>{t.premium_label}</div>
      <div className="ios-group">
        <div className="ios-row" onClick={() => { haptic(); setActiveSheet("premium"); }}>
          <div className="row-left"><div className="row-icon-box" style={{ background: "linear-gradient(135deg, #0a84ff, #bf5af2)" }}><TGStar size={16} /></div>{t.premium_row}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: tier === "free" ? "var(--text-secondary)" : "var(--tg-blue)", fontWeight: 700, fontSize: 14 }}>{tier === "pro" ? "Scout Pro" : tier === "plus" ? "Scout+" : t.tier_free}</span>
            <IconChevronRight />
          </div>
        </div>
        <div className="ios-row" onClick={() => { haptic(); setActiveSheet("promote"); }}>
          <div className="row-left"><div className="row-icon-box" style={{ background: "linear-gradient(135deg, #ff9f0a, #ff375f)" }}><TGStar size={16} /></div>{t.promote_row}</div>
          <IconChevronRight />
        </div>
        <div className="ios-row" onClick={() => { haptic(); setAffPage("main"); }}>
          <div className="row-left"><div className="row-icon-box" style={{ background: "linear-gradient(135deg, #30d158, #0a84ff)" }}><IconHeart /></div>{t.affiliate_row}</div>
          <IconChevronRight />
        </div>
      </div>

      <div className="section-label" style={{ marginTop: 12 }}>{t.referrals}</div>
      <div className="ios-group">
        <div className="ios-row" onClick={copyReferral}>
          <div className="row-left"><div className="row-icon-box" style={{ background: "#ff9500" }}><IconCopy /></div>{t.copy_ref}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {myRefCode && <span style={{ color: "var(--text-secondary)", fontWeight: 800, fontSize: 15, letterSpacing: "0.08em" }}>{myRefCode}</span>}
            <button className="ref-edit-btn" title={t.vanity_title}
              onClick={(e) => { e.stopPropagation(); haptic(); if (tier === "pro") setEditingVanity((v) => !v); else setActiveSheet("premium"); }}>
              <IconEdit />
            </button>
          </div>
        </div>
        {editingVanity && tier === "pro" && (
          <div className="ios-row vanity-inline">
            <p className="vanity-help">{t.vanity_help}</p>
            <div className="vanity-row">
              <input className="ios-input" style={{ flex: 1 }} value={vanityInput} maxLength={12}
                onChange={(e) => setVanityInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                placeholder={t.vanity_ph} />
              <button className="action-btn" style={{ width: "auto", padding: "0 18px", margin: 0 }} onClick={claimVanity}>{t.claim}</button>
            </div>
            {vanityMsg && <p className="vanity-msg">{vanityMsg}</p>}
          </div>
        )}
        <div className="ios-row" style={{ cursor: "default" }}>
          <div className="row-left">{t.ref_count}</div>
          <div style={{ color: "var(--tg-blue)", fontWeight: 700, fontSize: 16 }}>{referralCount}</div>
        </div>
      </div>

      <div className="section-label">{t.community}</div>
      <div className="ios-group">
        <div className="ios-row" onClick={() => safeOpen(COMMUNITY.channel)}>
          <div className="row-left"><div className="row-icon-box" style={{ background: "#ff9500" }}><IconGlobe /></div>{t.comm_channel}</div>
          <IconChevronRight />
        </div>
        <div className="ios-row" onClick={() => safeOpen(COMMUNITY.x)}>
          <div className="row-left"><div className="row-icon-box" style={{ background: "#000" }}><IconXLogo /></div>{t.x_account}</div>
          <IconChevronRight />
        </div>
        <div className="ios-row" onClick={() => safeOpen(COMMUNITY.insideMajek)}>
          <div className="row-left"><div className="row-icon-box" style={{ background: "#5856d6" }}><IconUser /></div>{t.inside_majek}</div>
          <IconChevronRight />
        </div>
        <div className="ios-row" onClick={() => safeOpen(COMMUNITY.support)}>
          <div className="row-left"><div className="row-icon-box" style={{ background: "#34c759" }}><IconHeart /></div>{t.support}</div>
          <IconChevronRight />
        </div>
      </div>

      <div className="profile-footer">        <div className="footer-links">
          <span onClick={() => { haptic(); setActiveSheet("faq"); }}>FAQs</span>
          <span className="dot">|</span>
          <span onClick={() => { haptic(); setActiveSheet("terms"); }}>Terms &amp; Conditions</span>
          <span className="dot">|</span>
          <span onClick={() => { haptic(); setActiveSheet("privacy"); }}>Privacy Policy</span>
          <span className="dot">|</span>
          <span onClick={clearMyData} style={clearArmed ? { color: "#ff3b30", fontWeight: 700 } : undefined}>
            {clearArmed ? "Confirm clear" : "Clear my data"}
          </span>
          <span className="dot">|</span>
          <span onClick={() => { haptic(); setAffPage("main"); }}>Affiliate Program</span>
          <span className="dot">|</span>
          <span className="footer-api-item" onClick={() => { haptic(); setSoonNote(true); }}>Agent API <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,verticalAlign:"-0.15em",opacity:0.7}}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg></span>
        </div>
        <div className="footer-copy">{"\u00a9"} 2026 GiftTrove {"\u2022"} All Rights Reserved</div>
      </div>
    </div>
  );

  const renderActiveTab = (desktop = false) => {
    switch (activeTab) {
      case "scout": return renderScout(desktop);
      case "results": return renderResults(desktop);
      case "saved": return renderSaved(desktop);
      case "profile": return renderProfile(desktop);
      default: return null;
    }
  };

  // ── LAUNCH SPLASH: mascot load screen (replaces the old access page) ──
  if (booting) {
    return (
      <>
        <style>{styles}</style>
        <GoldDefs />
        <div className={`splash${splashLeaving ? " splash-leaving" : ""}`} data-theme={theme}
          style={{ "--splash-ms": `${splashMs}ms` }}>
          <div className="splash-glow" />

          <div className="splash-layout">
            <div className="splash-top">
              <div className="splash-eyebrow">{t.splash_eyebrow}</div>
              <div className="splash-hero">GiftTrove</div>
            </div>

            <div className="splash-subject">
              <div className="splash-orbit-wrap">
                <img src={MASCOT_URL} alt="" className="splash-mascot"
                  onError={(e) => { e.currentTarget.style.display = "none"; }} />

                {/* Marketplace badges — the inner, prominent triangle (top-left,
                    top-right, bottom-centre). Dark glass badges: the real marks
                    are white/light (Telegram, Fragment) or blue (MarketApp), so a
                    dark backing is what actually makes them read clearly — a
                    white badge would hide the white ones. */}
                <div className="splash-badge b-tg" style={{ animationDelay: "0.5s" }}>
                  <img src="/marks/telegram.png" alt="Telegram" />
                </div>
                <div className="splash-badge b-frag" style={{ animationDelay: "0.62s" }}>
                  <img src="/marks/fragment.png" alt="Fragment" />
                </div>
                <div className="splash-badge b-ma" style={{ animationDelay: "0.74s" }}>
                  <img src="/marks/marketapp.png" alt="MarketApp" />
                </div>

                {/* Gift stickers — the outer, secondary triangle, interleaved in
                    the gaps between the marketplace badges (top-centre, mid-left,
                    mid-right). Smaller and softer so the marketplaces stay the
                    visual focus. */}
                <div className="splash-charm c-durov" style={{ animationDelay: "0.86s" }}>
                  <img src="/lottie-posters/gift_minidurov.png" alt="" className="splash-charm-img" />
                </div>
                <div className="splash-charm c-cat" style={{ animationDelay: "0.98s" }}>
                  <img src="/lottie-posters/gift_scaredcat.png" alt="" className="splash-charm-img" />
                </div>
                <div className="splash-charm c-cream" style={{ animationDelay: "1.1s" }}>
                  <img src="/lottie-posters/gift_vicecream.png" alt="" className="splash-charm-img" />
                </div>
              </div>
              <div className="splash-bar"><span /></div>
            </div>

            <div className="splash-footer">
              <div className="splash-tagline">{t.fastest_way}</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── ACCESS GATE (non-admins need the code; admins pass automatically) ──
  if (access !== "granted") {
    const voidGifts = collections.filter((c) => c.preview).slice(0, 12);
    return (
      <>
        <style>{styles}</style>
        <GoldDefs />
        <div className="app-container" data-theme="light" style={{ position: "relative", overflow: "hidden" }}>
          <VoidGifts gifts={voidGifts} onPick={() => safeOpen("https://t.me/gifttrove")} />
          <div className="gate">
            <div className="gate-card">
              <img src={LOGO_URL} alt="GiftTrove" className="gate-logo" />
              <div className="gate-title">GiftTrove</div>
              {access === "checking" ? (
                <>
                  <div className="gate-sub">{t.gate_checking}</div>
                  <div className="lm-spin" style={{ margin: "6px auto 0" }} />
                </>
              ) : (
                <>
                  <div className="gate-sub">
                    {t.gate_a}
                    <a onClick={() => safeOpen("https://t.me/insidemajek")}>@{t.gate_link}</a>
                    {t.gate_b}
                  </div>
                  <input
                    className={`gate-input ${codeError ? "err" : ""}`}
                    placeholder={t.gate_code_ph}
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submitCode(); }}
                    autoCapitalize="none" autoCorrect="off" spellCheck="false"
                  />
                  <button className="action-btn" style={{ marginTop: 0 }} onClick={submitCode} disabled={codeChecking}>
                    {codeChecking ? t.gate_connecting : t.gate_unlock}
                  </button>
                  {netError && <div className="gate-neterr">{t.gate_neterr}</div>}
                  <div className="gate-note"><a onClick={() => safeOpen("https://t.me/gifttrove")}>{t.gate_join}</a></div>
                </>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── ADMIN ANALYTICS DASHBOARD (replaces the normal UI for this id) ──
  if (String(tgUser?.id) === ADMIN_DASHBOARD_ID) {
    return (
      <>
        <style>{styles}</style>
        <GoldDefs />
        <div className="app-container" data-theme={theme} style={{ overflowY: "auto" }}>
          {toast && <div className="toast">{toast}</div>}
          <AdminDashboard
            t={t}
            uid={tgUser.id}
            code={(typeof localStorage !== "undefined" && localStorage.getItem("gt_code")) || ""}
            onToggleTheme={toggleTheme}
            safeOpen={safeOpen}
            haptic={haptic}
            desktop={isDesktop}
          />
        </div>
      </>
    );
  }

  // ── DESKTOP ──
  if (isDesktop) {
    const voidGifts = collections.filter((c) => c.preview);
    return (
      <>
        <style>{styles}</style>
        <GoldDefs />
        {toast && <div className="toast">{toast}</div>}
        {soonNote && (
          <div className="note-overlay" onClick={() => setSoonNote(false)}>
            <div className="note-pop" onClick={(e) => e.stopPropagation()}>
              <div className="note-pop-title">Agent API</div>
              <div className="note-pop-body">APIs built specifically for your agents are coming soon. Stay tuned in our channels for updates.</div>
              <button className="note-pop-btn" onClick={() => setSoonNote(false)}>{t.got_it}</button>
            </div>
          </div>
        )}
        {marketSoonNote && (
          <div className="note-overlay" onClick={() => setMarketSoonNote("")}>
            <div className="note-pop" onClick={(e) => e.stopPropagation()}>
              <div className="note-pop-title">{marketSoonNote}</div>
              <div className="note-pop-body">
                {(((lk === "en" ? MARKET_SOON_TEXT[marketSoonNote] : ((MARKET_SOON_TR[marketSoonNote] && MARKET_SOON_TR[marketSoonNote][lk]) || MARKET_SOON_TEXT[marketSoonNote]))) || []).map((p, i) => (
                  <p key={i} style={{ marginTop: i === 0 ? "0" : "10px", marginBottom: 0 }}>{p}</p>
                ))}
              </div>
              <button className="note-pop-btn" onClick={() => setMarketSoonNote("")}>{t.got_it}</button>
            </div>
          </div>
        )}
        {renderDetailNote()}
        {consentOverlay}
        <div className="desktop-layout" data-theme={theme}>
          <div className="desktop-sidebar">
            {tabs.map((tab) => (
              <button key={tab.id} className={`desktop-nav-btn ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => { haptic(); bump(tab.id); setActiveTab(tab.id); }}>
                {tabIcon(tab.id, pulse[tab.id])}{tab.label}
              </button>
            ))}
            <div className="desktop-sidebar-bottom">
              <div className="icon-btn" onClick={() => { bump("globe"); setActiveSheet("lang"); }}><IconGlobe trigger={pulse.globe} /></div>
              <div className="icon-btn" onClick={toggleTheme}><IconContrast trigger={pulse.theme} /></div>
            </div>
          </div>
          <div className="desktop-content">{renderActiveTab(true)}</div>
          {renderSheet()}
        </div>
      </>
    );
  }

  // ── AFFILIATE FULL-SCREEN (slides in from right, two sub-pages: main + history) ──
  if (affPage !== null) {
    const a = affInfo && affInfo.ok ? affInfo : null;
    const isPro = !!(a && a.is_pro);
    const pct = (a && a.pct) || 30;
    const minW = (a && a.min_withdraw) || 1000;
    const avail = (a && a.available) || 0;
    const canWithdraw = isPro && avail >= minW;
    const series = (a && a.series) || [];
    const hasEarn = series.some((d) => (d.v || 0) > 0);
    const payouts = (a && a.payouts) || [];
    const payoutLabel = (st) => st === "paid" ? t.aff_st_paid : st === "requested" ? t.aff_st_pending : t.aff_st_declined;

    if (affPage === "history") {
      return (
        <>
          <style>{styles}</style>
          <div className={`aff-screen${affClosing ? " aff-screen-leaving" : ""}`} data-theme={theme}>
            <div className="aff-topbar">
              <div className="aff-topbar-title">{t.aff_history}</div>
            </div>
            <div className="aff-scroll">
              {payouts.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "48px 0", fontSize: 15 }}>{t.aff_no_earnings}</p>
              ) : (
                <div className="ios-group" style={{ margin: 0 }}>
                  {payouts.map((p) => (
                    <div key={p.id} className="aff-payout-row">
                      <div>
                        <div className="aff-payout-amt">{Number(p.stars).toLocaleString("en-US")} {"\u2605"}</div>
                        <div className="aff-payout-date">{new Date((p.ts || 0) * 1000).toLocaleDateString()}</div>
                      </div>
                      <span className={`aff-payout-status st-${p.status}`}>{payoutLabel(p.status)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      );
    }

    if (affPage === "withdraw") {
      const amtNum = parseInt(affAmount, 10) || 0;
      const validAmt = amtNum >= minW && amtNum <= avail;
      const canSubmit = affAddr.trim() && validAmt && !affBusy;
      return (
        <>
          <style>{styles}</style>
          <div className={`aff-screen${affClosing ? " aff-screen-leaving" : ""}`} data-theme={theme}>
            <div className="aff-topbar">
              <div className="aff-topbar-title">{t.aff_withdraw_earnings}</div>
            </div>
            <div className="aff-scroll">
              <div className="aff-hero-card" style={{ marginBottom: 22 }}>
                <div className="aff-hero-label">{t.aff_available}</div>
                <div className="aff-hero-value">
                  <LottieGift src={HOTON_STAR_LOTTIE} size={28} radius={8} eager />
                  <span>{compactNum(avail)}</span>
                </div>
                {a?.gram_value != null && <div className="aff-hero-sub">{"\u2248"} {compactNum(a.gram_value)} GRAM</div>}
              </div>

              <div className="aff-section-head">{t.aff_amount}</div>
              <div className="aff-amount-row">
                <input className="ios-input" inputMode="numeric" value={affAmount} placeholder={t.aff_amount_ph}
                  onChange={(e) => setAffAmount(e.target.value.replace(/[^0-9]/g, ""))} style={{ marginBottom: 0 }} />
                <button className="aff-max-btn" onClick={() => { haptic(); setAffAmount(String(avail)); }}>{t.aff_max}</button>
              </div>
              <div className="aff-hint">{t.aff_amount_range.replace("{min}", minW.toLocaleString())}</div>

              <div className="aff-section-head" style={{ marginTop: 18 }}>{t.aff_ton_addr}</div>
              <input className="ios-input" value={affAddr} placeholder={t.aff_addr_ph}
                onChange={(e) => setAffAddr(e.target.value.trim())} />

              <button className="action-btn" style={{ marginTop: 16 }} disabled={!canSubmit} onClick={withdrawAffiliate}>
                {affBusy ? t.opening : t.aff_withdraw}
              </button>
              {affMsg && <p className="vanity-msg" style={{ textAlign: "center", marginTop: 10 }}>{affMsg}</p>}
            </div>
          </div>
        </>
      );
    }

    // main affiliate page
    return (
      <>
        <style>{styles}</style>
        <div className={`aff-screen${affClosing ? " aff-screen-leaving" : ""}`} data-theme={theme}>
          <div className="aff-topbar">
            <div className="aff-topbar-title">{t.affiliate_title}</div>
            <button className="aff-close" onClick={() => setDetailNote("affiliate")}><IconInfo /></button>
          </div>
          <div className="aff-scroll">
            {!a ? (
              <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "56px 0", fontSize: 15 }}>
                {affInfo === null ? "…" : t.aff_failed}
              </p>
            ) : !isPro ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 0, paddingTop: 8 }}>
                <div className="aff-locked-hero">
                  <div className="aff-locked-icon"><LottieGift src={HOTON_STAR_LOTTIE} size={56} radius={16} eager /></div>
                  <div className="aff-locked-title">{t.aff_locked_title}</div>
                </div>

                <div className="ios-group" style={{ marginTop: 14 }}>
                  {[t.aff_locked_perk1.replace("{n}", String(pct)), t.aff_locked_perk2, t.aff_locked_perk3].map((perk, i) => (
                    <div key={i} className="aff-perk-row">
                      <span className="aff-perk-check"><IconCheck /></span>
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>

                <div className="aff-section-head" style={{ marginTop: 22 }}>{t.aff_locked_preview}</div>
                <div className="aff-preview-wrap">
                  <div className="aff-preview-blur">
                    <div className="aff-hero-card" style={{ marginBottom: 14 }}>
                      <div className="aff-hero-label">{t.aff_available}</div>
                      <div className="aff-hero-value"><span>12,400</span></div>
                    </div>
                    <div className="aff-stats">
                      <div className="aff-stat"><div className="aff-stat-n">18.2K</div><div className="aff-stat-l">{t.aff_earned}</div></div>
                      <div className="aff-stat"><div className="aff-stat-n">640</div><div className="aff-stat-l">{t.aff_pending}</div></div>
                      <div className="aff-stat"><div className="aff-stat-n">37</div><div className="aff-stat-l">{t.aff_referred}</div></div>
                      <div className="aff-stat"><div className="aff-stat-n">21</div><div className="aff-stat-l">{t.aff_payers}</div></div>
                    </div>
                  </div>
                  <div className="aff-preview-lock"><IconLock size={22} /></div>
                </div>

                <button className="action-btn" style={{ marginTop: 20 }} onClick={() => closeAffiliate("premium")}>{t.aff_upgrade}</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

                {/* ── balance hero card ── */}
                <div className="aff-hero-card">
                  <div className="aff-hero-label">{t.aff_available}</div>
                  <div className="aff-hero-value">
                    <LottieGift src={HOTON_STAR_LOTTIE} size={32} radius={9} eager />
                    <span>{compactNum(avail)}</span>
                  </div>
                  {a.gram_value != null
                    ? <div className="aff-hero-sub">≈ {compactNum(a.gram_value)} GRAM</div>
                    : <div className="aff-hero-sub">{t.aff_track_note}</div>}
                </div>

                {/* ── four-stat grid ── */}
                <div className="aff-stats" style={{ marginBottom: 20 }}>
                  <div className="aff-stat"><div className="aff-stat-n">{compactNum(a.earned || 0)}</div><div className="aff-stat-l">{t.aff_earned}</div></div>
                  <div className="aff-stat"><div className="aff-stat-n">{compactNum(a.pending || 0)}</div><div className="aff-stat-l">{t.aff_pending}</div></div>
                  <div className="aff-stat"><div className="aff-stat-n">{compactNum(a.referees || 0)}</div><div className="aff-stat-l">{t.aff_referred}</div></div>
                  <div className="aff-stat"><div className="aff-stat-n">{compactNum(a.payers || 0)}</div><div className="aff-stat-l">{t.aff_payers}</div></div>
                </div>

                {/* ── 30-day chart ── */}
                <div className="aff-section-head">{t.aff_earnings_30d}</div>
                <div className="aff-chart-wrap" style={{ marginBottom: 20 }}>
                  {hasEarn
                    ? <AffEarningsChart series={series} />
                    : <div className="aff-chart-empty">{t.aff_no_earnings}</div>}
                  <div className="aff-chart-axis"><span>{t.aff_30d_ago}</span><span>{t.aff_today}</span></div>
                </div>

                {/* ── withdraw ── */}
                <button className="action-btn" style={{ marginTop: 4 }}
                  onClick={() => { haptic(); setAffMsg(""); setAffPage("withdraw"); }}>
                  {t.aff_withdraw_earnings}
                </button>

                {/* ── payout history nav row ── */}
                {payouts.length > 0 && (
                  <div className="ios-group" style={{ marginTop: 22 }}>
                    <div className="ios-row" onClick={() => { haptic(); setAffPage("history"); }}>
                      <span>{t.aff_history}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
                        <span style={{ fontSize: 13 }}>{payouts.length}</span>
                        <IconChevronRight />
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
        {renderSheet()}
        {renderDetailNote()}
      </>
    );
  }

  // ── MOBILE ──
  return (
    <>
      <style>{styles}</style>
        <GoldDefs />
      <div className="app-container" data-theme={theme}>
        {toast && <div className="toast">{toast}</div>}
        {soonNote && (
          <div className="note-overlay" onClick={() => setSoonNote(false)}>
            <div className="note-pop" onClick={(e) => e.stopPropagation()}>
              <div className="note-pop-title">Agent API</div>
              <div className="note-pop-body">APIs built specifically for your agents are coming soon. Stay tuned in our channels for updates.</div>
              <button className="note-pop-btn" onClick={() => setSoonNote(false)}>{t.got_it}</button>
            </div>
          </div>
        )}
        {marketSoonNote && (
          <div className="note-overlay" onClick={() => setMarketSoonNote("")}>
            <div className="note-pop" onClick={(e) => e.stopPropagation()}>
              <div className="note-pop-title">{marketSoonNote}</div>
              <div className="note-pop-body">
                {(((lk === "en" ? MARKET_SOON_TEXT[marketSoonNote] : ((MARKET_SOON_TR[marketSoonNote] && MARKET_SOON_TR[marketSoonNote][lk]) || MARKET_SOON_TEXT[marketSoonNote]))) || []).map((p, i) => (
                  <p key={i} style={{ marginTop: i === 0 ? "0" : "10px", marginBottom: 0 }}>{p}</p>
                ))}
              </div>
              <button className="note-pop-btn" onClick={() => setMarketSoonNote("")}>{t.got_it}</button>
            </div>
          </div>
        )}
        {renderDetailNote()}
        {consentOverlay}

        <div className="top-nav" style={{ justifyContent: activeTab === "profile" ? "flex-end" : "space-between" }}>
          {activeTab !== "profile" && <div className="logo-tile"><img src={LOGO_URL} alt="GiftTrove" /></div>}
          <div className="top-icons">
            <div className="icon-btn" onClick={() => { bump("globe"); setActiveSheet("lang"); }}><IconGlobe trigger={pulse.globe} /></div>
            <div className="icon-btn" onClick={toggleTheme}><IconContrast trigger={pulse.theme} /></div>
          </div>
        </div>

        <div className="content ptr-container" ref={contentRef}
          onScroll={(e) => {
            const s = e.currentTarget.scrollTop;
            if (scrollRaf.current) return;
            scrollRaf.current = requestAnimationFrame(() => {
              scrollRaf.current = null;
              setShowBackToTop((prev) => {
                const next = s > 320;
                return prev === next ? prev : next;   // no-op setState if unchanged -> React bails, no re-render
              });
            });
          }}
          onTouchStart={ptrOff() ? undefined : handleTouchStart}
          onTouchMove={ptrOff() ? undefined : handleTouchMove}
          onTouchEnd={ptrOff() ? undefined : handleTouchEnd}
          style={{ paddingTop: !ptrOff() && pullY > 0 ? pullY : 0, transition: pullY === 0 ? "padding-top 0.3s" : "none" }}>
          {!ptrOff() && (
            <div className={`ptr-indicator ${isRefreshing || pullY > 40 ? "visible" : ""}`} style={{ top: isRefreshing ? 8 : pullY > 50 ? 8 : -60 }}>
              <div className="ptr-spinner-wrap"><IconRefresh spinning={isRefreshing} trigger={pullY > 50 ? 1 : 0} size={26} /></div>
            </div>
          )}
          {renderActiveTab(false)}
        </div>

        {/* Branded back-to-top: appears when the user has scrolled deep enough
            that the scouting strip / result header is completely out of view. The
            amber gem icon uses the GiftTrove visual language (4-point star rising). */}
        {activeTab === "results" && showBackToTop && (
          <button className="back-to-top" onClick={() => {
            haptic();
            const el = contentRef.current;
            if (!el) return;
            el.scrollTop = 0;
            setShowBackToTop(false);
            // WebKit/Telegram-webview quirk: a programmatic scrollTop jump doesn't
            // always re-run IntersectionObserver callbacks or hit-testing until the
            // next real user gesture — which is why a tap was needed to "wake" the
            // page. A tiny 1px-then-0 nudge on the next two frames forces a real
            // layout/scroll event so lazy Lottie loaders and touch targets are live
            // immediately, with no visible movement.
            requestAnimationFrame(() => {
              el.scrollTop = 1;
              requestAnimationFrame(() => { el.scrollTop = 0; });
            });
          }} aria-label="Back to top">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M9 13.5V5.5M9 5.5L5.5 9M9 5.5L12.5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {!keyboardOpen && (
          <div className="tab-bar-container">
            <div className="ios-tab-bar" ref={tabBarRef}>
              <div className="tab-active-pill" style={{ left: pill.left, width: pill.width, opacity: pillReady ? 1 : 0, transition: pillReady ? "left 0.38s var(--bounce), width 0.38s var(--bounce), opacity 0.2s" : "none" }} />
              {tabs.map((tab) => (
                <button key={tab.id} ref={(el) => (tabRefs.current[tab.id] = el)}
                  className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => { haptic(); bump(tab.id); setActiveTab(tab.id); }}>
                  <div className={`tab-icon ${activeTab === tab.id ? "tab-icon-active" : ""}`}>{tabIcon(tab.id, pulse[tab.id])}</div>
                  <span className="tab-label">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {renderSheet()}
      </div>
    </>
  );
}
