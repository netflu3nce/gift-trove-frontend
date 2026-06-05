import React, { useState, useEffect, useRef } from "react";

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────
const GIFTS = [
  "Plush Pepe", "Durov's Cap", "Jelly Bunny", "Magic Potion", "Loot Bag",
  "Vintage Cigar", "Eternal Candle", "Homemade Cake", "Sharp Tongue",
  "Spy Agaric", "Sakura Flower", "Spiced Wine", "Diamond Ring", "Evil Eye",
  "Frightful Egg", "Astral Shard", "Trapped Heart", "Skeleton Watch",
  "Voodoo Doll", "Hypno Lollipop", "Tama Gotchi", "Bunny Muffin",
  "Cookie Heart", "Witch Hat",
  "Santa Hat", "Candy Cane", "Ginger Cookie", "Xmas Stocking", "Snow Globe",
  "Snow Mittens", "Jingle Bells", "Sleigh Bell", "Winter Wreath", "Holiday Drink",
  "Eternal Rose", "Skull Flower", "Precious Peach",
  "Berry Box", "Kissed Frog", "Lunar Snake", "Pet Snake", "Snake Box",
  "Flying Broom", "Hex Pot", "Genie Lamp", "Mad Pumpkin", "Scared Cat",
  "Gem Signet", "Signet Ring", "Swiss Watch", "Perfume Bottle",
  "Record Player", "Mini Oscar", "Star Notepad", "Crystal Ball",
  "Ion Gem", "Electric Skull", "Desk Calendar",
  "Party Sparkler", "Jester Hat", "Hanging Star", "Love Candle",
  "Lol Pop", "Heart Locket", "Tama Gadget"
];

const MODELS = [
  "Common", "Rare", "Epic", "Legendary", "Mythical",
  "Hothead", "Krueger", "Pickle Rick", "Toading", "Pumpkin", "Lucipop",
  "Golden", "Diamond", "Platinum", "Silver", "Bronze",
  "Cyber", "Neon", "Shadow", "Flame", "Frost", "Void",
  "Crystal", "Emerald", "Ruby", "Sapphire", "Onyx"
];

const BACKDROPS = [
  "Black", "Onyx Black", "Midnight Blue", "Battleship Grey",
  "Electric Purple", "Lavender", "Cyberpunk", "Electric Indigo",
  "Purple", "Grape", "Dark Lilac", "English Violet", "Fandango", "Burgundy",
  "Neon Blue", "Navy Blue", "Sapphire", "Sky Blue", "Azure Blue",
  "Pacific Cyan", "Cobalt Blue", "French Blue", "Indigo Dye", "Marine Blue",
  "Aquamarine", "Pacific Green", "Emerald", "Mint Green", "Malachite",
  "Shamrock Green", "Turquoise", "Jade Green", "Tactical Pine", "Gunship Green",
  "Pine Green", "Hunter Green", "Pistachio",
  "Lemongrass", "Light Olive", "Satin Gold", "Pure Gold", "Amber",
  "Caramel", "Orange", "Khaki Green", "Desert Sand",
  "Carrot Juice", "Coral Red", "Persimmon", "Strawberry", "Raspberry",
  "Rosewood", "Mystic Pearl", "Steel Grey", "Silver Blue", "Roman Silver",
  "Platinum", "Ivory White", "Cappuccino", "Moonstone"
];

const SYMBOLS = [
  "Arabian Horse", "Calm Wolf", "Hedgehog", "Sumerian Bird",
  "Boat", "Owl", "Eagle", "Raven", "Phoenix", "Dragon",
  "Butterfly", "Bee", "Turtle", "Frog", "Cat", "Dog",
  "Bear", "Fox", "Rabbit", "Snake",
  "Coin", "Crown", "Star", "Moon", "Sun",
  "Heart", "Diamond", "Skull", "Lightning", "Shield",
  "Sword", "Flame", "Crystal", "Key", "Anchor",
  "Hourglass", "Eye", "Feather", "Leaf", "Rose",
  "Comet", "Nebula", "Galaxy", "Aurora", "Prism",
  "Rune", "Sigil", "Glyph", "Totem", "Amulet"
];

const MARKETPLACES = ["All", "GetGems", "Portals", "MRKT", "Telegram", "Fragment", "Tonnel"];

const LANGS = { EN: "English", RU: "Русский", ZH: "中文" };

const DONATE_ADDRESS = "UQCvd6Sw_JJQsedBGfR2JOn7it7VdREWQ7v3kIluUi0RPMXJ";

const WALLET_LINKS = {
  MyTonWallet: (amount) => `https://app.mytonwallet.io/transfer/${DONATE_ADDRESS}?amount=${amount}&comment=GiftTrove%20Donation`,
  TgWallet: (amount) => `https://t.me/wallet?startapp=transfer-${DONATE_ADDRESS}-${amount}`,
  TonKeeper: (amount) => `https://app.tonkeeper.com/transfer/${DONATE_ADDRESS}?amount=${amount}&text=GiftTrove%20Donation`,
};

// ─── PERSIST HELPER ───────────────────────────────────────────────────────────
const STORAGE_KEY = "gifttrove_state_v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// ─── MOCK RESULT GENERATOR ────────────────────────────────────────────────────
function generateResults(giftQuery, giftId, selectedMarkets, selectedModel, selectedBackdrop, selectedSymbol) {
  const name = giftQuery || "Durov's Cap";
  const markets = selectedMarkets.includes("All")
    ? ["GetGems", "Portals", "MRKT", "Fragment"]
    : selectedMarkets;
  const count = giftId ? 1 : Math.floor(Math.random() * 8) + 3;
  const results = [];
  for (let i = 0; i < count; i++) {
    const id = giftId ? parseInt(giftId) : Math.floor(Math.random() * 9000) + 1000;
    const baseGram = Math.floor(Math.random() * 800) + 200;
    const market = markets[i % markets.length];
    const model = selectedModel !== "Any" ? selectedModel : MODELS[Math.floor(Math.random() * MODELS.length)];
    const backdrop = selectedBackdrop !== "Any" ? selectedBackdrop : BACKDROPS[Math.floor(Math.random() * BACKDROPS.length)];
    const symbol = selectedSymbol !== "Any" ? selectedSymbol : SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    results.push({ id, name, market, model, backdrop, symbol, gram: baseGram, usd: (baseGram * 2.44).toFixed(0) });
  }
  return results;
}

function getMarketplaceUrl(market, name, id) {
  const slug = encodeURIComponent(name.toLowerCase().replace(/\s+/g, "-"));
  switch (market) {
    case "GetGems": return `https://getgems.io/nft/${slug}-${id}`;
    case "Fragment": return `https://fragment.com/gift/${slug}-${id}`;
    case "Portals": return `https://portals.fi/gifts/${slug}`;
    case "MRKT": return `https://mrkt.ton/${slug}`;
    case "Tonnel": return `https://tonnel.network/gifts/${slug}`;
    default: return `https://t.me/nft/${slug}-${id}`;
  }
}

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
const IconSearch = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const IconCalendar = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconBookmark = ({ filled }) => <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
const IconUser = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconChevronRight = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const IconSun = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const IconMoon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
const IconGlobe = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const IconHeart = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const IconBack = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const IconCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconExternalLink = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
const IconUsers = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconLink = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
const IconChat = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IconMail = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const IconCopy = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;

// ─── APPLE MORPHISM STYLES ────────────────────────────────────────────────────
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

  /* FIX: attribute list text in light mode */
  [data-theme="light"] .sheet-list-item,
  [data-theme="light"] .sheet-list-item span {
    color: #000000 !important;
  }
  [data-theme="light"] .sheet-list-item .check-icon {
    color: var(--tg-blue) !important;
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
  }
  .content::-webkit-scrollbar { display: none; }

  .hero-title {
    font-size: 34px; font-weight: 800; letter-spacing: -1px; line-height: 1.1;
    margin-bottom: 24px; transition: opacity 0.3s, transform 0.3s;
  }
  .section-label {
    font-size: 15px; font-weight: 600; color: var(--text-primary);
    margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;
  }

  .input-group { margin-bottom: 24px; }
  .ios-input {
    width: 100%; padding: 18px 20px; border-radius: var(--radius-lg);
    background: var(--bg-input); border: 1px solid transparent;
    color: var(--text-primary); font-size: 17px; outline: none;
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    transition: all 0.3s; font-family: var(--font);
  }
  .ios-input:focus { border-color: var(--tg-blue); background: var(--bg-card); }

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

  .tab-bar-container { position: fixed; bottom: var(--safe-bottom); left: 24px; right: 24px; z-index: 40; }
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

  /* ── BOTTOM SHEET ── */
  .sheet-overlay {
    position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.4);
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
  .sheet-handle { width: 40px; height: 5px; border-radius: 100px; background: var(--text-secondary); margin: 0 auto 24px; opacity: 0.5; }
  .sheet-title { font-size: 22px; font-weight: 800; margin-bottom: 20px; text-align: center; color: var(--text-primary); }

  .sheet-list-item {
    padding: 18px 20px; font-size: 17px; font-weight: 600; border-bottom: 1px solid var(--border);
    display: flex; justify-content: space-between; align-items: center; cursor: pointer;
    color: var(--text-primary);
  }
  .sheet-list-item:active { background: var(--bg-hover); }
  .sheet-list-item:last-child { border-bottom: none; }

  /* ── PROFILE ROWS ── */
  .ios-group {
    border-radius: var(--radius-lg); background: var(--bg-card); border: 1px solid var(--border);
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    overflow: hidden; margin-bottom: 24px;
  }
  .ios-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 20px; border-bottom: 1px solid var(--border); cursor: pointer;
    font-size: 17px; font-weight: 500; transition: background 0.2s; color: var(--text-primary);
  }
  .ios-row:active { background: var(--bg-hover); }
  .ios-row:last-child { border-bottom: none; }
  .row-left { display: flex; align-items: center; gap: 16px; }
  .row-icon-box { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; }

  /* ── RESULT CARD ── */
  .result-card {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius-lg); backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    margin-bottom: 14px; overflow: hidden; cursor: pointer;
    transition: transform 0.2s var(--bounce), box-shadow 0.2s;
    animation: fadeInUp 0.4s var(--bounce) both;
  }
  .result-card:active { transform: scale(0.98); }
  .result-card-body { padding: 16px 18px; display: flex; justify-content: space-between; align-items: center; }
  .result-card-actions { display: flex; gap: 10px; padding: 0 18px 14px; }
  .result-action-btn {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
    padding: 10px; border-radius: 12px; border: 1px solid var(--border);
    background: var(--bg-input); color: var(--text-primary); font-size: 13px; font-weight: 700;
    cursor: pointer; transition: all 0.2s var(--bounce); text-decoration: none;
    font-family: var(--font);
  }
  .result-action-btn:active { transform: scale(0.95); }
  .result-action-btn.bookmarked { background: rgba(10, 132, 255, 0.15); border-color: var(--tg-blue); color: var(--tg-blue); }
  .result-action-btn.buy-btn { background: var(--tg-blue); border-color: var(--tg-blue); color: #fff; }

  /* ── GIFT DETAIL SHEET ── */
  .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--border); }
  .detail-row:last-child { border-bottom: none; }
  .detail-label { font-size: 14px; color: var(--text-secondary); font-weight: 500; }
  .detail-value { font-size: 15px; font-weight: 700; color: var(--text-primary); }

  /* ── REFERRAL CARD ── */
  .referral-card {
    background: linear-gradient(135deg, rgba(10,132,255,0.15), rgba(10,132,255,0.05));
    border: 1px solid rgba(10,132,255,0.3); border-radius: var(--radius-lg);
    padding: 20px; margin-bottom: 24px;
  }
  .referral-link-box {
    display: flex; align-items: center; gap: 10px;
    background: var(--bg-input); border-radius: 12px; padding: 12px 16px; margin-top: 12px;
  }
  .referral-link-text { flex: 1; font-size: 13px; font-weight: 600; color: var(--tg-blue); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .copy-btn {
    background: var(--tg-blue); color: white; border: none; border-radius: 8px;
    padding: 8px 12px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;
    font-family: var(--font); transition: transform 0.2s;
  }
  .copy-btn:active { transform: scale(0.92); }

  /* ── DONATE SHEET ── */
  .donate-amount-input {
    width: 100%; padding: 18px 20px; border-radius: var(--radius-lg);
    background: var(--bg-input); border: 1px solid transparent;
    color: var(--text-primary); font-size: 28px; font-weight: 800; outline: none;
    text-align: center; backdrop-filter: var(--blur); font-family: var(--font);
    transition: border-color 0.3s;
  }
  .donate-amount-input:focus { border-color: var(--tg-blue); }
  .wallet-btn {
    width: 100%; padding: 16px; border-radius: var(--radius-lg); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-primary); font-size: 16px; font-weight: 700;
    cursor: pointer; transition: all 0.2s var(--bounce); font-family: var(--font);
    display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px;
  }
  .wallet-btn:active { transform: scale(0.97); background: var(--bg-hover); }
  .txid-input {
    width: 100%; padding: 16px 20px; border-radius: var(--radius-lg);
    background: var(--bg-input); border: 1px solid transparent;
    color: var(--text-primary); font-size: 15px; outline: none;
    backdrop-filter: var(--blur); font-family: var(--font); transition: border-color 0.3s;
    margin-top: 12px;
  }
  .txid-input:focus { border-color: var(--tg-blue); }
  .thank-you-box {
    text-align: center; padding: 40px 20px;
    animation: fadeInUp 0.5s var(--bounce) forwards;
  }
  .thank-you-emoji { font-size: 64px; margin-bottom: 16px; }
  .thank-you-title { font-size: 26px; font-weight: 800; margin-bottom: 8px; }
  .thank-you-sub { color: var(--text-secondary); font-size: 15px; }

  /* ── ANIMATIONS ── */
  @keyframes fadeIn { to { opacity: 1; } }
  @keyframes slideUp { to { transform: translateY(0); } }
  .fade-in-up { animation: fadeInUp 0.5s var(--bounce) forwards; }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes popIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
  .pop-in { animation: popIn 0.35s var(--bounce) forwards; }
`;

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  // ── Load persisted state ──
  const saved = loadState() || {};

  const [theme, setTheme] = useState(saved.theme || "dark");
  const [lang, setLang] = useState(saved.lang || "EN");
  const [activeTab, setActiveTab] = useState("scout");
  const [savedGifts, setSavedGifts] = useState(saved.savedGifts || []);
  const [referralCount] = useState(saved.referralCount || 0);

  // Scout
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [giftQuery, setGiftQuery] = useState("");
  const [giftId, setGiftId] = useState("");
  const [selectedMarkets, setSelectedMarkets] = useState(["All"]);
  const [selectedModel, setSelectedModel] = useState("Any");
  const [selectedBackdrop, setSelectedBackdrop] = useState("Any");
  const [selectedSymbol, setSelectedSymbol] = useState("Any");

  // UI
  const [activeSheet, setActiveSheet] = useState(null);
  const [detailGift, setDetailGift] = useState(null);

  // Donate flow
  const [donateStep, setDonateStep] = useState("intro"); // intro | amount | wallet | txid | done
  const [donateAmount, setDonateAmount] = useState("");
  const [txId, setTxId] = useState("");
  const [txError, setTxError] = useState("");
  const [copiedRef, setCopiedRef] = useState(false);

  // Referral link (mock based on user id placeholder)
  const referralLink = "https://t.me/GiftTroveBot?start=ref_user123";

  // Persist state on change
  useEffect(() => {
    saveState({ theme, lang, savedGifts, referralCount });
  }, [theme, lang, savedGifts, referralCount]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === "dark" ? "light" : "dark"));

  const handleMarketToggle = (m) => {
    if (m === "All") { setSelectedMarkets(["All"]); return; }
    let nm = selectedMarkets.filter(x => x !== "All");
    if (nm.includes(m)) {
      nm = nm.filter(x => x !== m);
      if (nm.length === 0) nm = ["All"];
    } else { nm.push(m); }
    setSelectedMarkets(nm);
  };

  const handleScout = () => {
    const results = generateResults(giftQuery, giftId, selectedMarkets, selectedModel, selectedBackdrop, selectedSymbol);
    setSearchResults(results);
    setIsSearching(true);
  };

  const toggleSave = (gift) => {
    setSavedGifts(prev => {
      const key = `${gift.name}#${gift.id}`;
      const exists = prev.find(g => `${g.name}#${g.id}` === key);
      return exists ? prev.filter(g => `${g.name}#${g.id}` !== key) : [...prev, gift];
    });
  };

  const isGiftSaved = (gift) => {
    const key = `${gift.name}#${gift.id}`;
    return savedGifts.some(g => `${g.name}#${g.id}` === key);
  };

  const handleCopyRef = () => {
    navigator.clipboard.writeText(referralLink).catch(() => {});
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const validateTxId = (val) => /^[a-fA-F0-9]{64}$/.test(val.trim()) || val.trim().length >= 32;

  const handleDonate = () => {
    if (!donateAmount || isNaN(donateAmount) || parseFloat(donateAmount) <= 0) return;
    setDonateStep("wallet");
  };

  const handleWalletRedirect = (walletName) => {
    const gramAmount = parseFloat(donateAmount);
    const url = WALLET_LINKS[walletName](gramAmount);
    window.open(url, "_blank");
    setTimeout(() => setDonateStep("txid"), 800);
  };

  const handleTxSubmit = () => {
    if (!validateTxId(txId)) {
      setTxError("Please enter a valid transaction ID.");
      return;
    }
    setTxError("");
    setDonateStep("done");
  };

  // ── RESULT CARD ──
  const ResultCard = ({ gift, idx }) => {
    const saved = isGiftSaved(gift);
    return (
      <div
        className="result-card"
        style={{ animationDelay: `${idx * 0.05}s` }}
        onClick={() => setDetailGift(gift)}
      >
        <div className="result-card-body">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 3 }}>
              {gift.name} #{gift.id}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {gift.market} · {gift.model}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--tg-blue)" }}>
              {gift.gram.toLocaleString()} GRAM
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>~${gift.usd}</div>
          </div>
        </div>
        <div className="result-card-actions" onClick={e => e.stopPropagation()}>
          <button
            className={`result-action-btn ${saved ? "bookmarked" : ""}`}
            onClick={() => toggleSave(gift)}
          >
            <IconBookmark filled={saved} />
            {saved ? "Saved" : "Save"}
          </button>
          <a
            className="result-action-btn buy-btn"
            href={getMarketplaceUrl(gift.market, gift.name, gift.id)}
            target="_blank"
            rel="noreferrer"
          >
            <IconExternalLink />
            Buy
          </a>
        </div>
      </div>
    );
  };

  // ── GIFT DETAIL SHEET ──
  const renderDetailSheet = () => {
    if (!detailGift) return null;
    return (
      <div className="sheet-overlay" onClick={() => setDetailGift(null)}>
        <div className="sheet-content pop-in" onClick={e => e.stopPropagation()}>
          <div className="sheet-handle" />
          <div className="sheet-title">{detailGift.name} #{detailGift.id}</div>
          <div style={{ marginBottom: 24 }}>
            {[
              ["Marketplace", detailGift.market],
              ["Model", detailGift.model],
              ["Symbol", detailGift.symbol],
              ["Backdrop", detailGift.backdrop],
              ["GRAM Value", `${detailGift.gram.toLocaleString()} GRAM`],
              ["USD Est.", `~$${detailGift.usd}`],
            ].map(([label, value]) => (
              <div className="detail-row" key={label}>
                <span className="detail-label">{label}</span>
                <span className="detail-value">{value}</span>
              </div>
            ))}
          </div>
          <a
            className="action-btn"
            style={{ display: "block", textAlign: "center", textDecoration: "none", padding: "18px" }}
            href={getMarketplaceUrl(detailGift.market, detailGift.name, detailGift.id)}
            target="_blank"
            rel="noreferrer"
          >
            View on {detailGift.market}
          </a>
        </div>
      </div>
    );
  };

  // ── DONATE SHEET ──
  const renderDonateSheet = () => {
    return (
      <div className="sheet-overlay" onClick={() => { setActiveSheet(null); setDonateStep("intro"); setDonateAmount(""); setTxId(""); setTxError(""); }}>
        <div className="sheet-content" onClick={e => e.stopPropagation()}>
          <div className="sheet-handle" />

          {donateStep === "intro" && (
            <div className="fade-in-up">
              <div className="sheet-title">Support GiftTrove 💙</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.6, marginBottom: 28, textAlign: "center" }}>
                GiftTrove was made free so everyone in the community can scout gifts without barriers.
                If it's been helpful, consider throwing in a little support — every GRAM goes directly to keeping it alive and improving it.
              </div>
              <button className="action-btn" onClick={() => setDonateStep("amount")}>
                I'd like to donate ✨
              </button>
            </div>
          )}

          {donateStep === "amount" && (
            <div className="fade-in-up">
              <div className="sheet-title">How much? 💰</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 14, textAlign: "center", marginBottom: 16 }}>Enter the amount in GRAM you'd like to send</div>
              <input
                className="donate-amount-input"
                type="number"
                placeholder="e.g. 50"
                value={donateAmount}
                onChange={e => setDonateAmount(e.target.value)}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 14, marginBottom: 20 }}>
                {["10", "25", "50", "100"].map(amt => (
                  <button key={amt} className="wallet-btn" style={{ flex: 1, marginBottom: 0, padding: "12px" }} onClick={() => setDonateAmount(amt)}>
                    {amt}
                  </button>
                ))}
              </div>
              <button className="action-btn" onClick={handleDonate} disabled={!donateAmount}>
                Continue
              </button>
            </div>
          )}

          {donateStep === "wallet" && (
            <div className="fade-in-up">
              <div className="sheet-title">Choose Wallet 👛</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 14, textAlign: "center", marginBottom: 20 }}>
                Sending <strong style={{ color: "var(--text-primary)" }}>{donateAmount} GRAM</strong> to GiftTrove
              </div>
              {Object.keys(WALLET_LINKS).map(wallet => (
                <button key={wallet} className="wallet-btn" onClick={() => handleWalletRedirect(wallet)}>
                  <span style={{ fontSize: 20 }}>
                    {wallet === "MyTonWallet" ? "💎" : wallet === "TgWallet" ? "✈️" : "🔷"}
                  </span>
                  {wallet}
                  <IconExternalLink />
                </button>
              ))}
            </div>
          )}

          {donateStep === "txid" && (
            <div className="fade-in-up">
              <div className="sheet-title">Confirm Transaction 🧾</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 14, textAlign: "center", marginBottom: 8 }}>
                Once sent, paste your transaction ID below so we can verify your support.
              </div>
              <input
                className="txid-input"
                placeholder="Paste Transaction ID..."
                value={txId}
                onChange={e => { setTxId(e.target.value); setTxError(""); }}
              />
              {txError && (
                <div style={{ color: "#ff3b30", fontSize: 13, marginTop: 8, textAlign: "center" }}>{txError}</div>
              )}
              <button className="action-btn" style={{ marginTop: 16 }} onClick={handleTxSubmit}>
                Verify Donation
              </button>
            </div>
          )}

          {donateStep === "done" && (
            <div className="thank-you-box">
              <div className="thank-you-emoji">🙏</div>
              <div className="thank-you-title">Thank you for your Support!</div>
              <div className="thank-you-sub">
                Your contribution keeps GiftTrove free and growing. You're the real one.
              </div>
              <button className="action-btn" style={{ marginTop: 28 }} onClick={() => { setActiveSheet(null); setDonateStep("intro"); setDonateAmount(""); setTxId(""); }}>
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── ATTRIBUTE / LANG SHEET ──
  const renderSheet = () => {
    if (activeSheet === "donate") return renderDonateSheet();
    if (!activeSheet) return null;

    let title, options, currentVal, setVal;
    if (activeSheet === "model") { title = "Select Model"; options = ["Any", ...MODELS]; currentVal = selectedModel; setVal = setSelectedModel; }
    else if (activeSheet === "backdrop") { title = "Select Backdrop"; options = ["Any", ...BACKDROPS]; currentVal = selectedBackdrop; setVal = setSelectedBackdrop; }
    else if (activeSheet === "symbol") { title = "Select Symbol"; options = ["Any", ...SYMBOLS]; currentVal = selectedSymbol; setVal = setSelectedSymbol; }
    else if (activeSheet === "lang") {
      return (
        <div className="sheet-overlay" onClick={() => setActiveSheet(null)}>
          <div className="sheet-content" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">Language</div>
            <div className="ios-group" style={{ margin: 0 }}>
              {Object.entries(LANGS).map(([k, v]) => (
                <div
                  key={k}
                  className="sheet-list-item"
                  onClick={() => { setLang(k); setActiveSheet(null); }}
                >
                  <span style={{ color: "var(--text-primary)" }}>{v}</span>
                  {lang === k && (
                    <span className="check-icon" style={{ color: "var(--tg-blue)" }}>
                      <IconCheck />
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    else return null;

    return (
      <div className="sheet-overlay" onClick={() => setActiveSheet(null)}>
        <div className="sheet-content" onClick={e => e.stopPropagation()}>
          <div className="sheet-handle" />
          <div className="sheet-title">{title}</div>
          <div className="ios-group" style={{ margin: 0 }}>
            {options.map(opt => (
              <div
                key={opt}
                className="sheet-list-item"
                onClick={() => { setVal(opt); setActiveSheet(null); }}
              >
                <span style={{ color: "var(--text-primary)" }}>{opt}</span>
                {currentVal === opt && (
                  <span className="check-icon" style={{ color: "var(--tg-blue)" }}>
                    <IconCheck />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <div className="app-container">

        {/* TOP NAV */}
        <div className="top-nav">
          {activeTab === "scout" && isSearching ? (
            <div className="icon-btn" onClick={() => setIsSearching(false)}><IconBack /></div>
          ) : (
            <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.5px" }}>GiftTrove</div>
          )}
          <div className="top-icons">
            <div className="icon-btn" onClick={() => setActiveSheet("lang")}><IconGlobe /></div>
            <div className="icon-btn" onClick={toggleTheme}>
              {theme === "dark" ? <IconMoon /> : <IconSun />}
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="content">

          {/* ── SCOUT TAB ── */}
          {activeTab === "scout" && (
            <div className="fade-in-up">
              {!isSearching && (
                <div className="hero-title">The fastest way to find any Telegram Gift.</div>
              )}

              {!isSearching ? (
                <div>
                  <div className="input-group">
                    <div className="section-label">Gift Name</div>
                    <input className="ios-input" placeholder="e.g. Durov's Cap" value={giftQuery} onChange={e => setGiftQuery(e.target.value)} />
                  </div>

                  <div className="input-group">
                    <div className="section-label">
                      Specific ID <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>(Optional)</span>
                    </div>
                    <input type="number" className="ios-input" placeholder="#12345" value={giftId} onChange={e => setGiftId(e.target.value)} />
                  </div>

                  <div className="input-group">
                    <div className="section-label">Marketplaces</div>
                    <div className="chips-grid">
                      {MARKETPLACES.map(m => (
                        <div key={m} className={`chip ${selectedMarkets.includes(m) ? "active" : ""}`} onClick={() => handleMarketToggle(m)}>
                          {m}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="input-group">
                    <div className="section-label">Attributes</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div className="select-btn" onClick={() => setActiveSheet("model")}>
                        <span>Model</span>
                        <span className="select-val">{selectedModel} <IconChevronRight /></span>
                      </div>
                      <div className="select-btn" onClick={() => setActiveSheet("backdrop")}>
                        <span>Backdrop</span>
                        <span className="select-val">{selectedBackdrop} <IconChevronRight /></span>
                      </div>
                      <div className="select-btn" onClick={() => setActiveSheet("symbol")}>
                        <span>Symbol</span>
                        <span className="select-val">{selectedSymbol} <IconChevronRight /></span>
                      </div>
                    </div>
                  </div>

                  <button className="action-btn" onClick={handleScout}>Scout Gift</button>
                </div>
              ) : (
                /* ── RESULTS VIEW ── */
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>Results</div>
                    <div style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 600 }}>
                      {searchResults.length} found
                    </div>
                  </div>
                  {searchResults.map((gift, idx) => (
                    <ResultCard key={`${gift.name}-${gift.id}-${idx}`} gift={gift} idx={idx} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── EVENTS TAB ── */}
          {activeTab === "events" && (
            <div className="fade-in-up" style={{ textAlign: "center", marginTop: "40%" }}>
              <div style={{ color: "var(--text-secondary)", marginBottom: 16 }}><IconCalendar /></div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>There is no event ongoing</div>
              <div style={{ color: "var(--text-secondary)", marginTop: 8 }}>Check back later for market drops.</div>
            </div>
          )}

          {/* ── SAVED TAB ── */}
          {activeTab === "saved" && (
            <div className="fade-in-up">
              <div className="hero-title">Saved</div>
              {savedGifts.length === 0 ? (
                <div className="ios-group" style={{ padding: 20, textAlign: "center", color: "var(--text-secondary)" }}>
                  No gifts saved yet.
                </div>
              ) : (
                savedGifts.map((gift, idx) => (
                  <ResultCard key={`saved-${gift.name}-${gift.id}-${idx}`} gift={gift} idx={idx} />
                ))
              )}
            </div>
          )}

          {/* ── PROFILE TAB ── */}
          {activeTab === "profile" && (
            <div className="fade-in-up">
              <div className="hero-title">Profile</div>

              {/* Referral Card */}
              <div className="referral-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 2 }}>Your Referral Count</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "var(--tg-blue)" }}>{referralCount} invited</div>
                  </div>
                  <div style={{ fontSize: 36 }}>🎁</div>
                </div>
                <div className="referral-link-box">
                  <span className="referral-link-text">{referralLink}</span>
                  <button className="copy-btn" onClick={handleCopyRef}>
                    <IconCopy />
                    {copiedRef ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Community */}
              <div className="section-label">Community</div>
              <div className="ios-group">
                <a href="https://t.me/insidemajek" target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="ios-row">
                    <div className="row-left">
                      <div className="row-icon-box" style={{ background: "#0a84ff" }}>
                        <IconUsers />
                      </div>
                      Community Channel
                    </div>
                    <IconChevronRight />
                  </div>
                </a>
                <a href="#" style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="ios-row">
                    <div className="row-left">
                      <div className="row-icon-box" style={{ background: "#34c759" }}>
                        <IconChat />
                      </div>
                      Community Chat
                    </div>
                    <IconChevronRight />
                  </div>
                </a>
                <a href="https://t.me/insidemajek" target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="ios-row">
                    <div className="row-left">
                      <div className="row-icon-box" style={{ background: "#ff9f0a" }}>
                        <IconMail />
                      </div>
                      Contact Support
                    </div>
                    <IconChevronRight />
                  </div>
                </a>
              </div>

              {/* Donate */}
              <div className="section-label">Support the Builder</div>
              <div className="ios-group">
                <div className="ios-row" onClick={() => { setActiveSheet("donate"); setDonateStep("intro"); }}>
                  <div className="row-left">
                    <div className="row-icon-box" style={{ background: "#ff2d55" }}><IconHeart /></div>
                    Donate
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

        {/* BOTTOM TAB BAR */}
        <div className="tab-bar-container">
          <div className="ios-tab-bar">
            {[
              { id: "scout", icon: <IconSearch />, label: "Scout" },
              { id: "events", icon: <IconCalendar />, label: "Events" },
              { id: "saved", icon: <IconBookmark filled={savedGifts.length > 0} />, label: "Saved" },
              { id: "profile", icon: <IconUser />, label: "Profile" },
            ].map(t => (
              <button key={t.id} className={`tab-btn ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
                <div className="tab-icon">{t.icon}</div>
                <span className="tab-label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* SHEETS */}
        {renderSheet()}
        {renderDetailSheet()}

      </div>
    </>
  );
}
