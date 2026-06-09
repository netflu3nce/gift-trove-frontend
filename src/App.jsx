```react
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from "react";
import { ChevronRight, Check, Copy, Globe, Heart, Search, Bookmark, User, Bell, SlidersHorizontal, ArrowDown, ArrowUp, RefreshCcw } from "lucide-react";

/* ════════════════════════════════════════════════════════════════════════
   GiftTrove — Telegram Gift Scouting Mini App (Upgraded UI)
   ──────────────────────────────────────────────────────────────────────── */

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const BACKEND_URL =
  (typeof window !== "undefined" && window.__GIFTTROVE_API__) ||
  "https://gift-trove-backend.onrender.com";
const BACKEND_CONFIGURED = /^https?:\/\//.test(BACKEND_URL);

const FRAGMENT_CDN = "https://nft.fragment.com/gift";
const LOGO_URL = "https://i.ibb.co/nMV7Mvfp/Inria-Serif.png";
const SPLASH_LOTTIE_URL = "";
const DONATE_ADDRESS = "UQCvd6Sw_JJQsedBGfR2JOn7it7VdREWQ7v3kIluUi0RPMXJ";
const DONATE_COMMENT = "GiftTrove Donation";
const REF_BOT_LINK = "https://t.me/gifttrovebot/app?startapp=";

const COMMUNITY = {
  channel: "https://t.me/gifttrove",
  insideMajek: "https://t.me/insidemajek",
  otc: "https://t.me/troveotc",
  support: "https://t.me/insidemajek",
};

const FALLBACK_COLLECTIONS = [
  "Plush Pepe", "Durov's Cap", "Heart Locket", "Precious Peach", "Astral Shard",
  "Toy Bear", "Vintage Cigar", "Signet Ring", "Scared Cat", "Nail Bracelet",
  "Neko Helmet", "Bonded Ring", "Perfume Bottle", "Eternal Rose", "Swiss Watch",
  "Magic Potion", "Jelly Bunny", "Spiced Wine", "Santa Hat", "B-Day Candle",
  "Homemade Cake", "Snake Box", "Crystal Ball", "Mini Oscar", "Sharp Tongue",
];

const MARKETPLACES = ["All", "Telegram", "GetGems", "Portals", "MRKT", "Tonnel", "Fragment"];
const LIVE_MARKETS = new Set(["Telegram", "GetGems"]);
const LANGS = { EN: "English", RU: "Русский", ZH: "中文" };

// ─── API CLIENT (Fixed Template Literals for esbuild) ──────────────────────
async function api(path, { method = "GET", body, timeout = 10000 } = {}) {
  if (!BACKEND_CONFIGURED) throw new Error("backend-not-configured");
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(BACKEND_URL + path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error("http-" + res.status);
    return await res.json();
  } finally {
    clearTimeout(tid);
  }
}

// ─── UTILS ──────────────────────────────────────────────────────────────────
const nano = (ton) => Math.round((parseFloat(ton) || 0) * 1e9);

function giftImage(slug, num) { 
  return slug && num != null ? FRAGMENT_CDN + "/" + slug + "-" + num + ".large.jpg" : null; 
}

function giftAnimation(slug, num) { 
  return slug && num != null ? FRAGMENT_CDN + "/" + slug + "-" + num + ".lottie.json" : null; 
}

function marketplaceUrl(item) {
  if (item?.url && /^https?:\/\//.test(item.url)) return item.url;
  if (item?.slug && item?.num != null) return "https://t.me/nft/" + item.slug + "-" + item.num;
  return null;
}

function fmtPrice(item) {
  if (!item || item.price == null) return null;
  const cur = item.currency || "GRAM";
  if (cur === "Stars") {
    const n = Number(item.price);
    return "⭐ " + (Number.isFinite(n) ? n.toLocaleString("en-US") : item.price);
  }
  return item.price + " " + cur;
}

function walletUrl(wallet, address, amountTON, comment) {
  const amt = nano(amountTON);
  const text = encodeURIComponent(comment || "");
  if (wallet === "TonKeeper") return "https://app.tonkeeper.com/transfer/" + address + "?amount=" + amt + "&text=" + text;
  if (wallet === "MyTonWallet") return "https://my.tt/transfer/" + address + "?amount=" + amt + "&text=" + text;
  return null;
}

function safeOpen(url) {
  if (!url) return false;
  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null;
  const isTme = /^https:\/\/t\.me\//.test(url) || /^tg:\/\//.test(url);
  try {
    if (tg && isTme && tg.openTelegramLink) { tg.openTelegramLink(url); return true; }
    if (tg && tg.openLink && /^https:\/\//.test(url)) { tg.openLink(url); return true; }
    window.open(url, "_blank", "noopener");
    return true;
  } catch { return false; }
}

function copyText(text) {
  try { if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text); return true; } } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    return true;
  } catch { return false; }
}

function rarityClass(r) {
  let v = typeof r === "number" ? r : parseFloat(r);
  if (Number.isNaN(v)) return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  if (v > 100) v = v / 10;
  if (v < 2) return "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 ring-1 ring-rose-500/30";
  if (v < 10) return "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 ring-1 ring-purple-500/30";
  if (v < 25) return "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 ring-1 ring-blue-500/30";
  return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
}

const fmtRarity = (r) => {
  let v = typeof r === "number" ? r : parseFloat(r);
  if (Number.isNaN(v)) return "";
  if (v > 100) v = v / 10;
  return v + "%";
};

function preloadImages(urls) { urls.filter(Boolean).forEach((url) => { const img = new Image(); img.src = url; }); }

const haptic = (style = "light") => {
  try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style); } catch {}
};

// ─── LOTTIE COMPONENT ───────────────────────────────────────────────────────
let _lottiePromise = null;
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

function LottieGift({ src, poster, size = 96, radius = 18 }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    if (!src) { setFailed(true); return; }
    let anim, cancelled = false;
    setFailed(false); setReady(false);
    (async () => {
      try {
        const lottie = await loadLottie();
        const res = await fetch(src);
        if (!res.ok) throw new Error("no anim");
        const data = await res.json();
        if (cancelled || !ref.current) return;
        anim = lottie.loadAnimation({ container: ref.current, renderer: "svg", loop: true, autoplay: true, animationData: data });
        setReady(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; try { anim?.destroy(); } catch {} };
  }, [src]);

  return (
    <div style={{ width: size, height: size, borderRadius: radius }} className="relative overflow-hidden bg-black/5 dark:bg-white/5 shrink-0 flex items-center justify-center">
      {poster && (
        <img src={poster} alt="" loading="eager" decoding="async"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          style={{ opacity: ready ? 0 : 1 }}
          onError={(e) => { e.target.style.opacity = 0; }} />
      )}
      {!failed && <div ref={ref} className="absolute inset-0 transition-opacity duration-500" style={{ opacity: ready ? 1 : 0 }} />}
      {failed && !poster && <div className="w-8 h-8 rounded-full border-2 border-zinc-300 dark:border-zinc-700 border-t-transparent animate-spin" />}
    </div>
  );
}

// ─── TRANSLATIONS ───────────────────────────────────────────────────────────
const T = {
  EN: {
    scout_tab: "Scout", results_tab: "Results", alerts_tab: "Alerts", saved_tab: "Saved", profile_tab: "Profile",
    sort_low: "Lowest", sort_high: "Highest", load_more: "Load more", price_range: "Price range", min_label: "Min", max_label: "Max", apply_filter: "Apply", results_empty_title: "No results yet", results_empty_sub: "Search a gift in Scout to see listings here.", showing_n: "Showing {n}", gate_a: "GiftTrove isn't available for public use yet. Reach out to ", gate_link: "majek", gate_b: " for an access code.", gate_checking: "Checking access…", gate_code_ph: "ACCESS CODE", gate_unlock: "Unlock", gate_admin: "Admins are let in automatically.",
    fastest_way: "The fastest way to find any Telegram Gift",
    gift_name: "Gift Name", specific_id: "Specific ID", optional: "(Optional)",
    marketplaces: "Marketplaces", attributes: "Attributes", model: "Model", backdrop: "Backdrop", symbol: "Symbol",
    scout_gift: "Scout Gift", results: "Results", found: "found",
    scouting_title: "Scouting marketplaces…", scouting_sub: "Finding gems so you don't have to",
    no_results: "No live listings matched your filters.", try_again: "Try again",
    offline_title: "Live data is offline", offline_sub: "Couldn't reach the server. Pull to refresh or try again.",
    select_gift_first: "Select a gift collection first to see its",
    no_alerts: "No alerts yet", alerts_hint: "Add a gift to your watchlist and get pinged when it lists below your price.",
    add_alert: "Add Watch Alert", watchlist: "Watchlist",
    no_saved: "No gifts saved yet.",
    community: "Community", support: "Contact Support", comm_chat: "Community Chat", comm_channel: "Community Channel",
    inside_majek: "Inside Majek", gifttrove_otc: "GiftTrove OTC",
    support_builder: "Support the Builder", donate: "Donate",
    donate_desc: "GiftTrove was created free. Kindly input the amount of GRAM you'd like to donate.",
    amount_ton: "Amount (GRAM)", verify_tx: "Verify Transaction", tx_id: "Transaction ID",
    thank_you: "Thank you for your generous support!",
    referrals: "Referrals", copy_ref: "Copy Referral Link", ref_count: "Referral Count",
    any: "Any", rarity: "Rarity", language: "Language",
    wallet_redirect: "You'll be redirected to {w} with the address and amount pre-filled — just approve.",
    tg_copy_note: "Telegram Wallet has no transfer link. Tap below to copy the address, then send {amt} GRAM from @wallet.",
    copy_address: "Copy Address", address_copied: "Address copied — send from @wallet",
    listed_value: "Listed Value", buy_now: "Buy / View", save_gift: "Save Gift", remove_saved: "Remove Saved",
    floor: "Floor", view_on: "View on Telegram",
  }
};

// ─── STYLES & KEYFRAMES (The "Wild" Custom Animations) ──────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  :root { --tg-blue: #007aff; }
  .dark { --tg-blue: #0a84ff; color-scheme: dark; }

  body {
    font-family: 'Plus Jakarta Sans', sans-serif;
    overscroll-behavior: none;
    -webkit-tap-highlight-color: transparent;
  }

  /* Smooth scroll hiding */
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  /* Custom Glow/Mesh Background */
  .mesh-bg {
    position: fixed; inset: 0; z-index: -2; pointer-events: none;
    background-color: #f8fafc; transition: background-color 0.5s;
    overflow: hidden;
  }
  .dark .mesh-bg { background-color: #000; }
  
  .mesh-blob {
    position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.6;
    animation: floatBlob 20s infinite alternate ease-in-out;
  }
  .mesh-blob-1 { top: -10%; left: -10%; width: 50vw; height: 50vw; background: rgba(56, 189, 248, 0.3); animation-delay: 0s; }
  .mesh-blob-2 { bottom: -10%; right: -10%; width: 60vw; height: 60vw; background: rgba(129, 140, 248, 0.2); animation-delay: -5s; }
  .dark .mesh-blob-1 { background: rgba(2, 132, 199, 0.2); }
  .dark .mesh-blob-2 { background: rgba(79, 70, 229, 0.15); }

  @keyframes floatBlob {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(10%, 15%) scale(1.1); }
  }

  /* Glassmorphism Utilities */
  .glass-panel {
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.5);
  }
  .dark .glass-panel {
    background: rgba(24, 24, 27, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .glass-input {
    background: rgba(0, 0, 0, 0.03);
    border: 1px solid transparent;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .dark .glass-input { background: rgba(255, 255, 255, 0.05); }
  .glass-input:focus {
    background: rgba(255, 255, 255, 0.8);
    border-color: var(--tg-blue);
    box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.1);
  }
  .dark .glass-input:focus {
    background: rgba(0, 0, 0, 0.4);
    box-shadow: 0 0 0 4px rgba(10, 132, 255, 0.15);
  }

  /* Custom Animations */
  .animate-spring { transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
  .active-scale:active { transform: scale(0.96); }

  .shimmer { position: relative; overflow: hidden; }
  .shimmer::after {
    content: ""; position: absolute; inset: 0; transform: translateX(-100%);
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    animation: shimmerSlide 1.5s infinite;
  }
  .dark .shimmer::after { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent); }
  @keyframes shimmerSlide { 100% { transform: translateX(100%); } }

  /* Tab Bar Indicator */
  .tab-indicator {
    position: absolute; top: 5px; bottom: 5px; border-radius: 9999px;
    background: rgba(0, 122, 255, 0.1); border: 1px solid rgba(0, 122, 255, 0.2);
    transition: left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .dark .tab-indicator { background: rgba(10, 132, 255, 0.15); border-color: rgba(10, 132, 255, 0.25); }

  /* Floating Gifts Animation */
  .void-gift {
    position: absolute; opacity: 0.15; filter: blur(1px); border-radius: 16px; object-fit: cover;
    animation: voidFloat linear infinite; pointer-events: none;
  }
  @media (min-width: 768px) { .void-gift { pointer-events: auto; cursor: pointer; transition: opacity .3s; } .void-gift:hover { opacity: 0.4; filter: blur(0); } }
  @keyframes voidFloat {
    0% { transform: translateY(10vh) translateX(0) rotate(0deg); }
    50% { transform: translateY(-10vh) translateX(20px) rotate(15deg); }
    100% { transform: translateY(10vh) translateX(0) rotate(0deg); }
  }

  /* Splash Screen Core */
  .splash-enter { animation: splashIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
  @keyframes splashIn {
    0% { opacity: 0; transform: scale(0.9) translateY(20px); filter: blur(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
  }
  .splash-pulse { animation: splashGlow 3s ease-in-out infinite alternate; }
  @keyframes splashGlow {
    0% { box-shadow: 0 0 40px rgba(0,122,255,0.2); }
    100% { box-shadow: 0 0 80px rgba(0,122,255,0.5); }
  }
`;

// ─── LAUNCH SPLASH ──────────────────────────────────────────────────────────
function LaunchLoader({ onDone }) {
  const [leaving, setLeaving] = useState(false);
  const [gifts, setGifts] = useState([]);

  useEffect(() => {
    let alive = true;
    api("/api/featured").then((d) => { if (alive && d?.gifts?.length) setGifts(d.gifts.slice(0, 3)); }).catch(() => {});
    const t1 = setTimeout(() => setLeaving(true), 2400);
    const t2 = setTimeout(() => onDone?.(), 2800);
    return () => { alive = false; clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  const hero = gifts[0];
  const left = gifts[1];
  const right = gifts[2];

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500 bg-slate-50 dark:bg-black ${leaving ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
      <div className="absolute w-[300px] h-[300px] bg-blue-500/20 dark:bg-blue-500/30 blur-[80px] rounded-full animate-pulse" />
      
      <div className="splash-enter splash-pulse relative z-10 flex flex-col items-center gap-6 p-10 rounded-[40px] glass-panel shadow-2xl">
        <div className="flex items-center justify-center gap-4 h-[140px]">
          <div className="w-[84px] h-[84px] rounded-2xl glass-panel shadow-lg flex items-center justify-center shrink-0 -rotate-6 translate-y-2 opacity-90">
            {left ? <LottieGift src={left.animation} poster={left.image} size={74} radius={14} /> : <div className="w-full h-full rounded-2xl bg-black/5 dark:bg-white/5 shimmer" />}
          </div>
          <div className="w-[130px] h-[130px] rounded-[24px] glass-panel shadow-xl flex items-center justify-center shrink-0 z-10 animate-bounce" style={{ animationDuration: '3s' }}>
            {hero ? <LottieGift src={hero.animation} poster={hero.image} size={118} radius={20} /> : <div className="w-full h-full rounded-[24px] bg-black/5 dark:bg-white/5 shimmer" />}
          </div>
          <div className="w-[84px] h-[84px] rounded-2xl glass-panel shadow-lg flex items-center justify-center shrink-0 rotate-6 translate-y-2 opacity-90">
            {right ? <LottieGift src={right.animation} poster={right.image} size={74} radius={14} /> : <div className="w-full h-full rounded-2xl bg-black/5 dark:bg-white/5 shimmer" />}
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            GIFT<img src={LOGO_URL} alt="" className="w-8 h-8 object-contain" />TROVE
          </div>
          <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 tracking-wide mt-1 uppercase">unearthing the rarest gifts</div>
        </div>

        <div className="w-32 h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden relative">
          <div className="absolute top-0 left-0 h-full w-1/2 bg-blue-500 rounded-full" style={{ animation: "shimmerSlide 1.2s infinite ease-in-out" }} />
        </div>
      </div>
    </div>
  );
}

// ─── PROMO BANNER ───────────────────────────────────────────────────────────
const PROMO_SLIDES = [
  { img: "https://i.ibb.co/d08zfZmg/Inria-Serif-2.png", url: "https://t.me/gifttrove" },
  { img: "https://i.ibb.co/Rk1hB0vS/Inria-Serif.png", url: "https://t.me/troveotc" },
  { img: "https://i.ibb.co/Kp2tJtQT/MGGA-4.png", url: "https://t.me/spinmibot?startapp=7608551523" },
  { img: "https://i.ibb.co/v5NvzS6/MGGA-3.png", url: "https://t.me/hotontgbot/app?startapp=UQC61-XV5zwCn-7eHbciHh8qR_3k6-6Bq458qrUkGhFoYxPo" },
  { img: "https://i.ibb.co/RkkHPgSV/MGGA-5.png", url: "https://t.me/insidemajek" },
];

function PromoBanner() {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    preloadImages(PROMO_SLIDES.map((s) => s.img));
    const timer = setInterval(() => setCurrent((p) => (p + 1) % PROMO_SLIDES.length), 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full aspect-[21/9] md:aspect-[30/9] rounded-3xl overflow-hidden cursor-pointer shadow-xl mb-8 group active-scale animate-spring" onClick={() => safeOpen(PROMO_SLIDES[current].url)}>
      {PROMO_SLIDES.map((slide, i) => (
        <img key={i} src={slide.img} alt="" fetchpriority={i===0?"high":"low"}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out ${i === current ? "opacity-100 scale-100 z-10" : "opacity-0 scale-105 z-0"}`} />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 z-20 pointer-events-none" />
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
        {PROMO_SLIDES.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "w-6 bg-white" : "w-1.5 bg-white/50"}`} />
        ))}
      </div>
      {/* Decorative Glows */}
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-rose-500/40 rounded-full blur-2xl z-20 animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/40 rounded-full blur-2xl z-20 animate-pulse" style={{ animationDuration: '6s' }} />
    </div>
  );
}

// ─── FLOATING BACKGROUND GIFTS ──────────────────────────────────────────────
function VoidGifts({ images, onPick }) {
  const items = useMemo(() => {
    const pics = (images || []).filter(Boolean).slice(0, 6);
    return pics.map((src, i) => ({
      src, size: 60 + ((i * 17) % 46), left: [6, 78, 30, 60, 14, 86][i % 6], top: [16, 26, 64, 72, 44, 8][i % 6],
      dur: 25 + ((i * 7) % 16), delay: -(i * 5), url: ["https://t.me/gifttrove", "https://t.me/troveotc"][i % 2],
    }));
  }, [images]);
  if (!items.length) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden" aria-hidden="true">
      {items.map((it, i) => (
        <img key={i} src={it.src} alt="" className="void-gift" onClick={() => onPick?.(it.url)}
          style={{ width: it.size, height: it.size, left: `${it.left}vw`, top: `${it.top}vh`, animationDuration: `${it.dur}s`, animationDelay: `${it.delay}s` }}
          onError={(e) => { e.target.style.display = "none"; }} />
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  MAIN APP
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null;
  const tgUser = tg?.initDataUnsafe?.user || { id: 12345678, first_name: "Scout" };

  const [theme, setTheme] = useState(() => localStorage.getItem("gt_theme") || "light");
  const [lang, setLang] = useState(() => localStorage.getItem("gt_lang") || "EN");
  const t = T[lang] || T.EN;

  const [booting, setBooting] = useState(true);
  const [savedGifts, setSavedGifts] = useState(() => { try { return JSON.parse(localStorage.getItem("gt_saved") || "[]"); } catch { return []; } });
  const refKey = `gt_ref_count_${tgUser?.id || "guest"}`;
  const [referralCount, setReferralCount] = useState(() => parseInt(localStorage.getItem(refKey) || "0", 10));

  const [activeTab, setActiveTab] = useState("scout");
  const [toast, setToast] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isScouting, setIsScouting] = useState(false);
  const [activeSheet, setActiveSheet] = useState(null);
  const [selectedGift, setSelectedGift] = useState(null);

  const [sortBy, setSortBy] = useState("price_asc");
  const [nextOffset, setNextOffset] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const lastSearch = useRef(null);

  const [access, setAccess] = useState("checking");
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState(false);

  const [collections, setCollections] = useState([]);
  const [attrs, setAttrs] = useState({ models: [], symbols: [], backdrops: [] });

  const [giftQuery, setGiftQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [giftId, setGiftId] = useState("");
  const [selectedMarkets, setSelectedMarkets] = useState(["All"]);
  const [selectedModel, setSelectedModel] = useState("Any");
  const [selectedBackdrop, setSelectedBackdrop] = useState("Any");
  const [selectedSymbol, setSelectedSymbol] = useState("Any");

  const [results, setResults] = useState([]);
  const [scoutError, setScoutError] = useState(null);

  const [donateStep, setDonateStep] = useState(1);
  const [donateAmount, setDonateAmount] = useState("");
  const [donateWallet, setDonateWallet] = useState("TonKeeper");
  const [donateTx, setDonateTx] = useState("");

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);
  const touchStartY = useRef(0);
  const contentRef = useRef(null);

  const tabRefs = useRef({});
  const tabBarRef = useRef(null);
  const [pill, setPill] = useState({ left: 5, width: 0 });

  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;

  const collectionNames = collections.length ? collections.map((c) => c.name) : FALLBACK_COLLECTIONS;
  const selectedCollection = collections.find((c) => c.name === giftQuery);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };
  
  const toggleTheme = () => {
    haptic();
    setTheme((p) => (p === "dark" ? "light" : "dark"));
  };

  useEffect(() => { try { tg?.ready?.(); tg?.expand?.(); } catch {} }, [tg]);

  useEffect(() => {
    localStorage.setItem("gt_theme", theme);
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  useEffect(() => { localStorage.setItem("gt_lang", lang); }, [lang]);
  useEffect(() => { localStorage.setItem("gt_saved", JSON.stringify(savedGifts)); }, [savedGifts]);
  useEffect(() => { localStorage.setItem(refKey, String(referralCount)); }, [referralCount, refKey]);

  useEffect(() => {
    let alive = true;
    api("/api/collections").then((d) => { if (alive && d?.collections?.length) setCollections(d.collections); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    const uid = tgUser?.id || "";
    const savedCode = localStorage.getItem("gt_code") || "";
    api("/api/access?uid=" + encodeURIComponent(uid) + "&code=" + encodeURIComponent(savedCode))
      .then((d) => { if (alive) setAccess(d?.ok ? "granted" : "locked"); })
      .catch(() => { if (alive) setAccess("locked"); });
    return () => { alive = false; };
  }, [tgUser?.id]);

  const submitCode = async () => {
    const code = codeInput.trim();
    if (!code) return;
    haptic("medium");
    try {
      const d = await api("/api/access?uid=" + encodeURIComponent(tgUser?.id || "") + "&code=" + encodeURIComponent(code));
      if (d?.ok) {
        localStorage.setItem("gt_code", code);
        setCodeError(false); setAccess("granted");
      } else {
        setCodeError(true); haptic("heavy"); setTimeout(() => setCodeError(false), 600);
      }
    } catch {
      setCodeError(true); setTimeout(() => setCodeError(false), 600);
    }
  };

  useEffect(() => {
    setSelectedModel("Any"); setSelectedSymbol("Any"); setSelectedBackdrop("Any");
    const col = collections.find((c) => c.name === giftQuery);
    if (!col) { setAttrs({ models: [], symbols: [], backdrops: [] }); return; }
    let alive = true;
    api("/api/attributes?gift_id=" + encodeURIComponent(col.gift_id))
      .then((d) => { if (alive && d) setAttrs({ models: d.models || [], symbols: d.symbols || [], backdrops: d.backdrops || [] }); })
      .catch(() => setAttrs({ models: [], symbols: [], backdrops: [] }));
    return () => { alive = false; };
  }, [giftQuery, collections]);

  useEffect(() => {
    api("/api/referrals?uid=" + encodeURIComponent(tgUser?.id || "guest"))
      .then((d) => { if (typeof d?.count === "number") { setReferralCount(d.count); localStorage.setItem(refKey, String(d.count)); } })
      .catch(() => {});

    const ref = tg?.initDataUnsafe?.start_param;
    if (ref && /^\d+$/.test(ref) && String(ref) !== String(tgUser?.id)) {
      api("/api/referral", { method: "POST", body: { uid: ref, by: tgUser?.id } }).catch(() => {});
    }
  }, [tg?.initDataUnsafe?.start_param, tgUser?.id]);

  useEffect(() => {
    const onResize = () => {
      const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      setKeyboardOpen(vh < window.screen.height * 0.7);
    };
    const vv = window.visualViewport;
    if (vv) { vv.addEventListener("resize", onResize); return () => vv.removeEventListener("resize", onResize); }
    window.addEventListener("resize", onResize); return () => window.removeEventListener("resize", onResize);
  }, []);

  useLayoutEffect(() => {
    let raf, t1;
    const measure = () => {
      const el = tabRefs.current[activeTab];
      const bar = tabBarRef.current;
      if (el && bar) {
        const er = el.getBoundingClientRect();
        const br = bar.getBoundingClientRect();
        if (er.width > 0) setPill({ left: er.left - br.left, width: er.width });
      }
    };
    measure();
    raf = requestAnimationFrame(measure);
    t1 = setTimeout(measure, 150);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && tabBarRef.current) ro.observe(tabBarRef.current);
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(raf); clearTimeout(t1); ro?.disconnect(); window.removeEventListener("resize", measure); };
  }, [activeTab, lang, keyboardOpen, booting]);

  const handleTouchStart = (e) => { if (contentRef.current?.scrollTop === 0) touchStartY.current = e.touches[0].clientY; };
  const handleTouchMove = (e) => {
    if (contentRef.current?.scrollTop === 0) {
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy > 0) setPullY(Math.min(dy, 100));
    }
  };
  const handleTouchEnd = () => {
    if (pullY > 60) {
      setIsRefreshing(true); haptic();
      api("/api/collections").then((d) => { if (d?.collections?.length) setCollections(d.collections); }).catch(() => {});
      setTimeout(() => { setIsRefreshing(false); setPullY(0); showToast("Refreshed!"); }, 1200);
    } else setPullY(0);
  };

  const handleMarketToggle = (m) => {
    haptic();
    if (m === "All") { setSelectedMarkets(["All"]); return; }
    let nm = selectedMarkets.filter((x) => x !== "All");
    if (nm.includes(m)) { nm = nm.filter((x) => x !== m); if (!nm.length) nm = ["All"]; }
    else nm.push(m);
    setSelectedMarkets(nm);
  };

  const buildSearchParams = (sort, offset) => {
    const col = collections.find((c) => c.name === giftQuery);
    const p = new URLSearchParams();
    if (giftQuery) p.set("gift", giftQuery);
    if (col?.gift_id) p.set("gift_id", col.gift_id);
    if (col?.slug) p.set("slug", col.slug);
    if (giftId) p.set("num", giftId);
    if (selectedModel !== "Any") p.set("model", selectedModel);
    if (selectedSymbol !== "Any") p.set("symbol", selectedSymbol);
    if (selectedBackdrop !== "Any") p.set("backdrop", selectedBackdrop);
    if (!selectedMarkets.includes("All")) p.set("markets", selectedMarkets.join(","));
    if (tgUser?.id) p.set("uid", tgUser.id);
    p.set("sort", sort || sortBy); p.set("limit", "100");
    if (minPrice) p.set("min_price", minPrice);
    if (maxPrice) p.set("max_price", maxPrice);
    if (offset) p.set("offset", offset);
    return p;
  };

  const handleScout = async () => {
    haptic("medium"); setScoutError(null); setHasSearched(true); setResults([]); setNextOffset(""); setIsScouting(true); setActiveTab("results");
    const started = Date.now();
    try {
      const p = buildSearchParams(sortBy, ""); lastSearch.current = { sort: sortBy };
      const d = await api("/api/search?" + p.toString(), { timeout: 20000 });
      setResults(Array.isArray(d?.results) ? d.results : []); setNextOffset(d?.next_offset || "");
    } catch { setScoutError("offline"); setResults([]); }
    const elapsed = Date.now() - started;
    setTimeout(() => { setIsScouting(false); setIsSearching(true); }, Math.max(0, 800 - elapsed));
  };

  const loadMore = async () => {
    if (!nextOffset || loadingMore) return;
    setLoadingMore(true); haptic();
    try {
      const p = buildSearchParams(sortBy, nextOffset);
      const d = await api("/api/search?" + p.toString(), { timeout: 20000 });
      const more = Array.isArray(d?.results) ? d.results : [];
      setResults((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...more.filter((x) => !seen.has(x.id))];
      });
      setNextOffset(d?.next_offset || "");
    } catch {}
    setLoadingMore(false);
  };

  const reSort = async (sort) => {
    if (sort === sortBy) return;
    setSortBy(sort); if (!hasSearched) return;
    haptic(); setIsScouting(true); setResults([]); setNextOffset("");
    try {
      const p = buildSearchParams(sort, "");
      const d = await api("/api/search?" + p.toString(), { timeout: 20000 });
      setResults(Array.isArray(d?.results) ? d.results : []); setNextOffset(d?.next_offset || "");
    } catch { setScoutError("offline"); }
    setIsScouting(false);
  };

  const isSavedGift = (g) => savedGifts.some((s) => s.id === g.id);
  const toggleSave = (g) => {
    haptic();
    if (isSavedGift(g)) { setSavedGifts(savedGifts.filter((s) => s.id !== g.id)); showToast(t.remove_saved); }
    else { setSavedGifts([...savedGifts, g]); showToast(t.save_gift + " ✓"); }
  };

  const handleBuy = (e, item) => { e?.stopPropagation?.(); haptic(); const url = marketplaceUrl(item); if (!url) { showToast(t.no_results); return; } safeOpen(url); };
  const copyReferral = () => { const link = REF_BOT_LINK + (tgUser?.id || "demo"); if (copyText(link)) showToast(t.copy_ref + " ✓"); };

  const executeDonate = () => {
    haptic("medium");
    if (donateWallet === "Tg Wallet") { if (copyText(DONATE_ADDRESS)) showToast(t.address_copied); setDonateStep(2); return; }
    const url = walletUrl(donateWallet, DONATE_ADDRESS, donateAmount, DONATE_COMMENT);
    if (url) safeOpen(url); setDonateStep(2);
  };

  // ─── CARD RENDERER ────────────────────────────────────────────────────────
  const renderGiftCard = (item) => {
    const poster = item.image || giftImage(item.slug, item.num);
    const anim = giftAnimation(item.slug, item.num);
    const saved = isSavedGift(item);
    const dotHex = item.backdropHex;
    return (
      <div key={item.id} className="relative flex flex-col p-3 rounded-[24px] glass-panel transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer group animate-spring" onClick={() => { haptic(); setSelectedGift(item); setActiveSheet("gift_details"); }}>
        <div className="relative flex items-center justify-center py-4 mb-3 rounded-[18px] bg-slate-100/50 dark:bg-zinc-800/50 overflow-hidden">
          {dotHex && <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 50% 50%, ${dotHex}, transparent 70%)` }} />}
          <LottieGift src={anim} poster={poster} size={110} radius={16} />
          <button className={`absolute top-2 right-2 p-2 rounded-full glass-panel active-scale transition-colors ${saved ? "text-blue-500 bg-white dark:bg-zinc-800" : "text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300"}`} onClick={(e) => { e.stopPropagation(); toggleSave(item); }}>
            <Bookmark size={18} fill={saved ? "currentColor" : "none"} strokeWidth={saved ? 0 : 2} />
          </button>
        </div>
        <div className="px-1 flex-1 flex flex-col">
          <div className="text-[15px] font-bold text-slate-900 dark:text-white leading-tight mb-1 line-clamp-1">{item.name}{item.num != null ? ` #${item.num}` : ""}</div>
          <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500 dark:text-zinc-400 mb-2">
            {dotHex && <span className="w-2.5 h-2.5 rounded-full border border-black/10 dark:border-white/10 shrink-0" style={{ background: dotHex }} />}
            <span className="truncate">{item.market}{item.backdrop ? ` • ${item.backdrop}` : ""}</span>
          </div>
          {item.model && (
            <div className="flex items-center flex-wrap gap-1 mb-3">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${rarityClass(item.modelRarity)}`}>{item.model}</span>
              {item.modelRarity != null && <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">{fmtRarity(item.modelRarity)}</span>}
            </div>
          )}
          <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-slate-200/50 dark:border-zinc-700/50">
            <div className="text-[16px] font-black text-blue-500 truncate">{fmtPrice(item) || t.view_on}</div>
            <button className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-blue-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] active-scale shrink-0" onClick={(e) => handleBuy(e, item)}>{t.buy_now}</button>
          </div>
        </div>
      </div>
    );
  };

  // ─── TABS ─────────────────────────────────────────────────────────────────
  const tabs = [
    { id: "scout", label: t.scout_tab, Icon: Search },
    { id: "results", label: t.results_tab, Icon: Copy },
    { id: "saved", label: t.saved_tab, Icon: Bookmark },
    { id: "profile", label: t.profile_tab, Icon: User },
  ];

  // ─── VIEWS ────────────────────────────────────────────────────────────────
  const renderScout = (desktop = false) => {
    const filteredGifts = collectionNames.filter((g) => g.toLowerCase().includes(giftQuery.toLowerCase()));
    return (
      <div className="animate-spring translate-y-0 opacity-100 flex flex-col gap-6 pb-6">
        <PromoBanner />
        <div className={`font-black text-slate-900 dark:text-white tracking-tighter leading-[1.1] ${desktop ? "text-5xl mb-4" : "text-3xl"}`}>
          {t.fastest_way} <img src={LOGO_URL} alt="" className="inline-block h-[0.9em] w-auto align-[-0.1em] rounded-[10px] shadow-sm ml-1" />
        </div>

        {/* Bento Grid for Search Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-3 p-4 rounded-[28px] glass-panel">
            <div className="text-[14px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide px-1">{t.gift_name}</div>
            <div className="relative z-20">
              <input className="w-full px-5 py-4 rounded-[20px] glass-input text-lg font-bold text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600" placeholder="e.g. Plush Pepe" value={giftQuery} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} onChange={(e) => setGiftQuery(e.target.value)} />
              {showSuggestions && giftQuery && filteredGifts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-2xl rounded-[20px] shadow-2xl border border-slate-200/50 dark:border-zinc-700/50 overflow-hidden max-h-[280px] overflow-y-auto z-50">
                  {filteredGifts.slice(0, 12).map((g) => {
                    const col = collections.find((c) => c.name === g);
                    return (
                      <div key={g} className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-zinc-700/50 last:border-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-700/50 active:bg-slate-100 dark:active:bg-zinc-600 font-bold text-slate-800 dark:text-zinc-200" onMouseDown={(e) => { e.preventDefault(); setGiftQuery(g); setShowSuggestions(false); }} onTouchEnd={(e) => { e.preventDefault(); setGiftQuery(g); setShowSuggestions(false); }}>
                        {col?.preview ? <img src={col.preview} alt="" className="w-9 h-9 rounded-[10px] bg-slate-100 dark:bg-zinc-800 object-cover" /> : <div className="w-9 h-9 rounded-[10px] bg-slate-100 dark:bg-zinc-800" />}
                        {g}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 p-4 rounded-[28px] glass-panel">
            <div className="text-[14px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide px-1">{t.specific_id} <span className="font-medium normal-case opacity-70">{t.optional}</span></div>
            <input type="number" inputMode="numeric" className="w-full px-5 py-4 rounded-[20px] glass-input text-lg font-bold text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600" placeholder="#12345" value={giftId} onChange={(e) => setGiftId(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-3 p-5 rounded-[28px] glass-panel">
          <div className="text-[14px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">{t.marketplaces}</div>
          <div className="flex flex-wrap gap-2.5">
            {MARKETPLACES.map((m) => (
              <button key={m} className={`px-4 py-2.5 rounded-full text-sm font-bold transition-all duration-300 active-scale ${selectedMarkets.includes(m) ? "bg-slate-900 text-white dark:bg-white dark:text-black shadow-lg" : "bg-slate-200/50 text-slate-600 dark:bg-zinc-800/50 dark:text-zinc-300 hover:bg-slate-300/50 dark:hover:bg-zinc-700/50"}`} onClick={() => handleMarketToggle(m)}>{m}</button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 p-5 rounded-[28px] glass-panel">
          <div className="text-[14px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-1">{t.attributes}</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[ 
              { id: "model", label: t.model, val: selectedModel, action: () => setActiveSheet("model") },
              { id: "backdrop", label: t.backdrop, val: selectedBackdrop, action: () => setActiveSheet("backdrop") },
              { id: "symbol", label: t.symbol, val: selectedSymbol, action: () => setActiveSheet("symbol") }
            ].map((attr) => (
              <button key={attr.id} disabled={!selectedCollection} onClick={attr.action} className="flex justify-between items-center px-4 py-4 rounded-[20px] bg-white/50 dark:bg-zinc-800/50 border border-slate-200/50 dark:border-zinc-700/50 active-scale transition-all disabled:opacity-40 disabled:grayscale group">
                <span className="font-semibold text-slate-700 dark:text-zinc-300">{attr.label}</span>
                <div className="flex items-center gap-1.5 font-bold text-blue-500">
                  {attr.id === "backdrop" && attrs.backdrops.find((x) => x.name === attr.val)?.hex && <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ background: attrs.backdrops.find((x) => x.name === attr.val)?.hex }} />}
                  <span className="truncate max-w-[80px]">{attr.val}</span>
                  <ChevronRight size={18} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <button className="w-full py-5 rounded-[28px] bg-blue-500 text-white text-xl font-black shadow-[0_8px_30px_rgba(59,130,246,0.4)] transition-all duration-300 active-scale disabled:opacity-50 disabled:grayscale mt-2" onClick={handleScout} disabled={!giftQuery}>{t.scout_gift}</button>
      </div>
    );
  };

  const renderResults = (desktop = false) => {
    if (isScouting) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-spring">
          <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin mb-8 shadow-[0_0_40px_rgba(59,130,246,0.5)]" />
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">{t.scouting_title}</div>
          <div className="text-slate-500 dark:text-zinc-400 font-medium mb-8">{t.scouting_sub}</div>
          <div className="flex flex-wrap justify-center gap-2 max-w-sm">
            {["Telegram", "GetGems", "Portals", "MRKT", "Tonnel"].map((m, i) => (
              <div key={m} className="px-4 py-1.5 rounded-full text-xs font-bold bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}>{m}</div>
            ))}
          </div>
        </div>
      );
    }
    if (scoutError || (!hasSearched || results.length === 0)) {
      return (
        <div className="animate-spring">
          <div className={`font-black tracking-tight text-slate-900 dark:text-white mb-6 ${desktop ? "text-4xl" : "text-3xl"}`}>{t.results_tab}</div>
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center glass-panel rounded-[32px]">
            <div className="w-20 h-20 rounded-[24px] bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 dark:text-zinc-500 mb-6 shadow-inner">
              {scoutError ? <Globe size={32} /> : <Search size={32} />}
            </div>
            <div className="text-xl font-bold text-slate-800 dark:text-zinc-200 mb-2">{scoutError ? t.offline_title : (hasSearched ? t.no_results : t.results_empty_title)}</div>
            <div className="text-slate-500 dark:text-zinc-400 font-medium mb-8 max-w-xs">{scoutError ? t.offline_sub : (hasSearched ? "" : t.results_empty_sub)}</div>
            <button className="px-8 py-4 rounded-[20px] bg-blue-500 text-white font-bold shadow-[0_8px_20px_rgba(59,130,246,0.3)] active-scale transition-all" onClick={() => scoutError ? handleScout() : setActiveTab("scout")}>{scoutError ? t.try_again : t.scout_tab}</button>
          </div>
        </div>
      );
    }
    return (
      <div className="animate-spring flex flex-col gap-5 pb-6">
        <div className="flex items-end justify-between px-1">
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t.results}</div>
          <div className="text-sm font-bold text-slate-500 dark:text-zinc-400 bg-slate-200/50 dark:bg-zinc-800/50 px-3 py-1 rounded-full">{t.showing_n.replace("{n}", results.length)}</div>
        </div>

        {/* Filters Bento */}
        <div className="flex flex-col sm:flex-row gap-3 p-3 rounded-[24px] glass-panel">
          <div className="flex bg-slate-200/50 dark:bg-zinc-800/50 p-1 rounded-[16px]">
            <button className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[12px] text-sm font-bold transition-all ${sortBy === "price_asc" ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-zinc-400"}`} onClick={() => reSort("price_asc")}><ArrowUp size={16} /> {t.sort_low}</button>
            <button className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[12px] text-sm font-bold transition-all ${sortBy === "price_desc" ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-zinc-400"}`} onClick={() => reSort("price_desc")}><ArrowDown size={16} /> {t.sort_high}</button>
          </div>
          <div className="flex flex-1 items-center gap-2 bg-slate-200/50 dark:bg-zinc-800/50 p-1 rounded-[16px]">
            <input className="w-full bg-white dark:bg-zinc-700 text-slate-900 dark:text-white px-4 py-2.5 rounded-[12px] outline-none text-sm font-bold placeholder:text-slate-400 dark:placeholder:text-zinc-500" placeholder={t.min_label} value={minPrice} onChange={(e) => setMinPrice(e.target.value.replace(/[^\d.]/g, ""))} />
            <span className="text-slate-400 dark:text-zinc-500 font-bold">-</span>
            <input className="w-full bg-white dark:bg-zinc-700 text-slate-900 dark:text-white px-4 py-2.5 rounded-[12px] outline-none text-sm font-bold placeholder:text-slate-400 dark:placeholder:text-zinc-500" placeholder={t.max_label} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d.]/g, ""))} />
            <button className="bg-blue-500 text-white px-4 py-2.5 rounded-[12px] font-bold text-sm active-scale transition-transform shadow-md" onClick={handleScout}><SlidersHorizontal size={18} /></button>
          </div>
        </div>

        <div className={`grid gap-4 ${desktop ? "grid-cols-3" : "grid-cols-2"}`}>
          {results.map((item) => renderGiftCard(item))}
        </div>

        {nextOffset && (
          <button className="w-full py-5 mt-2 rounded-[24px] glass-panel text-slate-700 dark:text-zinc-200 font-bold text-lg hover:bg-white/80 dark:hover:bg-zinc-800/80 active-scale transition-all flex items-center justify-center gap-2 group" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-zinc-600 border-t-blue-500 animate-spin" /> : <><RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" /> {t.load_more}</>}
          </button>
        )}
      </div>
    );
  };

  const renderSaved = (desktop = false) => (
    <div className="animate-spring flex flex-col gap-5 pb-6">
      <div className={`font-black tracking-tight text-slate-900 dark:text-white px-1 ${desktop ? "text-4xl" : "text-3xl"}`}>{t.saved_tab}</div>
      {savedGifts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center glass-panel rounded-[32px]">
          <div className="w-20 h-20 rounded-[24px] bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 dark:text-zinc-500 mb-6 shadow-inner"><Bookmark size={32} /></div>
          <div className="text-xl font-bold text-slate-800 dark:text-zinc-200">{t.no_saved}</div>
        </div>
      ) : (
        <div className={`grid gap-4 ${desktop ? "grid-cols-3" : "grid-cols-2"}`}>
          {savedGifts.map((item) => renderGiftCard(item))}
        </div>
      )}
    </div>
  );

  const renderProfile = (desktop = false) => (
    <div className="animate-spring flex flex-col gap-6 pb-6">
      <div className={`font-black tracking-tight text-slate-900 dark:text-white px-1 ${desktop ? "text-4xl" : "text-3xl"}`}>{t.profile_tab}</div>

      <div className="flex flex-col gap-4">
        <div className="text-[14px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide px-2">{t.referrals}</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-panel p-5 rounded-[28px] flex flex-col justify-between gap-4 cursor-pointer active-scale transition-transform group" onClick={copyReferral}>
            <div className="w-12 h-12 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform"><Copy size={24} /></div>
            <div className="font-bold text-slate-800 dark:text-zinc-200">{t.copy_ref}</div>
          </div>
          <div className="glass-panel p-5 rounded-[28px] flex flex-col justify-between gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-500 flex items-center justify-center"><User size={24} /></div>
            <div>
              <div className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">{t.ref_count}</div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">{referralCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="text-[14px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide px-2">{t.community}</div>
        <div className="glass-panel rounded-[28px] overflow-hidden flex flex-col">
          {[
            { icon: Globe, color: "text-indigo-500 bg-indigo-500/10", label: t.comm_channel, url: COMMUNITY.channel },
            { icon: User, color: "text-violet-500 bg-violet-500/10", label: t.inside_majek, url: COMMUNITY.insideMajek },
            { icon: Search, color: "text-blue-500 bg-blue-500/10", label: t.gifttrove_otc, url: COMMUNITY.otc },
            { icon: Heart, color: "text-emerald-500 bg-emerald-500/10", label: t.support, url: COMMUNITY.support }
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4 border-b border-slate-200/50 dark:border-zinc-700/50 last:border-0 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 active:bg-slate-100/50 dark:active:bg-zinc-700/50 transition-colors group" onClick={() => safeOpen(item.url)}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center ${item.color}`}><item.icon size={20} /></div>
                <div className="font-bold text-slate-800 dark:text-zinc-200">{item.label}</div>
              </div>
              <ChevronRight size={20} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-300 transition-colors" />
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-5 rounded-[28px] flex items-center justify-between cursor-pointer active-scale transition-transform group" onClick={() => { haptic(); setDonateStep(1); setActiveSheet("donate"); }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform"><Heart size={24} fill="currentColor" /></div>
          <div>
            <div className="font-bold text-slate-800 dark:text-zinc-200">{t.support_builder}</div>
            <div className="text-sm font-medium text-slate-500 dark:text-zinc-400">{t.donate}</div>
          </div>
        </div>
        <ChevronRight size={20} className="text-slate-400" />
      </div>
      
      <div className="text-center font-bold text-slate-400 dark:text-zinc-600 text-sm mt-4 tracking-wide">Built by @insidemajek</div>
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

  // ─── SHEETS & MODALS ──────────────────────────────────────────────────────
  const renderSheet = () => {
    if (!activeSheet) return null;

    return (
      <div className="fixed inset-0 z-[100] flex flex-col justify-end">
        <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]" onClick={() => setActiveSheet(null)} />
        <div className="relative bg-white/95 dark:bg-zinc-900/95 backdrop-blur-3xl rounded-t-[40px] shadow-[0_-20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-20px_40px_rgba(0,0,0,0.4)] p-6 pt-3 pb-[calc(24px+env(safe-area-inset-bottom,0px))] max-h-[85vh] overflow-y-auto no-scrollbar animate-[slideUp_0.4s_cubic-bezier(0.34,1.56,0.64,1)] border-t border-white/20 dark:border-white/5">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700 mx-auto mb-6 opacity-70" />

          {activeSheet === "gift_details" && selectedGift && (
            <div className="flex flex-col animate-[fadeInUp_0.4s_ease-out]">
              <div className="flex flex-col items-center gap-4 mb-6 relative">
                {selectedGift.backdropHex && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 blur-3xl opacity-30 rounded-full" style={{ background: selectedGift.backdropHex }} />}
                <LottieGift src={selectedGift.animation || giftAnimation(selectedGift.slug, selectedGift.num)} poster={selectedGift.image || giftImage(selectedGift.slug, selectedGift.num)} size={160} radius={32} />
                <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight text-center">{selectedGift.name}{selectedGift.num != null ? ` #${selectedGift.num}` : ""}</div>
                <div className="text-sm font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-4 py-1.5 rounded-full -mt-2">{selectedGift.market}</div>
              </div>

              <div className="flex flex-col bg-slate-50 dark:bg-zinc-800/50 rounded-[28px] border border-slate-100 dark:border-zinc-700/50 overflow-hidden mb-6">
                {selectedGift.model && (
                  <div className="flex justify-between items-center p-4 border-b border-slate-200/50 dark:border-zinc-700/50">
                    <span className="font-bold text-slate-500 dark:text-zinc-400">{t.model}</span>
                    <span className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">{selectedGift.model} <span className={`text-[10px] px-2 py-0.5 rounded-md ${rarityClass(selectedGift.modelRarity)}`}>{fmtRarity(selectedGift.modelRarity)}</span></span>
                  </div>
                )}
                {selectedGift.backdrop && (
                  <div className="flex justify-between items-center p-4 border-b border-slate-200/50 dark:border-zinc-700/50">
                    <span className="font-bold text-slate-500 dark:text-zinc-400">{t.backdrop}</span>
                    <span className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">{selectedGift.backdropHex && <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ background: selectedGift.backdropHex }} />}{selectedGift.backdrop}</span>
                  </div>
                )}
                {selectedGift.symbol && (
                  <div className="flex justify-between items-center p-4 border-b border-slate-200/50 dark:border-zinc-700/50">
                    <span className="font-bold text-slate-500 dark:text-zinc-400">{t.symbol}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedGift.symbol}</span>
                  </div>
                )}
                <div className="flex justify-between items-center p-4 bg-blue-500/5 dark:bg-blue-500/10">
                  <span className="font-bold text-blue-600 dark:text-blue-400">{t.listed_value}</span>
                  <span className="text-xl font-black text-blue-600 dark:text-blue-400">{fmtPrice(selectedGift) || "—"}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button className={`flex-1 py-4 rounded-[20px] font-bold text-lg border-2 active-scale transition-all ${isSavedGift(selectedGift) ? "bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300" : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white"}`} onClick={() => { toggleSave(selectedGift); setActiveSheet(null); }}>
                  {isSavedGift(selectedGift) ? t.remove_saved : t.save_gift}
                </button>
                <button className="flex-[1.5] py-4 rounded-[20px] font-bold text-lg bg-blue-500 text-white shadow-[0_8px_20px_rgba(59,130,246,0.3)] active-scale transition-all" onClick={(e) => handleBuy(e, selectedGift)}>{t.buy_now}</button>
              </div>
            </div>
          )}

          {activeSheet === "donate" && (
            <div className="flex flex-col animate-[fadeInUp_0.4s_ease-out]">
              {donateStep === 1 && (
                <>
                  <div className="text-2xl font-black text-slate-900 dark:text-white text-center tracking-tight mb-2">{t.donate}</div>
                  <div className="text-slate-500 dark:text-zinc-400 text-center font-medium mb-6 px-4">{t.donate_desc}</div>
                  <input type="number" inputMode="decimal" className="w-full px-5 py-4 mb-6 rounded-[20px] glass-input text-lg font-bold text-center text-slate-900 dark:text-white outline-none placeholder:text-slate-400" placeholder={t.amount_ton} value={donateAmount} onChange={(e) => setDonateAmount(e.target.value)} />
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {["MyTonWallet", "TonKeeper", "Tg Wallet"].map((w) => (
                      <button key={w} className={`px-5 py-3 rounded-[16px] font-bold text-sm transition-all active-scale ${donateWallet === w ? "bg-slate-900 text-white dark:bg-white dark:text-black shadow-lg" : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300"}`} onClick={() => { haptic(); setDonateWallet(w); }}>{w}</button>
                    ))}
                  </div>
                  <div className="text-xs font-bold text-slate-400 dark:text-zinc-500 text-center mb-6 leading-relaxed px-4">{donateWallet === "Tg Wallet" ? t.tg_copy_note.replace("{amt}", donateAmount || "—") : t.wallet_redirect.replace("{w}", donateWallet)}</div>
                  <button className="w-full py-4 rounded-[20px] font-bold text-lg bg-rose-500 text-white shadow-[0_8px_20px_rgba(244,63,94,0.3)] active-scale transition-all disabled:opacity-50" onClick={executeDonate} disabled={!donateAmount}>{donateWallet === "Tg Wallet" ? t.copy_address : t.donate}</button>
                </>
              )}
              {donateStep === 2 && (
                <>
                  <div className="text-2xl font-black text-slate-900 dark:text-white text-center tracking-tight mb-2">{t.verify_tx}</div>
                  <div className="text-slate-500 dark:text-zinc-400 text-center font-medium mb-6 px-4">{donateWallet === "Tg Wallet" ? t.tg_copy_note.replace("{amt}", donateAmount || "—") : "Paste your transaction hash to verify your transfer."}</div>
                  <input type="text" className="w-full px-5 py-4 mb-6 rounded-[20px] glass-input text-lg font-bold text-slate-900 dark:text-white outline-none placeholder:text-slate-400" placeholder={t.tx_id} value={donateTx} onChange={(e) => setDonateTx(e.target.value)} />
                  <button className="w-full py-4 rounded-[20px] font-bold text-lg bg-blue-500 text-white shadow-[0_8px_20px_rgba(59,130,246,0.3)] active-scale transition-all disabled:opacity-50" onClick={() => setDonateStep(3)} disabled={!donateTx}>{t.verify_tx}</button>
                </>
              )}
              {donateStep === 3 && (
                <div className="flex flex-col items-center py-8">
                  <div className="w-20 h-20 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-500 flex items-center justify-center mb-6 animate-bounce"><Heart size={40} fill="currentColor" /></div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white text-center tracking-tight mb-8">{t.thank_you}</div>
                  <button className="w-full py-4 rounded-[20px] font-bold text-lg bg-slate-900 text-white dark:bg-white dark:text-black shadow-lg active-scale transition-all" onClick={() => { setActiveSheet(null); setDonateStep(1); setDonateAmount(""); setDonateTx(""); }}>Close</button>
                </div>
              )}
            </div>
          )}

          {activeSheet === "lang" && (
            <div className="flex flex-col animate-[fadeInUp_0.4s_ease-out]">
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-6 px-2">{t.language}</div>
              <div className="flex flex-col gap-2">
                {Object.entries(LANGS).map(([k, v]) => (
                  <button key={k} className={`flex justify-between items-center p-5 rounded-[20px] font-bold text-lg transition-all active-scale ${lang === k ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20" : "bg-slate-50 dark:bg-zinc-800 border border-transparent text-slate-700 dark:text-zinc-200"}`} onClick={() => { haptic(); setLang(k); setActiveSheet(null); }}>
                    <span>{v}</span>{lang === k && <Check size={20} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(activeSheet === "model" || activeSheet === "symbol" || activeSheet === "backdrop") && (
            <div className="flex flex-col animate-[fadeInUp_0.4s_ease-out]">
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-6 px-2">
                {activeSheet === "model" ? t.model : activeSheet === "symbol" ? t.symbol : t.backdrop}
              </div>
              {((activeSheet === "model" ? attrs.models : activeSheet === "symbol" ? attrs.symbols : attrs.backdrops).length === 0) && (
                <div className="text-center font-bold text-slate-400 py-4">{t.select_gift_first}</div>
              )}
              <div className="flex flex-col gap-2">
                <button className={`flex justify-between items-center p-4 rounded-[20px] font-bold transition-all active-scale ${(activeSheet === "model" ? selectedModel : activeSheet === "symbol" ? selectedSymbol : selectedBackdrop) === "Any" ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20" : "bg-slate-50 dark:bg-zinc-800 border border-transparent text-slate-700 dark:text-zinc-200"}`} onClick={() => { activeSheet === "model" ? setSelectedModel("Any") : activeSheet === "symbol" ? setSelectedSymbol("Any") : setSelectedBackdrop("Any"); setActiveSheet(null); }}>
                  <span>{t.any}</span>{((activeSheet === "model" ? selectedModel : activeSheet === "symbol" ? selectedSymbol : selectedBackdrop) === "Any") && <Check size={20} />}
                </button>
                {(activeSheet === "model" ? attrs.models : activeSheet === "symbol" ? attrs.symbols : attrs.backdrops).map((m) => (
                  <button key={m.name} className={`flex justify-between items-center p-4 rounded-[20px] font-bold transition-all active-scale ${(activeSheet === "model" ? selectedModel : activeSheet === "symbol" ? selectedSymbol : selectedBackdrop) === m.name ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20" : "bg-slate-50 dark:bg-zinc-800 border border-transparent text-slate-700 dark:text-zinc-200"}`} onClick={() => { haptic(); activeSheet === "model" ? setSelectedModel(m.name) : activeSheet === "symbol" ? setSelectedSymbol(m.name) : setSelectedBackdrop(m.name); setActiveSheet(null); }}>
                    <div className="flex items-center gap-3">
                      {activeSheet === "model" && selectedCollection?.preview && <img src={selectedCollection.preview} alt="" className="w-10 h-10 rounded-[12px] bg-slate-200 object-cover" />}
                      {activeSheet === "backdrop" && m.hex && <span className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ background: m.hex }} />}
                      <div className="flex flex-col items-start">
                        <span className="text-base">{m.name}</span>
                        {m.rarity != null && <span className={`text-[10px] px-1.5 py-0.5 rounded-md mt-0.5 ${rarityClass(m.rarity)}`}>{fmtRarity(m.rarity)} {t.rarity}</span>}
                      </div>
                    </div>
                    {((activeSheet === "model" ? selectedModel : activeSheet === "symbol" ? selectedSymbol : selectedBackdrop) === m.name) && <Check size={20} />}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    );
  };

  // ─── BOOT ─────────────────────────────────────────────────────────────────
  if (booting) {
    return (
      <div className={theme}>
        <style>{styles}</style>
        <div className="mesh-bg"><div className="mesh-blob mesh-blob-1" /><div className="mesh-blob mesh-blob-2" /></div>
        <LaunchLoader onDone={() => setBooting(false)} />
      </div>
    );
  }

  // ─── ACCESS GATE ──────────────────────────────────────────────────────────
  if (access !== "granted") {
    const voidImgs = collections.filter((c) => c.preview).slice(0, 6).map((c) => c.preview);
    return (
      <div className={theme}>
        <style>{styles}</style>
        <div className="mesh-bg"><div className="mesh-blob mesh-blob-1" /><div className="mesh-blob mesh-blob-2" /></div>
        <VoidGifts images={voidImgs} />
        <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
          <div className="w-full max-w-sm glass-panel p-8 rounded-[40px] shadow-2xl flex flex-col items-center animate-spring">
            <img src={LOGO_URL} alt="" className="w-20 h-20 rounded-[24px] shadow-lg mb-6" />
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">GiftTrove</div>
            {access === "checking" ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="text-slate-500 font-bold">{t.gate_checking}</div>
                <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
              </div>
            ) : (
              <>
                <div className="text-center text-slate-500 dark:text-zinc-400 font-medium mb-8 leading-relaxed">
                  {t.gate_a}<a className="text-blue-500 font-bold cursor-pointer" onClick={() => safeOpen("https://t.me/insidemajek")}>@{t.gate_link}</a>{t.gate_b}
                </div>
                <input className={`w-full text-center px-5 py-4 rounded-[20px] glass-input text-lg font-black tracking-widest uppercase mb-4 outline-none ${codeError ? "border-rose-500 text-rose-500" : "text-slate-900 dark:text-white"}`} placeholder={t.gate_code_ph} value={codeInput} onChange={(e) => setCodeInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitCode(); }} />
                <button className="w-full py-4 rounded-[20px] bg-blue-500 text-white font-bold text-lg shadow-[0_8px_20px_rgba(59,130,246,0.3)] active-scale transition-all mb-4" onClick={submitCode}>{t.gate_unlock}</button>
                <div className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">{t.gate_admin}</div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const voidImgs = collections.filter((c) => c.preview).slice(0, 6).map((c) => c.preview);

  // ─── MAIN RENDER ──────────────────────────────────────────────────────────
  return (
    <div className={theme}>
      <style>{styles}</style>
      <div className="fixed inset-0 overflow-hidden text-slate-900 dark:text-white transition-colors duration-500 flex flex-col md:flex-row">
        {/* Animated Background layer */}
        <div className="mesh-bg"><div className="mesh-blob mesh-blob-1" /><div className="mesh-blob mesh-blob-2" /></div>
        <VoidGifts images={voidImgs} onPick={(u) => safeOpen(u)} />
        
        {/* Global Toast */}
        {toast && (
          <div className="fixed top-[env(safe-area-inset-top,20px)] left-1/2 -translate-x-1/2 z-[9999] px-5 py-2.5 bg-slate-900/90 dark:bg-white/90 backdrop-blur-xl text-white dark:text-black text-sm font-bold rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.2)] animate-[slideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)] border border-white/10">
            {toast}
          </div>
        )}

        {/* ── MOBILE HEADER ── */}
        {!isDesktop && (
          <div className="flex justify-between items-center px-6 pt-[calc(20px+env(safe-area-inset-top,0px))] pb-4 z-50">
            <div className="font-black text-2xl tracking-tighter flex items-center gap-1.5">
              GIFT<div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center p-1 overflow-hidden shrink-0"><img src={LOGO_URL} alt="" className="w-full h-full object-contain" /></div>TROVE
            </div>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-full glass-panel flex items-center justify-center active-scale transition-all text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white" onClick={() => { haptic(); setActiveSheet("lang"); }}><Globe size={20} /></button>
              <button className="w-10 h-10 rounded-full glass-panel flex items-center justify-center active-scale transition-all text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white" onClick={toggleTheme}><div className="rotate-180"><ArrowUp size={20} /></div></button>
            </div>
          </div>
        )}

        {/* ── DESKTOP SIDEBAR ── */}
        {isDesktop && (
          <div className="w-[280px] shrink-0 border-r border-slate-200/50 dark:border-white/5 glass-panel z-50 flex flex-col py-8 px-5 gap-2">
            <div className="font-black text-2xl tracking-tighter flex items-center gap-2 mb-8 px-4">
              <div className="w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center p-1.5 shrink-0"><img src={LOGO_URL} alt="" className="w-full h-full object-contain" /></div>
              <span>GiftTrove</span>
            </div>
            {tabs.map((tab) => (
              <button key={tab.id} className={`flex items-center gap-3 px-5 py-3.5 rounded-[18px] font-bold text-[15px] transition-all duration-300 active-scale ${activeTab === tab.id ? "bg-blue-500 text-white shadow-[0_8px_20px_rgba(59,130,246,0.3)]" : "text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"}`} onClick={() => { haptic(); setActiveTab(tab.id); }}>
                <tab.Icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} /> {tab.label}
              </button>
            ))}
            <div className="mt-auto flex gap-3 pt-6 border-t border-slate-200/50 dark:border-white/5">
              <button className="flex-1 py-3 rounded-[16px] glass-panel font-bold text-sm text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white active-scale transition-all flex items-center justify-center" onClick={() => { haptic(); setActiveSheet("lang"); }}><Globe size={18} /></button>
              <button className="flex-1 py-3 rounded-[16px] glass-panel font-bold text-sm text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white active-scale transition-all flex items-center justify-center" onClick={toggleTheme}><div className="rotate-180"><ArrowUp size={18} /></div></button>
            </div>
          </div>
        )}

        {/* ── SCROLLABLE CONTENT ── */}
        <div className={`flex-1 overflow-y-auto overflow-x-hidden no-scrollbar relative z-10 ${isDesktop ? "p-8 max-w-[1000px] mx-auto w-full" : "px-5"}`}
             ref={contentRef} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
             style={{ paddingTop: !isDesktop && pullY > 0 ? pullY : (isDesktop ? 32 : 0), paddingBottom: !isDesktop ? 'calc(100px + env(safe-area-inset-bottom, 20px))' : 32, transition: pullY === 0 ? "padding-top 0.4s cubic-bezier(0.34,1.56,0.64,1)" : "none" }}>
          
          {/* PTR Indicator */}
          {!isDesktop && (
            <div className={`absolute left-0 right-0 h-16 flex justify-center items-center transition-all duration-300 ${isRefreshing || pullY > 40 ? "opacity-100" : "opacity-0"}`} style={{ top: isRefreshing ? 10 : pullY > 50 ? 10 : -40 }}>
              <div className={`w-8 h-8 rounded-full border-[3px] border-blue-500/20 border-t-blue-500 ${isRefreshing ? "animate-spin" : ""}`} style={{ transform: `rotate(${pullY * 3}deg)` }} />
            </div>
          )}

          {renderActiveTab(isDesktop)}
        </div>

        {/* ── FLOATING MOBILE NAV (Dynamic Island Style) ── */}
        {!isDesktop && !keyboardOpen && (
          <div className="fixed bottom-[env(safe-area-inset-bottom,16px)] left-0 right-0 z-50 flex justify-center px-4 pointer-events-none animate-[slideUp_0.5s_cubic-bezier(0.34,1.56,0.64,1)]">
            <div className="pointer-events-auto w-full max-w-[360px] h-[68px] glass-panel rounded-full p-1.5 flex relative shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] border border-white/40 dark:border-white/10" ref={tabBarRef}>
              <div className="tab-indicator shadow-sm" style={{ left: pill.left, width: pill.width, opacity: pill.width > 0 ? 1 : 0 }} />
              {tabs.map((tab) => (
                <button key={tab.id} ref={(el) => (tabRefs.current[tab.id] = el)} className={`relative z-10 flex-1 flex flex-col items-center justify-center gap-1 font-bold transition-colors duration-300 ${activeTab === tab.id ? "text-blue-500" : "text-slate-400 dark:text-zinc-500"}`} onClick={() => { haptic(); setActiveTab(tab.id); }}>
                  <div className={`transition-transform duration-400 cubic-bezier(0.34,1.56,0.64,1) ${activeTab === tab.id ? "-translate-y-1 scale-110" : ""}`}>
                    <tab.Icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} fill={activeTab === tab.id ? "currentColor" : "none"} className={activeTab === tab.id && tab.id === "profile" ? "opacity-20" : ""} />
                    {activeTab === tab.id && tab.id === "profile" && <User size={22} strokeWidth={2.5} className="absolute inset-0" />}
                  </div>
                  <span className={`text-[10px] tracking-wide transition-all duration-400 absolute bottom-1.5 ${activeTab === tab.id ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {renderSheet()}
      </div>
    </div>
  );
}


```
