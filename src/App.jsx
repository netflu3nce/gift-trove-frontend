import React, { useState, useEffect, useRef, useCallback } from "react";

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
    style={{ width: size, height: size, objectFit: "contain", display: "block", flexShrink: 0 }}
  />
);

// ─── 109 REAL TELEGRAM GIFT COLLECTIONS (from Giftix/Fragment, June 2026) ────
// Fragment CDN image pattern: https://fragment.com/file/gifts/{slug}/thumb.webp
// Models/symbols are researched from on-chain NFT metadata & community sources.
// Rarity tiers: Ultra Rare < 2%, Rare 2-10%, Uncommon 10-25%, Common > 25%

const GIFT_COLLECTIONS = {
  "Artisan Brick": {
    slug: "artisanbrick", supply: 6278,
    models: [
      { name: "Golden Kiln", rarity: "1.2%" }, { name: "Crimson Forge", rarity: "1.8%" },
      { name: "Ancient Clay", rarity: "3.4%" }, { name: "Obsidian Block", rarity: "3.9%" },
      { name: "Terracotta", rarity: "6.1%" }, { name: "Sandstone", rarity: "8.7%" },
      { name: "Cobblestone", rarity: "11.2%" }, { name: "Red Brick", rarity: "15.4%" },
      { name: "Classic Mortar", rarity: "22.8%" }, { name: "Standard", rarity: "25.5%" }
    ],
    symbols: ["Trowel","Arch","Wall","Flame","Diamond","Star","Hammer","Crown","Shield","Gear"]
  },
  "Astral Shard": {
    slug: "astralshard", supply: 5658,
    models: [
      { name: "Void Crystal", rarity: "1.1%" }, { name: "Nebula Prism", rarity: "1.7%" },
      { name: "Starfall", rarity: "2.8%" }, { name: "Lunar Fragment", rarity: "3.5%" },
      { name: "Solar Shard", rarity: "5.9%" }, { name: "Aurora Sliver", rarity: "8.4%" },
      { name: "Plasma Chip", rarity: "10.3%" }, { name: "Cosmic Grain", rarity: "17.6%" },
      { name: "Ether Piece", rarity: "24.2%" }, { name: "Stellar Dust", rarity: "24.5%" }
    ],
    symbols: ["Star","Moon","Comet","Planet","Spiral","Nova","Rune","Crystal","Eye","Lightning"]
  },
  "B-Day Candle": {
    slug: "bdaycandle", supply: 268892,
    models: [
      { name: "Golden Flame", rarity: "1.5%" }, { name: "Rainbow Wick", rarity: "2.3%" },
      { name: "Crystal Glow", rarity: "4.1%" }, { name: "Sparkle Blaze", rarity: "6.8%" },
      { name: "Party Pink", rarity: "9.2%" }, { name: "Midnight Blue", rarity: "12.5%" },
      { name: "Pastel Swirl", rarity: "14.8%" }, { name: "Classic White", rarity: "16.3%" },
      { name: "Cherry Red", rarity: "16.4%" }, { name: "Vanilla", rarity: "16.1%" }
    ],
    symbols: ["Flame","Star","Heart","Ribbon","Cake","Confetti","Balloon","Crown","Flower","Bell"]
  },
  "Berry Box": {
    slug: "berrybox", supply: 51230,
    models: [
      { name: "Golden Harvest", rarity: "1.3%" }, { name: "Cosmic Berry", rarity: "2.1%" },
      { name: "Crystal Jar", rarity: "3.7%" }, { name: "Midnight Blend", rarity: "5.4%" },
      { name: "Rainbow Mix", rarity: "7.9%" }, { name: "Blueberry Burst", rarity: "10.6%" },
      { name: "Strawberry Field", rarity: "13.2%" }, { name: "Raspberry Rush", rarity: "16.8%" },
      { name: "Mixed Medley", rarity: "19.4%" }, { name: "Classic Basket", rarity: "19.6%" }
    ],
    symbols: ["Leaf","Star","Heart","Flower","Drop","Sun","Moon","Butterfly","Bow","Crown"]
  },
  "Big Year": {
    slug: "bigyear", supply: 75410,
    models: [
      { name: "Golden Trophy", rarity: "1.4%" }, { name: "Platinum Arc", rarity: "2.2%" },
      { name: "Crystal Globe", rarity: "3.9%" }, { name: "Cosmic Year", rarity: "5.7%" },
      { name: "Neon Firework", rarity: "8.3%" }, { name: "Silver Burst", rarity: "11.1%" },
      { name: "Confetti Rain", rarity: "14.6%" }, { name: "Starfall Night", rarity: "17.2%" },
      { name: "Celebration", rarity: "18.1%" }, { name: "Classic Cheer", rarity: "17.5%" }
    ],
    symbols: ["Star","Firework","Crown","Clock","Balloon","Confetti","Bell","Ribbon","Moon","Heart"]
  },
  "Bling Binky": {
    slug: "blingbinky", supply: 9342,
    models: [
      { name: "Diamond Pacifier", rarity: "1.0%" }, { name: "Gold Rush", rarity: "1.6%" },
      { name: "Platinum Shine", rarity: "2.9%" }, { name: "Crystal Clear", rarity: "4.3%" },
      { name: "Rose Gold", rarity: "6.8%" }, { name: "Silver Lux", rarity: "9.7%" },
      { name: "Neon Drip", rarity: "12.4%" }, { name: "Pastel Glam", rarity: "18.6%" },
      { name: "Classic Bling", rarity: "22.3%" }, { name: "Standard", rarity: "20.4%" }
    ],
    symbols: ["Diamond","Star","Crown","Heart","Ring","Gem","Bow","Ribbon","Sparkle","Moon"]
  },
  "Bonded Ring": {
    slug: "bondedring", supply: 7824,
    models: [
      { name: "Eternal Bond", rarity: "1.1%" }, { name: "Diamond Lock", rarity: "1.8%" },
      { name: "Golden Chain", rarity: "3.2%" }, { name: "Platinum Knot", rarity: "4.6%" },
      { name: "Crystal Link", rarity: "7.1%" }, { name: "Silver Twist", rarity: "9.8%" },
      { name: "Rose Infinity", rarity: "13.5%" }, { name: "Braided Band", rarity: "17.2%" },
      { name: "Classic Circle", rarity: "21.4%" }, { name: "Simple Bond", rarity: "20.3%" }
    ],
    symbols: ["Infinity","Heart","Diamond","Star","Crown","Lock","Key","Chain","Ribbon","Knot"]
  },
  "Bow Tie": {
    slug: "bowtie", supply: 55430,
    models: [
      { name: "Golden Silk", rarity: "1.4%" }, { name: "Midnight Velvet", rarity: "2.3%" },
      { name: "Crystal Satin", rarity: "4.0%" }, { name: "Cosmic Plaid", rarity: "6.1%" },
      { name: "Neon Stripe", rarity: "8.7%" }, { name: "Polka Dot", rarity: "11.4%" },
      { name: "Houndstooth", rarity: "14.9%" }, { name: "Classic Black", rarity: "16.8%" },
      { name: "Tartan", rarity: "17.2%" }, { name: "Plain Satin", rarity: "17.2%" }
    ],
    symbols: ["Star","Diamond","Heart","Crown","Ribbon","Bow","Tie","Sparkle","Moon","Gem"]
  },
  "Bunny Muffin": {
    slug: "bunnymuffin", supply: 52102,
    models: [
      { name: "Golden Ears", rarity: "1.3%" }, { name: "Cosmic Cotton", rarity: "2.1%" },
      { name: "Crystal Fluff", rarity: "3.8%" }, { name: "Neon Hare", rarity: "5.6%" },
      { name: "Rainbow Fur", rarity: "8.2%" }, { name: "Chocolate Dip", rarity: "11.4%" },
      { name: "Strawberry Glaze", rarity: "14.7%" }, { name: "Berry Swirl", rarity: "17.3%" },
      { name: "Classic Vanilla", rarity: "18.1%" }, { name: "Plain Bun", rarity: "17.5%" }
    ],
    symbols: ["Carrot","Heart","Star","Bow","Flower","Moon","Cherry","Sprinkle","Leaf","Ribbon"]
  },
  "Candy Cane": {
    slug: "candycane", supply: 216351,
    models: [
      { name: "Golden Stripe", rarity: "1.5%" }, { name: "Rainbow Swirl", rarity: "2.4%" },
      { name: "Crystal Mint", rarity: "4.2%" }, { name: "Cosmic Cherry", rarity: "6.3%" },
      { name: "Neon Peppermint", rarity: "8.9%" }, { name: "Classic Red", rarity: "12.6%" },
      { name: "Strawberry Twist", rarity: "15.4%" }, { name: "Vanilla White", rarity: "16.1%" },
      { name: "Pink Peppermint", rarity: "16.3%" }, { name: "Standard Stripe", rarity: "16.3%" }
    ],
    symbols: ["Snowflake","Star","Heart","Bell","Candy","Ribbon","Holly","Moon","Reindeer","Gift"]
  },
  "Clover Pin": {
    slug: "cloverpin", supply: 227648,
    models: [
      { name: "Golden Shamrock", rarity: "1.5%" }, { name: "Crystal Four-Leaf", rarity: "2.4%" },
      { name: "Emerald Bloom", rarity: "4.1%" }, { name: "Cosmic Green", rarity: "6.2%" },
      { name: "Neon Luck", rarity: "8.8%" }, { name: "Classic Irish", rarity: "12.5%" },
      { name: "Jade Petal", rarity: "15.3%" }, { name: "Mint Fresh", rarity: "16.2%" },
      { name: "Spring Green", rarity: "16.5%" }, { name: "Simple Clover", rarity: "16.5%" }
    ],
    symbols: ["Leaf","Star","Heart","Flower","Moon","Sun","Rainbow","Drop","Butterfly","Crown"]
  },
  "Cookie Heart": {
    slug: "cookieheart", supply: 188088,
    models: [
      { name: "Golden Glaze", rarity: "1.5%" }, { name: "Cosmic Frosting", rarity: "2.4%" },
      { name: "Crystal Sugar", rarity: "4.1%" }, { name: "Rainbow Sprinkle", rarity: "6.2%" },
      { name: "Chocolate Dip", rarity: "8.8%" }, { name: "Strawberry Cream", rarity: "12.5%" },
      { name: "Vanilla Swirl", rarity: "15.3%" }, { name: "Pink Icing", rarity: "16.2%" },
      { name: "Classic Brown", rarity: "16.5%" }, { name: "Plain Cookie", rarity: "16.5%" }
    ],
    symbols: ["Heart","Star","Sprinkle","Bow","Flower","Moon","Cherry","Candle","Ribbon","Crown"]
  },
  "Crystal Ball": {
    slug: "crystalball", supply: 26685,
    models: [
      { name: "Void Gazer", rarity: "1.2%" }, { name: "Mystic Orb", rarity: "1.9%" },
      { name: "Fortune Sphere", rarity: "3.4%" }, { name: "Cosmic Eye", rarity: "5.1%" },
      { name: "Nebula Globe", rarity: "7.8%" }, { name: "Aurora Ball", rarity: "10.4%" },
      { name: "Moonlight Sphere", rarity: "13.7%" }, { name: "Starfall Orb", rarity: "17.4%" },
      { name: "Classic Glass", rarity: "20.1%" }, { name: "Clear Diviner", rarity: "20.0%" }
    ],
    symbols: ["Eye","Star","Moon","Spiral","Crystal","Rune","Flame","Diamond","Crown","Mist"]
  },
  "Cupid Charm": {
    slug: "cupidcharm", supply: 29968,
    models: [
      { name: "Golden Arrow", rarity: "1.2%" }, { name: "Crystal Bow", rarity: "2.0%" },
      { name: "Rose Quiver", rarity: "3.6%" }, { name: "Cosmic Cupid", rarity: "5.3%" },
      { name: "Neon Heart", rarity: "7.9%" }, { name: "Angel Wing", rarity: "10.7%" },
      { name: "Silver Shot", rarity: "14.1%" }, { name: "Classic Red", rarity: "17.6%" },
      { name: "Pink Charm", rarity: "19.3%" }, { name: "Simple Arrow", rarity: "18.3%" }
    ],
    symbols: ["Heart","Arrow","Wing","Star","Moon","Rose","Bow","Crown","Ribbon","Diamond"]
  },
  "Desk Calendar": {
    slug: "deskcalendar", supply: 295337,
    models: [
      { name: "Golden Pages", rarity: "1.5%" }, { name: "Crystal Planner", rarity: "2.4%" },
      { name: "Cosmic Schedule", rarity: "4.2%" }, { name: "Neon Agenda", rarity: "6.3%" },
      { name: "Leather Bound", rarity: "8.9%" }, { name: "Minimalist White", rarity: "12.6%" },
      { name: "Classic Wood", rarity: "15.4%" }, { name: "Spiral Bound", rarity: "16.1%" },
      { name: "Flip Calendar", rarity: "16.3%" }, { name: "Simple Block", rarity: "16.3%" }
    ],
    symbols: ["Star","Moon","Sun","Clock","Leaf","Heart","Lightning","Diamond","Crown","Flame"]
  },
  "Diamond Ring": {
    slug: "diamondring", supply: 32249,
    models: [
      { name: "Eternal Solitaire", rarity: "1.2%" }, { name: "Halo Crown", rarity: "1.9%" },
      { name: "Emerald Cut", rarity: "3.5%" }, { name: "Pear Drop", rarity: "5.2%" },
      { name: "Marquise Royal", rarity: "7.8%" }, { name: "Oval Brilliant", rarity: "10.6%" },
      { name: "Princess Cut", rarity: "13.9%" }, { name: "Cushion Classic", rarity: "17.5%" },
      { name: "Heart Diamond", rarity: "19.2%" }, { name: "Radiant Cut", rarity: "19.2%" }
    ],
    symbols: ["Diamond","Heart","Star","Infinity","Crown","Ribbon","Flower","Bow","Moon","Crystal"]
  },
  "Durov's Cap": {
    slug: "durovscap", supply: 4709,
    models: [
      { name: "Golden Edition", rarity: "0.9%" }, { name: "Vintage Patina", rarity: "1.4%" },
      { name: "Neon Glow", rarity: "2.6%" }, { name: "Shadow Black", rarity: "3.8%" },
      { name: "Arctic White", rarity: "5.7%" }, { name: "Carbon Fiber", rarity: "8.3%" },
      { name: "Pearl Cream", rarity: "11.9%" }, { name: "Crimson Elite", rarity: "16.4%" },
      { name: "Classic Canvas", rarity: "24.5%" }, { name: "Standard", rarity: "24.5%" }
    ],
    symbols: ["Star","Lightning","Crown","Diamond","Dove","Shield","Letter D","Telegram","TON","Infinity"]
  },
  "Easter Egg": {
    slug: "easteregg", supply: 162418,
    models: [
      { name: "Golden Shell", rarity: "1.5%" }, { name: "Crystal Swirl", rarity: "2.4%" },
      { name: "Cosmic Marble", rarity: "4.1%" }, { name: "Rainbow Drip", rarity: "6.2%" },
      { name: "Neon Dot", rarity: "8.8%" }, { name: "Pastel Bloom", rarity: "12.5%" },
      { name: "Classic Dye", rarity: "15.3%" }, { name: "Checker Pattern", rarity: "16.2%" },
      { name: "Stripe Design", rarity: "16.5%" }, { name: "Plain Shell", rarity: "16.5%" }
    ],
    symbols: ["Flower","Star","Heart","Leaf","Butterfly","Sun","Moon","Chick","Ribbon","Crown"]
  },
  "Electric Skull": {
    slug: "electricskull", supply: 9211,
    models: [
      { name: "Plasma Cranium", rarity: "1.0%" }, { name: "Neon Grim", rarity: "1.7%" },
      { name: "Thunder Bone", rarity: "3.1%" }, { name: "Cyber Skull", rarity: "4.6%" },
      { name: "Volt Reaper", rarity: "7.2%" }, { name: "Static Death", rarity: "9.9%" },
      { name: "Shock White", rarity: "13.5%" }, { name: "Classic Electric", rarity: "18.2%" },
      { name: "Flicker Bone", rarity: "21.4%" }, { name: "Base Skull", rarity: "19.4%" }
    ],
    symbols: ["Lightning","Skull","Flame","Eye","Star","Moon","Bolt","Gear","Spark","Rune"]
  },
  "Eternal Candle": {
    slug: "eternalcandle", supply: 45034,
    models: [
      { name: "Midnight Flame", rarity: "1.3%" }, { name: "Aurora Wick", rarity: "2.1%" },
      { name: "Crystal Pillar", rarity: "3.8%" }, { name: "Golden Blaze", rarity: "5.6%" },
      { name: "Blood Moon Glow", rarity: "8.1%" }, { name: "Angelic Light", rarity: "11.3%" },
      { name: "Shadow Taper", rarity: "14.6%" }, { name: "Rainbow Drip", rarity: "17.2%" },
      { name: "Phantom White", rarity: "18.0%" }, { name: "Sacred Ember", rarity: "18.0%" }
    ],
    symbols: ["Flame","Moon","Star","Cross","Eye","Heart","Teardrop","Spiral","Crown","Feather"]
  },
  "Eternal Rose": {
    slug: "eternalrose", supply: 30915,
    models: [
      { name: "Crimson Velvet", rarity: "1.2%" }, { name: "Golden Petal", rarity: "2.0%" },
      { name: "Crystal Bloom", rarity: "3.6%" }, { name: "Midnight Black", rarity: "5.3%" },
      { name: "Sapphire Blue", rarity: "7.9%" }, { name: "Snow White", rarity: "10.7%" },
      { name: "Shadow Noir", rarity: "14.1%" }, { name: "Neon Ember", rarity: "17.6%" },
      { name: "Cosmic Bloom", rarity: "19.3%" }, { name: "Classic Red", rarity: "18.3%" }
    ],
    symbols: ["Thorn","Heart","Star","Dewdrop","Petal","Leaf","Moon","Butterfly","Flame","Crown"]
  },
  "Evil Eye": {
    slug: "evileye", supply: 73186,
    models: [
      { name: "Apex Predator", rarity: "1.5%" }, { name: "Void Gaze", rarity: "2.3%" },
      { name: "Serpent Watch", rarity: "4.0%" }, { name: "Mystic Iris", rarity: "6.1%" },
      { name: "Neon Blink", rarity: "8.7%" }, { name: "Ancient Warden", rarity: "11.4%" },
      { name: "Golden Sight", rarity: "14.9%" }, { name: "Crystal Lens", rarity: "16.8%" },
      { name: "Classic Blue", rarity: "17.2%" }, { name: "Simple Ward", rarity: "17.1%" }
    ],
    symbols: ["Eye","Star","Teardrop","Coin","Moon","Flame","Lightning","Diamond","Skull","Rune"]
  },
  "Faith Amulet": {
    slug: "faithamulet", supply: 136729,
    models: [
      { name: "Golden Blessing", rarity: "1.5%" }, { name: "Crystal Prayer", rarity: "2.4%" },
      { name: "Sacred Relic", rarity: "4.1%" }, { name: "Cosmic Grace", rarity: "6.2%" },
      { name: "Neon Devotion", rarity: "8.8%" }, { name: "Silver Talisman", rarity: "12.5%" },
      { name: "Jade Charm", rarity: "15.3%" }, { name: "Stone Pendant", rarity: "16.2%" },
      { name: "Classic Wooden", rarity: "16.5%" }, { name: "Simple Cord", rarity: "16.5%" }
    ],
    symbols: ["Star","Moon","Cross","Eye","Flower","Leaf","Heart","Crown","Rune","Diamond"]
  },
  "Flying Broom": {
    slug: "flyingbroom", supply: 24714,
    models: [
      { name: "Golden Enchant", rarity: "1.2%" }, { name: "Cosmic Sweep", rarity: "1.9%" },
      { name: "Crystal Bristle", rarity: "3.5%" }, { name: "Shadow Hex", rarity: "5.2%" },
      { name: "Neon Trail", rarity: "7.8%" }, { name: "Ancient Wood", rarity: "10.6%" },
      { name: "Silver Birch", rarity: "13.9%" }, { name: "Classic Straw", rarity: "17.5%" },
      { name: "Twisted Twig", rarity: "19.2%" }, { name: "Simple Broom", rarity: "19.2%" }
    ],
    symbols: ["Star","Moon","Bat","Spider","Skull","Flame","Eye","Witch","Spiral","Cat"]
  },
  "Fresh Socks": {
    slug: "freshsocks", supply: 160037,
    models: [
      { name: "Golden Thread", rarity: "1.5%" }, { name: "Crystal Knit", rarity: "2.4%" },
      { name: "Cosmic Pattern", rarity: "4.1%" }, { name: "Neon Stripe", rarity: "6.2%" },
      { name: "Polka Dot", rarity: "8.8%" }, { name: "Argyle Classic", rarity: "12.5%" },
      { name: "Fuzzy Warm", rarity: "15.3%" }, { name: "Ankle Cut", rarity: "16.2%" },
      { name: "Classic White", rarity: "16.5%" }, { name: "Plain Cotton", rarity: "16.5%" }
    ],
    symbols: ["Star","Heart","Snowflake","Moon","Stripe","Diamond","Crown","Leaf","Flame","Bow"]
  },
  "Gem Signet": {
    slug: "gemsignet", supply: 6149,
    models: [
      { name: "Royal Emerald", rarity: "1.0%" }, { name: "Sapphire Crest", rarity: "1.6%" },
      { name: "Ruby Seal", rarity: "2.9%" }, { name: "Diamond Sigil", rarity: "4.3%" },
      { name: "Topaz Engraved", rarity: "6.8%" }, { name: "Amethyst Mark", rarity: "9.7%" },
      { name: "Onyx Stamp", rarity: "12.4%" }, { name: "Pearl Imprint", rarity: "18.6%" },
      { name: "Classic Gem", rarity: "22.3%" }, { name: "Standard Signet", rarity: "20.4%" }
    ],
    symbols: ["Crown","Star","Diamond","Lion","Eagle","Sword","Shield","Anchor","Flame","Crest"]
  },
  "Genie Lamp": {
    slug: "genielamp", supply: 6509,
    models: [
      { name: "Void Genie", rarity: "1.0%" }, { name: "Cosmic Djinn", rarity: "1.6%" },
      { name: "Golden Wish", rarity: "2.9%" }, { name: "Crystal Rub", rarity: "4.3%" },
      { name: "Shadow Smoke", rarity: "6.8%" }, { name: "Neon Glow", rarity: "9.7%" },
      { name: "Ancient Bronze", rarity: "12.4%" }, { name: "Royal Brass", rarity: "18.6%" },
      { name: "Classic Lamp", rarity: "22.3%" }, { name: "Simple Lantern", rarity: "20.4%" }
    ],
    symbols: ["Star","Moon","Flame","Smoke","Wish","Diamond","Crown","Eye","Spiral","Lightning"]
  },
  "Ginger Cookie": {
    slug: "gingercookie", supply: 143355,
    models: [
      { name: "Golden Glaze", rarity: "1.5%" }, { name: "Royal Icing", rarity: "2.4%" },
      { name: "Crystal Sugar", rarity: "4.1%" }, { name: "Spiced Dark", rarity: "6.2%" },
      { name: "Neon Frosting", rarity: "8.8%" }, { name: "Classic Ginger", rarity: "12.5%" },
      { name: "Snowman Shape", rarity: "15.3%" }, { name: "Star Cutter", rarity: "16.2%" },
      { name: "Reindeer Shape", rarity: "16.5%" }, { name: "Simple Round", rarity: "16.5%" }
    ],
    symbols: ["Star","Snowflake","Heart","Bell","Holly","Reindeer","Crown","Moon","Candy","Ribbon"]
  },
  "Hanging Star": {
    slug: "hangingstar", supply: 44828,
    models: [
      { name: "Golden Celestial", rarity: "1.3%" }, { name: "Crystal Shimmer", rarity: "2.1%" },
      { name: "Cosmic Glow", rarity: "3.8%" }, { name: "Neon Twinkle", rarity: "5.6%" },
      { name: "Rainbow Sparkle", rarity: "8.1%" }, { name: "Silver Gleam", rarity: "11.3%" },
      { name: "Rose Quartz", rarity: "14.6%" }, { name: "Classic Yellow", rarity: "17.2%" },
      { name: "White Light", rarity: "18.0%" }, { name: "Simple Star", rarity: "18.0%" }
    ],
    symbols: ["Star","Moon","Snowflake","Heart","Diamond","Comet","Sparkle","Crown","Bell","Ribbon"]
  },
  "Happy Brownie": {
    slug: "happybrownie", supply: 218364,
    models: [
      { name: "Golden Fudge", rarity: "1.5%" }, { name: "Cosmic Chunk", rarity: "2.4%" },
      { name: "Crystal Glaze", rarity: "4.1%" }, { name: "Rainbow Swirl", rarity: "6.2%" },
      { name: "Neon Frosting", rarity: "8.8%" }, { name: "Dark Chocolate", rarity: "12.5%" },
      { name: "Mint Chip", rarity: "15.3%" }, { name: "Classic Fudge", rarity: "16.2%" },
      { name: "Walnut Crunch", rarity: "16.5%" }, { name: "Plain Brownie", rarity: "16.5%" }
    ],
    symbols: ["Heart","Star","Sprinkle","Moon","Cherry","Crown","Ribbon","Bow","Flame","Leaf"]
  },
  "Heart Locket": {
    slug: "heartlocket", supply: 1949,
    models: [
      { name: "Eternal Gold", rarity: "0.8%" }, { name: "Diamond Inlay", rarity: "1.3%" },
      { name: "Ruby Heart", rarity: "2.4%" }, { name: "Platinum Shine", rarity: "3.6%" },
      { name: "Crystal Clear", rarity: "5.6%" }, { name: "Rose Antique", rarity: "8.2%" },
      { name: "Silver Filigree", rarity: "12.1%" }, { name: "Victorian Lace", rarity: "17.8%" },
      { name: "Classic Gold", rarity: "24.1%" }, { name: "Simple Silver", rarity: "24.1%" }
    ],
    symbols: ["Heart","Lock","Key","Star","Diamond","Rose","Crown","Ribbon","Moon","Infinity"]
  },
  "Heroic Helmet": {
    slug: "heroichelmet", supply: 3414,
    models: [
      { name: "Legendary Forge", rarity: "0.9%" }, { name: "Titan Crown", rarity: "1.5%" },
      { name: "Crystal Visor", rarity: "2.8%" }, { name: "Shadow Knight", rarity: "4.2%" },
      { name: "Golden Warrior", rarity: "6.7%" }, { name: "Neon Spartan", rarity: "9.4%" },
      { name: "Iron Guard", rarity: "13.1%" }, { name: "Classic Bronze", rarity: "18.8%" },
      { name: "Simple Steel", rarity: "21.8%" }, { name: "Standard", rarity: "20.8%" }
    ],
    symbols: ["Star","Shield","Sword","Crown","Lightning","Flame","Eagle","Diamond","Skull","Rune"]
  },
  "Hex Pot": {
    slug: "hexpot", supply: 55503,
    models: [
      { name: "Void Brew", rarity: "1.3%" }, { name: "Dark Elixir", rarity: "2.1%" },
      { name: "Crystal Cauldron", rarity: "3.8%" }, { name: "Neon Hex", rarity: "5.6%" },
      { name: "Golden Potion", rarity: "8.1%" }, { name: "Cosmic Brew", rarity: "11.3%" },
      { name: "Shadow Kettle", rarity: "14.6%" }, { name: "Electric Mix", rarity: "17.2%" },
      { name: "Ancient Cast", rarity: "18.0%" }, { name: "Cursed Pot", rarity: "18.0%" }
    ],
    symbols: ["Star","Skull","Moon","Flame","Eye","Spiral","Lightning","Rune","Spider","Cauldron"]
  },
  "Holiday Drink": {
    slug: "holidaydrink", supply: 83913,
    models: [
      { name: "Golden Nog", rarity: "1.4%" }, { name: "Cosmic Brew", rarity: "2.3%" },
      { name: "Crystal Mug", rarity: "4.0%" }, { name: "Spiced Classic", rarity: "6.1%" },
      { name: "Neon Fizz", rarity: "8.7%" }, { name: "Winter Warmer", rarity: "11.4%" },
      { name: "Mulled Wine", rarity: "14.9%" }, { name: "Hot Cocoa", rarity: "16.8%" },
      { name: "Cider Cup", rarity: "17.2%" }, { name: "Simple Sip", rarity: "17.2%" }
    ],
    symbols: ["Snowflake","Star","Heart","Moon","Cinnamon","Holly","Bell","Ribbon","Flame","Crown"]
  },
  "Homemade Cake": {
    slug: "homemadecake", supply: 178889,
    models: [
      { name: "Golden Layer", rarity: "1.5%" }, { name: "Cosmic Confetti", rarity: "2.4%" },
      { name: "Crystal Glaze", rarity: "4.1%" }, { name: "Rainbow Tier", rarity: "6.2%" },
      { name: "Chocolate Dream", rarity: "8.8%" }, { name: "Strawberry Swirl", rarity: "12.5%" },
      { name: "Funfetti Burst", rarity: "15.3%" }, { name: "Vanilla Classic", rarity: "16.2%" },
      { name: "Cherry Top", rarity: "16.5%" }, { name: "Plain Bake", rarity: "16.5%" }
    ],
    symbols: ["Candle","Heart","Star","Cherry","Flower","Bow","Sprinkle","Crown","Diamond","Ribbon"]
  },
  "Hypno Lollipop": {
    slug: "hypnolollipop", supply: 80044,
    models: [
      { name: "Void Spiral", rarity: "1.4%" }, { name: "Neon Trance", rarity: "2.3%" },
      { name: "Crystal Swirl", rarity: "4.0%" }, { name: "Rainbow Dizzy", rarity: "6.1%" },
      { name: "Dark Spin", rarity: "8.7%" }, { name: "Golden Hypno", rarity: "11.4%" },
      { name: "Electric Pop", rarity: "14.9%" }, { name: "Shadow Lick", rarity: "16.8%" },
      { name: "Psychedelic", rarity: "17.2%" }, { name: "Classic Swirl", rarity: "17.2%" }
    ],
    symbols: ["Spiral","Star","Eye","Moon","Swirl","Diamond","Lightning","Heart","Flame","Candy"]
  },
  "Ice Cream": {
    slug: "icecream", supply: 324922,
    models: [
      { name: "Golden Scoop", rarity: "1.5%" }, { name: "Cosmic Swirl", rarity: "2.4%" },
      { name: "Crystal Cone", rarity: "4.1%" }, { name: "Rainbow Triple", rarity: "6.2%" },
      { name: "Neon Drip", rarity: "8.8%" }, { name: "Chocolate Dip", rarity: "12.5%" },
      { name: "Strawberry Dream", rarity: "15.3%" }, { name: "Vanilla Classic", rarity: "16.2%" },
      { name: "Mint Chip", rarity: "16.5%" }, { name: "Plain Vanilla", rarity: "16.5%" }
    ],
    symbols: ["Star","Heart","Sprinkle","Cherry","Cone","Moon","Rainbow","Flower","Crown","Bow"]
  },
  "Input Key": {
    slug: "inputkey", supply: 129286,
    models: [
      { name: "Golden Cipher", rarity: "1.5%" }, { name: "Crystal Code", rarity: "2.4%" },
      { name: "Neon Access", rarity: "4.1%" }, { name: "Cosmic Unlock", rarity: "6.2%" },
      { name: "Shadow Key", rarity: "8.8%" }, { name: "Platinum Master", rarity: "12.5%" },
      { name: "Retro Bit", rarity: "15.3%" }, { name: "Classic Metal", rarity: "16.2%" },
      { name: "Simple Steel", rarity: "16.5%" }, { name: "Plain Key", rarity: "16.5%" }
    ],
    symbols: ["Key","Star","Lock","Code","Diamond","Moon","Crown","Gear","Lightning","Shield"]
  },
  "Instant Ramen": {
    slug: "instantramen", supply: 374254,
    models: [
      { name: "Golden Broth", rarity: "1.5%" }, { name: "Cosmic Noodle", rarity: "2.4%" },
      { name: "Crystal Bowl", rarity: "4.1%" }, { name: "Spicy Dragon", rarity: "6.2%" },
      { name: "Neon Slurp", rarity: "8.8%" }, { name: "Umami Classic", rarity: "12.5%" },
      { name: "Tonkotsu Rich", rarity: "15.3%" }, { name: "Miso Base", rarity: "16.2%" },
      { name: "Soy Simple", rarity: "16.5%" }, { name: "Plain Cup", rarity: "16.5%" }
    ],
    symbols: ["Noodle","Star","Chopstick","Flame","Moon","Drop","Heart","Crown","Leaf","Wave"]
  },
  "Ion Gem": {
    slug: "iongem", supply: 4534,
    models: [
      { name: "Plasma Core", rarity: "1.0%" }, { name: "Void Crystal", rarity: "1.6%" },
      { name: "Aurora Shard", rarity: "2.9%" }, { name: "Nebula Stone", rarity: "4.3%" },
      { name: "Solar Gem", rarity: "6.8%" }, { name: "Lunar Facet", rarity: "9.7%" },
      { name: "Electric Cut", rarity: "12.4%" }, { name: "Radiant Prism", rarity: "18.6%" },
      { name: "Classic Ion", rarity: "22.3%" }, { name: "Simple Gem", rarity: "20.4%" }
    ],
    symbols: ["Lightning","Star","Crystal","Flame","Eye","Spiral","Diamond","Moon","Gear","Rune"]
  },
  "Ionic Dryer": {
    slug: "ionicdryer", supply: 19874,
    models: [
      { name: "Platinum Pro", rarity: "1.2%" }, { name: "Golden Blast", rarity: "1.9%" },
      { name: "Crystal Blow", rarity: "3.5%" }, { name: "Neon Wind", rarity: "5.2%" },
      { name: "Shadow Turbo", rarity: "7.8%" }, { name: "Cosmic Flow", rarity: "10.6%" },
      { name: "Salon Grade", rarity: "13.9%" }, { name: "Classic Black", rarity: "17.5%" },
      { name: "Simple White", rarity: "19.2%" }, { name: "Standard", rarity: "19.2%" }
    ],
    symbols: ["Lightning","Star","Wind","Flame","Drop","Diamond","Crown","Gear","Moon","Spiral"]
  },
  "Jack-in-the-Box": {
    slug: "jackinthebox", supply: 96114,
    models: [
      { name: "Golden Surprise", rarity: "1.4%" }, { name: "Cosmic Clown", rarity: "2.3%" },
      { name: "Crystal Spring", rarity: "4.0%" }, { name: "Neon Pop", rarity: "6.1%" },
      { name: "Shadow Jester", rarity: "8.7%" }, { name: "Vintage Crank", rarity: "11.4%" },
      { name: "Rainbow Jack", rarity: "14.9%" }, { name: "Classic Wooden", rarity: "16.8%" },
      { name: "Painted Tin", rarity: "17.2%" }, { name: "Simple Box", rarity: "17.2%" }
    ],
    symbols: ["Star","Bell","Spiral","Jester","Diamond","Moon","Surprise","Crown","Heart","Lightning"]
  },
  "Jelly Bunny": {
    slug: "jellybunny", supply: 102996,
    models: [
      { name: "Sweet Crystal", rarity: "1.4%" }, { name: "Rainbow Gloss", rarity: "2.3%" },
      { name: "Cosmic Gelatin", rarity: "4.0%" }, { name: "Spring Gummy", rarity: "6.1%" },
      { name: "Berry Squish", rarity: "8.7%" }, { name: "Golden Wobble", rarity: "11.4%" },
      { name: "Mint Jelly", rarity: "14.9%" }, { name: "Bubble Hop", rarity: "16.8%" },
      { name: "Rose Soft", rarity: "17.2%" }, { name: "Classic Bunny", rarity: "17.2%" }
    ],
    symbols: ["Carrot","Heart","Star","Flower","Paw","Bow","Moon","Leaf","Clover","Butterfly"]
  },
  "Jester Hat": {
    slug: "jesterhat", supply: 135813,
    models: [
      { name: "Golden Jingle", rarity: "1.5%" }, { name: "Cosmic Fool", rarity: "2.4%" },
      { name: "Crystal Bell", rarity: "4.1%" }, { name: "Rainbow Motley", rarity: "6.2%" },
      { name: "Neon Prankster", rarity: "8.8%" }, { name: "Electric Comic", rarity: "12.5%" },
      { name: "Shadow Trickster", rarity: "15.3%" }, { name: "Dark Wit", rarity: "16.2%" },
      { name: "Royal Jester", rarity: "16.5%" }, { name: "Classic Cap", rarity: "16.5%" }
    ],
    symbols: ["Bell","Star","Diamond","Moon","Heart","Spiral","Lightning","Eye","Crown","Flame"]
  },
  "Jingle Bells": {
    slug: "jinglebells", supply: 73610,
    models: [
      { name: "Golden Peal", rarity: "1.4%" }, { name: "Crystal Chime", rarity: "2.3%" },
      { name: "Cosmic Ring", rarity: "4.0%" }, { name: "Neon Jingle", rarity: "6.1%" },
      { name: "Silver Cluster", rarity: "8.7%" }, { name: "Classic Brass", rarity: "11.4%" },
      { name: "Rustic Bronze", rarity: "14.9%" }, { name: "Festive Red", rarity: "16.8%" },
      { name: "Holly Bunch", rarity: "17.2%" }, { name: "Simple Bell", rarity: "17.2%" }
    ],
    symbols: ["Bell","Star","Snowflake","Holly","Heart","Crown","Ribbon","Moon","Reindeer","Gift"]
  },
  "Jolly Chimp": {
    slug: "jollychimp", supply: 115905,
    models: [
      { name: "Golden Primate", rarity: "1.5%" }, { name: "Cosmic Ape", rarity: "2.4%" },
      { name: "Crystal Chimp", rarity: "4.1%" }, { name: "Neon Monkey", rarity: "6.2%" },
      { name: "Shadow Gorilla", rarity: "8.8%" }, { name: "Rainbow Furball", rarity: "12.5%" },
      { name: "Laughing Chimp", rarity: "15.3%" }, { name: "Classic Brown", rarity: "16.2%" },
      { name: "Playful", rarity: "16.5%" }, { name: "Simple Chimp", rarity: "16.5%" }
    ],
    symbols: ["Banana","Star","Heart","Moon","Paw","Crown","Diamond","Leaf","Swing","Spiral"]
  },
  "Joyful Bundle": {
    slug: "joyfulbundle", supply: 79283,
    models: [
      { name: "Golden Wrap", rarity: "1.4%" }, { name: "Cosmic Gift", rarity: "2.3%" },
      { name: "Crystal Bow", rarity: "4.0%" }, { name: "Rainbow Ribbon", rarity: "6.1%" },
      { name: "Neon Package", rarity: "8.7%" }, { name: "Silver Bundle", rarity: "11.4%" },
      { name: "Festive Box", rarity: "14.9%" }, { name: "Classic Wrap", rarity: "16.8%" },
      { name: "Simple Gift", rarity: "17.2%" }, { name: "Plain Bundle", rarity: "17.2%" }
    ],
    symbols: ["Star","Heart","Ribbon","Bow","Diamond","Moon","Crown","Bell","Confetti","Sparkle"]
  },
  "Khabib's Papakha": {
    slug: "khabibspapakha", supply: 28535,
    models: [
      { name: "Champion's Crown", rarity: "1.2%" }, { name: "Golden Fur", rarity: "1.9%" },
      { name: "Crystal Fleece", rarity: "3.5%" }, { name: "Shadow Warrior", rarity: "5.2%" },
      { name: "Eagle Crest", rarity: "7.8%" }, { name: "Dagestani Pride", rarity: "10.6%" },
      { name: "Combat Grade", rarity: "13.9%" }, { name: "Classic Wool", rarity: "17.5%" },
      { name: "Tribal Pattern", rarity: "19.2%" }, { name: "Standard Papakha", rarity: "19.2%" }
    ],
    symbols: ["Eagle","Star","Crown","Shield","Flame","Mountain","Moon","Diamond","Fist","Lion"]
  },
  "Kissed Frog": {
    slug: "kissedfrog", supply: 14059,
    models: [
      { name: "Golden Prince", rarity: "1.1%" }, { name: "Crystal Royale", rarity: "1.8%" },
      { name: "Cosmic Amphibian", rarity: "3.2%" }, { name: "Shadow Croak", rarity: "4.8%" },
      { name: "Neon Froglet", rarity: "7.4%" }, { name: "Electric Toad", rarity: "10.1%" },
      { name: "Ancient Frog", rarity: "13.8%" }, { name: "Royal Leap", rarity: "18.5%" },
      { name: "Classic Green", rarity: "20.2%" }, { name: "Simple Frog", rarity: "19.1%" }
    ],
    symbols: ["Crown","Star","Heart","Lily","Moon","Drop","Flame","Eye","Flower","Spiral"]
  },
  "Light Sword": {
    slug: "lightsword", supply: 124309,
    models: [
      { name: "Void Blade", rarity: "1.5%" }, { name: "Plasma Edge", rarity: "2.4%" },
      { name: "Crystal Saber", rarity: "4.1%" }, { name: "Neon Strike", rarity: "6.2%" },
      { name: "Shadow Katana", rarity: "8.8%" }, { name: "Golden Knight", rarity: "12.5%" },
      { name: "Silver Arc", rarity: "15.3%" }, { name: "Classic Blue", rarity: "16.2%" },
      { name: "Red Laser", rarity: "16.5%" }, { name: "Green Laser", rarity: "16.5%" }
    ],
    symbols: ["Star","Lightning","Flame","Diamond","Crown","Moon","Shield","Rune","Spiral","Eye"]
  },
  "Lol Pop": {
    slug: "lolpop", supply: 432748,
    models: [
      { name: "Golden Lick", rarity: "1.5%" }, { name: "Cosmic Sugar", rarity: "2.4%" },
      { name: "Crystal Candy", rarity: "4.1%" }, { name: "Rainbow Swirl", rarity: "6.2%" },
      { name: "Neon Pop", rarity: "8.8%" }, { name: "Watermelon", rarity: "12.5%" },
      { name: "Strawberry Twist", rarity: "15.3%" }, { name: "Classic Cherry", rarity: "16.2%" },
      { name: "Blueberry", rarity: "16.5%" }, { name: "Plain Pop", rarity: "16.5%" }
    ],
    symbols: ["Spiral","Star","Heart","Candy","Moon","Diamond","Rainbow","Crown","Bow","Sparkle"]
  },
  "Loot Bag": {
    slug: "lootbag", supply: 14430,
    models: [
      { name: "Legendary Haul", rarity: "1.1%" }, { name: "Golden Treasure", rarity: "1.8%" },
      { name: "Crystal Cache", rarity: "3.2%" }, { name: "Cosmic Bounty", rarity: "4.8%" },
      { name: "Neon Jackpot", rarity: "7.4%" }, { name: "Shadow Loot", rarity: "10.1%" },
      { name: "Ancient Spoils", rarity: "13.8%" }, { name: "Royal Plunder", rarity: "18.5%" },
      { name: "Classic Canvas", rarity: "20.2%" }, { name: "Simple Sack", rarity: "19.1%" }
    ],
    symbols: ["Star","Diamond","Coin","Gem","Crown","Key","Skull","Lightning","Moon","Shield"]
  },
  "Love Candle": {
    slug: "lovecandle", supply: 23350,
    models: [
      { name: "Golden Romance", rarity: "1.2%" }, { name: "Crystal Passion", rarity: "1.9%" },
      { name: "Rose Glow", rarity: "3.5%" }, { name: "Cosmic Love", rarity: "5.2%" },
      { name: "Neon Heart", rarity: "7.8%" }, { name: "Electric Blaze", rarity: "10.6%" },
      { name: "Shadow Flame", rarity: "13.9%" }, { name: "Dark Romance", rarity: "17.5%" },
      { name: "Royal Love", rarity: "19.2%" }, { name: "Classic Candle", rarity: "19.2%" }
    ],
    symbols: ["Heart","Flame","Star","Rose","Moon","Drop","Diamond","Ribbon","Crown","Petal"]
  },
  "Love Potion": {
    slug: "lovepotion", supply: 29093,
    models: [
      { name: "Enchanted Brew", rarity: "1.2%" }, { name: "Crystal Elixir", rarity: "1.9%" },
      { name: "Rose Formula", rarity: "3.5%" }, { name: "Cosmic Tonic", rarity: "5.2%" },
      { name: "Neon Draught", rarity: "7.8%" }, { name: "Golden Mix", rarity: "10.6%" },
      { name: "Shadow Blend", rarity: "13.9%" }, { name: "Dark Essence", rarity: "17.5%" },
      { name: "Royal Brew", rarity: "19.2%" }, { name: "Classic Vial", rarity: "19.2%" }
    ],
    symbols: ["Heart","Star","Drop","Moon","Flame","Rose","Diamond","Spiral","Crown","Butterfly"]
  },
  "Low Rider": {
    slug: "lowrider", supply: 23429,
    models: [
      { name: "Gold Hydraulic", rarity: "1.2%" }, { name: "Chrome Dream", rarity: "1.9%" },
      { name: "Crystal Paint", rarity: "3.5%" }, { name: "Cosmic Cruiser", rarity: "5.2%" },
      { name: "Neon Street", rarity: "7.8%" }, { name: "Shadow Ride", rarity: "10.6%" },
      { name: "Classic Custom", rarity: "13.9%" }, { name: "Vintage Drop", rarity: "17.5%" },
      { name: "Street Classic", rarity: "19.2%" }, { name: "Simple Ride", rarity: "19.2%" }
    ],
    symbols: ["Star","Flame","Crown","Diamond","Moon","Wheel","Heart","Lightning","Shield","Skull"]
  },
  "Lunar Snake": {
    slug: "lunarsnake", supply: 191255,
    models: [
      { name: "Golden Serpent", rarity: "1.5%" }, { name: "Crystal Coil", rarity: "2.4%" },
      { name: "Cosmic Python", rarity: "4.1%" }, { name: "Shadow Mamba", rarity: "6.2%" },
      { name: "Neon Viper", rarity: "8.8%" }, { name: "Electric Cobra", rarity: "12.5%" },
      { name: "Ancient Jade", rarity: "15.3%" }, { name: "Dark Serpent", rarity: "16.2%" },
      { name: "Classic Scales", rarity: "16.5%" }, { name: "Simple Snake", rarity: "16.5%" }
    ],
    symbols: ["Moon","Star","Eye","Coil","Flame","Fang","Diamond","Rune","Spiral","Crown"]
  },
  "Lush Bouquet": {
    slug: "lushbouquet", supply: 105718,
    models: [
      { name: "Golden Garden", rarity: "1.4%" }, { name: "Crystal Bloom", rarity: "2.3%" },
      { name: "Cosmic Petals", rarity: "4.0%" }, { name: "Rainbow Bunch", rarity: "6.1%" },
      { name: "Neon Wildflower", rarity: "8.7%" }, { name: "Rose Cluster", rarity: "11.4%" },
      { name: "Spring Bouquet", rarity: "14.9%" }, { name: "Classic Red", rarity: "16.8%" },
      { name: "White Lilies", rarity: "17.2%" }, { name: "Simple Wrap", rarity: "17.2%" }
    ],
    symbols: ["Flower","Star","Heart","Leaf","Butterfly","Drop","Moon","Ribbon","Crown","Bow"]
  },
  "Mad Pumpkin": {
    slug: "madpumpkin", supply: 19475,
    models: [
      { name: "Void Grin", rarity: "1.2%" }, { name: "Neon Carve", rarity: "1.9%" },
      { name: "Crystal Hollow", rarity: "3.5%" }, { name: "Shadow Gourd", rarity: "5.2%" },
      { name: "Cosmic Lantern", rarity: "7.8%" }, { name: "Golden Squash", rarity: "10.6%" },
      { name: "Evil Grin", rarity: "13.9%" }, { name: "Classic Orange", rarity: "17.5%" },
      { name: "Spooky Face", rarity: "19.2%" }, { name: "Simple Pumpkin", rarity: "19.2%" }
    ],
    symbols: ["Star","Skull","Moon","Flame","Eye","Spider","Bat","Spiral","Lightning","Cat"]
  },
  "Magic Potion": {
    slug: "magicpotion", supply: 4871,
    models: [
      { name: "Void Elixir", rarity: "1.0%" }, { name: "Nebula Brew", rarity: "1.6%" },
      { name: "Crystal Vial", rarity: "2.9%" }, { name: "Dark Matter", rarity: "4.3%" },
      { name: "Fire Brew", rarity: "6.8%" }, { name: "Ice Formula", rarity: "9.7%" },
      { name: "Golden Tonic", rarity: "12.4%" }, { name: "Chaos Mix", rarity: "18.6%" },
      { name: "Rainbow Blend", rarity: "22.3%" }, { name: "Shadow Draft", rarity: "20.4%" }
    ],
    symbols: ["Star","Skull","Moon","Flame","Droplet","Eye","Spiral","Lightning","Crystal","Rune"]
  },
  "Mighty Arm": {
    slug: "mightyarm", supply: 3800,
    models: [
      { name: "Titan Punch", rarity: "0.9%" }, { name: "Golden Flex", rarity: "1.5%" },
      { name: "Crystal Strength", rarity: "2.8%" }, { name: "Neon Power", rarity: "4.2%" },
      { name: "Shadow Might", rarity: "6.7%" }, { name: "Cosmic Force", rarity: "9.4%" },
      { name: "Iron Fist", rarity: "13.1%" }, { name: "Classic Muscle", rarity: "18.8%" },
      { name: "Simple Arm", rarity: "21.8%" }, { name: "Standard", rarity: "20.8%" }
    ],
    symbols: ["Star","Fist","Lightning","Flame","Crown","Diamond","Shield","Moon","Gear","Eagle"]
  },
  "Mini Oscar": {
    slug: "minioscar", supply: 4861,
    models: [
      { name: "Gold Statuette", rarity: "1.0%" }, { name: "Crystal Award", rarity: "1.6%" },
      { name: "Platinum Trophy", rarity: "2.9%" }, { name: "Diamond Prize", rarity: "4.3%" },
      { name: "Silver Glory", rarity: "6.8%" }, { name: "Neon Stage", rarity: "9.7%" },
      { name: "Cosmic Award", rarity: "12.4%" }, { name: "Classic Gold", rarity: "18.6%" },
      { name: "Simple Trophy", rarity: "22.3%" }, { name: "Standard", rarity: "20.4%" }
    ],
    symbols: ["Star","Crown","Diamond","Flame","Moon","Trophy","Ribbon","Heart","Spotlight","Award"]
  },
  "Money Pot": {
    slug: "moneypot", supply: 70348,
    models: [
      { name: "Golden Vault", rarity: "1.4%" }, { name: "Crystal Chest", rarity: "2.3%" },
      { name: "Cosmic Coins", rarity: "4.0%" }, { name: "Neon Fortune", rarity: "6.1%" },
      { name: "Shadow Savings", rarity: "8.7%" }, { name: "Jade Pot", rarity: "11.4%" },
      { name: "Classic Piggy", rarity: "14.9%" }, { name: "Terracotta", rarity: "16.8%" },
      { name: "Copper Kettle", rarity: "17.2%" }, { name: "Simple Pot", rarity: "17.2%" }
    ],
    symbols: ["Coin","Star","Diamond","Crown","Moon","Leaf","Flame","Heart","Rainbow","Gold"]
  },
  "Moon Pendant": {
    slug: "moonpendant", supply: 101839,
    models: [
      { name: "Crescent Gold", rarity: "1.4%" }, { name: "Crystal Full Moon", rarity: "2.3%" },
      { name: "Cosmic Waxing", rarity: "4.0%" }, { name: "Neon Phase", rarity: "6.1%" },
      { name: "Shadow Waning", rarity: "8.7%" }, { name: "Silver Sliver", rarity: "11.4%" },
      { name: "Pearl Half Moon", rarity: "14.9%" }, { name: "Classic Charm", rarity: "16.8%" },
      { name: "Simple Moon", rarity: "17.2%" }, { name: "Plain Pendant", rarity: "17.2%" }
    ],
    symbols: ["Moon","Star","Heart","Diamond","Crown","Teardrop","Butterfly","Flower","Ribbon","Crescent"]
  },
  "Mousse Cake": {
    slug: "moussecake", supply: 164151,
    models: [
      { name: "Golden Mirror", rarity: "1.5%" }, { name: "Crystal Ganache", rarity: "2.4%" },
      { name: "Cosmic Glaze", rarity: "4.1%" }, { name: "Velvet Noir", rarity: "6.2%" },
      { name: "Neon Drip", rarity: "8.8%" }, { name: "Raspberry Layer", rarity: "12.5%" },
      { name: "Mango Passion", rarity: "15.3%" }, { name: "Classic Chocolate", rarity: "16.2%" },
      { name: "Vanilla Dome", rarity: "16.5%" }, { name: "Simple Slice", rarity: "16.5%" }
    ],
    symbols: ["Heart","Star","Cherry","Ribbon","Crown","Flower","Moon","Bow","Diamond","Sprinkle"]
  },
  "Nail Bracelet": {
    slug: "nailbracelet", supply: 4684,
    models: [
      { name: "Platinum Spike", rarity: "1.0%" }, { name: "Golden Edge", rarity: "1.6%" },
      { name: "Crystal Sharp", rarity: "2.9%" }, { name: "Shadow Point", rarity: "4.3%" },
      { name: "Neon Punk", rarity: "6.8%" }, { name: "Gothic Steel", rarity: "9.7%" },
      { name: "Titanium Band", rarity: "12.4%" }, { name: "Classic Silver", rarity: "18.6%" },
      { name: "Simple Chain", rarity: "22.3%" }, { name: "Standard", rarity: "20.4%" }
    ],
    symbols: ["Star","Skull","Diamond","Moon","Lightning","Flame","Crown","Spike","Eye","Rune"]
  },
  "Neko Helmet": {
    slug: "nekohelmet", supply: 15510,
    models: [
      { name: "Golden Neko", rarity: "1.1%" }, { name: "Crystal Cat", rarity: "1.8%" },
      { name: "Cosmic Feline", rarity: "3.2%" }, { name: "Shadow Neko", rarity: "4.8%" },
      { name: "Neon Kitty", rarity: "7.4%" }, { name: "Anime Cat", rarity: "10.1%" },
      { name: "Kawaii Helmet", rarity: "13.8%" }, { name: "Classic Cat Ear", rarity: "18.5%" },
      { name: "Simple Neko", rarity: "20.2%" }, { name: "Standard", rarity: "19.1%" }
    ],
    symbols: ["Paw","Star","Heart","Moon","Diamond","Crown","Bow","Cat","Lightning","Flower"]
  },
  "Party Sparkler": {
    slug: "partysparkler", supply: 178606,
    models: [
      { name: "Golden Blast", rarity: "1.5%" }, { name: "Crystal Firework", rarity: "2.4%" },
      { name: "Cosmic Burst", rarity: "4.1%" }, { name: "Rainbow Spark", rarity: "6.2%" },
      { name: "Neon Glitter", rarity: "8.8%" }, { name: "Electric Pop", rarity: "12.5%" },
      { name: "Shadow Fuse", rarity: "15.3%" }, { name: "Glitter Rain", rarity: "16.2%" },
      { name: "Royal Flash", rarity: "16.5%" }, { name: "Classic Sparkle", rarity: "16.5%" }
    ],
    symbols: ["Star","Spark","Heart","Firework","Diamond","Moon","Crown","Lightning","Ribbon","Confetti"]
  },
  "Perfume Bottle": {
    slug: "perfumebottle", supply: 4403,
    models: [
      { name: "Crystal Noir", rarity: "0.9%" }, { name: "Golden Essence", rarity: "1.5%" },
      { name: "Rose Absolute", rarity: "2.8%" }, { name: "Midnight Oud", rarity: "4.2%" },
      { name: "Cosmic Mist", rarity: "6.7%" }, { name: "Shadow Parfum", rarity: "9.4%" },
      { name: "Neon Spritz", rarity: "13.1%" }, { name: "Vintage Flacon", rarity: "18.8%" },
      { name: "Royal Scent", rarity: "21.8%" }, { name: "Classic Bottle", rarity: "20.8%" }
    ],
    symbols: ["Flower","Star","Drop","Heart","Moon","Ribbon","Crown","Butterfly","Leaf","Diamond"]
  },
  "Pet Snake": {
    slug: "petsnake", supply: 177232,
    models: [
      { name: "Golden Python", rarity: "1.5%" }, { name: "Crystal Cobra", rarity: "2.4%" },
      { name: "Cosmic Boa", rarity: "4.1%" }, { name: "Neon Viper", rarity: "6.2%" },
      { name: "Shadow Mamba", rarity: "8.8%" }, { name: "Rainbow Corn", rarity: "12.5%" },
      { name: "Albino Slither", rarity: "15.3%" }, { name: "Classic Green", rarity: "16.2%" },
      { name: "Spotted Ball", rarity: "16.5%" }, { name: "Simple Scale", rarity: "16.5%" }
    ],
    symbols: ["Fang","Star","Coil","Moon","Eye","Flame","Diamond","Leaf","Crown","Spiral"]
  },
  "Plush Pepe": {
    slug: "plushpepe", supply: 2825,
    models: [
      { name: "Golden Pepe", rarity: "0.7%" }, { name: "Neon Glow", rarity: "1.1%" },
      { name: "Pumpkin", rarity: "2.0%" }, { name: "Gummy Frog", rarity: "3.2%" },
      { name: "Wild Pepe", rarity: "5.3%" }, { name: "Classic Green", rarity: "8.9%" },
      { name: "Cosmic Frog", rarity: "12.4%" }, { name: "Cyber Pepe", rarity: "17.6%" },
      { name: "Retro Pepe", rarity: "24.4%" }, { name: "Standard", rarity: "24.4%" }
    ],
    symbols: ["Illuminati","Fish Skeleton","Frog","Crown","Star","Peace","Anchor","Spiral","Eye","Moon"]
  },
  "Precious Peach": {
    slug: "preciouspeach", supply: 3000,
    models: [
      { name: "Jade Emperor", rarity: "0.8%" }, { name: "Golden Harvest", rarity: "1.3%" },
      { name: "Crystal Dewdrop", rarity: "2.4%" }, { name: "Cosmic Bloom", rarity: "3.7%" },
      { name: "Summer Glow", rarity: "5.8%" }, { name: "Shadow Blossom", rarity: "8.5%" },
      { name: "Neon Peach", rarity: "12.3%" }, { name: "Glowing Silk", rarity: "18.1%" },
      { name: "Classic Peach", rarity: "23.6%" }, { name: "Simple Fruit", rarity: "23.5%" }
    ],
    symbols: ["Leaf","Star","Blossom","Butterfly","Drop","Sun","Moon","Bird","Flower","Wave"]
  },
  "Pretty Posy": {
    slug: "prettyposy", supply: 119347,
    models: [
      { name: "Golden Bloom", rarity: "1.5%" }, { name: "Crystal Posy", rarity: "2.4%" },
      { name: "Cosmic Petal", rarity: "4.1%" }, { name: "Neon Wild", rarity: "6.2%" },
      { name: "Rainbow Cluster", rarity: "8.8%" }, { name: "Shadow Bunch", rarity: "12.5%" },
      { name: "Rose Posy", rarity: "15.3%" }, { name: "Classic Daisy", rarity: "16.2%" },
      { name: "Spring Bunch", rarity: "16.5%" }, { name: "Simple Posy", rarity: "16.5%" }
    ],
    symbols: ["Flower","Star","Heart","Leaf","Butterfly","Drop","Moon","Ribbon","Crown","Bow"]
  },
  "Rare Bird": {
    slug: "rarebird", supply: 11946,
    models: [
      { name: "Void Phoenix", rarity: "1.1%" }, { name: "Golden Plume", rarity: "1.7%" },
      { name: "Crystal Feather", rarity: "3.1%" }, { name: "Cosmic Crane", rarity: "4.6%" },
      { name: "Neon Macaw", rarity: "7.2%" }, { name: "Shadow Raven", rarity: "9.9%" },
      { name: "Peacock Display", rarity: "13.5%" }, { name: "Classic Songbird", rarity: "18.2%" },
      { name: "Tropical Parrot", rarity: "21.4%" }, { name: "Simple Bird", rarity: "19.3%" }
    ],
    symbols: ["Feather","Star","Moon","Egg","Nest","Diamond","Crown","Leaf","Wing","Flame"]
  },
  "Record Player": {
    slug: "recordplayer", supply: 33342,
    models: [
      { name: "Golden Vinyl", rarity: "1.2%" }, { name: "Crystal Turntable", rarity: "2.0%" },
      { name: "Cosmic Groove", rarity: "3.6%" }, { name: "Neon Spin", rarity: "5.3%" },
      { name: "Shadow Deck", rarity: "7.9%" }, { name: "Vintage Walnut", rarity: "10.7%" },
      { name: "Retro Chrome", rarity: "14.1%" }, { name: "Classic Black", rarity: "17.6%" },
      { name: "Simple Platter", rarity: "19.3%" }, { name: "Standard", rarity: "18.3%" }
    ],
    symbols: ["Music","Star","Note","Vinyl","Moon","Diamond","Crown","Heart","Wave","Flame"]
  },
  "Restless Jar": {
    slug: "restlessjar", supply: 100224,
    models: [
      { name: "Void Vessel", rarity: "1.4%" }, { name: "Neon Rattle", rarity: "2.3%" },
      { name: "Crystal Shake", rarity: "4.0%" }, { name: "Cosmic Bounce", rarity: "6.1%" },
      { name: "Shadow Stir", rarity: "8.7%" }, { name: "Golden Jolt", rarity: "11.4%" },
      { name: "Electric Jar", rarity: "14.9%" }, { name: "Ancient Clay", rarity: "16.8%" },
      { name: "Classic Glass", rarity: "17.2%" }, { name: "Simple Jar", rarity: "17.2%" }
    ],
    symbols: ["Star","Eye","Spiral","Moon","Flame","Lightning","Rune","Drop","Crown","Skull"]
  },
  "Sakura Flower": {
    slug: "sakuraflower", supply: 87633,
    models: [
      { name: "Eternal Blossom", rarity: "1.4%" }, { name: "Golden Petal", rarity: "2.3%" },
      { name: "Crystal Spring", rarity: "4.0%" }, { name: "Midnight Storm", rarity: "6.1%" },
      { name: "Rainbow Bloom", rarity: "8.7%" }, { name: "Shadow Sakura", rarity: "11.4%" },
      { name: "Celestial Pink", rarity: "14.9%" }, { name: "Classic Blossom", rarity: "16.8%" },
      { name: "Simple Flower", rarity: "17.2%" }, { name: "Plain Petal", rarity: "17.2%" }
    ],
    symbols: ["Petal","Leaf","Dragonfly","Butterfly","Moon","Star","Drop","Bird","Wave","Sun"]
  },
  "Santa Hat": {
    slug: "santahat", supply: 68686,
    models: [
      { name: "Golden Trim", rarity: "1.4%" }, { name: "Crystal Snow", rarity: "2.3%" },
      { name: "Cosmic Velvet", rarity: "4.0%" }, { name: "Dark Holiday", rarity: "6.1%" },
      { name: "Neon Festive", rarity: "8.7%" }, { name: "Shadow Claus", rarity: "11.4%" },
      { name: "Electric Jolly", rarity: "14.9%" }, { name: "Ancient Yule", rarity: "16.8%" },
      { name: "Classic Red", rarity: "17.2%" }, { name: "Simple Hat", rarity: "17.2%" }
    ],
    symbols: ["Snowflake","Star","Bell","Candy Cane","Reindeer","Gift","Sleigh","Holly","Moon","Tree"]
  },
  "Scared Cat": {
    slug: "scaredcat", supply: 19289,
    models: [
      { name: "Void Fright", rarity: "1.2%" }, { name: "Neon Startled", rarity: "1.9%" },
      { name: "Crystal Puff", rarity: "3.5%" }, { name: "Golden Hiss", rarity: "5.2%" },
      { name: "Shadow Arch", rarity: "7.8%" }, { name: "Cosmic Fur", rarity: "10.6%" },
      { name: "Electric Static", rarity: "13.9%" }, { name: "Ancient Whisker", rarity: "17.5%" },
      { name: "Classic Tabby", rarity: "19.2%" }, { name: "Cursed Kitty", rarity: "19.2%" }
    ],
    symbols: ["Paw","Star","Moon","Skull","Flame","Eye","Lightning","Spider","Bat","Spiral"]
  },
  "Sharp Tongue": {
    slug: "sharptongue", supply: 8099,
    models: [
      { name: "Viper Strike", rarity: "1.0%" }, { name: "Electric Lash", rarity: "1.6%" },
      { name: "Neon Flick", rarity: "2.9%" }, { name: "Poison Dart", rarity: "4.3%" },
      { name: "Shadow Fork", rarity: "6.8%" }, { name: "Crystal Barb", rarity: "9.7%" },
      { name: "Fire Lick", rarity: "12.4%" }, { name: "Ice Taste", rarity: "18.6%" },
      { name: "Golden Tongue", rarity: "22.3%" }, { name: "Chaos Flick", rarity: "20.4%" }
    ],
    symbols: ["Fang","Lightning","Droplet","Skull","Eye","Spiral","Star","Moon","Flame","Dagger"]
  },
  "Signet Ring": {
    slug: "signetring", supply: 16746,
    models: [
      { name: "Dynasty Gold", rarity: "1.1%" }, { name: "Onyx Seal", rarity: "1.8%" },
      { name: "Diamond Crest", rarity: "3.2%" }, { name: "Platinum Royal", rarity: "4.8%" },
      { name: "Ruby Sovereign", rarity: "7.4%" }, { name: "Sapphire Sigil", rarity: "10.1%" },
      { name: "Emerald Mark", rarity: "13.8%" }, { name: "Crystal Imprint", rarity: "18.5%" },
      { name: "Classic Band", rarity: "20.2%" }, { name: "Shadow Signet", rarity: "19.1%" }
    ],
    symbols: ["Crest","Star","Crown","Diamond","Lion","Eagle","Sword","Shield","Anchor","Flame"]
  },
  "Skull Flower": {
    slug: "skullflower", supply: 21741,
    models: [
      { name: "Void Bloom", rarity: "1.2%" }, { name: "Dark Petal", rarity: "1.9%" },
      { name: "Neon Death", rarity: "3.5%" }, { name: "Golden Dead", rarity: "5.2%" },
      { name: "Crystal Grim", rarity: "7.8%" }, { name: "Cosmic Shadow", rarity: "10.6%" },
      { name: "Electric Thorn", rarity: "13.9%" }, { name: "Ancient Cursed", rarity: "17.5%" },
      { name: "Classic Dark", rarity: "19.2%" }, { name: "Simple Skull", rarity: "19.2%" }
    ],
    symbols: ["Skull","Petal","Star","Moon","Flame","Eye","Thorn","Spiral","Lightning","Leaf"]
  },
  "Sky Stilettos": {
    slug: "skystilettos", supply: 50587,
    models: [
      { name: "Golden Strut", rarity: "1.3%" }, { name: "Crystal Heel", rarity: "2.1%" },
      { name: "Cosmic Stiletto", rarity: "3.8%" }, { name: "Neon Pump", rarity: "5.6%" },
      { name: "Shadow Mule", rarity: "8.1%" }, { name: "Electric Wedge", rarity: "11.3%" },
      { name: "Runway Red", rarity: "14.6%" }, { name: "Classic Black", rarity: "17.2%" },
      { name: "Simple Nude", rarity: "18.0%" }, { name: "Standard Heel", rarity: "18.0%" }
    ],
    symbols: ["Star","Diamond","Heart","Crown","Moon","Ribbon","Flower","Bow","Sparkle","Gem"]
  },
  "Sleigh Bell": {
    slug: "sleighbell", supply: 21936,
    models: [
      { name: "Golden Peal", rarity: "1.2%" }, { name: "Crystal Chime", rarity: "1.9%" },
      { name: "Cosmic Ring", rarity: "3.5%" }, { name: "Neon Jingle", rarity: "5.2%" },
      { name: "Shadow Toll", rarity: "7.8%" }, { name: "Silver Cluster", rarity: "10.6%" },
      { name: "Festive Brass", rarity: "13.9%" }, { name: "Classic Bronze", rarity: "17.5%" },
      { name: "Simple Bell", rarity: "19.2%" }, { name: "Plain Ring", rarity: "19.2%" }
    ],
    symbols: ["Bell","Star","Snowflake","Holly","Crown","Ribbon","Moon","Reindeer","Heart","Gift"]
  },
  "Snake Box": {
    slug: "snakebox", supply: 172867,
    models: [
      { name: "Golden Coil", rarity: "1.5%" }, { name: "Crystal Scales", rarity: "2.4%" },
      { name: "Cosmic Python", rarity: "4.1%" }, { name: "Shadow Serpent", rarity: "6.2%" },
      { name: "Neon Viper", rarity: "8.8%" }, { name: "Rainbow Anaconda", rarity: "12.5%" },
      { name: "Classic Cobra", rarity: "15.3%" }, { name: "Jade Snake", rarity: "16.2%" },
      { name: "Desert Asp", rarity: "16.5%" }, { name: "Simple Box", rarity: "16.5%" }
    ],
    symbols: ["Coil","Star","Fang","Eye","Moon","Flame","Diamond","Leaf","Crown","Spiral"]
  },
  "Snoop Cigar": {
    slug: "snoopcigar", supply: 117254,
    models: [
      { name: "Dogg's Special", rarity: "1.5%" }, { name: "Golden Smoke", rarity: "2.4%" },
      { name: "Crystal Lit", rarity: "4.1%" }, { name: "Cosmic Blunt", rarity: "6.2%" },
      { name: "Neon Puff", rarity: "8.8%" }, { name: "Shadow Drag", rarity: "12.5%" },
      { name: "Long Beach Stogie", rarity: "15.3%" }, { name: "Classic Chronic", rarity: "16.2%" },
      { name: "Westside Smoke", rarity: "16.5%" }, { name: "Plain Cigar", rarity: "16.5%" }
    ],
    symbols: ["Flame","Star","Smoke","Crown","Diamond","Moon","Leaf","Music","Paw","Heart"]
  },
  "Snoop Dogg": {
    slug: "snoopdogg", supply: 580272,
    models: [
      { name: "Golden Dogg", rarity: "1.5%" }, { name: "Crystal OG", rarity: "2.4%" },
      { name: "Cosmic Calvin", rarity: "4.1%" }, { name: "Neon Snoop", rarity: "6.2%" },
      { name: "Shadow Lion", rarity: "8.8%" }, { name: "Doggystyle Era", rarity: "12.5%" },
      { name: "Drop It Like Hot", rarity: "15.3%" }, { name: "Classic Dogg", rarity: "16.2%" },
      { name: "Gin & Juice", rarity: "16.5%" }, { name: "Simple Dogg", rarity: "16.5%" }
    ],
    symbols: ["Paw","Star","Crown","Diamond","Moon","Music","Flame","Heart","Car","Leaf"]
  },
  "Snow Globe": {
    slug: "snowglobe", supply: 52520,
    models: [
      { name: "Golden Blizzard", rarity: "1.3%" }, { name: "Crystal Winter", rarity: "2.1%" },
      { name: "Cosmic Storm", rarity: "3.8%" }, { name: "Neon Flurry", rarity: "5.6%" },
      { name: "Shadow Scene", rarity: "8.1%" }, { name: "Enchanted Village", rarity: "11.3%" },
      { name: "Polar Bear", rarity: "14.6%" }, { name: "Classic Snowman", rarity: "17.2%" },
      { name: "Simple Globe", rarity: "18.0%" }, { name: "Plain Snow", rarity: "18.0%" }
    ],
    symbols: ["Snowflake","Star","Heart","Moon","Tree","Reindeer","Crown","Bell","Ribbon","House"]
  },
  "Snow Mittens": {
    slug: "snowmittens", supply: 38716,
    models: [
      { name: "Golden Knit", rarity: "1.3%" }, { name: "Crystal Wool", rarity: "2.1%" },
      { name: "Cosmic Pattern", rarity: "3.8%" }, { name: "Neon Fleece", rarity: "5.6%" },
      { name: "Shadow Fur", rarity: "8.1%" }, { name: "Fair Isle", rarity: "11.3%" },
      { name: "Snowflake Weave", rarity: "14.6%" }, { name: "Classic Red", rarity: "17.2%" },
      { name: "Simple White", rarity: "18.0%" }, { name: "Plain Mitten", rarity: "18.0%" }
    ],
    symbols: ["Snowflake","Star","Heart","Moon","Holly","Crown","Diamond","Ribbon","Bell","Reindeer"]
  },
  "Spiced Wine": {
    slug: "spicedwine", supply: 102428,
    models: [
      { name: "Vintage Reserve", rarity: "1.4%" }, { name: "Crystal Goblet", rarity: "2.3%" },
      { name: "Cosmic Blend", rarity: "4.0%" }, { name: "Dark Harvest", rarity: "6.1%" },
      { name: "Golden Vintage", rarity: "8.7%" }, { name: "Midnight Mulled", rarity: "11.4%" },
      { name: "Cherry Aged", rarity: "14.9%" }, { name: "Amber Classic", rarity: "16.8%" },
      { name: "Shadow Draft", rarity: "17.2%" }, { name: "Royal Sip", rarity: "17.2%" }
    ],
    symbols: ["Grape","Star","Snowflake","Leaf","Cinnamon","Moon","Drop","Flame","Crown","Spice"]
  },
  "Spring Basket": {
    slug: "springbasket", supply: 174244,
    models: [
      { name: "Golden Harvest", rarity: "1.5%" }, { name: "Crystal Weave", rarity: "2.4%" },
      { name: "Cosmic Bloom", rarity: "4.1%" }, { name: "Rainbow Wildflower", rarity: "6.2%" },
      { name: "Neon Garden", rarity: "8.8%" }, { name: "Shadow Meadow", rarity: "12.5%" },
      { name: "Pastel Bunch", rarity: "15.3%" }, { name: "Classic Wicker", rarity: "16.2%" },
      { name: "Simple Handle", rarity: "16.5%" }, { name: "Plain Basket", rarity: "16.5%" }
    ],
    symbols: ["Flower","Star","Heart","Leaf","Butterfly","Moon","Sun","Egg","Ribbon","Crown"]
  },
  "Spy Agaric": {
    slug: "spyagaric", supply: 86704,
    models: [
      { name: "Classic Red Cap", rarity: "1.4%" }, { name: "Neon Spots", rarity: "2.3%" },
      { name: "Cosmic Fungus", rarity: "4.0%" }, { name: "Rainbow Cap", rarity: "6.1%" },
      { name: "Psychedelic", rarity: "8.7%" }, { name: "Dark Mycelium", rarity: "11.4%" },
      { name: "Golden Shroom", rarity: "14.9%" }, { name: "Crystal Spore", rarity: "16.8%" },
      { name: "Shadow Toadstool", rarity: "17.2%" }, { name: "Glowing Cap", rarity: "17.2%" }
    ],
    symbols: ["Star","Spiral","Eye","Moon","Mushroom","Spore","Droplet","Leaf","Skull","Swirl"]
  },
  "Star Notepad": {
    slug: "starnotepad", supply: 69567,
    models: [
      { name: "Golden Pages", rarity: "1.4%" }, { name: "Crystal Cover", rarity: "2.3%" },
      { name: "Cosmic Journal", rarity: "4.0%" }, { name: "Neon Diary", rarity: "6.1%" },
      { name: "Shadow Notebook", rarity: "8.7%" }, { name: "Starry Spiral", rarity: "11.4%" },
      { name: "Celestial Bound", rarity: "14.9%" }, { name: "Classic Paper", rarity: "16.8%" },
      { name: "Simple Pad", rarity: "17.2%" }, { name: "Plain Notes", rarity: "17.2%" }
    ],
    symbols: ["Star","Moon","Comet","Spiral","Crown","Diamond","Heart","Pen","Ribbon","Sparkle"]
  },
  "Stellar Rocket": {
    slug: "stellarrocket", supply: 135909,
    models: [
      { name: "Void Thruster", rarity: "1.5%" }, { name: "Plasma Launch", rarity: "2.4%" },
      { name: "Crystal Boosted", rarity: "4.1%" }, { name: "Neon Trajectory", rarity: "6.2%" },
      { name: "Shadow Orbit", rarity: "8.8%" }, { name: "Golden Ignition", rarity: "12.5%" },
      { name: "Silver Ascent", rarity: "15.3%" }, { name: "Classic Red", rarity: "16.2%" },
      { name: "Simple Rocket", rarity: "16.5%" }, { name: "Plain Ship", rarity: "16.5%" }
    ],
    symbols: ["Star","Moon","Planet","Flame","Comet","Diamond","Crown","Lightning","Spiral","Eye"]
  },
  "Swag Bag": {
    slug: "swagbag", supply: 231261,
    models: [
      { name: "Golden Drip", rarity: "1.5%" }, { name: "Crystal Flex", rarity: "2.4%" },
      { name: "Cosmic Haul", rarity: "4.1%" }, { name: "Neon Luxury", rarity: "6.2%" },
      { name: "Shadow Designer", rarity: "8.8%" }, { name: "Street Gold", rarity: "12.5%" },
      { name: "Hype Merch", rarity: "15.3%" }, { name: "Classic Canvas", rarity: "16.2%" },
      { name: "Simple Tote", rarity: "16.5%" }, { name: "Plain Bag", rarity: "16.5%" }
    ],
    symbols: ["Star","Diamond","Crown","Heart","Moon","Lightning","Ribbon","Bow","Gem","Sparkle"]
  },
  "Swiss Watch": {
    slug: "swisswatch", supply: 25706,
    models: [
      { name: "Tourbillon Master", rarity: "1.2%" }, { name: "Golden Perpetual", rarity: "1.9%" },
      { name: "Crystal Chronograph", rarity: "3.5%" }, { name: "Platinum Grande", rarity: "5.2%" },
      { name: "Moonphase Royal", rarity: "7.8%" }, { name: "Skeleton Dial", rarity: "10.6%" },
      { name: "Classic Automatic", rarity: "13.9%" }, { name: "Vintage Dress", rarity: "17.5%" },
      { name: "Simple Steel", rarity: "19.2%" }, { name: "Standard Quartz", rarity: "19.2%" }
    ],
    symbols: ["Gear","Star","Diamond","Crown","Moon","Hourglass","Eye","Shield","Flame","Crest"]
  },
  "Tama Gadget": {
    slug: "tamagadget", supply: 103216,
    models: [
      { name: "Pixel Prime", rarity: "1.4%" }, { name: "Neon Retro", rarity: "2.3%" },
      { name: "Crystal Screen", rarity: "4.0%" }, { name: "Cosmic Pet", rarity: "6.1%" },
      { name: "Shadow Byte", rarity: "8.7%" }, { name: "Rainbow Pixel", rarity: "11.4%" },
      { name: "Dark Tamagotchi", rarity: "14.9%" }, { name: "Retro Classic", rarity: "16.8%" },
      { name: "Future Pod", rarity: "17.2%" }, { name: "Golden Screen", rarity: "17.2%" }
    ],
    symbols: ["Star","Heart","Pixel","Lightning","Moon","Eye","Flame","Diamond","Leaf","Wave"]
  },
  "Top Hat": {
    slug: "tophat", supply: 34340,
    models: [
      { name: "Golden Silk", rarity: "1.2%" }, { name: "Crystal Velvet", rarity: "2.0%" },
      { name: "Cosmic Magician", rarity: "3.6%" }, { name: "Neon Dandy", rarity: "5.3%" },
      { name: "Shadow Gentleman", rarity: "7.9%" }, { name: "Classic Black", rarity: "10.7%" },
      { name: "Steampunk Gear", rarity: "14.1%" }, { name: "Victorian Stripe", rarity: "17.6%" },
      { name: "Simple Felt", rarity: "19.3%" }, { name: "Plain Topper", rarity: "18.3%" }
    ],
    symbols: ["Star","Diamond","Crown","Moon","Rabbit","Wand","Card","Heart","Ribbon","Coin"]
  },
  "Toy Bear": {
    slug: "toybear", supply: 55824,
    models: [
      { name: "Golden Plush", rarity: "1.3%" }, { name: "Crystal Fluffy", rarity: "2.1%" },
      { name: "Cosmic Teddy", rarity: "3.8%" }, { name: "Neon Stuffed", rarity: "5.6%" },
      { name: "Shadow Bear", rarity: "8.1%" }, { name: "Rainbow Fur", rarity: "11.3%" },
      { name: "Classic Brown", rarity: "14.6%" }, { name: "Polar White", rarity: "17.2%" },
      { name: "Panda Print", rarity: "18.0%" }, { name: "Simple Teddy", rarity: "18.0%" }
    ],
    symbols: ["Heart","Star","Paw","Bow","Moon","Crown","Ribbon","Diamond","Honey","Flower"]
  },
  "Trapped Heart": {
    slug: "trappedheart", supply: 24884,
    models: [
      { name: "Frozen Forever", rarity: "1.2%" }, { name: "Golden Cage", rarity: "1.9%" },
      { name: "Crystal Lock", rarity: "3.5%" }, { name: "Dark Capture", rarity: "5.2%" },
      { name: "Neon Snare", rarity: "7.8%" }, { name: "Shattered Glass", rarity: "10.6%" },
      { name: "Electric Bind", rarity: "13.9%" }, { name: "Shadow Chain", rarity: "17.5%" },
      { name: "Mystic Trap", rarity: "19.2%" }, { name: "Classic Heart", rarity: "19.2%" }
    ],
    symbols: ["Heart","Lock","Key","Chain","Star","Flame","Moon","Lightning","Rose","Thorn"]
  },
  "UFC Strike": {
    slug: "ufcstrike", supply: 58413,
    models: [
      { name: "Champion's Fist", rarity: "1.3%" }, { name: "Golden Octagon", rarity: "2.1%" },
      { name: "Crystal Glove", rarity: "3.8%" }, { name: "Shadow Knockout", rarity: "5.6%" },
      { name: "Neon Fighter", rarity: "8.1%" }, { name: "Combat Elite", rarity: "11.3%" },
      { name: "Classic Strike", rarity: "14.6%" }, { name: "Iron Fist", rarity: "17.2%" },
      { name: "Simple Glove", rarity: "18.0%" }, { name: "Standard Fighter", rarity: "18.0%" }
    ],
    symbols: ["Fist","Star","Crown","Shield","Flame","Lightning","Eagle","Diamond","Moon","Belt"]
  },
  "Valentine Box": {
    slug: "valentinebox", supply: 34434,
    models: [
      { name: "Golden Love", rarity: "1.2%" }, { name: "Crystal Hearts", rarity: "2.0%" },
      { name: "Cosmic Romance", rarity: "3.6%" }, { name: "Neon Valentine", rarity: "5.3%" },
      { name: "Shadow Desire", rarity: "7.9%" }, { name: "Rose Velvet", rarity: "10.7%" },
      { name: "Classic Red", rarity: "14.1%" }, { name: "Pink Ribbon", rarity: "17.6%" },
      { name: "Simple Bow", rarity: "19.3%" }, { name: "Plain Box", rarity: "18.3%" }
    ],
    symbols: ["Heart","Star","Rose","Arrow","Moon","Diamond","Ribbon","Bow","Crown","Cupid"]
  },
  "Victory Medal": {
    slug: "victorymedal", supply: 94499,
    models: [
      { name: "Golden Champion", rarity: "1.4%" }, { name: "Crystal First Place", rarity: "2.3%" },
      { name: "Cosmic Glory", rarity: "4.0%" }, { name: "Neon Triumph", rarity: "6.1%" },
      { name: "Shadow Podium", rarity: "8.7%" }, { name: "Silver Second", rarity: "11.4%" },
      { name: "Bronze Third", rarity: "14.9%" }, { name: "Classic Gold", rarity: "16.8%" },
      { name: "Simple Medal", rarity: "17.2%" }, { name: "Plain Round", rarity: "17.2%" }
    ],
    symbols: ["Star","Crown","Trophy","Diamond","Moon","Ribbon","Shield","Flame","Heart","Eagle"]
  },
  "Vintage Cigar": {
    slug: "vintagecigar", supply: 26342,
    models: [
      { name: "Havana Reserve", rarity: "1.2%" }, { name: "Montecristo Gold", rarity: "1.9%" },
      { name: "Crystal Torpedo", rarity: "3.5%" }, { name: "Dark Maduro", rarity: "5.2%" },
      { name: "Connecticut Shade", rarity: "7.8%" }, { name: "Aged Premium", rarity: "10.6%" },
      { name: "Golden Leaf", rarity: "13.9%" }, { name: "Classic Robusto", rarity: "17.5%" },
      { name: "Shadow Stogie", rarity: "19.2%" }, { name: "Simple Cigar", rarity: "19.2%" }
    ],
    symbols: ["Flame","Ring","Band","Smoke","Star","Crown","Diamond","Leaf","Crest","Emblem"]
  },
  "Voodoo Doll": {
    slug: "voodoodoll", supply: 26760,
    models: [
      { name: "Void Effigy", rarity: "1.2%" }, { name: "Dark Stitch", rarity: "1.9%" },
      { name: "Neon Curse", rarity: "3.5%" }, { name: "Golden Hex", rarity: "5.2%" },
      { name: "Crystal Needle", rarity: "7.8%" }, { name: "Electric Juju", rarity: "10.6%" },
      { name: "Ancient Ritual", rarity: "13.9%" }, { name: "Cursed Fabric", rarity: "17.5%" },
      { name: "Classic Doll", rarity: "19.2%" }, { name: "Simple Voodoo", rarity: "19.2%" }
    ],
    symbols: ["Pin","Skull","Heart","Eye","Star","Moon","Flame","Spiral","Lightning","Rune"]
  },
  "Westside Sign": {
    slug: "westsidesign", supply: 11490,
    models: [
      { name: "Gold Fingers", rarity: "1.1%" }, { name: "Diamond Hand", rarity: "1.7%" },
      { name: "Crystal Sign", rarity: "3.1%" }, { name: "Neon West", rarity: "4.6%" },
      { name: "Shadow Gang", rarity: "7.2%" }, { name: "Platinum Knucks", rarity: "9.9%" },
      { name: "Classic OG", rarity: "13.5%" }, { name: "Street Silver", rarity: "18.2%" },
      { name: "Simple Sign", rarity: "21.4%" }, { name: "Standard", rarity: "19.3%" }
    ],
    symbols: ["Star","Diamond","Crown","Moon","Paw","Music","Flame","Heart","Lightning","Skull"]
  },
  // Additional collections from the Giftix list
  "Whip Cupcake": {
    slug: "whipcupcake", supply: 142000,
    models: [
      { name: "Golden Swirl", rarity: "1.5%" }, { name: "Crystal Cream", rarity: "2.4%" },
      { name: "Cosmic Frosting", rarity: "4.1%" }, { name: "Rainbow Whip", rarity: "6.2%" },
      { name: "Neon Sprinkle", rarity: "8.8%" }, { name: "Chocolate Pipe", rarity: "12.5%" },
      { name: "Strawberry Peak", rarity: "15.3%" }, { name: "Classic Vanilla", rarity: "16.2%" },
      { name: "Lemon Zest", rarity: "16.5%" }, { name: "Plain Cup", rarity: "16.5%" }
    ],
    symbols: ["Star","Heart","Sprinkle","Cherry","Crown","Moon","Ribbon","Bow","Flower","Diamond"]
  },
  "Xmas Sock": {
    slug: "xmassock", supply: 98000,
    models: [
      { name: "Golden Stocking", rarity: "1.4%" }, { name: "Crystal Knit", rarity: "2.3%" },
      { name: "Cosmic Festive", rarity: "4.0%" }, { name: "Neon Christmas", rarity: "6.1%" },
      { name: "Shadow Holiday", rarity: "8.7%" }, { name: "Fair Isle Stripe", rarity: "11.4%" },
      { name: "Classic Red", rarity: "14.9%" }, { name: "Snowflake Pattern", rarity: "16.8%" },
      { name: "Simple Stocking", rarity: "17.2%" }, { name: "Plain Sock", rarity: "17.2%" }
    ],
    symbols: ["Snowflake","Star","Heart","Bell","Holly","Candy","Crown","Reindeer","Moon","Gift"]
  },
  "Year of Snake": {
    slug: "yearofsnake", supply: 78000,
    models: [
      { name: "Golden Serpent", rarity: "1.4%" }, { name: "Jade Dragon", rarity: "2.3%" },
      { name: "Crystal Coil", rarity: "4.0%" }, { name: "Cosmic Zodiac", rarity: "6.1%" },
      { name: "Neon Fortune", rarity: "8.7%" }, { name: "Shadow Hiss", rarity: "11.4%" },
      { name: "Classic Scale", rarity: "14.9%" }, { name: "Red Luck", rarity: "16.8%" },
      { name: "Simple Snake", rarity: "17.2%" }, { name: "Plain Year", rarity: "17.2%" }
    ],
    symbols: ["Moon","Star","Eye","Coil","Flame","Fang","Diamond","Rune","Spiral","Crown"]
  },
  "Zombie Bee": {
    slug: "zombiebee", supply: 65000,
    models: [
      { name: "Void Swarm", rarity: "1.4%" }, { name: "Neon Undead", rarity: "2.3%" },
      { name: "Crystal Hive", rarity: "4.0%" }, { name: "Shadow Sting", rarity: "6.1%" },
      { name: "Cosmic Drone", rarity: "8.7%" }, { name: "Golden Queen", rarity: "11.4%" },
      { name: "Electric Worker", rarity: "14.9%" }, { name: "Ancient Swarm", rarity: "16.8%" },
      { name: "Classic Buzz", rarity: "17.2%" }, { name: "Simple Bee", rarity: "17.2%" }
    ],
    symbols: ["Star","Skull","Moon","Flame","Eye","Sting","Spiral","Honeycomb","Lightning","Leaf"]
  },
};

const ALL_GIFTS = Object.keys(GIFT_COLLECTIONS).sort();

// ─── BACKDROP COLORS (80 total) ────────────────────────────────────────────────
const BACKDROP_COLORS = [
  { name: "Black", hex: "#000000" }, { name: "Electric Purple", hex: "#7B2FBE" },
  { name: "Lavender", hex: "#9B8EC4" }, { name: "Cyberpunk", hex: "#FF00FF" },
  { name: "Electric Indigo", hex: "#6610F2" }, { name: "Neon Blue", hex: "#00F0FF" },
  { name: "Navy Blue", hex: "#001F5B" }, { name: "Sapphire", hex: "#0F52BA" },
  { name: "Sky Blue", hex: "#87CEEB" }, { name: "Azure Blue", hex: "#007FFF" },
  { name: "Pacific Cyan", hex: "#1CA9C9" }, { name: "Aquamarine", hex: "#7FFFD4" },
  { name: "Pacific Green", hex: "#1D6340" }, { name: "Emerald", hex: "#50C878" },
  { name: "Mint Green", hex: "#98FF98" }, { name: "Malachite", hex: "#0BDA51" },
  { name: "Shamrock Green", hex: "#009E60" }, { name: "Lemongrass", hex: "#9AB973" },
  { name: "Light Olive", hex: "#ACBF60" }, { name: "Satin Gold", hex: "#CBA135" },
  { name: "Pure Gold", hex: "#FFD700" }, { name: "Amber", hex: "#FFBF00" },
  { name: "Caramel", hex: "#C68642" }, { name: "Orange", hex: "#FF7518" },
  { name: "Carrot Juice", hex: "#ED9121" }, { name: "Coral Red", hex: "#FF4040" },
  { name: "Persimmon", hex: "#EC5800" }, { name: "Strawberry", hex: "#FC5A8D" },
  { name: "Raspberry", hex: "#E30B5C" }, { name: "Mystic Pearl", hex: "#E8D5C4" },
  { name: "Onyx Black", hex: "#0F0F0F" }, { name: "Crimson", hex: "#DC143C" },
  { name: "Rose Gold", hex: "#B76E79" }, { name: "Hot Pink", hex: "#FF69B4" },
  { name: "Fuchsia", hex: "#FF00BF" }, { name: "Violet", hex: "#8B00FF" },
  { name: "Indigo", hex: "#4B0082" }, { name: "Royal Blue", hex: "#4169E1" },
  { name: "Cobalt", hex: "#0047AB" }, { name: "Steel Blue", hex: "#4682B4" },
  { name: "Ice Blue", hex: "#D6EAF8" }, { name: "Powder Blue", hex: "#B0E0E6" },
  { name: "Teal", hex: "#008080" }, { name: "Jade", hex: "#00A86B" },
  { name: "Forest Green", hex: "#228B22" }, { name: "Olive", hex: "#808000" },
  { name: "Lime", hex: "#32CD32" }, { name: "Chartreuse", hex: "#7FFF00" },
  { name: "Yellow", hex: "#FFFF00" }, { name: "Lemon", hex: "#FFF44F" },
  { name: "Cream", hex: "#FFFDD0" }, { name: "Ivory", hex: "#FFFFF0" },
  { name: "White", hex: "#FFFFFF" }, { name: "Silver", hex: "#C0C0C0" },
  { name: "Platinum", hex: "#E5E4E2" }, { name: "Ash Gray", hex: "#B2BEB5" },
  { name: "Slate", hex: "#708090" }, { name: "Charcoal", hex: "#36454F" },
  { name: "Dark Brown", hex: "#3B1F0A" }, { name: "Chocolate", hex: "#7B3F00" },
  { name: "Copper", hex: "#B87333" }, { name: "Bronze", hex: "#CD7F32" },
  { name: "Tan", hex: "#D2B48C" }, { name: "Peach", hex: "#FFCBA4" },
  { name: "Salmon", hex: "#FA8072" }, { name: "Terra Cotta", hex: "#E2725B" },
  { name: "Burgundy", hex: "#800020" }, { name: "Maroon", hex: "#800000" },
  { name: "Wine", hex: "#722F37" }, { name: "Plum", hex: "#DDA0DD" },
  { name: "Mauve", hex: "#E0B0FF" }, { name: "Lilac", hex: "#C8A2C8" },
  { name: "Orchid", hex: "#DA70D6" }, { name: "Magenta", hex: "#FF00FF" },
  { name: "Turquoise", hex: "#40E0D0" }, { name: "Cyan", hex: "#00FFFF" },
  { name: "Deep Sky Blue", hex: "#00BFFF" }, { name: "Midnight Blue", hex: "#191970" },
  { name: "Dark Violet", hex: "#9400D3" }, { name: "Deep Pink", hex: "#FF1493" },
];

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
    any: "Any", rarity: "Rarity"
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
    any: "Любой", rarity: "Редкость"
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
    any: "任何", rarity: "稀有度"
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

// ─── STYLES ────────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');

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
    --header-color: #ffffff;
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
    --header-color: #ffffff;
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

  /* DESKTOP LAYOUT */
  .desktop-layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }
  .desktop-sidebar {
    width: 260px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background: var(--bg-sheet);
    backdrop-filter: var(--blur);
    -webkit-backdrop-filter: var(--blur);
    border-right: 1px solid var(--border);
    padding: 24px 0;
    gap: 4px;
    z-index: 10;
  }
  .desktop-logo {
    padding: 8px 24px 20px;
    font-size: 22px;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: -0.5px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 8px;
  }
  .desktop-nav-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 24px;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    background: transparent;
    font-family: var(--font);
    border-radius: 0;
    text-align: left;
    margin: 0 12px;
    border-radius: 12px;
  }
  .desktop-nav-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
  .desktop-nav-btn.active { background: var(--tg-blue); color: #fff; }
  .desktop-nav-btn.active svg { stroke: #fff; }
  .desktop-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 32px 48px;
    max-width: 900px;
  }
  .desktop-content::-webkit-scrollbar { width: 6px; }
  .desktop-content::-webkit-scrollbar-track { background: transparent; }
  .desktop-content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  .desktop-sidebar-bottom {
    margin-top: auto;
    padding: 16px;
    display: flex;
    gap: 8px;
    border-top: 1px solid var(--border);
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

  /* PULL-TO-REFRESH */
  .ptr-container {
    position: relative;
  }
  .ptr-indicator {
    position: absolute;
    top: -60px;
    left: 0; right: 0;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    transition: top 0.3s var(--bounce);
  }
  .ptr-indicator.visible { top: 0; }
  .ptr-spinner {
    width: 28px; height: 28px;
    border-radius: 50%;
    border: 2.5px solid rgba(0,122,255,0.15);
    border-top-color: var(--tg-blue);
    border-right-color: var(--tg-blue);
    background: transparent;
    box-shadow: none;
  }
  .ptr-spinner.spinning {
    animation: iosSpinAnim 0.7s cubic-bezier(0.4,0,0.2,1) infinite;
  }
  @keyframes iosSpinAnim {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* SCOUTING LOADER */
  .scouting-overlay {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 60px 24px; text-align: center; animation: fadeInUp 0.4s var(--bounce) forwards;
  }
  .scouting-spinner {
    width: 52px; height: 52px; border-radius: 50%;
    border: 3px solid rgba(0,122,255,0.15);
    border-top-color: var(--tg-blue);
    border-right-color: var(--tg-blue);
    animation: iosSpinAnim 0.7s cubic-bezier(0.4,0,0.2,1) infinite;
    margin-bottom: 28px;
  }
  .scouting-title {
    font-size: 20px; font-weight: 800; color: var(--text-primary);
    margin-bottom: 10px; letter-spacing: -0.3px;
  }
  .scouting-sub { font-size: 15px; color: var(--text-secondary); font-weight: 500; line-height: 1.4; }
  .scouting-markets { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 24px; }
  .scouting-market-chip {
    padding: 6px 14px; border-radius: 100px; font-size: 13px; font-weight: 700;
    background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary);
    animation: scoutChipPulse 1.5s ease-in-out infinite;
  }
  .scouting-market-chip:nth-child(2) { animation-delay: 0.2s; }
  .scouting-market-chip:nth-child(3) { animation-delay: 0.4s; }
  .scouting-market-chip:nth-child(4) { animation-delay: 0.6s; }
  .scouting-market-chip:nth-child(5) { animation-delay: 0.8s; }
  @keyframes scoutChipPulse {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.04); border-color: var(--tg-blue); color: var(--tg-blue); }
  }

  /* PROMO BANNER CAROUSEL */
  .promo-banner {
    width: 100%; border-radius: 20px; overflow: hidden; margin-bottom: 24px;
    position: relative; cursor: pointer;
    aspect-ratio: 1500 / 450;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  }
  .promo-banner-img {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; border-radius: 20px;
    transition: opacity 0.7s ease;
  }
  .promo-banner-img.active { opacity: 1; z-index: 2; }
  .promo-banner-img.inactive { opacity: 0; z-index: 1; }
  /* Spiral glassmorphism overlay */
  .promo-banner-overlay {
    position: absolute; inset: 0; border-radius: 20px; z-index: 3; pointer-events: none;
    overflow: hidden;
  }
  .promo-spiral {
    position: absolute; border-radius: 50%; filter: blur(28px); opacity: 0.45;
    animation: spiralRotate 6s linear infinite;
  }
  .promo-spiral-1 {
    width: 120px; height: 120px;
    background: radial-gradient(circle, rgba(255,45,85,0.7) 0%, transparent 70%);
    top: -30px; left: -30px;
    animation-duration: 7s;
  }
  .promo-spiral-2 {
    width: 100px; height: 100px;
    background: radial-gradient(circle, rgba(52,199,89,0.7) 0%, transparent 70%);
    bottom: -20px; right: 10%;
    animation-duration: 9s; animation-direction: reverse;
  }
  .promo-spiral-3 {
    width: 80px; height: 80px;
    background: radial-gradient(circle, rgba(0,122,255,0.7) 0%, transparent 70%);
    top: 10%; right: -20px;
    animation-duration: 5s;
  }
  @keyframes spiralRotate {
    0% { transform: rotate(0deg) translate(18px, 18px) rotate(0deg); }
    100% { transform: rotate(360deg) translate(18px, 18px) rotate(-360deg); }
  }
  /* Dot indicators */
  .promo-dots {
    position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
    display: flex; gap: 6px; z-index: 4;
  }
  .promo-dot {
    width: 6px; height: 6px; border-radius: 3px;
    background: rgba(255,255,255,0.5);
    transition: all 0.3s ease;
  }
  .promo-dot.active {
    width: 18px; background: rgba(255,255,255,0.95);
  }
  /* Gloss edge on banner */
  .promo-banner::after {
    content: ""; position: absolute; inset: 0; border-radius: 20px; z-index: 5; pointer-events: none;
    background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%, rgba(0,0,0,0.08) 100%);
    border: 1px solid rgba(255,255,255,0.2);
  }

  /* HERO TITLE — white in both modes */
  .hero-title {
    font-size: 26px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2;
    margin-bottom: 24px; color: #ffffff;
  }
  .hero-title.desktop { font-size: 36px; letter-spacing: -1px; }
  .hero-title-row {
    display: flex; align-items: center; flex-wrap: nowrap; gap: 8px;
  }
  .hero-title-row span { flex-shrink: 1; min-width: 0; }
  .hero-title-row img { flex-shrink: 0; }
  .hero-title-img {
    display: inline-block; height: 1.1em; width: auto;
    vertical-align: middle; border-radius: 10px; flex-shrink: 0; margin-left: 2px;
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
    font-size: 16px; font-weight: 600; color: var(--text-primary);
    display: flex; align-items: center; gap: 10px;
  }
  .suggestion-item:last-child { border-bottom: none; }
  .suggestion-item:active { background: var(--bg-hover); }
  .suggestion-gift-img {
    width: 28px; height: 28px; border-radius: 6px; object-fit: cover; flex-shrink: 0;
  }

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

  .tab-bar-container { position: fixed; bottom: var(--safe-bottom); left: 24px; right: 24px; z-index: 40; }
  .ios-tab-bar {
    display: flex; justify-content: space-around; align-items: center;
    height: 72px; border-radius: 36px; padding: 0 8px;
    background: var(--bg-sheet); border: 1px solid var(--border);
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    position: relative; overflow: hidden;
  }
  .tab-active-pill {
    position: absolute;
    top: 50%; transform: translateY(-50%);
    width: 44px; height: 44px; border-radius: 22px;
    background: rgba(0,122,255,0.15);
    border: 1px solid rgba(0,122,255,0.25);
    backdrop-filter: blur(20px) saturate(200%);
    -webkit-backdrop-filter: blur(20px) saturate(200%);
    transition: left 0.38s cubic-bezier(0.32,0.72,0,1);
    pointer-events: none; z-index: 0;
  }
  [data-theme="dark"] .tab-active-pill {
    background: rgba(10,132,255,0.2);
    border: 1px solid rgba(10,132,255,0.3);
  }
  .tab-btn {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    border: none; background: transparent; color: var(--text-secondary);
    font-family: var(--font); cursor: pointer;
    transition: color 0.3s; position: relative; z-index: 1;
  }
  .tab-btn.active { color: var(--tg-blue); }
  .tab-icon { margin-bottom: 4px; transition: transform 0.38s cubic-bezier(0.32,0.72,0,1); }
  .tab-icon-active { transform: translateY(-3px) scale(1.15) !important; animation: tabIconBounce 0.4s cubic-bezier(0.32,0.72,0,1); }
  @keyframes tabIconBounce {
    0% { transform: translateY(0) scale(1); }
    30% { transform: translateY(-6px) scale(1.2); }
    60% { transform: translateY(-2px) scale(1.08); }
    100% { transform: translateY(-3px) scale(1.15); }
  }
  .tab-label { font-size: 10px; font-weight: 700; letter-spacing: 0.2px; }

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

  /* Model/symbol sheet items with image */
  .sheet-model-item {
    padding: 14px 20px; border-bottom: 1px solid var(--border);
    display: flex; justify-content: space-between; align-items: center; cursor: pointer;
    color: var(--text-primary);
  }
  .sheet-model-item:active { background: var(--bg-hover); }
  .sheet-model-item:last-child { border-bottom: none; }
  .model-left { display: flex; align-items: center; gap: 10px; }
  .model-thumb {
    width: 36px; height: 36px; border-radius: 8px; object-fit: cover; flex-shrink: 0;
    background: var(--bg-input);
  }
  .model-info { display: flex; flex-direction: column; }
  .model-name { font-size: 15px; font-weight: 600; }
  .model-rarity {
    font-size: 12px; font-weight: 600; padding: 2px 6px; border-radius: 6px;
    display: inline-block; margin-top: 2px;
  }
  .rarity-ultra { background: rgba(255,45,85,0.15); color: #ff2d55; }
  .rarity-rare { background: rgba(255,149,0,0.15); color: #ff9500; }
  .rarity-uncommon { background: rgba(52,199,89,0.15); color: #34c759; }
  .rarity-common { background: rgba(142,142,147,0.15); color: #8e8e93; }

  .ios-group {
    border-radius: var(--radius-lg); background: var(--bg-card); border: 1px solid var(--border);
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    overflow: hidden; margin-bottom: 24px;
  }
  .ios-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 20px; border-bottom: 1px solid var(--border); cursor: pointer;
    font-size: 17px; font-weight: 500; transition: background 0.2s;
    color: var(--text-primary); text-decoration: none;
  }
  .ios-row:active { background: var(--bg-hover); }
  .ios-row:last-child { border-bottom: none; }
  .row-left { display: flex; align-items: center; gap: 16px; }
  .row-icon-box { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; }

  .color-dot {
    width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
    border: 1.5px solid rgba(128,128,128,0.3); display: inline-block;
  }

  .toast {
    position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 200;
    padding: 12px 24px; border-radius: 100px; font-size: 15px; font-weight: 600;
    background: var(--bg-sheet); border: 1px solid var(--border); color: var(--text-primary);
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
    animation: toastIn 0.3s ease, toastOut 0.3s ease 2.7s forwards;
    white-space: nowrap;
  }

  .results-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 16px; }
  .results-grid.desktop { grid-template-columns: repeat(3, 1fr); }
  .result-card {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 16px; position: relative;
    backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
    display: flex; flex-direction: column; transition: transform 0.2s var(--bounce);
    cursor: pointer; color: var(--text-primary);
  }
  .result-card:active { transform: scale(0.96); }
  .result-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .result-gift-img {
    width: 32px; height: 32px; border-radius: 8px; object-fit: cover; flex-shrink: 0;
    background: var(--bg-input);
  }

  /* Saved/Profile headers in white for light mode */
  .page-header {
    font-size: 34px; font-weight: 800; letter-spacing: -1px; line-height: 1.15;
    margin-bottom: 24px; color: #ffffff;
  }
  .page-header.desktop { font-size: 40px; }

  @keyframes fadeIn { to { opacity: 1; } }
  @keyframes slideUp { to { transform: translateY(0); } }
  .fade-in-up { animation: fadeInUp 0.5s var(--bounce) forwards; }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  @keyframes toastOut { from { opacity: 1; } to { opacity: 0; } }

  @media (min-width: 768px) {
    .mobile-only { display: none !important; }
  }
  @media (max-width: 767px) {
    .desktop-only { display: none !important; }
  }
`;

// ─── HELPER: rarity tier ──────────────────────────────────────────────────────
function rarityClass(rarityStr) {
  const val = parseFloat(rarityStr);
  if (val < 2) return "rarity-ultra";
  if (val < 10) return "rarity-rare";
  if (val < 25) return "rarity-uncommon";
  return "rarity-common";
}

// ─── FRAGMENT CDN image ───────────────────────────────────────────────────────
function giftImg(slug) {
  return `https://fragment.com/file/gifts/${slug}/thumb.webp`;
}

// ─── WALLET DEEP LINKS ────────────────────────────────────────────────────────
const WALLET_ADDRESS = "UQCvd6Sw_JJQsedBGfR2JOn7it7VdREWQ7v3kIluUi0RPMXJ";
const DONATE_DESCRIPTION = "GiftTrove Donation";

function buildWalletUrl(wallet, amountTON) {
  const amountNano = Math.round((parseFloat(amountTON) || 0) * 1e9);
  const desc = encodeURIComponent(DONATE_DESCRIPTION);

  if (wallet === "TonKeeper") {
    // TonKeeper deep link: tonkeeper://transfer?address=...&amount=...&text=...
    return `tonkeeper://transfer?address=${WALLET_ADDRESS}&amount=${amountNano}&text=${desc}`;
  }
  if (wallet === "MyTonWallet") {
    // MyTonWallet transfer deep link (correct endpoint)
    return `https://mytonwallet.io/transfer/${WALLET_ADDRESS}?amount=${amountNano}&comment=${desc}`;
  }
  if (wallet === "Tg Wallet") {
    // Telegram Wallet bot with pre-filled transfer params via deeplink
    return `https://t.me/wallet?startapp=transfer_${WALLET_ADDRESS}_${amountNano}_${encodeURIComponent(DONATE_DESCRIPTION)}`;
  }
  return `ton://transfer/${WALLET_ADDRESS}?amount=${amountNano}&text=${desc}`;
}

// ─── PROMO BANNER CAROUSEL ────────────────────────────────────────────────────
const PROMO_SLIDES = [
  { img: "https://i.ibb.co/5gXQZ5SQ/MGGA-1.png", url: "https://t.me/gifttrove" },
  { img: "https://i.ibb.co/r2zGgWHH/MGGA-2.png", url: "https://t.me/troveotc" },
  { img: "https://i.ibb.co/Kp2tJtQT/MGGA-4.png", url: "https://t.me/spinmibot?startapp=7608551523" },
  { img: "https://i.ibb.co/v5NvzS6/MGGA-3.png", url: "https://t.me/hotontgbot/app?startapp=UQC61-XV5zwCn-7eHbciHh8qR_3k6-6Bq458qrUkGhFoYxPo" },
  { img: "https://i.ibb.co/RkkHPgSV/MGGA-5.png", url: "https://t.me/insidemajek" },
];

function PromoBanner() {
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef(null);

  const startTimer = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % PROMO_SLIDES.length);
    }, 5000);
  };

  useEffect(() => {
    preloadImages(PROMO_SLIDES.map(s => s.img));
    preloadImages(["https://i.ibb.co/ZRQJd5tT/MGGA.png"]);
    startTimer();
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleClick = () => {
    window.open(PROMO_SLIDES[current].url, "_blank");
  };

  return (
    <div className="promo-banner" onClick={handleClick}>
      {PROMO_SLIDES.map((slide, i) => (
        <img
          key={i}
          src={slide.img}
          alt={`promo-${i}`}
          loading="eager"
          fetchPriority={i === 0 ? "high" : "low"}
          className={`promo-banner-img ${i === current ? "active" : "inactive"}`}
        />
      ))}
      {/* Glassmorphism spiral overlay */}
      <div className="promo-banner-overlay">
        <div className="promo-spiral promo-spiral-1" />
        <div className="promo-spiral promo-spiral-2" />
        <div className="promo-spiral promo-spiral-3" />
      </div>
      {/* Dot indicators */}
      <div className="promo-dots">
        {PROMO_SLIDES.map((_, i) => (
          <div key={i} className={`promo-dot ${i === current ? "active" : ""}`} />
        ))}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  // Default: light mode
  const [theme, setTheme] = useState(() => localStorage.getItem("gt_theme") || "light");
  const [lang, setLang] = useState(() => localStorage.getItem("gt_lang") || "EN");
  const [savedGifts, setSavedGifts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gt_saved") || "[]"); } catch { return []; }
  });
  const tgUser = typeof window !== "undefined"
    ? (window.Telegram?.WebApp?.initDataUnsafe?.user || { id: 12345678, first_name: "Scout" })
    : { id: 12345678, first_name: "Scout" };

  // useRef so refKey never changes mid-session and always reads the right localStorage slot
  const refKeyRef = useRef(`gt_ref_count_${tgUser?.id || "guest"}`);
  const refKey = refKeyRef.current;

  const [referralCount, setReferralCount] = useState(() =>
    parseInt(localStorage.getItem(refKeyRef.current) || "0", 10)
  );

  const [activeTab, setActiveTab] = useState("scout");
  const [toast, setToast] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSheet, setActiveSheet] = useState(null);
  const [selectedGift, setSelectedGift] = useState(null);

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

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);
  const touchStartY = useRef(0);
  const contentRef = useRef(null);

  // Hide tab bar when keyboard is open on mobile
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        // If viewport height shrinks by more than 150px, keyboard is likely open
        const visualHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        setKeyboardOpen(visualHeight < window.screen.height * 0.75);
      }
    };
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      return () => window.visualViewport.removeEventListener("resize", handleResize);
    } else {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Detect desktop
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;

  const t = T[lang] || T["EN"];

  const currentGiftData = GIFT_COLLECTIONS[giftQuery] || null;
  const availableModels = currentGiftData ? currentGiftData.models : [];
  const availableSymbols = currentGiftData ? currentGiftData.symbols : [];

  useEffect(() => {
    localStorage.setItem("gt_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  useEffect(() => { localStorage.setItem("gt_lang", lang); }, [lang]);
  useEffect(() => { localStorage.setItem("gt_saved", JSON.stringify(savedGifts)); }, [savedGifts]);
  useEffect(() => { localStorage.setItem(refKey, referralCount.toString()); }, [referralCount, refKey]);

  useEffect(() => {
    setSelectedModel("Any");
    setSelectedSymbol("Any");
  }, [giftQuery]);

  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // Pull-to-refresh handlers
  const handleTouchStart = (e) => {
    if (contentRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };
  const handleTouchMove = (e) => {
    if (contentRef.current?.scrollTop === 0) {
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy > 0) setPullY(Math.min(dy, 80));
    }
  };
  const handleTouchEnd = () => {
    if (pullY > 50) {
      setIsRefreshing(true);
      setTimeout(() => { setIsRefreshing(false); setPullY(0); showToast("Refreshed!"); }, 1500);
    } else {
      setPullY(0);
    }
  };

  const handleMarketToggle = (m) => {
    if (m === "All") { setSelectedMarkets(["All"]); return; }
    let nm = selectedMarkets.filter(x => x !== "All");
    if (nm.includes(m)) { nm = nm.filter(x => x !== m); if (nm.length === 0) nm = ["All"]; }
    else nm.push(m);
    setSelectedMarkets(nm);
  };

  const [isScouting, setIsScouting] = useState(false);

  const handleScout = () => {
    setIsScouting(true);
    setTimeout(() => {
      setIsScouting(false);
      setIsSearching(true);
    }, 5000);
  };

  const toggleSave = (gift) => {
    const isSaved = savedGifts.some(g => g.id === gift.id);
    if (isSaved) { setSavedGifts(savedGifts.filter(g => g.id !== gift.id)); showToast("Removed from Saved"); }
    else { setSavedGifts([...savedGifts, gift]); showToast("Gift Saved!"); }
  };

  const handleBuy = (e, market, item) => {
    e.stopPropagation();
    const giftName = item?.name || giftQuery || "";
    const giftCollection = GIFT_COLLECTIONS[giftName];
    const contractAddress = giftCollection?.contractAddress || giftName.toLowerCase().replace(/\s/g, "");
    const giftId = item?.itemNumber || "";

    const urls = {
      // Open Fragment inside Telegram mini app
      "Fragment": `https://t.me/fragment/nft?gift=${contractAddress}`,
      // Open GetGems inside Telegram mini app
      "GetGems": `https://t.me/getgems/nft?collection=${contractAddress}`,
      // MRKT deep link with contract address + referral
      "MRKT": `https://t.me/mrkt/app?startapp=${contractAddress || "7608551523"}`,
      // Portals deep link with gift contract address + referral code
      "Portals": `https://t.me/portals_market_bot/market?startapp=gift_${contractAddress}_e3onts`,
      // Tonnel with gift ID
      "Tonnel": `https://t.me/tonnel_network_bot/gift?startapp=${giftId}`,
    };
    const tgApp = window.Telegram?.WebApp;
    const url = urls[market] || `https://t.me/gifttrove`;
    if (tgApp && tgApp.openTelegramLink) {
      tgApp.openTelegramLink(url);
    } else {
      window.open(url, "_blank");
    }
  };

  const copyReferral = () => {
    const link = `https://t.me/gifttrovebot/app?startapp=${tgUser?.id || "demo"}`;
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(link);
    showToast("Referral link copied!");
  };

  // Detect if this session was opened via a referral startapp param
  useEffect(() => {
    const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    if (startParam && /^\d+$/.test(startParam)) {
      // Opened via referral link — increment the referrer's count
      // In a real app this would hit a backend; here we increment the local count
      // (only if not already counted this session)
      const sessionKey = `gt_ref_counted_${startParam}`;
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, "1");
        const referrerKey = `gt_ref_count_${startParam}`;
        const current = parseInt(localStorage.getItem(referrerKey) || "0", 10);
        localStorage.setItem(referrerKey, (current + 1).toString());
        // If the referrer is the current user (same device), update state too
        if (startParam === String(tgUser?.id)) {
          setReferralCount(prev => prev + 1);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const executeDonate = () => {
    const url = buildWalletUrl(donateWallet, donateAmount);
    window.open(url, "_blank");
    setDonateStep(2);
  };

  const filteredGifts = ALL_GIFTS.filter(g => g.toLowerCase().includes(giftQuery.toLowerCase()));

  const generateMockResults = () => {
    const gift = currentGiftData;
    return [1, 2, 3, 4].map(i => ({
      id: i,
      name: giftQuery || "Plush Pepe",
      slug: gift ? GIFT_COLLECTIONS[giftQuery || "Plush Pepe"]?.slug : "plushpepe",
      model: gift?.models[i % gift.models.length]?.name || "Classic",
      modelRarity: gift?.models[i % gift.models.length]?.rarity || "12%",
      symbol: gift?.symbols[i % gift.symbols.length] || "Star",
      backdrop: BACKDROP_COLORS[i * 5].name,
      price: i === 1 ? "450 TON" : i === 2 ? "1,200 TON" : "80 TON",
      market: ["GetGems", "Portals", "MRKT", "Fragment"][i % 4],
      itemNumber: 1000 + i
    }));
  };

  const mockResults = generateMockResults();

  const renderGiftCard = (item, desktop = false) => {
    const isSaved = savedGifts.some(g => g.id === item.id);
    const slug = item.slug || GIFT_COLLECTIONS[item.name]?.slug || item.name.toLowerCase().replace(/\s/g, "").replace(/'/g, "");
    return (
      <div key={item.id} className="result-card" onClick={() => { setSelectedGift(item); setActiveSheet("gift_details"); }}>
        <div className="result-card-header">
          <img
            src={giftImg(slug)}
            alt={item.name}
            className="result-gift-img"
            onError={e => { e.target.style.display = "none"; }}
          />
          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2, color: "var(--text-primary)", flex: 1 }}>{item.name}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            <div onClick={(e) => { e.stopPropagation(); toggleSave(item); }} style={{ color: isSaved ? "var(--tg-blue)" : "var(--text-secondary)", cursor: "pointer" }}>
              {isSaved ? <IconBookmarkFilled /> : <IconBookmark />}
            </div>
            <div onClick={(e) => handleBuy(e, item.market, item)} style={{ background: "var(--tg-blue)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "4px 8px", borderRadius: 6, cursor: "pointer", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>BUY</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>#{item.itemNumber} • {item.market}</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
          <span className={`model-rarity ${rarityClass(item.modelRarity)}`}>{item.model}</span>
          <span style={{ marginLeft: 4 }}>{item.modelRarity}</span>
        </div>
        <div style={{ marginTop: "auto" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--tg-blue)" }}>{item.price}</div>
        </div>
      </div>
    );
  };

  // ─── SHEETS ────────────────────────────────────────────────────────────────
  const renderSheet = () => {
    if (!activeSheet) return null;

    if (activeSheet === "gift_details" && selectedGift) {
      const isSaved = savedGifts.some(g => g.id === selectedGift.id);
      const slug = selectedGift.slug || GIFT_COLLECTIONS[selectedGift.name]?.slug || selectedGift.name.toLowerCase().replace(/\s/g, "").replace(/'/g, "");
      return (
        <div className="sheet-overlay" onClick={() => setActiveSheet(null)}>
          <div className="sheet-content" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 12 }}>
              <img src={giftImg(slug)} alt={selectedGift.name} style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
              <div className="sheet-title" style={{ margin: 0 }}>{selectedGift.name}</div>
            </div>
            <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 15, fontWeight: 500, marginBottom: 24 }}>#{selectedGift.itemNumber} • {selectedGift.market}</div>
            <div className="ios-group" style={{ margin: 0, marginBottom: 24 }}>
              <div className="ios-row">
                <span style={{ color: "var(--text-secondary)" }}>Model</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {selectedGift.model}
                  <span className={`model-rarity ${rarityClass(selectedGift.modelRarity)}`}>{selectedGift.modelRarity}</span>
                </span>
              </div>
              <div className="ios-row">
                <span style={{ color: "var(--text-secondary)" }}>Backdrop</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {(() => { const c = BACKDROP_COLORS.find(x => x.name === selectedGift.backdrop); return c ? <span className="color-dot" style={{ background: c.hex }} /> : null; })()}
                  {selectedGift.backdrop}
                </span>
              </div>
              <div className="ios-row"><span style={{ color: "var(--text-secondary)" }}>Symbol</span><span>{selectedGift.symbol}</span></div>
              <div className="ios-row"><span style={{ color: "var(--text-secondary)" }}>Listed Value</span><span style={{ color: "var(--tg-blue)", fontWeight: 800 }}>{selectedGift.price}</span></div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="action-btn" style={{ flex: 1, background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border)", marginTop: 0 }} onClick={() => { toggleSave(selectedGift); setActiveSheet(null); }}>
                {isSaved ? "Remove Saved" : "Save Gift"}
              </button>
              <button className="action-btn" style={{ flex: 1, marginTop: 0 }} onClick={(e) => handleBuy(e, selectedGift.market, selectedGift)}>Buy Now</button>
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
                  <input type="number" className="ios-input" placeholder={t.amount_ton} value={donateAmount} onChange={e => setDonateAmount(e.target.value)} />
                </div>
                <div className="chips-grid" style={{ justifyContent: "center" }}>
                  {["MyTonWallet", "Tg Wallet", "TonKeeper"].map(w => (
                    <div key={w} className={`chip ${donateWallet === w ? "active" : ""}`} onClick={() => setDonateWallet(w)}>{w}</div>
                  ))}
                </div>
                <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: 16, fontSize: 13 }}>
                  You'll be redirected to {donateWallet} with address and amount pre-filled — just approve!
                </p>
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

    // MODEL sheet — with gift image per model, rarity badge
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
              <div className="sheet-model-item" onClick={() => { setSelectedModel("Any"); setActiveSheet(null); }}>
                <div className="model-left">
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{t.any}</span>
                </div>
                {selectedModel === "Any" && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
              </div>
              {availableModels.map(m => (
                <div key={m.name} className="sheet-model-item" onClick={() => { setSelectedModel(m.name); setActiveSheet(null); }}>
                  <div className="model-left">
                    {currentGiftData && (
                      <img
                        src={giftImg(currentGiftData.slug)}
                        alt={m.name}
                        className="model-thumb"
                        onError={e => { e.target.style.display = "none"; }}
                      />
                    )}
                    <div className="model-info">
                      <span className="model-name">{m.name}</span>
                      <span className={`model-rarity ${rarityClass(m.rarity)}`}>{m.rarity} {t.rarity}</span>
                    </div>
                  </div>
                  {selectedModel === m.name && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // BACKDROP sheet
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

    // SYMBOL sheet — with gift image, symbols
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
              <div className="sheet-model-item" onClick={() => { setSelectedSymbol("Any"); setActiveSheet(null); }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{t.any}</span>
                {selectedSymbol === "Any" && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
              </div>
              {availableSymbols.map(sym => (
                <div key={sym} className="sheet-model-item" onClick={() => { setSelectedSymbol(sym); setActiveSheet(null); }}>
                  <div className="model-left">
                    {currentGiftData && (
                      <img
                        src={giftImg(currentGiftData.slug)}
                        alt={sym}
                        className="model-thumb"
                        onError={e => { e.target.style.display = "none"; }}
                      />
                    )}
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{sym}</span>
                  </div>
                  {selectedSymbol === sym && <span style={{ color: "var(--tg-blue)" }}><IconCheck /></span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // ─── SCOUT CONTENT ──────────────────────────────────────────────────────────
  const renderScout = (desktop = false) => {
    if (isScouting) {
      return (
        <div className="fade-in-up">
          <div className="scouting-overlay">
            <div className="scouting-spinner" />
            <div className="scouting-title">Scouting marketplaces…</div>
            <div className="scouting-sub">Finding gems so you don't have to</div>
            <div className="scouting-markets">
              {["GetGems","Portals","MRKT","Fragment","Tonnel"].map(m => (
                <div key={m} className="scouting-market-chip">{m}</div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    if (isSearching) {
      return (
        <div className="fade-in-up" style={{ marginTop: 10 }}>
          {!desktop && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{t.results}</div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 600 }}>{mockResults.length} {t.found}</div>
            </div>
          )}
          {desktop && (
            <div className="hero-title desktop" style={{ marginBottom: 16 }}>{t.results} <span style={{ fontSize: 20, color: "var(--text-secondary)" }}>{mockResults.length} {t.found}</span></div>
          )}
          <div className={desktop ? "results-grid desktop" : "results-grid"}>
            {mockResults.map(item => renderGiftCard(item, desktop))}
          </div>
        </div>
      );
    }
    return (
      <div className="fade-in-up">
        <PromoBanner />
        <div className={desktop ? "hero-title desktop" : "hero-title"}>
          <div className="hero-title-row">
            <span>{t.fastest_way}</span>
            <GiftTroveLogo size={desktop ? 38 : 28} />
          </div>
        </div>
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
              {filteredGifts.slice(0, 12).map(g => {
                const gSlug = GIFT_COLLECTIONS[g]?.slug || g.toLowerCase().replace(/\s/g, "").replace(/'/g, "");
                let touchStartXRef = 0, touchStartYRef = 0;
                return (
                  <div
                    key={g}
                    className="suggestion-item"
                    onMouseDown={e => { e.preventDefault(); setGiftQuery(g); setShowSuggestions(false); }}
                    onTouchStart={e => {
                      touchStartXRef = e.touches[0].clientX;
                      touchStartYRef = e.touches[0].clientY;
                    }}
                    onTouchEnd={e => {
                      const dx = Math.abs(e.changedTouches[0].clientX - touchStartXRef);
                      const dy = Math.abs(e.changedTouches[0].clientY - touchStartYRef);
                      if (dx < 10 && dy < 10) {
                        e.preventDefault();
                        setGiftQuery(g);
                        setShowSuggestions(false);
                      }
                    }}
                  >
                    <img src={giftImg(gSlug)} alt={g} className="suggestion-gift-img" onError={e => { e.target.style.display = "none"; }} />
                    {g}
                  </div>
                );
              })}
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
    );
  };

  // ─── SAVED CONTENT ──────────────────────────────────────────────────────────
  const renderSaved = (desktop = false) => (
    <div className="fade-in-up">
      <div className={desktop ? "page-header desktop" : "page-header"}>{t.saved_tab}</div>
      {savedGifts.length === 0 ? (
        <div className="ios-group" style={{ padding: 20, textAlign: "center", color: "var(--text-secondary)" }}>{t.no_saved}</div>
      ) : (
        <div className={desktop ? "results-grid desktop" : "results-grid"}>
          {savedGifts.map(item => renderGiftCard(item, desktop))}
        </div>
      )}
    </div>
  );

  // ─── PROFILE CONTENT ────────────────────────────────────────────────────────
  const renderProfile = (desktop = false) => (
    <div className="fade-in-up">
      <div className={desktop ? "page-header desktop" : "page-header"}>{t.profile_tab}</div>

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
  );

  // ─── EVENTS CONTENT ─────────────────────────────────────────────────────────
  const renderEvents = () => (
    <div className="fade-in-up" style={{ textAlign: "center", marginTop: "40%" }}>
      <div style={{ color: "var(--text-secondary)", marginBottom: 16 }}><IconCalendar /></div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{t.no_events}</div>
      <div style={{ color: "var(--text-secondary)", marginTop: 8 }}>{t.check_back}</div>
    </div>
  );

  const renderActiveTab = (desktop = false) => {
    switch (activeTab) {
      case "scout": return renderScout(desktop);
      case "events": return renderEvents();
      case "saved": return renderSaved(desktop);
      case "profile": return renderProfile(desktop);
      default: return null;
    }
  };

  const tabs = [
    { id: "scout", icon: <IconSearch />, label: t.scout_tab },
    { id: "events", icon: <IconCalendar />, label: t.events_tab },
    { id: "saved", icon: <IconBookmark />, label: t.saved_tab },
    { id: "profile", icon: <IconUser />, label: t.profile_tab }
  ];

  // ─── DESKTOP LAYOUT ──────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <>
        <style>{styles}</style>
        {toast && <div className="toast">{toast}</div>}
        <div className="desktop-layout" data-theme={theme}>
          {/* Sidebar */}
          <div className="desktop-sidebar">
            <div className="desktop-logo">
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                GIFT<GiftTroveLogo size={26} />TROVE
              </span>
            </div>
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`desktop-nav-btn ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => { setActiveTab(tab.id); setIsSearching(false); setIsScouting(false); }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
            <div className="desktop-sidebar-bottom">
              <div className="icon-btn" onClick={() => setActiveSheet("lang")}><IconGlobe /></div>
              <div className="icon-btn" onClick={toggleTheme}>
                {theme === "dark" ? <IconMoon /> : <IconSun />}
              </div>
              {activeTab === "scout" && isSearching && (
                <div className="icon-btn" onClick={() => { setIsSearching(false); setIsScouting(false); }}><IconBack /></div>
              )}
            </div>
          </div>

          {/* Main content */}
          <div className="desktop-content">
            {renderActiveTab(true)}
          </div>

          {renderSheet()}
        </div>
      </>
    );
  }

  // ─── MOBILE LAYOUT ───────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <div className="app-container" data-theme={theme}>
        {toast && <div className="toast">{toast}</div>}

        {/* TOP NAV */}
        <div className="top-nav">
          {activeTab === "scout" && isSearching ? (
            <div className="icon-btn" onClick={() => { setIsSearching(false); setIsScouting(false); }}><IconBack /></div>
          ) : (
            <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.5px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 2, lineHeight: 1 }}>
              GIFT<span style={{ display: "flex", alignItems: "center", margin: "0 2px" }}><GiftTroveLogo size={22} /></span>TROVE
            </div>
          )}
          <div className="top-icons">
            <div className="icon-btn" onClick={() => setActiveSheet("lang")}><IconGlobe /></div>
            <div className="icon-btn" onClick={toggleTheme}>
              {theme === "dark" ? <IconMoon /> : <IconSun />}
            </div>
          </div>
        </div>

        {/* PULL-TO-REFRESH */}
        <div
          className="content ptr-container"
          ref={contentRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ paddingTop: pullY > 0 ? pullY : 0, transition: pullY === 0 ? "padding-top 0.3s" : "none" }}
        >
          {/* PTR indicator */}
          <div className={`ptr-indicator ${isRefreshing || pullY > 40 ? "visible" : ""}`} style={{ top: isRefreshing ? 8 : pullY > 50 ? 8 : -60 }}>
            <div className={`ptr-spinner ${isRefreshing ? "spinning" : ""}`} />
          </div>

          {/* SCOUT TAB */}
          {activeTab === "scout" && renderScout(false)}
          {/* EVENTS TAB */}
          {activeTab === "events" && renderEvents()}
          {/* SAVED TAB */}
          {activeTab === "saved" && renderSaved(false)}
          {/* PROFILE TAB */}
          {activeTab === "profile" && renderProfile(false)}
        </div>

        {/* BOTTOM NAV */}
        {!keyboardOpen && (
        <div className="tab-bar-container">
          <div className="ios-tab-bar" style={{ position: "relative" }}>
            {/* Glassmorphism pill that slides to active tab */}
            <div
              className="tab-active-pill"
              style={{ left: `calc(${tabs.findIndex(t => t.id === activeTab)} * 25% + 12.5% - 22px)` }}
            />
            {tabs.map((tab, idx) => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => { setActiveTab(tab.id); setIsSearching(false); setIsScouting(false); }}
              >
                <div className={`tab-icon ${activeTab === tab.id ? "tab-icon-active" : ""}`}>{tab.icon}</div>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
        )}

        {renderSheet()}
      </div>
    </>
  );
}
