import React, { useState, useEffect, useRef } from "react";

// ─── IMAGE PRELOADER ──────────────────────────────────────────────────────────
function preloadImages(urls) {
  urls.forEach(url => {
    const img = new Image();
    img.src = url;
  });
}

// ─── CUSTOM LOGO IMAGE ───────────────────────────────────────────────────────
const GiftTroveLogo = ({ size = 28 }) => (
  <img
    src="https://i.ibb.co/ZRQJd5tT/MGGA.png"
    alt="GiftTrove"
    style={{ width: "auto", height: size, objectFit: "contain", display: "block", flexShrink: 0, borderRadius: "6px" }}
  />
);

// ─── DYNAMIC DATA NOTE ───────────────────────────────────────────────────────
// In production, this data should be fetched from a backend utilizing:
// fragment.getCollectibleInfo
// For this build, we use a robust fallback structure to handle dynamic gifts.

const MARKETPLACES = ["All", "GetGems", "Portals", "MRKT", "Fragment", "Tonnel"];
const LANGS = { EN: "English", RU: "Русский", ZH: "中文" };

const T = {
  EN: {
    scout_tab: "Scout", events_tab: "Events", saved_tab: "Saved", profile_tab: "Profile",
    fastest_way: "The fastest way to find any Telegram Gifts",
    gift_name: "Gift Name", specific_id: "Specific ID", optional: "(Optional)",
    marketplaces: "Marketplaces", attributes: "Attributes", model: "Model", backdrop: "Backdrop", symbol: "Symbol",
    scout_gift: "Scout Gift", results: "Results", found: "found",
    no_events: "There is no event ongoing", check_back: "Check back later for market drops.",
    no_saved: "No gifts saved yet.",
    community: "Community", support: "Contact Support", comm_chat: "Community Chat", comm_channel: "Community Channel",
    support_builder: "Support the Builder", donate: "Donate",
    donate_desc: "GiftTrove was created free. Kindly input the amount of TON you'd like to donate.",
    amount_ton: "Amount (TON)", verify_tx: "Verify Transaction", tx_id: "Transaction ID",
    thank_you: "Thank you for your generous support!",
    referrals: "Referrals", copy_ref: "Copy Referral Link", ref_count: "Referral Count",
    any: "Any", rarity: "Rarity",
    scout_load_title: "Scouting marketplaces...", scout_load_sub: "Finding gems so you don't have to"
  },
  RU: {
    scout_tab: "Поиск", events_tab: "События", saved_tab: "Сохраненное", profile_tab: "Профиль",
    fastest_way: "Самый быстрый способ найти Telegram Подарки",
    gift_name: "Имя подарка", specific_id: "Конкретный ID", optional: "(Необязательно)",
    marketplaces: "Маркетплейсы", attributes: "Атрибуты", model: "Модель", backdrop: "Фон", symbol: "Символ",
    scout_gift: "Искать подарок", results: "Результаты", found: "найдено",
    no_events: "Нет текущих событий", check_back: "Загляните позже.",
    no_saved: "Пока нет сохраненных подарков.",
    community: "Сообщество", support: "Контакт Поддержки", comm_chat: "Чат сообщества", comm_channel: "Канал сообщества",
    support_builder: "Поддержать создателя", donate: "Пожертвовать",
    donate_desc: "GiftTrove бесплатен. Введите сумму TON для пожертвования.",
    amount_ton: "Сумма (TON)", verify_tx: "Проверить транзакцию", tx_id: "ID транзакции",
    thank_you: "Спасибо за вашу щедрую поддержку!",
    referrals: "Рефералы", copy_ref: "Копировать ссылку", ref_count: "Количество рефералов",
    any: "Любой", rarity: "Редкость",
    scout_load_title: "Поиск на маркетплейсах...", scout_load_sub: "Находим сокровища, чтобы вам не пришлось"
  },
  ZH: {
    scout_tab: "侦测", events_tab: "活动", saved_tab: "已保存", profile_tab: "个人资料",
    fastest_way: "查找任何 Telegram 礼物的最快方法",
    gift_name: "礼物名称", specific_id: "特定 ID", optional: "(可选)",
    marketplaces: "市场", attributes: "属性", model: "模型", backdrop: "背景", symbol: "符号",
    scout_gift: "侦测礼物", results: "结果", found: "已找到",
    no_events: "当前没有活动", check_back: "请稍后回来查看市场掉落。",
    no_saved: "暂无保存的礼物。",
    community: "社区", support: "联系客服", comm_chat: "社区群组", comm_channel: "社区频道",
    support_builder: "支持开发者", donate: "捐赠",
    donate_desc: "GiftTrove 是免费的。请输入您想捐赠的 TON 数量。",
    amount_ton: "数量 (TON)", verify_tx: "验证交易", tx_id: "交易 ID",
    thank_you: "感谢您的慷慨支持！",
    referrals: "推荐", copy_ref: "复制推荐链接", ref_count: "推荐人数",
    any: "任何", rarity: "稀有度",
    scout_load_title: "正在侦测市场...", scout_load_sub: "为您寻找宝石"
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
const IconRefresh = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
const IconTrove = () => <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9"/><path d="M22 7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v5h20V7z"/><path d="M12 12v4"/><path d="M10 16h4"/></svg>;

// ─── STYLES ────────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');

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
    --font: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
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

  .app-container { height: 100vh; display: flex; flex-direction: column; position: relative; }

  /* SPLASH SCREEN */
  .launch-splash {
    position: fixed; inset: 0; z-index: 9999;
    background: var(--bg-base);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    transition: opacity 0.5s ease;
  }
  .launch-splash.fade-out { opacity: 0; pointer-events: none; }
  .trove-icon-glow {
    color: var(--tg-blue);
    filter: drop-shadow(0 0 20px rgba(10,132,255,0.4));
    animation: trovePulse 2s ease-in-out infinite;
  }
  @keyframes trovePulse {
    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(10,132,255,0.3)); }
    50% { transform: scale(1.05); filter: drop-shadow(0 0 35px rgba(10,132,255,0.6)); }
  }

  /* TOP NAV */
  .top-nav { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; z-index: 50; }
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

  /* HERO TITLE */
  .hero-title { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; line-height: 1.2; margin-bottom: 24px; color: #ffffff; }
  .hero-title-row { display: flex; align-items: center; flex-wrap: nowrap; gap: 8px; }

  .section-label { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
  
  .input-group { margin-bottom: 24px; position: relative; }
  .ios-input {
    width: 100%; padding: 18px 20px; border-radius: var(--radius-lg);
    background: var(--bg-input); border: 1px solid transparent;
    color: var(--text-primary); font-size: 17px; outline: none;
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    transition: all 0.3s; font-family: var(--font);
  }
  .ios-input:focus { border-color: var(--tg-blue); background: var(--bg-card); }

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

  /* BOTTOM TAB BAR */
  .tab-bar-container { position: fixed; bottom: var(--safe-bottom); left: 24px; right: 24px; z-index: 40; }
  .ios-tab-bar {
    display: flex; justify-content: space-around; align-items: center;
    height: 72px; border-radius: 36px; padding: 6px;
    background: var(--bg-sheet); border: 1px solid var(--border);
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    position: relative; overflow: hidden;
  }
  .tab-active-pill {
    position: absolute; top: 6px; bottom: 6px;
    width: calc(25% - 12px); border-radius: 24px;
    background: rgba(0,122,255,0.15); border: 1px solid rgba(0,122,255,0.25);
    backdrop-filter: blur(20px) saturate(200%); -webkit-backdrop-filter: blur(20px) saturate(200%);
    transition: left 0.38s cubic-bezier(0.32,0.72,0,1); pointer-events: none; z-index: 0;
  }
  [data-theme="dark"] .tab-active-pill { background: rgba(10,132,255,0.2); border: 1px solid rgba(10,132,255,0.3); }
  .tab-btn {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    border: none; background: transparent; color: var(--text-secondary); height: 100%;
    font-family: var(--font); cursor: pointer; transition: color 0.3s; position: relative; z-index: 1;
  }
  .tab-btn.active { color: var(--tg-blue); }
  .tab-icon { margin-bottom: 2px; transition: transform 0.38s cubic-bezier(0.32,0.72,0,1); }
  .tab-label { font-size: 10px; font-weight: 700; letter-spacing: 0.2px; }

  /* SCOUTING LOADER */
  .scouting-overlay { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 24px; text-align: center; animation: fadeInUp 0.4s var(--bounce) forwards; }
  .scouting-spinner { width: 52px; height: 52px; border-radius: 50%; border: 3px solid rgba(0,122,255,0.15); border-top-color: var(--tg-blue); border-right-color: var(--tg-blue); animation: iosSpinAnim 0.7s cubic-bezier(0.4,0,0.2,1) infinite; margin-bottom: 28px; }
  .scouting-title { font-size: 24px; font-weight: 900; color: #ffffff; margin-bottom: 10px; letter-spacing: -0.3px; }
  .scouting-sub { font-size: 24px; font-weight: 900; color: #ffffff; line-height: 1.2; }
  
  /* IOS GROUPED LIST */
  .ios-group { border-radius: var(--radius-lg); background: var(--bg-card); border: 1px solid var(--border); backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur); overflow: hidden; margin-bottom: 24px; }
  .ios-row { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--border); cursor: pointer; font-size: 17px; font-weight: 500; transition: background 0.2s; color: var(--text-primary); text-decoration: none; }
  .ios-row:active { background: var(--bg-hover); }
  .ios-row:last-child { border-bottom: none; }
  .row-left { display: flex; align-items: center; gap: 16px; }
  .row-icon-box { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; }

  /* RESULTS GRID */
  .results-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 16px; }
  .result-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px; position: relative; backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur); display: flex; flex-direction: column; transition: transform 0.2s var(--bounce); cursor: pointer; color: var(--text-primary); overflow: hidden; }
  .result-card:active { transform: scale(0.96); }
  .result-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; z-index: 2; }
  .result-gift-img { width: 48px; height: 48px; border-radius: 12px; object-fit: cover; flex-shrink: 0; background: var(--bg-input); }

  /* SHEET OVERLAY */
  .sheet-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.4); backdrop-filter: blur(5px); display: flex; align-items: flex-end; opacity: 0; animation: fadeIn 0.3s forwards; }
  .sheet-content { width: 100%; max-height: 80vh; border-radius: 32px 32px 0 0; padding: 12px 24px 40px; background: var(--bg-sheet); border-top: 1px solid var(--border); backdrop-filter: blur(50px) saturate(200%); -webkit-backdrop-filter: blur(50px) saturate(200%); transform: translateY(100%); animation: slideUp 0.4s var(--bounce) forwards; overflow-y: auto; color: var(--text-primary); }
  .sheet-handle { width: 40px; height: 5px; border-radius: 100px; background: var(--text-secondary); margin: 0 auto 24px; opacity: 0.5; }
  .sheet-title { font-size: 22px; font-weight: 800; margin-bottom: 20px; text-align: center; color: var(--text-primary); }

  .page-header { font-size: 34px; font-weight: 900; letter-spacing: -1px; line-height: 1.15; margin-bottom: 24px; color: #ffffff; }

  @keyframes iosSpinAnim { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  @keyframes fadeIn { to { opacity: 1; } }
  @keyframes slideUp { to { transform: translateY(0); } }
  .fade-in-up { animation: fadeInUp 0.5s var(--bounce) forwards; }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
`;

// ─── UTILS ───────────────────────────────────────────────────────────────────
function rarityClass(rarityStr) {
  if (!rarityStr) return "rarity-common";
  const val = parseFloat(rarityStr);
  if (val < 2) return "rarity-ultra";
  if (val < 10) return "rarity-rare";
  if (val < 25) return "rarity-uncommon";
  return "rarity-common";
}

// Extract image directly from Fragment endpoints dynamically
function imageForGift(slug) {
  // fragment.getCollectibleInfo specifies utilizing thumb.webp for standard layouts
  return `https://fragment.com/file/gifts/${slug}/thumb.webp`;
}

function getMarketplaceUrl(market, slug, giftId) {
  const contractFallback = slug || "7608551523";
  if (market === "Fragment") return `https://fragment.com/gifts`; //
  if (market === "GetGems") return `https://getgems.io/collection/${contractFallback}`; //
  if (market === "MRKT") return `https://t.me/mrkt/app?startapp=${contractFallback}`;
  if (market === "Portals") return `https://t.me/portals_market_bot/market?startapp=gift_${contractFallback}_e3onts`;
  if (market === "Tonnel") return `https://t.me/tonnel_network_bot/gift?startapp=${giftId}`;
  return `https://t.me/gifttrove`;
}

// ─── WALLET DEEP LINKS ────────────────────────────────────────────────────────
const WALLET_ADDRESS = "UQCvd6Sw_JJQsedBGfR2JOn7it7VdREWQ7v3kIluUi0RPMXJ";
const DONATE_DESCRIPTION = "GiftTrove Donation";

function buildWalletUrl(wallet, amountTON) {
  const amountNano = Math.round((parseFloat(amountTON) || 0) * 1e9);
  const desc = encodeURIComponent(DONATE_DESCRIPTION);

  if (wallet === "TonKeeper") {
    return `tonkeeper://transfer/${WALLET_ADDRESS}?amount=${amountNano}&text=${desc}`; //
  }
  if (wallet === "MyTonWallet") {
    return `https://mytonwallet.io/transfer/${WALLET_ADDRESS}?amount=${amountNano}&comment=${desc}`; //
  }
  if (wallet === "Tg Wallet") {
    return `https://t.me/wallet?startattach=ton_transfer-${WALLET_ADDRESS}`; //
  }
  return `ton://transfer/${WALLET_ADDRESS}?amount=${amountNano}&text=${desc}`; //
}

// ─── APP COMPONENT ───────────────────────────────────────────────────────────
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("gt_theme") || "dark");
  const [lang, setLang] = useState(() => localStorage.getItem("gt_lang") || "EN");
  const [savedGifts, setSavedGifts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gt_saved") || "[]"); } catch { return []; }
  });
  
  // Notice: referralCount synced strictly locally. Database integration needed for cross-device sync.
  const [referralCount, setReferralCount] = useState(() => parseInt(localStorage.getItem("gt_ref_count") || "0", 10));

  const [activeTab, setActiveTab] = useState("scout");
  const [toast, setToast] = useState(null);
  const [isScouting, setIsScouting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSheet, setActiveSheet] = useState(null);

  const [giftQuery, setGiftQuery] = useState("");
  const [giftId, setGiftId] = useState("");
  const [selectedMarkets, setSelectedMarkets] = useState(["All"]);

  const [donateStep, setDonateStep] = useState(1);
  const [donateAmount, setDonateAmount] = useState("");
  const [donateWallet, setDonateWallet] = useState("TonKeeper");
  const [donateTx, setDonateTx] = useState("");

  const t = T[lang] || T["EN"];
  const tgUser = typeof window !== "undefined" ? (window.Telegram?.WebApp?.initDataUnsafe?.user || { id: 12345678 }) : { id: 12345678 };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("gt_theme", theme);
  }, [theme]);
  useEffect(() => { localStorage.setItem("gt_lang", lang); }, [lang]);
  useEffect(() => { localStorage.setItem("gt_saved", JSON.stringify(savedGifts)); }, [savedGifts]);
  useEffect(() => { localStorage.setItem("gt_ref_count", referralCount.toString()); }, [referralCount]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleScout = () => {
    setIsScouting(true);
    setTimeout(() => {
      setIsScouting(false);
      setIsSearching(true);
    }, 2500);
  };

  const copyReferral = () => {
    const link = `https://t.me/gifttrovebot/app?startapp=${tgUser?.id || "demo"}`;
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(link);
    setReferralCount(prev => prev + 1);
    showToast("Referral link copied!");
  };

  const executeDonate = () => {
    const url = buildWalletUrl(donateWallet, donateAmount);
    window.open(url, "_blank");
    setDonateStep(2);
  };

  // Mock array mapper for visual layout checking
  const generateMockResults = () => {
    const slug = giftQuery ? giftQuery.toLowerCase().replace(/\s/g, "") : "plushpepe";
    return [1, 2, 3, 4].map(i => ({
      id: i,
      name: giftQuery || "Plush Pepe",
      slug: slug,
      model: "Classic",
      modelRarity: "12%",
      price: i === 1 ? "450 TON" : i === 2 ? "1,200 TON" : "80 TON",
      market: ["GetGems", "Portals", "MRKT", "Fragment"][i % 4],
      itemNumber: 1000 + i
    }));
  };

  const renderSheet = () => {
    if (!activeSheet) return null;
    if (activeSheet === "donate") {
      return (
        <div className="sheet-overlay" onClick={() => setActiveSheet(null)}>
          <div className="sheet-content" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            {donateStep === 1 && (
              <div className="fade-in-up">
                <div className="sheet-title">{t.donate}</div>
                <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: 24, fontSize: 15 }}>{t.donate_desc}</p>
                <div className="input-group">
                  <input type="number" className="ios-input" placeholder={t.amount_ton} value={donateAmount} onChange={e => setDonateAmount(e.target.value)} />
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
                <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: 24, fontSize: 15 }}>Please paste your Transaction Hash/ID to verify.</p>
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

    return null;
  };

  const tabs = [
    { id: "scout", icon: <IconSearch />, label: t.scout_tab },
    { id: "events", icon: <IconCalendar />, label: t.events_tab },
    { id: "saved", icon: <IconBookmark />, label: t.saved_tab },
    { id: "profile", icon: <IconUser />, label: t.profile_tab }
  ];

  return (
    <>
      <style>{styles}</style>
      
      {showSplash && (
        <div className={`launch-splash ${!showSplash ? 'fade-out' : ''}`}>
          <div className="trove-icon-glow"><IconTrove /></div>
          <div style={{ marginTop: 16, fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>GiftTrove</div>
        </div>
      )}

      <div className="app-container" data-theme={theme}>
        {toast && <div className="toast">{toast}</div>}

        <div className="top-nav">
          {activeTab === "scout" && isSearching ? (
            <div className="icon-btn" onClick={() => { setIsSearching(false); setIsScouting(false); }}><IconBack /></div>
          ) : (
            <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.5px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
              <GiftTroveLogo size={26} />
              GiftTrove
            </div>
          )}
          <div className="top-icons">
            <div className="icon-btn" onClick={() => setActiveSheet("lang")}><IconGlobe /></div>
            <div className="icon-btn" onClick={toggleTheme}>{theme === "dark" ? <IconMoon /> : <IconSun />}</div>
          </div>
        </div>

        <div className="content">
          {activeTab === "scout" && (
            isScouting ? (
              <div className="fade-in-up">
                <div className="scouting-overlay">
                  <div className="scouting-spinner" />
                  <div className="scouting-title">{t.scout_load_title}</div>
                  <div className="scouting-sub">{t.scout_load_sub}</div>
                </div>
              </div>
            ) : isSearching ? (
              <div className="fade-in-up" style={{ marginTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{t.results}</div>
                </div>
                <div className="results-grid">
                  {generateMockResults().map(item => (
                    <div key={item.id} className="result-card" onClick={() => window.open(getMarketplaceUrl(item.market, item.slug, item.id), "_blank")}>
                      <img src={imageForGift(item.slug)} alt={item.name} className="result-gift-img" style={{ width: "100%", height: 120, marginBottom: 12 }} onError={e => { e.target.style.display = "none"; }} />
                      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>#{item.itemNumber} • {item.market}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--tg-blue)", marginTop: "auto" }}>{item.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="fade-in-up">
                <div className="hero-title" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span>{t.fastest_way}</span>
                  <GiftTroveLogo size={32} />
                </div>
                <div className="input-group">
                  <div className="section-label">{t.gift_name}</div>
                  <input className="ios-input" placeholder="e.g. Plush Pepe" value={giftQuery} onChange={e => setGiftQuery(e.target.value)} />
                </div>
                <div className="input-group">
                  <div className="section-label">{t.marketplaces}</div>
                  <div className="chips-grid">
                    {MARKETPLACES.map(m => (
                      <div key={m} className={`chip ${selectedMarkets.includes(m) ? "active" : ""}`} onClick={() => {
                        if (m === "All") setSelectedMarkets(["All"]);
                        else {
                          const updated = selectedMarkets.filter(x => x !== "All");
                          updated.includes(m) ? setSelectedMarkets(updated.filter(x => x !== m)) : setSelectedMarkets([...updated, m]);
                        }
                      }}>{m}</div>
                    ))}
                  </div>
                </div>
                <button className="action-btn" onClick={handleScout}>{t.scout_gift}</button>
              </div>
            )
          )}

          {activeTab === "events" && (
            <div className="fade-in-up" style={{ textAlign: "center", marginTop: "40%" }}>
              <div style={{ color: "var(--text-secondary)", marginBottom: 16 }}><IconCalendar /></div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{t.no_events}</div>
              <div style={{ color: "var(--text-secondary)", marginTop: 8 }}>{t.check_back}</div>
            </div>
          )}

          {activeTab === "saved" && (
            <div className="fade-in-up">
              <div className="page-header">{t.saved_tab}</div>
              <div className="ios-group" style={{ padding: 20, textAlign: "center", color: "var(--text-secondary)" }}>{t.no_saved}</div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="fade-in-up">
              <div className="page-header">{t.profile_tab}</div>
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
                <a href="https://t.me/insidemajek" target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                  <div className="ios-row">
                    <div className="row-left"><div className="row-icon-box" style={{ background: "#ff9500" }}><IconGlobe /></div>{t.comm_channel}</div>
                    <IconChevronRight />
                  </div>
                </a>
              </div>
              <div className="section-label">{t.support_builder}</div>
              <div className="ios-group">
                <div className="ios-row" onClick={() => setActiveSheet("donate")}>
                  <div className="row-left"><div className="row-icon-box" style={{ background: "#ff2d55" }}><IconHeart /></div>{t.donate}</div>
                  <IconChevronRight />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="tab-bar-container">
          <div className="ios-tab-bar" style={{ position: "relative" }}>
            <div className="tab-active-pill" style={{ left: `calc(${tabs.findIndex(t => t.id === activeTab)} * 25% + 6px)` }} />
            {tabs.map((tab) => (
              <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? "active" : ""}`} onClick={() => { setActiveTab(tab.id); setIsSearching(false); setIsScouting(false); }}>
                <div className={`tab-icon ${activeTab === tab.id ? "tab-icon-active" : ""}`}>{tab.icon}</div>
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
