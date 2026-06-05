import { useState, useEffect, useRef, useCallback } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────
const GIFTS = [
  "Plush Pepe","Durov's Cap","Jelly Bunny","Magic Potion","Loot Bag",
  "Vintage Cigar","Eternal Candle","Homemade Cake","Sharp Tongue",
  "Spy Agaric","Sakura Flower","Spiced Wine","Diamond Ring","Evil Eye",
  "Frightful Egg","Astral Shard","Trapped Heart","Skeleton Watch",
  "Voodoo Doll","Hypno Lollipop","Tama Gotchi","Bunny Muffin",
  "Cookie Heart","Witch Hat",
];
const MODELS    = ["Common","Rare","Epic","Legendary","Mythical"];
const BACKDROPS = ["Space","Nature","Urban","Abstract","Fire","Ice","Gold","Neon"];
const SYMBOLS   = ["Moon","Star","Sun","Heart","Diamond","Skull","Crown","Lightning"];
const DURATIONS = [
  { label:"1 Hour",   value:"1h",  stars:10   },
  { label:"12 Hours", value:"12h", stars:100  },
  { label:"24 Hours", value:"24h", stars:200  },
  { label:"7 Days",   value:"7d",  stars:1500 },
];
const FILTER_COSTS = { gift:5, model:5, backdrop:5, symbol:5, valueRange:10 };

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

const MOCK_ACTIVE = [
  { id:1, gift:"Plush Pepe",   model:"Rare",      backdrop:null,   symbol:null,    valueRange:[100,500],  duration:"1h",  stars:30,  startedAt:Date.now()-1200000, endsAt:Date.now()+2400000, results:3  },
  { id:2, gift:"Diamond Ring", model:null,         backdrop:"Gold", symbol:"Crown", valueRange:null,       duration:"12h", stars:20,  startedAt:Date.now()-3600000, endsAt:Date.now()+39600000,results:7  },
];
const MOCK_HISTORY = [
  { id:10, gift:"Durov's Cap", model:"Legendary", backdrop:"Space", symbol:null,  valueRange:[500,2000], duration:"24h", stars:215, completedAt:Date.now()-86400000,  results:12 },
  { id:11, gift:"Voodoo Doll", model:null,         backdrop:null,   symbol:null,  valueRange:null,       duration:"1h",  stars:10,  completedAt:Date.now()-172800000, results:0  },
];

// ─── I18N ────────────────────────────────────────────────────────────────────
const LANGS = { EN:"English", RU:"Русский", ZH:"中文" };
const T = {
  EN:{
    terms_title:"Terms & Conditions",
    terms_body:`Welcome to GiftTrove — a Telegram gift scouting tool. By using this service, you agree to the following:\n\n1. GiftTrove is an independent scouting tool and is NOT affiliated with GetGems, Portals, MRKT, or Telegram in any way.\n\n2. All scout payments made in Telegram Stars (XTR) are NON-REFUNDABLE once a scout is launched.\n\n3. GiftTrove provides real-time scouting data from third-party marketplaces. We do not guarantee the availability or accuracy of listings.\n\n4. You must be of legal age in your jurisdiction to use paid features.\n\n5. We reserve the right to update these terms at any time.\n\nBuilt with care by @insidemajek`,
    accept:"Accept & Continue",
    tab_scout:"Scout", tab_radar:"Radar", tab_history:"History", tab_profile:"Profile",
    gift_label:"Gift", model_label:"Model", backdrop_label:"Backdrop", symbol_label:"Symbol",
    range_label:"Value Range", duration_label:"Duration",
    search_ph:"Search gifts…", optional:"optional", min:"Min", max:"Max",
    launch:"Launch Scout", trial:"Free Trial · 10 min",
    no_active:"No active scouts", no_history:"No completed scouts",
    active:"Active", view:"Details",
    gift_req:"Please select a gift", dur_req:"Please select a duration",
    total_cost:"Total Cost", stars_nonrefund:"Stars are non-refundable after launch",
    support:"Support", language:"Language", appearance:"Appearance",
    dark_mode:"Dark Mode", light_mode:"Light Mode",
    terms_privacy:"Terms & Privacy", choose_avatar:"Choose Avatar",
    scouts_run:"Scouts", total_spent:"Spent", results_found:"Results",
    member_since:"Member since", user_id:"User ID",
    time_left:"left", results_count:"results found",
  },
  RU:{
    terms_title:"Условия использования",
    terms_body:`Добро пожаловать в GiftTrove — инструмент поиска подарков в Telegram.\n\n1. GiftTrove не аффилирован с GetGems, Portals, MRKT или Telegram.\n\n2. Все платежи в Telegram Stars (XTR) НЕВОЗВРАТНЫ после запуска сканирования.\n\n3. GiftTrove предоставляет данные с маркетплейсов без гарантий точности.\n\n4. Вы должны быть совершеннолетним для использования платных функций.\n\n5. Мы оставляем за собой право изменять условия.\n\nСоздано @insidemajek`,
    accept:"Принять и продолжить",
    tab_scout:"Поиск", tab_radar:"Радар", tab_history:"История", tab_profile:"Профиль",
    gift_label:"Подарок", model_label:"Модель", backdrop_label:"Фон", symbol_label:"Символ",
    range_label:"Диапазон цен", duration_label:"Длительность",
    search_ph:"Поиск подарков…", optional:"необяз.", min:"Мин", max:"Макс",
    launch:"Запустить", trial:"Пробный · 10 мин",
    no_active:"Нет активных поисков", no_history:"Нет истории",
    active:"Активен", view:"Подробнее",
    gift_req:"Выберите подарок", dur_req:"Выберите длительность",
    total_cost:"Итого", stars_nonrefund:"Stars невозвратны после запуска",
    support:"Поддержка", language:"Язык", appearance:"Оформление",
    dark_mode:"Тёмный режим", light_mode:"Светлый режим",
    terms_privacy:"Условия", choose_avatar:"Выбрать аватар",
    scouts_run:"Поисков", total_spent:"Потрачено", results_found:"Найдено",
    member_since:"С нами с", user_id:"ID пользователя",
    time_left:"осталось", results_count:"результатов",
  },
  ZH:{
    terms_title:"使用条款",
    terms_body:`欢迎使用 GiftTrove — Telegram 礼品侦测工具。\n\n1. GiftTrove 与 GetGems、Portals、MRKT 或 Telegram 无任何关联。\n\n2. 一旦启动侦测，所有 Telegram Stars (XTR) 付款均不可退款。\n\n3. GiftTrove 提供实时数据，不保证准确性。\n\n4. 您必须达到法定年龄才能使用付费功能。\n\n5. 我们保留随时更新条款的权利。\n\n由 @insidemajek 精心打造`,
    accept:"接受并继续",
    tab_scout:"侦测", tab_radar:"雷达", tab_history:"历史", tab_profile:"我的",
    gift_label:"礼品", model_label:"模型", backdrop_label:"背景", symbol_label:"符号",
    range_label:"价值范围", duration_label:"时长",
    search_ph:"搜索礼品…", optional:"可选", min:"最低", max:"最高",
    launch:"启动侦测", trial:"免费试用 · 10分钟",
    no_active:"暂无活跃侦测", no_history:"暂无历史",
    active:"活跃", view:"详情",
    gift_req:"请选择礼品", dur_req:"请选择时长",
    total_cost:"总费用", stars_nonrefund:"启动后 Stars 不可退款",
    support:"客服", language:"语言", appearance:"外观",
    dark_mode:"深色模式", light_mode:"浅色模式",
    terms_privacy:"条款与隐私", choose_avatar:"选择头像",
    scouts_run:"侦测", total_spent:"消费", results_found:"结果",
    member_since:"加入时间", user_id:"用户 ID",
    time_left:"剩余", results_count:"条结果",
  },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function timeLeft(endsAt) {
  const d = endsAt - Date.now();
  if (d <= 0) return "Expired";
  const h = Math.floor(d / 3600000);
  const m = Math.floor((d % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}
function ls(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch { return fallback; }
}
function lsSet(key, val) { try { localStorage.setItem(key, val); } catch {} }

// ─── ICONS ───────────────────────────────────────────────────────────────────
const ic = (d, extra="") => (s=16) =>
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
    {d}
  </svg>;

const ISearch    = ic(<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>);
const IRadar     = ic(<><path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6h.01"/><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/><circle cx="12" cy="12" r="2"/></>);
const IClock     = ic(<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>);
const IUser      = ic(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>);
const IChevron   = ic(<polyline points="9 18 15 12 9 6"/>);
const IGlobe     = ic(<><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>);
const ICheck     = ic(<polyline points="20 6 9 17 4 12"/>);
const IMoon      = ic(<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>);
const ISun       = ic(<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>);
const IShield    = ic(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>);
const IPencil    = ic(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>);
const IGift      = ic(<><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></>);
const ITrend     = ic(<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>);
const IZap       = ({size=14}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
const IStar      = ({size=14,color}) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color||"currentColor"}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;

// ─── CSS FACTORY ─────────────────────────────────────────────────────────────
const css = (dark) => `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

:root{
  --blue:       #2AABEE;
  --blue-mid:   #1e96d4;
  --blue-dim:   ${dark?"rgba(42,171,238,.13)":"rgba(42,171,238,.09)"};
  --blue-glow:  rgba(42,171,238,.38);
  --blue-bdr:   ${dark?"rgba(42,171,238,.22)":"rgba(42,171,238,.28)"};
  --gold:       #F5C842;
  --gold-dim:   rgba(245,200,66,.13);
  --gold-bdr:   rgba(245,200,66,.25);
  --red-dim:    rgba(255,80,80,.08);
  --red-bdr:    rgba(255,80,80,.18);
  --green:      #30D158;

  --bg0:  ${dark?"#07090f":"#f2f5f9"};
  --bg1:  ${dark?"#0c1018":"#ffffff"};
  --bg2:  ${dark?"rgba(255,255,255,.045)":"rgba(255,255,255,.82)"};
  --bg3:  ${dark?"rgba(255,255,255,.075)":"rgba(255,255,255,.96)"};
  --inp:  ${dark?"rgba(255,255,255,.05)":"rgba(0,0,0,.04)"};

  --t1:   ${dark?"#edf0f7":"#0c1018"};
  --t2:   ${dark?"rgba(237,240,247,.55)":"rgba(12,16,24,.55)"};
  --t3:   ${dark?"rgba(237,240,247,.30)":"rgba(12,16,24,.28)"};
  --bdr:  ${dark?"rgba(255,255,255,.08)":"rgba(0,0,0,.07)"};
  --bdr2: ${dark?"rgba(255,255,255,.12)":"rgba(0,0,0,.10)"};

  --sh:   ${dark?"0 2px 20px rgba(0,0,0,.45)":"0 2px 20px rgba(0,0,0,.07)"};
  --shB:  0 0 0 1px var(--blue-bdr), 0 4px 24px rgba(42,171,238,.12);
  --shL:  ${dark?"0 8px 40px rgba(0,0,0,.55)":"0 8px 40px rgba(0,0,0,.12)"};

  --r4:6px;--r8:10px;--r12:14px;--r16:18px;--r20:22px;--r24:26px;--r32:32px;
  --font:'Plus Jakarta Sans',sans-serif;
  --mono:'JetBrains Mono',monospace;
  --tabH:74px;
  --safe:env(safe-area-inset-bottom,0px);
}

html,body,#root{height:100%;overflow:hidden;}
body{font-family:var(--font);background:var(--bg0);color:var(--t1);-webkit-font-smoothing:antialiased;overscroll-behavior:none;transition:background .35s,color .35s;}

/* ── CANVAS ── */
.canvas{position:fixed;inset:0;z-index:0;pointer-events:none;}
.canvas-bg{
  position:absolute;inset:0;
  background:${dark
    ?"radial-gradient(ellipse 100% 70% at 20% -10%,rgba(42,171,238,.11) 0%,transparent 55%), radial-gradient(ellipse 70% 60% at 85% 110%,rgba(30,150,212,.07) 0%,transparent 55%), #07090f"
    :"radial-gradient(ellipse 100% 70% at 20% -10%,rgba(42,171,238,.07) 0%,transparent 55%), radial-gradient(ellipse 70% 60% at 85% 110%,rgba(30,150,212,.04) 0%,transparent 55%), linear-gradient(160deg,#eaf4fd,#f5f8fc)"};
}
.orb{position:absolute;border-radius:50%;filter:blur(48px);animation:orbDrift var(--d,9s) ease-in-out infinite var(--dl,0s);}
.orb1{width:380px;height:380px;top:-120px;left:-100px;background:${dark?"rgba(42,171,238,.09)":"rgba(42,171,238,.06)"};--d:10s;}
.orb2{width:280px;height:280px;bottom:60px;right:-80px;background:${dark?"rgba(42,171,238,.06)":"rgba(42,171,238,.04)"};--d:13s;--dl:2s;}
.orb3{width:160px;height:160px;top:40%;left:60%;background:${dark?"rgba(245,200,66,.04)":"rgba(245,200,66,.03)"};--d:16s;--dl:4s;}
.noise{position:absolute;inset:0;opacity:${dark?.028:.016};background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-size:180px;}
@keyframes orbDrift{0%,100%{transform:translate(0,0) scale(1);}33%{transform:translate(18px,-22px) scale(1.06);}66%{transform:translate(-12px,14px) scale(.94);}}

/* ── APP SHELL ── */
.app{position:fixed;inset:0;z-index:1;display:flex;flex-direction:column;}
.scroll{flex:1;overflow-y:auto;overflow-x:hidden;padding:8px 14px calc(var(--tabH) + var(--safe) + 12px);scroll-behavior:smooth;}
.scroll::-webkit-scrollbar{display:none;}

/* ── GLASS ── */
.g{
  background:var(--bg2);
  border:1px solid var(--bdr);
  border-radius:var(--r20);
  backdrop-filter:blur(28px) saturate(1.7);
  -webkit-backdrop-filter:blur(28px) saturate(1.7);
  box-shadow:var(--sh);
  transition:background .3s,border-color .3s,box-shadow .3s;
}
.g-blue{border-color:var(--blue-bdr);box-shadow:var(--shB);}

/* ── HEADER ── */
.hdr{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 4px;flex-shrink:0;}
.logo-img{height:28px;object-fit:contain;}
.hdr-r{display:flex;align-items:center;gap:7px;}
.pill{
  display:flex;align-items:center;gap:5px;
  font-size:11px;font-weight:700;padding:6px 11px;border-radius:99px;
  background:var(--bg2);border:1px solid var(--bdr);color:var(--t2);
  cursor:pointer;font-family:var(--font);
  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  transition:all .2s;
}
.pill:active{transform:scale(.94);}
.icon-btn{
  width:34px;height:34px;border-radius:11px;border:none;cursor:pointer;
  background:var(--bg2);border:1px solid var(--bdr);
  display:flex;align-items:center;justify-content:center;
  color:var(--t2);
  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  transition:all .2s;
}
.icon-btn:active{transform:scale(.9);background:var(--bg3);}

/* ── SECTION HEADING ── */
.sh{font-size:10.5px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:var(--t3);margin-bottom:10px;padding-left:2px;}

/* ── TAB BAR ── */
.tabs{
  position:fixed;bottom:0;left:0;right:0;z-index:60;
  padding-bottom:var(--safe);
  background:${dark?"rgba(7,9,15,.88)":"rgba(248,252,255,.88)"};
  border-top:1px solid var(--bdr);
  backdrop-filter:blur(32px) saturate(2);
  -webkit-backdrop-filter:blur(32px) saturate(2);
}
.tabs-row{display:flex;align-items:center;height:var(--tabH);padding:8px 6px 6px;}
.tab{
  flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;
  border:none;background:none;cursor:pointer;color:var(--t3);
  font-family:var(--font);padding:4px 2px;
  transition:color .25s;
}
.tab.on{color:var(--blue);}
.tab-pip{
  width:44px;height:29px;border-radius:10px;
  display:flex;align-items:center;justify-content:center;
  transition:all .32s cubic-bezier(.34,1.56,.64,1);
}
.tab.on .tab-pip{
  background:var(--blue-dim);
  box-shadow:0 0 16px var(--blue-glow);
  transform:translateY(-3px) scale(1.07);
}
.tab-lbl{font-size:9.5px;font-weight:700;letter-spacing:.25px;transition:all .2s;}

/* ── SCOUT FORM ── */
.form{padding:16px;display:flex;flex-direction:column;gap:16px;}
.cost-row{
  display:flex;align-items:center;justify-content:space-between;
  padding:13px 16px;border-radius:var(--r16);
  background:${dark?"rgba(42,171,238,.10)":"rgba(42,171,238,.08)"};
  border:1px solid var(--blue-bdr);
}
.cost-lbl{font-size:12px;color:var(--t2);font-weight:500;}
.cost-val{font-family:var(--mono);font-size:26px;font-weight:600;color:var(--blue);display:flex;align-items:center;gap:6px;line-height:1;}
.gold-star{color:var(--gold);}

.fl{font-size:11.5px;font-weight:600;color:var(--t2);margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;}
.fl-r{display:flex;gap:5px;align-items:center;}
.opt{font-size:10px;color:var(--t3);}
.ctag{
  font-size:9.5px;font-weight:700;color:var(--blue);
  background:var(--blue-dim);padding:2px 8px;border-radius:99px;
  display:flex;align-items:center;gap:3px;
  border:1px solid var(--blue-bdr);
}

/* gift search */
.gsw{position:relative;}
.gsi{
  width:100%;padding:12px 14px 12px 42px;
  background:var(--inp);border:1px solid var(--bdr);
  border-radius:var(--r12);color:var(--t1);font-family:var(--font);font-size:14px;
  outline:none;transition:all .2s;
}
.gsi:focus{border-color:var(--blue-bdr);background:${dark?"rgba(42,171,238,.05)":"rgba(42,171,238,.04)"};}
.gsi::placeholder{color:var(--t3);}
.gsi-ic{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--t3);display:flex;pointer-events:none;}
.gdrop{
  position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:40;
  max-height:196px;overflow-y:auto;border-radius:var(--r12);
  border:1px solid var(--bdr2);
  background:${dark?"rgba(9,12,22,.97)":"rgba(255,255,255,.97)"};
  backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);
  box-shadow:var(--shL);
  animation:popIn .22s cubic-bezier(.34,1.56,.64,1);
}
.gdrop::-webkit-scrollbar{display:none;}
@keyframes popIn{from{opacity:0;transform:translateY(-8px) scale(.97);}to{opacity:1;transform:none;}}
.gopt{
  padding:11px 14px;font-size:13.5px;cursor:pointer;transition:background .12s;
  display:flex;align-items:center;gap:10px;color:var(--t2);
}
.gopt:hover,.gopt.sel{background:var(--blue-dim);color:var(--t1);}
.gdot{width:6px;height:6px;border-radius:50%;background:var(--bdr2);flex-shrink:0;transition:background .2s;}
.gopt.sel .gdot{background:var(--blue);}
.gchk{margin-left:auto;color:var(--blue);display:flex;}

/* chips */
.chips{display:flex;flex-wrap:wrap;gap:7px;}
.chip{
  padding:7px 14px;border-radius:99px;font-size:12px;font-weight:600;
  cursor:pointer;border:1px solid var(--bdr);background:var(--inp);color:var(--t2);
  transition:all .22s cubic-bezier(.34,1.56,.64,1);
  user-select:none;-webkit-user-select:none;font-family:var(--font);
}
.chip:active{transform:scale(.92);}
.chip.on{
  background:var(--blue-dim);border-color:var(--blue-bdr);color:var(--blue);
  box-shadow:0 0 12px rgba(42,171,238,.18);
}

/* range */
.range-row{display:flex;gap:8px;}
.rinp{
  flex:1;padding:12px;border-radius:var(--r8);font-size:14px;font-family:var(--font);
  background:var(--inp);border:1px solid var(--bdr);color:var(--t1);outline:none;transition:border-color .2s;
}
.rinp:focus{border-color:var(--blue-bdr);}
.rinp::placeholder{color:var(--t3);font-size:12px;}

/* duration */
.dur-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;}
.dur{
  padding:14px;border-radius:var(--r12);cursor:pointer;
  border:1px solid var(--bdr);background:var(--inp);
  display:flex;flex-direction:column;gap:5px;
  transition:all .25s cubic-bezier(.34,1.56,.64,1);
  user-select:none;-webkit-user-select:none;
}
.dur:active{transform:scale(.96);}
.dur.on{border-color:var(--blue-bdr);background:var(--blue-dim);box-shadow:0 0 18px rgba(42,171,238,.18);}
.dur-name{font-size:13px;font-weight:700;color:var(--t1);}
.dur-stars{font-size:11px;color:var(--gold);font-family:var(--mono);display:flex;align-items:center;gap:4px;}

/* launch btn */
.launch{
  width:100%;padding:16px;border-radius:var(--r16);border:none;cursor:pointer;
  font-family:var(--font);font-size:15px;font-weight:800;
  background:linear-gradient(135deg,var(--blue) 0%,var(--blue-mid) 100%);
  color:#fff;letter-spacing:.3px;
  box-shadow:0 4px 28px var(--blue-glow);
  transition:all .22s cubic-bezier(.34,1.56,.64,1);
  display:flex;align-items:center;justify-content:center;gap:8px;
}
.launch:active{transform:scale(.975);box-shadow:0 2px 14px var(--blue-glow);}
.launch:disabled{opacity:.28;cursor:not-allowed;transform:none;box-shadow:none;}
.launch-note{text-align:center;font-size:10.5px;color:var(--t3);margin-top:5px;}

/* ── TRIAL PILL ── */
.trial-pill{
  position:fixed;bottom:calc(var(--tabH) + var(--safe) + 16px);right:14px;z-index:55;
  cursor:pointer;animation:trialSway 4s ease-in-out infinite;
}
.trial-inner{
  background:${dark?"linear-gradient(135deg,#0d2744,#0a3360)":"linear-gradient(135deg,#ddeefa,#c9e8f8)"};
  border:1px solid var(--blue-bdr);border-radius:50px;
  padding:9px 16px;display:flex;align-items:center;gap:7px;
  box-shadow:0 6px 28px var(--blue-glow);
  font-size:12px;font-weight:700;color:var(--blue);
}
@keyframes trialSway{0%,100%{transform:translateY(0) rotate(-1.2deg);}50%{transform:translateY(-7px) rotate(1.2deg);}}

/* ── RADAR / HISTORY ITEMS ── */
.si{padding:15px;border-radius:var(--r16);display:flex;flex-direction:column;gap:10px;margin-bottom:10px;transition:transform .2s;}
.si:active{transform:scale(.99);}
.si-hd{display:flex;align-items:center;justify-content:space-between;}
.si-name{font-size:14.5px;font-weight:700;}
.badge{font-size:9.5px;font-weight:800;padding:3px 9px;border-radius:99px;letter-spacing:.6px;}
.badge-on{background:rgba(42,171,238,.14);color:var(--blue);border:1px solid var(--blue-bdr);}
.badge-off{background:var(--inp);color:var(--t3);border:1px solid var(--bdr);}
.metas{display:flex;flex-wrap:wrap;gap:5px;}
.meta{font-size:10.5px;padding:3px 9px;border-radius:99px;background:var(--inp);border:1px solid var(--bdr);color:var(--t2);}
.si-ft{display:flex;align-items:center;justify-content:space-between;}
.tl{font-family:var(--mono);font-size:12px;color:var(--blue);}
.rc{font-size:11px;color:var(--t3);margin-top:2px;}
.det-btn{
  font-size:11.5px;font-weight:700;padding:7px 14px;border-radius:9px;cursor:pointer;
  background:var(--blue-dim);border:1px solid var(--blue-bdr);color:var(--blue);
  font-family:var(--font);transition:all .2s;
}
.det-btn:active{transform:scale(.94);}
.pulse{width:7px;height:7px;border-radius:50%;background:var(--blue);flex-shrink:0;
  box-shadow:0 0 8px var(--blue);animation:pls 2s ease-in-out infinite;}
@keyframes pls{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.45;transform:scale(.65);}}

.empty{padding:52px 24px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px;}
.empty-ico{width:64px;height:64px;border-radius:20px;background:var(--inp);border:1px solid var(--bdr);display:flex;align-items:center;justify-content:center;}
.empty-txt{font-size:13.5px;color:var(--t2);}

/* history */
.hi-hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;}
.hi-name{font-size:14px;font-weight:700;}
.hi-date{font-size:11px;color:var(--t3);}
.hi-ft{display:flex;justify-content:space-between;align-items:center;margin-top:10px;}
.gold-cost{font-family:var(--mono);font-size:12.5px;color:var(--gold);display:flex;align-items:center;gap:5px;}

/* ── PROFILE ── */
.prof-hero{
  border-radius:var(--r24);margin-bottom:11px;overflow:hidden;
  position:relative;background:var(--bg2);border:1px solid var(--bdr);
  backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);box-shadow:var(--sh);
}
.ph-bg{
  position:absolute;inset:0;pointer-events:none;
  background:${dark
    ?"radial-gradient(ellipse 90% 70% at 0% 0%,rgba(42,171,238,.12) 0%,transparent 65%), radial-gradient(ellipse 60% 50% at 100% 100%,rgba(42,171,238,.06) 0%,transparent 65%)"
    :"radial-gradient(ellipse 90% 70% at 0% 0%,rgba(42,171,238,.08) 0%,transparent 65%), radial-gradient(ellipse 60% 50% at 100% 100%,rgba(42,171,238,.04) 0%,transparent 65%)"};
}
.ph-content{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;padding:28px 20px 0;gap:14px;}
.av-wrap{position:relative;}
.av-ring{
  width:106px;height:106px;border-radius:50%;padding:3px;
  background:linear-gradient(140deg,var(--blue),#64d2ff,var(--blue-mid));
  box-shadow:0 0 32px var(--blue-glow),0 0 64px rgba(42,171,238,.18);
  animation:avGlow 4.5s ease-in-out infinite;
}
@keyframes avGlow{
  0%,100%{box-shadow:0 0 32px var(--blue-glow),0 0 64px rgba(42,171,238,.18);}
  50%{box-shadow:0 0 44px var(--blue-glow),0 0 88px rgba(42,171,238,.3);}
}
.av-inner{width:100%;height:100%;border-radius:50%;overflow:hidden;border:2.5px solid var(--bg0);}
.av-img{width:100%;height:100%;object-fit:cover;display:block;}
.av-edit{
  position:absolute;bottom:2px;right:2px;
  width:30px;height:30px;border-radius:50%;
  background:linear-gradient(135deg,var(--blue),var(--blue-mid));
  border:2.5px solid var(--bg0);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:#fff;
  box-shadow:0 2px 12px rgba(42,171,238,.6);
  transition:transform .2s;
}
.av-edit:active{transform:scale(.88);}
.pname{font-size:20px;font-weight:800;letter-spacing:-.3px;text-align:center;}
.pid{font-family:var(--mono);font-size:10.5px;color:var(--t3);margin-top:2px;}
.pbadges{display:flex;gap:6px;margin-top:6px;justify-content:center;}
.pbadge{font-size:9.5px;font-weight:700;padding:3px 10px;border-radius:99px;background:var(--inp);border:1px solid var(--bdr);color:var(--t2);}
.pbadge.bl{background:var(--blue-dim);border-color:var(--blue-bdr);color:var(--blue);}

/* stats */
.pstats{display:grid;grid-template-columns:repeat(3,1fr);margin-top:20px;border-top:1px solid var(--bdr);}
.pstat{
  padding:14px 8px;display:flex;flex-direction:column;align-items:center;gap:4px;
  border-right:1px solid var(--bdr);
}
.pstat:last-child{border-right:none;}
.pstat-ico{color:var(--blue);margin-bottom:1px;}
.pstat-val{font-family:var(--mono);font-size:19px;font-weight:700;}
.pstat-lbl{font-size:9.5px;color:var(--t3);font-weight:600;letter-spacing:.3px;text-align:center;}

/* member */
.member-card{
  border-radius:var(--r16);padding:13px 15px;margin-bottom:11px;
  display:flex;align-items:center;gap:12px;
  background:var(--bg2);border:1px solid var(--gold-bdr);
  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  box-shadow:0 2px 14px rgba(245,200,66,.08);
}
.mc-ico{width:40px;height:40px;border-radius:12px;background:var(--gold-dim);border:1px solid var(--gold-bdr);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
.mc-title{font-size:13px;font-weight:700;}
.mc-sub{font-size:11px;color:var(--t3);margin-top:2px;}
.mc-badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:99px;background:var(--gold-dim);border:1px solid var(--gold-bdr);color:var(--gold);}

/* promo */
.promo{display:block;margin-bottom:11px;border-radius:var(--r16);overflow:hidden;border:1px solid var(--gold-bdr);text-decoration:none;cursor:pointer;transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .2s;box-shadow:0 4px 20px rgba(245,200,66,.08);}
.promo:active{transform:scale(.97);}
.promo img{width:100%;display:block;}

/* profile links */
.plinks{border-radius:var(--r16);overflow:hidden;background:var(--bg2);border:1px solid var(--bdr);margin-bottom:11px;backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);}
.plink{
  padding:14px 15px;display:flex;align-items:center;gap:13px;
  cursor:pointer;text-decoration:none;color:var(--t1);
  border:none;background:none;width:100%;font-family:var(--font);
  transition:background .15s;
}
.plink:active{background:var(--bg3);}
.plink-ico{
  width:40px;height:40px;border-radius:12px;flex-shrink:0;
  background:var(--blue-dim);border:1px solid var(--blue-bdr);
  display:flex;align-items:center;justify-content:center;overflow:hidden;
}
.plink-ico.red{background:var(--red-dim);border-color:var(--red-bdr);}
.plink-body{flex:1;text-align:left;}
.plink-title{font-size:13.5px;font-weight:600;}
.plink-sub{font-size:11px;color:var(--t3);margin-top:1px;}
.plink-arr{color:var(--t3);display:flex;}
.divline{height:1px;background:var(--bdr);margin:0 15px;}

/* toggle */
.toggle-track{
  width:46px;height:27px;border-radius:99px;position:relative;
  background:${dark?"var(--blue)":"var(--bdr2)"};
  transition:background .3s;flex-shrink:0;
}
.toggle-thumb{
  position:absolute;top:3.5px;width:20px;height:20px;border-radius:50%;
  background:#fff;box-shadow:0 1px 5px rgba(0,0,0,.28);
  transition:left .3s cubic-bezier(.34,1.56,.64,1);
}

/* ── MODALS ── */
.overlay{
  position:fixed;inset:0;z-index:80;
  background:${dark?"rgba(5,7,14,.88)":"rgba(210,220,235,.78)"};
  backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  display:flex;align-items:flex-end;
  animation:fadeIn .2s ease;
}
.sheet{
  width:100%;max-height:84vh;border-radius:30px 30px 0 0;
  padding:6px 18px 40px;overflow-y:auto;
  background:var(--bg1);border-top:1px solid var(--blue-bdr);
  box-shadow:0 -8px 50px rgba(42,171,238,.14);
  animation:slideUp .36s cubic-bezier(.34,1.56,.64,1);
}
.sheet::-webkit-scrollbar{display:none;}
.handle{width:36px;height:4px;background:var(--bdr2);border-radius:99px;margin:14px auto 18px;}
.sheet-title{font-size:16px;font-weight:800;margin-bottom:16px;display:flex;align-items:center;gap:8px;}

.mrow{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid var(--bdr);}
.mrow:last-of-type{border-bottom:none;}
.mlbl{font-size:11.5px;color:var(--t3);}
.mval{font-size:13px;font-weight:600;}
.close-btn{width:100%;padding:15px;border-radius:var(--r12);border:1px solid var(--bdr);background:var(--inp);color:var(--t2);font-family:var(--font);font-size:14px;font-weight:600;cursor:pointer;margin-top:18px;transition:all .2s;}
.close-btn:active{background:var(--bg3);}

/* pfp picker */
.pfp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.pfp-item{
  position:relative;border-radius:18px;overflow:hidden;aspect-ratio:1;cursor:pointer;
  border:2.5px solid transparent;
  transition:all .22s cubic-bezier(.34,1.56,.64,1);
  background:var(--inp);
}
.pfp-item:active{transform:scale(.92);}
.pfp-item.sel{border-color:var(--blue);box-shadow:0 0 20px var(--blue-glow);}
.pfp-item img{width:100%;height:100%;object-fit:cover;display:block;border-radius:15px;}
.pfp-chk{
  position:absolute;bottom:6px;right:6px;width:22px;height:22px;
  border-radius:50%;background:var(--blue);border:2px solid var(--bg0);
  display:flex;align-items:center;justify-content:center;color:#fff;
}

/* lang rows */
.lang-row{padding:13px 15px;border-radius:var(--r12);margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;transition:all .15s;}
.lang-row:active{opacity:.7;}

/* ── TOAST ── */
.toast{
  position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:200;
  padding:10px 22px;border-radius:99px;font-size:13px;font-weight:600;
  background:var(--bg1);border:1px solid var(--blue-bdr);color:var(--t1);
  box-shadow:0 6px 30px rgba(0,0,0,.35);
  animation:toastIn .3s ease,toastOut .3s ease 2.7s forwards;
  white-space:nowrap;font-family:var(--font);
  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
}

/* ── LOADING ── */
.loading{position:fixed;inset:0;z-index:999;background:#07090f;display:flex;align-items:center;justify-content:center;animation:fadeOut .5s ease 2.2s forwards;}
.loading img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0;}

/* ── TERMS ── */
.terms-ov{position:fixed;inset:0;z-index:100;display:flex;align-items:flex-end;background:${dark?"rgba(5,7,14,.92)":"rgba(220,230,242,.85)"};backdrop-filter:blur(18px);}
.terms-sheet{width:100%;max-height:92vh;border-radius:32px 32px 0 0;padding:6px 22px 36px;display:flex;flex-direction:column;gap:14px;background:var(--bg1);border-top:1px solid var(--blue-bdr);box-shadow:0 -12px 60px rgba(42,171,238,.15);animation:slideUp .45s cubic-bezier(.34,1.56,.64,1);}
.terms-scroll{flex:1;overflow-y:auto;font-size:13px;line-height:1.85;color:var(--t2);white-space:pre-line;max-height:36vh;padding-right:4px;}
.terms-scroll::-webkit-scrollbar{display:none;}
.lang-btns{display:flex;gap:6px;justify-content:flex-end;}
.lang-btn{font-size:11px;font-weight:700;padding:5px 12px;border-radius:99px;cursor:pointer;border:1px solid var(--bdr);background:var(--inp);color:var(--t2);font-family:var(--font);transition:all .2s;}
.lang-btn.on{background:var(--blue-dim);color:var(--blue);border-color:var(--blue-bdr);}
.terms-hd{display:flex;align-items:center;gap:12px;}

/* footer credit */
.credit{text-align:center;margin-top:6px;margin-bottom:4px;font-size:11px;color:var(--t3);}
.credit a{color:var(--blue);text-decoration:none;}

/* ── KEYFRAMES ── */
@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
@keyframes fadeOut{from{opacity:1;}to{opacity:0;pointer-events:none;}}
@keyframes slideUp{from{transform:translateY(100%);}to{transform:translateY(0);}}
@keyframes tabIn{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-10px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
@keyframes toastOut{from{opacity:1;}to{opacity:0;transform:translateX(-50%) translateY(-6px);}}
.tc{animation:tabIn .28s ease;}
`;

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function App() {
  const [loaded,    setLoaded]    = useState(false);
  const [accepted,  setAccepted]  = useState(() => ls("gt_terms","0") === "1");
  const [lang,      setLang]      = useState(() => ls("gt_lang","EN"));
  const [dark,      setDark]      = useState(() => ls("gt_dark","1") !== "0");
  const [tab,       setTab]       = useState("scout");
  const [pfp,       setPfp]       = useState(() => ls("gt_pfp", PFP_LIST[0]));
  const [showPfp,   setShowPfp]   = useState(false);
  const [showLang,  setShowLang]  = useState(false);
  const [detail,    setDetail]    = useState(null);
  const [toast,     setToast]     = useState(null);
  const [trial,     setTrial]     = useState(true);
  const toastRef = useRef(null);

  // form
  const [giftQ,     setGiftQ]     = useState("");
  const [giftSel,   setGiftSel]   = useState(null);
  const [drop,      setDrop]      = useState(false);
  const [model,     setModel]     = useState(null);
  const [backdrop,  setBackdrop]  = useState(null);
  const [symbol,    setSymbol]    = useState(null);
  const [minV,      setMinV]      = useState("");
  const [maxV,      setMaxV]      = useState("");
  const [dur,       setDur]       = useState(null);

  const t = T[lang];
  const tgUser = typeof window !== "undefined" ? window.Telegram?.WebApp?.initDataUnsafe?.user : null;

  useEffect(() => { const id = setTimeout(() => setLoaded(true), 2400); return () => clearTimeout(id); }, []);
  useEffect(() => { lsSet("gt_dark", dark ? "1" : "0"); }, [dark]);

  const cost = (giftSel ? FILTER_COSTS.gift : 0)
    + (model    ? FILTER_COSTS.model    : 0)
    + (backdrop ? FILTER_COSTS.backdrop : 0)
    + (symbol   ? FILTER_COSTS.symbol   : 0)
    + ((minV||maxV) ? FILTER_COSTS.valueRange : 0)
    + (dur      ? dur.stars : 0);

  const filteredGifts = GIFTS.filter(g => g.toLowerCase().includes(giftQ.toLowerCase()));

  const notify = useCallback((msg) => {
    clearTimeout(toastRef.current);
    setToast(msg);
    toastRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  function doAccept() { lsSet("gt_terms","1"); setAccepted(true); }
  function doLang(l)  { setLang(l); lsSet("gt_lang",l); setShowLang(false); }
  function doPfp(url) { setPfp(url); lsSet("gt_pfp",url); setShowPfp(false); }
  function doToggleDark() { setDark(d => !d); }

  function doLaunch() {
    if (!giftSel) { notify(t.gift_req); return; }
    if (!dur)     { notify(t.dur_req);  return; }
    notify(`Scout launched — ${giftSel}! (${cost} ⭐)`);
    setGiftSel(null); setGiftQ(""); setModel(null); setBackdrop(null);
    setSymbol(null); setMinV(""); setMaxV(""); setDur(null); setTab("radar");
  }
  function doTrial() { notify("Free 10-min trial started!"); setTrial(false); setTab("radar"); }

  const TABS = [
    { id:"scout",   icon:ISearch,  lbl:t.tab_scout   },
    { id:"radar",   icon:IRadar,   lbl:t.tab_radar   },
    { id:"history", icon:IClock,   lbl:t.tab_history },
    { id:"profile", icon:IUser,    lbl:t.tab_profile },
  ];

  return (
    <>
      <style>{css(dark)}</style>

      {/* CANVAS */}
      <div className="canvas">
        <div className="canvas-bg"/>
        <div className="orb orb1"/><div className="orb orb2"/><div className="orb orb3"/>
        <div className="noise"/>
      </div>

      {/* LOADING */}
      {!loaded && (
        <div className="loading">
          <img src="https://i.ibb.co/KptJ4843/Untitled-design-2.png" alt=""/>
        </div>
      )}

      {/* TERMS */}
      {loaded && !accepted && (
        <div className="terms-ov">
          <div className="terms-sheet">
            <div className="handle"/>
            <div className="lang-btns">
              {Object.keys(LANGS).map(l =>
                <button key={l} className={`lang-btn${lang===l?" on":""}`} onClick={()=>setLang(l)}>{l}</button>
              )}
            </div>
            <div className="terms-hd">
              <img src="https://i.ibb.co/tP162vk7/Untitled-design-4.png" alt="GiftTrove" style={{height:28,objectFit:"contain"}}/>
              <span style={{fontSize:17,fontWeight:800}}>{t.terms_title}</span>
            </div>
            <div className="terms-scroll">{t.terms_body}</div>
            <button className="launch" onClick={doAccept}>{t.accept}</button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && <div className="toast">{toast}</div>}

      {/* DETAIL MODAL */}
      {detail && (
        <div className="overlay" onClick={()=>setDetail(null)}>
          <div className="sheet" onClick={e=>e.stopPropagation()}>
            <div className="handle"/>
            <div className="sheet-title"><IGift size={16}/> {detail.gift}</div>
            {detail.model     && <div className="mrow"><span className="mlbl">{t.model_label}</span><span className="mval">{detail.model}</span></div>}
            {detail.backdrop  && <div className="mrow"><span className="mlbl">{t.backdrop_label}</span><span className="mval">{detail.backdrop}</span></div>}
            {detail.symbol    && <div className="mrow"><span className="mlbl">{t.symbol_label}</span><span className="mval">{detail.symbol}</span></div>}
            {detail.valueRange&& <div className="mrow"><span className="mlbl">{t.range_label}</span><span className="mval">{detail.valueRange[0]}–{detail.valueRange[1]}</span></div>}
            <div className="mrow"><span className="mlbl">{t.duration_label}</span><span className="mval">{detail.duration}</span></div>
            <div className="mrow"><span className="mlbl">Stars Spent</span><span className="mval" style={{color:"var(--gold)",fontFamily:"var(--mono)"}}>{detail.stars} ⭐</span></div>
            <div className="mrow"><span className="mlbl">Results</span><span className="mval">{detail.results} listings</span></div>
            {detail.endsAt      && <div className="mrow"><span className="mlbl">Time Left</span><span className="mval" style={{color:"var(--blue)"}}>{timeLeft(detail.endsAt)}</span></div>}
            {detail.completedAt && <div className="mrow"><span className="mlbl">Completed</span><span className="mval">{fmtDate(detail.completedAt)}</span></div>}
            <button className="close-btn" onClick={()=>setDetail(null)}>Close</button>
          </div>
        </div>
      )}

      {/* LANG PICKER */}
      {showLang && (
        <div className="overlay" onClick={()=>setShowLang(false)}>
          <div className="sheet" onClick={e=>e.stopPropagation()}>
            <div className="handle"/>
            <div className="sheet-title"><IGlobe size={16}/> Language</div>
            {Object.entries(LANGS).map(([k,v]) => (
              <div key={k} className="lang-row" onClick={()=>doLang(k)}
                style={{background:lang===k?"var(--blue-dim)":"var(--inp)",border:`1px solid ${lang===k?"var(--blue-bdr)":"var(--bdr)"}`}}>
                <span style={{fontSize:14,fontWeight:600}}>{v}</span>
                {lang===k && <span style={{color:"var(--blue)",display:"flex"}}><ICheck size={14}/></span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PFP PICKER */}
      {showPfp && (
        <div className="overlay" onClick={()=>setShowPfp(false)}>
          <div className="sheet" onClick={e=>e.stopPropagation()}>
            <div className="handle"/>
            <div className="sheet-title" style={{justifyContent:"center"}}>{t.choose_avatar}</div>
            <div className="pfp-grid">
              {PFP_LIST.map((url,i) => (
                <div key={i} className={`pfp-item${pfp===url?" sel":""}`} onClick={()=>doPfp(url)}>
                  <img src={url} alt={`Avatar ${i+1}`}/>
                  {pfp===url && <div className="pfp-chk"><ICheck size={11}/></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* APP */}
      {loaded && (
        <div className="app">
          {/* HEADER */}
          <div className="hdr">
            <img src="https://i.ibb.co/tP162vk7/Untitled-design-4.png" alt="GiftTrove" className="logo-img"/>
            <div className="hdr-r">
              <button className="icon-btn" onClick={doToggleDark}>
                {dark ? <ISun size={16}/> : <IMoon size={16}/>}
              </button>
              <button className="pill" onClick={()=>setShowLang(true)}>
                <IGlobe size={12}/> {lang}
              </button>
            </div>
          </div>

          {/* TRIAL */}
          {trial && tab==="scout" && (
            <div className="trial-pill" onClick={doTrial}>
              <div className="trial-inner"><IZap size={13}/> {t.trial}</div>
            </div>
          )}

          {/* CONTENT */}
          <div className="scroll">

            {/* ── SCOUT ── */}
            {tab==="scout" && (
              <div className="tc">
                <div className="sh">{t.tab_scout}</div>
                <div className="g form">

                  {/* cost */}
                  <div className="cost-row">
                    <span className="cost-lbl">{t.total_cost}</span>
                    <span className="cost-val">
                      <span className="gold-star"><IStar size={17} color="var(--gold)"/></span>
                      {cost}
                    </span>
                  </div>

                  {/* gift */}
                  <div>
                    <div className="fl">{t.gift_label} <span className="ctag"><IStar size={9}/> 5</span></div>
                    <div className="gsw">
                      <span className="gsi-ic"><ISearch size={15}/></span>
                      <input className="gsi" placeholder={t.search_ph}
                        value={giftSel || giftQ}
                        onChange={e=>{ setGiftQ(e.target.value); setGiftSel(null); setDrop(true); }}
                        onFocus={()=>setDrop(true)}
                      />
                      {drop && filteredGifts.length>0 && (
                        <div className="gdrop">
                          {filteredGifts.map(g=>(
                            <div key={g} className={`gopt${giftSel===g?" sel":""}`}
                              onClick={()=>{ setGiftSel(g); setGiftQ(g); setDrop(false); }}>
                              <span className="gdot"/>
                              {g}
                              {giftSel===g && <span className="gchk"><ICheck size={12}/></span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* model */}
                  <div>
                    <div className="fl">{t.model_label} <div className="fl-r"><span className="opt">{t.optional}</span><span className="ctag"><IStar size={9}/> 5</span></div></div>
                    <div className="chips">
                      {MODELS.map(m=><div key={m} className={`chip${model===m?" on":""}`} onClick={()=>setModel(model===m?null:m)}>{m}</div>)}
                    </div>
                  </div>

                  {/* backdrop */}
                  <div>
                    <div className="fl">{t.backdrop_label} <div className="fl-r"><span className="opt">{t.optional}</span><span className="ctag"><IStar size={9}/> 5</span></div></div>
                    <div className="chips">
                      {BACKDROPS.map(b=><div key={b} className={`chip${backdrop===b?" on":""}`} onClick={()=>setBackdrop(backdrop===b?null:b)}>{b}</div>)}
                    </div>
                  </div>

                  {/* symbol */}
                  <div>
                    <div className="fl">{t.symbol_label} <div className="fl-r"><span className="opt">{t.optional}</span><span className="ctag"><IStar size={9}/> 5</span></div></div>
                    <div className="chips">
                      {SYMBOLS.map(s=><div key={s} className={`chip${symbol===s?" on":""}`} onClick={()=>setSymbol(symbol===s?null:s)}>{s}</div>)}
                    </div>
                  </div>

                  {/* range */}
                  <div>
                    <div className="fl">{t.range_label} <div className="fl-r"><span className="opt">{t.optional}</span><span className="ctag"><IStar size={9}/> 10</span></div></div>
                    <div className="range-row">
                      <input className="rinp" placeholder={t.min} type="number" value={minV} onChange={e=>setMinV(e.target.value)}/>
                      <input className="rinp" placeholder={t.max} type="number" value={maxV} onChange={e=>setMaxV(e.target.value)}/>
                    </div>
                  </div>

                  {/* duration */}
                  <div>
                    <div className="fl">{t.duration_label}</div>
                    <div className="dur-grid">
                      {DURATIONS.map(d=>(
                        <div key={d.value} className={`dur${dur?.value===d.value?" on":""}`}
                          onClick={()=>setDur(dur?.value===d.value?null:d)}>
                          <div className="dur-name">{d.label}</div>
                          <div className="dur-stars"><IStar size={10} color="var(--gold)"/> {d.stars.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button className="launch" onClick={doLaunch} disabled={cost===0}>
                    {t.launch}{cost>0?` · ${cost} ⭐`:""}
                  </button>
                  <div className="launch-note">{t.stars_nonrefund}</div>
                </div>
              </div>
            )}

            {/* ── RADAR ── */}
            {tab==="radar" && (
              <div className="tc">
                <div className="sh">{t.active}</div>
                {MOCK_ACTIVE.length===0
                  ? <div className="g empty"><div className="empty-ico"><IRadar size={26}/></div><div className="empty-txt">{t.no_active}</div></div>
                  : MOCK_ACTIVE.map(s=>(
                    <div key={s.id} className="g si">
                      <div className="si-hd">
                        <div style={{display:"flex",alignItems:"center",gap:9}}><div className="pulse"/><span className="si-name">{s.gift}</span></div>
                        <span className="badge badge-on">{t.active}</span>
                      </div>
                      <div className="metas">
                        {s.model    && <span className="meta">Model: {s.model}</span>}
                        {s.backdrop && <span className="meta">Backdrop: {s.backdrop}</span>}
                        {s.symbol   && <span className="meta">Symbol: {s.symbol}</span>}
                        {s.valueRange&&<span className="meta">{s.valueRange[0]}–{s.valueRange[1]} ⭐</span>}
                        <span className="meta">{s.duration}</span>
                      </div>
                      <div className="si-ft">
                        <div><div className="tl">{timeLeft(s.endsAt)} {t.time_left}</div><div className="rc">{s.results} {t.results_count}</div></div>
                        <button className="det-btn" onClick={()=>setDetail(s)}>{t.view}</button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* ── HISTORY ── */}
            {tab==="history" && (
              <div className="tc">
                <div className="sh">{t.tab_history}</div>
                {MOCK_HISTORY.length===0
                  ? <div className="g empty"><div className="empty-ico"><IClock size={26}/></div><div className="empty-txt">{t.no_history}</div></div>
                  : MOCK_HISTORY.map(s=>(
                    <div key={s.id} className="g si">
                      <div className="hi-hd"><div className="hi-name">{s.gift}</div><div className="hi-date">{fmtDate(s.completedAt)}</div></div>
                      <div className="metas">
                        {s.model    && <span className="meta">Model: {s.model}</span>}
                        {s.backdrop && <span className="meta">Backdrop: {s.backdrop}</span>}
                        {s.symbol   && <span className="meta">Symbol: {s.symbol}</span>}
                        {s.valueRange&&<span className="meta">{s.valueRange[0]}–{s.valueRange[1]} ⭐</span>}
                        <span className="meta">{s.duration}</span>
                      </div>
                      <div className="hi-ft">
                        <span className="gold-cost"><IStar size={12} color="var(--gold)"/> {s.stars}</span>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:12,color:"var(--t3)"}}>{s.results} results</span>
                          <button className="det-btn" onClick={()=>setDetail(s)}>{t.view}</button>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* ── PROFILE ── */}
            {tab==="profile" && (
              <div className="tc">

                {/* hero */}
                <div className="prof-hero">
                  <div className="ph-bg"/>
                  <div className="ph-content">
                    <div className="av-wrap">
                      <div className="av-ring">
                        <div className="av-inner">
                          <img className="av-img" src={pfp} alt="Avatar"/>
                        </div>
                      </div>
                      <button className="av-edit" onClick={()=>setShowPfp(true)}><IPencil size={12}/></button>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div className="pname">{tgUser?.first_name || "GiftTrove User"}</div>
                      <div className="pid">{t.user_id}: {tgUser?.id || "TG_USER_ID"}</div>
                      <div className="pbadges">
                        <span className="pbadge">⭐ Scout</span>
                        <span className="pbadge bl">{t.active}</span>
                      </div>
                    </div>
                  </div>
                  <div className="pstats">
                    <div className="pstat">
                      <div className="pstat-ico"><IRadar size={14}/></div>
                      <div className="pstat-val">4</div>
                      <div className="pstat-lbl">{t.scouts_run}</div>
                    </div>
                    <div className="pstat">
                      <div className="pstat-ico"><IStar size={14} color="var(--gold)"/></div>
                      <div className="pstat-val" style={{color:"var(--gold)"}}>235</div>
                      <div className="pstat-lbl">{t.total_spent}</div>
                    </div>
                    <div className="pstat">
                      <div className="pstat-ico"><ITrend size={14}/></div>
                      <div className="pstat-val">19</div>
                      <div className="pstat-lbl">{t.results_found}</div>
                    </div>
                  </div>
                </div>

                {/* member */}
                <div className="member-card">
                  <div className="mc-ico">🎖</div>
                  <div style={{flex:1}}>
                    <div className="mc-title">Gold Scout Member</div>
                    <div className="mc-sub">{t.member_since} Jan 2025</div>
                  </div>
                  <div className="mc-badge">GOLD</div>
                </div>

                {/* promo */}
                <a className="promo"
                  href="https://t.me/hotontgbot/app?startapp=UQDOUQ2TOpZBQ9d9Df-2uOlhzzC82M21MdELmt3Jjcg5aiWx"
                  target="_blank" rel="noreferrer">
                  <img src="https://i.ibb.co/0NR0XcZ/IMG-9518.jpg" alt="Get Stars with Hoton"/>
                </a>

                {/* links */}
                <div className="plinks">
                  <a className="plink" href="https://t.me/insidemajek?direct" target="_blank" rel="noreferrer">
                    <div className="plink-ico red">
                      <img src="https://i.ibb.co/q39SNJmG/Rate-Bot.png" alt="" style={{width:36,height:36,objectFit:"contain",borderRadius:10}}/>
                    </div>
                    <div className="plink-body"><div className="plink-title">{t.support}</div><div className="plink-sub">@insidemajek</div></div>
                    <span className="plink-arr"><IChevron size={14}/></span>
                  </a>
                  <div className="divline"/>
                  <button className="plink" onClick={()=>setShowLang(true)}>
                    <div className="plink-ico"><IGlobe size={16}/></div>
                    <div className="plink-body"><div className="plink-title">{t.language}</div><div className="plink-sub">{LANGS[lang]}</div></div>
                    <span className="plink-arr"><IChevron size={14}/></span>
                  </button>
                  <div className="divline"/>
                  <button className="plink" onClick={doToggleDark}>
                    <div className="plink-ico">{dark?<ISun size={16}/>:<IMoon size={16}/>}</div>
                    <div className="plink-body">
                      <div className="plink-title">{t.appearance}</div>
                      <div className="plink-sub">{dark ? t.dark_mode : t.light_mode}</div>
                    </div>
                    {/* toggle */}
                    <div className="toggle-track">
                      <div className="toggle-thumb" style={{left: dark ? 23 : 3}}/>
                    </div>
                  </button>
                  <div className="divline"/>
                  <button className="plink">
                    <div className="plink-ico"><IShield size={16}/></div>
                    <div className="plink-body"><div className="plink-title">{t.terms_privacy}</div><div className="plink-sub">View legal info</div></div>
                    <span className="plink-arr"><IChevron size={14}/></span>
                  </button>
                </div>

                <div className="credit">
                  Built by <a href="https://t.me/insidemajek">@insidemajek</a> · v3.0
                </div>
              </div>
            )}

          </div>{/* /scroll */}

          {/* TAB BAR */}
          <div className="tabs">
            <div className="tabs-row">
              {TABS.map(({ id, icon:Icon, lbl }) => (
                <button key={id} className={`tab${tab===id?" on":""}`} onClick={()=>setTab(id)}>
                  <div className="tab-pip"><Icon size={17}/></div>
                  <span className="tab-lbl">{lbl}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
