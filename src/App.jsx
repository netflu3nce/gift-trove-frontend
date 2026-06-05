import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────
const GIFTS = [
  "Plush Pepe","Durov's Cap","Jelly Bunny","Magic Potion","Loot Bag",
  "Vintage Cigar","Eternal Candle","Homemade Cake","Sharp Tongue",
  "Spy Agaric","Sakura Flower","Spiced Wine","Diamond Ring","Evil Eye",
  "Frightful Egg","Astral Shard","Trapped Heart","Skeleton Watch",
  "Voodoo Doll","Hypno Lollipop","Tama Gotchi","Bunny Muffin",
  "Cookie Heart","Witch Hat"
];
const MODELS = ["Common","Rare","Epic","Legendary","Mythical"];
const BACKDROPS = ["Space","Nature","Urban","Abstract","Fire","Ice","Gold","Neon"];
const SYMBOLS = ["Moon","Star","Sun","Heart","Diamond","Skull","Crown","Lightning"];
const DURATIONS = [
  { label: "1 Hour", value: "1h", stars: 10 },
  { label: "12 Hours", value: "12h", stars: 100 },
  { label: "24 Hours", value: "24h", stars: 200 },
  { label: "7 Days", value: "7d", stars: 1500 },
];
const FILTER_COSTS = { model: 5, backdrop: 5, symbol: 5, valueRange: 10 };
const LANGS = { EN: "English", RU: "Русский", ZH: "中文" };

const PFP_LIST = [
  "https://i.ibb.co/MDD7WHhT/IMG-9516.jpg",
  "https://i.ibb.co/kVzjLRSL/IMG-9512.jpg",
  "https://i.ibb.co/Xfr1tC5d/IMG-9515.jpg",
  "https://i.ibb.co/35WD1M57/IMG-9505.jpg",
  "https://i.ibb.co/9HN04Srz/IMG-9504.jpg",
  "https://i.ibb.co/4nL8fd5h/IMG-9507.jpg",
  "https://i.ibb.co/0jhtCPp8/IMG-9517.jpg",
  "https://i.ibb.co/0NR0XcZ/IMG-9518.jpg",
  "https://i.ibb.co/G35q0b7m/IMG-9503.jpg",
];

const T = {
  EN: {
    terms_title:"Terms & Conditions",
    terms_body:`Welcome to GiftTrove — a Telegram gift scouting tool. By using this service, you agree to the following:\n\n1. GiftTrove is an independent scouting tool and is NOT affiliated with GetGems, Portals, MRKT, or Telegram in any way.\n\n2. All scout payments made in Telegram Stars (XTR) are NON-REFUNDABLE once a scout is launched.\n\n3. GiftTrove provides real-time scouting data from third-party marketplaces. We do not guarantee the availability or accuracy of listings.\n\n4. You must be of legal age in your jurisdiction to use paid features.\n\n5. We reserve the right to update these terms at any time.\n\nBuilt with care by @insidemajek`,
    accept:"Accept & Continue", scout_tab:"Scout", radar_tab:"Radar",
    history_tab:"History", profile_tab:"Profile", select_gift:"Select Gift",
    select_model:"Model", select_backdrop:"Backdrop", select_symbol:"Symbol",
    value_range:"Value Range (Stars)", duration:"Scout Duration", launch:"Launch Scout",
    free_trial:"Free Trial — 10 min", free_trial_desc:"Try 1 filter, no stars needed",
    no_scouts:"No active scouts yet", no_history:"No completed scouts",
    stars_needed:"Get Stars with Hoton", stars_desc:"Get 30% off via HotOnTG",
    join_channel:"Join Channel", community:"Community Chat", support:"Support",
    user_id:"User ID", search_placeholder:"Search gifts...", min:"Min", max:"Max",
    optional:"optional", active:"Active", completed:"Completed", view_details:"Details",
    gift_required:"Please select a gift to scout", duration_required:"Please select a duration",
    scouts_run:"Scouts Run", total_spent:"Total Spent", results_found:"Results Found",
    member_since:"Member Since", choose_avatar:"Choose Avatar",
  },
  RU: {
    terms_title:"Условия использования",
    terms_body:`Добро пожаловать в GiftTrove — инструмент поиска подарков в Telegram. Используя этот сервис, вы соглашаетесь со следующим:\n\n1. GiftTrove не является аффилиатом GetGems, Portals, MRKT или Telegram.\n\n2. Все платежи в Telegram Stars (XTR) НЕВОЗВРАТНЫ после запуска сканирования.\n\n3. GiftTrove предоставляет данные с маркетплейсов в режиме реального времени без гарантий точности.\n\n4. Вы должны быть совершеннолетним для использования платных функций.\n\n5. Мы оставляем за собой право изменять условия в любое время.\n\nСоздано @insidemajek`,
    accept:"Принять и продолжить", scout_tab:"Поиск", radar_tab:"Радар",
    history_tab:"История", profile_tab:"Профиль", select_gift:"Выбрать подарок",
    select_model:"Модель", select_backdrop:"Фон", select_symbol:"Символ",
    value_range:"Диапазон цен (Stars)", duration:"Длительность", launch:"Запустить",
    free_trial:"Пробный — 10 мин", free_trial_desc:"1 фильтр, без Stars",
    no_scouts:"Нет активных поисков", no_history:"Нет завершённых поисков",
    stars_needed:"Получить Stars с Hoton", stars_desc:"Скидка 30% через HotOnTG",
    join_channel:"Канал", community:"Чат сообщества", support:"Поддержка",
    user_id:"ID пользователя", search_placeholder:"Поиск подарков...",
    min:"Мин", max:"Макс", optional:"необязательно", active:"Активен", completed:"Завершён",
    view_details:"Подробнее", gift_required:"Выберите подарок", duration_required:"Выберите длительность",
    scouts_run:"Поисков", total_spent:"Потрачено", results_found:"Найдено", member_since:"С нами с",
    choose_avatar:"Выбрать аватар",
  },
  ZH: {
    terms_title:"使用条款",
    terms_body:`欢迎使用 GiftTrove — Telegram 礼品侦测工具。使用本服务即表示您同意以下条款：\n\n1. GiftTrove 与 GetGems、Portals、MRKT 或 Telegram 无任何关联。\n\n2. 一旦启动侦测，所有 Telegram Stars (XTR) 付款均不可退款。\n\n3. GiftTrove 提供来自第三方市场的实时数据，不保证准确性。\n\n4. 您必须达到当地法定年龄才能使用付费功能。\n\n5. 我们保留随时更新条款的权利。\n\n由 @insidemajek 精心打造`,
    accept:"接受并继续", scout_tab:"侦测", radar_tab:"雷达",
    history_tab:"历史", profile_tab:"个人资料", select_gift:"选择礼品",
    select_model:"模型", select_backdrop:"背景", select_symbol:"符号",
    value_range:"价值范围 (Stars)", duration:"侦测时长", launch:"启动侦测",
    free_trial:"免费试用 — 10分钟", free_trial_desc:"1个筛选条件，无需Stars",
    no_scouts:"暂无活跃侦测", no_history:"暂无历史记录",
    stars_needed:"通过Hoton获取Stars", stars_desc:"通过HotOnTG享受7折优惠",
    join_channel:"加入频道", community:"社区群组", support:"客服支持",
    user_id:"用户ID", search_placeholder:"搜索礼品...", min:"最低", max:"最高",
    optional:"可选", active:"活跃", completed:"已完成", view_details:"查看详情",
    gift_required:"请选择礼品", duration_required:"请选择侦测时长",
    scouts_run:"侦测次数", total_spent:"总消费", results_found:"找到结果", member_since:"加入时间",
    choose_avatar:"选择头像",
  }
};

const mockActiveScouts = [
  { id:1, gift:"Plush Pepe", model:"Rare", backdrop:null, symbol:null, valueRange:[100,500], duration:"1h", starsSpent:30, startedAt:Date.now()-1200000, endsAt:Date.now()+2400000, results:3 },
  { id:2, gift:"Diamond Ring", model:null, backdrop:"Gold", symbol:"Crown", valueRange:null, duration:"12h", starsSpent:20, startedAt:Date.now()-3600000, endsAt:Date.now()+39600000, results:7 },
];
const mockHistory = [
  { id:10, gift:"Durov's Cap", model:"Legendary", backdrop:"Space", symbol:null, valueRange:[500,2000], duration:"24h", starsSpent:215, completedAt:Date.now()-86400000, results:12 },
  { id:11, gift:"Voodoo Doll", model:null, backdrop:null, symbol:null, valueRange:null, duration:"1h", starsSpent:10, completedAt:Date.now()-172800000, results:0 },
];

function timeLeft(endsAt) {
  const diff = endsAt - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
function formatDate(ts) {
  return new Date(ts).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}

// ─── SVG ICONS ───────────────────────────────────────────────────────────────
const IconSearch = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const IconRadar = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6h.01"/><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/><circle cx="12" cy="12" r="2"/></svg>;
const IconClock = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconUser = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconChevronRight = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const IconStar = ({size=14}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
const IconGlobe = ({size=14}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const IconZap = ({size=14}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
const IconCheck = ({size=13}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconGift = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>;
const IconMoon = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
const IconSun = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const IconEdit = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
const IconShield = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IconTrendUp = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;

// ─── STYLES ──────────────────────────────────────────────────────────────────
const buildStyles = (dark) => `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --tg-blue: #2AABEE;
    --tg-blue-dim: ${dark ? 'rgba(42,171,238,0.14)' : 'rgba(42,171,238,0.10)'};
    --tg-blue-glow: rgba(42,171,238,0.35);
    --tg-blue-border: ${dark ? 'rgba(42,171,238,0.25)' : 'rgba(42,171,238,0.30)'};
    --accent-2: #1e96d4;
    --gold: #f5c842;
    --gold-dim: rgba(245,200,66,0.12);
    --red-soft: rgba(255,80,80,0.08);
    --red-border: rgba(255,80,80,0.18);

    --bg-deep: ${dark ? '#080c18' : '#f0f4f8'};
    --bg-mid: ${dark ? '#0d1220' : '#ffffff'};
    --bg-card: ${dark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.85)'};
    --bg-card-hover: ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)'};
    --bg-card-solid: ${dark ? '#111827' : '#ffffff'};
    --bg-input: ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'};

    --text-primary: ${dark ? '#e8edf5' : '#0d1220'};
    --text-secondary: ${dark ? 'rgba(232,237,245,0.55)' : 'rgba(13,18,32,0.55)'};
    --text-muted: ${dark ? 'rgba(232,237,245,0.30)' : 'rgba(13,18,32,0.30)'};
    --border: ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
    --border-blue: ${dark ? 'rgba(42,171,238,0.2)' : 'rgba(42,171,238,0.25)'};

    --shadow-card: ${dark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)'};
    --shadow-float: ${dark ? '0 8px 40px rgba(0,0,0,0.5)' : '0 8px 40px rgba(0,0,0,0.12)'};

    --radius-xl: 24px;
    --radius-lg: 20px;
    --radius-md: 14px;
    --radius-sm: 10px;
    --tab-h: 80px;
    --safe-bottom: env(safe-area-inset-bottom, 0px);
    --font: 'Sora', sans-serif;
    --mono: 'JetBrains Mono', monospace;
  }

  html, body, #root { height: 100%; overflow: hidden; }
  body {
    font-family: var(--font);
    background: var(--bg-deep);
    color: var(--text-primary);
    -webkit-font-smoothing: antialiased;
    overscroll-behavior: none;
  }

  /* ── BACKGROUND ── */
  .bg-canvas {
    position: fixed; inset: 0; z-index: 0;
    ${dark ? `
    background:
      radial-gradient(ellipse 80% 55% at 15% 0%, rgba(42,171,238,0.13) 0%, transparent 60%),
      radial-gradient(ellipse 60% 50% at 90% 100%, rgba(30,150,212,0.09) 0%, transparent 60%),
      radial-gradient(ellipse 100% 80% at 50% 50%, #070a14 0%, #060911 100%);
    ` : `
    background:
      radial-gradient(ellipse 80% 55% at 15% 0%, rgba(42,171,238,0.07) 0%, transparent 60%),
      radial-gradient(ellipse 60% 50% at 90% 100%, rgba(30,150,212,0.05) 0%, transparent 60%),
      linear-gradient(160deg, #eaf4fd 0%, #f5f7fa 50%, #eef2f7 100%);
    `}
  }
  .bg-noise {
    position: fixed; inset: 0; z-index: 0; opacity: ${dark ? '0.025' : '0.018'};
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 200px 200px;
  }
  .bg-orb-1 {
    position: fixed; z-index: 0;
    width: 300px; height: 300px; border-radius: 50%;
    top: -80px; left: -80px;
    background: radial-gradient(circle, ${dark ? 'rgba(42,171,238,0.12)' : 'rgba(42,171,238,0.08)'} 0%, transparent 70%);
    filter: blur(40px);
    animation: orbFloat 8s ease-in-out infinite;
  }
  .bg-orb-2 {
    position: fixed; z-index: 0;
    width: 250px; height: 250px; border-radius: 50%;
    bottom: 100px; right: -60px;
    background: radial-gradient(circle, ${dark ? 'rgba(42,171,238,0.08)' : 'rgba(42,171,238,0.06)'} 0%, transparent 70%);
    filter: blur(50px);
    animation: orbFloat 10s ease-in-out infinite reverse;
  }
  @keyframes orbFloat {
    0%,100% { transform: translate(0,0) scale(1); }
    33% { transform: translate(20px,-20px) scale(1.05); }
    66% { transform: translate(-10px,15px) scale(0.95); }
  }

  /* ── LAYOUT ── */
  .app { position: fixed; inset: 0; z-index: 1; display: flex; flex-direction: column; overflow: hidden; }
  .content-area {
    flex: 1; overflow-y: auto; overflow-x: hidden;
    padding: 8px 14px calc(var(--tab-h) + var(--safe-bottom) + 16px);
    scroll-behavior: smooth;
  }
  .content-area::-webkit-scrollbar { display: none; }

  /* ── GLASS ── */
  .glass {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    backdrop-filter: blur(24px) saturate(1.6);
    -webkit-backdrop-filter: blur(24px) saturate(1.6);
    box-shadow: var(--shadow-card);
  }

  /* ── LOADING ── */
  .loading-screen {
    position: fixed; inset: 0; z-index: 999;
    display: flex; align-items: center; justify-content: center;
    background: #060911;
    animation: fadeOut 0.5s ease 2.2s forwards;
  }
  .loading-img { width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0; }
  @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; pointer-events: none; } }

  /* ── TERMS ── */
  .terms-overlay {
    position: fixed; inset: 0; z-index: 100;
    display: flex; align-items: flex-end; justify-content: center;
    background: ${dark ? 'rgba(6,9,17,0.92)' : 'rgba(240,244,248,0.85)'};
    backdrop-filter: blur(16px);
  }
  .terms-sheet {
    width: 100%; max-height: 92vh;
    border-radius: 32px 32px 0 0;
    padding: 6px 22px 36px;
    display: flex; flex-direction: column; gap: 14px;
    background: var(--bg-mid);
    border-top: 1px solid var(--border-blue);
    box-shadow: 0 -12px 60px rgba(42,171,238,0.15);
    animation: slideUp 0.45s cubic-bezier(0.34,1.56,0.64,1);
  }
  .terms-drag { width: 36px; height: 4px; background: var(--border); border-radius: 99px; margin: 12px auto 2px; }
  .terms-header { display: flex; align-items: center; gap: 12px; }
  .terms-logo-img { height: 30px; object-fit: contain; }
  .terms-title { font-size: 17px; font-weight: 800; }
  .terms-scroll { flex: 1; overflow-y: auto; font-size: 13px; line-height: 1.85; color: var(--text-secondary); white-space: pre-line; max-height: 38vh; padding-right: 4px; }
  .terms-scroll::-webkit-scrollbar { display: none; }
  .lang-row { display: flex; gap: 6px; justify-content: flex-end; flex-shrink: 0; }
  .lang-btn {
    font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 99px; cursor: pointer; border: none;
    background: var(--bg-card); color: var(--text-secondary); border: 1px solid var(--border); transition: all 0.2s;
    font-family: var(--font);
  }
  .lang-btn.active { background: var(--tg-blue-dim); color: var(--tg-blue); border-color: var(--tg-blue-border); }

  /* ── HEADER ── */
  .header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px 6px; flex-shrink: 0;
  }
  .logo { display: flex; align-items: center; }
  .logo-img { height: 28px; object-fit: contain; }
  .header-right { display: flex; align-items: center; gap: 7px; }
  .icon-btn {
    width: 34px; height: 34px; border-radius: 11px; border: none; cursor: pointer;
    background: var(--bg-card); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    color: var(--text-secondary); transition: all 0.2s; font-family: var(--font);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  }
  .icon-btn:active { transform: scale(0.92); background: var(--bg-card-hover); }
  .lang-pill {
    display: flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 700; padding: 5px 10px; border-radius: 99px;
    background: var(--bg-card); border: 1px solid var(--border);
    color: var(--text-secondary); cursor: pointer; font-family: var(--font);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    transition: all 0.2s;
  }
  .lang-pill:active { transform: scale(0.95); }

  /* ── TAB BAR ── */
  .tab-bar-wrap {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 60;
    padding-bottom: var(--safe-bottom);
    background: ${dark ? 'rgba(8,12,24,0.88)' : 'rgba(248,252,255,0.88)'};
    border-top: 1px solid var(--border);
    backdrop-filter: blur(28px) saturate(1.8);
    -webkit-backdrop-filter: blur(28px) saturate(1.8);
  }
  .tab-bar {
    display: flex; align-items: center; justify-content: space-around;
    padding: 10px 8px 8px;
    height: var(--tab-h);
    position: relative;
  }
  .tab-item {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
    cursor: pointer; padding: 6px 2px; border-radius: 16px;
    transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
    border: none; background: none; color: var(--text-muted); position: relative;
    font-family: var(--font);
  }
  .tab-item.active { color: var(--tg-blue); }
  .tab-icon-pill {
    width: 46px; height: 32px; border-radius: 11px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
  }
  .tab-item.active .tab-icon-pill {
    background: var(--tg-blue-dim);
    box-shadow: 0 0 18px var(--tg-blue-glow);
    transform: translateY(-3px) scale(1.05);
  }
  .tab-label { font-size: 10px; font-weight: 600; letter-spacing: 0.2px; transition: all 0.2s; }
  .tab-item.active .tab-label { font-weight: 700; }

  /* ── SECTION TITLES ── */
  .section-title {
    font-size: 11px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase;
    color: var(--text-muted); margin-bottom: 10px; padding-left: 4px;
  }

  /* ── SCOUT CARD ── */
  .scout-card { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
  .cost-bar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 13px 16px; border-radius: var(--radius-md);
    background: ${dark ? 'rgba(42,171,238,0.10)' : 'rgba(42,171,238,0.08)'};
    border: 1px solid var(--tg-blue-border);
    transition: all 0.3s;
  }
  .cost-label { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
  .cost-value { font-family: var(--mono); font-size: 24px; font-weight: 600; color: var(--tg-blue); display: flex; align-items: center; gap: 6px; }
  .cost-star { color: var(--gold); display: flex; }

  .gift-search-wrap { position: relative; }
  .gift-search-input {
    width: 100%; padding: 13px 14px 13px 42px;
    background: var(--bg-input); border: 1px solid var(--border);
    border-radius: var(--radius-md); color: var(--text-primary); font-family: var(--font); font-size: 14px;
    outline: none; transition: all 0.2s;
  }
  .gift-search-input:focus { border-color: var(--tg-blue-border); background: ${dark ? 'rgba(42,171,238,0.05)' : 'rgba(42,171,238,0.04)'}; }
  .gift-search-input::placeholder { color: var(--text-muted); }
  .gift-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); display: flex; pointer-events: none; }
  .gift-dropdown {
    position: absolute; left: 0; right: 0; top: calc(100% + 6px); z-index: 30;
    max-height: 200px; overflow-y: auto; border-radius: var(--radius-md);
    border: 1px solid var(--border);
    background: ${dark ? 'rgba(11,15,27,0.98)' : 'rgba(255,255,255,0.98)'};
    backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
    box-shadow: var(--shadow-float);
    animation: dropIn 0.2s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes dropIn { from { opacity:0; transform:translateY(-6px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
  .gift-dropdown::-webkit-scrollbar { display: none; }
  .gift-option {
    padding: 11px 14px; font-size: 13.5px; cursor: pointer; transition: all 0.15s;
    display: flex; align-items: center; gap: 10px; color: var(--text-secondary);
  }
  .gift-option:hover, .gift-option.selected { background: var(--tg-blue-dim); color: var(--text-primary); }
  .gift-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--border); flex-shrink: 0; transition: background 0.2s; }
  .gift-option.selected .gift-dot { background: var(--tg-blue); }
  .gift-check { margin-left: auto; color: var(--tg-blue); display: flex; }

  .filter-label {
    font-size: 11.5px; font-weight: 600; color: var(--text-secondary);
    margin-bottom: 9px; display: flex; align-items: center; justify-content: space-between;
    letter-spacing: 0.2px;
  }
  .filter-tags { display: flex; gap: 4px; align-items: center; }
  .optional-tag { font-size: 10px; color: var(--text-muted); font-weight: 500; }
  .cost-tag {
    font-size: 10px; color: var(--tg-blue); font-weight: 700;
    background: var(--tg-blue-dim); padding: 2px 7px; border-radius: 99px;
    display: flex; align-items: center; gap: 3px; border: 1px solid var(--tg-blue-border);
  }

  .chips { display: flex; flex-wrap: wrap; gap: 7px; }
  .chip {
    padding: 7px 14px; border-radius: 99px; font-size: 12.5px; font-weight: 600;
    cursor: pointer; transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
    border: 1px solid var(--border);
    background: var(--bg-input); color: var(--text-secondary);
    user-select: none; -webkit-user-select: none; font-family: var(--font);
  }
  .chip:active { transform: scale(0.93); }
  .chip.selected {
    background: var(--tg-blue-dim); border-color: var(--tg-blue-border); color: var(--tg-blue);
    box-shadow: 0 0 12px rgba(42,171,238,0.2);
  }

  .range-row { display: flex; gap: 8px; }
  .range-input {
    flex: 1; padding: 12px 12px; border-radius: var(--radius-sm); font-size: 14px; font-family: var(--font);
    background: var(--bg-input); border: 1px solid var(--border);
    color: var(--text-primary); outline: none; transition: border-color 0.2s;
  }
  .range-input:focus { border-color: var(--tg-blue-border); }
  .range-input::placeholder { color: var(--text-muted); font-size: 12px; }

  .duration-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
  .duration-card {
    padding: 13px 14px; border-radius: var(--radius-md); cursor: pointer;
    transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
    border: 1px solid var(--border); background: var(--bg-input);
    display: flex; flex-direction: column; gap: 4px;
    user-select: none; -webkit-user-select: none;
  }
  .duration-card:active { transform: scale(0.96); }
  .duration-card.selected {
    border-color: var(--tg-blue-border); background: var(--tg-blue-dim);
    box-shadow: 0 0 16px rgba(42,171,238,0.18);
  }
  .duration-name { font-size: 13.5px; font-weight: 700; color: var(--text-primary); }
  .duration-stars { font-size: 11.5px; color: var(--gold); font-family: var(--mono); display: flex; align-items: center; gap: 4px; }

  .launch-btn {
    width: 100%; padding: 17px; border-radius: var(--radius-md); border: none; cursor: pointer;
    font-family: var(--font); font-size: 15px; font-weight: 800;
    background: linear-gradient(135deg, var(--tg-blue) 0%, var(--accent-2) 100%);
    color: white; letter-spacing: 0.4px;
    box-shadow: 0 4px 28px var(--tg-blue-glow);
    transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .launch-btn:active { transform: scale(0.975); box-shadow: 0 2px 14px var(--tg-blue-glow); }
  .launch-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none; box-shadow: none; }
  .launch-note { text-align: center; font-size: 11px; color: var(--text-muted); margin-top: 4px; }

  /* ── TRIAL BUBBLE ── */
  .trial-bubble {
    position: fixed; bottom: calc(var(--tab-h) + var(--safe-bottom) + 18px); right: 14px;
    z-index: 55; cursor: pointer; animation: bubbleFloat 3.5s ease-in-out infinite;
  }
  .trial-bubble-inner {
    background: ${dark ? 'linear-gradient(135deg, #0e2a4a, #0d3a63)' : 'linear-gradient(135deg, #e8f4fd, #d4edfb)'};
    border: 1px solid var(--tg-blue-border);
    border-radius: 50px; padding: 9px 16px;
    display: flex; align-items: center; gap: 6px;
    box-shadow: 0 6px 24px var(--tg-blue-glow);
    font-size: 12px; font-weight: 700; color: var(--tg-blue);
  }
  @keyframes bubbleFloat { 0%,100% { transform:translateY(0) rotate(-1deg); } 50% { transform:translateY(-6px) rotate(1deg); } }

  /* ── RADAR / HISTORY ── */
  .scout-item {
    padding: 16px; border-radius: var(--radius-md);
    display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px;
    transition: transform 0.2s;
  }
  .scout-item:active { transform: scale(0.99); }
  .scout-header { display: flex; align-items: center; justify-content: space-between; }
  .scout-name { font-size: 14.5px; font-weight: 700; }
  .badge { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 99px; letter-spacing: 0.5px; }
  .badge-active { background: rgba(42,171,238,0.14); color: var(--tg-blue); border: 1px solid var(--tg-blue-border); }
  .badge-done { background: var(--bg-input); color: var(--text-muted); border: 1px solid var(--border); }
  .meta-chips { display: flex; flex-wrap: wrap; gap: 5px; }
  .meta-chip { font-size: 11px; padding: 3px 9px; border-radius: 99px; background: var(--bg-input); border: 1px solid var(--border); color: var(--text-secondary); }
  .scout-footer { display: flex; align-items: center; justify-content: space-between; }
  .time-left { font-family: var(--mono); font-size: 12px; color: var(--tg-blue); }
  .results-count { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
  .detail-btn {
    font-size: 12px; font-weight: 600; padding: 7px 14px; border-radius: 9px; cursor: pointer;
    background: var(--tg-blue-dim); border: 1px solid var(--tg-blue-border); color: var(--tg-blue);
    font-family: var(--font); transition: all 0.2s;
  }
  .detail-btn:active { transform: scale(0.95); }
  .pulse-dot {
    width: 7px; height: 7px; border-radius: 50%; background: var(--tg-blue); flex-shrink: 0;
    box-shadow: 0 0 8px var(--tg-blue); animation: pulseAnim 2s ease-in-out infinite;
  }
  .empty-state { padding: 52px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; }
  .empty-icon-wrap {
    width: 68px; height: 68px; border-radius: 22px;
    background: var(--bg-input); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
  }
  .empty-text { font-size: 14px; color: var(--text-secondary); }

  /* ── HISTORY ── */
  .history-item { padding: 15px; border-radius: var(--radius-md); margin-bottom: 10px; }
  .history-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
  .history-name { font-size: 14px; font-weight: 700; }
  .history-date { font-size: 11px; color: var(--text-muted); }
  .history-filters { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
  .history-footer { display: flex; justify-content: space-between; align-items: center; }
  .stars-cost { font-family: var(--mono); font-size: 12.5px; color: var(--gold); display: flex; align-items: center; gap: 5px; }

  /* ── MODAL ── */
  .modal-overlay {
    position: fixed; inset: 0; z-index: 80;
    background: ${dark ? 'rgba(5,8,18,0.88)' : 'rgba(220,228,240,0.80)'}; 
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    display: flex; align-items: flex-end;
    animation: fadeIn 0.2s ease;
  }
  .modal-sheet {
    width: 100%; max-height: 82vh; border-radius: 30px 30px 0 0;
    padding: 6px 20px 40px; overflow-y: auto;
    background: var(--bg-mid);
    border-top: 1px solid var(--border-blue);
    box-shadow: 0 -8px 50px rgba(42,171,238,0.12);
    animation: slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1);
  }
  .modal-sheet::-webkit-scrollbar { display: none; }
  .modal-handle { width: 38px; height: 4px; background: var(--border); border-radius: 99px; margin: 14px auto 16px; }
  .modal-title { font-size: 16px; font-weight: 800; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  .modal-row { display: flex; justify-content: space-between; align-items: center; padding: 11px 0; border-bottom: 1px solid var(--border); }
  .modal-label { font-size: 12px; color: var(--text-muted); }
  .modal-value { font-size: 13px; font-weight: 600; }
  .close-btn {
    width: 100%; padding: 15px; border-radius: var(--radius-md); border: 1px solid var(--border);
    background: var(--bg-input); color: var(--text-secondary); font-family: var(--font);
    font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 18px; transition: all 0.2s;
  }
  .close-btn:active { background: var(--bg-card-hover); }

  /* ── TOAST ── */
  .toast {
    position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 200;
    padding: 11px 22px; border-radius: 99px; font-size: 13px; font-weight: 600;
    background: var(--bg-mid); border: 1px solid var(--tg-blue-border); color: var(--text-primary);
    box-shadow: 0 6px 30px rgba(0,0,0,0.35);
    animation: toastIn 0.3s ease, toastOut 0.3s ease 2.7s forwards;
    white-space: nowrap; font-family: var(--font);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  }

  /* ── PROFILE ── */
  .profile-hero {
    border-radius: var(--radius-xl); margin-bottom: 12px; overflow: hidden;
    background: var(--bg-card); border: 1px solid var(--border);
    backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
    box-shadow: var(--shadow-card);
    position: relative;
  }
  .profile-hero-bg {
    position: absolute; inset: 0; z-index: 0;
    background: ${dark
      ? 'linear-gradient(135deg, rgba(42,171,238,0.08) 0%, transparent 60%), radial-gradient(ellipse 80% 60% at 0% 0%, rgba(42,171,238,0.12) 0%, transparent 70%)'
      : 'linear-gradient(135deg, rgba(42,171,238,0.06) 0%, transparent 60%), radial-gradient(ellipse 80% 60% at 0% 0%, rgba(42,171,238,0.08) 0%, transparent 70%)'};
  }
  .profile-hero-content {
    position: relative; z-index: 1;
    display: flex; flex-direction: column; align-items: center;
    padding: 28px 20px 22px; gap: 14px;
  }
  .profile-avatar-wrap { position: relative; }
  .avatar-ring {
    width: 100px; height: 100px; border-radius: 50%;
    padding: 3px;
    background: linear-gradient(135deg, var(--tg-blue), var(--accent-2), #64d2ff);
    box-shadow: 0 0 28px var(--tg-blue-glow), 0 0 60px rgba(42,171,238,0.18);
    animation: avatarGlow 4s ease-in-out infinite;
  }
  .avatar-ring-inner {
    width: 100%; height: 100%; border-radius: 50%; overflow: hidden;
    border: 2px solid var(--bg-deep);
  }
  .avatar-pfp-img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 50%; }
  @keyframes avatarGlow {
    0%,100% { box-shadow: 0 0 28px var(--tg-blue-glow), 0 0 60px rgba(42,171,238,0.15); }
    50% { box-shadow: 0 0 40px var(--tg-blue-glow), 0 0 80px rgba(42,171,238,0.28); }
  }
  .change-pfp-btn {
    position: absolute; bottom: 2px; right: 2px;
    width: 28px; height: 28px; border-radius: 50%;
    background: linear-gradient(135deg, var(--tg-blue), var(--accent-2));
    border: 2.5px solid var(--bg-deep);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: white;
    box-shadow: 0 2px 10px rgba(42,171,238,0.55);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .change-pfp-btn:active { transform: scale(0.88); }
  .profile-name-row { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .profile-name { font-size: 20px; font-weight: 800; letter-spacing: -0.3px; }
  .profile-id { font-family: var(--mono); font-size: 11px; color: var(--text-muted); }
  .profile-badge-row { display: flex; gap: 6px; margin-top: 2px; justify-content: center; }
  .profile-badge {
    font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 99px;
    background: var(--bg-input); border: 1px solid var(--border); color: var(--text-secondary);
  }
  .profile-badge.accent { background: var(--tg-blue-dim); border-color: var(--tg-blue-border); color: var(--tg-blue); }

  /* Stats row */
  .profile-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--border); }
  .profile-stat-item {
    background: var(--bg-card); padding: 14px 10px; display: flex; flex-direction: column; align-items: center; gap: 4px;
  }
  .stat-value { font-family: var(--mono); font-size: 18px; font-weight: 700; color: var(--text-primary); }
  .stat-label { font-size: 10px; color: var(--text-muted); font-weight: 600; letter-spacing: 0.3px; text-align: center; }
  .stat-icon { color: var(--tg-blue); display: flex; margin-bottom: 2px; }

  /* Stars promo */
  .stars-promo-wrap {
    display: block; margin-bottom: 12px; border-radius: var(--radius-lg);
    overflow: hidden; border: 1px solid rgba(245,200,66,0.2);
    text-decoration: none; cursor: pointer;
    transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s;
    box-shadow: 0 4px 20px rgba(245,200,66,0.08);
  }
  .stars-promo-wrap:active { transform: scale(0.97); }
  .stars-promo-img { width: 100%; display: block; }

  /* Profile links */
  .profile-links-group { border-radius: var(--radius-lg); overflow: hidden; background: var(--bg-card); border: 1px solid var(--border); margin-bottom: 12px; backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
  .profile-link-item {
    padding: 15px 16px; display: flex; align-items: center; gap: 14px;
    cursor: pointer; text-decoration: none; color: var(--text-primary);
    transition: background 0.2s; border: none; background: none; width: 100%; font-family: var(--font);
  }
  .profile-link-item:active { background: var(--bg-card-hover); }
  .link-icon-box {
    width: 40px; height: 40px; border-radius: 12px;
    background: var(--tg-blue-dim); border: 1px solid var(--tg-blue-border);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; flex-shrink: 0;
  }
  .link-icon-box.red { background: var(--red-soft); border-color: var(--red-border); }
  .link-text { font-size: 14px; font-weight: 600; flex: 1; text-align: left; }
  .link-desc { font-size: 11px; color: var(--text-muted); font-weight: 400; }
  .link-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex: 1; }
  .link-arrow { color: var(--text-muted); display: flex; flex-shrink: 0; }
  .divider-line { height: 1px; background: var(--border); margin: 0 16px; }

  /* PFP Picker */
  .pfp-picker-sheet {
    width: 100%; border-radius: 30px 30px 0 0;
    padding: 6px 18px 44px;
    background: ${dark ? 'rgba(11,15,28,0.97)' : 'rgba(248,252,255,0.97)'};
    backdrop-filter: blur(44px) saturate(1.9); -webkit-backdrop-filter: blur(44px) saturate(1.9);
    border-top: 1px solid var(--tg-blue-border);
    box-shadow: 0 -10px 50px rgba(42,171,238,0.14);
    animation: slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1);
  }
  .pfp-picker-title { font-size: 15px; font-weight: 800; text-align: center; margin-bottom: 18px; }
  .pfp-picker-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .pfp-picker-item {
    position: relative; border-radius: 18px; overflow: hidden;
    aspect-ratio: 1; cursor: pointer;
    border: 2.5px solid transparent;
    transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
    background: var(--bg-input);
  }
  .pfp-picker-item:active { transform: scale(0.93); }
  .pfp-picker-item.selected { border-color: var(--tg-blue); box-shadow: 0 0 18px var(--tg-blue-glow); }
  .pfp-picker-img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 15px; }
  .pfp-check {
    position: absolute; bottom: 6px; right: 6px;
    width: 22px; height: 22px; border-radius: 50%;
    background: var(--tg-blue); border: 2px solid var(--bg-deep);
    display: flex; align-items: center; justify-content: center; color: white;
  }

  /* Member card */
  .member-card {
    border-radius: var(--radius-lg); padding: 14px 16px; margin-bottom: 12px;
    background: var(--bg-card); border: 1px solid var(--border);
    display: flex; align-items: center; gap: 12px;
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  }
  .member-icon { width: 38px; height: 38px; border-radius: 12px; background: var(--gold-dim); border: 1px solid rgba(245,200,66,0.2); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
  .member-info { flex: 1; }
  .member-title { font-size: 13px; font-weight: 700; }
  .member-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
  .member-badge { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 99px; background: var(--gold-dim); border: 1px solid rgba(245,200,66,0.25); color: var(--gold); }

  /* ── ANIMATIONS ── */
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pulseAnim { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.7); } }
  @keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(-10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
  @keyframes toastOut { from { opacity:1; } to { opacity:0; transform:translateX(-50%) translateY(-6px); } }
  @keyframes tabIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  .tab-content { animation: tabIn 0.28s ease; }
`;

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [loading, setLoading] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(() => { try { return localStorage.getItem("gt_terms") === "1"; } catch { return false; } });
  const [lang, setLang] = useState(() => { try { return localStorage.getItem("gt_lang") || "EN"; } catch { return "EN"; } });
  const [dark, setDark] = useState(() => { try { return localStorage.getItem("gt_dark") !== "0"; } catch { return true; } });
  const [tab, setTab] = useState("scout");
  const [showTrialBubble, setShowTrialBubble] = useState(true);
  const [toast, setToast] = useState(null);
  const [detailScout, setDetailScout] = useState(null);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [selectedPfp, setSelectedPfp] = useState(() => { try { return localStorage.getItem("gt_pfp") || PFP_LIST[0]; } catch { return PFP_LIST[0]; } });
  const [showPfpPicker, setShowPfpPicker] = useState(false);

  // Scout form state
  const [giftSearch, setGiftSearch] = useState("");
  const [giftDropdown, setGiftDropdown] = useState(false);
  const [selectedGift, setSelectedGift] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedBackdrop, setSelectedBackdrop] = useState(null);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [minVal, setMinVal] = useState("");
  const [maxVal, setMaxVal] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(null);

  const t = T[lang];
  const tgUser = typeof window !== "undefined" ? window.Telegram?.WebApp?.initDataUnsafe?.user : null;

  useEffect(() => { const t = setTimeout(() => setLoading(false), 2500); return () => clearTimeout(t); }, []);
  useEffect(() => { try { localStorage.setItem("gt_dark", dark ? "1" : "0"); } catch {} }, [dark]);

  const cost = (selectedGift ? 5 : 0)
    + (selectedModel ? FILTER_COSTS.model : 0)
    + (selectedBackdrop ? FILTER_COSTS.backdrop : 0)
    + (selectedSymbol ? FILTER_COSTS.symbol : 0)
    + ((minVal || maxVal) ? FILTER_COSTS.valueRange : 0)
    + (selectedDuration ? selectedDuration.stars : 0);

  const filteredGifts = GIFTS.filter(g => g.toLowerCase().includes(giftSearch.toLowerCase()));

  const showToastMsg = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  function acceptTerms() { try { localStorage.setItem("gt_terms", "1"); } catch {} setTermsAccepted(true); }
  function changeLang(l) { setLang(l); try { localStorage.setItem("gt_lang", l); } catch {} setShowLangPicker(false); }
  function changePfp(url) { setSelectedPfp(url); try { localStorage.setItem("gt_pfp", url); } catch {} setShowPfpPicker(false); }
  function handleLaunch() {
    if (!selectedGift) { showToastMsg(t.gift_required); return; }
    if (!selectedDuration) { showToastMsg(t.duration_required); return; }
    showToastMsg(`Scout launched for ${selectedGift}! (${cost} ⭐)`);
    setSelectedGift(null); setGiftSearch(""); setSelectedModel(null);
    setSelectedBackdrop(null); setSelectedSymbol(null);
    setMinVal(""); setMaxVal(""); setSelectedDuration(null);
    setTab("radar");
  }
  function handleFreeTrial() { showToastMsg("Free 10-min trial started!"); setShowTrialBubble(false); setTab("radar"); }

  const tabs = [
    { id:"scout", icon:<IconSearch />, label:t.scout_tab },
    { id:"radar", icon:<IconRadar />, label:t.radar_tab },
    { id:"history", icon:<IconClock />, label:t.history_tab },
    { id:"profile", icon:<IconUser />, label:t.profile_tab },
  ];

  return (
    <>
      <style>{buildStyles(dark)}</style>
      <div className="bg-canvas" />
      <div className="bg-noise" />
      <div className="bg-orb-1" />
      <div className="bg-orb-2" />

      {/* LOADING */}
      {loading && (
        <div className="loading-screen">
          <img src="https://i.ibb.co/KptJ4843/Untitled-design-2.png" alt="Loading" className="loading-img" />
        </div>
      )}

      {/* TERMS */}
      {!loading && !termsAccepted && (
        <div className="terms-overlay">
          <div className="terms-sheet">
            <div className="terms-drag" />
            <div className="lang-row">
              {Object.keys(LANGS).map(l => (
                <button key={l} className={`lang-btn ${lang===l?"active":""}`} onClick={()=>setLang(l)}>{l}</button>
              ))}
            </div>
            <div className="terms-header">
              <img src="https://i.ibb.co/tP162vk7/Untitled-design-4.png" alt="GiftTrove" className="terms-logo-img" />
              <div className="terms-title">{t.terms_title}</div>
            </div>
            <div className="terms-scroll">{t.terms_body}</div>
            <button className="launch-btn" onClick={acceptTerms}>{t.accept}</button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && <div className="toast">{toast}</div>}

      {/* DETAIL MODAL */}
      {detailScout && (
        <div className="modal-overlay" onClick={()=>setDetailScout(null)}>
          <div className="modal-sheet" onClick={e=>e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title"><IconGift /> {detailScout.gift}</div>
            {detailScout.model && <div className="modal-row"><span className="modal-label">{t.select_model}</span><span className="modal-value">{detailScout.model}</span></div>}
            {detailScout.backdrop && <div className="modal-row"><span className="modal-label">{t.select_backdrop}</span><span className="modal-value">{detailScout.backdrop}</span></div>}
            {detailScout.symbol && <div className="modal-row"><span className="modal-label">{t.select_symbol}</span><span className="modal-value">{detailScout.symbol}</span></div>}
            {detailScout.valueRange && <div className="modal-row"><span className="modal-label">{t.value_range}</span><span className="modal-value">{detailScout.valueRange[0]}–{detailScout.valueRange[1]}</span></div>}
            <div className="modal-row"><span className="modal-label">{t.duration}</span><span className="modal-value">{detailScout.duration}</span></div>
            <div className="modal-row"><span className="modal-label">Stars Spent</span><span className="modal-value" style={{color:"var(--gold)",fontFamily:"var(--mono)"}}>{detailScout.starsSpent} ⭐</span></div>
            <div className="modal-row"><span className="modal-label">Results Found</span><span className="modal-value">{detailScout.results} listings</span></div>
            {detailScout.endsAt && <div className="modal-row"><span className="modal-label">Time Left</span><span className="modal-value" style={{color:"var(--tg-blue)"}}>{timeLeft(detailScout.endsAt)}</span></div>}
            {detailScout.completedAt && <div className="modal-row"><span className="modal-label">Completed</span><span className="modal-value">{formatDate(detailScout.completedAt)}</span></div>}
            <button className="close-btn" onClick={()=>setDetailScout(null)}>Close</button>
          </div>
        </div>
      )}

      {/* LANG PICKER */}
      {showLangPicker && (
        <div className="modal-overlay" onClick={()=>setShowLangPicker(false)}>
          <div className="modal-sheet" onClick={e=>e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title"><IconGlobe /> Language</div>
            {Object.entries(LANGS).map(([k,v]) => (
              <div key={k} onClick={()=>changeLang(k)}
                style={{ padding:"14px 16px", borderRadius:13, marginBottom:6, display:"flex", alignItems:"center", justifyContent:"space-between",
                  background: lang===k ? "var(--tg-blue-dim)" : "var(--bg-input)",
                  border:`1px solid ${lang===k ? "var(--tg-blue-border)" : "var(--border)"}`,
                  cursor:"pointer", transition:"all 0.2s" }}>
                <span style={{fontSize:14, fontWeight:600}}>{v}</span>
                {lang===k && <span style={{color:"var(--tg-blue)",display:"flex"}}><IconCheck /></span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PFP PICKER */}
      {showPfpPicker && (
        <div className="modal-overlay" onClick={()=>setShowPfpPicker(false)}>
          <div className="pfp-picker-sheet" onClick={e=>e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="pfp-picker-title">{t.choose_avatar}</div>
            <div className="pfp-picker-grid">
              {PFP_LIST.map((url,i) => (
                <div key={i} className={`pfp-picker-item ${selectedPfp===url?"selected":""}`} onClick={()=>changePfp(url)}>
                  <img src={url} alt={`Avatar ${i+1}`} className="pfp-picker-img" />
                  {selectedPfp===url && <div className="pfp-check"><IconCheck /></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <div className="app">
          {/* HEADER */}
          <div className="header">
            <div className="logo">
              <img src="https://i.ibb.co/tP162vk7/Untitled-design-4.png" alt="GiftTrove" className="logo-img" />
            </div>
            <div className="header-right">
              <button className="icon-btn" onClick={()=>setDark(d=>!d)} title="Toggle theme">
                {dark ? <IconSun size={16} /> : <IconMoon size={16} />}
              </button>
              <button className="lang-pill" onClick={()=>setShowLangPicker(true)}>
                <IconGlobe size={12} /> {lang}
              </button>
            </div>
          </div>

          {/* TRIAL BUBBLE */}
          {showTrialBubble && tab==="scout" && (
            <div className="trial-bubble" onClick={handleFreeTrial}>
              <div className="trial-bubble-inner">
                <IconZap size={13}/> {t.free_trial}
              </div>
            </div>
          )}

          {/* CONTENT */}
          <div className="content-area">

            {/* ─── SCOUT TAB ─── */}
            {tab==="scout" && (
              <div className="tab-content">
                <div className="section-title">{t.scout_tab}</div>
                <div className="glass scout-card">
                  <div className="cost-bar">
                    <span className="cost-label">Total Cost</span>
                    <span className="cost-value">
                      <span className="cost-star"><IconStar size={16}/></span>
                      {cost}
                    </span>
                  </div>

                  {/* Gift */}
                  <div>
                    <div className="filter-label">
                      {t.select_gift}
                      <span className="cost-tag"><IconStar size={10}/> 5</span>
                    </div>
                    <div className="gift-search-wrap">
                      <span className="gift-search-icon"><IconSearch size={15}/></span>
                      <input
                        className="gift-search-input"
                        placeholder={t.search_placeholder}
                        value={selectedGift || giftSearch}
                        onChange={e=>{ setGiftSearch(e.target.value); setSelectedGift(null); setGiftDropdown(true); }}
                        onFocus={()=>setGiftDropdown(true)}
                      />
                      {giftDropdown && filteredGifts.length>0 && (
                        <div className="gift-dropdown">
                          {filteredGifts.map(g=>(
                            <div key={g} className={`gift-option ${selectedGift===g?"selected":""}`}
                              onClick={()=>{ setSelectedGift(g); setGiftSearch(g); setGiftDropdown(false); }}>
                              <span className="gift-dot"/>
                              {g}
                              {selectedGift===g && <span className="gift-check"><IconCheck /></span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Model */}
                  <div>
                    <div className="filter-label">
                      {t.select_model}
                      <div className="filter-tags"><span className="optional-tag">{t.optional}</span><span className="cost-tag"><IconStar size={10}/> 5</span></div>
                    </div>
                    <div className="chips">
                      {MODELS.map(m=>(<div key={m} className={`chip ${selectedModel===m?"selected":""}`} onClick={()=>setSelectedModel(selectedModel===m?null:m)}>{m}</div>))}
                    </div>
                  </div>

                  {/* Backdrop */}
                  <div>
                    <div className="filter-label">
                      {t.select_backdrop}
                      <div className="filter-tags"><span className="optional-tag">{t.optional}</span><span className="cost-tag"><IconStar size={10}/> 5</span></div>
                    </div>
                    <div className="chips">
                      {BACKDROPS.map(b=>(<div key={b} className={`chip ${selectedBackdrop===b?"selected":""}`} onClick={()=>setSelectedBackdrop(selectedBackdrop===b?null:b)}>{b}</div>))}
                    </div>
                  </div>

                  {/* Symbol */}
                  <div>
                    <div className="filter-label">
                      {t.select_symbol}
                      <div className="filter-tags"><span className="optional-tag">{t.optional}</span><span className="cost-tag"><IconStar size={10}/> 5</span></div>
                    </div>
                    <div className="chips">
                      {SYMBOLS.map(s=>(<div key={s} className={`chip ${selectedSymbol===s?"selected":""}`} onClick={()=>setSelectedSymbol(selectedSymbol===s?null:s)}>{s}</div>))}
                    </div>
                  </div>

                  {/* Value Range */}
                  <div>
                    <div className="filter-label">
                      {t.value_range}
                      <div className="filter-tags"><span className="optional-tag">{t.optional}</span><span className="cost-tag"><IconStar size={10}/> 10</span></div>
                    </div>
                    <div className="range-row">
                      <input className="range-input" placeholder={t.min} type="number" value={minVal} onChange={e=>setMinVal(e.target.value)} />
                      <input className="range-input" placeholder={t.max} type="number" value={maxVal} onChange={e=>setMaxVal(e.target.value)} />
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <div className="filter-label">{t.duration}</div>
                    <div className="duration-grid">
                      {DURATIONS.map(d=>(
                        <div key={d.value} className={`duration-card ${selectedDuration?.value===d.value?"selected":""}`}
                          onClick={()=>setSelectedDuration(selectedDuration?.value===d.value?null:d)}>
                          <div className="duration-name">{d.label}</div>
                          <div className="duration-stars"><IconStar size={11}/> {d.stars.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button className="launch-btn" onClick={handleLaunch} disabled={cost===0}>
                    {t.launch}{cost>0 ? ` · ${cost} ⭐` : ""}
                  </button>
                  <div className="launch-note">Stars are non-refundable after launch</div>
                </div>
              </div>
            )}

            {/* ─── RADAR TAB ─── */}
            {tab==="radar" && (
              <div className="tab-content">
                <div className="section-title">{t.active}</div>
                {mockActiveScouts.length===0 ? (
                  <div className="glass empty-state">
                    <div className="empty-icon-wrap"><IconRadar size={28}/></div>
                    <div className="empty-text">{t.no_scouts}</div>
                  </div>
                ) : mockActiveScouts.map(s=>(
                  <div key={s.id} className="glass scout-item">
                    <div className="scout-header">
                      <div style={{display:"flex",alignItems:"center",gap:9}}>
                        <div className="pulse-dot" />
                        <span className="scout-name">{s.gift}</span>
                      </div>
                      <span className="badge badge-active">{t.active}</span>
                    </div>
                    <div className="meta-chips">
                      {s.model && <span className="meta-chip">Model: {s.model}</span>}
                      {s.backdrop && <span className="meta-chip">Backdrop: {s.backdrop}</span>}
                      {s.symbol && <span className="meta-chip">Symbol: {s.symbol}</span>}
                      {s.valueRange && <span className="meta-chip">{s.valueRange[0]}–{s.valueRange[1]} ⭐</span>}
                      <span className="meta-chip">{s.duration}</span>
                    </div>
                    <div className="scout-footer">
                      <div>
                        <div className="time-left">{timeLeft(s.endsAt)} left</div>
                        <div className="results-count">{s.results} results found</div>
                      </div>
                      <button className="detail-btn" onClick={()=>setDetailScout(s)}>{t.view_details}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ─── HISTORY TAB ─── */}
            {tab==="history" && (
              <div className="tab-content">
                <div className="section-title">{t.history_tab}</div>
                {mockHistory.length===0 ? (
                  <div className="glass empty-state">
                    <div className="empty-icon-wrap"><IconClock size={28}/></div>
                    <div className="empty-text">{t.no_history}</div>
                  </div>
                ) : mockHistory.map(s=>(
                  <div key={s.id} className="glass history-item">
                    <div className="history-header">
                      <div className="history-name">{s.gift}</div>
                      <div className="history-date">{formatDate(s.completedAt)}</div>
                    </div>
                    <div className="history-filters">
                      {s.model && <span className="meta-chip">Model: {s.model}</span>}
                      {s.backdrop && <span className="meta-chip">Backdrop: {s.backdrop}</span>}
                      {s.symbol && <span className="meta-chip">Symbol: {s.symbol}</span>}
                      {s.valueRange && <span className="meta-chip">{s.valueRange[0]}–{s.valueRange[1]} ⭐</span>}
                      <span className="meta-chip">{s.duration}</span>
                    </div>
                    <div className="history-footer">
                      <span className="stars-cost"><IconStar size={12}/> {s.starsSpent}</span>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:12,color:"var(--text-muted)"}}>{s.results} results</span>
                        <button className="detail-btn" onClick={()=>setDetailScout(s)}>{t.view_details}</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ─── PROFILE TAB ─── */}
            {tab==="profile" && (
              <div className="tab-content">

                {/* Hero card */}
                <div className="profile-hero glass">
                  <div className="profile-hero-bg"/>
                  <div className="profile-hero-content">
                    <div className="profile-avatar-wrap">
                      <div className="avatar-ring">
                        <div className="avatar-ring-inner">
                          <img src={selectedPfp} alt="Profile" className="avatar-pfp-img" />
                        </div>
                      </div>
                      <button className="change-pfp-btn" onClick={()=>setShowPfpPicker(true)}>
                        <IconEdit />
                      </button>
                    </div>
                    <div className="profile-name-row">
                      <div className="profile-name">{tgUser?.first_name || "GiftTrove User"}</div>
                      <div className="profile-id">{t.user_id}: {tgUser?.id || "TG_USER_ID"}</div>
                      <div className="profile-badge-row">
                        <span className="profile-badge">⭐ Scout</span>
                        <span className="profile-badge accent">{t.active}</span>
                      </div>
                    </div>
                  </div>
                  {/* Stats */}
                  <div className="profile-stats">
                    <div className="profile-stat-item">
                      <div className="stat-icon"><IconRadar size={14}/></div>
                      <div className="stat-value">2</div>
                      <div className="stat-label">{t.scouts_run}</div>
                    </div>
                    <div className="profile-stat-item">
                      <div className="stat-icon"><IconStar size={14}/></div>
                      <div className="stat-value" style={{color:"var(--gold)"}}>235</div>
                      <div className="stat-label">{t.total_spent}</div>
                    </div>
                    <div className="profile-stat-item">
                      <div className="stat-icon"><IconTrendUp /></div>
                      <div className="stat-value">19</div>
                      <div className="stat-label">{t.results_found}</div>
                    </div>
                  </div>
                </div>

                {/* Member card */}
                <div className="member-card">
                  <div className="member-icon">🎖</div>
                  <div className="member-info">
                    <div className="member-title">Scout Member</div>
                    <div className="member-sub">{t.member_since} Jan 2025</div>
                  </div>
                  <div className="member-badge">Gold</div>
                </div>

                {/* Stars promo */}
                <a className="stars-promo-wrap"
                  href="https://t.me/hotontgbot/app?startapp=UQDOUQ2TOpZBQ9d9Df-2uOlhzzC82M21MdELmt3Jjcg5aiWx"
                  target="_blank" rel="noreferrer">
                  <img src="https://i.ibb.co/0NR0XcZ/IMG-9518.jpg" alt="Get Stars with Hoton" className="stars-promo-img" />
                </a>

                {/* Links */}
                <div className="profile-links-group">
                  <a className="profile-link-item" href="https://t.me/insidemajek?direct" target="_blank" rel="noreferrer">
                    <div className="link-icon-box red">
                      <img src="https://i.ibb.co/q39SNJmG/Rate-Bot.png" alt="Support" style={{width:36,height:36,objectFit:"contain",borderRadius:10}} />
                    </div>
                    <div style={{flex:1}}>
                      <div className="link-text">{t.support}</div>
                      <div className="link-desc">@insidemajek</div>
                    </div>
                    <span className="link-arrow"><IconChevronRight /></span>
                  </a>
                  <div className="divider-line" />
                  <button className="profile-link-item" onClick={()=>setShowLangPicker(true)}>
                    <div className="link-icon-box">
                      <IconGlobe size={17} />
                    </div>
                    <div style={{flex:1}}>
                      <div className="link-text">Language</div>
                      <div className="link-desc">{LANGS[lang]}</div>
                    </div>
                    <span className="link-arrow"><IconChevronRight /></span>
                  </button>
                  <div className="divider-line" />
                  <button className="profile-link-item" onClick={()=>setDark(d=>!d)}>
                    <div className="link-icon-box">
                      {dark ? <IconSun size={17}/> : <IconMoon size={17}/>}
                    </div>
                    <div style={{flex:1}}>
                      <div className="link-text">{dark ? "Light Mode" : "Dark Mode"}</div>
                      <div className="link-desc">Switch appearance</div>
                    </div>
                    <div style={{
                      width:44, height:26, borderRadius:13, background: dark ? "var(--tg-blue)" : "var(--border)",
                      position:"relative", transition:"background 0.3s", flexShrink:0
                    }}>
                      <div style={{
                        position:"absolute", top:3, left: dark ? 21 : 3, width:20, height:20,
                        borderRadius:"50%", background:"white", transition:"left 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                        boxShadow:"0 1px 4px rgba(0,0,0,0.3)"
                      }}/>
                    </div>
                  </button>
                  <div className="divider-line" />
                  <button className="profile-link-item" onClick={()=>{}}>
                    <div className="link-icon-box">
                      <IconShield />
                    </div>
                    <div style={{flex:1}}>
                      <div className="link-text">Terms & Privacy</div>
                      <div className="link-desc">View legal info</div>
                    </div>
                    <span className="link-arrow"><IconChevronRight /></span>
                  </button>
                </div>

                <div style={{textAlign:"center", marginTop:8, marginBottom:4, fontSize:11, color:"var(--text-muted)"}}>
                  Built by{" "}
                  <a href="https://t.me/insidemajek" style={{color:"var(--tg-blue)",textDecoration:"none"}}>@insidemajek</a>
                  {" "}· v2.0
                </div>
              </div>
            )}
          </div>

          {/* TAB BAR */}
          <div className="tab-bar-wrap">
            <div className="tab-bar">
              {tabs.map(tabItem=>(
                <button key={tabItem.id} className={`tab-item ${tab===tabItem.id?"active":""}`} onClick={()=>setTab(tabItem.id)}>
                  <div className="tab-icon-pill">{tabItem.icon}</div>
                  <span className="tab-label">{tabItem.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
