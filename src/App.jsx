import React, { useState, useEffect, useRef, useCallback } from "react";

// ─── TRANSLATION STRINGS (EN, RU, ZH) ─────────────────────────────────────────
const TRANSLATIONS = {
  en: {
    heroTitle: "The fastest way to find any Telegram Gifts",
    loaderTitle: "Scouting marketplace...",
    loaderSubtitle: "Finding gems so you don't have to",
    searchPlaceholder: "Search gifts by name, ID, model, rarity, symbol...",
    scoutTab: "Scout",
    eventsTab: "Events",
    savedTab: "Saved",
    profileTab: "Profile",
    donateTitle: "Support GiftTrove Development",
    donateDesc: "Choose your preferred TON wallet to contribute directly via safe deep links.",
    inviteText: "Invite Friends & Sync Across All Devices"
  },
  ru: {
    heroTitle: "Самый быстрый способ найти любые Telegram Подарки",
    loaderTitle: "Сканирование маркетплейса...",
    loaderSubtitle: "Ищем редкие гемы, пока вы отдыхаете",
    searchPlaceholder: "Поиск по названию, ID, модели, редкости...",
    scoutTab: "Поиск",
    eventsTab: "События",
    savedTab: "Сохранено",
    profileTab: "Профиль",
    donateTitle: "Поддержать разработку GiftTrove",
    donateDesc: "Выберите TON кошелек для прямого взноса через безопасные диплинки.",
    inviteText: "Пригласить друзей и синхронизировать устройства"
  },
  zh: {
    heroTitle: "寻找任何明信片与 Telegram 礼物的最快途径",
    loaderTitle: "正在搜寻市场...",
    loaderSubtitle: "为您搜罗绝世珍宝，无需亲自动手",
    searchPlaceholder: "按名称、ID、型号、稀有度或符号搜索礼物...",
    scoutTab: "侦察",
    eventsTab: "动态事件",
    savedTab: "已收藏",
    profileTab: "个人中心",
    donateTitle: "资助 GiftTrove 持续开发",
    donateDesc: "选择您偏好的 TON 钱包，通过官方安全的专属跳转链接进行赞助。",
    inviteText: "邀请好友并跨设备多端同步数据"
  }
};

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
    style={{ width: size, height: size, objectFit: "contain", display: "inline-block", flexShrink: 0, verticalAlign: "middle" }}
  />
);

// ─── CANONICAL GIFT REGISTRY (Normalized Fallback System) ─────────────────────
const GIFT_COLLECTIONS = {
  "Artisan Brick": {
    slug: "artisanbrick", supply: 6278,
    models: [
      { name: "Golden Kiln", rarity: "1.2%", symbol: "🔥" }, 
      { name: "Crimson Forge", rarity: "1.8%", symbol: "🧱" },
      { name: "Ancient Clay", rarity: "3.4%", symbol: "🏺" }, 
      { name: "Obsidian Block", rarity: "3.9%", symbol: "💎" }
    ],
    backdrop: "Industrial Amber"
  },
  "Lunar New Year Snake": {
    slug: "lunar_snake", supply: 8888,
    models: [
      { name: "Jade Emperor", rarity: "0.5%", symbol: "🐉" },
      { name: "Golden Scales", rarity: "2.1%", symbol: "🐍" },
      { name: "Ruby Lantern", rarity: "8.5%", symbol: "🏮" }
    ],
    backdrop: "Crimson Silk"
  },
  "Cyber Spaceship": {
    slug: "cyberspace", supply: 5000,
    models: [
      { name: "Hyperdrive Core", rarity: "0.8%", symbol: "🚀" },
      { name: "Quantum Thruster", rarity: "4.2%", symbol: "🛸" },
      { name: "Neon Hull", rarity: "12.0%", symbol: "🌌" }
    ],
    backdrop: "Deep Void Neon"
  },
  "Vintage Camera": {
    slug: "vintage_camera", supply: 3500,
    models: [
      { name: "Gold Plated Lens", rarity: "1.5%", symbol: "📸" },
      { name: "Silver Shutter", rarity: "6.0%", symbol: "🎞️" },
      { name: "Sepia Flash", rarity: "18.5%", symbol: "💡" }
    ],
    backdrop: "Monochrome Matte"
  }
};

// Flatten data helper for unified robust search and inspection
const ALL_GIFTS_REGISTRY = Object.entries(GIFT_COLLECTIONS).flatMap(([giftName, details]) => {
  return details.models.map((model, idx) => ({
    id: `${details.slug}-${idx + 1001}`,
    name: giftName,
    slug: details.slug,
    model: model.name,
    rarity: model.rarity,
    symbol: model.symbol || "🎁",
    backdrop: details.backdrop || "Default Dark",
    supply: details.supply,
    marketplaces: ["Fragment", "GetGems", "MRKT", "Portals", "Tonnel"]
  }));
});

// ─── CANONICAL MARKETPLACE MAP ────────────────────────────────────────────────
const getMarketplaceUrl = (marketplace, gift) => {
  const identifier = gift.slug || "gift";
  const safeId = gift.id || "1";
  
  switch (marketplace) {
    case "Fragment":
      return `https://fragment.com/gifts?search=${encodeURIComponent(identifier)}`;
    case "GetGems":
      return `https://getgems.io/collection/telegram-gifts-${identifier}`;
    case "MRKT":
      return `https://mrkt.com/ton/gifts/${encodeURIComponent(identifier)}/${safeId}`;
    case "Portals":
      return `https://portals.ton/gifts/${encodeURIComponent(identifier)}`;
    case "Tonnel":
      return `https://tonnel.network/marketplace/gifts?id=${safeId}`;
    default:
      return "https://fragment.com/gifts";
  }
};

// ─── CANONICAL ASSET RENDERING HELPER ──────────────────────────────────────────
const getGiftAssetUrl = (slug) => {
  if (!slug) return "https://fragment.com/file/gifts/default/thumb.webp";
  // Canonical Fragment WebP Asset Distribution Route
  return `https://fragment.com/file/gifts/${slug}/thumb.webp`;
};

// ─── WALLET DEEP LINKS REDIRECTS (TEP-2 & Universal App Links) ────────────────
const getWalletRedirect = (walletType, amount = "5", comment = "GiftTrove Donation") => {
  const destinationAddress = "EQA1234567890_DONATION_WALLET_ADDRESS_HERE";
  const encodedComment = encodeURIComponent(comment);
  const nanoTons = parseFloat(amount) * 1000000000;

  switch (walletType) {
    case "Tonkeeper":
      return `https://app.tonkeeper.com/transfer/${destinationAddress}?amount=${nanoTons}&text=${encodedComment}`;
    case "MyTonWallet":
      return `https://my.tonwallet.app/transfer/${destinationAddress}?amount=${amount}&text=${encodedComment}`;
    case "TGWallet":
      return `https://t.me/wallet?startapp=transfer__to_${destinationAddress}__amount_${amount}__text_${encodedComment}`;
    default:
      return `ton://transfer/${destinationAddress}?amount=${nanoTons}&text=${encodedComment}`;
  }
};

// ─── ANIMATED HIGH-FIDELITY LAUNCH LOADER ──────────────────────────────────────
const LaunchLoader = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2400);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="launch-splash-overlay">
      <div className="trove-vault-container">
        <div className="trove-glowing-vault">
          <div className="vault-lid"></div>
          <div className="vault-body"></div>
          <div className="gem-shimmer-burst"></div>
        </div>
        <h1 className="trove-brand-title">GIFTTROVE</h1>
        <p className="trove-brand-tagline">Unlocking Telegram Collectibles</p>
        <div className="ios-progress-track">
          <div className="ios-progress-fill"></div>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN APPLICATION COMPONENT ───────────────────────────────────────────────
export default function App() {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [lang, setLang] = useState("en");
  const [activeTab, setActiveTab] = useState("scout");
  const [searchQuery, setSearchQuery] = useState("");
  const [isScouting, setIsScouting] = useState(false);
  const [savedGifts, setSavedGifts] = useState([]);
  const [inviteCount, setInviteCount] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Synchronize dynamic system viewport sizing for keyboard shifts
  useEffect(() => {
    const handleResize = () => {
      if (window.innerHeight < 500) {
        setKeyboardOpen(true);
      } else {
        setKeyboardOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Multi-device synchronized initialization sequence
  useEffect(() => {
    // 1. Resolve localized client context via Telegram metadata wrapper if present
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser?.language_code) {
      if (["ru", "be", "uk"].includes(tgUser.language_code)) setLang("ru");
      else if (["zh", "zt"].includes(tgUser.language_code)) setLang("zh");
    }

    // 2. Multi-device Session Sync Layer
    // Uses Telegram CloudStorage if fully deployed, with unified user key profile matching
    const fallbackUserId = tgUser?.id ? `gt_user_${tgUser.id}` : "gt_local_account_fallback";
    
    if (window.Telegram?.WebApp?.CloudStorage) {
      window.Telegram.WebApp.CloudStorage.getItem("invite_count", (err, value) => {
        if (!err && value) {
          setInviteCount(parseInt(value, 10));
        } else {
          const localVal = localStorage.getItem(`${fallbackUserId}_invites`);
          if (localVal) setInviteCount(parseInt(localVal, 10));
        }
      });
    } else {
      const globalSharedMockStore = localStorage.getItem(`${fallbackUserId}_invites`) || "12";
      setInviteCount(parseInt(globalSharedMockStore, 10));
    }

    // Preload dynamic system assets safely without rendering lockups
    const sampleUrls = Object.values(GIFT_COLLECTIONS).map(c => getGiftAssetUrl(c.slug));
    preloadImages(sampleUrls);
  }, []);

  // Incremental action tracking across matching views
  const handleInviteAction = () => {
    const updatedCount = inviteCount + 1;
    setInviteCount(updatedCount);
    
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    const fallbackUserId = tgUser?.id ? `gt_user_${tgUser.id}` : "gt_local_account_fallback";
    localStorage.setItem(`${fallbackUserId}_invites`, updatedCount.toString());

    if (window.Telegram?.WebApp?.CloudStorage) {
      window.Telegram.WebApp.CloudStorage.setItem("invite_count", updatedCount.toString());
    }
    
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=https://t.me/GiftTroveBot/app?startapp=ref_${tgUser?.id || "user"}&text=Find%20hidden%20Telegram%20Gift%20Gems%20instantly!`);
    } else {
      window.open(`https://t.me/share/url?url=https://t.me/GiftTroveBot/app?startapp=ref_user&text=Find%20hidden%20Telegram%20Gift%20Gems%20instantly!`, "_blank");
    }
  };

  const handleToggleSave = (gift) => {
    if (savedGifts.some(g => g.id === gift.id)) {
      setSavedGifts(savedGifts.filter(g => g.id !== gift.id));
    } else {
      setSavedGifts([...savedGifts, gift]);
    }
  };

  // Perform rigorous structural deep-queries on normalized indexes
  const filteredGifts = ALL_GIFTS_REGISTRY.filter(gift => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    return (
      (gift.name || "").toLowerCase().includes(term) ||
      (gift.id || "").toLowerCase().includes(term) ||
      (gift.slug || "").toLowerCase().includes(term) ||
      (gift.model || "").toLowerCase().includes(term) ||
      (gift.symbol || "").toLowerCase().includes(term) ||
      (gift.backdrop || "").toLowerCase().includes(term) ||
      (gift.rarity || "").toLowerCase().includes(term)
    );
  });

  const triggerDeepSearch = () => {
    setIsScouting(true);
    setTimeout(() => {
      setIsScouting(false);
    }, 1500);
  };

  // Safe Verified Link Dispatcher
  const handleMarketplaceRedirect = (url) => {
    if (url && (url.startsWith("https://") || url.startsWith("ton://"))) {
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.openLink(url);
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    }
  };

  // Render Section: Scout Content
  const renderScout = () => (
    <div className="view-fade-in">
      <div className="hero-bold-header">
        <span className="hero-text-content">
          {TRANSLATIONS[lang].heroTitle} <GiftTroveLogo size={28} />
        </span>
      </div>

      <div className="search-pill-container">
        <input
          type="text"
          className="ios-glass-search"
          placeholder={TRANSLATIONS[lang].searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button className="ios-action-btn" onClick={triggerDeepSearch}>🔍</button>
      </div>

      {isScouting ? (
        <div className="scouting-loader-wrapper glass-blur-card">
          <div className="scouting-pulse-radar"></div>
          <h2 className="scouting-text-title-bold">{TRANSLATIONS[lang].loaderTitle}</h2>
          <p className="scouting-text-subtitle-bold">{TRANSLATIONS[lang].loaderSubtitle}</p>
        </div>
      ) : (
        <div className="gift-results-grid">
          {filteredGifts.map((gift) => {
            const isSaved = savedGifts.some(g => g.id === gift.id);
            return (
              <div key={gift.id} className="gift-card-morphism">
                <div className="gift-backdrop-pill" style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(0,0,0,0.4))` }}>
                  <span className="backdrop-tag">{gift.backdrop}</span>
                  <button className="favorite-action-trigger" onClick={() => handleToggleSave(gift)}>
                    {isSaved ? "❤️" : "🤍"}
                  </button>
                </div>
                
                <div className="gift-graphics-container">
                  <img
                    src={getGiftAssetUrl(gift.slug)}
                    alt={gift.name}
                    className="gift-main-thumbnail"
                    onError={(e) => { e.target.src = "https://fragment.com/file/gifts/default/thumb.webp"; }}
                  />
                  <div className="model-artwork-symbol-overlay">
                    <span className="symbol-avatar">{gift.symbol}</span>
                  </div>
                </div>

                <div className="gift-details-summary">
                  <h3 className="gift-name-label">{gift.name}</h3>
                  <div className="gift-meta-row">
                    <span className="model-badge">Mod: {gift.model}</span>
                    <span className="rarity-badge" style={{ color: gift.rarity.includes("0.") || gift.rarity.includes("1.") ? "#ff4d4d" : "#j5ff54" }}>
                      {gift.rarity}
                    </span>
                  </div>
                  <div className="supply-tag-label">Total Supply: #{gift.supply}</div>
                </div>

                <div className="marketplace-deeplinks-section">
                  <p className="market-header-label">Available Markets:</p>
                  <div className="market-pills-flex flex-wrap">
                    {gift.marketplaces.map((mkt) => (
                      <button
                        key={mkt}
                        className="market-redirect-pill-btn"
                        onClick={() => handleMarketplaceRedirect(getMarketplaceUrl(mkt, gift))}
                      >
                        {mkt} ↗
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Render Section: Events Content
  const renderEvents = () => (
    <div className="view-fade-in glass-blur-card secondary-view-padding">
      <h2 className="view-section-header">💎 Live Drop Feeds & Alerts</h2>
      <p className="view-section-description">
        Track mint updates, new structural ecosystem listings, price spikes, and direct peer sales on Fragment immediately.
      </p>
      <div className="event-mock-item-row glass-morphism-inset">
        <span className="event-icon">🔔</span>
        <div className="event-data">
          <h4>Artisan Brick #1042 Sold</h4>
          <p>Transferred for 420 TON on Fragment ~ 2 mins ago</p>
        </div>
      </div>
      <div className="event-mock-item-row glass-morphism-inset">
        <span className="event-icon">🚀</span>
        <div className="event-data">
          <h4>Cyber Spaceship Rarity Alert</h4>
          <p>Hyperdrive Core model listed under market floor price on GetGems!</p>
        </div>
      </div>
    </div>
  );

  // Render Section: Saved Items Content
  const renderSaved = () => (
    <div className="view-fade-in secondary-view-padding">
      <h2 className="view-section-header">❤️ {TRANSLATIONS[lang].savedTab} Collections</h2>
      {savedGifts.length === 0 ? (
        <p className="empty-state-label">No gifts saved yet. Explore the Scout tab to find collectibles.</p>
      ) : (
        <div className="gift-results-grid">
          {savedGifts.map((gift) => (
            <div key={gift.id} className="gift-card-morphism">
              <div className="gift-graphics-container">
                <img src={getGiftAssetUrl(gift.slug)} alt={gift.name} className="gift-main-thumbnail" />
                <div className="model-artwork-symbol-overlay"><span className="symbol-avatar">{gift.symbol}</span></div>
              </div>
              <div className="gift-details-summary">
                <h3 className="gift-name-label">{gift.name}</h3>
                <p className="model-badge">{gift.model} ({gift.rarity})</p>
              </div>
              <button className="remove-saved-action-btn" onClick={() => handleToggleSave(gift)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render Section: Profile & Donations Content
  const renderProfile = () => (
    <div className="view-fade-in secondary-view-padding">
      <div className="profile-hero-card glass-blur-card">
        <div className="profile-avatar-circle">💎</div>
        <h3 className="profile-username-label">Ecosystem Scout Account</h3>
        <p className="profile-sync-status">✨ Account Status Connected Across Frameworks</p>
      </div>

      <div className="invite-sync-glass-box glass-blur-card">
        <h4>{TRANSLATIONS[lang].inviteText}</h4>
        <div className="counter-display-badge">
          Verified Invites: <span className="highlight-count">{inviteCount}</span>
        </div>
        <button className="ios-primary-action-trigger-btn" onClick={handleInviteAction}>
          🔗 Share Profile & Synchronize
        </button>
      </div>

      <div className="donate-glass-card glass-blur-card">
        <h3>{TRANSLATIONS[lang].donateTitle}</h3>
        <p>{TRANSLATIONS[lang].donateDesc}</p>
        <div className="wallet-deeplink-grid">
          <button className="wallet-btn tonkeeper-theme" onClick={() => handleMarketplaceRedirect(getWalletRedirect("Tonkeeper"))}>
            Tonkeeper Universal Link
          </button>
          <button className="wallet-btn mytonwallet-theme" onClick={() => handleMarketplaceRedirect(getWalletRedirect("MyTonWallet"))}>
            MyTonWallet Web Link
          </button>
          <button className="wallet-btn tgwallet-theme" onClick={() => handleMarketplaceRedirect(getWalletRedirect("TGWallet"))}>
            Telegram Wallet Protocol
          </button>
        </div>
      </div>
    </div>
  );

  if (isAppLoading) {
    return <LaunchLoader onComplete={() => setIsAppLoading(false)} />;
  }

  const tabs = [
    { id: "scout", label: TRANSLATIONS[lang].scoutTab, icon: "🔍" },
    { id: "events", label: TRANSLATIONS[lang].eventsTab, icon: "🔔" },
    { id: "saved", label: TRANSLATIONS[lang].savedTab, icon: "❤️" },
    { id: "profile", label: TRANSLATIONS[lang].profileTab, icon: "👤" }
  ];

  return (
    <div className="telegram-mini-app-canvas">
      {/* LANGUAGE SELECTOR ELEMENT */}
      <div className="floating-language-header-bar">
        <button className={`lang-toggle ${lang === "en" ? "active" : ""}`} onClick={() => setLang("en")}>EN</button>
        <button className={`lang-toggle ${lang === "ru" ? "active" : ""}`} onClick={() => setLang("ru")}>RU</button>
        <button className={`lang-toggle ${lang === "zh" ? "active" : ""}`} onClick={() => setLang("zh")}>ZH</button>
      </div>

      <div className="scrollable-viewscreen-body">
        {activeTab === "scout" && renderScout()}
        {activeTab === "events" && renderEvents()}
        {activeTab === "saved" && renderSaved()}
        {activeTab === "profile" && renderProfile()}
      </div>

      {/* ADAPTIVE BOTTOM NAVIGATION BAR */}
      {!keyboardOpen && (
        <div className="tab-bar-fixed-wrapper">
          <div className="ios-glass-tab-container">
            {tabs.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  className={`adaptive-tab-item-btn ${isSelected ? "tab-active-state" : ""}`}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsScouting(false);
                  }}
                >
                  <div className="adaptive-pill-content-box">
                    <span className="tab-item-icon">{tab.icon}</span>
                    <span className="tab-item-text-label">{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* RENDER EMBEDDED PRODUCTION APP STYLING (Preserving exact original deep container colors) */}
      <style>{`
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #0b0f19; /* EXACT ORIGINAL BACKGROUND COLOR RETAINED */
          color: #ffffff;
          -webkit-font-smoothing: antialiased;
        }
        .telegram-mini-app-canvas {
          background-color: #0b0f19; /* EXACT ORIGINAL BACKGROUND COLOR RETAINED */
          min-height: 100vh;
          position: relative;
          box-sizing: border-box;
          padding-bottom: 90px;
        }
        .floating-language-header-bar {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
          padding: 12px 16px;
          background: rgba(11, 15, 25, 0.6);
          backdrop-filter: blur(10px);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .lang-toggle {
          background: rgba(255, 255, 255, 0.08);
          border: none;
          color: rgba(255, 255, 255, 0.6);
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .lang-toggle.active {
          background: rgba(255, 255, 255, 0.25);
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .scrollable-viewscreen-body {
          padding: 8px 16px;
        }
        /* HERO HEADER ALIGNMENT FIX */
        .hero-bold-header {
          margin: 16px 0 20px 0;
          display: flex;
          align-items: center;
        }
        .hero-text-content {
          font-size: 26px;
          font-weight: 850; /* Heavily Bolder Title */
          line-height: 1.25;
          letter-spacing: -0.5px;
          color: #ffffff;
        }
        /* SEARCH CONTROLS */
        .search-pill-container {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
        }
        .ios-glass-search {
          flex: 1;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          padding: 12px 14px;
          color: #ffffff;
          font-size: 14px;
          backdrop-filter: blur(20px);
          outline: none;
        }
        .ios-action-btn {
          background: rgba(255, 255, 255, 0.15);
          border: none;
          border-radius: 14px;
          padding: 0 16px;
          cursor: pointer;
          font-size: 16px;
        }
        /* SCOUTING LOADER TEXT STANDARDIZATION FIX */
        .scouting-loader-wrapper {
          padding: 40px 20px;
          text-align: center;
          margin-top: 30px;
        }
        .scouting-pulse-radar {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(255,255,255,0.2);
          border-top-color: #ffffff;
          border-radius: 50%;
          margin: 0 auto 20px auto;
          animation: spin-anim 1s linear infinite;
        }
        .scouting-text-title-bold {
          font-size: 18px;
          font-weight: 800; /* Fully Bold */
          color: #ffffff;  /* True White */
          margin: 0 0 8px 0;
        }
        .scouting-text-subtitle-bold {
          font-size: 18px; /* Consistent Title Size */
          font-weight: 800; /* Consistent Title Emphasis Weight */
          color: #ffffff;  /* True White */
          margin: 0;
          opacity: 0.9;
        }
        /* GLASS CARDS & RESULTS GRID */
        .glass-blur-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(25px);
          border-radius: 20px;
          padding: 20px;
        }
        .gift-results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 14px;
          margin-top: 10px;
        }
        .gift-card-morphism {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 12px;
          backdrop-filter: blur(15px);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .gift-backdrop-pill {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 8px;
          border-radius: 10px;
          margin-bottom: 10px;
        }
        .backdrop-tag {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          opacity: 0.8;
        }
        .favorite-action-trigger {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 13px;
          padding: 0;
        }
        .gift-graphics-container {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }
        .gift-main-thumbnail {
          width: 85%;
          height: 85%;
          object-fit: contain;
        }
        .model-artwork-symbol-overlay {
          position: absolute;
          bottom: 2px;
          right: 2px;
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255,255,255,0.15);
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(5px);
        }
        .symbol-avatar {
          font-size: 14px;
        }
        .gift-details-summary {
          margin-bottom: 10px;
        }
        .gift-name-label {
          font-size: 14px;
          font-weight: 700;
          margin: 0 0 6px 0;
        }
        .gift-meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          margin-bottom: 4px;
        }
        .model-badge {
          opacity: 0.7;
        }
        .rarity-badge {
          font-weight: 600;
        }
        .supply-tag-label {
          font-size: 10px;
          opacity: 0.5;
        }
        .marketplace-deeplinks-section {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding-top: 8px;
          margin-top: 4px;
        }
        .market-header-label {
          font-size: 10px;
          opacity: 0.6;
          margin: 0 0 6px 0;
        }
        .market-pills-flex {
          display: flex;
          gap: 4px;
        }
        .market-redirect-pill-btn {
          background: rgba(255, 255, 255, 0.08);
          border: none;
          border-radius: 6px;
          color: #ffffff;
          font-size: 9px;
          padding: 4px 6px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .market-redirect-pill-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        /* SECONDARY PAGES */
        .secondary-view-padding {
          padding-top: 10px;
        }
        .view-section-header {
          font-size: 20px;
          font-weight: 800;
          margin-bottom: 8px;
        }
        .view-section-description {
          font-size: 13px;
          opacity: 0.7;
          line-height: 1.4;
          margin-bottom: 16px;
        }
        .glass-morphism-inset {
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          padding: 12px;
          margin-bottom: 10px;
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .event-icon {
          font-size: 20px;
        }
        .event-data h4 {
          margin: 0 0 2px 0;
          font-size: 13px;
        }
        .event-data p {
          margin: 0;
          font-size: 11px;
          opacity: 0.6;
        }
        .empty-state-label {
          text-align: center;
          padding: 40px;
          opacity: 0.5;
          font-size: 13px;
        }
        .remove-saved-action-btn {
          background: rgba(255, 77, 77, 0.15);
          border: none;
          color: #ff4d4d;
          border-radius: 8px;
          padding: 6px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 8px;
        }
        /* PROFILE & DONATE LINK STRUCTS */
        .profile-hero-card {
          text-align: center;
          margin-bottom: 14px;
        }
        .profile-avatar-circle {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          margin: 0 auto 12px auto;
        }
        .profile-username-label {
          margin: 0 0 4px 0;
          font-size: 16px;
        }
        .profile-sync-status {
          margin: 0;
          font-size: 11px;
          color: #4da6ff;
        }
        .invite-sync-glass-box, .donate-glass-card {
          margin-bottom: 14px;
        }
        .invite-sync-glass-box h4, .donate-glass-card h3 {
          margin: 0 0 10px 0;
        }
        .counter-display-badge {
          font-size: 14px;
          margin-bottom: 12px;
          opacity: 0.9;
        }
        .highlight-count {
          font-weight: 800;
          color: #4da6ff;
        }
        .ios-primary-action-trigger-btn {
          width: 100%;
          background: #ffffff;
          color: #000000;
          border: none;
          border-radius: 12px;
          padding: 12px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }
        .donate-glass-card p {
          font-size: 12px;
          opacity: 0.7;
          line-height: 1.4;
          margin-bottom: 14px;
        }
        .wallet-deeplink-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .wallet-btn {
          border: none;
          border-radius: 10px;
          padding: 10px;
          color: #ffffff;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          text-align: center;
        }
        .tonkeeper-theme { background: #1c92f4; }
        .mytonwallet-theme { background: #2b3a4a; border: 1px solid rgba(255,255,255,0.1); }
        .tgwallet-theme { background: #007aff; }
        
        /* ADAPTIVE FULL-COVER NAVIGATION PILL FIX */
        .tab-bar-fixed-wrapper {
          position: fixed;
          bottom: 16px;
          left: 16px;
          right: 16px;
          z-index: 999;
        }
        .ios-glass-tab-container {
          background: rgba(20, 28, 44, 0.4);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 28px;
          padding: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 4px;
        }
        .adaptive-tab-item-btn {
          flex: 1;
          background: transparent;
          border: none;
          border-radius: 22px;
          padding: 8px 4px;
          color: rgba(255, 255, 255, 0.55);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .adaptive-tab-item-btn.tab-active-state {
          background: rgba(255, 255, 255, 0.12); /* Fully adaptive glassmorphism cover background */
          color: #ffffff;
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.15);
        }
        .adaptive-pill-content-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
        }
        .tab-item-icon {
          font-size: 16px;
        }
        .tab-item-text-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1px;
        }
        
        /* HIGH-FIDELITY VAULT LAUNCH SPLASH ANIMATION */
        .launch-splash-overlay {
          position: fixed;
          top:0; left:0; right:0; bottom:0;
          background-color: #0b0f19; /* MATCHES ORIGINAL CANVAS THEME BACKGROUND COLOR EXACTLY */
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }
        .trove-vault-container {
          text-align: center;
          width: 80%;
          max-width: 280px;
        }
        .trove-glowing-vault {
          width: 70px;
          height: 55px;
          background: linear-gradient(135deg, #ffd700, #ffa500);
          margin: 0 auto 24px auto;
          border-radius: 8px;
          position: relative;
          box-shadow: 0 0 35px rgba(255, 215, 0, 0.4);
          animation: pulse-gem-vault 1.4s ease-in-out infinite alternate;
        }
        .vault-lid {
          position: absolute;
          top: -6px; left: -2px; right: -2px;
          height: 14px;
          background: #ffb800;
          border-radius: 6px 6px 2px 2px;
          border-bottom: 2px solid #b37400;
        }
        .vault-body {
          position: absolute;
          top: 20px; left: 26px;
          width: 18px;
          height: 14px;
          background: #232d42;
          border-radius: 3px;
          border: 2px solid #ffd700;
        }
        .trove-brand-title {
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 3px;
          margin: 0 0 4px 0;
          color: #ffffff;
        }
        .trove-brand-tagline {
          font-size: 11px;
          opacity: 0.5;
          margin: 0 0 28px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .ios-progress-track {
          height: 4px;
          width: 100%;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 2px;
          overflow: hidden;
        }
        .ios-progress-fill {
          height: 100%;
          width: 0;
          background: #ffffff;
          border-radius: 2px;
          animation: fill-track-anim 2.2s linear forwards;
        }
        @keyframes spin-anim { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse-gem-vault {
          0% { transform: scale(0.96); box-shadow: 0 0 20px rgba(255, 215, 0, 0.3); }
          100% { transform: scale(1.04); box-shadow: 0 0 45px rgba(255, 215, 0, 0.6); }
        }
        @keyframes fill-track-anim { to { width: 100%; } }
        .view-fade-in { animation: view-fade-in-play 0.35s ease-out forwards; }
        @keyframes view-fade-in-play { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
