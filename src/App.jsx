import React, { useState, useEffect, useRef } from "react";

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

const T = {
  EN: {
    terms_title: "Terms & Conditions",
    terms_body: `Welcome to GiftTrove — a Telegram gift scouting tool. By using this service, you agree to the following:\n\n1. GiftTrove is an independent scouting tool and is NOT affiliated with GetGems, Portals, MRKT, or Telegram in any way.\n\n2. All scout payments made in Telegram Stars (XTR) are NON-REFUNDABLE once a scout is launched.\n\n3. GiftTrove provides real-time scouting data from third-party marketplaces. We do not guarantee the availability or accuracy of listings.\n\n4. You must be of legal age in your jurisdiction to use paid features.\n\n5. We reserve the right to update these terms at any time.\n\nBuilt with care by @insidemajek`,
    accept: "Accept & Continue",
    scout_tab: "Scout",
    radar_tab: "Radar",
    history_tab: "History",
    profile_tab: "Profile",
    select_gift: "Select Gift",
    select_model: "Model",
    select_backdrop: "Backdrop",
    select_symbol: "Symbol",
    value_range: "Value Range (Stars)",
    duration: "Scout Duration",
    launch: "Launch Scout",
    free_trial: "Free Trial — 10 min",
    free_trial_desc: "Try 1 filter, no stars needed",
    no_scouts: "No active scouts yet",
    no_history: "No completed scouts",
    stars_needed: "Get Stars with Hoton",
    stars_desc: "Get 30% off via HotOnTG",
    join_channel: "Join Channel",
    community: "Community Chat",
    support: "Support",
    user_id: "User ID",
    search_placeholder: "Search gifts...",
    min: "Min", max: "Max",
    optional: "optional",
    active: "Active",
    completed: "Completed",
    view_details: "Details",
    gift_required: "Please select a gift to scout",
    duration_required: "Please select a duration",
    appearance: "Appearance",
    language: "Language",
    stats_title: "Scout Statistics",
    total_scouts: "Total Scouts",
    stars_spent: "Stars Spent",
  },
  RU: {
    terms_title: "Условия использования",
    terms_body: `Добро пожаловать в GiftTrove — инструмент поиска подарков в Telegram. Используя этот сервис, вы соглашаетесь со следующим:\n\n1. GiftTrove не является аффилиатом GetGems, Portals, MRKT или Telegram.\n\n2. Все платежи в Telegram Stars (XTR) НЕВОЗВРАТНЫ после запуска сканирования.\n\n3. GiftTrove предоставляет данные с маркетплейсов в режиме реального времени без гарантий точности.\n\n4. Вы должны быть совершеннолетним для использования платных функций.\n\n5. Мы оставляем за собой право изменять условия в любое время.\n\nСоздано @insidemajek`,
    accept: "Принять и продолжить",
    scout_tab: "Поиск",
    radar_tab: "Радар",
    history_tab: "История",
    profile_tab: "Профиль",
    select_gift: "Выбрать подарок",
    select_model: "Модель",
    select_backdrop: "Фон",
    select_symbol: "Символ",
    value_range: "Диапазон цен (Stars)",
    duration: "Длительность",
    launch: "Запустить",
    free_trial: "Пробный — 10 мин",
    free_trial_desc: "1 фильтр, без Stars",
    no_scouts: "Нет активных поисков",
    no_history: "Нет завершённых поисков",
    stars_needed: "Получить Stars с Hoton",
    stars_desc: "Скидка 30% через HotOnTG",
    join_channel: "Канал",
    community: "Чат сообщества",
    support: "Поддержка",
    user_id: "ID пользователя",
    search_placeholder: "Поиск подарков...",
    min: "Мин", max: "Макс",
    optional: "необязательно",
    active: "Активен",
    completed: "Завершён",
    view_details: "Подробнее",
    gift_required: "Выберите подарок",
    duration_required: "Выберите длительность",
    appearance: "Внешний вид",
    language: "Язык",
    stats_title: "Статистика",
    total_scouts: "Всего поисков",
    stars_spent: "Потрачено Stars",
  },
  ZH: {
    terms_title: "使用条款",
    terms_body: `欢迎使用 GiftTrove — Telegram 礼品侦测工具。使用本服务即表示您同意以下条款：\n\n1. GiftTrove 与 GetGems、Portals、MRKT 或 Telegram 无任何关联。\n\n2. 一旦启动侦测，所有 Telegram Stars (XTR) 付款均不可退款。\n\n3. GiftTrove 提供来自第三方市场的实时数据，不保证准确性。\n\n4. 您必须达到当地法定年龄才能使用付费功能。\n\n5. 我们保留随时更新条款的权利。\n\n由 @insidemajek 精心打造`,
    accept: "接受并继续",
    scout_tab: "侦测",
    radar_tab: "雷达",
    history_tab: "历史",
    profile_tab: "个人资料",
    select_gift: "选择礼品",
    select_model: "模型",
    select_backdrop: "背景",
    select_symbol: "符号",
    value_range: "价值范围 (Stars)",
    duration: "侦测时长",
    launch: "启动侦测",
    free_trial: "免费试用 — 10分钟",
    free_trial_desc: "1个筛选条件，无需Stars",
    no_scouts: "暂无活跃侦测",
    no_history: "暂无历史记录",
    stars_needed: "通过Hoton获取Stars",
    stars_desc: "通过HotOnTG享受7折优惠",
    join_channel: "加入频道",
    community: "社区群组",
    support: "客服支持",
    user_id: "用户ID",
    search_placeholder: "搜索礼品...",
    min: "最低", max: "最高",
    optional: "可选",
    active: "活跃",
    completed: "已完成",
    view_details: "查看详情",
    gift_required: "请选择礼品",
    duration_required: "请选择侦测时长",
    appearance: "外观",
    language: "语言",
    stats_title: "侦测统计",
    total_scouts: "总侦测次数",
    stars_spent: "消耗 Stars",
  }
};

const mockActiveScouts = [
  { id: 1, gift: "Plush Pepe", model: "Rare", backdrop: null, symbol: null, valueRange: [100, 500], duration: "1h", starsSpent: 30, startedAt: Date.now() - 1200000, endsAt: Date.now() + 2400000, results: 3 },
  { id: 2, gift: "Diamond Ring", model: null, backdrop: "Gold", symbol: "Crown", valueRange: null, duration: "12h", starsSpent: 20, startedAt: Date.now() - 3600000, endsAt: Date.now() + 39600000, results: 7 },
];
const mockHistory = [
  { id: 10, gift: "Durov's Cap", model: "Legendary", backdrop: "Space", symbol: null, valueRange: [500, 2000], duration: "24h", starsSpent: 215, completedAt: Date.now() - 86400000, results: 12 },
  { id: 11, gift: "Voodoo Doll", model: null, backdrop: null, symbol: null, valueRange: null, duration: "1h", starsSpent: 10, completedAt: Date.now() - 172800000, results: 0 },
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
  return new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
const IconSearch = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const IconRadar = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6h.01"/><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/><circle cx="12" cy="12" r="2"/></svg>;
const IconClock = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconUser = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconChevronRight = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const IconStar = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
const IconGlobe = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const IconZap = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
const IconCheck = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconGift = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>;
const IconSun = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const IconMoon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
const IconTrending = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;

// ─── APPLE MORPHISM STYLES ─────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    /* DARK MODE (Default) */
    --bg-base: #000000;
    --bg-gradient-1: rgba(10, 132, 255, 0.15);
    --bg-gradient-2: rgba(48, 209, 88, 0.08);
    --bg-sheet: #1c1c1e;
    --bg-card: rgba(28, 28, 30, 0.55);
    --bg-card-hover: rgba(44, 44, 46, 0.7);
    --tg-blue: #0a84ff;
    --tg-blue-dim: rgba(10, 132, 255, 0.15);
    --tg-blue-glow: rgba(10, 132, 255, 0.4);
    --accent-grad: linear-gradient(135deg, #0a84ff, #30d158);
    --gold: #ffd60a;
    --text-primary: #ffffff;
    --text-secondary: rgba(235, 235, 245, 0.6);
    --text-muted: rgba(235, 235, 245, 0.3);
    --border: rgba(255, 255, 255, 0.1);
    --border-blue: rgba(10, 132, 255, 0.25);
    --shadow-sm: 0 4px 16px rgba(0,0,0,0.2);
    --shadow-lg: 0 12px 40px rgba(0,0,0,0.4);
    --glass-blur: blur(30px) saturate(1.8);
    
    --radius-lg: 24px;
    --radius-md: 16px;
    --radius-sm: 10px;
    --tab-h: 84px;
    --safe-bottom: env(safe-area-inset-bottom, 12px);
    --font: 'Sora', -apple-system, sans-serif;
    --mono: 'JetBrains Mono', monospace;
    --bounce: cubic-bezier(0.32, 0.72, 0, 1);
  }

  [data-theme="light"] {
    --bg-base: #f2f2f7;
    --bg-gradient-1: rgba(0, 122, 255, 0.1);
    --bg-gradient-2: rgba(52, 199, 89, 0.05);
    --bg-sheet: #ffffff;
    --bg-card: rgba(255, 255, 255, 0.65);
    --bg-card-hover: rgba(255, 255, 255, 0.9);
    --tg-blue: #007aff;
    --tg-blue-dim: rgba(0, 122, 255, 0.1);
    --tg-blue-glow: rgba(0, 122, 255, 0.25);
    --accent-grad: linear-gradient(135deg, #007aff, #34c759);
    --gold: #ff9500;
    --text-primary: #000000;
    --text-secondary: rgba(60, 60, 67, 0.65);
    --text-muted: rgba(60, 60, 67, 0.35);
    --border: rgba(0, 0, 0, 0.06);
    --border-blue: rgba(0, 122, 255, 0.15);
    --shadow-sm: 0 4px 16px rgba(0,0,0,0.04);
    --shadow-lg: 0 12px 40px rgba(0,0,0,0.08);
  }

  html, body, #root { height: 100%; overflow: hidden; }

  body {
    font-family: var(--font);
    background: var(--bg-base);
    color: var(--text-primary);
    -webkit-font-smoothing: antialiased;
    overscroll-behavior: none;
    transition: background 0.4s var(--bounce), color 0.4s var(--bounce);
  }

  /* BACKGROUND */
  .bg-canvas {
    position: fixed; inset: 0; z-index: 0;
    background:
      radial-gradient(circle at 15% 10%, var(--bg-gradient-1) 0%, transparent 50%),
      radial-gradient(circle at 85% 90%, var(--bg-gradient-2) 0%, transparent 50%);
    transition: all 0.5s ease;
  }
  .bg-noise {
    position: fixed; inset: 0; z-index: 0; opacity: 0.03;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    pointer-events: none;
  }

  /* LAYOUT */
  .app { position: fixed; inset: 0; z-index: 1; display: flex; flex-direction: column; overflow: hidden; }

  .content-area {
    flex: 1; overflow-y: auto; overflow-x: hidden;
    padding: 16px 20px calc(var(--tab-h) + var(--safe-bottom) + 20px);
    scroll-behavior: smooth;
  }
  .content-area::-webkit-scrollbar { display: none; }

  /* GLASS CARD (Apple Morphism) */
  .glass {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    box-shadow: var(--shadow-sm);
    transition: transform 0.3s var(--bounce), background 0.3s ease;
  }

  /* HEADER */
  .header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 20px 10px; flex-shrink: 0;
  }
  .logo-img { height: 28px; object-fit: contain; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.1)); }

  /* TAB BAR (Floating Pill Style) */
  .tab-bar-wrap {
    position: fixed; bottom: var(--safe-bottom); left: 20px; right: 20px; z-index: 60;
  }
  .tab-bar {
    display: flex; align-items: center; justify-content: space-around;
    padding: 8px; height: 68px; border-radius: 34px;
    background: var(--bg-card); border: 1px solid var(--border);
    backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
    box-shadow: var(--shadow-lg);
  }
  .tab-item {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 100%; border-radius: 26px; cursor: pointer; border: none; background: none;
    color: var(--text-muted); font-family: var(--font); transition: all 0.3s var(--bounce);
  }
  .tab-item.active { color: var(--text-primary); background: var(--bg-card-hover); box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
  .tab-icon-pill { margin-bottom: 2px; transition: transform 0.3s var(--bounce); }
  .tab-item.active .tab-icon-pill { transform: translateY(-2px); color: var(--tg-blue); filter: drop-shadow(0 2px 6px var(--tg-blue-glow)); }
  .tab-label { font-size: 10px; font-weight: 700; letter-spacing: 0.3px; }

  /* TYPOGRAPHY & CHIPS */
  .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; color: var(--text-muted); margin-bottom: 12px; padding-left: 4px; }
  .filter-label { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
  .optional-tag { font-size: 11px; color: var(--text-muted); font-weight: 500; }
  .cost-tag { font-size: 11px; color: var(--tg-blue); font-weight: 700; background: var(--tg-blue-dim); padding: 4px 8px; border-radius: 12px; display: flex; align-items: center; gap: 4px; }
  
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip {
    padding: 10px 16px; border-radius: 100px; font-size: 13px; font-weight: 600;
    cursor: pointer; border: 1px solid var(--border); background: var(--bg-sheet);
    color: var(--text-secondary); transition: all 0.25s var(--bounce);
  }
  .chip:active { transform: scale(0.92); }
  .chip.selected { background: var(--tg-blue); border-color: var(--tg-blue); color: white; box-shadow: 0 4px 12px var(--tg-blue-glow); }

  /* INPUTS */
  .gift-search-wrap { position: relative; }
  .gift-search-input {
    width: 100%; padding: 14px 16px 14px 44px; border-radius: var(--radius-md);
    background: var(--bg-sheet); border: 1px solid var(--border);
    color: var(--text-primary); font-family: var(--font); font-size: 15px; outline: none; transition: all 0.3s;
  }
  .gift-search-input:focus { border-color: var(--tg-blue); box-shadow: 0 0 0 4px var(--tg-blue-dim); }
  .gift-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
  
  /* BUTTONS */
  .launch-btn {
    width: 100%; padding: 18px; border-radius: var(--radius-md); border: none; cursor: pointer;
    font-family: var(--font); font-size: 16px; font-weight: 700; color: white;
    background: var(--accent-grad); box-shadow: 0 6px 20px var(--tg-blue-glow);
    transition: all 0.3s var(--bounce); display: flex; align-items: center; justify-content: center; gap: 10px;
  }
  .launch-btn:active { transform: scale(0.96); box-shadow: 0 2px 10px var(--tg-blue-glow); }
  .launch-btn:disabled { opacity: 0.5; filter: grayscale(1); transform: none; box-shadow: none; cursor: not-allowed; }

  /* ── PROFILE IOS SETTINGS STYLE ── */
  .profile-hero {
    display: flex; flex-direction: column; align-items: center; text-align: center;
    padding: 30px 20px 20px;
  }
  .avatar-ring {
    width: 90px; height: 90px; border-radius: 50%; padding: 4px;
    background: var(--accent-grad);
    box-shadow: 0 8px 30px var(--tg-blue-glow);
    margin-bottom: 16px; position: relative;
  }
  .avatar-pfp-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 3px solid var(--bg-base); }
  .change-pfp-badge {
    position: absolute; bottom: 0; right: 0; width: 28px; height: 28px; border-radius: 50%;
    background: var(--bg-sheet); border: 2px solid var(--bg-base);
    display: flex; align-items: center; justify-content: center; color: var(--text-primary); cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2); transition: transform 0.2s;
  }
  .change-pfp-badge:active { transform: scale(0.9); }
  .profile-name { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
  .profile-id { font-family: var(--mono); font-size: 13px; color: var(--text-muted); margin-top: 4px; }

  .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .stat-card {
    padding: 16px; border-radius: var(--radius-md); text-align: center;
    background: var(--bg-card); border: 1px solid var(--border);
    backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
  }
  .stat-value { font-size: 24px; font-weight: 800; color: var(--text-primary); font-family: var(--mono); margin-bottom: 4px; display: flex; align-items: center; justify-content: center; gap: 6px; }
  .stat-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }

  .ios-group {
    background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border);
    backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
    overflow: hidden; margin-bottom: 24px; box-shadow: var(--shadow-sm);
  }
  .ios-row {
    display: flex; align-items: center; justify-content: space-between; padding: 16px 20px;
    border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.2s;
  }
  .ios-row:active { background: var(--bg-card-hover); }
  .ios-row:last-child { border-bottom: none; }
  .ios-row-left { display: flex; align-items: center; gap: 14px; font-size: 15px; font-weight: 600; }
  .ios-icon-wrap {
    width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white;
  }
  .ios-row-right { display: flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 15px; }

  /* MODALS & SHEETS */
  .modal-overlay {
    position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.4);
    backdrop-filter: blur(8px); display: flex; align-items: flex-end;
  }
  .modal-sheet {
    width: 100%; max-height: 85vh; border-radius: 32px 32px 0 0; padding: 12px 24px 40px; overflow-y: auto;
    background: var(--bg-sheet); border-top: 1px solid var(--border);
    box-shadow: 0 -10px 40px rgba(0,0,0,0.2); animation: slideUp 0.4s var(--bounce);
  }
  .modal-handle { width: 48px; height: 5px; background: var(--border); border-radius: 100px; margin: 0 auto 20px; }

  /* PFP Grid */
  .pfp-picker-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 10px; }
  .pfp-picker-item { aspect-ratio: 1; border-radius: 20px; overflow: hidden; position: relative; border: 3px solid transparent; transition: all 0.2s var(--bounce); }
  .pfp-picker-item:active { transform: scale(0.92); }
  .pfp-picker-item.selected { border-color: var(--tg-blue); box-shadow: 0 4px 20px var(--tg-blue-glow); transform: scale(1.05); z-index: 2; }
  .pfp-picker-img { width: 100%; height: 100%; object-fit: cover; }

  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes tabIn { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .tab-content { animation: tabIn 0.4s var(--bounce); }
`;

const PFP_LIST = [
  "https://i.ibb.co/MDD7WHhT/IMG-9516.jpg",
  "https://i.ibb.co/kVzjLRSL/IMG-9512.jpg",
  "https://i.ibb.co/Xfr1tC5d/IMG-9515.jpg",
  "https://i.ibb.co/35WD1M57/IMG-9505.jpg",
  "https://i.ibb.co/9HN04Srz/IMG-9504.jpg",
  "https://i.ibb.co/4nL8fd5h/IMG-9507.jpg",
  "https://i.ibb.co/0jhtCPp8/IMG-9517.jpg",
  "https://i.ibb.co/0NR0XcZ/IMG-9518.jpg",
];

export default function App() {
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("gt_theme") || "dark"; } catch { return "dark"; }
  });
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("gt_lang") || "EN"; } catch { return "EN"; }
  });
  const [tab, setTab] = useState("scout");
  const [toast, setToast] = useState(null);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [selectedPfp, setSelectedPfp] = useState(() => {
    try { return localStorage.getItem("gt_pfp") || PFP_LIST[0]; } catch { return PFP_LIST[0]; }
  });
  const [showPfpPicker, setShowPfpPicker] = useState(false);

  // Scout States
  const [giftSearch, setGiftSearch] = useState("");
  const [selectedGift, setSelectedGift] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedBackdrop, setSelectedBackdrop] = useState(null);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [minVal, setMinVal] = useState("");
  const [maxVal, setMaxVal] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(null);

  const t = T[lang];
  const tgUser = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initDataUnsafe?.user : null;

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem("gt_theme", theme); } catch {}
  }, [theme]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500); // Sped up loading
    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");

  const cost = (selectedGift ? 5 : 0)
    + (selectedModel ? FILTER_COSTS.model : 0)
    + (selectedBackdrop ? FILTER_COSTS.backdrop : 0)
    + (selectedSymbol ? FILTER_COSTS.symbol : 0)
    + ((minVal || maxVal) ? FILTER_COSTS.valueRange : 0)
    + (selectedDuration ? selectedDuration.stars : 0);

  const filteredGifts = GIFTS.filter(g => g.toLowerCase().includes(giftSearch.toLowerCase()));

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleLaunch() {
    if (!selectedGift) { showToast(t.gift_required); return; }
    if (!selectedDuration) { showToast(t.duration_required); return; }
    showToast(`Scout launched for ${selectedGift}! (${cost} Stars)`);
    setTab("radar");
  }

  const tabs = [
    { id: "scout", icon: <IconSearch />, label: t.scout_tab },
    { id: "radar", icon: <IconRadar />, label: t.radar_tab },
    { id: "history", icon: <IconClock />, label: t.history_tab },
    { id: "profile", icon: <IconUser />, label: t.profile_tab },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="bg-canvas" />
      <div className="bg-noise" />

      {loading && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
          <img src="https://i.ibb.co/KptJ4843/Untitled-design-2.png" alt="Loading" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* PFP PICKER MODAL */}
      {showPfpPicker && (
        <div className="modal-overlay" onClick={() => setShowPfpPicker(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ fontSize: 18, fontWeight: 800, textAlign: 'center', marginBottom: 20 }}>Choose Avatar</div>
            <div className="pfp-picker-grid">
              {PFP_LIST.map((url, i) => (
                <div key={i} className={`pfp-picker-item ${selectedPfp === url ? "selected" : ""}`} onClick={() => { setSelectedPfp(url); try{localStorage.setItem("gt_pfp", url)}catch{}; setShowPfpPicker(false); }}>
                  <img src={url} alt={`Avatar ${i}`} className="pfp-picker-img" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LANG PICKER MODAL */}
      {showLangPicker && (
        <div className="modal-overlay" onClick={() => setShowLangPicker(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ fontSize: 18, fontWeight: 800, textAlign: 'center', marginBottom: 20 }}>Select Language</div>
            {Object.entries(LANGS).map(([k, v]) => (
              <div key={k} onClick={() => { setLang(k); try{localStorage.setItem("gt_lang", k)}catch{}; setShowLangPicker(false); }}
                style={{ padding: "16px 20px", borderRadius: 16, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between", background: lang === k ? "var(--tg-blue)" : "var(--bg-card)", color: lang === k ? "#fff" : "var(--text-primary)", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
                {v} {lang === k && <IconCheck />}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && (
        <div className="app">
          {/* HEADER */}
          <div className="header">
            <img src="https://i.ibb.co/tP162vk7/Untitled-design-4.png" alt="GiftTrove" className="logo-img" />
          </div>

          {/* CONTENT */}
          <div className="content-area">
            {tab === "scout" && (
              <div className="tab-content">
                <div className="section-title">{t.scout_tab}</div>
                <div className="glass" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
                  
                  {/* Total Cost Display */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--tg-blue-dim)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-blue)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Scout Payload Cost</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 800, color: 'var(--tg-blue)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--gold)' }}><IconStar /></span> {cost}
                    </span>
                  </div>

                  {/* Gift Search */}
                  <div>
                    <div className="filter-label">{t.select_gift} <span className="cost-tag"><IconStar /> 5</span></div>
                    <div className="gift-search-wrap">
                      <span className="gift-search-icon"><IconSearch /></span>
                      <input className="gift-search-input" placeholder={t.search_placeholder} value={selectedGift || giftSearch} onChange={e => { setGiftSearch(e.target.value); setSelectedGift(null); }} />
                    </div>
                    {giftSearch && !selectedGift && (
                      <div style={{ marginTop: 8, background: 'var(--bg-sheet)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                        {filteredGifts.map(g => (
                          <div key={g} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontWeight: 500 }} onClick={() => { setSelectedGift(g); setGiftSearch(g); }}>{g}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Filters (Models, Backdrop, Symbol) */}
                  {[
                    { label: t.select_model, opts: MODELS, state: selectedModel, set: setSelectedModel },
                    { label: t.select_backdrop, opts: BACKDROPS, state: selectedBackdrop, set: setSelectedBackdrop },
                    { label: t.select_symbol, opts: SYMBOLS, state: selectedSymbol, set: setSelectedSymbol }
                  ].map((filter, i) => (
                    <div key={i}>
                      <div className="filter-label">{filter.label} <div style={{display:'flex', gap:6}}><span className="optional-tag">{t.optional}</span><span className="cost-tag"><IconStar /> 5</span></div></div>
                      <div className="chips">
                        {filter.opts.map(opt => (
                          <div key={opt} className={`chip ${filter.state === opt ? "selected" : ""}`} onClick={() => filter.set(filter.state === opt ? null : opt)}>{opt}</div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Durations Grid */}
                  <div>
                    <div className="filter-label">{t.duration}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {DURATIONS.map(d => (
                        <div key={d.value} onClick={() => setSelectedDuration(d)} style={{ padding: 16, borderRadius: 'var(--radius-md)', cursor: 'pointer', border: `2px solid ${selectedDuration?.value === d.value ? 'var(--tg-blue)' : 'var(--border)'}`, background: selectedDuration?.value === d.value ? 'var(--tg-blue-dim)' : 'var(--bg-sheet)', transition: 'all 0.2s' }}>
                          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{d.label}</div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 4 }}><IconStar /> {d.stars}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button className="launch-btn" onClick={handleLaunch} disabled={cost === 0}>
                    <IconZap /> {t.launch}
                  </button>
                </div>
              </div>
            )}

            {tab === "radar" && (
              <div className="tab-content">
                <div className="section-title">{t.radar_tab}</div>
                {mockActiveScouts.map(s => (
                  <div key={s.id} className="glass" style={{ padding: 20, marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{s.gift}</div>
                      <div style={{ background: 'var(--tg-blue-dim)', color: 'var(--tg-blue)', padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, border: '1px solid var(--border-blue)' }}>{t.active}</div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                      {s.model && <div className="chip" style={{ padding: '6px 12px', fontSize: 11 }}>{s.model}</div>}
                      {s.backdrop && <div className="chip" style={{ padding: '6px 12px', fontSize: 11 }}>{s.backdrop}</div>}
                      <div className="chip" style={{ padding: '6px 12px', fontSize: 11 }}>{s.duration}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--tg-blue)', fontWeight: 600 }}>{timeLeft(s.endsAt)}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.results} hits found</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "history" && (
              <div className="tab-content">
                <div className="section-title">{t.history_tab}</div>
                {mockHistory.map(s => (
                  <div key={s.id} className="glass" style={{ padding: 20, marginBottom: 16, opacity: 0.8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{s.gift}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(s.completedAt)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 4 }}><IconStar /> {s.starsSpent}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.results} hits</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── REDESIGNED PROFILE TAB ── */}
            {tab === "profile" && (
              <div className="tab-content">
                
                {/* Hero Section */}
                <div className="profile-hero">
                  <div className="avatar-ring">
                    <img src={selectedPfp} alt="Profile" className="avatar-pfp-img" />
                    <div className="change-pfp-badge" onClick={() => setShowPfpPicker(true)}>
                      <IconSettings size={14} /> 
                    </div>
                  </div>
                  <div className="profile-name">{tgUser?.first_name || "GiftTrove Builder"}</div>
                  <div className="profile-id">ID: {tgUser?.id || "TG_USER_101"}</div>
                </div>

                {/* Stats Section */}
                <div className="section-title">{t.stats_title}</div>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value"><IconTrending /> 24</div>
                    <div className="stat-label">{t.total_scouts}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--gold)' }}><IconStar /> 845</div>
                    <div className="stat-label">{t.stars_spent}</div>
                  </div>
                </div>

                {/* General Settings (iOS List Style) */}
                <div className="section-title">General</div>
                <div className="ios-group">
                  <div className="ios-row" onClick={toggleTheme}>
                    <div className="ios-row-left">
                      <div className="ios-icon-wrap" style={{ background: theme === 'dark' ? '#000' : '#ff9500' }}>
                        {theme === 'dark' ? <IconMoon /> : <IconSun />}
                      </div>
                      {t.appearance}
                    </div>
                    <div className="ios-row-right">
                      {theme === 'dark' ? 'Dark' : 'Light'} <IconChevronRight />
                    </div>
                  </div>
                  
                  <div className="ios-row" onClick={() => setShowLangPicker(true)}>
                    <div className="ios-row-left">
                      <div className="ios-icon-wrap" style={{ background: '#34c759' }}>
                        <IconGlobe />
                      </div>
                      {t.language}
                    </div>
                    <div className="ios-row-right">
                      {LANGS[lang]} <IconChevronRight />
                    </div>
                  </div>
                </div>

                {/* Community & Support */}
                <div className="section-title">Community</div>
                <div className="ios-group">
                  <a href="https://t.me/insidemajek?direct" target="_blank" rel="noreferrer" className="ios-row" style={{ textDecoration: 'none' }}>
                    <div className="ios-row-left">
                      <div className="ios-icon-wrap" style={{ background: '#ff3b30' }}>
                        <IconUser />
                      </div>
                      {t.support}
                    </div>
                    <div className="ios-row-right"><IconChevronRight /></div>
                  </a>
                  
                  <a href="https://t.me/+Op7gLVniX9Y1OTRk" target="_blank" rel="noreferrer" className="ios-row" style={{ textDecoration: 'none' }}>
                    <div className="ios-row-left">
                      <div className="ios-icon-wrap" style={{ background: '#007aff' }}>
                        <IconSearch />
                      </div>
                      {t.community}
                    </div>
                    <div className="ios-row-right"><IconChevronRight /></div>
                  </a>
                </div>

                <div style={{ textAlign: "center", marginTop: 32, fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
                  Built by <a href="https://t.me/insidemajek" style={{ color: "var(--tg-blue)", textDecoration: "none" }}>@insidemajek</a>
                </div>
              </div>
            )}
          </div>

          {/* FLOATING TAB BAR */}
          <div className="tab-bar-wrap">
            <div className="tab-bar">
              {tabs.map(tabItem => (
                <button key={tabItem.id} className={`tab-item ${tab === tabItem.id ? "active" : ""}`} onClick={() => setTab(tabItem.id)}>
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

// Quick helper icon for the settings cog on PFP
function IconSettings({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
    </svg>
  );
}
