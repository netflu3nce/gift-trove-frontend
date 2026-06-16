import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";

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
// Point this at your Render web service. You can also inject window.__GIFTTROVE_API__ at runtime.
const BACKEND_URL =
  (typeof window !== "undefined" && window.__GIFTTROVE_API__) ||
  "https://gift-trove-backend.onrender.com";
const BACKEND_CONFIGURED = /^https?:\/\//.test(BACKEND_URL);

const FRAGMENT_CDN = "https://nft.fragment.com/gift";

// Brand logo (sits between GIFT and TROVE, the Scout tab icon, and the headline mark).
const LOGO_URL = "https://i.ibb.co/nMV7Mvfp/Inria-Serif.png";
const HERO_IMG = "https://i.ibb.co/PsCBq79k/MGGA.png";  // image beside the hero title

// Optional: a Lottie URL for the launch splash. Left empty -> we show real
// animated gifts (Plush Pepe + 2 others) pulled from the backend instead.
const SPLASH_LOTTIE_URL = "";
// Animated gold star for the Hoton "Need Stars?" CTA.
const HOTON_STAR_LOTTIE = "/lottie/star_motion.json";

const DONATE_ADDRESS = "UQCvd6Sw_JJQsedBGfR2JOn7it7VdREWQ7v3kIluUi0RPMXJ";
const DONATE_COMMENT = "GiftTrove Donation";
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
  support: "https://t.me/GiftTrove?direct",
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

const MARKETPLACES = ["All", "Telegram", "GetGems", "Portals", "MRKT", "Tonnel", "Fragment"];
// Markets we have real listing data for (you have a GetGems key; Telegram-native via MTProto).
// The others get a "view" link only — never a fake price.
const LIVE_MARKETS = new Set(["Telegram", "Fragment"]);  // live & clickable; others show "soon"

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

// Compact, mobile-safe number formatting: 2,562,062 -> 2.5M, 12,500 -> 12.5K.
function compactNum(n) {
  n = Number(n);
  if (!Number.isFinite(n)) return "0";
  const trim = (v) => (v % 1 === 0 ? String(v) : v.toFixed(1).replace(/\.0$/, ""));
  if (n >= 1e9) return trim(Math.floor(n / 1e8) / 10) + "B";
  if (n >= 1e6) return trim(Math.floor(n / 1e5) / 10) + "M";
  if (n >= 1e3) return trim(Math.floor(n / 100) / 10) + "K";
  return Math.round(n).toLocaleString("en-US");
}

// Wallet deeplinks — TON spec, address in the PATH, amount in nanotons, comment as `text`.
// TonKeeper + MyTonWallet only. TG Wallet is handled via copy-address (no public transfer deeplink).
function walletUrl(wallet, address, amountTON, comment) {
  const amt = nano(amountTON);
  const text = encodeURIComponent(comment || "");
  if (wallet === "TonKeeper")
    return `https://app.tonkeeper.com/transfer/${address}?amount=${amt}&text=${text}`;
  if (wallet === "MyTonWallet")
    return `https://my.tt/transfer/${address}?amount=${amt}&text=${text}`;
  return null;
}

// Open links the Telegram-friendly way; validate scheme/host first.
function safeOpen(url) {
  if (!url) return false;
  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null;
  const isTme = /^https:\/\/t\.me\//.test(url) || /^tg:\/\//.test(url);
  try {
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
const IconChevronRight = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const IconFlag = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;

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

// Price with the right currency mark + compact number.
const PriceTag = ({ item, size = 16, exact = false }) => {
  const cur = item?.currency || "GRAM";
  const n = Number(item?.price);
  const txt = exact && Number.isFinite(n) ? n.toLocaleString("en-US") : compactNum(item?.price);
  if (cur === "Stars") return <span className="price-tag"><TGStar size={size} />{txt}</span>;
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
const IconCopy = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const IconTrash = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;

// ─── LOTTIE GIFT (loads lottie-web from CDN on demand; falls back to static jpg) ─
let _lottiePromise = null;
const _animCache = {};   // cache fetched animation JSON by src (avoids refetch)
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

function LottieGift({ src, poster, size = 96, radius = 18, eager = false }) {
  const wrapRef = useRef(null);
  const animRef = useRef(null);
  const [visible, setVisible] = useState(eager);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(!src);

  // Lazy: only animate while on (or near) screen — this is what keeps a long
  // results list smooth. Animations are torn down when scrolled away.
  useEffect(() => {
    if (eager) { setVisible(true); return; }
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => setVisible(e.isIntersecting)),
      { rootMargin: "250px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager]);

  useEffect(() => {
    if (!src || !visible) {
      if (animRef.current) { try { animRef.current.destroy(); } catch { /* noop */ } animRef.current = null; setReady(false); }
      return;
    }
    let cancelled = false;
    setFailed(false); setReady(false);
    (async () => {
      try {
        const lottie = await loadLottie();
        let data = _animCache[src];
        if (!data) {
          const res = await fetch(src);
          if (!res.ok) throw new Error("no anim");
          data = await res.json();
          if (Object.keys(_animCache).length < 80) _animCache[src] = data;
        }
        if (cancelled || !wrapRef.current) return;
        const container = wrapRef.current.querySelector(".lg-anim");
        if (!container) return;
        animRef.current = lottie.loadAnimation({
          container, renderer: "svg", loop: true, autoplay: true, animationData: data,
          rendererSettings: { progressiveLoad: true, hideOnTransparent: true },
        });
        try { animRef.current.setSubframe(false); } catch { /* noop */ }
        setReady(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; if (animRef.current) { try { animRef.current.destroy(); } catch { /* noop */ } animRef.current = null; } };
  }, [src, visible]);

  // Poster (static .jpg) paints INSTANTLY; the Lottie fades in over it when ready.
  return (
    <div ref={wrapRef} style={{ width: size, height: size, borderRadius: radius, overflow: "hidden", background: "var(--bg-input)", position: "relative" }}>
      {poster && (
        <img src={poster} alt="" loading="lazy" decoding="async"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: ready ? 0 : 1, transition: "opacity .3s" }}
          onError={(e) => { e.target.style.opacity = 0; }} />
      )}
      {!failed && <div className="lg-anim" style={{ position: "absolute", inset: 0, opacity: ready ? 1 : 0, transition: "opacity .3s" }} />}
    </div>
  );
}

// ─── LAUNCH SPLASH (iOS glassmorphism + motion; real animated gifts) ──────────
function LaunchLoader({ onDone }) {
  const [leaving, setLeaving] = useState(false);
  // Instant brand moment: hydrate from the last session's featured gifts so
  // returning users see animated gifts immediately, then revalidate.
  const [gifts, setGifts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gt_featured") || "[]").slice(0, 3); } catch { return []; }
  });

  useEffect(() => {
    let alive = true;
    api("/api/featured").then((d) => {
      if (alive && d?.gifts?.length) {
        setGifts(d.gifts.slice(0, 3));
        try { localStorage.setItem("gt_featured", JSON.stringify(d.gifts.slice(0, 6))); } catch { /* noop */ }
      }
    }).catch(() => {});
    const t1 = setTimeout(() => setLeaving(true), 1650); // short, predictable splash
    const t2 = setTimeout(() => onDone?.(), 2050);
    return () => { alive = false; clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  // distinct gifts so the three slots never repeat the same gift
  const uniq = [];
  const seen = new Set();
  for (const g of gifts) {
    const key = (g && (g.name || g.slug)) || "";
    if (key && !seen.has(key)) { seen.add(key); uniq.push(g); }
  }
  const hero = uniq[0] || null;
  const left = uniq[1] || uniq[0] || null;
  const right = uniq[2] || uniq[1] || uniq[0] || null;

  return (
    <div className={`splash ${leaving ? "splash-leaving" : ""}`}>
      <div className="splash-glow" />
      <div className="splash-card">
        {SPLASH_LOTTIE_URL ? (
          <LottieGift src={SPLASH_LOTTIE_URL} size={150} radius={28} eager />
        ) : (
          <div className="splash-gifts">
            <div className="splash-gift sg-left">
              {left ? <LottieGift src={left.animation} poster={left.image} size={74} radius={18} eager /> : <div className="splash-gift-ph skeleton" />}
            </div>
            <div className="splash-gift sg-hero">
              {hero ? <LottieGift src={hero.animation} poster={hero.image} size={116} radius={24} eager /> : <div className="splash-gift-ph big skeleton" />}
            </div>
            <div className="splash-gift sg-right">
              {right ? <LottieGift src={right.animation} poster={right.image} size={74} radius={18} eager /> : <div className="splash-gift-ph skeleton" />}
            </div>
          </div>
        )}
        <div className="splash-brand">
          GIFT<span className="splash-logo"><GiftTroveLogo size={26} /></span>TROVE
        </div>
        <div className="splash-tagline">unearthing the rarest gifts</div>
        <div className="splash-bar"><span /></div>
      </div>
    </div>
  );
}

// ─── LEGAL / FAQ CONTENT (English by design; legal text stays canonical) ─────
const LEGAL = {
  faq: [
    ["What is GiftTrove?", "GiftTrove is a Telegram Mini App that lets you scout, compare, and track collectible Telegram gifts listed across marketplaces. We show you listings, we do not buy, sell, hold, or custody any gifts or funds on your behalf."],
    ["Is GiftTrove free to use?", "Yes. Scouting and browsing are completely free. If you choose to purchase a gift through a marketplace, that transaction happens directly between you and that marketplace."],
    ["Does buying through GiftTrove earn GiftTrove anything?", "No. GiftTrove receives no commission, fee, or credit from any purchase you make. Tapping through to a marketplace is a plain redirect, the full amount of your purchase goes through that marketplace as if you had visited it directly."],
    ["Are the promoted apps in GiftTrove ads?", "The banners and promoted apps shown in the Profile area are promotional, and some are affiliate links where the operator may earn a referral reward if you sign up or interact with them. They are kept clearly separate from gift scouting, and tapping a gift through to a marketplace stays a plain, commission-free redirect."],
    ["Do you store my personal data?", "We store an anonymised identifier (not your name, username, or phone number) purely to count unique visitors and keep your saved gifts in sync across devices. We never sell or share this data. See the Privacy Policy for the full picture."],
    ["Why do some gifts show no listings?", "A gift collection may simply have no active resale listings at the moment you search. Listings update in near real-time, if nothing shows, nothing is listed right now."],
    ["Are the prices shown accurate?", "Prices reflect active marketplace listings at the time of your search. They are informational only, not advice, valuations, or guarantees, and can change before you complete a purchase."],
    ["Can I buy a gift directly inside GiftTrove?", "No. GiftTrove is a scouting tool. All purchases happen on the relevant marketplace after you tap through, and we have no control over those transactions."],
    ["What is the referral system?", "When someone opens GiftTrove through your link, we record the referral. This is currently for tracking only, no financial rewards are offered or implied."],
    ["What currencies does GiftTrove display?", "Prices are shown in Telegram Stars and GRAM (TON network). GiftTrove does not process or interact with any currency itself."],
    ["How do I contact support?", "Use the Support row in this Profile tab, or message the builder directly."],
  ],
  terms: [
    ["No affiliation", "GiftTrove is an independent, third-party tool. It is not affiliated with, endorsed by, sponsored by, or officially connected to Telegram, the TON Foundation, Fragment, GetGems, or any other marketplace. All product names, trademarks, gift artwork, and collectible designs belong to their respective owners and are referenced for identification only."],
    ["Informational service only", "Everything shown in GiftTrove, prices, rarity, supply, trends, is informational only. Nothing in this app constitutes investment, financial, or trading advice. You bear full responsibility for any purchase or trading decision."],
    ["Data accuracy", "Listing data is retrieved live from third-party sources. We make reasonable efforts to display accurate data but cannot guarantee completeness, accuracy, or timeliness, and we accept no liability for decisions made based on displayed data."],
    ["Third-party transactions", "Purchases made after tapping through to a marketplace are entirely between you and that marketplace. GiftTrove is not a party to those transactions, earns nothing from them, holds no funds, and bears no liability for failed, disputed, or fraudulent transactions."],
    ["Affiliate and promotional links", "Some areas of GiftTrove feature third-party apps and services through promotional or affiliate links. When you open one, the operator may receive a referral reward or commission from that third party. These placements are separate from gift-marketplace redirects, which remain commission-free as described above. Promotional placement is not an endorsement, and any dealings you have with those third parties are at your own risk and governed by their own terms."],
    ["Referral program", "You may be given a personal referral link and code. Referrals are recorded for tracking. Any rewards, if introduced, are discretionary and may be changed or withdrawn at any time. Generating referrals through fake, automated, or otherwise abusive accounts is not permitted and may result in removal."],
    ["Notifications", "GiftTrove may occasionally send you messages through the bot, such as product updates or announcements. You can opt out at any time using Clear my data in the Profile tab, which also stops these messages."],
    ["No custody", "GiftTrove never holds, transfers, or controls your gifts, TON, Stars, or any digital assets."],
    ["Donations", "Donations made through the app are voluntary, non-refundable, and carry no expectation of service, reward, or anything in return."],
    ["Acceptable use", "You agree not to scrape data, disrupt or overload the service, or use GiftTrove for any unlawful purpose."],
    ["Availability", "GiftTrove is provided as-is. We may modify, suspend, or discontinue any part of the service at any time without notice."],
    ["Eligibility", "By using GiftTrove you confirm you are permitted to use Telegram under Telegram's own Terms of Service in your jurisdiction."],
    ["Disputes", "Any dispute arising from the use of GiftTrove shall first be resolved through good-faith negotiation with the operator before any other process."],
    ["Acceptance", "By using GiftTrove you agree to these Terms of Service and the Privacy Policy. If you do not agree, please discontinue use."],
  ],
  privacy: [
    ["What we collect", "An anonymised identifier derived from your Telegram ID (for visit counting, saved-gifts sync, and referral tracking), your saved gift list, your recent search terms, and aggregate usage counts (opens, searches, shares) that are never linked to identifiable individuals."],
    ["What we never collect", "Your name, username, phone number, message content, payment information, location, or any data from your Telegram account beyond the technical launch parameters Telegram provides to every Mini App."],
    ["How data is processed", "Data is processed on reputable third-party hosting and database infrastructure under industry-standard protections. Marketplace links open third-party platforms governed by their own privacy policies."],
    ["Retention", "Aggregate, anonymised analytics are retained to improve the product. Your saved gifts and searches persist so they can follow you across devices."],
    ["Your rights", "You are in control. You can delete your data yourself at any time with the Clear my data option at the bottom of the Profile tab, which removes your synced data instantly. You can also reach Support for anything else."],
    ["Messaging and opt-out", "If you have interacted with the GiftTrove bot, we may occasionally send you announcements or product updates through it. Using Clear my data removes your synced data and opts you out of any further messages."],
    ["Changes", "We may update this policy as the product evolves; continued use after an update constitutes acceptance."],
  ],
};

// ─── PROMO BANNER ─────────────────────────────────────────────────────────────
const PROMO_SLIDES = [
  { img: "https://i.ibb.co/d08zfZmg/Inria-Serif-2.png", url: "https://t.me/gifttrove" },
  { img: "https://i.ibb.co/Rk1hB0vS/Inria-Serif.png", url: "https://t.me/troveotc" },
  { img: "https://i.ibb.co/Kp2tJtQT/MGGA-4.png", url: "https://t.me/spinmibot?startapp=7608551523" },
  { img: "https://i.ibb.co/v5NvzS6/MGGA-3.png", url: "https://t.me/hotontgbot/app?startapp=UQCvd6Sw_JJQsedBGfR2JOn7it7VdREWQ7v3kIluUi0RPMXJ" },
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

// Reusable bottom sheet with swipe-down-to-dismiss + spring open/close.
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
    fastest_way: "The fastest way to find any Telegram Gift",
    gift_name: "Gift Name", specific_id: "Specific ID", optional: "(Optional)",
    marketplaces: "Marketplaces", attributes: "Attributes", model: "Model", backdrop: "Backdrop", symbol: "Symbol",
    scout_gift: "Scout Gift", results: "Results", found: "found",
    selected_n: "selected", filter_upsell: "Combine multiple filters with Scout+", filter_cap_hit: "You can pick up to {n}. Upgrade for more.", done: "Done",
    premium_label: "Membership", premium_row: "GiftTrove Premium", tier_free: "Free",
    premium_title: "GiftTrove Premium", you_are_on: "You're on", renews: "renews", per_month: "month",
    current_plan: "Current plan", subscribe: "Subscribe", opening: "Opening\u2026",
    perk_5_filters: "Up to 5 of each filter", perk_unlimited: "Unlimited filters",
    perk_vanity: "Custom referral code", perk_more_soon: "New perks as they land", perk_priority: "Priority on new perks", perk_no_ads: "No promoted gifts in your scouts",
    need_stars: "Need Stars?", need_stars_sub: "Get them cheaper on Hoton",
    vanity_title: "Your referral code", vanity_help: "Pick a custom code (letters & numbers). It replaces your random code on the links you share.", vanity_ph: "YOURCODE", claim: "Claim", your_code: "Your code",
    vanity_ok: "Code claimed!", vanity_taken: "That code is taken \u2014 try another.", vanity_premium: "Scout Pro only.", vanity_bad: "Use 3\u201312 letters and numbers (at least one letter).",
    premium_fineprint: "Subscriptions are billed monthly in Telegram Stars and renew automatically. Manage or cancel anytime in Telegram. Stars purchases are non-refundable.",
    open_in_tg: "Open inside Telegram to subscribe.", update_tg: "Update Telegram to subscribe with Stars.",
    sub_thanks: "Subscription active \u2014 thank you!", sub_failed: "Couldn't start the payment. Try again.",
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
    promo_price_opt: "Asking price (optional)", promo_amount_ph: "e.g. 250", promo_link_opt: "Direct gift link (optional)",
    promo_link_help: "Paste the exact Telegram or Fragment listing so taps go straight to it.",
    affiliate_row: "Affiliate program", affiliate_title: "Affiliate program",
    affiliate_sub: "Earn {n}% of every subscription from members you invite \u2014 for as long as you stay Scout Pro.",
    aff_locked_title: "A Scout Pro perk", aff_locked_sub: "Upgrade to Scout Pro to earn {n}% of every subscription from members you invite.",
    aff_upgrade: "Upgrade to Scout Pro", aff_available: "Available to withdraw", aff_earned: "Earned", aff_pending: "Pending",
    aff_referred: "Referred", aff_payers: "Paying", aff_ton_addr: "TON wallet address", aff_addr_ph: "Your TON address",
    aff_withdraw: "Request payout", aff_min: "Withdraw at {n}\u2605", aff_need_addr: "Enter your TON wallet address.",
    aff_requested: "Payout requested \u2014 we\u2019ll settle it in TON.", aff_pro_only: "Scout Pro only.", aff_failed: "Couldn\u2019t load. Try again.",
    aff_fineprint: "Earnings accrue only while you\u2019re Scout Pro and pause if your plan lapses. Minimum payout {n}\u2605, settled in TON to your wallet. Fake or self-referrals forfeit earnings.",
    scouting_title: "Scouting marketplaces…", scouting_sub: "Finding gems so you don't have to",
    no_results: "No live listings matched your filters.", try_again: "Try again",
    offline_title: "Live data is offline", offline_sub: "Couldn't reach the GiftTrove server. Pull to refresh or try again shortly.",
    select_gift_first: "Select a gift collection first to see its", attrs_loading: "Fetching this gift\u2019s attributes \u2014 just a few seconds\u2026", soon: "soon", soon_title: "Coming soon", soon_note: "This marketplace isn\u2019t live in GiftTrove yet. It\u2019s being worked on \u2014 but it isn\u2019t guaranteed, and there\u2019s no set date.", got_it: "Got it", x_account: "X (Twitter)", frag_attr_note: "Attribute selection is not available for Fragment. Proceed to scout.",
    no_alerts: "No alerts yet", alerts_hint: "Add a gift to your watchlist and get pinged when it lists below your price.",
    add_alert: "Add Watch Alert", watchlist: "Watchlist",
    no_saved: "No gifts saved yet.",
    community: "Community", support: "Contact Support", comm_chat: "Community Chat", comm_channel: "Community Channel",
    inside_majek: "Inside Majek", gifttrove_otc: "GiftTrove OTC", about_legal: "关于与法律", data_cleared: "您的数据已清除", data_clear_failed: "无法清除数据。请在 Telegram 中打开 GiftTrove 后重试。", about_legal: "О приложении и право", data_cleared: "Ваши данные удалены", data_clear_failed: "Не удалось удалить данные. Откройте GiftTrove в Telegram и повторите.", about_legal: "About and legal", data_cleared: "Your data was cleared", data_clear_failed: "Couldn\u2019t clear your data. Open GiftTrove inside Telegram and try again.",
    support_builder: "Support the Builder", donate: "Donate",
    donate_desc: "GiftTrove was created free. Kindly input the amount of GRAM you'd like to donate.",
    amount_ton: "Amount (GRAM)", verify_tx: "Verify Transaction", tx_id: "Transaction ID",
    thank_you: "Thank you for your generous support!",
    referrals: "Referrals", copy_ref: "Copy Referral Link", ref_count: "Referral Count",
    any: "Any", rarity: "Rarity", language: "Language",
    wallet_redirect: "You'll be redirected to {w} with the address and amount pre-filled — just kindly approve.",
    tg_copy_note: "Telegram Wallet has no transfer link. Tap below to copy the address, then send {amt} GRAM from @wallet.",
    copy_address: "Copy Address", address_copied: "Address copied — send from @wallet",
    listed_value: "Listed Value", buy_now: "Buy / View", buy: "Buy", save_gift: "Save Gift", remove_saved: "Remove Saved", share_gift: "Share gift",
    floor: "Floor", view_on: "View on Telegram", saved_done: "Saved to your collection", link_copied: "Referral link copied",
  },
  RU: {
    scout_tab: "Поиск", results_tab: "Итоги", alerts_tab: "Алерты", saved_tab: "Сохр.", profile_tab: "Профиль",
    sort_general: "Обычный", sort_low: "Дешевле", sort_high: "Дороже", load_more: "Ещё", price_range: "Диапазон цен", min_label: "Мин", max_label: "Макс", apply_filter: "Применить", results_empty_title: "Пока нет результатов", results_empty_sub: "Найдите подарок во вкладке Поиск.", showing_n: "Показано {n}", gate_a: "GiftTrove пока недоступен публично. Напишите ", gate_link: "majek", gate_b: ", чтобы получить код доступа.", gate_checking: "Проверка доступа…", gate_code_ph: "КОД ДОСТУПА", gate_unlock: "Разблокировать", gate_connecting: "Подключение…", gate_neterr: "Не удалось связаться с сервером (возможно, он просыпается). Повторите попытку.", gate_admin: "Админы входят автоматически.", gate_join: "Подпишитесь на канал GiftTrove", unknown_gift_title: "Такого подарка нет", unknown_gift_sub: "Не нашли подарок «{q}». Проверьте написание или выберите из подсказок.", no_listings_sub: "По этим фильтрам пока нет листингов. Уберите фильтр или зайдите позже.",
    fastest_way: "Самый быстрый способ найти любой Telegram подарок",
    gift_name: "Имя подарка", specific_id: "Конкретный ID", optional: "(Необязательно)",
    marketplaces: "Маркетплейсы", attributes: "Атрибуты", model: "Модель", backdrop: "Фон", symbol: "Символ",
    scout_gift: "Искать подарок", results: "Результаты", found: "найдено",
    selected_n: "выбрано", filter_upsell: "Объедините фильтры со Scout+", filter_cap_hit: "Можно выбрать до {n}. Обновите тариф.", done: "Готово",
    premium_label: "Подписка", premium_row: "GiftTrove Premium", tier_free: "Бесплатно",
    premium_title: "GiftTrove Premium", you_are_on: "Ваш тариф:", renews: "продление", per_month: "мес.",
    current_plan: "Текущий тариф", subscribe: "Оформить", opening: "Открываю\u2026",
    perk_5_filters: "До 5 значений каждого фильтра", perk_unlimited: "Безлимит фильтров",
    perk_vanity: "Свой реферальный код", perk_more_soon: "Новые возможности по мере выхода", perk_priority: "Приоритет на новые функции", perk_no_ads: "Без рекламных подарков в поиске",
    need_stars: "Нужны Stars?", need_stars_sub: "Дешевле на Hoton",
    vanity_title: "Ваш реферальный код", vanity_help: "Выберите свой код (буквы и цифры). Он заменит случайный код в ссылках.", vanity_ph: "ВАШКОД", claim: "Занять", your_code: "Ваш код",
    vanity_ok: "Код закреплён за вами!", vanity_taken: "Код занят — выберите другой.", vanity_premium: "Только для Scout Pro.", vanity_bad: "3–12 букв и цифр (хотя бы одна буква).",
    premium_fineprint: "Подписка списывается ежемесячно в Telegram Stars и продлевается автоматически. Управление и отмена — в Telegram. Покупки за Stars не возвращаются.",
    open_in_tg: "Откройте в Telegram, чтобы оформить.", update_tg: "Обновите Telegram для оплаты Stars.",
    sub_thanks: "Подписка активна — спасибо!", sub_failed: "Не удалось начать оплату. Попробуйте снова.",
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
    promo_price_opt: "Цена (необязательно)", promo_amount_ph: "напр. 250", promo_link_opt: "Прямая ссылка на подарок (необязательно)",
    promo_link_help: "Вставьте точную ссылку на Telegram или Fragment, чтобы переход вёл сразу к ней.",
    affiliate_row: "Партнёрская программа", affiliate_title: "Партнёрская программа",
    affiliate_sub: "Получайте {n}% с каждой подписки приглашённых вами участников — пока у вас активен Scout Pro.",
    aff_locked_title: "Привилегия Scout Pro", aff_locked_sub: "Оформите Scout Pro, чтобы получать {n}% с каждой подписки приглашённых участников.",
    aff_upgrade: "Оформить Scout Pro", aff_available: "Доступно к выводу", aff_earned: "Заработано", aff_pending: "В ожидании",
    aff_referred: "Приглашено", aff_payers: "Платящих", aff_ton_addr: "Адрес TON-кошелька", aff_addr_ph: "Ваш TON-адрес",
    aff_withdraw: "Запросить выплату", aff_min: "Вывод от {n}\u2605", aff_need_addr: "Укажите адрес TON-кошелька.",
    aff_requested: "Выплата запрошена — переведём в TON.", aff_pro_only: "Только для Scout Pro.", aff_failed: "Не удалось загрузить. Попробуйте снова.",
    aff_fineprint: "Начисления идут только при активном Scout Pro и приостанавливаются, если подписка истекает. Минимальная выплата {n}\u2605, переводится в TON на ваш кошелёк. Фейковые или само-рефералы аннулируют начисления.",
    scouting_title: "Сканируем маркетплейсы…", scouting_sub: "Находим самоцветы за вас",
    no_results: "Нет активных объявлений по фильтрам.", try_again: "Повторить",
    offline_title: "Данные недоступны", offline_sub: "Не удалось связаться с сервером GiftTrove. Потяните вниз для обновления.",
    select_gift_first: "Сначала выберите коллекцию, чтобы увидеть", attrs_loading: "Загружаем параметры подарка — пара секунд…", soon: "скоро", soon_title: "Скоро", soon_note: "Этот маркетплейс пока недоступен в GiftTrove. Мы работаем над этим — но это не гарантировано, и точной даты нет.", got_it: "Понятно", x_account: "X (Twitter)", frag_attr_note: "Выбор атрибутов недоступен для Fragment. Продолжайте поиск.",
    no_alerts: "Пока нет алертов", alerts_hint: "Добавьте подарок в список наблюдения и получайте уведомление о выгодной цене.",
    add_alert: "Добавить алерт", watchlist: "Список наблюдения",
    no_saved: "Пока нет сохранённых подарков.",
    community: "Сообщество", support: "Поддержка", comm_chat: "Чат сообщества", comm_channel: "Канал сообщества",
    inside_majek: "Inside Majek", gifttrove_otc: "GiftTrove OTC",
    support_builder: "Поддержать создателя", donate: "Пожертвовать",
    donate_desc: "GiftTrove бесплатен. Введите сумму GRAM для пожертвования.",
    amount_ton: "Сумма (GRAM)", verify_tx: "Проверить транзакцию", tx_id: "ID транзакции",
    thank_you: "Спасибо за вашу щедрую поддержку!",
    referrals: "Рефералы", copy_ref: "Копировать ссылку", ref_count: "Кол-во рефералов",
    any: "Любой", rarity: "Редкость", language: "Язык",
    wallet_redirect: "Вы будете перенаправлены в {w} с заполненным адресом и суммой — пожалуйста, подтвердите.",
    tg_copy_note: "У Telegram Wallet нет ссылки для перевода. Скопируйте адрес и отправьте {amt} GRAM из @wallet.",
    copy_address: "Копировать адрес", address_copied: "Адрес скопирован — отправьте из @wallet",
    listed_value: "Цена листинга", buy_now: "Купить / Открыть", buy: "Купить", save_gift: "Сохранить", remove_saved: "Убрать", share_gift: "Поделиться",
    floor: "Флор", view_on: "Открыть в Telegram", saved_done: "Добавлено в коллекцию", link_copied: "Ссылка скопирована",
  },
  ZH: {
    scout_tab: "侦测", results_tab: "结果", alerts_tab: "提醒", saved_tab: "收藏", profile_tab: "我的",
    sort_general: "综合", sort_low: "最低", sort_high: "最高", load_more: "加载更多", price_range: "价格范围", min_label: "最低", max_label: "最高", apply_filter: "应用", results_empty_title: "暂无结果", results_empty_sub: "在“侦测”中搜索礼物以查看结果。", showing_n: "显示 {n}", gate_a: "GiftTrove 暂未对公众开放。请联系 ", gate_link: "majek", gate_b: " 获取访问码，或等待小程序上线。", gate_checking: "正在检查访问权限…", gate_code_ph: "访问码", gate_unlock: "解锁", gate_connecting: "连接中…", gate_neterr: "无法连接服务器（可能正在唤醒）。请稍后重试。", gate_admin: "管理员自动进入。", gate_join: "加入 GiftTrove 频道", unknown_gift_title: "没有这个礼物", unknown_gift_sub: "找不到名为“{q}”的礼物。请检查拼写，或从建议中选择。", no_listings_sub: "当前没有符合这些筛选的在售挂单。请移除筛选或稍后再试。",
    fastest_way: "查找任何 Telegram 礼物的最快方法",
    gift_name: "礼物名称", specific_id: "特定 ID", optional: "（可选）",
    marketplaces: "市场", attributes: "属性", model: "模型", backdrop: "背景", symbol: "符号",
    scout_gift: "侦测礼物", results: "结果", found: "已找到",
    selected_n: "已选", filter_upsell: "使用 Scout+ 组合多个筛选", filter_cap_hit: "最多可选 {n} 个，升级解锁更多。", done: "完成",
    premium_label: "会员", premium_row: "GiftTrove Premium", tier_free: "免费",
    premium_title: "GiftTrove 会员", you_are_on: "当前方案：", renews: "续订", per_month: "月",
    current_plan: "当前方案", subscribe: "订阅", opening: "正在打开\u2026",
    perk_5_filters: "每个筛选最多 5 个", perk_unlimited: "无限筛选",
    perk_vanity: "自定义推荐码", perk_more_soon: "新功能陆续上线", perk_priority: "新功能优先体验", perk_no_ads: "搜索中不显示推广礼物",
    need_stars: "需要 Stars？", need_stars_sub: "在 Hoton 更便宜",
    vanity_title: "你的推荐码", vanity_help: "选择自定义推荐码（字母和数字）。它会替换分享链接中的随机码。", vanity_ph: "你的码", claim: "认领", your_code: "你的码",
    vanity_ok: "认领成功！", vanity_taken: "该码已被占用，请换一个。", vanity_premium: "仅限 Scout Pro。", vanity_bad: "请使用 3–12 个字母和数字（至少一个字母）。",
    premium_fineprint: "订阅以 Telegram Stars 按月计费并自动续订。可随时在 Telegram 管理或取消。Stars 购买不可退款。",
    open_in_tg: "请在 Telegram 内打开以订阅。", update_tg: "请更新 Telegram 以使用 Stars 订阅。",
    sub_thanks: "订阅已生效，谢谢！", sub_failed: "无法发起支付，请重试。",
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
    promo_price_opt: "售价（可选）", promo_amount_ph: "例如 250", promo_link_opt: "礼物直达链接（可选）",
    promo_link_help: "粘贴确切的 Telegram 或 Fragment 链接，点击即可直达。",
    affiliate_row: "推广联盟", affiliate_title: "推广联盟",
    affiliate_sub: "邀请的会员每次订阅，您可赚取 {n}% — 只要您保持 Scout Pro。",
    aff_locked_title: "Scout Pro 专属", aff_locked_sub: "升级 Scout Pro，邀请会员订阅即可赚取 {n}%。",
    aff_upgrade: "升级 Scout Pro", aff_available: "可提现", aff_earned: "已赚取", aff_pending: "待处理",
    aff_referred: "已邀请", aff_payers: "付费", aff_ton_addr: "TON 钱包地址", aff_addr_ph: "您的 TON 地址",
    aff_withdraw: "申请提现", aff_min: "满 {n}\u2605 可提现", aff_need_addr: "请输入您的 TON 钱包地址。",
    aff_requested: "提现已申请 — 将以 TON 结算。", aff_pro_only: "仅限 Scout Pro。", aff_failed: "加载失败，请重试。",
    aff_fineprint: "仅在 Scout Pro 有效期间累积收益，订阅失效则暂停。最低提现 {n}\u2605，以 TON 结算至您的钱包。虚假或自我推荐将取消收益。",
    scouting_title: "正在扫描市场…", scouting_sub: "替你淘到珍宝",
    no_results: "没有符合筛选条件的在售商品。", try_again: "重试",
    offline_title: "实时数据离线", offline_sub: "无法连接 GiftTrove 服务器。请下拉刷新或稍后再试。",
    select_gift_first: "请先选择礼物系列以查看其", attrs_loading: "正在获取该礼物的属性，请稍候几秒…", soon: "即将推出", soon_title: "敬请期待", soon_note: "该市场尚未在 GiftTrove 上线。正在开发中——但不保证上线，也没有确定日期。", got_it: "知道了", x_account: "X (Twitter)", frag_attr_note: "Fragment 不支持属性筛选。直接开始搜索即可。",
    no_alerts: "暂无提醒", alerts_hint: "将礼物加入关注列表，当价格低于你的设定时获得提醒。",
    add_alert: "添加提醒", watchlist: "关注列表",
    no_saved: "暂无收藏的礼物。",
    community: "社区", support: "联系客服", comm_chat: "社区群组", comm_channel: "社区频道",
    inside_majek: "Inside Majek", gifttrove_otc: "GiftTrove OTC",
    support_builder: "支持开发者", donate: "捐赠",
    donate_desc: "GiftTrove 是免费的。请输入您想捐赠的 GRAM 数量。",
    amount_ton: "数量 (GRAM)", verify_tx: "验证交易", tx_id: "交易 ID",
    thank_you: "感谢您的慷慨支持！",
    referrals: "推荐", copy_ref: "复制推荐链接", ref_count: "推荐人数",
    any: "任何", rarity: "稀有度", language: "语言",
    wallet_redirect: "您将被跳转到 {w}，地址和金额已预填——请确认即可。",
    tg_copy_note: "Telegram 钱包没有转账链接。点击下方复制地址，然后从 @wallet 发送 {amt} GRAM。",
    copy_address: "复制地址", address_copied: "地址已复制——请从 @wallet 发送",
    listed_value: "挂单价", buy_now: "购买 / 查看", buy: "购买", save_gift: "收藏", remove_saved: "取消收藏", share_gift: "分享",
    floor: "地板价", view_on: "在 Telegram 中打开", saved_done: "已加入收藏", link_copied: "推荐链接已复制",
  },
};

// ─── STYLES (background color UNCHANGED) ──────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg-base: #f2f2f7;
    --bg-gradient: radial-gradient(120% 120% at 50% -20%, rgba(0, 122, 255, 0.08) 0%, #f2f2f7 100%);
    --bg-sheet: rgba(255, 255, 255, 0.75);
    --bg-card: rgba(255, 255, 255, 0.6);
    --bg-input: rgba(118, 118, 128, 0.12);
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
    background: var(--bg-base); background-image: var(--bg-gradient); background-attachment: fixed;
    opacity: 1; transition: opacity 0.45s ease;
  }
  .splash-leaving { opacity: 0; pointer-events: none; }
  .splash-glow {
    position: absolute; width: 320px; height: 320px; border-radius: 50%;
    background: radial-gradient(circle, rgba(0,122,255,0.28) 0%, transparent 70%);
    filter: blur(40px); animation: splashGlow 2.4s ease-in-out infinite;
  }
  [data-theme="dark"] .splash-glow { background: radial-gradient(circle, rgba(10,132,255,0.34) 0%, transparent 70%); }
  @keyframes splashGlow { 0%,100% { transform: scale(0.92); opacity: 0.7; } 50% { transform: scale(1.08); opacity: 1; } }
  .splash-card {
    position: relative; z-index: 1;
    display: flex; flex-direction: column; align-items: center; gap: 16px;
    padding: 36px 40px; border-radius: 36px;
    background: var(--bg-sheet); border: 1px solid var(--border);
    backdrop-filter: blur(50px) saturate(200%); -webkit-backdrop-filter: blur(50px) saturate(200%);
    box-shadow: 0 30px 80px rgba(0,0,0,0.18);
    animation: splashPop 0.6s var(--bounce) both;
  }
  @keyframes splashPop { from { transform: scale(0.8) translateY(14px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
  .splash-brand {
    display: flex; align-items: center; gap: 3px; margin-top: 4px;
    font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: var(--text-primary);
  }
  .splash-logo { display: flex; align-items: center; margin: 0 2px; }
  .splash-tagline { font-size: 13px; font-weight: 600; color: var(--text-secondary); letter-spacing: 0.2px; }
  .splash-bar { width: 130px; height: 4px; border-radius: 100px; background: var(--bg-input); overflow: hidden; }
  .splash-bar span { display: block; height: 100%; width: 40%; border-radius: 100px;
    background: linear-gradient(90deg, transparent, var(--tg-blue), transparent);
    animation: splashBar 1.3s ease-in-out infinite; }
  @keyframes splashBar { 0% { transform: translateX(-130%); } 100% { transform: translateX(330%); } }

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
  .scouting-sub { font-size: 15px; font-weight: 700; color: #ffffff; opacity: 0.82; line-height: 1.4; }
  .scouting-markets { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 26px; }
  .scouting-market-chip { padding: 6px 14px; border-radius: 100px; font-size: 13px; font-weight: 700; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.18); color: #fff; animation: scoutChipPulse 1.5s ease-in-out infinite; }
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
  .hero-title { font-size: 27px; font-weight: 800; letter-spacing: -0.6px; line-height: 1.18; margin-bottom: 24px; color: #ffffff; }
  .hero-title.desktop { font-size: 38px; letter-spacing: -1px; }
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
  .ios-tab-bar { display: flex; align-items: stretch; height: 72px; border-radius: 36px; padding: 6px; gap: 2px; background: var(--bg-sheet); border: 1px solid var(--border); backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur); box-shadow: 0 10px 40px rgba(0,0,0,0.15); position: relative; }
  .tab-active-pill { position: absolute; top: 6px; bottom: 6px; border-radius: 28px; background: rgba(0,122,255,0.14); border: 1px solid rgba(0,122,255,0.22); backdrop-filter: blur(20px) saturate(200%); -webkit-backdrop-filter: blur(20px) saturate(200%); transition: left 0.38s var(--bounce), width 0.38s var(--bounce); pointer-events: none; z-index: 0; box-shadow: 0 4px 14px rgba(0,122,255,0.18); }
  [data-theme="dark"] .tab-active-pill { background: rgba(10,132,255,0.2); border-color: rgba(10,132,255,0.3); }
  .tab-btn { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; border: none; background: transparent; color: var(--text-secondary); font-family: var(--font); cursor: pointer; transition: color 0.3s; position: relative; z-index: 1; border-radius: 28px; min-width: 0; padding: 0 4px; }
  .tab-btn.active { color: var(--tg-blue); }
  .tab-icon { transition: transform 0.38s var(--bounce); }
  .tab-icon-active { transform: translateY(-2px) scale(1.12); }
  .tab-label { font-size: 10px; font-weight: 700; letter-spacing: 0.2px; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }

  /* ─── SHEETS ─── */
  .sheet-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.4); backdrop-filter: blur(5px); display: flex; align-items: flex-end; opacity: 0; animation: fadeIn 0.3s forwards; }
  .sheet-content { width: 100%; max-height: 82vh; border-radius: 32px 32px 0 0; padding: 12px 24px calc(40px + var(--safe-bottom)); background: var(--bg-sheet); border-top: 1px solid var(--border); backdrop-filter: blur(50px) saturate(200%); -webkit-backdrop-filter: blur(50px) saturate(200%); transform: translateY(100%); animation: slideUp 0.4s var(--bounce) forwards; overflow-y: auto; color: var(--text-primary); }
  .sheet-content::-webkit-scrollbar { display: none; }
  .sheet-handle { width: 40px; height: 5px; border-radius: 100px; background: var(--text-secondary); margin: 0 auto 24px; opacity: 0.5; }
  .sheet-title { font-size: 22px; font-weight: 800; margin-bottom: 20px; text-align: center; color: var(--text-primary); }

  .ios-group { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur); margin-bottom: 24px; }
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
  .result-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px; position: relative; backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur); display: flex; flex-direction: column; transition: transform 0.2s var(--bounce); cursor: pointer; color: var(--text-primary); animation: cardIn 0.45s var(--bounce) both; }
  .result-card:active { transform: scale(0.96); }
  @keyframes cardIn { from { opacity: 0; transform: translateY(14px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .result-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .result-gift-img { width: 40px; height: 40px; border-radius: 10px; object-fit: cover; flex-shrink: 0; background: var(--bg-input); }
  .badge-buy { background: var(--tg-blue); color: #fff; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 6px; cursor: pointer; letter-spacing: 0.5px; white-space: nowrap; }

  .skeleton { position: relative; overflow: hidden; background: var(--bg-input); }
  .skeleton::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent); animation: shimmer 1.3s infinite; }
  [data-theme="dark"] .skeleton::after { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent); }
  @keyframes shimmer { 100% { transform: translateX(100%); } }
  .sk-line { height: 12px; border-radius: 6px; margin-top: 8px; }

  .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; min-height: 46vh; padding: 32px 20px; color: var(--text-secondary); }
  .empty-state > svg, .empty-state > div:first-child { margin: 0 auto; }
  .desktop-content .empty-state { min-height: 56vh; }
  .empty-state .es-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 14px 0 6px; }

  .page-header { font-size: 34px; font-weight: 800; letter-spacing: -1px; line-height: 1.15; margin-bottom: 24px; color: #ffffff; }
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
  .result-gift-hero { position: relative; display: flex; align-items: center; justify-content: center; padding: 12px 0 14px; border-radius: 16px; }
  .result-save { position: absolute; top: 4px; right: 4px; cursor: pointer; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5)); transition: transform .2s var(--bounce); }
  .result-save:active { transform: scale(0.82); }
  .result-name { font-size: 15px; font-weight: 800; line-height: 1.2; color: var(--text-primary); margin-bottom: 6px; }
  .result-meta { font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
  .result-model { font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; }
  .result-foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .result-price { font-size: 17px; font-weight: 800; color: var(--tg-blue); }
  .result-foot .badge-buy { font-size: 12px; padding: 7px 14px; border-radius: 9px; box-shadow: 0 6px 16px rgba(10,132,255,0.35); }

  /* ── Results header + filter bar ─────────────────────────────────────── */
  .results-head { display: flex; align-items: baseline; justify-content: space-between; margin: 2px 2px 12px; }
  .results-title { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: var(--text-primary); }
  .results-count { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
  .filter-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .sort-toggle { display: inline-flex; background: var(--bg-input); border: 1px solid var(--border); border-radius: 100px; padding: 4px; gap: 4px; }
  .sort-pill { border: none; background: transparent; color: var(--text-secondary); font-weight: 700; font-size: 13px; padding: 7px 14px; border-radius: 100px; cursor: pointer; font-family: var(--font); transition: all .25s var(--bounce); }
  .sort-pill.active { background: var(--tg-blue); color: #fff; box-shadow: 0 4px 12px rgba(10,132,255,0.35); }
  .range-mini { display: inline-flex; align-items: center; gap: 6px; }
  .range-input { width: 64px; padding: 9px 10px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-input); color: var(--text-primary); font-size: 13px; font-family: var(--font); outline: none; }
  .range-input:focus { border-color: var(--tg-blue); }
  .range-dash { color: var(--text-secondary); }
  .range-go { border: none; background: var(--bg-input); border: 1px solid var(--border); color: var(--text-primary); font-weight: 700; font-size: 13px; padding: 9px 14px; border-radius: 12px; cursor: pointer; font-family: var(--font); }
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
  .gate-logo { width: 76px; height: 76px; border-radius: 22px; margin: 0 auto 18px; display: block; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
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
  .price-cur { font-size: 0.8em; font-weight: 800; opacity: 0.85; letter-spacing: 0.3px; }
  .result-view { font-size: 13px; font-weight: 700; color: var(--text-secondary); }

  /* result cards: NO blur (huge perf win across a long list) + crisp glass + top sheen */
  .result-card { background: var(--card-solid); backdrop-filter: none; -webkit-backdrop-filter: none; border-radius: var(--radius-lg); box-shadow: var(--shadow-card); padding: 12px; overflow: hidden; transition: transform .26s var(--ease), box-shadow .26s var(--ease); }
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
  .results-title { letter-spacing: -0.6px; }
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
  .badge-buy { transition: transform .16s var(--spring), box-shadow .2s; }
  .badge-buy:active { transform: scale(0.9); }
  .ios-row { transition: background .18s; }
  .sheet-list-item, .sheet-model-item { transition: background .18s; }
  .tab-btn:active svg { transform: scale(0.88); }
  .hero-title { letter-spacing: -1px; }
  ::selection { background: rgba(10,132,255,0.28); }
  * { -webkit-tap-highlight-color: transparent; }

  /* ── logo tile (rounded-square morphism, replaces wordmark) ── */
  .logo-tile { width: 46px; height: 46px; border-radius: 15px; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(160deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04));
    border: 1px solid var(--glass-hi); box-shadow: 0 8px 22px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.4);
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur); overflow: hidden; }
  .logo-tile img { width: 78%; height: 78%; object-fit: contain; }
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
  /* affiliate sheet */
  .aff-locked { text-align: center; padding: 18px 0 6px; }
  .aff-locked-icon { width: 56px; height: 56px; border-radius: 16px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0a84ff, #bf5af2); box-shadow: 0 8px 24px rgba(10,132,255,0.35); }
  .aff-locked-title { font-size: 17px; font-weight: 800; color: var(--text-primary); }
  .aff-locked-sub { font-size: 13.5px; color: var(--text-secondary); margin-top: 6px; line-height: 1.5; padding: 0 8px; }
  .aff-balance { text-align: center; padding: 18px; border-radius: var(--radius-lg); background: linear-gradient(135deg, rgba(48,209,88,0.16), rgba(10,132,255,0.10)); border: 1px solid rgba(48,209,88,0.4); margin-bottom: 14px; }
  .aff-bal-label { font-size: 13px; font-weight: 700; color: var(--text-secondary); }
  .aff-bal-value { font-size: 30px; font-weight: 800; color: var(--text-primary); display: flex; align-items: center; justify-content: center; gap: 7px; margin-top: 4px; }
  .aff-bal-ton { font-size: 13px; color: var(--text-secondary); margin-top: 3px; }
  .aff-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .aff-stat { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 12px 4px; text-align: center; }
  .aff-stat-n { font-size: 18px; font-weight: 800; color: var(--text-primary); }
  .aff-stat-l { font-size: 10.5px; color: var(--text-secondary); margin-top: 2px; }
  .bc-wrap { display: flex; flex-direction: column; gap: 12px; }
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
  .admin-tabs { display: flex; gap: 6px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 100px; padding: 4px; margin-bottom: 20px; }
  .admin-tab { flex: 1; border: none; background: transparent; color: var(--text-secondary); font-weight: 700; font-size: 13.5px; padding: 9px 0; border-radius: 100px; cursor: pointer; font-family: var(--font); transition: all .25s var(--spring); }
  .admin-tab.active { background: var(--accent-grad); color: #fff; box-shadow: 0 4px 12px rgba(10,132,255,0.35); }
  .star-balance-card { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: var(--radius-lg); background: linear-gradient(135deg, rgba(255,184,0,0.16), rgba(255,122,0,0.10)); border: 1px solid rgba(255,160,0,0.4); box-shadow: 0 8px 24px rgba(255,150,0,0.14); }
  .sbc-icon { width: 46px; height: 46px; border-radius: 14px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #ffb800, #ff7a00); box-shadow: 0 4px 12px rgba(255,150,0,0.4); flex-shrink: 0; }
  .sbc-label { font-size: 13px; font-weight: 700; color: var(--text-secondary); }
  .sbc-value { font-size: 26px; font-weight: 800; color: var(--text-primary); line-height: 1.1; margin-top: 2px; }
  .sbc-unit { font-size: 15px; font-weight: 700; color: var(--text-secondary); }
  .sbc-err { font-size: 16px; font-weight: 700; color: var(--text-secondary); }
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
  .legal-item { margin-bottom: 16px; }
  .legal-q { font-size: 14.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
  .legal-a { font-size: 13.5px; line-height: 1.55; color: var(--text-secondary); }
  .legal-foot { text-align: center; color: var(--text-secondary); font-size: 12px; padding: 10px 0 4px; }
  /* first-launch consent */
  .consent-wrap { position: fixed; inset: 0; z-index: 90; background: rgba(0,0,0,0.45); backdrop-filter: blur(4px); display: flex; align-items: flex-end; justify-content: center; padding: 0 14px calc(var(--safe-bottom, 16px) + 14px); }
  .consent-card { width: 100%; max-width: 430px; max-height: calc(100vh - 48px); overflow-y: auto; background: var(--bg-card); border: 1px solid var(--border); border-radius: 22px; padding: 20px 18px; box-shadow: 0 18px 60px rgba(0,0,0,0.5); animation: fadeInUp .45s var(--bounce) both; }
  .consent-title { font-size: 17px; font-weight: 800; color: var(--text-primary); margin-bottom: 6px; }
  .consent-text { font-size: 13.5px; line-height: 1.55; color: var(--text-secondary); margin-bottom: 14px; }
  .consent-link { color: var(--tg-blue); font-weight: 700; cursor: pointer; }
  .consent-btn { width: 100%; }
  /* desktop launch page: bigger, brand-forward (only when there's room) */
  @media (min-width: 768px) and (min-height: 700px) {
    .splash-card { transform: scale(1.22); }
    .splash-leaving .splash-card { transform: scale(1.12); }
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
    </>
  );

  const tabs = [["overview", "Overview"], ["activity", "Activity"], ["growth", "Growth"], ["broadcast", "Broadcast"]];

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
                <div className="sbc-icon"><TGStar size={26} /></div>
                <div className="sbc-body">
                  <div className="sbc-label">Bot Star balance</div>
                  <div className="sbc-value">
                    {starBalance == null ? "\u2026"
                      : starBalance.error ? <span className="sbc-err">unavailable</span>
                      : <>{Number(starBalance.stars || 0).toLocaleString("en-US")} <span className="sbc-unit">Stars</span></>}
                  </div>
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
      // One-time migration: light is now the default for everyone.
      if (!localStorage.getItem("gt_theme_v2")) { localStorage.setItem("gt_theme_v2", "1"); return "light"; }
      return localStorage.getItem("gt_theme") || "light";
    } catch { return "light"; }
  });
  const [lang, setLang] = useState(() => localStorage.getItem("gt_lang") || "EN");
  const t = T[lang] || T.EN;

  const [booting, setBooting] = useState(true);

  const [savedGifts, setSavedGifts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gt_saved") || "[]"); } catch { return []; }
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
  const [isSearching, setIsSearching] = useState(false);
  const [isScouting, setIsScouting] = useState(false);
  const [activeSheet, setActiveSheet] = useState(null);
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
  const consentOverlay = !legalOk ? (
    <div className="consent-wrap" role="dialog" aria-label="Terms notice">
      <div className="consent-card">
        <div className="consent-title">Welcome to GiftTrove</div>
        <div className="consent-text">
          By using this mini app you agree to our{" "}
          <span className="consent-link" onClick={() => setActiveSheet("terms")}>Terms of Service</span> and{" "}
          <span className="consent-link" onClick={() => setActiveSheet("privacy")}>Privacy Policy</span>.
        </div>
        <button className="action-btn consent-btn" onClick={acceptLegal}>Agree and continue</button>
      </div>
    </div>
  ) : null;
  const [selectedGift, setSelectedGift] = useState(null);

  // results / sorting / pagination
  const [sortBy, setSortBy] = useState(savedSearch.sortBy || "default");        // default (general) | price_asc | price_desc
  const [nextOffset, setNextOffset] = useState(savedSearch.nextOffset || "");
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(!!savedSearch.hasSearched);
  const [minPrice, setMinPrice] = useState(savedSearch.minPrice || "");
  const [maxPrice, setMaxPrice] = useState(savedSearch.maxPrice || "");
  const lastSearch = useRef(savedSearch.lastSearch || null);   // remembers params for load-more / re-sort

  // access gate (admins auto-pass; everyone else needs the code)
  const [access, setAccess] = useState("checking");        // checking | locked | granted
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
  const [promoAmount, setPromoAmount] = useState("");
  const [promoCurrency, setPromoCurrency] = useState("GRAM");
  const [promoLink, setPromoLink] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoMsg, setPromoMsg] = useState("");
  // affiliate program (Scout Pro)
  const [affInfo, setAffInfo] = useState(null);
  const [affAddr, setAffAddr] = useState("");
  const [affBusy, setAffBusy] = useState(false);
  const [affMsg, setAffMsg] = useState("");
  const [pendingScout, setPendingScout] = useState("");   // gift_id from a q_ inline deep link

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

  // donate
  const [donateStep, setDonateStep] = useState(1);
  const [donateAmount, setDonateAmount] = useState("");
  const [donateWallet, setDonateWallet] = useState("TonKeeper");
  const [donateTx, setDonateTx] = useState("");

  // pull to refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);
  const touchStartY = useRef(0);
  const contentRef = useRef(null);

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
  useEffect(() => { localStorage.setItem("gt_theme", theme); document.documentElement.setAttribute("data-theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("gt_lang", lang); }, [lang]);
  useEffect(() => { localStorage.setItem("gt_saved", JSON.stringify(savedGifts)); }, [savedGifts]);
  useEffect(() => { localStorage.setItem(refKey, String(referralCount)); }, [referralCount, refKey]);
  useEffect(() => { localStorage.setItem("gt_recent", JSON.stringify(recentSearches)); }, [recentSearches]);

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
    let alive = true;
    const uid = tgUser?.id || "";
    const savedCode = localStorage.getItem("gt_code") || "";
    askAccess(uid, savedCode)
      .then((d) => { if (alive) setAccess(d?.ok ? "granted" : "locked"); })
      .catch(() => { if (alive) setAccess("locked"); });
    return () => { alive = false; };
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

  // Affiliate dashboard: load when the sheet opens.
  useEffect(() => {
    if (activeSheet === "affiliate" && window.Telegram?.WebApp?.initData) {
      setAffMsg("");
      api("/api/affiliate").then((d) => setAffInfo(d || { ok: false })).catch(() => setAffInfo({ ok: false }));
    }
  }, [activeSheet]);

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
    // Gift deep-link: g_<slug>_<refcode>  ->  open that gift + read the ref code
    if (param.startsWith("g_")) {
      const rest = param.slice(2);
      const u = rest.lastIndexOf("_");
      const slug = u >= 0 ? rest.slice(0, u) : rest;
      refCode = u >= 0 ? rest.slice(u + 1) : "";
      if (slug) {
        api(`/api/gift?slug=${encodeURIComponent(slug)}`)
          .then((g) => { if (g && (g.slug || g.name)) { setSelectedGift(g); setActiveSheet("gift_details"); } })
          .catch(() => {});
      }
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
  const buildSearchParams = (sort, offset) => {
    const col = collections.find((c) => c.name === giftQuery);
    const p = new URLSearchParams();
    if (giftQuery) p.set("gift", giftQuery);
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
    if (minPrice) p.set("min_price", minPrice);
    if (maxPrice) p.set("max_price", maxPrice);
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
    setIsScouting(true);
    setActiveTab("results");   // results pop up in the next tab
    const newSort = "default"; // a brand-new search always starts in General
    setSortBy(newSort);
    const started = Date.now();
    try {
      const p = buildSearchParams(newSort, "");
      const q = giftQuery.trim();
      const known = collectionNames.some((n) => n.toLowerCase() === q.toLowerCase());
      lastSearch.current = { sort: newSort, query: q, known };
      if (known) recordSearch(q);
      const d = await api(`/api/search?${p.toString()}`, { timeout: 20000 });
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
    setSelectedBackdrops([]); setSelectedMarkets(["All"]);
    setScoutError(null); setHasSearched(true); setResults([]); setNextOffset("");
    setIsScouting(true); setActiveTab("results");
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
      const d = await api(`/api/search?${p.toString()}`, { timeout: 20000 });
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
        return [...prev, ...more.filter((x) => !seen.has(x.id))];
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
    try {
      const p = buildSearchParams(sort, "");
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
  const HOTON_STARS_LINK = "https://t.me/hotontgbot/app?startapp=UQCvd6Sw_JJQsedBGfR2JOn7it7VdREWQ7v3kIluUi0RPMXJ";
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
    try {
      const r = await api("/api/promote/create", { method: "POST", body: {
        gift_id: promoColl.gift_id, slug: promoColl.slug || "", marketplace: promoMarket,
        model: promoModel, symbol: promoSymbol, backdrop: promoBackdrop,
        amount: promoAmount.trim(), currency: promoCurrency, link: promoLink.trim(),
      }, timeout: 20000 });
      if (!r?.ok || !r.link) {
        const m = r?.error === "limit" ? t.promo_limit : r?.error === "collection" ? t.promo_bad_coll
          : r?.error === "auth" ? t.open_in_tg : t.promo_failed;
        setPromoMsg(m); setPromoBusy(false); return;
      }
      tg.openInvoice(r.link, (status) => {
        setPromoBusy(false);
        if (status === "paid") {
          setPromoMsg(t.promo_live); haptic("medium");
          setPromoColl(null); setPromoModel(""); setPromoSymbol(""); setPromoBackdrop("");
          setPromoAmount(""); setPromoLink("");
          setTimeout(() => { setActiveSheet(null); setPromoMsg(""); }, 1600);
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
    if (promo.marketplace === "Fragment" && promo.slug) { safeOpen(`https://fragment.com/gifts/${promo.slug}`); return; }
    // Telegram (or missing slug): open the collection inside GiftTrove so live listings show.
    const col = collections.find((c) => String(c.gift_id) === String(promo.gift_id));
    if (col) { setActiveSheet(null); scoutGift(col); }
    else if (promo.slug) safeOpen(`https://t.me/nft/${promo.slug}`);
  };
  const withdrawAffiliate = async () => {
    const addr = affAddr.trim();
    if (!addr) { setAffMsg(t.aff_need_addr); return; }
    setAffBusy(true); setAffMsg("");
    try {
      const r = await api("/api/affiliate/withdraw", { method: "POST", body: { ton_address: addr }, timeout: 20000 });
      if (r?.ok) {
        setAffMsg(t.aff_requested); haptic("medium"); setAffAddr("");
        api("/api/affiliate").then((d) => setAffInfo(d || {})).catch(() => {});
      } else {
        setAffMsg(r?.error === "min" ? t.aff_min.replace("{n}", String(r.min || 1000))
          : r?.error === "pro" ? t.aff_pro_only : r?.error === "address" ? t.aff_need_addr : t.aff_failed);
      }
    } catch { setAffMsg(t.aff_failed); }
    setAffBusy(false);
  };
  const shareGift = async (item) => {
    haptic();
    const link = giftDeepLink(item, myRef);
    const name = `${item?.name || "Telegram gift"}${item?.num != null ? ` #${item.num}` : ""}`;
    const mkt = item?.market || "Telegram";
    let price = "";
    if (item?.price != null) {
      const n = Number(item.price);
      const amt = Number.isFinite(n) ? n.toLocaleString("en-US") : item.price;
      price = item.currency === "Stars" ? `${amt} Stars` : `${amt} GRAM`;
    }
    // Preferred: a prepared message carrying the marketplace's PREMIUM custom
    // emoji (only possible through savePreparedInlineMessage + shareMessage).
    let attempted = false;
    try {
      if (tg?.shareMessage && window.Telegram?.WebApp?.initData) {
        attempted = true;   // backend counts the share on this call
        const r = await api("/api/share", { method: "POST", body: {
          name: item?.name, num: item?.num != null ? String(item.num) : "", market: mkt, price, link,
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
    const text = [name, `${mkt}${price ? ` \u00b7 ${price}` : ""}`, "Scout it on GiftTrove"].join("\n");
    safeOpen(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
  };

  // ── donate ──
  const executeDonate = () => {
    haptic("medium");
    if (donateWallet === "Tg Wallet") {
      if (copyText(DONATE_ADDRESS)) showToast(t.address_copied);
      setDonateStep(2);
      return;
    }
    const url = walletUrl(donateWallet, DONATE_ADDRESS, donateAmount, DONATE_COMMENT);
    if (url) safeOpen(url);
    setDonateStep(2);
  };

  // ── card renderer ──
  const renderGiftCard = (item, i = 0) => {
    const poster = item.image || giftImage(item.slug, item.num);
    const anim = giftAnimation(item.slug, item.num);
    const saved = isSavedGift(item);
    const dotHex = item.backdropHex;
    return (
      <div key={item.id} className="result-card" style={{ animationDelay: `${Math.min(i, 16) * 0.035}s` }} onClick={() => { haptic(); setSelectedGift(item); setActiveSheet("gift_details"); }}>
        <div className="result-gift-hero" style={dotHex ? { background: `radial-gradient(circle at 50% 35%, ${dotHex}33, transparent 70%)` } : undefined}>
          <LottieGift src={anim} poster={poster} size={132} radius={18} />
          <div className="result-save" onClick={(e) => { e.stopPropagation(); toggleSave(item); }} style={{ color: saved ? "var(--tg-blue)" : "#fff" }}>
            {saved ? <IconBookmarkFilled /> : <IconBookmark />}
          </div>
        </div>
        <div className="result-name">{item.name}{item.num != null ? ` #${item.num}` : ""}</div>
        <div className="result-meta">
          {dotHex && <span className="color-dot" style={{ width: 11, height: 11, background: dotHex }} />}
          <span>{item.market}{item.backdrop ? ` • ${item.backdrop}` : ""}</span>
        </div>
        {item.model && (
          <div className="result-model">
            <span className={`model-rarity ${rarityClass(item.modelRarity)}`}>{item.model}</span>
            {item.modelRarity != null && <span style={{ marginLeft: 6 }}>{fmtRarity(item.modelRarity)}</span>}
          </div>
        )}
        <div className="result-foot">
          <div className="result-price">{item.price != null ? <PriceTag item={item} size={17} exact={isDesktop} /> : <span className="result-view">{t.view_on}</span>}</div>
          <div className="badge-buy" onClick={(e) => handleBuy(e, item)}>{t.buy}</div>
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
    const poster = giftImage(promo.slug, 1);   // static collection art (instant, no Lottie fetch)
    const sub = [promo.model, promo.symbol, promo.backdrop].filter(Boolean).join(" \u00b7 ");
    const amt = (promo.amount || "").toString().trim();
    let amtText = "";
    if (amt) {
      const n = Number(amt.replace(/,/g, ""));
      const shown = Number.isFinite(n) ? n.toLocaleString("en-US") : amt;
      const unit = promo.currency === "Stars" ? "Stars" : promo.currency === "TON" ? "TON" : "GRAM";
      amtText = `${shown} ${unit}`;
    }
    return (
      <div key={`promo-${promo.id}`} className="result-card promo-card" style={{ animationDelay: `${Math.min(i, 16) * 0.035}s` }} onClick={() => openPromo(promo)}>
        <div className="promo-flag" onClick={(e) => { e.stopPropagation(); reportPromo(promo); }} title={t.promo_report}><IconFlag /></div>
        <div className="result-gift-hero">
          {poster
            ? <img src={poster} alt="" loading="lazy" decoding="async" className="promo-poster" />
            : <div className="promo-poster skeleton" />}
          <div className="promo-badge">{t.promoted}</div>
        </div>
        <div className="result-name">{promo.collection}</div>
        <div className="result-meta"><span>{sub || "\u00a0"}</span></div>
        <div className="result-foot">
          <div className="result-price">{amtText ? <span className="promo-amt">{amtText}</span> : <span className="result-view">{t.view}</span>}</div>
          <div className="badge-buy" onClick={(e) => { e.stopPropagation(); openPromo(promo); }}>{promo.marketplace}</div>
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
          <div className="sheet-title">{t.premium_title}</div>
          <p className="premium-status">{t.you_are_on} <b>{statusLabel}</b>{isPremium && exp ? ` \u00b7 ${t.renews} ${exp}` : ""}</p>
          <Plan id="plus" name="Scout+" price={prices.plus} accent="#0a84ff" perks={[t.perk_5_filters]} />
          <Plan id="pro" name="Scout Pro" price={prices.pro} accent="#bf5af2" perks={[t.perk_unlimited, t.perk_vanity, t.perk_no_ads]} />

          <div className="hoton-cta" onClick={() => safeOpen(HOTON_STARS_LINK)}>
            <div className="hoton-star"><LottieGift src={HOTON_STAR_LOTTIE} size={46} radius={12} eager /></div>
            <div className="hoton-cta-body">
              <div className="hoton-cta-title">{t.need_stars}</div>
              <div className="hoton-cta-sub">{t.need_stars_sub}</div>
            </div>
            <IconChevronRight />
          </div>

          <p className="premium-fineprint">{t.premium_fineprint}</p>
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
          <div className="sheet-title">{t.promote_title}</div>
          <p className="premium-status">{t.promote_sub.replace("{n}", String(price)).replace("{d}", String(days))}</p>

          <div className="promo-field-label" style={{ marginTop: 4 }}>{t.promo_collection}</div>
          {!promoColl ? (
            <>
              <input className="ios-input" value={promoCollQuery} placeholder={t.promo_search_coll}
                onChange={(e) => setPromoCollQuery(e.target.value)} />
              <div className="promo-coll-list" onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                {collMatches.map((c) => (
                  <div key={c.gift_id} className="promo-coll-row" onClick={() => { haptic(); setPromoColl(c); setPromoCollQuery(""); }}>
                    {c.slug && <img src={giftImage(c.slug, 1)} alt="" loading="lazy" className="promo-coll-img" />}
                    <span>{c.name}</span>
                  </div>
                ))}
                {collMatches.length === 0 && <div className="promo-coll-empty">{t.no_results}</div>}
              </div>
            </>
          ) : (
            <div className="promo-chosen">
              {promoColl.slug && <img src={giftImage(promoColl.slug, 1)} alt="" className="promo-coll-img" />}
              <span style={{ flex: 1, fontWeight: 700 }}>{promoColl.name}</span>
              <button className="promo-change" onClick={() => setPromoColl(null)}>{t.promo_change}</button>
            </div>
          )}

          <div className="promo-field-label" style={{ marginTop: 14 }}>{t.promo_marketplace}</div>
          <div className="promo-market-row">
            {["Telegram", "Fragment"].map((m) => (
              <button key={m} className={`promo-market-btn ${promoMarket === m ? "active" : ""}`}
                onClick={() => { haptic(); setPromoMarket(m); }}>{m}</button>
            ))}
          </div>

          {promoColl && (promoAttrs.models.length + promoAttrs.symbols.length + promoAttrs.backdrops.length > 0) && (
            <>
              <div className="promo-field-label" style={{ marginTop: 14 }}>{t.promo_attrs_opt}</div>
              {promoAttrs.models.length > 0 && <PromoSelect label={t.model} options={promoAttrs.models} value={promoModel} onChange={setPromoModel} />}
              {promoAttrs.symbols.length > 0 && <PromoSelect label={t.symbol} options={promoAttrs.symbols} value={promoSymbol} onChange={setPromoSymbol} />}
              {promoAttrs.backdrops.length > 0 && <PromoSelect label={t.backdrop} options={promoAttrs.backdrops} value={promoBackdrop} onChange={setPromoBackdrop} />}
            </>
          )}

          <div className="promo-field-label" style={{ marginTop: 14 }}>{t.promo_price_opt}</div>
          <div className="promo-amount-row">
            <input className="ios-input" style={{ flex: 1 }} inputMode="decimal" value={promoAmount}
              placeholder={t.promo_amount_ph} onChange={(e) => setPromoAmount(e.target.value.replace(/[^0-9.,]/g, ""))} />
            <select className="promo-select" style={{ width: 110 }} value={promoCurrency} onChange={(e) => setPromoCurrency(e.target.value)}>
              <option value="GRAM">GRAM</option>
              <option value="TON">TON</option>
              <option value="Stars">Stars</option>
            </select>
          </div>

          <div className="promo-field-label" style={{ marginTop: 14 }}>{t.promo_link_opt}</div>
          <input className="ios-input" value={promoLink} placeholder="https://t.me/nft/... or fragment.com/..."
            onChange={(e) => setPromoLink(e.target.value)} />
          <p className="promo-hint">{t.promo_link_help}</p>

          <button className="action-btn" style={{ background: "linear-gradient(135deg, #ff9f0a, #ff375f)", marginTop: 16 }}
            disabled={!promoColl || promoBusy} onClick={createPromo}>
            <TGStar size={16} /> &nbsp;{promoBusy ? t.opening : t.promote_cta.replace("{n}", String(price))}
          </button>
          {promoMsg && <p className="vanity-msg" style={{ textAlign: "center" }}>{promoMsg}</p>}
          <p className="premium-fineprint">{t.promote_fineprint}</p>
        </BottomSheet>
      );
    }
    if (activeSheet === "affiliate") {
      const a = affInfo && affInfo.ok ? affInfo : null;
      const isPro = !!(a && a.is_pro);
      const pct = (a && a.pct) || 30;
      const minW = (a && a.min_withdraw) || 1000;
      const avail = (a && a.available) || 0;
      const canWithdraw = isPro && avail >= minW;
      return (
        <BottomSheet onClose={() => setActiveSheet(null)}>
          <div className="sheet-title">{t.affiliate_title}</div>
          <p className="premium-status">{t.affiliate_sub.replace("{n}", String(pct))}</p>

          {!a ? (
            <p className="vanity-help" style={{ textAlign: "center", padding: "18px 0" }}>{affInfo === null ? "\u2026" : t.aff_failed}</p>
          ) : !isPro ? (
            <>
              <div className="aff-locked">
                <div className="aff-locked-icon"><TGStar size={28} /></div>
                <div className="aff-locked-title">{t.aff_locked_title}</div>
                <div className="aff-locked-sub">{t.aff_locked_sub.replace("{n}", String(pct))}</div>
              </div>
              <button className="action-btn" onClick={() => { haptic(); setActiveSheet("premium"); }}>{t.aff_upgrade}</button>
            </>
          ) : (
            <>
              <div className="aff-balance">
                <div className="aff-bal-label">{t.aff_available}</div>
                <div className="aff-bal-value"><TGStar size={22} /> {Number(avail).toLocaleString("en-US")}</div>
                {a.ton_value != null && <div className="aff-bal-ton">{"\u2248 "}{a.ton_value} TON</div>}
              </div>
              <div className="aff-stats">
                <div className="aff-stat"><div className="aff-stat-n">{Number(a.earned || 0).toLocaleString("en-US")}</div><div className="aff-stat-l">{t.aff_earned}</div></div>
                <div className="aff-stat"><div className="aff-stat-n">{Number(a.pending || 0).toLocaleString("en-US")}</div><div className="aff-stat-l">{t.aff_pending}</div></div>
                <div className="aff-stat"><div className="aff-stat-n">{a.referees || 0}</div><div className="aff-stat-l">{t.aff_referred}</div></div>
                <div className="aff-stat"><div className="aff-stat-n">{a.payers || 0}</div><div className="aff-stat-l">{t.aff_payers}</div></div>
              </div>
              <div className="promo-field-label" style={{ marginTop: 16 }}>{t.aff_ton_addr}</div>
              <input className="ios-input" value={affAddr} placeholder={t.aff_addr_ph}
                onChange={(e) => setAffAddr(e.target.value.trim())} />
              <button className="action-btn" style={{ marginTop: 14 }} disabled={!canWithdraw || affBusy} onClick={withdrawAffiliate}>
                {affBusy ? t.opening : canWithdraw ? t.aff_withdraw : t.aff_min.replace("{n}", String(minW))}
              </button>
              {affMsg && <p className="vanity-msg" style={{ textAlign: "center" }}>{affMsg}</p>}
            </>
          )}
          <p className="premium-fineprint">{t.aff_fineprint.replace("{n}", String(minW))}</p>
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
                  <div className="legal-a">{p}</div>
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
      const dot = g.backdropHex;
      return (
        <BottomSheet onClose={() => setActiveSheet(null)}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 18 }}>
              <LottieGift src={anim} poster={img} size={132} radius={24} />
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
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {dot && <span className="color-dot" style={{ background: dot }} />}{g.backdrop}
                  </span>
                </div>
              )}
              {g.symbol && (
                <div className="ios-row" style={{ cursor: "default" }}>
                  <span style={{ color: "var(--text-secondary)" }}>{t.symbol}</span><span>{g.symbol}</span>
                </div>
              )}
              <div className="ios-row" style={{ cursor: "default" }}>
                <span style={{ color: "var(--text-secondary)" }}>{t.listed_value}</span>
                <span style={{ color: "var(--tg-blue)", fontWeight: 800 }}>
                  {g.price != null ? <PriceTag item={g} size={17} exact /> : "—"}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="action-btn" style={{ flex: 1, background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border)", marginTop: 0 }} onClick={() => { toggleSave(g); setActiveSheet(null); }}>
                {saved ? t.remove_saved : t.save_gift}
              </button>
              <button className="action-btn" style={{ flex: 1, marginTop: 0 }} onClick={(e) => handleBuy(e, g)}>{t.buy_now}</button>
              <button className="share-btn" onClick={() => shareGift(g)} title={t.share_gift}><IconShare /></button>
            </div>
        </BottomSheet>
      );
    }

    if (activeSheet === "donate") {
      const isTg = donateWallet === "Tg Wallet";
      return (
        <BottomSheet onClose={() => { setActiveSheet(null); setDonateStep(1); setDonateAmount(""); setDonateTx(""); }}>
            {donateStep === 1 && (
              <div className="fade-in-up">
                <div className="sheet-title">{t.donate}</div>
                <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: 24, fontSize: 15, lineHeight: 1.4 }}>{t.donate_desc}</p>
                <div className="input-group">
                  <input type="number" inputMode="decimal" className="ios-input" placeholder={t.amount_ton} value={donateAmount} onChange={(e) => setDonateAmount(e.target.value)} />
                </div>
                <div className="chips-grid" style={{ justifyContent: "center" }}>
                  {["MyTonWallet", "TonKeeper", "Tg Wallet"].map((w) => (
                    <div key={w} className={`chip ${donateWallet === w ? "active" : ""}`} onClick={() => { haptic(); setDonateWallet(w); }}>{w}</div>
                  ))}
                </div>
                <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: 16, fontSize: 13, lineHeight: 1.4 }}>
                  {isTg
                    ? t.tg_copy_note.replace("{amt}", donateAmount || "—")
                    : t.wallet_redirect.replace("{w}", donateWallet)}
                </p>
                <button className="action-btn" onClick={executeDonate} disabled={!donateAmount}>
                  {isTg ? t.copy_address : t.donate}
                </button>
              </div>
            )}
            {donateStep === 2 && (
              <div className="fade-in-up">
                <div className="sheet-title">{t.verify_tx}</div>
                <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: 24, fontSize: 15, lineHeight: 1.4 }}>
                  {isTg ? `${t.tg_copy_note.replace("{amt}", donateAmount || "—")}` : "Paste your transaction hash to verify your transfer."}
                </p>
                <div className="input-group">
                  <input type="text" className="ios-input" placeholder={t.tx_id} value={donateTx} onChange={(e) => setDonateTx(e.target.value)} />
                </div>
                <button className="action-btn" onClick={() => setDonateStep(3)} disabled={!donateTx}>{t.verify_tx}</button>
              </div>
            )}
            {donateStep === 3 && (
              <div className="fade-in-up" style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ color: "var(--tg-blue)", marginBottom: 16 }}><IconHeart /></div>
                <div className="sheet-title">{t.thank_you}</div>
                <button className="action-btn" onClick={() => { setActiveSheet(null); setDonateStep(1); setDonateAmount(""); setDonateTx(""); }}>Close</button>
              </div>
            )}
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
      return (
        <BottomSheet onClose={() => setActiveSheet(null)}>
            <div className="sheet-title">{isModel ? t.model : t.symbol}</div>
            {attrCap > 1
              ? <div className="filter-cap-note">{arr.length}/{attrCap >= 999 ? "\u221E" : attrCap} {t.selected_n}</div>
              : <div className="filter-cap-note upsell" onClick={() => setActiveSheet("premium")}>{t.filter_upsell}<IconChevronRight /></div>}
            {list.length === 0 && (
              <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: 16, fontSize: 14 }}>
                {selectedCollection ? t.attrs_loading : `${t.select_gift_first} ${isModel ? t.model.toLowerCase() : t.symbol.toLowerCase()}`}
              </p>
            )}
            <div className="ios-group" style={{ margin: 0 }}>
              <div className="sheet-model-item" onClick={() => clearAttr(typ)}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{t.any}</span>
                {arr.length === 0 && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
              </div>
              {list.map((m) => (
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
      return (
        <BottomSheet onClose={() => setActiveSheet(null)}>
            <div className="sheet-title">{t.backdrop}</div>
            {attrCap > 1
              ? <div className="filter-cap-note">{arr.length}/{attrCap >= 999 ? "\u221E" : attrCap} {t.selected_n}</div>
              : <div className="filter-cap-note upsell" onClick={() => setActiveSheet("premium")}>{t.filter_upsell}<IconChevronRight /></div>}
            {list.length === 0 && (
              <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: 16, fontSize: 14 }}>
                {selectedCollection ? t.attrs_loading : `${t.select_gift_first} ${t.backdrop.toLowerCase()}`}
              </p>
            )}
            <div className="ios-group" style={{ margin: 0 }}>
              <div className="sheet-list-item" onClick={() => clearAttr("backdrop")}>
                <span>{t.any}</span>{arr.length === 0 && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
              </div>
              {list.map((c) => (
                <div key={c.name} className="sheet-list-item" onClick={() => toggleAttr("backdrop", c.name)}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {c.hex && <span className="backdrop-swatch" style={{ background: c.edge ? `radial-gradient(circle at 50% 35%, ${c.hex}, ${c.edge})` : c.hex }} />}{c.name}
                    {c.rarity != null && <span className={`model-rarity ${rarityClass(c.rarity)}`} style={{ marginLeft: 4 }}>{fmtRarity(c.rarity)}</span>}
                  </span>
                  {arr.includes(c.name) && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
                </div>
              ))}
            </div>
            <button className="action-btn" style={{ marginTop: 16 }} onClick={() => setActiveSheet(null)}>{t.done}</button>
        </BottomSheet>
      );
    }

    return null;
  };

  // ── SCOUT TAB (search form only — results render in the Results tab) ──
  const filteredGifts = collectionNames.filter((g) => g.toLowerCase().includes(giftQuery.toLowerCase()));
  const renderScout = (desktop = false) => {
    return (
      <div className="fade-in-up">
        <div className={desktop ? "hero-title desktop" : "hero-title"}>
          {t.fastest_way}
          <img src={HERO_IMG} alt="" className="hero-title-img" />
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
                  {m}{!live && <span className="chip-soon-tag">{t.soon}</span>}
                  {!live && <span className="chip-info" onClick={(e) => { e.stopPropagation(); haptic(); setSoonNote(true); }}><IconInfo /></span>}
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
          <div className="scouting-overlay">
            <div className="scouting-spinner" />
            <div className="scouting-title">{t.scouting_title}</div>
            <div className="scouting-sub">{t.scouting_sub}</div>
            <div className="scouting-markets">
              {["Telegram", "GetGems", "Portals", "MRKT", "Tonnel"].map((m) => (
                <div key={m} className="scouting-market-chip">{m}</div>
              ))}
            </div>
          </div>
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
    if (!hasSearched || (results.length === 0)) {
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
          <div className="results-title">{t.results}</div>
          <div className="results-count">{t.showing_n.replace("{n}", results.length)}</div>
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
            <button className="range-go" onClick={handleScout}>{t.apply_filter}</button>
          </div>
        </div>

        <div className={desktop ? "results-grid desktop" : "results-grid"}>
          {visiblePromos.map((p, i) => renderPromoCard(p, i))}
          {results.map((item, i) => renderGiftCard(item, i))}
        </div>

        {nextOffset && (
          <button className="load-more-btn" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? <span className="lm-spin" /> : t.load_more}
          </button>
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
        <div className={desktop ? "results-grid desktop" : "results-grid"}>
          {savedGifts.map((item) => renderGiftCard(item))}
        </div>
      )}
    </div>
  );

  // ── PROFILE TAB ──
  const renderProfile = (desktop = false) => (
    <div className="fade-in-up">
      <div className={desktop ? "page-header desktop" : "page-header"}>{t.profile_tab}</div>

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
        <div className="ios-row" onClick={() => { haptic(); setActiveSheet("affiliate"); }}>
          <div className="row-left"><div className="row-icon-box" style={{ background: "linear-gradient(135deg, #30d158, #0a84ff)" }}><IconHeart /></div>{t.affiliate_row}</div>
          <IconChevronRight />
        </div>
      </div>

      <div className="section-label" style={{ marginTop: 12 }}>{t.referrals}</div>
      <div className="ios-group">
        <div className="ios-row" onClick={copyReferral}>
          <div className="row-left"><div className="row-icon-box" style={{ background: "#ff9500" }}><IconCopy /></div>{t.copy_ref}</div>
          {myRefCode && <div style={{ color: "var(--text-secondary)", fontWeight: 800, fontSize: 15, letterSpacing: "0.08em" }}>{myRefCode}</div>}
        </div>
        <div className="ios-row" style={{ cursor: "default" }}>
          <div className="row-left">{t.ref_count}</div>
          <div style={{ color: "var(--tg-blue)", fontWeight: 700, fontSize: 16 }}>{referralCount}</div>
        </div>
      </div>

      {tier === "pro" ? (
        <div className="ios-group" style={{ padding: "16px 16px 18px" }}>
          <div className="section-label" style={{ marginTop: 0, marginBottom: 8, padding: 0 }}>{t.vanity_title}</div>
          <p className="vanity-help">{t.vanity_help}</p>
          <div className="vanity-row">
            <input className="ios-input" style={{ flex: 1 }} value={vanityInput} maxLength={12}
              onChange={(e) => setVanityInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder={t.vanity_ph} />
            <button className="action-btn" style={{ width: "auto", padding: "0 18px", margin: 0 }} onClick={claimVanity}>{t.claim}</button>
          </div>
          {vanityMsg && <p className="vanity-msg">{vanityMsg}</p>}
          <p className="vanity-current">{t.your_code}: <b>{myRef}</b></p>
        </div>
      ) : (
        <div className="ios-group">
          <div className="ios-row" onClick={() => { haptic(); setActiveSheet("premium"); }}>
            <div className="row-left"><div className="row-icon-box" style={{ background: "linear-gradient(135deg,#0a84ff,#bf5af2)" }}><TGStar size={16} /></div>{t.vanity_title}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "var(--tg-blue)", fontWeight: 700, fontSize: 13 }}>{t.tier_pro_short}</span>
              <IconChevronRight />
            </div>
          </div>
        </div>
      )}

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
        <div className="ios-row" onClick={() => safeOpen(COMMUNITY.support)}>
          <div className="row-left"><div className="row-icon-box" style={{ background: "#34c759" }}><IconHeart /></div>{t.support}</div>
          <IconChevronRight />
        </div>
      </div>

      <div className="section-label">{t.support_builder}</div>
      <div className="ios-group">
        <div className="ios-row" onClick={() => safeOpen(COMMUNITY.insideMajek)}>
          <div className="row-left"><div className="row-icon-box" style={{ background: "#5856d6" }}><IconUser /></div>{t.inside_majek}</div>
          <IconChevronRight />
        </div>
        <div className="ios-row" onClick={() => { haptic(); setDonateStep(1); setActiveSheet("donate"); }}>
          <div className="row-left"><div className="row-icon-box" style={{ background: "#ff2d55" }}><IconHeart /></div>{t.donate}</div>
          <IconChevronRight />
        </div>
      </div>

      <div className="section-label">{t.about_legal}</div>
      <div className="ios-group">
        <div className="ios-row" onClick={() => { haptic(); setActiveSheet("faq"); }}>
          <div className="row-left"><div className="row-icon-box" style={{ background: "#0a84ff" }}><IconGlobe /></div>FAQ</div>
          <IconChevronRight />
        </div>
        <div className="ios-row" onClick={() => { haptic(); setActiveSheet("terms"); }}>
          <div className="row-left"><div className="row-icon-box" style={{ background: "#8e8e93" }}><IconCopy /></div>Terms of Service</div>
          <IconChevronRight />
        </div>
        <div className="ios-row" onClick={() => { haptic(); setActiveSheet("privacy"); }}>
          <div className="row-left"><div className="row-icon-box" style={{ background: "#34c759" }}><IconUser /></div>Privacy Policy</div>
          <IconChevronRight />
        </div>
        <div className="ios-row" onClick={clearMyData}>
          <div className="row-left"><div className="row-icon-box" style={{ background: "#ff3b30" }}><IconTrash /></div>
            <span style={clearArmed ? { color: "#ff3b30", fontWeight: 700 } : undefined}>{clearArmed ? "Tap again to confirm" : "Clear my data"}</span>
          </div>
          <IconChevronRight />
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 40, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600 }}>
        Built by <span onClick={() => safeOpen("https://t.me/insidemajek")} style={{ color: "var(--tg-blue)", cursor: "pointer" }}>@insidemajek</span>
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

  // ── BOOT SPLASH ──
  if (booting) {
    return (
      <>
        <style>{styles}</style>
        <GoldDefs />
        <div data-theme={theme}><LaunchLoader onDone={() => setBooting(false)} /></div>
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
              <div className="note-pop-title">{t.soon_title}</div>
              <div className="note-pop-body">{t.soon_note}</div>
              <button className="note-pop-btn" onClick={() => setSoonNote(false)}>{t.got_it}</button>
            </div>
          </div>
        )}
        {consentOverlay}
        <div className="desktop-layout" data-theme={theme}>
          <VoidGifts gifts={voidGifts} count={8} onPick={scoutGift} portal drift />
          <div className="desktop-sidebar">
            <div className="desktop-logo">
              <span className="logo-tile lg"><img src={LOGO_URL} alt="GiftTrove" /></span>
            </div>
            {tabs.map((tab) => (
              <button key={tab.id} className={`desktop-nav-btn ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => { haptic(); bump(tab.id); setActiveTab(tab.id); }}>
                {tabIcon(tab.id, pulse[tab.id])}{tab.label}
              </button>
            ))}
            <button className="desktop-mini-btn" onClick={() => { haptic(); setCompact((v) => { localStorage.setItem("gt_compact", v ? "0" : "1"); return !v; }); }}>
              {compact ? <><IconExpand /> Expand</> : <><IconMinimize /> Minimize</>}
            </button>
            <div className="desktop-sidebar-bottom">
              <div className="icon-btn" onClick={() => { bump("globe"); setActiveSheet("lang"); }}><IconGlobe trigger={pulse.globe} /></div>
              <div className="icon-btn" onClick={toggleTheme}><IconContrast trigger={pulse.theme} /></div>
            </div>
          </div>
          <div className={`desktop-content ${compact ? "compact" : ""}`}>{renderActiveTab(true)}</div>
          {renderSheet()}
        </div>
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
              <div className="note-pop-title">{t.soon_title}</div>
              <div className="note-pop-body">{t.soon_note}</div>
              <button className="note-pop-btn" onClick={() => setSoonNote(false)}>{t.got_it}</button>
            </div>
          </div>
        )}
        {consentOverlay}

        <div className="top-nav">
          <div className="logo-tile"><img src={LOGO_URL} alt="GiftTrove" /></div>
          <div className="top-icons">
            <div className="icon-btn" onClick={() => { bump("globe"); setActiveSheet("lang"); }}><IconGlobe trigger={pulse.globe} /></div>
            <div className="icon-btn" onClick={toggleTheme}><IconContrast trigger={pulse.theme} /></div>
          </div>
        </div>

        <div className="content ptr-container" ref={contentRef}
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
