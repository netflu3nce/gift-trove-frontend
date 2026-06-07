import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";

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
const BACKEND_CONFIGURED = !https://gift-trove-backend.onrender.com.test(BACKEND_URL);

const FRAGMENT_CDN = "https://nft.fragment.com/gift";

// Optional: drop a Lottie URL here for the launch splash (a treasure-chest / trove reveal).
// If left empty, a fully animated CSS glassmorphism splash is used instead.
const SPLASH_LOTTIE_URL = "";

const DONATE_ADDRESS = "UQCvd6Sw_JJQsedBGfR2JOn7it7VdREWQ7v3kIluUi0RPMXJ";
const DONATE_COMMENT = "GiftTrove Donation";
const REF_BOT_LINK = "https://t.me/gifttrovebot/app?startapp="; // + uid

const COMMUNITY = {
  channel: "https://t.me/insidemajek",
  chat: "https://t.me/+Op7gLVniX9Y1OTRk",
  support: "https://t.me/insidemajek?direct",
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
const LIVE_MARKETS = new Set(["Telegram", "GetGems"]);

const LANGS = { EN: "English", RU: "Русский", ZH: "中文" };

// ─── TINY API CLIENT (graceful: never throws the UI down) ─────────────────────
async function api(path, { method = "GET", body, timeout = 10000 } = {}) {
  if (!BACKEND_CONFIGURED) throw new Error("backend-not-configured");
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
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
const GiftTroveLogo = ({ size = 28 }) => (
  <img
    src="https://i.ibb.co/ZRQJd5tT/MGGA.png"
    alt="GiftTrove"
    style={{ width: size, height: size, objectFit: "contain", display: "block", flexShrink: 0 }}
  />
);

// ─── SVG ICONS ──────────────────────────────────────────────────────────────
const IconSearch = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const IconBell = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const IconBookmark = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
const IconBookmarkFilled = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
const IconUser = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconChevronRight = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const IconSun = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const IconMoon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
const IconGlobe = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const IconHeart = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const IconBack = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const IconCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconCopy = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const IconTrash = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;

// ─── LOTTIE GIFT (loads lottie-web from CDN on demand; falls back to static jpg) ─
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
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    if (!src) { setFailed(true); return; }
    let anim, cancelled = false;
    setFailed(false);
    (async () => {
      try {
        const lottie = await loadLottie();
        const data = await (await fetch(src)).json();
        if (cancelled || !ref.current) return;
        anim = lottie.loadAnimation({
          container: ref.current, renderer: "svg", loop: true, autoplay: true, animationData: data,
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; try { anim?.destroy(); } catch { /* noop */ } };
  }, [src]);

  if (failed) {
    return poster
      ? <img src={poster} alt="" style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", background: "var(--bg-input)" }} onError={(e) => { e.target.style.opacity = 0.25; }} />
      : <div style={{ width: size, height: size, borderRadius: radius, background: "var(--bg-input)" }} />;
  }
  return <div ref={ref} style={{ width: size, height: size, borderRadius: radius, overflow: "hidden", background: "var(--bg-input)" }} />;
}

// ─── LAUNCH SPLASH (iOS glassmorphism + motion, "trove" treasure reveal) ──────
function LaunchLoader({ onDone }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1500); // don't block the UI for long
    const t2 = setTimeout(() => onDone?.(), 1980);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`splash ${leaving ? "splash-leaving" : ""}`}>
      <div className="splash-glow" />
      <div className="splash-card">
        {SPLASH_LOTTIE_URL ? (
          <LottieGift src={SPLASH_LOTTIE_URL} size={140} radius={28} />
        ) : (
          <div className="trove-scene">
            <span className="trove-coin trove-coin-1" />
            <span className="trove-coin trove-coin-2" />
            <span className="trove-coin trove-coin-3" />
            <div className="trove-chest">
              <div className="trove-chest-lid" />
              <div className="trove-chest-base" />
              <div className="trove-shine" />
            </div>
            <span className="trove-spark trove-spark-1" />
            <span className="trove-spark trove-spark-2" />
            <span className="trove-spark trove-spark-3" />
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

// ─── PROMO BANNER ─────────────────────────────────────────────────────────────
const PROMO_SLIDES = [
  { img: "https://i.ibb.co/5gXQZ5SQ/MGGA-1.png", url: "https://t.me/gifttrove" },
  { img: "https://i.ibb.co/r2zGgWHH/MGGA-2.png", url: "https://t.me/troveotc" },
  { img: "https://i.ibb.co/Kp2tJtQT/MGGA-4.png", url: "https://t.me/spinmibot?startapp=7608551523" },
  { img: "https://i.ibb.co/v5NvzS6/MGGA-3.png", url: "https://t.me/hotontgbot/app?startapp=UQC61-XV5zwCn-7eHbciHh8qR_3k6-6Bq458qrUkGhFoYxPo" },
  { img: "https://i.ibb.co/RkkHPgSV/MGGA-5.png", url: "https://t.me/insidemajek" },
];

function PromoBanner() {
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef(null);

  const start = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setCurrent((p) => (p + 1) % PROMO_SLIDES.length), 5000);
  }, []);

  useEffect(() => {
    preloadImages(PROMO_SLIDES.map((s) => s.img));
    preloadImages(["https://i.ibb.co/ZRQJd5tT/MGGA.png"]);
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
    scout_tab: "Scout", alerts_tab: "Alerts", saved_tab: "Saved", profile_tab: "Profile",
    fastest_way: "The fastest way to find any Telegram Gift",
    gift_name: "Gift Name", specific_id: "Specific ID", optional: "(Optional)",
    marketplaces: "Marketplaces", attributes: "Attributes", model: "Model", backdrop: "Backdrop", symbol: "Symbol",
    scout_gift: "Scout Gift", results: "Results", found: "found",
    scouting_title: "Scouting marketplaces…", scouting_sub: "Finding gems so you don't have to",
    no_results: "No live listings matched your filters.", try_again: "Try again",
    offline_title: "Live data is offline", offline_sub: "Couldn't reach the GiftTrove server. Pull to refresh or try again shortly.",
    select_gift_first: "Select a gift collection first to see its",
    no_alerts: "No alerts yet", alerts_hint: "Add a gift to your watchlist and get pinged when it lists below your price.",
    add_alert: "Add Watch Alert", watchlist: "Watchlist",
    no_saved: "No gifts saved yet.",
    community: "Community", support: "Contact Support", comm_chat: "Community Chat", comm_channel: "Community Channel",
    support_builder: "Support the Builder", donate: "Donate",
    donate_desc: "GiftTrove was created free. Kindly input the amount of TON you'd like to donate.",
    amount_ton: "Amount (TON)", verify_tx: "Verify Transaction", tx_id: "Transaction ID",
    thank_you: "Thank you for your generous support!",
    referrals: "Referrals", copy_ref: "Copy Referral Link", ref_count: "Referral Count",
    any: "Any", rarity: "Rarity", language: "Language",
    wallet_redirect: "You'll be redirected to {w} with the address and amount pre-filled — just approve.",
    tg_copy_note: "Telegram Wallet has no transfer link. Tap below to copy the address, then send {amt} TON from @wallet.",
    copy_address: "Copy Address", address_copied: "Address copied — send from @wallet",
    listed_value: "Listed Value", buy_now: "Buy / View", save_gift: "Save Gift", remove_saved: "Remove Saved",
    floor: "Floor", view_on: "View on Telegram",
  },
  RU: {
    scout_tab: "Поиск", alerts_tab: "Алерты", saved_tab: "Сохр.", profile_tab: "Профиль",
    fastest_way: "Самый быстрый способ найти любой Telegram подарок",
    gift_name: "Имя подарка", specific_id: "Конкретный ID", optional: "(Необязательно)",
    marketplaces: "Маркетплейсы", attributes: "Атрибуты", model: "Модель", backdrop: "Фон", symbol: "Символ",
    scout_gift: "Искать подарок", results: "Результаты", found: "найдено",
    scouting_title: "Сканируем маркетплейсы…", scouting_sub: "Находим самоцветы за вас",
    no_results: "Нет активных объявлений по фильтрам.", try_again: "Повторить",
    offline_title: "Данные недоступны", offline_sub: "Не удалось связаться с сервером GiftTrove. Потяните вниз для обновления.",
    select_gift_first: "Сначала выберите коллекцию, чтобы увидеть",
    no_alerts: "Пока нет алертов", alerts_hint: "Добавьте подарок в список наблюдения и получайте уведомление о выгодной цене.",
    add_alert: "Добавить алерт", watchlist: "Список наблюдения",
    no_saved: "Пока нет сохранённых подарков.",
    community: "Сообщество", support: "Поддержка", comm_chat: "Чат сообщества", comm_channel: "Канал сообщества",
    support_builder: "Поддержать создателя", donate: "Пожертвовать",
    donate_desc: "GiftTrove бесплатен. Введите сумму TON для пожертвования.",
    amount_ton: "Сумма (TON)", verify_tx: "Проверить транзакцию", tx_id: "ID транзакции",
    thank_you: "Спасибо за вашу щедрую поддержку!",
    referrals: "Рефералы", copy_ref: "Копировать ссылку", ref_count: "Кол-во рефералов",
    any: "Любой", rarity: "Редкость", language: "Язык",
    wallet_redirect: "Вы будете перенаправлены в {w} с заполненным адресом и суммой — просто подтвердите.",
    tg_copy_note: "У Telegram Wallet нет ссылки для перевода. Скопируйте адрес и отправьте {amt} TON из @wallet.",
    copy_address: "Копировать адрес", address_copied: "Адрес скопирован — отправьте из @wallet",
    listed_value: "Цена листинга", buy_now: "Купить / Открыть", save_gift: "Сохранить", remove_saved: "Убрать",
    floor: "Флор", view_on: "Открыть в Telegram",
  },
  ZH: {
    scout_tab: "侦测", alerts_tab: "提醒", saved_tab: "收藏", profile_tab: "我的",
    fastest_way: "查找任何 Telegram 礼物的最快方法",
    gift_name: "礼物名称", specific_id: "特定 ID", optional: "（可选）",
    marketplaces: "市场", attributes: "属性", model: "模型", backdrop: "背景", symbol: "符号",
    scout_gift: "侦测礼物", results: "结果", found: "已找到",
    scouting_title: "正在扫描市场…", scouting_sub: "替你淘到珍宝",
    no_results: "没有符合筛选条件的在售商品。", try_again: "重试",
    offline_title: "实时数据离线", offline_sub: "无法连接 GiftTrove 服务器。请下拉刷新或稍后再试。",
    select_gift_first: "请先选择礼物系列以查看其",
    no_alerts: "暂无提醒", alerts_hint: "将礼物加入关注列表，当价格低于你的设定时获得提醒。",
    add_alert: "添加提醒", watchlist: "关注列表",
    no_saved: "暂无收藏的礼物。",
    community: "社区", support: "联系客服", comm_chat: "社区群组", comm_channel: "社区频道",
    support_builder: "支持开发者", donate: "捐赠",
    donate_desc: "GiftTrove 是免费的。请输入您想捐赠的 TON 数量。",
    amount_ton: "数量 (TON)", verify_tx: "验证交易", tx_id: "交易 ID",
    thank_you: "感谢您的慷慨支持！",
    referrals: "推荐", copy_ref: "复制推荐链接", ref_count: "推荐人数",
    any: "任何", rarity: "稀有度", language: "语言",
    wallet_redirect: "您将被跳转到 {w}，地址和金额已预填——确认即可。",
    tg_copy_note: "Telegram 钱包没有转账链接。点击下方复制地址，然后从 @wallet 发送 {amt} TON。",
    copy_address: "复制地址", address_copied: "地址已复制——请从 @wallet 发送",
    listed_value: "挂单价", buy_now: "购买 / 查看", save_gift: "收藏", remove_saved: "取消收藏",
    floor: "地板价", view_on: "在 Telegram 中打开",
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

  /* trove (treasure chest) CSS scene */
  .trove-scene { position: relative; width: 132px; height: 120px; display: flex; align-items: flex-end; justify-content: center; }
  .trove-chest { position: relative; width: 92px; height: 70px; animation: troveBob 2.2s ease-in-out infinite; }
  @keyframes troveBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  .trove-chest-base {
    position: absolute; bottom: 0; left: 0; width: 92px; height: 46px; border-radius: 10px;
    background: linear-gradient(180deg, #c8841f 0%, #9a5e12 100%);
    border: 2px solid rgba(255,255,255,0.18); box-shadow: inset 0 -6px 12px rgba(0,0,0,0.25);
  }
  .trove-chest-lid {
    position: absolute; top: 4px; left: 0; width: 92px; height: 34px; border-radius: 18px 18px 6px 6px;
    background: linear-gradient(180deg, #ffd34d 0%, #e0a52a 100%);
    border: 2px solid rgba(255,255,255,0.22); transform-origin: bottom center;
    animation: troveLid 2.6s ease-in-out infinite;
  }
  @keyframes troveLid { 0%,100% { transform: rotateX(0deg); } 45%,70% { transform: rotateX(-32deg); } }
  .trove-shine {
    position: absolute; top: 36px; left: 50%; width: 14px; height: 14px; margin-left: -7px; border-radius: 50%;
    background: radial-gradient(circle, #fff 0%, rgba(255,230,150,0.6) 60%, transparent 80%);
    box-shadow: 0 0 22px 8px rgba(255,220,120,0.7); animation: troveShine 2.6s ease-in-out infinite;
  }
  @keyframes troveShine { 0%,40%,100% { opacity: 0; transform: scale(0.4); } 55%,68% { opacity: 1; transform: scale(1.2); } }
  .trove-coin { position: absolute; width: 14px; height: 14px; border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #fff2b0, #f4c12e);
    box-shadow: 0 0 8px rgba(255,200,80,0.7); opacity: 0; }
  .trove-coin-1 { left: 34px; bottom: 52px; animation: troveCoin 2.6s ease-in-out infinite 0.0s; }
  .trove-coin-2 { left: 58px; bottom: 52px; animation: troveCoin 2.6s ease-in-out infinite 0.12s; }
  .trove-coin-3 { left: 46px; bottom: 52px; animation: troveCoin 2.6s ease-in-out infinite 0.24s; }
  @keyframes troveCoin {
    0%,42% { opacity: 0; transform: translateY(0) scale(0.6); }
    58% { opacity: 1; transform: translateY(-34px) scale(1); }
    80% { opacity: 1; transform: translateY(-30px) scale(1); }
    100% { opacity: 0; transform: translateY(-10px) scale(0.7); }
  }
  .trove-spark { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: #fff; opacity: 0; }
  .trove-spark-1 { left: 18px; top: 26px; animation: troveSpark 2.6s ease-in-out infinite 0.4s; }
  .trove-spark-2 { right: 16px; top: 34px; animation: troveSpark 2.6s ease-in-out infinite 0.6s; }
  .trove-spark-3 { right: 30px; top: 12px; animation: troveSpark 2.6s ease-in-out infinite 0.8s; }
  @keyframes troveSpark { 0%,45%,100% { opacity: 0; transform: scale(0); } 60% { opacity: 1; transform: scale(1.4); } }

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
  .promo-banner { width: 100%; border-radius: 20px; overflow: hidden; margin-bottom: 24px; position: relative; cursor: pointer; aspect-ratio: 1500 / 450; box-shadow: 0 8px 32px rgba(0,0,0,0.18); }
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
  .hero-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
  .hero-title-img { height: 1em; width: auto; vertical-align: middle; border-radius: 8px; flex-shrink: 0; }

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

  .empty-state { text-align: center; padding: 48px 20px; color: var(--text-secondary); }
  .empty-state .es-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 14px 0 6px; }

  .page-header { font-size: 34px; font-weight: 800; letter-spacing: -1px; line-height: 1.15; margin-bottom: 24px; color: #ffffff; }
  .page-header.desktop { font-size: 40px; }

  .toast { position: fixed; top: calc(20px + var(--safe-top)); left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.85); color: #fff; padding: 12px 22px; border-radius: 100px; font-size: 14px; font-weight: 600; z-index: 9998; backdrop-filter: blur(10px); animation: toastIn 0.3s var(--bounce); box-shadow: 0 8px 30px rgba(0,0,0,0.3); }

  @keyframes fadeIn { to { opacity: 1; } }
  @keyframes slideUp { to { transform: translateY(0); } }
  .fade-in-up { animation: fadeInUp 0.5s var(--bounce) forwards; }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

  @media (min-width: 768px) { .mobile-only { display: none !important; } }
  @media (max-width: 767px) { .desktop-only { display: none !important; } }
`;

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

  const [savedGifts, setSavedGifts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gt_saved") || "[]"); } catch { return []; }
  });

  const refKey = `gt_ref_count_${tgUser?.id || "guest"}`;
  const [referralCount, setReferralCount] = useState(() => parseInt(localStorage.getItem(refKey) || "0", 10));

  const [activeTab, setActiveTab] = useState("scout");
  const [toast, setToast] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isScouting, setIsScouting] = useState(false);
  const [activeSheet, setActiveSheet] = useState(null);
  const [selectedGift, setSelectedGift] = useState(null);

  // live collection data
  const [collections, setCollections] = useState([]); // [{name,slug,gift_id,supply,preview}]

  // attributes for the selected collection
  const [attrs, setAttrs] = useState({ models: [], symbols: [], backdrops: [] });

  // search inputs
  const [giftQuery, setGiftQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [giftId, setGiftId] = useState("");
  const [selectedMarkets, setSelectedMarkets] = useState(["All"]);
  const [selectedModel, setSelectedModel] = useState("Any");
  const [selectedBackdrop, setSelectedBackdrop] = useState("Any");
  const [selectedSymbol, setSelectedSymbol] = useState("Any");

  // results
  const [results, setResults] = useState([]);
  const [scoutError, setScoutError] = useState(null);

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

  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;

  // derived (safe: all state above is initialized)
  const collectionNames = collections.length ? collections.map((c) => c.name) : FALLBACK_COLLECTIONS;
  const selectedCollection = collections.find((c) => c.name === giftQuery);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };
  const toggleTheme = () => { haptic(); setTheme((p) => (p === "dark" ? "light" : "dark")); };

  // ── Telegram init ──
  useEffect(() => { try { tg?.ready?.(); tg?.expand?.(); } catch { /* noop */ } }, [tg]);

  // ── persistence ──
  useEffect(() => { localStorage.setItem("gt_theme", theme); document.documentElement.setAttribute("data-theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("gt_lang", lang); }, [lang]);
  useEffect(() => { localStorage.setItem("gt_saved", JSON.stringify(savedGifts)); }, [savedGifts]);
  useEffect(() => { localStorage.setItem(refKey, String(referralCount)); }, [referralCount, refKey]);

  // ── load live collections (dynamic; no hardcoding) ──
  useEffect(() => {
    let alive = true;
    api("/api/collections")
      .then((d) => { if (alive && d?.collections?.length) setCollections(d.collections); })
      .catch(() => { /* falls back to FALLBACK_COLLECTIONS */ });
    return () => { alive = false; };
  }, []);

  // ── load attributes when a known collection is picked ──
  useEffect(() => {
    setSelectedModel("Any"); setSelectedSymbol("Any"); setSelectedBackdrop("Any");
    const col = collections.find((c) => c.name === giftQuery);
    if (!col) { setAttrs({ models: [], symbols: [], backdrops: [] }); return; }
    let alive = true;
    api(`/api/attributes?gift_id=${encodeURIComponent(col.gift_id)}`)
      .then((d) => { if (alive && d) setAttrs({ models: d.models || [], symbols: d.symbols || [], backdrops: d.backdrops || [] }); })
      .catch(() => setAttrs({ models: [], symbols: [], backdrops: [] }));
    return () => { alive = false; };
  }, [giftQuery, collections]);

  // ── referral: read true count from backend, attribute on start_param ──
  useEffect(() => {
    api(`/api/referrals?uid=${encodeURIComponent(tgUser?.id || "guest")}`)
      .then((d) => { if (typeof d?.count === "number") { setReferralCount(d.count); localStorage.setItem(refKey, String(d.count)); } })
      .catch(() => { /* keep local cache */ });

    const ref = tg?.initDataUnsafe?.start_param;
    if (ref && /^\d+$/.test(ref) && String(ref) !== String(tgUser?.id)) {
      api("/api/referral", { method: "POST", body: { uid: ref, by: tgUser?.id } }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ── tab pill measurement (adaptive: covers icon+label, adapts to label width) ──
  const tabs = [
    { id: "scout", icon: <IconSearch />, label: t.scout_tab },
    { id: "alerts", icon: <IconBell />, label: t.alerts_tab },
    { id: "saved", icon: <IconBookmark />, label: t.saved_tab },
    { id: "profile", icon: <IconUser />, label: t.profile_tab },
  ];
  useLayoutEffect(() => {
    const measure = () => {
      const el = tabRefs.current[activeTab];
      const bar = tabBarRef.current;
      if (el && bar) {
        const er = el.getBoundingClientRect();
        const br = bar.getBoundingClientRect();
        setPill({ left: er.left - br.left, width: er.width });
      }
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && tabBarRef.current) ro.observe(tabBarRef.current);
    window.addEventListener("resize", measure);
    return () => { ro?.disconnect(); window.removeEventListener("resize", measure); };
  }, [activeTab, lang, keyboardOpen]);

  // ── pull to refresh ──
  const handleTouchStart = (e) => { if (contentRef.current?.scrollTop === 0) touchStartY.current = e.touches[0].clientY; };
  const handleTouchMove = (e) => {
    if (contentRef.current?.scrollTop === 0) {
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy > 0) setPullY(Math.min(dy, 80));
    }
  };
  const handleTouchEnd = () => {
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

  // ── SCOUT (real backend search; graceful) ──
  const handleScout = async () => {
    haptic("medium");
    setScoutError(null);
    setIsScouting(true);
    const started = Date.now();
    try {
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
      const d = await api(`/api/search?${p.toString()}`, { timeout: 15000 });
      setResults(Array.isArray(d?.results) ? d.results : []);
    } catch {
      setScoutError("offline");
      setResults([]);
    }
    // keep the (now meaningful) loader visible briefly for a smooth feel
    const elapsed = Date.now() - started;
    setTimeout(() => { setIsScouting(false); setIsSearching(true); }, Math.max(0, 850 - elapsed));
  };

  const exitSearch = () => { setIsSearching(false); setIsScouting(false); setResults([]); setScoutError(null); };

  // ── saved ──
  const isSavedGift = (g) => savedGifts.some((s) => s.id === g.id);
  const toggleSave = (g) => {
    haptic();
    if (isSavedGift(g)) { setSavedGifts(savedGifts.filter((s) => s.id !== g.id)); showToast(t.remove_saved); }
    else { setSavedGifts([...savedGifts, g]); showToast(t.save_gift + " ✓"); }
  };

  // ── buy / view ──
  const handleBuy = (e, item) => {
    e?.stopPropagation?.();
    haptic();
    const url = marketplaceUrl(item);
    if (!url) { showToast(t.no_results); return; }
    safeOpen(url);
  };

  // ── referral copy ──
  const copyReferral = () => {
    const link = `${REF_BOT_LINK}${tgUser?.id || "demo"}`;
    if (copyText(link)) showToast(t.copy_ref + " ✓");
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
  const renderGiftCard = (item) => {
    const img = item.image || giftImage(item.slug, item.num);
    const saved = isSavedGift(item);
    const dotHex = item.backdropHex;
    return (
      <div key={item.id} className="result-card" onClick={() => { haptic(); setSelectedGift(item); setActiveSheet("gift_details"); }}>
        <div className="result-card-header">
          {img
            ? <img src={img} alt={item.name} className="result-gift-img" onError={(e) => { e.target.style.opacity = 0.2; }} />
            : <div className="result-gift-img" />}
          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2, color: "var(--text-primary)", flex: 1 }}>
            {item.name}{item.num != null ? ` #${item.num}` : ""}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            <div onClick={(e) => { e.stopPropagation(); toggleSave(item); }} style={{ color: saved ? "var(--tg-blue)" : "var(--text-secondary)", cursor: "pointer" }}>
              {saved ? <IconBookmarkFilled /> : <IconBookmark />}
            </div>
            <div className="badge-buy" onClick={(e) => handleBuy(e, item)}>BUY</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          {dotHex && <span className="color-dot" style={{ width: 12, height: 12, background: dotHex }} />}
          <span>{item.market}{item.backdrop ? ` • ${item.backdrop}` : ""}</span>
        </div>
        {item.model && (
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
            <span className={`model-rarity ${rarityClass(item.modelRarity)}`}>{item.model}</span>
            {item.modelRarity != null && <span style={{ marginLeft: 6 }}>{fmtRarity(item.modelRarity)}</span>}
          </div>
        )}
        <div style={{ marginTop: "auto" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--tg-blue)" }}>
            {item.price != null ? `${item.price} ${item.currency || "TON"}` : t.view_on}
          </div>
        </div>
      </div>
    );
  };

  // ── SHEETS ──
  const renderSheet = () => {
    if (!activeSheet) return null;

    if (activeSheet === "gift_details" && selectedGift) {
      const g = selectedGift;
      const saved = isSavedGift(g);
      const anim = g.animation || giftAnimation(g.slug, g.num);
      const img = g.image || giftImage(g.slug, g.num);
      const dot = g.backdropHex;
      return (
        <div className="sheet-overlay" onClick={() => setActiveSheet(null)}>
          <div className="sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
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
                  {g.price != null ? `${g.price} ${g.currency || "TON"}` : "—"}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="action-btn" style={{ flex: 1, background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border)", marginTop: 0 }} onClick={() => { toggleSave(g); setActiveSheet(null); }}>
                {saved ? t.remove_saved : t.save_gift}
              </button>
              <button className="action-btn" style={{ flex: 1, marginTop: 0 }} onClick={(e) => handleBuy(e, g)}>{t.buy_now}</button>
            </div>
          </div>
        </div>
      );
    }

    if (activeSheet === "donate") {
      const isTg = donateWallet === "Tg Wallet";
      return (
        <div className="sheet-overlay" onClick={() => setActiveSheet(null)}>
          <div className="sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
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
          </div>
        </div>
      );
    }

    if (activeSheet === "lang") {
      return (
        <div className="sheet-overlay" onClick={() => setActiveSheet(null)}>
          <div className="sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">{t.language}</div>
            <div className="ios-group" style={{ margin: 0 }}>
              {Object.entries(LANGS).map(([k, v]) => (
                <div key={k} className="sheet-list-item" onClick={() => { haptic(); setLang(k); setActiveSheet(null); }}>
                  <span>{v}</span>{lang === k && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeSheet === "model" || activeSheet === "symbol") {
      const isModel = activeSheet === "model";
      const list = isModel ? attrs.models : attrs.symbols;
      const sel = isModel ? selectedModel : selectedSymbol;
      const setSel = isModel ? setSelectedModel : setSelectedSymbol;
      const preview = selectedCollection?.preview;
      return (
        <div className="sheet-overlay" onClick={() => setActiveSheet(null)}>
          <div className="sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">{isModel ? t.model : t.symbol}</div>
            {list.length === 0 && (
              <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: 16, fontSize: 14 }}>
                {t.select_gift_first} {isModel ? t.model.toLowerCase() : t.symbol.toLowerCase()}
              </p>
            )}
            <div className="ios-group" style={{ margin: 0 }}>
              <div className="sheet-model-item" onClick={() => { setSel("Any"); setActiveSheet(null); }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{t.any}</span>
                {sel === "Any" && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
              </div>
              {list.map((m) => (
                <div key={m.name} className="sheet-model-item" onClick={() => { haptic(); setSel(m.name); setActiveSheet(null); }}>
                  <div className="model-left">
                    {preview && <img src={preview} alt="" className="model-thumb" onError={(e) => { e.target.style.opacity = 0.2; }} />}
                    <div className="model-info">
                      <span className="model-name">{m.name}</span>
                      {m.rarity != null && <span className={`model-rarity ${rarityClass(m.rarity)}`}>{fmtRarity(m.rarity)} {t.rarity}</span>}
                    </div>
                  </div>
                  {sel === m.name && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeSheet === "backdrop") {
      const list = attrs.backdrops;
      return (
        <div className="sheet-overlay" onClick={() => setActiveSheet(null)}>
          <div className="sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">{t.backdrop}</div>
            {list.length === 0 && (
              <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: 16, fontSize: 14 }}>
                {t.select_gift_first} {t.backdrop.toLowerCase()}
              </p>
            )}
            <div className="ios-group" style={{ margin: 0 }}>
              <div className="sheet-list-item" onClick={() => { setSelectedBackdrop("Any"); setActiveSheet(null); }}>
                <span>{t.any}</span>{selectedBackdrop === "Any" && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
              </div>
              {list.map((c) => (
                <div key={c.name} className="sheet-list-item" onClick={() => { haptic(); setSelectedBackdrop(c.name); setActiveSheet(null); }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {c.hex && <span className="color-dot" style={{ background: c.hex }} />}{c.name}
                    {c.rarity != null && <span className={`model-rarity ${rarityClass(c.rarity)}`} style={{ marginLeft: 4 }}>{fmtRarity(c.rarity)}</span>}
                  </span>
                  {selectedBackdrop === c.name && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // ── SCOUT TAB ──
  const filteredGifts = collectionNames.filter((g) => g.toLowerCase().includes(giftQuery.toLowerCase()));
  const renderScout = (desktop = false) => {
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
    if (isSearching) {
      return (
        <div className="fade-in-up" style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{t.results}</div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 600 }}>{results.length} {t.found}</div>
          </div>
          {scoutError ? (
            <div className="empty-state">
              <IconGlobe />
              <div className="es-title">{t.offline_title}</div>
              <div>{t.offline_sub}</div>
              <button className="action-btn" style={{ marginTop: 20 }} onClick={handleScout}>{t.try_again}</button>
            </div>
          ) : results.length === 0 ? (
            <div className="empty-state">
              <IconSearch />
              <div className="es-title">{t.no_results}</div>
            </div>
          ) : (
            <div className={desktop ? "results-grid desktop" : "results-grid"}>
              {results.map((item) => renderGiftCard(item))}
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="fade-in-up">
        <PromoBanner />
        <div className={desktop ? "hero-title desktop" : "hero-title"}>
          <div className="hero-title-row">
            <span>{t.fastest_way}</span>
            <img src="https://i.ibb.co/ZRQJd5tT/MGGA.png" alt="" className="hero-title-img" />
          </div>
        </div>

        <div className="input-group">
          <div className="section-label">{t.gift_name}</div>
          <input className="ios-input" placeholder="e.g. Plush Pepe" value={giftQuery}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onChange={(e) => setGiftQuery(e.target.value)} />
          {showSuggestions && giftQuery && filteredGifts.length > 0 && (
            <div className="suggestions-dropdown">
              {filteredGifts.slice(0, 12).map((g) => {
                const col = collections.find((c) => c.name === g);
                return (
                  <div key={g} className="suggestion-item"
                    onMouseDown={(e) => { e.preventDefault(); setGiftQuery(g); setShowSuggestions(false); }}
                    onTouchEnd={(e) => { e.preventDefault(); setGiftQuery(g); setShowSuggestions(false); }}>
                    {col?.preview
                      ? <img src={col.preview} alt={g} className="suggestion-gift-img" onError={(e) => { e.target.style.opacity = 0.2; }} />
                      : <span className="suggestion-gift-img" />}
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
            {MARKETPLACES.map((m) => (
              <div key={m} className={`chip ${selectedMarkets.includes(m) ? "active" : ""}`} onClick={() => handleMarketToggle(m)}>{m}</div>
            ))}
          </div>
        </div>

        <div className="input-group">
          <div className="section-label">{t.attributes}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button className="select-btn" disabled={!selectedCollection} onClick={() => setActiveSheet("model")}>
              <span>{t.model}</span><span className="select-val">{selectedModel} <IconChevronRight /></span>
            </button>
            <button className="select-btn" disabled={!selectedCollection} onClick={() => setActiveSheet("backdrop")}>
              <span>{t.backdrop}</span>
              <span className="select-val">
                {(() => { const c = attrs.backdrops.find((x) => x.name === selectedBackdrop); return c?.hex ? <span className="color-dot" style={{ background: c.hex, width: 14, height: 14 }} /> : null; })()}
                {selectedBackdrop} <IconChevronRight />
              </span>
            </button>
            <button className="select-btn" disabled={!selectedCollection} onClick={() => setActiveSheet("symbol")}>
              <span>{t.symbol}</span><span className="select-val">{selectedSymbol} <IconChevronRight /></span>
            </button>
          </div>
        </div>

        <button className="action-btn" onClick={handleScout} disabled={!giftQuery}>{t.scout_gift}</button>
      </div>
    );
  };

  // ── ALERTS TAB (replacement direction for "Events" — Watchlist & Alerts) ──
  const renderAlerts = (desktop = false) => (
    <div className="fade-in-up">
      <div className={desktop ? "page-header desktop" : "page-header"}>{t.alerts_tab}</div>
      <div className="empty-state">
        <IconBell />
        <div className="es-title">{t.no_alerts}</div>
        <div>{t.alerts_hint}</div>
        <button className="action-btn" style={{ marginTop: 20 }} onClick={() => { haptic(); setActiveTab("scout"); }}>{t.add_alert}</button>
      </div>
    </div>
  );

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

      <div className="section-label" style={{ marginTop: 12 }}>{t.referrals}</div>
      <div className="ios-group">
        <div className="ios-row" onClick={copyReferral}>
          <div className="row-left"><div className="row-icon-box" style={{ background: "#ff9500" }}><IconCopy /></div>{t.copy_ref}</div>
        </div>
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
        <div className="ios-row" onClick={() => safeOpen(COMMUNITY.chat)}>
          <div className="row-left"><div className="row-icon-box" style={{ background: "#0a84ff" }}><IconSearch /></div>{t.comm_chat}</div>
          <IconChevronRight />
        </div>
        <div className="ios-row" onClick={() => safeOpen(COMMUNITY.support)}>
          <div className="row-left"><div className="row-icon-box" style={{ background: "#34c759" }}><IconUser /></div>{t.support}</div>
          <IconChevronRight />
        </div>
      </div>

      <div className="section-label">{t.support_builder}</div>
      <div className="ios-group">
        <div className="ios-row" onClick={() => { haptic(); setDonateStep(1); setActiveSheet("donate"); }}>
          <div className="row-left"><div className="row-icon-box" style={{ background: "#ff2d55" }}><IconHeart /></div>{t.donate}</div>
          <IconChevronRight />
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 40, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600 }}>
        Built by @insidemajek
      </div>
    </div>
  );

  const renderActiveTab = (desktop = false) => {
    switch (activeTab) {
      case "scout": return renderScout(desktop);
      case "alerts": return renderAlerts(desktop);
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
        <div data-theme={theme}><LaunchLoader onDone={() => setBooting(false)} /></div>
      </>
    );
  }

  // ── DESKTOP ──
  if (isDesktop) {
    return (
      <>
        <style>{styles}</style>
        {toast && <div className="toast">{toast}</div>}
        <div className="desktop-layout" data-theme={theme}>
          <div className="desktop-sidebar">
            <div className="desktop-logo">
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>GIFT<GiftTroveLogo size={26} />TROVE</span>
            </div>
            {tabs.map((tab) => (
              <button key={tab.id} className={`desktop-nav-btn ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => { haptic(); setActiveTab(tab.id); exitSearch(); }}>
                {tab.icon}{tab.label}
              </button>
            ))}
            <div className="desktop-sidebar-bottom">
              <div className="icon-btn" onClick={() => setActiveSheet("lang")}><IconGlobe /></div>
              <div className="icon-btn" onClick={toggleTheme}>{theme === "dark" ? <IconMoon /> : <IconSun />}</div>
              {activeTab === "scout" && isSearching && <div className="icon-btn" onClick={exitSearch}><IconBack /></div>}
            </div>
          </div>
          <div className="desktop-content">{renderActiveTab(true)}</div>
          {renderSheet()}
        </div>
      </>
    );
  }

  // ── MOBILE ──
  return (
    <>
      <style>{styles}</style>
      <div className="app-container" data-theme={theme}>
        {toast && <div className="toast">{toast}</div>}

        <div className="top-nav">
          {activeTab === "scout" && isSearching ? (
            <div className="icon-btn" onClick={exitSearch}><IconBack /></div>
          ) : (
            <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.5px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 2, lineHeight: 1 }}>
              GIFT<span style={{ display: "flex", alignItems: "center", margin: "0 2px" }}><GiftTroveLogo size={22} /></span>TROVE
            </div>
          )}
          <div className="top-icons">
            <div className="icon-btn" onClick={() => setActiveSheet("lang")}><IconGlobe /></div>
            <div className="icon-btn" onClick={toggleTheme}>{theme === "dark" ? <IconMoon /> : <IconSun />}</div>
          </div>
        </div>

        <div className="content ptr-container" ref={contentRef}
          onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
          style={{ paddingTop: pullY > 0 ? pullY : 0, transition: pullY === 0 ? "padding-top 0.3s" : "none" }}>
          <div className={`ptr-indicator ${isRefreshing || pullY > 40 ? "visible" : ""}`} style={{ top: isRefreshing ? 8 : pullY > 50 ? 8 : -60 }}>
            <div className={`ptr-spinner ${isRefreshing ? "spinning" : ""}`} />
          </div>
          {renderActiveTab(false)}
        </div>

        {!keyboardOpen && (
          <div className="tab-bar-container">
            <div className="ios-tab-bar" ref={tabBarRef}>
              <div className="tab-active-pill" style={{ left: pill.left, width: pill.width }} />
              {tabs.map((tab) => (
                <button key={tab.id} ref={(el) => (tabRefs.current[tab.id] = el)}
                  className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => { haptic(); setActiveTab(tab.id); exitSearch(); }}>
                  <div className={`tab-icon ${activeTab === tab.id ? "tab-icon-active" : ""}`}>{tab.icon}</div>
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
