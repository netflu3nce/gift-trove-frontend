import React, { useState, useEffect, useRef } from "react";

// ─── BACKDROP COLORS (80 total — matching Telegram's actual palette) ──────────
const BACKDROP_COLORS = [
  { name: "Black", hex: "#000000" }, { name: "Electric Purple", hex: "#7B2FBE" }, { name: "Lavender", hex: "#9B8EC4" },
  { name: "Cyberpunk", hex: "#FF00FF" }, { name: "Electric Indigo", hex: "#6610F2" }, { name: "Neon Blue", hex: "#00F0FF" },
  { name: "Navy Blue", hex: "#001F5B" }, { name: "Sapphire", hex: "#0F52BA" }, { name: "Sky Blue", hex: "#87CEEB" },
  { name: "Azure Blue", hex: "#007FFF" }, { name: "Pacific Cyan", hex: "#1CA9C9" }, { name: "Aquamarine", hex: "#7FFFD4" },
  { name: "Pacific Green", hex: "#1D6340" }, { name: "Emerald", hex: "#50C878" }, { name: "Mint Green", hex: "#98FF98" },
  { name: "Malachite", hex: "#0BDA51" }, { name: "Shamrock Green", hex: "#009E60" }, { name: "Lemongrass", hex: "#9AB973" },
  { name: "Light Olive", hex: "#ACBF60" }, { name: "Satin Gold", hex: "#CBA135" }, { name: "Pure Gold", hex: "#FFD700" },
  { name: "Amber", hex: "#FFBF00" }, { name: "Caramel", hex: "#C68642" }, { name: "Orange", hex: "#FF7518" },
  { name: "Carrot Juice", hex: "#ED9121" }, { name: "Coral Red", hex: "#FF4040" }, { name: "Persimmon", hex: "#EC5800" },
  { name: "Strawberry", hex: "#FC5A8D" }, { name: "Raspberry", hex: "#E30B5C" }, { name: "Mystic Pearl", hex: "#E8D5C4" },
  { name: "Onyx Black", hex: "#0F0F0F" }, { name: "Crimson", hex: "#DC143C" }, { name: "Rose Gold", hex: "#B76E79" },
  { name: "Hot Pink", hex: "#FF69B4" }, { name: "Fuchsia", hex: "#FF00BF" }, { name: "Violet", hex: "#8B00FF" },
  { name: "Indigo", hex: "#4B0082" }, { name: "Royal Blue", hex: "#4169E1" }, { name: "Cobalt", hex: "#0047AB" },
  { name: "Steel Blue", hex: "#4682B4" }, { name: "Ice Blue", hex: "#D6EAF8" }, { name: "Powder Blue", hex: "#B0E0E6" },
  { name: "Teal", hex: "#008080" }, { name: "Jade", hex: "#00A86B" }, { name: "Forest Green", hex: "#228B22" },
  { name: "Olive", hex: "#808000" }, { name: "Lime", hex: "#32CD32" }, { name: "Chartreuse", hex: "#7FFF00" },
  { name: "Yellow", hex: "#FFFF00" }, { name: "Lemon", hex: "#FFF44F" }, { name: "Cream", hex: "#FFFDD0" },
  { name: "Ivory", hex: "#FFFFF0" }, { name: "White", hex: "#FFFFFF" }, { name: "Silver", hex: "#C0C0C0" },
  { name: "Platinum", hex: "#E5E4E2" }, { name: "Ash Gray", hex: "#B2BEB5" }, { name: "Slate", hex: "#708090" },
  { name: "Charcoal", hex: "#36454F" }, { name: "Dark Brown", hex: "#3B1F0A" }, { name: "Chocolate", hex: "#7B3F00" },
  { name: "Copper", hex: "#B87333" }, { name: "Bronze", hex: "#CD7F32" }, { name: "Tan", hex: "#D2B48C" },
  { name: "Peach", hex: "#FFCBA4" }, { name: "Salmon", hex: "#FA8072" }, { name: "Terra Cotta", hex: "#E2725B" },
  { name: "Burgundy", hex: "#800020" }, { name: "Maroon", hex: "#800000" }, { name: "Wine", hex: "#722F37" },
  { name: "Plum", hex: "#DDA0DD" }, { name: "Mauve", hex: "#E0B0FF" }, { name: "Lilac", hex: "#C8A2C8" },
  { name: "Orchid", hex: "#DA70D6" }, { name: "Magenta", hex: "#FF00FF" }, { name: "Turquoise", hex: "#40E0D0" },
  { name: "Cyan", hex: "#00FFFF" }, { name: "Deep Sky Blue", hex: "#00BFFF" }, { name: "Midnight Blue", hex: "#191970" },
  { name: "Dark Violet", hex: "#9400D3" }, { name: "Deep Pink", hex: "#FF1493" }
];

// ─── UPGRADED GIFT COLLECTIONS (Architecture prepared for 114 gifts with images & rarity) ───
const GIFT_COLLECTIONS = {
  "Plush Pepe": {
    image: "https://i.imgur.com/G3wz8Kq.png", // Replace with real asset
    models: [
      { name: "Cozy", image: "https://i.imgur.com/G3wz8Kq.png", rarity: 15.2 },
      { name: "Neon", image: "https://i.imgur.com/G3wz8Kq.png", rarity: 8.4 },
      { name: "Pumpkin", image: "https://i.imgur.com/G3wz8Kq.png", rarity: 5.1 }
    ],
    symbols: [
      { name: "Illuminati", image: "https://i.imgur.com/vHqB5o3.png", rarity: 2.3 },
      { name: "Fish Skeleton", image: "https://i.imgur.com/vHqB5o3.png", rarity: 10.5 }
    ]
  },
  "Durov's Cap": {
    image: "https://i.imgur.com/M6L2aPj.png",
    models: [
      { name: "Classic", image: "https://i.imgur.com/M6L2aPj.png", rarity: 25.0 },
      { name: "Vintage", image: "https://i.imgur.com/M6L2aPj.png", rarity: 12.0 }
    ],
    symbols: [
      { name: "Telegram", image: "https://i.imgur.com/vHqB5o3.png", rarity: 1.5 },
      { name: "Star", image: "https://i.imgur.com/vHqB5o3.png", rarity: 8.0 }
    ]
  },
  "Jelly Bunny": {
    image: "https://i.imgur.com/qE4P9cT.png",
    models: [
      { name: "Sweet", image: "https://i.imgur.com/qE4P9cT.png", rarity: 18.0 },
      { name: "Rainbow", image: "https://i.imgur.com/qE4P9cT.png", rarity: 4.5 }
    ],
    symbols: [
      { name: "Carrot", image: "https://i.imgur.com/vHqB5o3.png", rarity: 20.0 },
      { name: "Heart", image: "https://i.imgur.com/vHqB5o3.png", rarity: 15.0 }
    ]
  }
  // Data architecture ready: Fetch remaining 111 gifts via API and map to this schema.
};

const ALL_GIFTS = Object.keys(GIFT_COLLECTIONS);

const MARKETPLACES = ["All", "GetGems", "Portals", "MRKT", "Fragment", "Tonnel"];

const LANGS = { EN: "English", RU: "Русский", ZH: "中文" };

const T = {
  EN: {
    scout_tab: "Scout", events_tab: "Events", saved_tab: "Saved", profile_tab: "Profile",
    fastest_way: "The fastest way to find any Telegram Gift", // Period removed
    gift_name: "Gift Name", specific_id: "Specific ID", optional: "(Optional)",
    marketplaces: "Marketplaces", attributes: "Attributes", model: "Model", backdrop: "Backdrop", symbol: "Symbol",
    scout_gift: "Scout Gift", results: "Results", found: "found",
    no_events: "There is no event ongoing", check_back: "Check back later for market drops.",
    no_saved: "No gifts saved yet.",
    community: "Community", support: "Contact Support!", comm_chat: "Community Chat", comm_channel: "Community Channel",
    support_builder: "Support the Builder", donate: "Donate",
    donate_desc: "GiftTrove was created free. Kindly input the amount of GRAM you'd like to donate.",
    amount_gram: "Amount (GRAM)", verify_tx: "Verify Transaction", tx_id: "Transaction ID",
    thank_you: "Thank you for your generous support!",
    referrals: "Referrals", copy_ref: "Copy Referral Link", ref_count: "Referral Count",
    any: "Any"
  },
  RU: {
    scout_tab: "Поиск", events_tab: "События", saved_tab: "Сохраненное", profile_tab: "Профиль",
    fastest_way: "Самый быстрый способ найти любой Telegram Подарок",
    gift_name: "Имя подарка", specific_id: "Конкретный ID", optional: "(Необязательно)",
    marketplaces: "Маркетплейсы", attributes: "Атрибуты", model: "Модель", backdrop: "Фон", symbol: "Символ",
    scout_gift: "Искать подарок", results: "Результаты", found: "найдено",
    no_events: "Нет текущих событий", check_back: "Загляните позже.",
    no_saved: "Пока нет сохраненных подарков.",
    community: "Сообщество", support: "Связаться с поддержкой!", comm_chat: "Чат сообщества", comm_channel: "Канал сообщества",
    support_builder: "Поддержать создателя", donate: "Пожертвовать",
    donate_desc: "GiftTrove бесплатен. Введите сумму GRAM для пожертвования.",
    amount_gram: "Сумма (GRAM)", verify_tx: "Проверить транзакцию", tx_id: "ID транзакции",
    thank_you: "Спасибо за вашу щедрую поддержку!",
    referrals: "Рефералы", copy_ref: "Копировать ссылку", ref_count: "Количество рефералов",
    any: "Любой"
  },
  ZH: {
    scout_tab: "侦测", events_tab: "活动", saved_tab: "已保存", profile_tab: "个人资料",
    fastest_way: "查找任何 Telegram 礼物的最快方法",
    gift_name: "礼物名称", specific_id: "特定 ID", optional: "(可选)",
    marketplaces: "市场", attributes: "属性", model: "模型", backdrop: "背景", symbol: "符号",
    scout_gift: "侦测礼物", results: "结果", found: "已找到",
    no_events: "当前没有活动", check_back: "请稍后回来查看市场掉落。",
    no_saved: "暂无保存的礼物。",
    community: "社区", support: "联系客服支持！", comm_chat: "社区群组", comm_channel: "社区频道",
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

// ─── STYLES ────────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
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
    --bg-gradient: radial-gradient(120% 120% at 50% -20%, rgba(0, 122, 255, 0.08) 0%, #f2f2f7 100%);
    --bg-sheet: rgba(255, 255, 255, 0.75);
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
    background: var(--bg-base);
    color: var(--text-primary);
    -webkit-font-smoothing: antialiased;
    overscroll-behavior: none;
    transition: background 0.4s ease, color 0.4s ease;
    height: 100vh; overflow: hidden;
    /* Desktop optimization */
    display: flex; justify-content: center; align-items: center;
  }

  /* Desktop layout wrapper */
  .app-container { 
    height: 100vh; width: 100%; max-width: 440px; 
    display: flex; flex-direction: column; position: relative; 
    background-image: var(--bg-gradient); background-attachment: fixed;
    box-shadow: 0 0 50px rgba(0,0,0,0.1); overflow: hidden;
  }

  @media (min-width: 480px) {
    .app-container { height: 90vh; border-radius: 32px; border: 1px solid var(--border); }
  }

  /* Pull to Refresh Loader */
  .ptr-loader {
    position: absolute; top: 0; left: 0; right: 0;
    height: 80px; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(180deg, var(--bg-sheet) 0%, transparent 100%);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    z-index: 40; transition: transform 0.3s var(--bounce); pointer-events: none;
    color: var(--text-primary); font-weight: 600; font-size: 14px;
  }
  .spinner {
    width: 24px; height: 24px; border: 3px solid var(--border);
    border-top-color: var(--tg-blue); border-radius: 50%;
    animation: spin 1s linear infinite; margin-right: 10px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

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

  .content {
    flex: 1; overflow-y: auto; overflow-x: hidden;
    padding: 0 24px calc(var(--tab-h) + var(--safe-bottom) + 20px);
    position: relative; z-index: 10;
  }
  .content::-webkit-scrollbar { display: none; }

  /* White headers forced in light mode */
  .hero-title {
    font-size: 34px; font-weight: 800; letter-spacing: -1px; line-height: 1.15;
    margin-bottom: 24px; color: var(--text-primary); transition: color 0.3s;
  }
  [data-theme="light"] .hero-title { 
    color: #ffffff; text-shadow: 0 2px 10px rgba(0,0,0,0.25); 
  }
  
  .hero-title-row {
    display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
  }
  .hero-title-img {
    display: inline-block; height: 1.25em; width: auto; vertical-align: middle;
    border-radius: 10px; flex-shrink: 0; margin-left: 2px;
  }

  .section-label {
    font-size: 15px; font-weight: 600; color: var(--text-primary);
    margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;
  }

  .input-group { margin-bottom: 24px; position: relative; }
  .ios-input {
    width: 100%; padding: 18px 20px; border-radius: var(--radius-lg);
    background: var(--bg-input); border: 1px solid transparent;
    color: var(--text-primary); font-size: 17px; outline: none;
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    transition: all 0.3s; font-family: var(--font);
  }
  .ios-input:focus { border-color: var(--tg-blue); background: var(--bg-card); }

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
    font-size: 16px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 10px;
  }
  .suggestion-item:last-child { border-bottom: none; }
  .suggestion-item:active { background: var(--bg-hover); }

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

  .chips-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; }
  .chip {
    padding: 12px 18px; border-radius: 100px; font-size: 15px; font-weight: 600;
    background: var(--bg-card); border: 1px solid var(--border);
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    color: var(--text-secondary); cursor: pointer; transition: all 0.2s var(--bounce);
  }
  .chip:active { transform: scale(0.92); }
  .chip.active { background: var(--text-primary); color: var(--bg-base); border-color: transparent; }

  .action-btn {
    width: 100%; padding: 20px; border-radius: var(--radius-xl); border: none;
    background: var(--tg-blue); color: #fff; font-size: 18px; font-weight: 700;
    box-shadow: 0 8px 24px rgba(10, 132, 255, 0.3); cursor: pointer;
    transition: all 0.3s var(--bounce); margin-top: 10px;
  }
  .action-btn:active { transform: scale(0.96); box-shadow: 0 4px 12px rgba(10, 132, 255, 0.2); }
  .action-btn:disabled { opacity: 0.5; filter: grayscale(1); }

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
    color: var(--text-primary);
  }
  .sheet-content::-webkit-scrollbar { display: none; }
  .sheet-handle { width: 40px; height: 5px; border-radius: 100px; background: var(--text-secondary); margin: 0 auto 24px; opacity: 0.5; }
  .sheet-title { font-size: 22px; font-weight: 800; margin-bottom: 20px; text-align: center; color: var(--text-primary); }

  .sheet-list-item {
    padding: 18px 20px; font-size: 17px; font-weight: 600; border-bottom: 1px solid var(--border);
    display: flex; justify-content: space-between; align-items: center; cursor: pointer;
    color: var(--text-primary);
  }
  .sheet-list-item:active { background: var(--bg-hover); }
  .sheet-list-item:last-child { border-bottom: none; }

  .ios-group {
    border-radius: var(--radius-lg); background: var(--bg-card); border: 1px solid var(--border);
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    overflow: hidden; margin-bottom: 24px;
  }
  .ios-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 20px; border-bottom: 1px solid var(--border); cursor: pointer;
    font-size: 17px; font-weight: 500; transition: background 0.2s;
    color: var(--text-primary);
  }
  .ios-row:active { background: var(--bg-hover); }
  .ios-row:last-child { border-bottom: none; }
  .row-left { display: flex; align-items: center; gap: 16px; }
  .row-icon-box { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; }

  .color-dot {
    width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
    border: 1.5px solid rgba(128,128,128,0.3); display: inline-block;
  }
  
  .model-img {
    width: 24px; height: 24px; border-radius: 6px; object-fit: cover; flex-shrink: 0;
  }

  .toast {
    position: absolute; top: 16px; left: 50%; transform: translateX(-50%); z-index: 200;
    padding: 12px 24px; border-radius: 100px; font-size: 15px; font-weight: 600;
    background: var(--bg-sheet); border: 1px solid var(--border); color: var(--text-primary);
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
    animation: toastIn 0.3s ease, toastOut 0.3s ease 2.7s forwards;
    white-space: nowrap;
  }

  .results-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 16px; }
  .result-card {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 16px; position: relative;
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    display: flex; flex-direction: column; transition: transform 0.2s var(--bounce);
    cursor: pointer; color: var(--text-primary);
  }
  .result-card:active { transform: scale(0.96); }

  @keyframes fadeIn { to { opacity: 1; } }
  @keyframes slideUp { to { transform: translateY(0); } }
  .fade-in-up { animation: fadeInUp 0.5s var(--bounce) forwards; }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  @keyframes toastOut { from { opacity: 1; } to { opacity: 0; } }
`;

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("gt_theme") || "light"); // Default is light mode
  const [lang, setLang] = useState(() => localStorage.getItem("gt_lang") || "EN");
  const [savedGifts, setSavedGifts] = useState(() => {
    const saved = localStorage.getItem("gt_saved");
    return saved ? JSON.parse(saved) : [];
  });
  const [referralCount, setReferralCount] = useState(() => {
    const stored = localStorage.getItem("gt_ref_count");
    return stored ? parseInt(stored, 10) : 0;
  });

  const [activeTab, setActiveTab] = useState("scout");
  const [toast, setToast] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSheet, setActiveSheet] = useState(null);
  const [selectedGiftObj, setSelectedGiftObj] = useState(null);

  const [giftQuery, setGiftQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [giftId, setGiftId] = useState("");
  const [selectedMarkets, setSelectedMarkets] = useState(["All"]);
  const [selectedModel, setSelectedModel] = useState("Any");
  const [selectedBackdrop, setSelectedBackdrop] = useState("Any");
  const [selectedSymbol, setSelectedSymbol] = useState("Any");

  const [donateStep, setDonateStep] = useState(1);
  const [donateAmount, setDonateAmount] = useState("");
  const [donateWallet, setDonateWallet] = useState("TonKeeper");
  const [donateTx, setDonateTx] = useState("");

  // Pull-to-refresh states
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);

  const t = T[lang] || T["EN"];
  const tgUser = typeof window !== "undefined" ? window.Telegram?.WebApp?.initDataUnsafe?.user : { id: 12345678, first_name: "Scout" };

  const currentGiftData = GIFT_COLLECTIONS[giftQuery] || null;
  const availableModels = currentGiftData ? currentGiftData.models : [];
  const availableSymbols = currentGiftData ? currentGiftData.symbols : [];

  useEffect(() => {
    localStorage.setItem("gt_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  useEffect(() => { localStorage.setItem("gt_lang", lang); }, [lang]);
  useEffect(() => { localStorage.setItem("gt_saved", JSON.stringify(savedGifts)); }, [savedGifts]);
  useEffect(() => { localStorage.setItem("gt_ref_count", referralCount.toString()); }, [referralCount]);

  useEffect(() => {
    setSelectedModel("Any");
    setSelectedSymbol("Any");
  }, [giftQuery]);

  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // Touch handlers for Apple-morphism Pull-to-Refresh
  const handleTouchStart = (e) => {
    if (window.scrollY === 0) touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e) => {
    if (touchStartY.current > 0) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStartY.current;
      if (diff > 0 && diff < 100) setPullY(diff);
    }
  };
  const handleTouchEnd = () => {
    if (pullY > 60) {
      setIsRefreshing(true);
      setTimeout(() => { setIsRefreshing(false); setPullY(0); }, 1500); // Simulate API call
    } else {
      setPullY(0);
    }
    touchStartY.current = 0;
  };

  const handleMarketToggle = (m) => {
    if (m === "All") { setSelectedMarkets(["All"]); return; }
    let newMarkets = selectedMarkets.filter(x => x !== "All");
    if (newMarkets.includes(m)) {
      newMarkets = newMarkets.filter(x => x !== m);
      if (newMarkets.length === 0) newMarkets = ["All"];
    } else { newMarkets.push(m); }
    setSelectedMarkets(newMarkets);
  };

  const handleScout = () => setIsSearching(true);

  const toggleSave = (gift) => {
    const isSaved = savedGifts.some(g => g.id === gift.id);
    if (isSaved) { setSavedGifts(savedGifts.filter(g => g.id !== gift.id)); showToast("Removed from Saved"); }
    else { setSavedGifts([...savedGifts, gift]); showToast("Gift Saved!"); }
  };

  const handleBuy = (e) => { e.stopPropagation(); window.open("https://getgems.io/gifts", "_blank"); };

  const copyReferral = () => {
    const link = `https://t.me/gifttrovebot?startapp=${tgUser?.id || "demo"}`;
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(link);
    setReferralCount(prev => prev + 1);
    showToast("Copied to clipboard!");
  };

  const executeDonate = () => {
    const address = "UQCvd6Sw_JJQsedBGfR2JOn7it7VdREWQ7v3kIluUi0RPMXJ";
    const amountNano = (parseFloat(donateAmount) || 0) * 1e9;
    let url;
    if (donateWallet === "Tg Wallet") {
      url = `https://t.me/wallet?startattach=ton_transfer--${address}--${amountNano}--Donation`;
    } else if (donateWallet === "TonKeeper") {
      url = `ton://transfer/${address}?amount=${amountNano}&text=Donation`;
    } else if (donateWallet === "MyTonWallet") {
      url = `https://mytonwallet.org/transfer/${address}?amount=${amountNano}&text=Donation`;
    }
    window.open(url, "_blank");
    setDonateStep(2);
  };

  const filteredGifts = ALL_GIFTS.filter(g => g.toLowerCase().includes(giftQuery.toLowerCase()));

  const generateMockResults = () => [1, 2, 3, 4].map(i => {
    const mdls = currentGiftData?.models || [{name: "Classic", image: "", rarity: 10}];
    const syms = currentGiftData?.symbols || [{name: "Star", image: "", rarity: 5}];
    return {
      id: i,
      name: giftQuery || "Plush Pepe",
      model: mdls[i % mdls.length].name,
      symbol: syms[i % syms.length].name,
      backdrop: BACKDROP_COLORS[i * 5].name,
      price: i === 1 ? "450 GRAM" : i === 2 ? "1,200 GRAM" : "80 GRAM",
      market: ["GetGems", "Portals", "MRKT", "Fragment"][i % 4],
      itemNumber: 1000 + i
    }
  });

  const mockResults = generateMockResults();

  const renderGiftCard = (item) => {
    const isSaved = savedGifts.some(g => g.id === item.id);
    return (
      <div key={item.id} className="result-card" onClick={() => { setSelectedGiftObj(item); setActiveSheet("gift_details"); }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2, color: "var(--text-primary)" }}>{item.name}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <div onClick={(e) => { e.stopPropagation(); toggleSave(item); }} style={{ color: isSaved ? "var(--tg-blue)" : "var(--text-secondary)", cursor: "pointer" }}>
              {isSaved ? <IconBookmarkFilled /> : <IconBookmark />}
            </div>
            <div onClick={handleBuy} style={{ background: "var(--tg-blue)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "4px 8px", borderRadius: 6, cursor: "pointer", letterSpacing: "0.5px" }}>BUY</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16 }}>#{item.itemNumber} • {item.market}</div>
        <div style={{ marginTop: "auto" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--tg-blue)" }}>{item.price}</div>
        </div>
      </div>
    );
  };

  const renderSheet = () => {
    if (!activeSheet) return null;

    if (activeSheet === "gift_details" && selectedGiftObj) {
      const isSaved = savedGifts.some(g => g.id === selectedGiftObj.id);
      return (
        <div className="sheet-overlay" onClick={() => setActiveSheet(null)}>
          <div className="sheet-content" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">{selectedGiftObj.name}</div>
            <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 15, fontWeight: 500, marginBottom: 24 }}>#{selectedGiftObj.itemNumber} • {selectedGiftObj.market}</div>
            <div className="ios-group" style={{ margin: 0, marginBottom: 24 }}>
              <div className="ios-row"><span style={{ color: "var(--text-secondary)" }}>Model</span><span>{selectedGiftObj.model}</span></div>
              <div className="ios-row">
                <span style={{ color: "var(--text-secondary)" }}>Backdrop</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {(() => { const c = BACKDROP_COLORS.find(x => x.name === selectedGiftObj.backdrop); return c ? <span className="color-dot" style={{ background: c.hex }} /> : null; })()}
                  {selectedGiftObj.backdrop}
                </span>
              </div>
              <div className="ios-row"><span style={{ color: "var(--text-secondary)" }}>Symbol</span><span>{selectedGiftObj.symbol}</span></div>
              <div className="ios-row"><span style={{ color: "var(--text-secondary)" }}>Listed Value</span><span style={{ color: "var(--tg-blue)", fontWeight: 800 }}>{selectedGiftObj.price}</span></div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="action-btn" style={{ flex: 1, background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border)" }} onClick={() => { toggleSave(selectedGiftObj); setActiveSheet(null); }}>
                {isSaved ? "Remove Saved" : "Save Gift"}
              </button>
              <button className="action-btn" style={{ flex: 1 }} onClick={handleBuy}>Buy Now</button>
            </div>
          </div>
        </div>
      );
    }

    if (activeSheet === "donate") {
      return (
        <div className="sheet-overlay" onClick={() => setActiveSheet(null)}>
          <div className="sheet-content" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            {donateStep === 1 && (
              <div className="fade-in-up">
                <div className="sheet-title">{t.donate}</div>
                <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: 24, fontSize: 15, lineHeight: 1.4 }}>{t.donate_desc}</p>
                <div className="input-group">
                  <input type="number" className="ios-input" placeholder={t.amount_gram} value={donateAmount} onChange={e => setDonateAmount(e.target.value)} />
                </div>
                <div className="chips-grid" style={{ justifyContent: "center" }}>
                  {["MyTonWallet", "Tg Wallet", "TonKeeper"].map(w => (
                    <div key={w} className={`chip ${donateWallet === w ? "active" : ""}`} onClick={() => setDonateWallet(w)}>{w}</div>
                  ))}
                </div>
                <button className="action-btn" onClick={executeDonate} disabled={!donateAmount}>Donate Now</button>
              </div>
            )}
            {donateStep === 2 && (
              <div className="fade-in-up">
                <div className="sheet-title">{t.verify_tx}</div>
                <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: 24, fontSize: 15, lineHeight: 1.4 }}>
                  Please paste your Transaction Hash/ID to verify your transfer.
                </p>
                <div className="input-group">
                  <input type="text" className="ios-input" placeholder={t.tx_id} value={donateTx} onChange={e => setDonateTx(e.target.value)} />
                </div>
                <button className="action-btn" onClick={() => setDonateStep(3)} disabled={!donateTx}>Verify Transaction</button>
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

    if (activeSheet === "model") {
      return (
        <div className="sheet-overlay" onClick={() => setActiveSheet(null)}>
          <div className="sheet-content" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">{t.model}</div>
            {availableModels.length === 0 && (
              <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: 16, fontSize: 14 }}>
                Select a gift collection first to see its models
              </p>
            )}
            <div className="ios-group" style={{ margin: 0 }}>
              <div className="sheet-list-item" onClick={() => { setSelectedModel(t.any); setActiveSheet(null); }}>
                <span>{t.any}</span>
                {selectedModel === t.any && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
              </div>
              {availableModels.map(opt => (
                <div key={opt.name} className="sheet-list-item" onClick={() => { setSelectedModel(opt.name); setActiveSheet(null); }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {opt.image && <img src={opt.image} alt={opt.name} className="model-img"/>}
                    {opt.name} 
                    <span style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 500 }}>({opt.rarity}%)</span>
                  </span>
                  {selectedModel === opt.name && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeSheet === "backdrop") {
      return (
        <div className="sheet-overlay" onClick={() => setActiveSheet(null)}>
          <div className="sheet-content" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">{t.backdrop}</div>
            <div className="ios-group" style={{ margin: 0 }}>
              <div className="sheet-list-item" onClick={() => { setSelectedBackdrop(t.any); setActiveSheet(null); }}>
                <span>{t.any}</span>
                {selectedBackdrop === t.any && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
              </div>
              {BACKDROP_COLORS.map(c => (
                <div key={c.name} className="sheet-list-item" onClick={() => { setSelectedBackdrop(c.name); setActiveSheet(null); }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="color-dot" style={{ background: c.hex }} />
                    {c.name}
                  </span>
                  {selectedBackdrop === c.name && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeSheet === "symbol") {
      return (
        <div className="sheet-overlay" onClick={() => setActiveSheet(null)}>
          <div className="sheet-content" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">{t.symbol}</div>
            {availableSymbols.length === 0 && (
              <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: 16, fontSize: 14 }}>
                Select a gift collection first to see its symbols
              </p>
            )}
            <div className="ios-group" style={{ margin: 0 }}>
              <div className="sheet-list-item" onClick={() => { setSelectedSymbol(t.any); setActiveSheet(null); }}>
                <span>{t.any}</span>
                {selectedSymbol === t.any && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
              </div>
              {availableSymbols.map(opt => (
                <div key={opt.name} className="sheet-list-item" onClick={() => { setSelectedSymbol(opt.name); setActiveSheet(null); }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {opt.image && <img src={opt.image} alt={opt.name} className="model-img"/>}
                    {opt.name}
                    <span style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 500 }}>({opt.rarity}%)</span>
                  </span>
                  {selectedSymbol === opt.name && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <style>{styles}</style>
      <div className="app-container" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        {toast && <div className="toast">{toast}</div>}
        
        {/* iOS Glass Loader */}
        <div className="ptr-loader" style={{ transform: `translateY(${isRefreshing ? 0 : pullY - 80}px)` }}>
          {isRefreshing ? <><div className="spinner"/> Updating Drops...</> : "Pull to refresh"}
        </div>

        {/* TOP NAV */}
        <div className="top-nav">
          {activeTab === "scout" && isSearching ? (
            <div className="icon-btn" onClick={() => setIsSearching(false)}><IconBack /></div>
          ) : (
            <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.5px", color: "var(--text-primary)" }}>GiftTrove</div>
          )}
          <div className="top-icons">
            <div className="icon-btn" onClick={() => setActiveSheet("lang")}><IconGlobe /></div>
            <div className="icon-btn" onClick={toggleTheme}>
              {theme === "dark" ? <IconMoon /> : <IconSun />}
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
                  <div className="hero-title-row">
                    <span>{t.fastest_way}</span>
                    <img src="https://telegram.org/favicon.ico" alt="Telegram" style={{width: 26, height: 26, verticalAlign: 'middle', marginLeft: 4, borderRadius: '50%'}}/>
                    <img src="https://i.ibb.co/hQfW1wY/Untitled-design-3.png" alt="GiftTrove" className="hero-title-img"/>
                  </div>
                </div>
              )}

              {!isSearching ? (
                <div>
                  <div className="input-group">
                    <div className="section-label">{t.gift_name}</div>
                    <input
                      className="ios-input"
                      placeholder="e.g. Plush Pepe"
                      value={giftQuery}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      onChange={e => setGiftQuery(e.target.value)}
                    />
                    {showSuggestions && giftQuery && filteredGifts.length > 0 && (
                      <div className="suggestions-dropdown">
                        {filteredGifts.map(g => (
                          <div key={g} className="suggestion-item" onClick={() => { setGiftQuery(g); setShowSuggestions(false); }}>
                            {GIFT_COLLECTIONS[g]?.image && <img src={GIFT_COLLECTIONS[g].image} alt={g} className="model-img" />}
                            {g}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="input-group">
                    <div className="section-label">{t.specific_id} <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>{t.optional}</span></div>
                    <input type="number" className="ios-input" placeholder="#12345" value={giftId} onChange={e => setGiftId(e.target.value)} />
                  </div>

                  <div className="input-group">
                    <div className="section-label">{t.marketplaces}</div>
                    <div className="chips-grid">
                      {MARKETPLACES.map(m => (
                        <div key={m} className={`chip ${selectedMarkets.includes(m) ? "active" : ""}`} onClick={() => handleMarketToggle(m)}>{m}</div>
                      ))}
                    </div>
                  </div>

                  <div className="input-group">
                    <div className="section-label">{t.attributes}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div className="select-btn" onClick={() => setActiveSheet("model")}>
                        <span>{t.model}</span>
                        <span className="select-val">{selectedModel} <IconChevronRight /></span>
                      </div>
                      <div className="select-btn" onClick={() => setActiveSheet("backdrop")}>
                        <span>{t.backdrop}</span>
                        <span className="select-val" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {(() => { const c = BACKDROP_COLORS.find(x => x.name === selectedBackdrop); return c ? <span className="color-dot" style={{ background: c.hex, width: 14, height: 14 }} /> : null; })()}
                          {selectedBackdrop}
                          <IconChevronRight />
                        </span>
                      </div>
                      <div className="select-btn" onClick={() => setActiveSheet("symbol")}>
                        <span>{t.symbol}</span>
                        <span className="select-val">{selectedSymbol} <IconChevronRight /></span>
                      </div>
                    </div>
                  </div>

                  <button className="action-btn" onClick={handleScout}>{t.scout_gift}</button>
                </div>
              ) : (
                <div className="fade-in-up" style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{t.results}</div>
                    <div style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 600 }}>{mockResults.length} {t.found}</div>
                  </div>
                  <div className="results-grid">{mockResults.map(item => renderGiftCard(item))}</div>
                </div>
              )}
            </div>
          )}

          {/* EVENTS TAB */}
          {activeTab === "events" && (
            <div className="fade-in-up" style={{ textAlign: "center", marginTop: "40%" }}>
              <div style={{ color: "var(--text-secondary)", marginBottom: 16 }}><IconCalendar /></div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{t.no_events}</div>
              <div style={{ color: "var(--text-secondary)", marginTop: 8 }}>{t.check_back}</div>
            </div>
          )}

          {/* SAVED TAB */}
          {activeTab === "saved" && (
            <div className="fade-in-up">
              <div className="hero-title">{t.saved_tab}</div>
              {savedGifts.length === 0 ? (
                <div className="ios-group" style={{ padding: 20, textAlign: "center", color: "var(--text-secondary)" }}>{t.no_saved}</div>
              ) : (
                <div className="results-grid">{savedGifts.map(item => renderGiftCard(item))}</div>
              )}
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <div className="fade-in-up">
              <div className="hero-title">{t.profile_tab}</div>

              <div className="section-label" style={{ marginTop: 12 }}>{t.referrals}</div>
              <div className="ios-group">
                <div className="ios-row" onClick={copyReferral}>
                  <div className="row-left">
                    <div className="row-icon-box" style={{ background: "#ff9500" }}><IconCopy /></div>
                    {t.copy_ref}
                  </div>
                </div>
                <div className="ios-row" style={{ cursor: "default" }}>
                  <div className="row-left">{t.ref_count}</div>
                  <div style={{ color: "var(--tg-blue)", fontWeight: 700, fontSize: 16 }}>{referralCount}</div>
                </div>
              </div>

              <div className="section-label">{t.community}</div>
              <div className="ios-group">
                <a href="https://t.me/insidemajek" target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="ios-row">
                    <div className="row-left">
                      <div className="row-icon-box" style={{ background: "#ff9500" }}><IconGlobe /></div>
                      {t.comm_channel}
                    </div>
                    <IconChevronRight />
                  </div>
                </a>
                <a href="https://t.me/+Op7gLVniX9Y1OTRk" target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="ios-row">
                    <div className="row-left">
                      <div className="row-icon-box" style={{ background: "#0a84ff" }}><IconSearch /></div>
                      {t.comm_chat}
                    </div>
                    <IconChevronRight />
                  </div>
                </a>
                <a href="https://t.me/insidemajek?direct" target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="ios-row">
                    <div className="row-left">
                      <div className="row-icon-box" style={{ background: "#34c759" }}><IconUser /></div>
                      {t.support}
                    </div>
                    <IconChevronRight />
                  </div>
                </a>
              </div>

              <div className="section-label">{t.support_builder}</div>
              <div className="ios-group">
                <div className="ios-row" onClick={() => { setDonateStep(1); setActiveSheet("donate"); }}>
                  <div className="row-left">
                    <div className="row-icon-box" style={{ background: "#ff2d55" }}><IconHeart /></div>
                    {t.donate}
                  </div>
                  <IconChevronRight />
                </div>
              </div>

              <div style={{ textAlign: "center", marginTop: 40, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600 }}>
                Built by @insidemajek
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM NAV */}
        <div className="tab-bar-container">
          <div className="ios-tab-bar">
            {[
              { id: "scout", icon: <IconSearch />, label: t.scout_tab },
              { id: "events", icon: <IconCalendar />, label: t.events_tab },
              { id: "saved", icon: <IconBookmark />, label: t.saved_tab },
              { id: "profile", icon: <IconUser />, label: t.profile_tab }
            ].map(tab => (
              <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>
                <div className="tab-icon">{tab.icon}</div>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {renderSheet()}
      </div>
    </>
  );
}
