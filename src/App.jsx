import React, { useState, useEffect } from "react";

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────
const GIFTS = [
  "Plush Pepe", "Durov's Cap", "Jelly Bunny", "Magic Potion", "Loot Bag",
  "Vintage Cigar", "Eternal Candle", "Homemade Cake", "Sharp Tongue",
  "Spy Agaric", "Sakura Flower", "Spiced Wine", "Diamond Ring", "Evil Eye",
  "Frightful Egg", "Astral Shard", "Trapped Heart", "Skeleton Watch",
  "Voodoo Doll", "Hypno Lollipop", "Tama Gotchi", "Bunny Muffin",
  "Cookie Heart", "Witch Hat"
];

const MODELS = ["Common", "Rare", "Epic", "Legendary", "Mythical"];
const BACKDROPS = ["Space", "Nature", "Urban", "Abstract", "Fire", "Ice", "Gold", "Neon"];
const SYMBOLS = ["Moon", "Star", "Sun", "Heart", "Diamond", "Skull", "Crown", "Lightning"];
const MARKETPLACES = ["All", "GetGems", "Portals", "MRKT", "Telegram"];

const LANGS = { EN: "English", RU: "Русский", ZH: "中文" };

const T = {
  EN: {
    scout_tab: "Scout", events_tab: "Events", saved_tab: "Saved", profile_tab: "Profile",
    fastest_way: "The fastest way to find any Telegram Gift.",
    gift_name: "Gift Name", specific_id: "Specific ID", optional: "(Optional)",
    marketplaces: "Marketplaces", attributes: "Attributes", model: "Model", backdrop: "Backdrop", symbol: "Symbol",
    scout_gift: "Scout Gift", results: "Results", found: "found",
    no_events: "There is no event ongoing", check_back: "Check back later for market drops.",
    no_saved: "No gifts saved yet.",
    community: "Community", support: "Support", comm_chat: "Community Chat", comm_channel: "Community Channel",
    support_builder: "Support the Builder", donate: "Donate",
    donate_desc: "GiftTrove was created free. Kindly input the amount of GRAM you'd like to donate.",
    amount_gram: "Amount (GRAM)", verify_tx: "Verify Transaction", tx_id: "Transaction ID",
    thank_you: "Thank you for your generous support!",
    referrals: "Referrals", copy_ref: "Copy Referral Link", ref_count: "Referral Count",
    any: "Any"
  },
  RU: {
    scout_tab: "Поиск", events_tab: "События", saved_tab: "Сохраненное", profile_tab: "Профиль",
    fastest_way: "Самый быстрый способ найти любой Telegram Подарок.",
    gift_name: "Имя подарка", specific_id: "Конкретный ID", optional: "(Необязательно)",
    marketplaces: "Маркетплейсы", attributes: "Атрибуты", model: "Модель", backdrop: "Фон", symbol: "Символ",
    scout_gift: "Искать подарок", results: "Результаты", found: "найдено",
    no_events: "Нет текущих событий", check_back: "Загляните позже.",
    no_saved: "Пока нет сохраненных подарков.",
    community: "Сообщество", support: "Поддержка", comm_chat: "Чат сообщества", comm_channel: "Канал сообщества",
    support_builder: "Поддержать создателя", donate: "Пожертвовать",
    donate_desc: "GiftTrove бесплатен. Введите сумму GRAM для пожертвования.",
    amount_gram: "Сумма (GRAM)", verify_tx: "Проверить транзакцию", tx_id: "ID транзакции",
    thank_you: "Спасибо за вашу щедрую поддержку!",
    referrals: "Рефералы", copy_ref: "Копировать ссылку", ref_count: "Количество рефералов",
    any: "Любой"
  },
  ZH: {
    scout_tab: "侦测", events_tab: "活动", saved_tab: "已保存", profile_tab: "个人资料",
    fastest_way: "查找任何 Telegram 礼物的最快方法。",
    gift_name: "礼物名称", specific_id: "特定 ID", optional: "(可选)",
    marketplaces: "市场", attributes: "属性", model: "模型", backdrop: "背景", symbol: "符号",
    scout_gift: "侦测礼物", results: "结果", found: "已找到",
    no_events: "当前没有活动", check_back: "请稍后回来查看市场掉落。",
    no_saved: "暂无保存的礼物。",
    community: "社区", support: "客服支持", comm_chat: "社区群组", comm_channel: "社区频道",
    support_builder: "支持开发者", donate: "捐赠",
    donate_desc: "GiftTrove 是免费的。请输入您想捐赠的 GRAM 数量。",
    amount_gram: "数量 (GRAM)", verify_tx: "验证交易", tx_id: "交易 ID",
    thank_you: "感谢您的慷慨支持！",
    referrals: "推荐", copy_ref: "复制推荐链接", ref_count: "推荐人数",
    any: "任何"
  }
};

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
const IconSearch = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const IconCalendar = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
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

// ─── APPLE MORPHISM STYLES ─────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg-base: #000000;
    --bg-desktop: #000000;
    --bg-gradient: radial-gradient(120% 120% at 50% -20%, rgba(10, 132, 255, 0.15) 0%, #000000 100%);
    --bg-sheet: rgba(28, 28, 30, 0.75);
    --bg-card: rgba(28, 28, 30, 0.5);
    --bg-input: rgba(44, 44, 46, 0.6);
    --bg-hover: rgba(58, 58, 60, 0.8);
    --text-primary: #ffffff;
    --text-secondary: rgba(235, 235, 245, 0.6);
    --border: rgba(255, 255, 255, 0.1);
    --tg-blue: #0a84ff;
    --blur: blur(40px) saturate(200%);
    
    --radius-xl: 32px;
    --radius-lg: 20px;
    --radius-md: 14px;
    --tab-h: 84px;
    --safe-bottom: env(safe-area-inset-bottom, 16px);
    --font: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
    --bounce: cubic-bezier(0.32, 0.72, 0, 1);
  }

  [data-theme="light"] {
    --bg-base: #f2f2f7;
    --bg-desktop: #e5e5ea;
    --bg-gradient: radial-gradient(120% 120% at 50% -20%, rgba(0, 122, 255, 0.08) 0%, #f2f2f7 100%);
    --bg-sheet: rgba(255, 255, 255, 0.85);
    --bg-card: rgba(255, 255, 255, 0.6);
    --bg-input: rgba(118, 118, 128, 0.12);
    --bg-hover: rgba(0, 0, 0, 0.05);
    --text-primary: #000000;
    --text-secondary: rgba(60, 60, 67, 0.6);
    --border: rgba(0, 0, 0, 0.05);
    --tg-blue: #007aff;
  }

  body {
    font-family: var(--font);
    background: var(--bg-desktop);
    color: var(--text-primary);
    -webkit-font-smoothing: antialiased;
    overscroll-behavior: none;
    transition: background 0.4s ease, color 0.4s ease;
  }

  /* Desktop View Wrap */
  .app-wrapper {
    display: flex; justify-content: center; min-height: 100vh; width: 100vw; overflow: hidden;
  }

  .app-container { 
    width: 100%; max-width: 480px; height: 100vh; display: flex; flex-direction: column; position: relative; 
    background: var(--bg-base); background-image: var(--bg-gradient); background-attachment: fixed;
    box-shadow: 0 0 40px rgba(0,0,0,0.2);
  }

  /* TOP NAVBAR */
  .top-nav {
    display: flex; justify-content: space-between; align-items: center;
    padding: 16px 24px; z-index: 50;
  }
  .top-icons { display: flex; gap: 16px; }
  .icon-btn {
    background: var(--bg-card); backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    border: 1px solid var(--border); border-radius: 50%; width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-primary);
    transition: transform 0.2s var(--bounce);
  }
  .icon-btn:active { transform: scale(0.9); }

  /* CONTENT AREA */
  .content {
    flex: 1; overflow-y: auto; overflow-x: hidden;
    padding: 0 24px calc(var(--tab-h) + var(--safe-bottom) + 20px);
  }
  .content::-webkit-scrollbar { display: none; }

  /* TYPOGRAPHY */
  .hero-title {
    font-size: 34px; font-weight: 800; letter-spacing: -1px; line-height: 1.15;
    margin-bottom: 24px; transition: opacity 0.3s, transform 0.3s;
  }
  .section-label {
    font-size: 15px; font-weight: 600; color: var(--text-primary);
    margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;
  }
  
  /* INPUTS & CONTROLS */
  .input-group { margin-bottom: 24px; position: relative; }
  .ios-input {
    width: 100%; padding: 18px 20px; border-radius: var(--radius-lg);
    background: var(--bg-input); border: 1px solid transparent;
    color: var(--text-primary); font-size: 17px; outline: none;
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    transition: all 0.3s; font-family: var(--font);
  }
  .ios-input:focus { border-color: var(--tg-blue); background: var(--bg-card); }
  
  /* AUTOCOMPLETE DROPDOWN */
  .suggestions-dropdown {
    position: absolute; top: 100%; left: 0; right: 0; z-index: 10;
    background: var(--bg-sheet); backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    border: 1px solid var(--border); border-radius: var(--radius-lg);
    max-height: 200px; overflow-y: auto; margin-top: 8px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  }
  .suggestions-dropdown::-webkit-scrollbar { display: none; }
  .suggestion-item {
    padding: 14px 20px; border-bottom: 1px solid var(--border); cursor: pointer;
    font-size: 16px; font-weight: 600; color: var(--text-primary);
  }
  .suggestion-item:last-child { border-bottom: none; }
  .suggestion-item:active { background: var(--bg-hover); }

  /* SELECT BUTTON (For Modals) */
  .select-btn {
    display: flex; justify-content: space-between; align-items: center;
    width: 100%; padding: 16px 20px; border-radius: var(--radius-lg);
    background: var(--bg-card); border: 1px solid var(--border);
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    font-size: 17px; font-weight: 500; cursor: pointer; color: var(--text-primary);
    transition: transform 0.2s var(--bounce), background 0.2s;
  }
  .select-btn:active { transform: scale(0.98); background: var(--bg-hover); }
  .select-val { color: var(--tg-blue); font-weight: 600; display: flex; align-items: center; gap: 4px; }

  /* MARKETPLACE CHIPS */
  .chips-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; }
  .chip {
    padding: 12px 18px; border-radius: 100px; font-size: 15px; font-weight: 600;
    background: var(--bg-card); border: 1px solid var(--border);
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    color: var(--text-secondary); cursor: pointer; transition: all 0.2s var(--bounce);
  }
  .chip:active { transform: scale(0.92); }
  .chip.active { background: var(--text-primary); color: var(--bg-base); border-color: transparent; }

  /* LAUNCH BUTTON */
  .action-btn {
    width: 100%; padding: 20px; border-radius: var(--radius-xl); border: none;
    background: var(--tg-blue); color: #fff; font-size: 18px; font-weight: 700;
    box-shadow: 0 8px 24px rgba(10, 132, 255, 0.3); cursor: pointer;
    transition: all 0.3s var(--bounce); margin-top: 10px;
  }
  .action-btn:active { transform: scale(0.96); box-shadow: 0 4px 12px rgba(10, 132, 255, 0.2); }
  .action-btn:disabled { opacity: 0.5; filter: grayscale(1); }

  /* BOTTOM TAB BAR */
  .tab-bar-container { position: absolute; bottom: var(--safe-bottom); left: 24px; right: 24px; z-index: 40; }
  .ios-tab-bar {
    display: flex; justify-content: space-around; align-items: center;
    height: 72px; border-radius: 36px; padding: 0 8px;
    background: var(--bg-sheet); border: 1px solid var(--border);
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
  }
  .tab-btn {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    border: none; background: transparent; color: var(--text-secondary);
    font-family: var(--font); cursor: pointer; transition: color 0.3s, transform 0.3s var(--bounce);
  }
  .tab-btn.active { color: var(--tg-blue); }
  .tab-icon { margin-bottom: 4px; transition: transform 0.3s var(--bounce); }
  .tab-btn.active .tab-icon { transform: translateY(-3px) scale(1.1); }
  .tab-label { font-size: 10px; font-weight: 700; letter-spacing: 0.2px; }

  /* IOS BOTTOM SHEET */
  .sheet-overlay {
    position: absolute; inset: 0; z-index: 100; background: rgba(0,0,0,0.4);
    backdrop-filter: blur(5px); display: flex; align-items: flex-end;
    opacity: 0; animation: fadeIn 0.3s forwards;
  }
  .sheet-content {
    width: 100%; max-height: 80vh; border-radius: 32px 32px 0 0; padding: 12px 24px 40px;
    background: var(--bg-sheet); border-top: 1px solid var(--border);
    backdrop-filter: blur(50px) saturate(200%); -webkit-backdrop-filter: blur(50px) saturate(200%);
    transform: translateY(100%); animation: slideUp 0.4s var(--bounce) forwards; overflow-y: auto;
  }
  .sheet-content::-webkit-scrollbar { display: none; }
  .sheet-handle { width: 40px; height: 5px; border-radius: 100px; background: var(--text-secondary); margin: 0 auto 24px; opacity: 0.5; }
  .sheet-title { font-size: 22px; font-weight: 800; margin-bottom: 20px; text-align: center; }
  
  .sheet-list-item {
    padding: 18px 20px; font-size: 17px; font-weight: 600; border-bottom: 1px solid var(--border);
    display: flex; justify-content: space-between; align-items: center; cursor: pointer;
    color: var(--text-primary);
  }
  .sheet-list-item:active { background: var(--bg-hover); }
  .sheet-list-item:last-child { border-bottom: none; }

  /* IOS GROUPED LIST */
  .ios-group {
    border-radius: var(--radius-lg); background: var(--bg-card); border: 1px solid var(--border);
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    overflow: hidden; margin-bottom: 24px;
  }
  .ios-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 20px; border-bottom: 1px solid var(--border); cursor: pointer;
    font-size: 17px; font-weight: 500; transition: background 0.2s;
  }
  .ios-row:active { background: var(--bg-hover); }
  .ios-row:last-child { border-bottom: none; }
  .row-left { display: flex; align-items: center; gap: 16px; }
  .row-icon-box {
    width: 32px; height: 32px; border-radius: 8px; display: flex;
    align-items: center; justify-content: center; color: white;
  }

  /* TOAST */
  .toast {
    position: absolute; top: 16px; left: 50%; transform: translateX(-50%); z-index: 200;
    padding: 12px 24px; border-radius: 100px; font-size: 15px; font-weight: 600;
    background: var(--bg-sheet); border: 1px solid var(--border); color: var(--text-primary);
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
    animation: toastIn 0.3s ease, toastOut 0.3s ease 2.7s forwards;
    white-space: nowrap;
  }

  /* ANIMATIONS */
  @keyframes fadeIn { to { opacity: 1; } }
  @keyframes slideUp { to { transform: translateY(0); } }
  .fade-in-up { animation: fadeInUp 0.5s var(--bounce) forwards; }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  @keyframes toastOut { from { opacity: 1; } to { opacity: 0; } }

  /* RESULTS GRID */
  .results-grid {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 16px;
  }
  .result-card {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 16px; position: relative;
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    display: flex; flex-direction: column; transition: transform 0.2s var(--bounce);
    cursor: pointer;
  }
  .result-card:active { transform: scale(0.96); }
`;

export default function App() {
  // Persistence via LocalStorage
  const [theme, setTheme] = useState(() => localStorage.getItem("gt_theme") || "dark");
  const [lang, setLang] = useState(() => localStorage.getItem("gt_lang") || "EN");
  const [savedGifts, setSavedGifts] = useState(() => {
    const saved = localStorage.getItem("gt_saved");
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeTab, setActiveTab] = useState("scout");
  const [toast, setToast] = useState(null);
  
  // App Flow State
  const [isSearching, setIsSearching] = useState(false);
  const [activeSheet, setActiveSheet] = useState(null); 
  const [selectedGift, setSelectedGift] = useState(null); // For details modal
  
  // Search Form State
  const [giftQuery, setGiftQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [giftId, setGiftId] = useState("");
  const [selectedMarkets, setSelectedMarkets] = useState(["All"]);
  const [selectedModel, setSelectedModel] = useState("Any");
  const [selectedBackdrop, setSelectedBackdrop] = useState("Any");
  const [selectedSymbol, setSelectedSymbol] = useState("Any");
  
  // Donate Flow State
  const [donateStep, setDonateStep] = useState(1);
  const [donateAmount, setDonateAmount] = useState("");
  const [donateWallet, setDonateWallet] = useState("TonKeeper");
  const [donateTx, setDonateTx] = useState("");

  const t = T[lang] || T["EN"];
  const tgUser = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initDataUnsafe?.user : { id: 12345678, first_name: "Scout" };

  // Effect Bindings for Persistence
  useEffect(() => {
    localStorage.setItem("gt_theme", theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("gt_lang", lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem("gt_saved", JSON.stringify(savedGifts));
  }, [savedGifts]);

  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");
  
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleMarketToggle = (m) => {
    if (m === "All") { setSelectedMarkets(["All"]); return; }
    let newMarkets = selectedMarkets.filter(x => x !== "All");
    if (newMarkets.includes(m)) {
      newMarkets = newMarkets.filter(x => x !== m);
      if (newMarkets.length === 0) newMarkets = ["All"];
    } else {
      newMarkets.push(m);
    }
    setSelectedMarkets(newMarkets);
  };

  const handleScout = () => setIsSearching(true);

  const toggleSave = (gift) => {
    const isSaved = savedGifts.some(g => g.id === gift.id);
    if (isSaved) {
      setSavedGifts(savedGifts.filter(g => g.id !== gift.id));
      showToast("Removed from Saved");
    } else {
      setSavedGifts([...savedGifts, gift]);
      showToast("Gift Saved!");
    }
  };

  const handleBuy = (e) => {
    e.stopPropagation();
    window.open("https://getgems.io/gifts", "_blank");
  };

  const copyReferral = () => {
    const link = `https://t.me/gifttrovebot?startapp=${tgUser?.id || "demo"}`;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(link);
    }
    showToast("Copied to clipboard!");
  };

  const executeDonate = () => {
    const address = "UQCvd6Sw_JJQsedBGfR2JOn7it7VdREWQ7v3kIluUi0RPMXJ";
    const amountNano = (parseFloat(donateAmount) || 0) * 1e9;
    let url = `ton://transfer/${address}?amount=${amountNano}&text=Donation`;
    
    if (donateWallet === "Tg wallet") url = `https://t.me/wallet?startattach=ton_transfer-${address}`;
    window.open(url, '_blank');
    setDonateStep(2);
  };

  // Autocomplete filtering
  const filteredGifts = GIFTS.filter(g => g.toLowerCase().includes(giftQuery.toLowerCase()));

  // Mock Results Data Generation
  const generateMockResults = () => {
    return [1, 2, 3, 4].map(i => ({
      id: i,
      name: giftQuery || "Durov's Cap",
      model: i === 1 ? "Rare" : i === 2 ? "Legendary" : "Common",
      symbol: i === 1 ? "Star" : i === 2 ? "Crown" : "Heart",
      backdrop: i === 1 ? "Space" : i === 2 ? "Gold" : "Nature",
      price: i === 1 ? "450 GRAM" : i === 2 ? "1,200 GRAM" : "80 GRAM",
      market: "GetGems",
      itemNumber: 1000 + i
    }));
  };

  const mockResults = generateMockResults();

  // Reusable Card Renderer
  const renderGiftCard = (item) => {
    const isSaved = savedGifts.some(g => g.id === item.id);
    return (
      <div key={item.id} className="result-card" onClick={() => { setSelectedGift(item); setActiveSheet('gift_details'); }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>
            {item.name}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <div onClick={(e) => { e.stopPropagation(); toggleSave(item); }} style={{ color: isSaved ? 'var(--tg-blue)' : 'var(--text-secondary)', cursor: 'pointer' }}>
              {isSaved ? <IconBookmarkFilled /> : <IconBookmark />}
            </div>
            <div onClick={handleBuy} style={{ background: 'var(--tg-blue)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 6, cursor: 'pointer', letterSpacing: '0.5px' }}>
              BUY
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
          #{item.itemNumber} • {item.market}
        </div>
        <div style={{ marginTop: 'auto' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tg-blue)' }}>{item.price}</div>
        </div>
      </div>
    );
  };

  const renderSheet = () => {
    if (!activeSheet) return null;
    
    // GIFT DETAILS MODAL
    if (activeSheet === 'gift_details' && selectedGift) {
      const isSaved = savedGifts.some(g => g.id === selectedGift.id);
      return (
        <div className="sheet-overlay" onClick={() => setActiveSheet(null)}>
          <div className="sheet-content" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title" style={{ marginBottom: 4 }}>{selectedGift.name}</div>
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 15, fontWeight: 500, marginBottom: 24 }}>
              #{selectedGift.itemNumber} • {selectedGift.market}
            </div>
            
            <div className="ios-group" style={{ margin: 0, marginBottom: 24 }}>
              <div className="ios-row"><span style={{ color: 'var(--text-secondary)' }}>Model</span><span>{selectedGift.model}</span></div>
              <div className="ios-row"><span style={{ color: 'var(--text-secondary)' }}>Backdrop</span><span>{selectedGift.backdrop}</span></div>
              <div className="ios-row"><span style={{ color: 'var(--text-secondary)' }}>Symbol</span><span>{selectedGift.symbol}</span></div>
              <div className="ios-row"><span style={{ color: 'var(--text-secondary)' }}>Listed Value</span><span style={{ color: 'var(--tg-blue)', fontWeight: 800 }}>{selectedGift.price}</span></div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="action-btn" style={{ flex: 1, background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} onClick={() => { toggleSave(selectedGift); setActiveSheet(null); }}>
                {isSaved ? "Remove Saved" : "Save Gift"}
              </button>
              <button className="action-btn" style={{ flex: 1 }} onClick={handleBuy}>
                Buy Now
              </button>
            </div>
          </div>
        </div>
      );
    }

    // DONATE MODAL FLOW
    if (activeSheet === 'donate') {
      return (
        <div className="sheet-overlay" onClick={() => setActiveSheet(null)}>
          <div className="sheet-content" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            {donateStep === 1 && (
              <div className="fade-in-up">
                <div className="sheet-title">{t.donate}</div>
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 24, fontSize: 15, lineHeight: 1.4 }}>
                  {t.donate_desc}
                </p>
                <div className="input-group">
                  <input type="number" className="ios-input" placeholder={t.amount_gram} value={donateAmount} onChange={e => setDonateAmount(e.target.value)} />
                </div>
                <div className="chips-grid" style={{ justifyContent: 'center' }}>
                  {["MyTonWallet", "Tg wallet", "TonKeeper"].map(w => (
                    <div key={w} className={`chip ${donateWallet === w ? 'active' : ''}`} onClick={() => setDonateWallet(w)}>
                      {w}
                    </div>
                  ))}
                </div>
                <button className="action-btn" onClick={executeDonate} disabled={!donateAmount}>Donate Now</button>
              </div>
            )}
            {donateStep === 2 && (
              <div className="fade-in-up">
                <div className="sheet-title">{t.verify_tx}</div>
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 24, fontSize: 15, lineHeight: 1.4 }}>
                  Please paste your Transaction Hash/ID to verify your transfer.
                </p>
                <div className="input-group">
                  <input type="text" className="ios-input" placeholder={t.tx_id} value={donateTx} onChange={e => setDonateTx(e.target.value)} />
                </div>
                <button className="action-btn" onClick={() => setDonateStep(3)} disabled={!donateTx}>Verify Transaction</button>
              </div>
            )}
            {donateStep === 3 && (
              <div className="fade-in-up" style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ color: 'var(--tg-blue)', marginBottom: 16 }}><IconHeart /></div>
                <div className="sheet-title">{t.thank_you}</div>
                <button className="action-btn" onClick={() => { setActiveSheet(null); setDonateStep(1); setDonateAmount(""); setDonateTx(""); }}>Close</button>
              </div>
            )}
          </div>
        </div>
      );
    }

    let title, options, currentVal, setVal;
    if (activeSheet === 'model') { title = t.model; options = [t.any, ...MODELS]; currentVal = selectedModel; setVal = setSelectedModel; }
    else if (activeSheet === 'backdrop') { title = t.backdrop; options = [t.any, ...BACKDROPS]; currentVal = selectedBackdrop; setVal = setSelectedBackdrop; }
    else if (activeSheet === 'symbol') { title = t.symbol; options = [t.any, ...SYMBOLS]; currentVal = selectedSymbol; setVal = setSelectedSymbol; }
    else if (activeSheet === 'lang') { 
      return (
        <div className="sheet-overlay" onClick={() => setActiveSheet(null)}>
          <div className="sheet-content" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">Language</div>
            <div className="ios-group" style={{ margin: 0 }}>
              {Object.entries(LANGS).map(([k, v]) => (
                <div key={k} className="sheet-list-item" onClick={() => { setLang(k); setActiveSheet(null); }}>
                  <span>{v}</span>
                  {lang === k && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="sheet-overlay" onClick={() => setActiveSheet(null)}>
        <div className="sheet-content" onClick={e => e.stopPropagation()}>
          <div className="sheet-handle" />
          <div className="sheet-title">{title}</div>
          <div className="ios-group" style={{ margin: 0 }}>
            {options.map(opt => (
              <div key={opt} className="sheet-list-item" onClick={() => { setVal(opt); setActiveSheet(null); }}>
                <span>{opt}</span>
                {currentVal === opt && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{styles}</style>
      <div className="app-wrapper">
        <div className="app-container">
          
          {toast && <div className="toast">{toast}</div>}

          {/* TOP ICONS (Fixed) */}
          <div className="top-nav">
            {activeTab === "scout" && isSearching ? (
               <div className="icon-btn" onClick={() => setIsSearching(false)}><IconBack /></div>
            ) : (
               <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.5px' }}>GiftTrove</div>
            )}
            
            <div className="top-icons">
              <div className="icon-btn" onClick={() => setActiveSheet('lang')}><IconGlobe /></div>
              <div className="icon-btn" onClick={toggleTheme}>
                {theme === 'dark' ? <IconMoon /> : <IconSun />}
              </div>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="content">
            
            {/* SCOUT TAB */}
            {activeTab === "scout" && (
              <div className="fade-in-up">
                {!isSearching && (
                  <div className="hero-title">
                    {t.fastest_way} <img src="https://i.ibb.co/hQfW1wY/Untitled-design-3.png" alt="Icon" style={{ display: 'inline-block', height: '1.15em', verticalAlign: 'text-bottom', marginLeft: '6px', borderRadius: '8px' }} />
                  </div>
                )}

                {!isSearching ? (
                  /* ── SCOUT FORM ── */
                  <div>
                    <div className="input-group">
                      <div className="section-label">{t.gift_name}</div>
                      <input 
                        className="ios-input" 
                        placeholder="e.g. Durov's Cap" 
                        value={giftQuery} 
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        onChange={e => setGiftQuery(e.target.value)} 
                      />
                      {showSuggestions && giftQuery && filteredGifts.length > 0 && (
                        <div className="suggestions-dropdown">
                          {filteredGifts.map(g => (
                            <div key={g} className="suggestion-item" onClick={() => { setGiftQuery(g); setShowSuggestions(false); }}>
                              {g}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="input-group">
                      <div className="section-label">{t.specific_id} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{t.optional}</span></div>
                      <input type="number" className="ios-input" placeholder="#12345" value={giftId} onChange={e => setGiftId(e.target.value)} />
                    </div>

                    <div className="input-group">
                      <div className="section-label">{t.marketplaces}</div>
                      <div className="chips-grid">
                        {MARKETPLACES.map(m => (
                          <div key={m} className={`chip ${selectedMarkets.includes(m) ? 'active' : ''}`} onClick={() => handleMarketToggle(m)}>
                            {m}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="input-group">
                      <div className="section-label">{t.attributes}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="select-btn" onClick={() => setActiveSheet('model')}>
                          <span>{t.model}</span> <span className="select-val">{selectedModel} <IconChevronRight /></span>
                        </div>
                        <div className="select-btn" onClick={() => setActiveSheet('backdrop')}>
                          <span>{t.backdrop}</span> <span className="select-val">{selectedBackdrop} <IconChevronRight /></span>
                        </div>
                        <div className="select-btn" onClick={() => setActiveSheet('symbol')}>
                          <span>{t.symbol}</span> <span className="select-val">{selectedSymbol} <IconChevronRight /></span>
                        </div>
                      </div>
                    </div>

                    <button className="action-btn" onClick={handleScout}>{t.scout_gift}</button>
                  </div>
                ) : (
                  /* ── 2-COLUMN RESULTS VIEW (MOBILE OPTIMIZED) ── */
                  <div className="fade-in-up" style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800 }}>{t.results}</div>
                      <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>{mockResults.length} {t.found}</div>
                    </div>
                    
                    <div className="results-grid">
                      {mockResults.map(item => renderGiftCard(item))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* EVENTS TAB */}
            {activeTab === "events" && (
              <div className="fade-in-up" style={{ textAlign: 'center', marginTop: '40%' }}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: 16 }}><IconCalendar /></div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{t.no_events}</div>
                <div style={{ color: 'var(--text-secondary)', marginTop: 8 }}>{t.check_back}</div>
              </div>
            )}

            {/* SAVED TAB */}
            {activeTab === "saved" && (
              <div className="fade-in-up">
                <div className="hero-title">{t.saved_tab}</div>
                {savedGifts.length === 0 ? (
                  <div className="ios-group" style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {t.no_saved}
                  </div>
                ) : (
                  <div className="results-grid">
                    {savedGifts.map(item => renderGiftCard(item))}
                  </div>
                )}
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="fade-in-up">
                <div className="hero-title">{t.profile_tab}</div>
                
                {/* Referrals Section */}
                <div className="section-label" style={{ marginTop: 12 }}>{t.referrals}</div>
                <div className="ios-group">
                  <div className="ios-row" onClick={copyReferral}>
                    <div className="row-left">
                      <div className="row-icon-box" style={{ background: '#ff9500' }}><IconCopy /></div>
                      {t.copy_ref}
                    </div>
                  </div>
                  <div className="ios-row" style={{ cursor: 'default' }}>
                    <div className="row-left">{t.ref_count}</div>
                    <div style={{ color: 'var(--tg-blue)', fontWeight: 700, fontSize: 16 }}>0</div>
                  </div>
                </div>

                {/* Community Section (Reordered) */}
                <div className="section-label">{t.community}</div>
                <div className="ios-group">
                  <a href="https://t.me/insidemajek" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="ios-row">
                      <div className="row-left">
                        <div className="row-icon-box" style={{ background: '#ff9500' }}><IconGlobe /></div>
                        {t.comm_channel}
                      </div>
                      <IconChevronRight />
                    </div>
                  </a>
                  <a href="https://t.me/+Op7gLVniX9Y1OTRk" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="ios-row">
                      <div className="row-left">
                        <div className="row-icon-box" style={{ background: '#0a84ff' }}><IconSearch /></div>
                        {t.comm_chat}
                      </div>
                      <IconChevronRight />
                    </div>
                  </a>
                  <a href="https://t.me/insidemajek?direct" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="ios-row">
                      <div className="row-left">
                        <div className="row-icon-box" style={{ background: '#34c759' }}><IconUser /></div>
                        {t.support}
                      </div>
                      <IconChevronRight />
                    </div>
                  </a>
                </div>

                {/* Support Builder Section */}
                <div className="section-label">{t.support_builder}</div>
                <div className="ios-group">
                  <div className="ios-row" onClick={() => setActiveSheet('donate')}>
                    <div className="row-left">
                      <div className="row-icon-box" style={{ background: '#ff2d55' }}><IconHeart /></div>
                      {t.donate}
                    </div>
                    <IconChevronRight />
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>
                  Built by @insidemajek
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM NAV */}
          <div className="tab-bar-container">
            <div className="ios-tab-bar">
              {[
                { id: 'scout', icon: <IconSearch />, label: t.scout_tab },
                { id: 'events', icon: <IconCalendar />, label: t.events_tab },
                { id: 'saved', icon: <IconBookmark />, label: t.saved_tab },
                { id: 'profile', icon: <IconUser />, label: t.profile_tab }
              ].map(tab => (
                <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                  <div className="tab-icon">{tab.icon}</div>
                  <span className="tab-label">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* BOTTOM SHEETS */}
          {renderSheet()}
          
        </div>
      </div>
    </>
  );
}
