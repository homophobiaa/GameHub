// puzzles.js — Emoji Logic Game — 65+ задачи
// Категории: Филми, Игри, Компании, Марки, Държави, Музика, Спорт, Наука

const PUZZLES = [

  // ==================== ФИЛМИ ====================
  {
    eq: "🦁 + 👑 = ?",
    answer: "The Lion King",
    options: ["The Lion King", "Madagascar", "Jungle Book", "Bambi"],
    hint: "Симба трябва да си върне трона",
    category: "🎬 Филми"
  },
  {
    eq: "❄️ + 👸 = ?",
    answer: "Frozen",
    options: ["Frozen", "Cinderella", "Brave", "Tangled"],
    hint: "Let it go! Let it go!",
    category: "🎬 Филми"
  },
  {
    eq: "🕷️ + 👨 = ?",
    answer: "Spider-Man",
    options: ["Spider-Man", "Batman", "Ant-Man", "Venom"],
    hint: "Дружелюбният комшия супергерой",
    category: "🎬 Филми"
  },
  {
    eq: "🧙 + 💍 = ?",
    answer: "Lord of the Rings",
    options: ["Lord of the Rings", "Harry Potter", "Narnia", "The Hobbit"],
    hint: "Едно пръстенче да ги владее всички",
    category: "🎬 Филми"
  },
  {
    eq: "🤖 + ⭐ + ⚔️ = ?",
    answer: "Star Wars",
    options: ["Star Wars", "Transformers", "Dune", "Avatar"],
    hint: "В далечна, далечна галактика...",
    category: "🎬 Филми"
  },
  {
    eq: "🦈 + 🌊 = ?",
    answer: "Jaws",
    options: ["Jaws", "Finding Nemo", "Shark Tale", "Deep Blue Sea"],
    hint: "Класически филм на Спилбърг от 1975",
    category: "🎬 Филми"
  },
  {
    eq: "🦸 + 🦸 + ∞ = ?",
    answer: "Avengers: Infinity War",
    options: ["Avengers: Infinity War", "Justice League", "X-Men", "Guardians of the Galaxy"],
    hint: "Thanos иска всичките камъни",
    category: "🎬 Филми"
  },
  {
    eq: "🐠 + 🌊 + 🔍 = ?",
    answer: "Finding Nemo",
    options: ["Finding Nemo", "Finding Dory", "The Little Mermaid", "Shark Tale"],
    hint: "Баща търси изгубения си син",
    category: "🎬 Филми"
  },
  {
    eq: "🏎️ + 💨 + 👨‍👦 = ?",
    answer: "Fast & Furious",
    options: ["Fast & Furious", "Gone in 60 Seconds", "Cars", "Rush"],
    hint: "Famiglia e tutto",
    category: "🎬 Филми"
  },
  {
    eq: "🃏 + 😈 + 🦇 = ?",
    answer: "The Dark Knight",
    options: ["The Dark Knight", "Joker", "Batman v Superman", "Suicide Squad"],
    hint: "Нолановият Батман с Хийт Леджър",
    category: "🎬 Филми"
  },
  {
    eq: "👻 + 👦 + 🏠 = ?",
    answer: "Home Alone",
    options: ["Home Alone", "Casper", "Haunting", "Ghostbusters"],
    hint: "Кевин забравен вкъщи по Коледа",
    category: "🎬 Филми"
  },
  {
    eq: "🧸 + ❤️ + 👧 = ?",
    answer: "Toy Story",
    options: ["Toy Story", "Moana", "Up", "Inside Out"],
    hint: "Играчките оживяват когато децата ги нямат",
    category: "🎬 Филми"
  },

  // ==================== ИГРИ ====================
  {
    eq: "🍄 + 👨‍🔧 + ⭐ = ?",
    answer: "Super Mario",
    options: ["Super Mario", "Luigi's Mansion", "Donkey Kong", "Kirby"],
    hint: "Водопроводчик в Mushroom Kingdom",
    category: "🎮 Игри"
  },
  {
    eq: "⚔️ + 🧝 + 🗡️ = ?",
    answer: "The Legend of Zelda",
    options: ["The Legend of Zelda", "Dark Souls", "Skyrim", "Witcher"],
    hint: "Линк спасява принцеса Зелда",
    category: "🎮 Игри"
  },
  {
    eq: "🟡 + 👾 + 🔵🔴🔶🔷 = ?",
    answer: "Pac-Man",
    options: ["Pac-Man", "Space Invaders", "Galaga", "Tetris"],
    hint: "Жълто кръгче яде точки и бяга от призраци",
    category: "🎮 Игри"
  },
  {
    eq: "⛏️ + 🪨 + 🌲 = ?",
    answer: "Minecraft",
    options: ["Minecraft", "Roblox", "Terraria", "Valheim"],
    hint: "Строй, копай, оцелей",
    category: "🎮 Игри"
  },
  {
    eq: "🎯 + 🔫 + 🏝️ = ?",
    answer: "Fortnite",
    options: ["Fortnite", "PUBG", "Warzone", "Apex Legends"],
    hint: "Battle Royale с градеж на структури",
    category: "🎮 Игри"
  },
  {
    eq: "🐉 + ☁️ + 🎮 = ?",
    answer: "Elden Ring",
    options: ["Elden Ring", "Dark Souls", "Sekiro", "God of War"],
    hint: "FromSoftware, Джордж Р.Р. Мартин",
    category: "🎮 Игри"
  },
  {
    eq: "🍷 + 💉 + 🧛 = ?",
    answer: "Castlevania",
    options: ["Castlevania", "Bloodborne", "Vampire: Masquerade", "Diablo"],
    hint: "Борба срещу Дракула с камшик",
    category: "🎮 Игри"
  },
  {
    eq: "🏁 + 🔴 + 🚀 = ?",
    answer: "Mario Kart",
    options: ["Mario Kart", "Need for Speed", "Gran Turismo", "F-Zero"],
    hint: "Картинг с гъби и банани",
    category: "🎮 Игри"
  },
  {
    eq: "🕹️ + 🥊 + 🔥 = ?",
    answer: "Street Fighter",
    options: ["Street Fighter", "Mortal Kombat", "Tekken", "Smash Bros"],
    hint: "Hadouken! Классическа файтинг игра",
    category: "🎮 Игри"
  },
  {
    eq: "👁️ + ∞ + 🔢 = ?",
    answer: "Portal",
    options: ["Portal", "Half-Life", "Antichamber", "The Witness"],
    hint: "The cake is a lie",
    category: "🎮 Игри"
  },

  // ==================== КОМПАНИИ / МАРКИ ====================
  {
    eq: "🍎 + 📱 = ?",
    answer: "Apple",
    options: ["Apple", "Samsung", "Google", "Nokia"],
    hint: "iPhone, MacBook, Steve Jobs",
    category: "🏢 Компании"
  },
  {
    eq: "🐦 + 💬 = ?",
    answer: "Twitter / X",
    options: ["Twitter / X", "Discord", "Snapchat", "Telegram"],
    hint: "Платформа за кратки съобщения с птица",
    category: "🏢 Компании"
  },
  {
    eq: "📦 + 🌳 + 🚚 = ?",
    answer: "Amazon",
    options: ["Amazon", "eBay", "AliExpress", "DHL"],
    hint: "Най-голям онлайн магазин в света",
    category: "🏢 Компании"
  },
  {
    eq: "🎵 + 🟢 + 🎧 = ?",
    answer: "Spotify",
    options: ["Spotify", "Apple Music", "YouTube Music", "SoundCloud"],
    hint: "Стрийминг за музика с тъмнозелено лого",
    category: "🏢 Компании"
  },
  {
    eq: "🔍 + 🌐 = ?",
    answer: "Google",
    options: ["Google", "Bing", "Yahoo", "DuckDuckGo"],
    hint: "Най-използваната търсачка",
    category: "🏢 Компании"
  },
  {
    eq: "☕ + 🌟 + ♻️ = ?",
    answer: "Starbucks",
    options: ["Starbucks", "Costa Coffee", "Nespresso", "Tim Hortons"],
    hint: "Зелена русалка в логото",
    category: "🏢 Компании"
  },
  {
    eq: "👟 + ✔️ = ?",
    answer: "Nike",
    options: ["Nike", "Adidas", "Puma", "Reebok"],
    hint: "Just do it",
    category: "🏢 Компании"
  },
  {
    eq: "🍔 + 🍟 + 🤡 = ?",
    answer: "McDonald's",
    options: ["McDonald's", "Burger King", "KFC", "Wendy's"],
    hint: "I'm lovin' it — клоунът Роналд",
    category: "🏢 Компании"
  },
  {
    eq: "🎮 + 🟩 + 🅰️ = ?",
    answer: "Xbox",
    options: ["Xbox", "PlayStation", "Nintendo Switch", "Sega"],
    hint: "Конзола на Microsoft",
    category: "🏢 Компании"
  },
  {
    eq: "🎬 + 📺 + ❤️ = ?",
    answer: "Netflix",
    options: ["Netflix", "Disney+", "HBO Max", "Amazon Prime"],
    hint: "Are you still watching?",
    category: "🏢 Компании"
  },
  {
    eq: "🚗 + ⚡ + 🔋 = ?",
    answer: "Tesla",
    options: ["Tesla", "Rivian", "BMW", "Audi"],
    hint: "Електрически коли на Илон Мъск",
    category: "🏢 Компании"
  },
  {
    eq: "🏠 + 🔑 + 🌍 = ?",
    answer: "Airbnb",
    options: ["Airbnb", "Booking.com", "Trivago", "Expedia"],
    hint: "Наеми стая от местни хора",
    category: "🏢 Компании"
  },
  {
    eq: "📸 + ❤️ + 📱 = ?",
    answer: "Instagram",
    options: ["Instagram", "Pinterest", "TikTok", "Snapchat"],
    hint: "Снимки, Stories и Reels",
    category: "🏢 Компании"
  },
  {
    eq: "🎭 + 📺 + ▶️ = ?",
    answer: "YouTube",
    options: ["YouTube", "Twitch", "Vimeo", "TikTok"],
    hint: "Broadcast yourself — червено лого",
    category: "🏢 Компании"
  },

  // ==================== ДЪРЖАВИ ====================
  {
    eq: "🗼 + 🥐 + 🍷 = ?",
    answer: "Франция",
    options: ["Франция", "Белгия", "Швейцария", "Италия"],
    hint: "Айфеловата кула, баге и вино",
    category: "🌍 Държави"
  },
  {
    eq: "🍕 + 🛵 + 🥋 = ?",
    answer: "Италия",
    options: ["Италия", "Испания", "Гърция", "Португалия"],
    hint: "Мамма мия! Рим, Флоренция, Венеция",
    category: "🌍 Държави"
  },
  {
    eq: "🐨 + 🦘 + 🏄 = ?",
    answer: "Австралия",
    options: ["Австралия", "Нова Зеландия", "Фиджи", "Тасмания"],
    hint: "Континент-страна с коали и кенгура",
    category: "🌍 Държави"
  },
  {
    eq: "⛩️ + 🌸 + 🗻 = ?",
    answer: "Япония",
    options: ["Япония", "Китай", "Корея", "Тайланд"],
    hint: "Страна на изгряващото слънце",
    category: "🌍 Държави"
  },
  {
    eq: "🎺 + 💃 + ☕ = ?",
    answer: "Куба",
    options: ["Куба", "Бразилия", "Мексико", "Колумбия"],
    hint: "Рум, салса и пури",
    category: "🌍 Държави"
  },
  {
    eq: "🏔️ + 🧀 + ⌚ = ?",
    answer: "Швейцария",
    options: ["Швейцария", "Австрия", "Германия", "Норвегия"],
    hint: "Алпи, часовници и шоколад",
    category: "🌍 Държави"
  },
  {
    eq: "🌮 + 🌵 + 🎆 = ?",
    answer: "Мексико",
    options: ["Мексико", "Аржентина", "Перу", "Чили"],
    hint: "Тако, текила и Деня на мъртвите",
    category: "🌍 Държави"
  },
  {
    eq: "🦁 + ☀️ + 🌍 = ?",
    answer: "Кения",
    options: ["Кения", "Танзания", "Уганда", "Нигерия"],
    hint: "Сафари, Масай Мара, маратонски шампиони",
    category: "🌍 Държави"
  },
  {
    eq: "🥐 + 🌷 + 🚲 = ?",
    answer: "Нидерландия",
    options: ["Нидерландия", "Белгия", "Дания", "Швеция"],
    hint: "Лалета, вятърни мелници и велосипеди",
    category: "🌍 Държави"
  },
  {
    eq: "🗽 + 🍎 + 🗝️ = ?",
    answer: "САЩ",
    options: ["САЩ", "Канада", "Великобритания", "Австралия"],
    hint: "Статуята на свободата, Ню Йорк, Вашингтон",
    category: "🌍 Държави"
  },
  {
    eq: "🐻 + ❄️ + 🏒 = ?",
    answer: "Канада",
    options: ["Канада", "Русия", "Финландия", "Норвегия"],
    hint: "Кленов лист, хокей и бели мечки",
    category: "🌍 Държави"
  },
  {
    eq: "🎻 + 🏰 + 🍺 = ?",
    answer: "Австрия",
    options: ["Австрия", "Германия", "Чехия", "Унгария"],
    hint: "Виена, Моцарт и замъкът Шьонбрун",
    category: "🌍 Държави"
  },

  // ==================== МУЗИКА ====================
  {
    eq: "🎸 + 🍎 + 🎶 = ?",
    answer: "The Beatles",
    options: ["The Beatles", "Rolling Stones", "Led Zeppelin", "The Who"],
    hint: "Ливърпулската четворка",
    category: "🎵 Музика"
  },
  {
    eq: "👸 + 💎 + 🐝 = ?",
    answer: "Beyoncé",
    options: ["Beyoncé", "Rihanna", "Lady Gaga", "Adele"],
    hint: "Queen Bey — Lemonade, Renaissance",
    category: "🎵 Музика"
  },
  {
    eq: "🎤 + 🎹 + 🚀 = ?",
    answer: "Elton John",
    options: ["Elton John", "Freddie Mercury", "David Bowie", "Billy Joel"],
    hint: "Rocket Man — Crocodile Rock",
    category: "🎵 Музика"
  },
  {
    eq: "🐍 + 💿 + 🔮 = ?",
    answer: "Taylor Swift",
    options: ["Taylor Swift", "Ariana Grande", "Billie Eilish", "Katy Perry"],
    hint: "Shake it off — Eras Tour",
    category: "🎵 Музика"
  },
  {
    eq: "👑 + 🎵 + 🌍 = ?",
    answer: "Bob Marley",
    options: ["Bob Marley", "Nas", "Tupac", "Kendrick Lamar"],
    hint: "Reggae легенда от Ямайка",
    category: "🎵 Музика"
  },
  {
    eq: "🤖 + 🕺 + 🎧 = ?",
    answer: "Daft Punk",
    options: ["Daft Punk", "The Prodigy", "Chemical Brothers", "Deadmau5"],
    hint: "Около бъдещето е сега — роботски шлемове",
    category: "🎵 Музика"
  },

  // ==================== СПОРТ ====================
  {
    eq: "⚽ + 🏆 + 🌍 = ?",
    answer: "FIFA World Cup",
    options: ["FIFA World Cup", "Champions League", "Euro Cup", "Copa America"],
    hint: "Най-голям футболен турнир на 4 години",
    category: "⚽ Спорт"
  },
  {
    eq: "🏀 + 🐐 + 🐮 = ?",
    answer: "Chicago Bulls",
    options: ["Chicago Bulls", "LA Lakers", "Boston Celtics", "Miami Heat"],
    hint: "Отборът на Майкъл Джордан",
    category: "⚽ Спорт"
  },
  {
    eq: "🎾 + 🌿 = ?",
    answer: "Wimbledon",
    options: ["Wimbledon", "Roland Garros", "US Open", "Australian Open"],
    hint: "Тенис турнир на трева в Лондон",
    category: "⚽ Спорт"
  },
  {
    eq: "🏊 + 🚴 + 🏃 = ?",
    answer: "Triathlon",
    options: ["Triathlon", "Decathlon", "Pentathlon", "Biathlon"],
    hint: "Три спорта в едно",
    category: "⚽ Спорт"
  },
  {
    eq: "🐐 + ⚽ + 🇦🇷 = ?",
    answer: "Lionel Messi",
    options: ["Lionel Messi", "Cristiano Ronaldo", "Neymar", "Mbappé"],
    hint: "Аргентинска легенда с 8 Балон д'Ор",
    category: "⚽ Спорт"
  },

  // ==================== НАУКА / ВСЯКАКВИ ====================
  {
    eq: "🔥 + 💧 = ?",
    answer: "Пара",
    options: ["Пара", "Лед", "Облак", "Дим"],
    hint: "Физически резултат от горещина и вода",
    category: "🔬 Наука"
  },
  {
    eq: "🌱 + ☀️ + 💧 = ?",
    answer: "Фотосинтеза",
    options: ["Фотосинтеза", "Дишане", "Испарение", "Размножаване"],
    hint: "Растенията правят това за да живеят",
    category: "🔬 Наука"
  },
  {
    eq: "🚀 + 🌕 = ?",
    answer: "Аполо 11",
    options: ["Аполо 11", "Спейс Екс", "Мисия Марс", "Хъбъл"],
    hint: "Кацане на Луната — 1969 г.",
    category: "🔬 Наука"
  },
  {
    eq: "💻 + ☕ + 🌙 = ?",
    answer: "Late night coding",
    options: ["Late night coding", "Office work", "Gaming session", "Studying"],
    hint: "Програмистки ритуал около полунощ",
    category: "💡 Всякакви"
  },
  {
    eq: "🎂 + 🕯️ + 🎉 = ?",
    answer: "Рожден ден",
    options: ["Рожден ден", "Нова година", "Сватба", "Коледа"],
    hint: "Честито! Направи желание!",
    category: "💡 Всякакви"
  },
  {
    eq: "🌈 + 🌧️ = ?",
    answer: "Дъга след дъжд",
    options: ["Дъга след дъжд", "Буря", "Слънчев ден", "Наводнение"],
    hint: "Природно явление след дъжд и слънце",
    category: "🔬 Наука"
  },
];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
