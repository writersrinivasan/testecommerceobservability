export interface Product {
  id: string;
  title: string;
  brand: string;
  category: string;
  price: number;
  mrp: number;
  rating: number;
  reviews: number;
  emoji: string;
  gradient: [string, string];
  express: boolean;
  description: string;
  features: string[];
  tags: string[];
}

export const CATEGORIES = [
  "Electronics",
  "Mobiles",
  "Computers",
  "Fashion",
  "Home & Kitchen",
  "Books",
  "Sports",
  "Beauty",
] as const;

export const PRODUCTS: Product[] = [
  {
    id: "p01", title: "SonicWave X5 Wireless Noise Cancelling Headphones", brand: "SonicWave", category: "Electronics",
    price: 8999, mrp: 14999, rating: 4.5, reviews: 12873, emoji: "🎧", gradient: ["#dbeafe", "#93c5fd"], express: true,
    description: "Over-ear bluetooth headphones with adaptive active noise cancellation, 40 hour battery life and a plush memory-foam fit for travel and work.",
    features: ["Adaptive ANC", "40h battery", "Bluetooth 5.3", "Fast charge: 10 min = 5h"],
    tags: ["headphones", "audio", "noise cancelling", "wireless", "travel", "music"],
  },
  {
    id: "p02", title: "PulseBuds Pro True Wireless Earbuds", brand: "Pulse", category: "Electronics",
    price: 2499, mrp: 4999, rating: 4.2, reviews: 30211, emoji: "🎵", gradient: ["#ede9fe", "#c4b5fd"], express: true,
    description: "Compact in-ear earbuds with deep bass, ENC mic for calls, IPX5 sweat resistance and a pocketable charging case. Great for gym and running.",
    features: ["ENC calling mic", "IPX5", "30h with case", "Low-latency gaming mode"],
    tags: ["earbuds", "audio", "wireless", "gym", "budget", "music"],
  },
  {
    id: "p03", title: "Lumio 55\" 4K Ultra HD Smart LED TV", brand: "Lumio", category: "Electronics",
    price: 36990, mrp: 54990, rating: 4.3, reviews: 5402, emoji: "📺", gradient: ["#e0f2fe", "#7dd3fc"], express: false,
    description: "55 inch 4K HDR smart television with Dolby Audio, built-in streaming apps, voice remote and slim bezels for the living room.",
    features: ["4K HDR10", "Dolby Audio 30W", "Voice remote", "3 HDMI ports"],
    tags: ["tv", "television", "4k", "smart tv", "home entertainment"],
  },
  {
    id: "p04", title: "Orbit Smartwatch Fit 3 with AMOLED Display", brand: "Orbit", category: "Electronics",
    price: 3999, mrp: 7999, rating: 4.1, reviews: 9876, emoji: "⌚", gradient: ["#fce7f3", "#f9a8d4"], express: true,
    description: "Fitness smartwatch with 1.43\" AMOLED screen, heart rate and SpO2 tracking, 100+ sports modes and bluetooth calling.",
    features: ["AMOLED display", "SpO2 + heart rate", "BT calling", "7-day battery"],
    tags: ["smartwatch", "fitness", "wearable", "health", "running"],
  },
  {
    id: "p05", title: "Nova 12 5G Smartphone (8GB RAM, 256GB)", brand: "Nova", category: "Mobiles",
    price: 24999, mrp: 31999, rating: 4.4, reviews: 18320, emoji: "📱", gradient: ["#dcfce7", "#86efac"], express: true,
    description: "5G mobile phone with 120Hz AMOLED display, 50MP OIS camera, 5000mAh battery and 67W fast charging.",
    features: ["120Hz AMOLED", "50MP OIS camera", "5000mAh", "67W charging"],
    tags: ["phone", "smartphone", "mobile", "5g", "camera"],
  },
  {
    id: "p06", title: "Nova Lite 4G Smartphone (4GB RAM, 64GB)", brand: "Nova", category: "Mobiles",
    price: 9499, mrp: 12999, rating: 4.0, reviews: 22104, emoji: "📲", gradient: ["#f0fdf4", "#bbf7d0"], express: false,
    description: "Affordable everyday phone with a large 6.6 inch display, dual camera and all-day 5000mAh battery. Ideal budget mobile for parents and students.",
    features: ["6.6\" HD+ display", "Dual camera", "5000mAh", "Expandable storage"],
    tags: ["phone", "smartphone", "mobile", "budget", "students"],
  },
  {
    id: "p07", title: "ChargeMax 20000mAh Power Bank 22.5W", brand: "ChargeMax", category: "Mobiles",
    price: 1499, mrp: 2999, rating: 4.3, reviews: 41022, emoji: "🔋", gradient: ["#fef9c3", "#fde047"], express: true,
    description: "High capacity portable charger with USB-C power delivery that charges phones, earbuds and smartwatches on the go.",
    features: ["20000mAh", "22.5W fast charge", "USB-C PD", "Triple output"],
    tags: ["power bank", "charger", "accessories", "travel", "phone"],
  },
  {
    id: "p08", title: "AeroBook 14 Thin & Light Laptop (Ryzen 7, 16GB, 512GB SSD)", brand: "Aero", category: "Computers",
    price: 58990, mrp: 74990, rating: 4.5, reviews: 3311, emoji: "💻", gradient: ["#e2e8f0", "#94a3b8"], express: true,
    description: "Thin and light notebook laptop for work, coding and students with 2.8K display, 16GB RAM, fast SSD and 12 hour battery.",
    features: ["Ryzen 7", "16GB RAM", "2.8K display", "1.3 kg"],
    tags: ["laptop", "notebook", "computer", "coding", "work", "students"],
  },
  {
    id: "p09", title: "KeyFlow Mechanical Keyboard RGB (Hot-swappable)", brand: "KeyFlow", category: "Computers",
    price: 3499, mrp: 5999, rating: 4.6, reviews: 7745, emoji: "⌨️", gradient: ["#fee2e2", "#fca5a5"], express: true,
    description: "Compact 75% mechanical keyboard with hot-swappable switches, per-key RGB and wireless bluetooth plus USB-C modes for developers and gamers.",
    features: ["Hot-swap switches", "Tri-mode wireless", "Per-key RGB", "Gasket mount"],
    tags: ["keyboard", "computer accessories", "gaming", "coding", "developer"],
  },
  {
    id: "p10", title: "Glide Ergonomic Wireless Mouse", brand: "Glide", category: "Computers",
    price: 1299, mrp: 2499, rating: 4.4, reviews: 15022, emoji: "🖱️", gradient: ["#f1f5f9", "#cbd5e1"], express: true,
    description: "Ergonomic vertical wireless mouse that reduces wrist strain, with silent clicks and multi-device switching for laptop and desktop.",
    features: ["Vertical ergonomic", "Silent clicks", "3-device switch", "70-day battery"],
    tags: ["mouse", "computer accessories", "ergonomic", "work", "laptop"],
  },
  {
    id: "p11", title: "ViewPro 27\" QHD IPS Monitor 75Hz", brand: "ViewPro", category: "Computers",
    price: 16499, mrp: 23999, rating: 4.3, reviews: 2890, emoji: "🖥️", gradient: ["#e0e7ff", "#a5b4fc"], express: false,
    description: "27 inch QHD monitor with IPS panel, thin bezels and eye-care flicker free technology for work from home and design.",
    features: ["2560x1440 IPS", "75Hz", "Eye-care", "HDMI + DisplayPort"],
    tags: ["monitor", "display", "computer", "work from home", "design"],
  },
  {
    id: "p12", title: "Urban Trail Men's Running Shoes", brand: "Urban Trail", category: "Fashion",
    price: 2199, mrp: 3999, rating: 4.2, reviews: 8650, emoji: "👟", gradient: ["#ffedd5", "#fdba74"], express: true,
    description: "Lightweight breathable mesh running shoes with cushioned sole for jogging, gym training and daily walking.",
    features: ["Breathable mesh", "EVA cushioning", "Anti-skid sole", "Lightweight 260g"],
    tags: ["shoes", "running", "sports shoes", "gym", "men", "fashion"],
  },
  {
    id: "p13", title: "Classic Fit Cotton Casual Shirt", brand: "Threadline", category: "Fashion",
    price: 899, mrp: 1799, rating: 4.0, reviews: 5320, emoji: "👔", gradient: ["#e0f2fe", "#bae6fd"], express: false,
    description: "Breathable 100% cotton casual shirt in a classic fit, perfect for office and weekend wear.",
    features: ["100% cotton", "Classic fit", "Machine washable", "6 colours"],
    tags: ["shirt", "clothing", "men", "office wear", "fashion"],
  },
  {
    id: "p14", title: "Voyager Anti-theft Laptop Backpack 30L", brand: "Voyager", category: "Fashion",
    price: 1599, mrp: 3499, rating: 4.4, reviews: 11870, emoji: "🎒", gradient: ["#f5f5f4", "#d6d3d1"], express: true,
    description: "Water resistant travel backpack with padded 15.6 inch laptop sleeve, USB charging port and hidden anti-theft pocket.",
    features: ["Fits 15.6\" laptop", "USB charging port", "Water resistant", "30L capacity"],
    tags: ["backpack", "bag", "travel", "laptop bag", "students"],
  },
  {
    id: "p15", title: "BrewMaster Drip Coffee Maker 1.2L", brand: "BrewMaster", category: "Home & Kitchen",
    price: 3299, mrp: 4999, rating: 4.1, reviews: 2788, emoji: "☕", gradient: ["#fef3c7", "#d6a35c"], express: true,
    description: "Programmable drip coffee machine with keep-warm plate and reusable filter. Brews up to 10 cups of coffee.",
    features: ["10 cups", "Keep-warm", "Anti-drip", "Reusable filter"],
    tags: ["coffee", "kitchen appliance", "home", "breakfast"],
  },
  {
    id: "p16", title: "AirCrisp Digital Air Fryer 4.5L", brand: "AirCrisp", category: "Home & Kitchen",
    price: 4999, mrp: 8999, rating: 4.4, reviews: 19210, emoji: "🍟", gradient: ["#fee2e2", "#fdba74"], express: true,
    description: "Oil-free digital air fryer with 8 presets for healthy frying, baking, grilling and roasting. Family size 4.5 litre basket.",
    features: ["4.5L basket", "8 presets", "Up to 90% less oil", "Touch panel"],
    tags: ["air fryer", "kitchen appliance", "healthy cooking", "home"],
  },
  {
    id: "p17", title: "PureBreeze HEPA Air Purifier", brand: "PureBreeze", category: "Home & Kitchen",
    price: 7999, mrp: 12999, rating: 4.3, reviews: 6420, emoji: "🌬️", gradient: ["#ecfeff", "#a5f3fc"], express: false,
    description: "True HEPA H13 air purifier that removes 99.97% of dust, pollen and smoke for rooms up to 400 sq ft. Quiet sleep mode.",
    features: ["HEPA H13", "400 sq ft", "PM2.5 display", "Sleep mode 24dB"],
    tags: ["air purifier", "home", "health", "allergy", "pollution"],
  },
  {
    id: "p18", title: "SteelChef Non-stick Cookware Set (5 pcs)", brand: "SteelChef", category: "Home & Kitchen",
    price: 2599, mrp: 4999, rating: 4.2, reviews: 4105, emoji: "🍳", gradient: ["#f3f4f6", "#9ca3af"], express: true,
    description: "Induction friendly non-stick pots and pans set including frying pan, kadai, saucepan and glass lids.",
    features: ["Induction base", "PFOA free", "Glass lids", "5 pieces"],
    tags: ["cookware", "kitchen", "pans", "home", "cooking"],
  },
  {
    id: "p19", title: "Building Agentic AI Systems (Paperback)", brand: "TechPress", category: "Books",
    price: 649, mrp: 999, rating: 4.7, reviews: 1290, emoji: "📘", gradient: ["#dbeafe", "#60a5fa"], express: true,
    description: "A practical guide to designing multi-agent systems with LangGraph, tool calling, MCP, RAG and observability for production.",
    features: ["420 pages", "Code samples", "LangGraph + MCP", "2026 edition"],
    tags: ["book", "ai", "agents", "programming", "llm", "learning"],
  },
  {
    id: "p20", title: "The Observability Handbook (Paperback)", brand: "TechPress", category: "Books",
    price: 549, mrp: 899, rating: 4.6, reviews: 860, emoji: "📗", gradient: ["#dcfce7", "#4ade80"], express: true,
    description: "Learn tracing, metrics, logs and OpenTelemetry to debug distributed systems and LLM applications.",
    features: ["360 pages", "OpenTelemetry", "SRE practices", "LLM tracing chapter"],
    tags: ["book", "observability", "devops", "programming", "learning"],
  },
  {
    id: "p21", title: "FlexCore Yoga Mat 6mm Anti-slip", brand: "FlexCore", category: "Sports",
    price: 799, mrp: 1499, rating: 4.3, reviews: 14560, emoji: "🧘", gradient: ["#f3e8ff", "#d8b4fe"], express: true,
    description: "Thick anti-slip yoga and exercise mat with carry strap, ideal for home workouts, pilates and stretching.",
    features: ["6mm cushioning", "Anti-slip texture", "Carry strap", "Eco TPE"],
    tags: ["yoga", "fitness", "gym", "home workout", "sports"],
  },
  {
    id: "p22", title: "IronGrip Adjustable Dumbbells 20kg Set", brand: "IronGrip", category: "Sports",
    price: 3999, mrp: 6499, rating: 4.4, reviews: 3870, emoji: "🏋️", gradient: ["#e5e7eb", "#6b7280"], express: false,
    description: "Adjustable dumbbell set with plates and anti-slip handles for strength training and home gym.",
    features: ["20kg total", "Chrome handles", "Spin-lock collars", "Storage case"],
    tags: ["dumbbells", "gym", "fitness", "strength", "home workout", "sports"],
  },
  {
    id: "p23", title: "GlowUp Vitamin C Face Serum 30ml", brand: "GlowUp", category: "Beauty",
    price: 499, mrp: 899, rating: 4.1, reviews: 25400, emoji: "🧴", gradient: ["#ffedd5", "#fed7aa"], express: true,
    description: "Brightening vitamin C serum with hyaluronic acid for glowing, even-toned skin. Suitable for all skin types.",
    features: ["10% Vitamin C", "Hyaluronic acid", "Dermatologist tested", "Paraben free"],
    tags: ["skincare", "serum", "beauty", "face", "glow"],
  },
  {
    id: "p24", title: "SilkStyle Hair Dryer 1600W with Diffuser", brand: "SilkStyle", category: "Beauty",
    price: 1399, mrp: 2499, rating: 4.2, reviews: 7130, emoji: "💨", gradient: ["#fce7f3", "#fbcfe8"], express: true,
    description: "Ionic hair dryer with 3 heat settings, cool shot and diffuser attachment for frizz-free styling.",
    features: ["1600W", "Ionic care", "3 heat / 2 speed", "Diffuser + nozzle"],
    tags: ["hair dryer", "hair care", "beauty", "styling"],
  },
];

export const productById = (id: string) => PRODUCTS.find((p) => p.id === id);

export const formatINR = (n: number) => "₹" + n.toLocaleString("en-IN");
