import { useState, useEffect, useRef } from "react";

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────
const GIFTS = [
  "Plush Pepe","Durov's Cap","Jelly Bunny","Magic Potion","Loot Bag",
  "Vintage Cigar","Eternal Candle","Homemade Cake","Sharp Tongue",
  "Spy Agaric","Sakura Flower","Spiced Wine","Diamond Ring","Evil Eye",
  "Frightful Egg","Astral Shard","Trapped Heart","Skeleton Watch",
  "Voodoo Doll","Hypno Lollipop","Tama Gotchi","Bunny Muffin",
  "Cookie Heart","Witch Hat","Witch Hat"
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
    terms_body: `Welcome to GiftTrove — a Telegram gift scouting tool. By using this service, you agree to the following:\n\n1. GiftTrove is an independent scouting tool and is NOT affiliated with GetGems, Portals, MRKT, or Telegram in any way.\n\n2. All scout payments made in Telegram Stars (XTR) are NON-REFUNDABLE once a scout is launched.\n\n3. GiftTrove provides real-time scouting data from third-party marketplaces. We do not guarantee the availability or accuracy of listings.\n\n4. You must be of legal age in your jurisdiction to use paid features.\n\n5. We reserve the right to update these terms at any time.\n\nBuilt with ❤️ by @insidemajek`,
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
    stars_needed: "Need Stars?",
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
    stars_needed: "Нужны Stars?",
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
    stars_needed: "需要Stars？",
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
  }
};

// ─── MOCK DATA ─────────────────────────────────────────────────────────────────
const mockActiveScouts = [
  { id: 1, gift: "Plush Pepe", model: "Rare", backdrop: null, symbol: null, valueRange: [100, 500], duration: "1h", starsSpent: 30, startedAt: Date.now() - 1200000, endsAt: Date.now() + 2400000, results: 3 },
  { id: 2, gift: "Diamond Ring", model: null, backdrop: "Gold", symbol: "Crown", valueRange: null, duration: "12h", starsSpent: 20, startedAt: Date.now() - 3600000, endsAt: Date.now() + 39600000, results: 7 },
];
const mockHistory = [
  { id: 10, gift: "Durov's Cap", model: "Legendary", backdrop: "Space", symbol: null, valueRange: [500, 2000], duration: "24h", starsSpent: 215, completedAt: Date.now() - 86400000, results: 12 },
  { id: 11, gift: "Voodoo Doll", model: null, backdrop: null, symbol: null, valueRange: null, duration: "1h", starsSpent: 10, completedAt: Date.now() - 172800000, results: 0 },
];

// ─── HELPERS ───────────────────────────────────────────────────────────────────
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

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --g50: #F3F9EC; --g100: #E4F2D5; --g200: #CAE7AF; --g300: #A8D680;
    --g400: #89C358; --g500: #76BB40; --g600: #51862A; --g700: #3F6724;
    --g800: #355222; --g900: #2F4720; --g950: #16260D;
    --glass-bg: rgba(22, 38, 13, 0.55);
    --glass-border: rgba(168, 214, 128, 0.18);
    --glass-highlight: rgba(168, 214, 128, 0.08);
    --text-primary: #E4F2D5;
    --text-secondary: rgba(228, 242, 213, 0.6);
    --accent: #89C358;
    --accent-glow: rgba(137, 195, 88, 0.35);
    --danger: #e05c5c;
    --font: 'Outfit', sans-serif;
    --mono: 'DM Mono', monospace;
    --radius: 18px;
    --tab-h: 72px;
    --safe-bottom: env(safe-area-inset-bottom, 0px);
  }

  html, body, #root { height: 100%; overflow: hidden; }

  body {
    font-family: var(--font);
    background: var(--g950);
    color: var(--text-primary);
    -webkit-font-smoothing: antialiased;
    overscroll-behavior: none;
  }

  /* ── BACKGROUND ── */
  .bg-canvas {
    position: fixed; inset: 0; z-index: 0;
    background:
      radial-gradient(ellipse 80% 60% at 20% 10%, rgba(81,134,42,0.22) 0%, transparent 65%),
      radial-gradient(ellipse 60% 50% at 80% 80%, rgba(63,103,36,0.18) 0%, transparent 65%),
      radial-gradient(ellipse 100% 80% at 50% 50%, rgba(22,38,13,0.95) 0%, #0d1a07 100%);
  }
  .bg-grid {
    position: fixed; inset: 0; z-index: 0; opacity: 0.04;
    background-image: linear-gradient(var(--g500) 1px, transparent 1px),
      linear-gradient(90deg, var(--g500) 1px, transparent 1px);
    background-size: 32px 32px;
  }

  /* ── LAYOUT ── */
  .app {
    position: fixed; inset: 0; z-index: 1;
    display: flex; flex-direction: column;
    overflow: hidden;
  }

  .content-area {
    flex: 1; overflow-y: auto; overflow-x: hidden;
    padding: 16px 16px calc(var(--tab-h) + var(--safe-bottom) + 16px);
    scroll-behavior: smooth;
  }
  .content-area::-webkit-scrollbar { display: none; }

  /* ── GLASS CARD ── */
  .glass {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius);
    backdrop-filter: blur(24px) saturate(1.4);
    -webkit-backdrop-filter: blur(24px) saturate(1.4);
  }
  .glass-inner {
    background: var(--glass-highlight);
    border: 1px solid rgba(168,214,128,0.1);
    border-radius: 12px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  /* ── TERMS SCREEN ── */
  .terms-overlay {
    position: fixed; inset: 0; z-index: 100;
    display: flex; align-items: flex-end; justify-content: center;
    background: rgba(13,26,7,0.85);
    backdrop-filter: blur(8px);
    padding: 0;
  }
  .terms-sheet {
    width: 100%; max-height: 88vh;
    border-radius: 24px 24px 0 0;
    padding: 24px;
    display: flex; flex-direction: column; gap: 16px;
    animation: slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1);
  }
  .terms-drag { width: 40px; height: 4px; background: var(--glass-border); border-radius: 99px; margin: 0 auto -8px; }
  .terms-title { font-size: 20px; font-weight: 700; color: var(--g300); }
  .terms-scroll { flex: 1; overflow-y: auto; font-size: 13px; line-height: 1.7; color: var(--text-secondary); white-space: pre-line; max-height: 45vh; }
  .terms-scroll::-webkit-scrollbar { display: none; }
  .lang-row { display: flex; gap: 8px; justify-content: flex-end; flex-shrink: 0; }
  .lang-btn {
    font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 99px; cursor: pointer; border: none;
    background: var(--glass-highlight); color: var(--text-secondary); border: 1px solid var(--glass-border); transition: all 0.2s;
  }
  .lang-btn.active { background: var(--g600); color: var(--g100); border-color: var(--g500); }

  /* ── HEADER ── */
  .header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px 8px;
    flex-shrink: 0;
  }
  .logo { display: flex; align-items: center; gap: 8px; }
  .logo-icon {
    width: 34px; height: 34px; border-radius: 10px;
    background: linear-gradient(135deg, var(--g600), var(--g400));
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; box-shadow: 0 2px 12px var(--accent-glow);
  }
  .logo-text { font-size: 18px; font-weight: 700; color: var(--g200); letter-spacing: -0.3px; }
  .header-right { display: flex; align-items: center; gap: 8px; }
  .lang-pill {
    font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 99px;
    background: var(--glass-highlight); border: 1px solid var(--glass-border);
    color: var(--text-secondary); cursor: pointer;
  }

  /* ── FREE TRIAL BUBBLE ── */
  .trial-bubble {
    position: fixed; bottom: calc(var(--tab-h) + var(--safe-bottom) + 12px); right: 16px;
    z-index: 50; cursor: pointer;
    animation: float 3s ease-in-out infinite;
  }
  .trial-bubble-inner {
    background: linear-gradient(135deg, var(--g700), var(--g600));
    border: 1px solid var(--g500);
    border-radius: 50px; padding: 8px 14px;
    display: flex; align-items: center; gap: 6px;
    box-shadow: 0 4px 20px rgba(81,134,42,0.4);
    font-size: 12px; font-weight: 600; color: var(--g100);
  }

  /* ── TAB BAR ── */
  .tab-bar {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 60;
    height: calc(var(--tab-h) + var(--safe-bottom));
    padding-bottom: var(--safe-bottom);
    background: rgba(13,26,7,0.85);
    border-top: 1px solid var(--glass-border);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    display: flex; align-items: flex-start; justify-content: space-around;
    padding-top: 6px;
  }
  .tab-item {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px;
    cursor: pointer; padding: 6px 4px; border-radius: 12px; transition: all 0.2s;
    border: none; background: none; color: var(--text-secondary);
  }
  .tab-item.active { color: var(--accent); }
  .tab-item.active .tab-icon-wrap {
    background: rgba(137,195,88,0.15);
    box-shadow: 0 0 12px var(--accent-glow);
  }
  .tab-icon-wrap {
    width: 36px; height: 28px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; transition: all 0.2s;
  }
  .tab-label { font-size: 10px; font-weight: 600; letter-spacing: 0.2px; }

  /* ── SECTION TITLE ── */
  .section-title { font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--g500); margin-bottom: 6px; padding-left: 4px; }
  .section-gap { margin-bottom: 12px; }

  /* ── SCOUT TAB ── */
  .scout-card { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .cost-bar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; border-radius: 12px;
    background: rgba(137,195,88,0.08); border: 1px solid rgba(137,195,88,0.2);
  }
  .cost-label { font-size: 12px; color: var(--text-secondary); }
  .cost-value { font-family: var(--mono); font-size: 20px; font-weight: 500; color: var(--accent); }
  .cost-star { font-size: 14px; margin-left: 2px; }

  /* Gift search */
  .gift-search-wrap { position: relative; }
  .gift-search-input {
    width: 100%; padding: 11px 14px 11px 38px;
    background: var(--glass-highlight); border: 1px solid var(--glass-border);
    border-radius: 12px; color: var(--text-primary); font-family: var(--font); font-size: 14px;
    outline: none; transition: border-color 0.2s;
  }
  .gift-search-input:focus { border-color: var(--g500); }
  .gift-search-input::placeholder { color: var(--text-secondary); }
  .gift-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 15px; color: var(--text-secondary); }
  .gift-dropdown {
    position: absolute; left: 0; right: 0; top: calc(100% + 4px); z-index: 20;
    max-height: 200px; overflow-y: auto; border-radius: 12px;
    border: 1px solid var(--glass-border);
    background: rgba(22,38,13,0.97); backdrop-filter: blur(20px);
  }
  .gift-dropdown::-webkit-scrollbar { display: none; }
  .gift-option {
    padding: 10px 14px; font-size: 14px; cursor: pointer; transition: background 0.15s;
    display: flex; align-items: center; gap: 8px;
  }
  .gift-option:hover, .gift-option.selected { background: rgba(137,195,88,0.12); color: var(--g300); }
  .gift-option.selected::after { content: "✓"; margin-left: auto; color: var(--accent); font-weight: 700; }

  /* Filter chips */
  .filter-label { font-size: 12px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; }
  .optional-tag { font-size: 10px; color: var(--g600); font-weight: 400; }
  .cost-tag { font-size: 10px; color: var(--g500); font-weight: 600; background: rgba(137,195,88,0.1); padding: 2px 6px; border-radius: 99px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    padding: 6px 12px; border-radius: 99px; font-size: 13px; font-weight: 500;
    cursor: pointer; transition: all 0.2s; border: 1px solid var(--glass-border);
    background: var(--glass-highlight); color: var(--text-secondary);
    user-select: none; -webkit-user-select: none;
  }
  .chip:active { transform: scale(0.95); }
  .chip.selected { background: rgba(137,195,88,0.2); border-color: var(--g500); color: var(--g200); }

  /* Value range */
  .range-row { display: flex; gap: 8px; }
  .range-input {
    flex: 1; padding: 10px 12px; border-radius: 10px; font-size: 14px; font-family: var(--font);
    background: var(--glass-highlight); border: 1px solid var(--glass-border);
    color: var(--text-primary); outline: none; transition: border-color 0.2s;
  }
  .range-input:focus { border-color: var(--g500); }
  .range-input::placeholder { color: var(--text-secondary); font-size: 12px; }

  /* Duration */
  .duration-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .duration-card {
    padding: 12px; border-radius: 12px; cursor: pointer; transition: all 0.2s;
    border: 1px solid var(--glass-border); background: var(--glass-highlight);
    display: flex; flex-direction: column; gap: 2px;
    user-select: none; -webkit-user-select: none;
  }
  .duration-card:active { transform: scale(0.97); }
  .duration-card.selected { border-color: var(--g500); background: rgba(137,195,88,0.15); }
  .duration-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
  .duration-stars { font-size: 12px; color: var(--g500); font-family: var(--mono); }

  /* Launch button */
  .launch-btn {
    width: 100%; padding: 16px; border-radius: 14px; border: none; cursor: pointer;
    font-family: var(--font); font-size: 16px; font-weight: 700;
    background: linear-gradient(135deg, var(--g500), var(--g400));
    color: white; letter-spacing: 0.3px;
    box-shadow: 0 4px 24px rgba(118,187,64,0.4);
    transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .launch-btn:active { transform: scale(0.98); box-shadow: 0 2px 12px rgba(118,187,64,0.3); }
  .launch-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .launch-note { text-align: center; font-size: 11px; color: var(--text-secondary); margin-top: 4px; }

  /* ── RADAR TAB ── */
  .scout-item {
    padding: 14px; border-radius: 14px; display: flex; flex-direction: column; gap: 8px;
    margin-bottom: 10px; position: relative; overflow: hidden;
  }
  .scout-item-header { display: flex; align-items: center; justify-content: space-between; }
  .scout-item-name { font-size: 15px; font-weight: 700; color: var(--g200); }
  .badge {
    font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 99px; letter-spacing: 0.5px;
  }
  .badge-active { background: rgba(137,195,88,0.2); color: var(--g400); border: 1px solid var(--g600); }
  .badge-done { background: rgba(228,242,213,0.08); color: var(--text-secondary); border: 1px solid var(--glass-border); }
  .scout-item-meta { display: flex; flex-wrap: wrap; gap: 6px; }
  .meta-chip { font-size: 11px; padding: 2px 8px; border-radius: 99px; background: rgba(137,195,88,0.08); border: 1px solid rgba(137,195,88,0.15); color: var(--g300); }
  .scout-item-footer { display: flex; align-items: center; justify-content: space-between; }
  .time-left { font-family: var(--mono); font-size: 12px; color: var(--g500); }
  .results-count { font-size: 12px; color: var(--text-secondary); }
  .detail-btn {
    font-size: 12px; font-weight: 600; padding: 5px 12px; border-radius: 8px; cursor: pointer;
    background: rgba(137,195,88,0.12); border: 1px solid var(--g600); color: var(--g300);
    font-family: var(--font); transition: all 0.2s;
  }
  .detail-btn:active { transform: scale(0.96); }
  .pulse-dot {
    width: 6px; height: 6px; border-radius: 50%; background: var(--accent);
    animation: pulse 2s ease-in-out infinite; flex-shrink: 0;
  }
  .empty-state {
    padding: 48px 24px; text-align: center; display: flex; flex-direction: column;
    align-items: center; gap: 12px;
  }
  .empty-icon { font-size: 48px; opacity: 0.3; }
  .empty-text { font-size: 14px; color: var(--text-secondary); }

  /* ── HISTORY TAB ── */
  .history-item { padding: 14px; border-radius: 14px; margin-bottom: 10px; }
  .history-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
  .history-name { font-size: 14px; font-weight: 700; color: var(--g200); }
  .history-date { font-size: 11px; color: var(--text-secondary); }
  .history-filters { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
  .history-footer { display: flex; justify-content: space-between; align-items: center; }
  .stars-cost { font-family: var(--mono); font-size: 13px; color: var(--g500); }
  .results-num { font-size: 12px; color: var(--text-secondary); }

  /* ── PROFILE TAB ── */
  .profile-header { padding: 20px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .avatar {
    width: 64px; height: 64px; border-radius: 20px;
    background: linear-gradient(135deg, var(--g700), var(--g500));
    display: flex; align-items: center; justify-content: center; font-size: 28px;
    box-shadow: 0 4px 20px var(--accent-glow);
  }
  .profile-name { font-size: 18px; font-weight: 700; color: var(--g200); }
  .profile-id { font-family: var(--mono); font-size: 12px; color: var(--text-secondary); }
  .profile-links { display: flex; flex-direction: column; gap: 8px; }
  .profile-link {
    padding: 14px 16px; border-radius: 14px; display: flex; align-items: center; gap: 12px;
    cursor: pointer; text-decoration: none; color: var(--text-primary);
    transition: background 0.2s; border: none; background: none; width: 100%; font-family: var(--font);
  }
  .profile-link:active { background: var(--glass-highlight); }
  .link-icon { font-size: 20px; width: 32px; text-align: center; }
  .link-text { font-size: 14px; font-weight: 500; flex: 1; text-align: left; }
  .link-arrow { color: var(--text-secondary); font-size: 14px; }
  .stars-promo {
    padding: 16px; border-radius: 14px; display: flex; align-items: center; gap: 12px;
    border: 1px solid rgba(255,200,0,0.2); background: rgba(255,200,0,0.04); cursor: pointer;
    text-decoration: none; color: var(--text-primary);
  }
  .promo-icon { font-size: 28px; }
  .promo-text { flex: 1; }
  .promo-title { font-size: 14px; font-weight: 700; color: #ffd700; }
  .promo-sub { font-size: 12px; color: var(--text-secondary); }
  .divider { height: 1px; background: var(--glass-border); margin: 4px 0; }

  /* ── MODAL ── */
  .modal-overlay {
    position: fixed; inset: 0; z-index: 80;
    background: rgba(13,26,7,0.8); backdrop-filter: blur(8px);
    display: flex; align-items: flex-end;
    animation: fadeIn 0.2s ease;
  }
  .modal-sheet {
    width: 100%; max-height: 80vh; border-radius: 24px 24px 0 0;
    padding: 20px; overflow-y: auto;
    animation: slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1);
  }
  .modal-sheet::-webkit-scrollbar { display: none; }
  .modal-handle { width: 40px; height: 4px; background: var(--glass-border); border-radius: 99px; margin: 0 auto 16px; }
  .modal-title { font-size: 16px; font-weight: 700; color: var(--g200); margin-bottom: 16px; }
  .modal-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(168,214,128,0.07); }
  .modal-label { font-size: 12px; color: var(--text-secondary); }
  .modal-value { font-size: 13px; font-weight: 600; color: var(--g300); }
  .close-btn {
    width: 100%; padding: 13px; border-radius: 12px; border: 1px solid var(--glass-border);
    background: var(--glass-highlight); color: var(--text-secondary); font-family: var(--font);
    font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 16px;
  }

  /* ── TOAST ── */
  .toast {
    position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 200;
    padding: 10px 18px; border-radius: 99px; font-size: 13px; font-weight: 600;
    background: var(--g700); border: 1px solid var(--g600); color: var(--g100);
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    animation: toastIn 0.3s ease, toastOut 0.3s ease 2.7s forwards;
    white-space: nowrap;
  }

  /* ── ANIMATIONS ── */
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
  @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  @keyframes toastOut { from { opacity: 1; } to { opacity: 0; } }
`;

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [termsAccepted, setTermsAccepted] = useState(() => localStorage.getItem("gt_terms") === "1");
  const [lang, setLang] = useState(() => localStorage.getItem("gt_lang") || "EN");
  const [tab, setTab] = useState("scout");
  const [showTrialBubble, setShowTrialBubble] = useState(true);
  const [toast, setToast] = useState(null);
  const [detailScout, setDetailScout] = useState(null);
  const [showLangPicker, setShowLangPicker] = useState(false);

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
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

  // Compute cost
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

  function acceptTerms() {
    localStorage.setItem("gt_terms", "1");
    setTermsAccepted(true);
  }

  function changeLang(l) {
    setLang(l);
    localStorage.setItem("gt_lang", l);
    setShowLangPicker(false);
  }

  function handleLaunch() {
    if (!selectedGift) { showToast(t.gift_required); return; }
    if (!selectedDuration) { showToast(t.duration_required); return; }
    // In production: invoke Telegram Stars payment
    showToast(`🚀 Scout launched for ${selectedGift}! (${cost}⭐)`);
    // Reset form
    setSelectedGift(null); setGiftSearch(""); setSelectedModel(null);
    setSelectedBackdrop(null); setSelectedSymbol(null);
    setMinVal(""); setMaxVal(""); setSelectedDuration(null);
    setTab("radar");
  }

  function handleFreeTrial() {
    showToast("🆓 Free 10-min trial started!");
    setShowTrialBubble(false);
    setTab("radar");
  }

  const tabs = [
    { id: "scout", icon: "🔍", label: t.scout_tab },
    { id: "radar", icon: "📡", label: t.radar_tab },
    { id: "history", icon: "📋", label: t.history_tab },
    { id: "profile", icon: "👤", label: t.profile_tab },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="bg-canvas" />
      <div className="bg-grid" />

      {/* TERMS */}
      {!termsAccepted && (
        <div className="terms-overlay">
          <div className="glass terms-sheet">
            <div className="terms-drag" />
            <div className="lang-row">
              {Object.keys(LANGS).map(l => (
                <button key={l} className={`lang-btn ${lang === l ? "active" : ""}`} onClick={() => setLang(l)}>{l}</button>
              ))}
            </div>
            <div className="terms-title">🎁 {t.terms_title}</div>
            <div className="terms-scroll">{t.terms_body}</div>
            <button className="launch-btn" onClick={acceptTerms}>{t.accept}</button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && <div className="toast">{toast}</div>}

      {/* DETAIL MODAL */}
      {detailScout && (
        <div className="modal-overlay" onClick={() => setDetailScout(null)}>
          <div className="glass modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">🎯 {detailScout.gift}</div>
            {detailScout.model && <div className="modal-row"><span className="modal-label">{t.select_model}</span><span className="modal-value">{detailScout.model}</span></div>}
            {detailScout.backdrop && <div className="modal-row"><span className="modal-label">{t.select_backdrop}</span><span className="modal-value">{detailScout.backdrop}</span></div>}
            {detailScout.symbol && <div className="modal-row"><span className="modal-label">{t.select_symbol}</span><span className="modal-value">{detailScout.symbol}</span></div>}
            {detailScout.valueRange && <div className="modal-row"><span className="modal-label">{t.value_range}</span><span className="modal-value">{detailScout.valueRange[0]}–{detailScout.valueRange[1]}</span></div>}
            <div className="modal-row"><span className="modal-label">{t.duration}</span><span className="modal-value">{detailScout.duration}</span></div>
            <div className="modal-row"><span className="modal-label">Stars Spent</span><span className="modal-value">⭐ {detailScout.starsSpent}</span></div>
            <div className="modal-row"><span className="modal-label">Results Found</span><span className="modal-value">{detailScout.results} listings</span></div>
            {detailScout.endsAt && <div className="modal-row"><span className="modal-label">Time Left</span><span className="modal-value">{timeLeft(detailScout.endsAt)}</span></div>}
            {detailScout.completedAt && <div className="modal-row"><span className="modal-label">Completed</span><span className="modal-value">{formatDate(detailScout.completedAt)}</span></div>}
            <button className="close-btn" onClick={() => setDetailScout(null)}>Close</button>
          </div>
        </div>
      )}

      {/* LANG PICKER */}
      {showLangPicker && (
        <div className="modal-overlay" onClick={() => setShowLangPicker(false)}>
          <div className="glass modal-sheet" onClick={e => e.stopPropagation()} style={{padding: "20px"}}>
            <div className="modal-handle" />
            <div className="modal-title">🌐 Language</div>
            {Object.entries(LANGS).map(([k, v]) => (
              <div key={k} className="profile-link glass-inner" style={{marginBottom: 6}} onClick={() => changeLang(k)}>
                <span className="link-text">{v}</span>
                {lang === k && <span style={{color: "var(--accent)"}}>✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="app">
        {/* HEADER */}
        <div className="header">
          <div className="logo">
            <div className="logo-icon">🎁</div>
            <span className="logo-text">GiftTrove</span>
          </div>
          <div className="header-right">
            <button className="lang-pill" onClick={() => setShowLangPicker(true)}>{lang} 🌐</button>
          </div>
        </div>

        {/* FREE TRIAL BUBBLE */}
        {showTrialBubble && tab === "scout" && (
          <div className="trial-bubble" onClick={handleFreeTrial}>
            <div className="trial-bubble-inner">
              🆓 {t.free_trial}
            </div>
          </div>
        )}

        {/* CONTENT */}
        <div className="content-area">

          {/* ── SCOUT TAB ── */}
          {tab === "scout" && (
            <>
              <div className="section-title section-gap">{t.scout_tab}</div>
              <div className="glass scout-card">
                {/* Cost bar */}
                <div className="cost-bar">
                  <span className="cost-label">Total Cost</span>
                  <span className="cost-value">⭐ {cost}<span className="cost-star"></span></span>
                </div>

                {/* Gift selector */}
                <div>
                  <div className="filter-label">{t.select_gift} <span className="cost-tag">5⭐</span></div>
                  <div className="gift-search-wrap">
                    <span className="gift-search-icon">🎁</span>
                    <input
                      className="gift-search-input"
                      placeholder={t.search_placeholder}
                      value={selectedGift || giftSearch}
                      onChange={e => { setGiftSearch(e.target.value); setSelectedGift(null); setGiftDropdown(true); }}
                      onFocus={() => setGiftDropdown(true)}
                    />
                    {giftDropdown && filteredGifts.length > 0 && (
                      <div className="gift-dropdown">
                        {filteredGifts.map(g => (
                          <div key={g} className={`gift-option ${selectedGift === g ? "selected" : ""}`}
                            onClick={() => { setSelectedGift(g); setGiftSearch(g); setGiftDropdown(false); }}>
                            🎁 {g}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Model */}
                <div>
                  <div className="filter-label">{t.select_model} <div style={{display:"flex",gap:4}}><span className="optional-tag">{t.optional}</span><span className="cost-tag">5⭐</span></div></div>
                  <div className="chips">
                    {MODELS.map(m => (
                      <div key={m} className={`chip ${selectedModel === m ? "selected" : ""}`}
                        onClick={() => setSelectedModel(selectedModel === m ? null : m)}>{m}</div>
                    ))}
                  </div>
                </div>

                {/* Backdrop */}
                <div>
                  <div className="filter-label">{t.select_backdrop} <div style={{display:"flex",gap:4}}><span className="optional-tag">{t.optional}</span><span className="cost-tag">5⭐</span></div></div>
                  <div className="chips">
                    {BACKDROPS.map(b => (
                      <div key={b} className={`chip ${selectedBackdrop === b ? "selected" : ""}`}
                        onClick={() => setSelectedBackdrop(selectedBackdrop === b ? null : b)}>{b}</div>
                    ))}
                  </div>
                </div>

                {/* Symbol */}
                <div>
                  <div className="filter-label">{t.select_symbol} <div style={{display:"flex",gap:4}}><span className="optional-tag">{t.optional}</span><span className="cost-tag">5⭐</span></div></div>
                  <div className="chips">
                    {SYMBOLS.map(s => (
                      <div key={s} className={`chip ${selectedSymbol === s ? "selected" : ""}`}
                        onClick={() => setSelectedSymbol(selectedSymbol === s ? null : s)}>{s}</div>
                    ))}
                  </div>
                </div>

                {/* Value range */}
                <div>
                  <div className="filter-label">{t.value_range} <div style={{display:"flex",gap:4}}><span className="optional-tag">{t.optional}</span><span className="cost-tag">10⭐</span></div></div>
                  <div className="range-row">
                    <input className="range-input" placeholder={t.min} type="number" value={minVal} onChange={e => setMinVal(e.target.value)} />
                    <input className="range-input" placeholder={t.max} type="number" value={maxVal} onChange={e => setMaxVal(e.target.value)} />
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <div className="filter-label">{t.duration}</div>
                  <div className="duration-grid">
                    {DURATIONS.map(d => (
                      <div key={d.value} className={`duration-card ${selectedDuration?.value === d.value ? "selected" : ""}`}
                        onClick={() => setSelectedDuration(selectedDuration?.value === d.value ? null : d)}>
                        <div className="duration-name">{d.label}</div>
                        <div className="duration-stars">⭐ {d.stars.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Launch */}
                <button className="launch-btn" onClick={handleLaunch} disabled={cost === 0}>
                  🚀 {t.launch} {cost > 0 ? `· ⭐${cost}` : ""}
                </button>
                <div className="launch-note">⭐ Stars are non-refundable after launch</div>
              </div>
            </>
          )}

          {/* ── RADAR TAB ── */}
          {tab === "radar" && (
            <>
              <div className="section-title section-gap">{t.active}</div>
              {mockActiveScouts.length === 0 ? (
                <div className="glass empty-state">
                  <div className="empty-icon">📡</div>
                  <div className="empty-text">{t.no_scouts}</div>
                </div>
              ) : mockActiveScouts.map(s => (
                <div key={s.id} className="glass scout-item">
                  <div className="scout-item-header">
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div className="pulse-dot" />
                      <span className="scout-item-name">{s.gift}</span>
                    </div>
                    <span className="badge badge-active">{t.active}</span>
                  </div>
                  <div className="scout-item-meta">
                    {s.model && <span className="meta-chip">Model: {s.model}</span>}
                    {s.backdrop && <span className="meta-chip">Backdrop: {s.backdrop}</span>}
                    {s.symbol && <span className="meta-chip">Symbol: {s.symbol}</span>}
                    {s.valueRange && <span className="meta-chip">{s.valueRange[0]}–{s.valueRange[1]}⭐</span>}
                    <span className="meta-chip">{s.duration}</span>
                  </div>
                  <div className="scout-item-footer">
                    <div>
                      <div className="time-left">⏳ {timeLeft(s.endsAt)} left</div>
                      <div className="results-count">{s.results} results found</div>
                    </div>
                    <button className="detail-btn" onClick={() => setDetailScout(s)}>{t.view_details}</button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── HISTORY TAB ── */}
          {tab === "history" && (
            <>
              <div className="section-title section-gap">{t.history_tab}</div>
              {mockHistory.length === 0 ? (
                <div className="glass empty-state">
                  <div className="empty-icon">📋</div>
                  <div className="empty-text">{t.no_history}</div>
                </div>
              ) : mockHistory.map(s => (
                <div key={s.id} className="glass history-item">
                  <div className="history-header">
                    <div className="history-name">{s.gift}</div>
                    <div className="history-date">{formatDate(s.completedAt)}</div>
                  </div>
                  <div className="history-filters">
                    {s.model && <span className="meta-chip">Model: {s.model}</span>}
                    {s.backdrop && <span className="meta-chip">Backdrop: {s.backdrop}</span>}
                    {s.symbol && <span className="meta-chip">Symbol: {s.symbol}</span>}
                    {s.valueRange && <span className="meta-chip">{s.valueRange[0]}–{s.valueRange[1]}⭐</span>}
                    <span className="meta-chip">{s.duration}</span>
                  </div>
                  <div className="history-footer">
                    <span className="stars-cost">⭐ {s.starsSpent} stars</span>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span className="results-num">{s.results} results</span>
                      <button className="detail-btn" onClick={() => setDetailScout(s)}>{t.view_details}</button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── PROFILE TAB ── */}
          {tab === "profile" && (
            <>
              <div className="glass profile-header">
                <div className="avatar">👤</div>
                <div className="profile-name">{tgUser?.first_name || "GiftTrove User"}</div>
                <div className="profile-id">{t.user_id}: {tgUser?.id || "TG_USER_ID"}</div>
              </div>

              <div style={{height:12}} />

              {/* Stars promo */}
              <a className="glass stars-promo" href="https://t.me/hotontgbot/app?startapp=UQDOUQ2TOpZBQ9d9Df-2uOlhzzC82M21MdELmt3Jjcg5aiWx" target="_blank" rel="noreferrer" style={{display:"flex",marginBottom:12}}>
                <span className="promo-icon">⭐</span>
                <div className="promo-text">
                  <div className="promo-title">{t.stars_needed}</div>
                  <div className="promo-sub">{t.stars_desc}</div>
                </div>
                <span className="link-arrow">›</span>
              </a>

              <div className="glass profile-links">
                <a className="profile-link" href="https://t.me/insidemajek" target="_blank" rel="noreferrer">
                  <span className="link-icon">📢</span>
                  <span className="link-text">{t.join_channel}</span>
                  <span className="link-arrow">›</span>
                </a>
                <div className="divider" />
                <a className="profile-link" href="https://t.me/+Op7gLVniX9Y1OTRk" target="_blank" rel="noreferrer">
                  <span className="link-icon">💬</span>
                  <span className="link-text">{t.community}</span>
                  <span className="link-arrow">›</span>
                </a>
                <div className="divider" />
                <a className="profile-link" href="https://t.me/insidemajek?direct" target="_blank" rel="noreferrer">
                  <span className="link-icon">🆘</span>
                  <span className="link-text">{t.support}</span>
                  <span className="link-arrow">›</span>
                </a>
              </div>

              <div style={{textAlign:"center",marginTop:20,fontSize:11,color:"var(--text-secondary)"}}>
                Built by <a href="https://t.me/insidemajek" style={{color:"var(--g500)",textDecoration:"none"}}>@insidemajek</a>
              </div>
            </>
          )}
        </div>

        {/* TAB BAR */}
        <div className="tab-bar">
          {tabs.map(t => (
            <button key={t.id} className={`tab-item ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
              <div className="tab-icon-wrap">{t.icon}</div>
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
