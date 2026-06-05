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

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
const IconSearch = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const IconCalendar = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconBookmark = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
const IconUser = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconChevronRight = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const IconSun = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const IconMoon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
const IconGlobe = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const IconHeart = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const IconBack = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const IconCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

// ─── APPLE MORPHISM STYLES ─────────────────────────────────────────────────────
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
    background-image: var(--bg-gradient);
    background-attachment: fixed;
    color: var(--text-primary);
    -webkit-font-smoothing: antialiased;
    overscroll-behavior: none;
    transition: background 0.4s ease, color 0.4s ease;
    height: 100vh; overflow: hidden;
  }

  .app-container {
    height: 100vh; display: flex; flex-direction: column; position: relative;
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
    font-size: 34px; font-weight: 800; letter-spacing: -1px; line-height: 1.1;
    margin-bottom: 24px; transition: opacity 0.3s, transform 0.3s;
  }
  .section-label {
    font-size: 15px; font-weight: 600; color: var(--text-primary);
    margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;
  }
  
  /* INPUTS & CONTROLS */
  .input-group { margin-bottom: 24px; }
  .ios-input {
    width: 100%; padding: 18px 20px; border-radius: var(--radius-lg);
    background: var(--bg-input); border: 1px solid transparent;
    color: var(--text-primary); font-size: 17px; outline: none;
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    transition: all 0.3s; font-family: var(--font);
  }
  .ios-input:focus { border-color: var(--tg-blue); background: var(--bg-card); }
  
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
  .select-val { color: var(--tg-blue); font-weight: 600; }

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

  /* BOTTOM TAB BAR */
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

  /* IOS BOTTOM SHEET */
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
  }
  .sheet-handle { width: 40px; height: 5px; border-radius: 100px; background: var(--text-secondary); margin: 0 auto 24px; opacity: 0.5; }
  .sheet-title { font-size: 22px; font-weight: 800; margin-bottom: 20px; text-align: center; }
  
  .sheet-list-item {
    padding: 18px 20px; font-size: 17px; font-weight: 600; border-bottom: 1px solid var(--border);
    display: flex; justify-content: space-between; align-items: center; cursor: pointer;
  }
  .sheet-list-item:active { background: var(--bg-hover); }
  .sheet-list-item:last-child { border-bottom: none; }

  /* PROFILE IOS GROUPED LIST */
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

  /* ANIMATIONS */
  @keyframes fadeIn { to { opacity: 1; } }
  @keyframes slideUp { to { transform: translateY(0); } }
  .fade-in-up { animation: fadeInUp 0.5s var(--bounce) forwards; }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
`;

export default function App() {
  const [theme, setTheme] = useState("dark");
  const [lang, setLang] = useState("EN");
  const [activeTab, setActiveTab] = useState("scout");
  
  // App Flow State
  const [isSearching, setIsSearching] = useState(false);
  
  // Search Form State
  const [giftQuery, setGiftQuery] = useState("");
  const [giftId, setGiftId] = useState("");
  const [selectedMarkets, setSelectedMarkets] = useState(["All"]);
  const [selectedModel, setSelectedModel] = useState("Any");
  const [selectedBackdrop, setSelectedBackdrop] = useState("Any");
  const [selectedSymbol, setSelectedSymbol] = useState("Any");
  
  // UI State
  const [activeSheet, setActiveSheet] = useState(null); // 'model', 'backdrop', 'symbol', 'lang'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");

  const handleMarketToggle = (m) => {
    if (m === "All") {
      setSelectedMarkets(["All"]);
      return;
    }
    let newMarkets = selectedMarkets.filter(x => x !== "All");
    if (newMarkets.includes(m)) {
      newMarkets = newMarkets.filter(x => x !== m);
      if (newMarkets.length === 0) newMarkets = ["All"];
    } else {
      newMarkets.push(m);
    }
    setSelectedMarkets(newMarkets);
  };

  const handleScout = () => {
    setIsSearching(true);
    // In a real app, fetch data here
  };

  const renderSheet = () => {
    if (!activeSheet) return null;
    let title, options, currentVal, setVal;

    if (activeSheet === 'model') { title = "Select Model"; options = ["Any", ...MODELS]; currentVal = selectedModel; setVal = setSelectedModel; }
    else if (activeSheet === 'backdrop') { title = "Select Backdrop"; options = ["Any", ...BACKDROPS]; currentVal = selectedBackdrop; setVal = setSelectedBackdrop; }
    else if (activeSheet === 'symbol') { title = "Select Symbol"; options = ["Any", ...SYMBOLS]; currentVal = selectedSymbol; setVal = setSelectedSymbol; }
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
      <div className="app-container">
        
        {/* TOP ICONS (Fixed) */}
        <div className="top-nav">
          {/* Logo or Back button depending on state */}
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
                  The fastest way to find any Telegram Gift.
                </div>
              )}

              {!isSearching ? (
                /* ── SCOUT FORM ── */
                <div>
                  <div className="input-group">
                    <div className="section-label">Gift Name</div>
                    <input className="ios-input" placeholder="e.g. Durov's Cap" value={giftQuery} onChange={e => setGiftQuery(e.target.value)} />
                  </div>

                  <div className="input-group">
                    <div className="section-label">Specific ID <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(Optional)</span></div>
                    <input type="number" className="ios-input" placeholder="#12345" value={giftId} onChange={e => setGiftId(e.target.value)} />
                  </div>

                  <div className="input-group">
                    <div className="section-label">Marketplaces</div>
                    <div className="chips-grid">
                      {MARKETPLACES.map(m => (
                        <div key={m} className={`chip ${selectedMarkets.includes(m) ? 'active' : ''}`} onClick={() => handleMarketToggle(m)}>
                          {m}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="input-group">
                    <div className="section-label">Attributes</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className="select-btn" onClick={() => setActiveSheet('model')}>
                        <span>Model</span> <span className="select-val">{selectedModel} <IconChevronRight /></span>
                      </div>
                      <div className="select-btn" onClick={() => setActiveSheet('backdrop')}>
                        <span>Backdrop</span> <span className="select-val">{selectedBackdrop} <IconChevronRight /></span>
                      </div>
                      <div className="select-btn" onClick={() => setActiveSheet('symbol')}>
                        <span>Symbol</span> <span className="select-val">{selectedSymbol} <IconChevronRight /></span>
                      </div>
                    </div>
                  </div>

                  <button className="action-btn" onClick={handleScout}>Scout Gift</button>
                </div>
              ) : (
                /* ── RESULTS VIEW ── */
                <div className="fade-in-up" style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>Results</div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>12 found</div>
                  </div>
                  
                  {/* Mock Results */}
                  {[1, 2, 3].map(i => (
                    <div key={i} className="ios-group" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{giftQuery || "Durov's Cap"} #{1000 + i}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>GetGems • {selectedModel === 'Any' ? 'Legendary' : selectedModel}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--tg-blue)' }}>450 TON</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>~$2,450</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* EVENTS TAB */}
          {activeTab === "events" && (
            <div className="fade-in-up" style={{ textAlign: 'center', marginTop: '40%' }}>
              <div style={{ color: 'var(--text-secondary)', marginBottom: 16 }}><IconCalendar /></div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>There is no event ongoing</div>
              <div style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Check back later for market drops.</div>
            </div>
          )}

          {/* SAVED TAB */}
          {activeTab === "saved" && (
            <div className="fade-in-up">
              <div className="hero-title">Saved</div>
              <div className="ios-group" style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>
                No gifts saved yet.
              </div>
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <div className="fade-in-up">
              <div className="hero-title">Profile</div>
              
              <div className="section-label" style={{ marginTop: 32 }}>Community</div>
              <div className="ios-group">
                <a href="https://t.me/insidemajek" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="ios-row">
                    <div className="row-left">
                      <div className="row-icon-box" style={{ background: '#34c759' }}><IconUser /></div>
                      Support
                    </div>
                    <IconChevronRight />
                  </div>
                </a>
                <a href="#" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="ios-row">
                    <div className="row-left">
                      <div className="row-icon-box" style={{ background: '#0a84ff' }}><IconSearch /></div>
                      Community Chat
                    </div>
                    <IconChevronRight />
                  </div>
                </a>
              </div>

              <div className="section-label">Support the Builder</div>
              <div className="ios-group">
                <div className="ios-row">
                  <div className="row-left">
                    <div className="row-icon-box" style={{ background: '#ff2d55' }}><IconHeart /></div>
                    Donate
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
              { id: 'scout', icon: <IconSearch />, label: 'Scout' },
              { id: 'events', icon: <IconCalendar />, label: 'Events' },
              { id: 'saved', icon: <IconBookmark />, label: 'Saved' },
              { id: 'profile', icon: <IconUser />, label: 'Profile' }
            ].map(t => (
              <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                <div className="tab-icon">{t.icon}</div>
                <span className="tab-label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* BOTTOM SHEETS */}
        {renderSheet()}
        
      </div>
    </>
  );
}
