import React, { useState, useEffect, useMemo } from 'react';
import { Radar, Search, Flame, Gem, Clock, Bell, Compass, LayoutGrid, SlidersHorizontal, Zap, User, Globe, Check, ChevronRight } from 'lucide-react';

// 1. GLOBAL CONSTANTS & DICTIONARIES (PORTED FROM CLAUDE)
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

const DURATIONS = [
  { label: "1 Hour", value: "1h", stars: 10 },
  { label: "12 Hours", value: "12h", stars: 100 },
  { label: "24 Hours", value: "24h", stars: 200 },
  { label: "7 Days", value: "7d", stars: 1500 }
];

const FILTER_COSTS = { model: 5, backdrop: 5, symbol: 5, valueRange: 10 };

const T = {
  EN: {
    terms_title: "Terms & Conditions",
    terms_body: "Welcome to GiftTrove, a Telegram gift scouting tool. By using this service, you accept our terms.",
    accept: "Accept & Continue",
    scout_tab: "Scout Engine",
    radar_tab: "Live Radar",
    history_tab: "History",
    profile_tab: "Profile",
    select_gift: "Select Gift",
    select_model: "Model Tier",
    select_backdrop: "Backdrop Style",
    select_symbol: "Core Symbol",
    value_range: "Value Range (Stars)",
    duration: "Scout Duration",
    launch: "Launch Active Scout",
    free_trial: "Free Trial - 10 min",
    free_trial_desc: "Try 1 filter, no stars needed",
    no_scouts: "No active radars hunting yet",
    no_history: "No completed scout missions",
    stars_needed: "Get Stars with Hoton",
    search_placeholder: "Search target gifts...",
    min: "Min Price", max: "Max Price",
    optional: "optional",
    active: "Active Radars",
    completed: "Completed"
  },
  RU: {
    terms_title: "Условия использования",
    terms_body: "Добро пожаловать в GiftTrove, инструмент поиска подарков в Telegram. Используя сервис, вы принимаете условия.",
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
    launch: "Запустить поиск",
    free_trial: "Пробный 10 мин",
    free_trial_desc: "1 фильтр, без Stars",
    no_scouts: "Нет активных поисков",
    no_history: "Нет завершённых поисков",
    stars_needed: "Получить Stars c Hoton",
    search_placeholder: "Поиск подарков...",
    min: "Мин", max: "Макс",
    optional: "необязательно",
    active: "Активен",
    completed: "Завершён"
  },
  ZH: {
    terms_title: "使用条款",
    terms_body: "欢迎使用 GiftTrove Telegram 礼品侦测工具。使用本服务即表示您同意以下条款。",
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
    free_trial: "免费试用 - 10分钟",
    free_trial_desc: "1个筛选条件,无需Stars",
    no_scouts: "暂无活跃侦测",
    no_history: "暂无历史记录",
    stars_needed: "通过Hoton获取Stars",
    search_placeholder: "搜索礼品...",
    min: "最低", max: "最高",
    optional: "可选",
    active: "活跃",
    completed: "已完成"
  }
};

export default function App() {
  // 2. STATE MANAGEMENT FOR SCAPPING ENGINE & PERSISTENCE
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('scout');
  const [lang, setLang] = useState(() => localStorage.getItem("gt_lang") || "EN");
  const [termsAccepted, setTermsAccepted] = useState(() => localStorage.getItem("gt_terms") === "1");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showTrialBubble, setShowTrialBubble] = useState(true);
  const [toast, setToast] = useState(null);

  // Filter Selection States
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

  // 3. NATIVE TELEGRAM WEBAPP SDK INTEGRATION
  const tgUser = useMemo(() => {
    return typeof window !== 'undefined' ? window.Telegram?.WebApp?.initDataUnsafe?.user : null;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
    return () => clearTimeout(timer);
  }, []);

  // 4. DYNAMIC COST ALGORITHM CALCULATION
  const currentCost = useMemo(() => {
    let price = 0;
    if (selectedGift) price += 5;
    if (selectedModel) price += FILTER_COSTS.model;
    if (selectedBackdrop) price += FILTER_COSTS.backdrop;
    if (selectedSymbol) price += FILTER_COSTS.symbol;
    if (minVal || maxVal) price += FILTER_COSTS.valueRange;
    if (selectedDuration) price += selectedDuration.stars;
    return price;
  }, [selectedGift, selectedModel, selectedBackdrop, selectedSymbol, minVal, maxVal, selectedDuration]);

  const filteredGifts = useMemo(() => {
    return GIFTS.filter(g => g.toLowerCase().includes(giftSearch.toLowerCase()));
  }, [giftSearch]);

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleLaunchScout = () => {
    if (!selectedGift) return triggerToast(t.select_gift);
    if (!selectedDuration) return triggerToast(t.duration);
    triggerToast(`Scout deployed for ${selectedGift}! Loaded ${currentCost} Stars.`);
    // Reset inputs
    setSelectedGift(null); setGiftSearch(""); setSelectedModel(null);
    setSelectedBackdrop(null); setSelectedSymbol(null); setMinVal(""); setMaxVal(""); setSelectedDuration(null);
    setTab("radar");
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#090d16]">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
        <p className="text-xs font-mono text-slate-400 mt-4 tracking-wider">BOOTING GIFTTROVE RADAR Engine...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 font-sans pb-24 antialiased overflow-x-hidden selection:bg-emerald-500/30">
      
      {/* GLOBAL TOAST BANNER */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#0d1527] border border-emerald-500/30 px-5 py-2.5 rounded-full text-xs font-bold text-emerald-400 shadow-xl shadow-black/50 animate-bounce">
          {toast}
        </div>
      )}

      {/* 5. HEADER HUD */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#090d16]/70 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-[1.5px]">
            <div className="w-full h-full rounded-[10px] bg-[#111827] flex items-center justify-center text-xs font-black text-emerald-400">GT</div>
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white">GiftTrove</h1>
            <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              TON PULSE: 4.5s
            </p>
          </div>
        </div>

        <button 
          onClick={() => setShowLangPicker(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 active:scale-95 transition-all text-xs font-bold text-slate-300"
        >
          <Globe className="w-3.5 h-3.5" />
          {lang}
        </button>
      </header>

      <main className="px-4 pt-4 space-y-5">
        
        {/* TAB WORKSPACE ROUTING */}
        {tab === 'scout' && (
          <section className="space-y-4 animate-fadeIn">
            {/* REAL-TIME COST COUNTER BOARD */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 backdrop-blur-md">
              <span className="text-xs text-slate-400 font-bold tracking-wide uppercase">Deployment Pool Stake</span>
              <div className="flex items-center gap-1.5 text-2xl font-black text-amber-400 font-mono">
                <Zap className="w-5 h-5 fill-current text-amber-400" />
                <span>{currentCost}</span>
              </div>
            </div>

            {/* INTERACTIVE COMPONENT CONFIGURATION FORM */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-5">
              
              {/* TARGET ASSET SEARCH PICKER */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                  <label>{t.select_gift}</label>
                  <span className="text-[10px] text-amber-400 font-mono bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">+5 Stars</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text"
                    placeholder={t.search_placeholder}
                    value={selectedGift || giftSearch}
                    onChange={(e) => { setGiftSearch(e.target.value); setSelectedGift(null); setGiftDropdown(true); }}
                    onFocus={() => setGiftDropdown(true)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/40 font-medium"
                  />
                  {giftDropdown && filteredGifts.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 max-h-48 overflow-y-auto bg-[#0d1322] border border-white/10 rounded-xl z-50 shadow-2xl divide-y divide-white/5">
                      {filteredGifts.map(g => (
                        <div 
                          key={g} 
                          onClick={() => { setSelectedGift(g); setGiftSearch(g); setGiftDropdown(false); }}
                          className="px-4 py-3 text-xs font-semibold hover:bg-emerald-500/10 hover:text-emerald-400 cursor-pointer transition-all text-slate-300 flex items-center justify-between"
                        >
                          <span>{g}</span>
                          {selectedGift === g && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* MODEL TIERS SELECTION */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                  <label>{t.select_model} <span className="text-[10px] font-normal text-slate-500">({t.optional})</span></label>
                  <span className="text-[10px] text-emerald-400 font-mono">+5 Stars</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {MODELS.map(m => (
                    <button 
                      key={m}
                      onClick={() => setSelectedModel(selectedModel === m ? null : m)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${selectedModel === m ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* BACKDROP ENGINE STYLE */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                  <label>{t.select_backdrop} <span className="text-[10px] font-normal text-slate-500">({t.optional})</span></label>
                  <span className="text-[10px] text-emerald-400 font-mono">+5 Stars</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {BACKDROPS.map(b => (
                    <button 
                      key={b}
                      onClick={() => setSelectedBackdrop(selectedBackdrop === b ? null : b)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${selectedBackdrop === b ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'}`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* SYMBOLS LAYER SELECTION */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                  <label>{t.select_symbol} <span className="text-[10px] font-normal text-slate-500">({t.optional})</span></label>
                  <span className="text-[10px] text-emerald-400 font-mono">+5 Stars</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SYMBOLS.map(s => (
                    <button 
                      key={s}
                      onClick={() => setSelectedSymbol(selectedSymbol === s ? null : s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${selectedSymbol === s ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* VALUE RANGE THRESHOLD */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                  <label>{t.value_range} <span className="text-[10px] font-normal text-slate-500">({t.optional})</span></label>
                  <span className="text-[10px] text-emerald-400 font-mono">+10 Stars</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="number" 
                    placeholder={t.min}
                    value={minVal}
                    onChange={(e) => setMinVal(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950/40 border border-white/10 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-500/40"
                  />
                  <input 
                    type="number" 
                    placeholder={t.max}
                    value={maxVal}
                    onChange={(e) => setMaxVal(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950/40 border border-white/10 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-500/40"
                  />
                </div>
              </div>

              {/* SCOUT ENGINE DURATION LIMIT */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 block">{t.duration}</label>
                <div className="grid grid-cols-2 gap-2">
                  {DURATIONS.map(d => (
                    <button
                      key={d.value}
                      onClick={() => setSelectedDuration(selectedDuration?.value === d.value ? null : d)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${selectedDuration?.value === d.value ? 'bg-emerald-500/10 border-emerald-500/40 text-white' : 'bg-white/5 border-white/5 text-slate-400'}`}
                    >
                      <span className="text-xs font-bold">{d.label}</span>
                      <span className="text-[10px] text-amber-400 font-mono flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5 fill-current" /> {d.stars.toLocaleString()} Stars
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* EMERALD LAUNCH DISPATCHER BUTTON */}
              <button 
                onClick={handleLaunchScout}
                disabled={currentCost === 0}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-sm tracking-wide transition-all active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none shadow-xl shadow-emerald-500/10"
              >
                {t.launch} {currentCost > 0 ? `( ${currentCost} Stars )` : ""}
              </button>
            </div>
          </section>
        )}

        {/* ACTIVE RADAR TARGET ENGINE LIST FEED */}
        {tab === 'radar' && (
          <section className="space-y-4 animate-fadeIn">
            <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase">{t.active}</h3>
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-white/[0.02] border border-white/5 rounded-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                <Radar className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <p className="text-sm font-medium text-slate-400">{t.no_scouts}</p>
            </div>
          </section>
        )}

        {/* DEPLOYED SCOUT SCANNING HISTORICAL FEED */}
        {tab === 'history' && (
          <section className="space-y-4 animate-fadeIn">
            <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase">{t.history_tab}</h3>
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-white/[0.02] border border-white/5 rounded-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-slate-400">{t.no_history}</p>
            </div>
          </section>
        )}

        {/* TELEGRAM AUTHENTICATED PROFILE & METRICS DASHBOARD */}
        {tab === 'profile' && (
          <section className="space-y-4 animate-fadeIn">
            <div className="flex flex-col items-center p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-center space-y-3 relative overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 p-[2px] shadow-lg shadow-emerald-500/10">
                <div className="w-full h-full rounded-full bg-[#0d1322] flex items-center justify-center text-slate-300 font-bold">
                  <User className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
              <div>
                <h2 className="text-base font-black text-white">{tgUser?.first_name || "Scout Hunter"}</h2>
                <p className="text-xs font-mono text-slate-500 mt-0.5">UID: {tgUser?.id || "XXXXXXXX"}</p>
              </div>
            </div>

            {/* INTEGRATED MARKETING / ACQUISITION CHANNELS CONTAINER */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden">
              <a href="https://t.me/insidemajek" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">📢</div>
                  <span className="text-sm font-bold text-slate-200">Join Channel</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </a>
              <a href="https://t.me/+Op7gLVniX9Y1OTRk" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">💬</div>
                  <span className="text-sm font-bold text-slate-200">Community Chat</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </a>
            </div>
          </section>
        )}
      </main>

      {/* 6. INTERACTIVE LAYER LANGUAGE SWITCHER SHEET */}
      {showLangPicker && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowLangPicker(false)}>
          <div className="w-full bg-[#0c1220] border-t border-white/10 rounded-t-3xl p-5 space-y-4 max-w-md animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2">
              <h3 className="text-sm font-black text-white flex items-center gap-2"><Globe className="w-4 h-4 text-emerald-400" /> Adjust System Localization</h3>
              <button onClick={() => setShowLangPicker(false)} className="text-xs font-bold text-slate-500 hover:text-slate-300">Close</button>
            </div>
            <div className="space-y-2">
              {Object.entries({ EN: "English", RU: "Русский", ZH: "中文" }).map(([k, v]) => (
                <div 
                  key={k}
                  onClick={() => { setLang(k); localStorage.setItem("gt_lang", k); setShowLangPicker(false); }}
                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${lang === k ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/5 text-slate-300 hover:border-white/10'}`}
                >
                  <span className="text-xs font-bold">{v}</span>
                  {lang === k && <Check className="w-4 h-4" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. RADAR NAVIGATION CONTROLLER BAR BAR HUB */}
      <nav className="fixed bottom-0 inset-x-0 bg-[#090d16]/80 backdrop-blur-lg border-t border-white/5 flex items-center justify-around py-3 z-40 px-4">
        <button onClick={() => setTab('scout')} className={`flex flex-col items-center gap-1 transition-all ${tab === 'scout' ? 'text-emerald-400 font-bold scale-105' : 'text-slate-500'}`}>
          <Compass className="w-5 h-5" />
          <span className="text-[10px] tracking-wide">{t.scout_tab}</span>
        </button>
        <button onClick={() => setTab('radar')} className={`flex flex-col items-center gap-1 transition-all ${tab === 'radar' ? 'text-emerald-400 font-bold scale-105' : 'text-slate-500'}`}>
          <Radar className="w-5 h-5" />
          <span className="text-[10px] tracking-wide">{t.radar_tab}</span>
        </button>
        <button onClick={() => setTab('history')} className={`flex flex-col items-center gap-1 transition-all ${tab === 'history' ? 'text-emerald-400 font-bold scale-105' : 'text-slate-500'}`}>
          <Clock className="w-5 h-5" />
          <span className="text-[10px] tracking-wide">{t.history_tab}</span>
        </button>
        <button onClick={() => setTab('profile')} className={`flex flex-col items-center gap-1 transition-all ${tab === 'profile' ? 'text-emerald-400 font-bold scale-105' : 'text-slate-500'}`}>
          <User className="w-5 h-5" />
          <span className="text-[10px] tracking-wide">{t.profile_tab}</span>
        </button>
      </nav>

    </div>
  );
}
