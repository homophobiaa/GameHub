// words.js — Word Scramble Game
// Each entry: { word, hint, category }
// Easy ≤6 letters, Medium ≤8, Hard ≤12

const WORDS = [

  // ═══════════ 🎬 ФИЛМИ ═══════════
  { word: "TITANIC",    hint: "🚢 Корабокрушение и любов (1997)",            category: "🎬 Филми" },
  { word: "AVATAR",     hint: "💙 Сини извънземни на Пандора",               category: "🎬 Филми" },
  { word: "JOKER",      hint: "🃏 Злодей от Готъм Сити",                     category: "🎬 Филми" },
  { word: "MATRIX",     hint: "💊 Червена или синя хапче?",                  category: "🎬 Филми" },
  { word: "INCEPTION",  hint: "🌀 Сън в съня в съня...",                     category: "🎬 Филми" },
  { word: "INTERSTELLAR", hint: "🚀 Пътуване през черна дупка",             category: "🎬 Филми" },
  { word: "FROZEN",     hint: "❄️ Let it go! Кралица на леда",               category: "🎬 Филми" },
  { word: "JAWS",       hint: "🦈 Страшна акула на Спилбърг (1975)",         category: "🎬 Филми" },
  { word: "GRAVITY",   hint: "🌍 Астронавт изгубен в космоса",               category: "🎬 Филми" },
  { word: "GLADIATOR",  hint: "⚔️ Максимус се бие за свобода в Рим",         category: "🎬 Филми" },
  { word: "PARASITE",   hint: "🏠 Оскар за най-добър филм 2020",             category: "🎬 Филми" },
  { word: "OPPENHEIMER", hint: "☢️ Бащата на атомната бомба",               category: "🎬 Филми" },

  // ═══════════ 🎮 ИГРИ ═══════════
  { word: "MARIO",      hint: "🍄 Червен водопроводчик скача",               category: "🎮 Игри" },
  { word: "ZELDA",      hint: "🗡️ Принцеса, която Линк спасява",             category: "🎮 Игри" },
  { word: "TETRIS",     hint: "🟦 Нареждай падащи блокчета",                 category: "🎮 Игри" },
  { word: "FORTNITE",   hint: "🏝️ Battle Royale с 100 играчи",              category: "🎮 Игри" },
  { word: "MINECRAFT",  hint: "⛏️ Строй и оцелей в блок свят",              category: "🎮 Игри" },
  { word: "POKEMON",    hint: "⚡ Pikachu — Трябва ги хвана всичките!",      category: "🎮 Игри" },
  { word: "PACMAN",     hint: "🟡 Яж точки, бягай от призраци",              category: "🎮 Игри" },
  { word: "OVERWATCH",  hint: "🦸 Тийм шутър с герои",                       category: "🎮 Игри" },
  { word: "ELDENRING",  hint: "🐉 FromSoftware + Дж. Р. Р. Мартин",         category: "🎮 Игри" },
  { word: "PORTAL",     hint: "🔵🟠 The cake is a lie",                       category: "🎮 Игри" },
  { word: "HALO",       hint: "👽 Master Chief срещу Ковенанта",             category: "🎮 Игри" },
  { word: "DIABLO",     hint: "😈 Екшън RPG в ада",                          category: "🎮 Игри" },

  // ═══════════ 🏢 КОМПАНИИ ═══════════
  { word: "APPLE",      hint: "🍎 iPhone, MacBook, Steve Jobs",              category: "🏢 Компании" },
  { word: "GOOGLE",     hint: "🔍 Най-голямата търсачка",                    category: "🏢 Компании" },
  { word: "AMAZON",     hint: "📦 Доставя всичко до вратата ти",             category: "🏢 Компании" },
  { word: "NETFLIX",    hint: "🎬 Are you still watching?",                  category: "🏢 Компании" },
  { word: "SPOTIFY",    hint: "🎵 Стрийминг музика с зелено лого",           category: "🏢 Компании" },
  { word: "TWITTER",    hint: "🐦 Птичката социална мрежа (сега X)",         category: "🏢 Компании" },
  { word: "SAMSUNG",    hint: "📱 Южнокорейски технологичен гигант",         category: "🏢 Компании" },
  { word: "MICROSOFT",  hint: "🪟 Windows, Office, Xbox",                   category: "🏢 Компании" },
  { word: "TESLA",      hint: "⚡ Електрически коли на Илон Мъск",           category: "🏢 Компании" },
  { word: "AIRBNB",     hint: "🏠 Наеми стая по целия свят",                 category: "🏢 Компании" },
  { word: "DISCORD",    hint: "🎮 Чат за геймъри",                           category: "🏢 Компании" },
  { word: "TIKTOK",     hint: "📱 Кратки видеа за Gen Z",                    category: "🏢 Компании" },

  // ═══════════ 🌍 ДЪРЖАВИ ═══════════
  { word: "JAPAN",      hint: "⛩️ Страна на изгряващото слънце",             category: "🌍 Държави" },
  { word: "BRAZIL",     hint: "🌴 Карнавал, самба и Амазония",               category: "🌍 Държави" },
  { word: "FRANCE",     hint: "🗼 Айфелова кула и вино",                     category: "🌍 Държави" },
  { word: "CANADA",     hint: "🍁 Кленов лист и хокей",                      category: "🌍 Държави" },
  { word: "EGYPT",      hint: "🏛️ Пирамиди и фараони",                       category: "🌍 Държави" },
  { word: "GREECE",     hint: "🏛️ Родина на Олимпийските игри",              category: "🌍 Държави" },
  { word: "ICELAND",    hint: "🌋 Северно сияние и гейзери",                  category: "🌍 Държави" },
  { word: "THAILAND",   hint: "🐘 Бангкок, слонове и будизъм",               category: "🌍 Държави" },
  { word: "AUSTRALIA",  hint: "🦘 Кенгура, коали и Сидни",                   category: "🌍 Държави" },
  { word: "PORTUGAL",   hint: "🎵 Фадо, пастели де ната и Лисабон",          category: "🌍 Държави" },
  { word: "NORWAY",     hint: "🌊 Фиорди и северно сияние",                  category: "🌍 Държави" },
  { word: "ARGENTINA",  hint: "🥩 Танго, мате и Меси",                       category: "🌍 Държави" },

  // ═══════════ 🎵 МУЗИКА ═══════════
  { word: "BEYONCE",    hint: "👸 Queen Bey — Lemonade, Renaissance",        category: "🎵 Музика" },
  { word: "EMINEM",     hint: "🎤 Slim Shady — Lose Yourself",               category: "🎵 Музика" },
  { word: "ADELE",      hint: "🎶 Hello from the other side...",              category: "🎵 Музика" },
  { word: "NIRVANA",    hint: "🎸 Smells Like Teen Spirit — Кърт Кобейн",    category: "🎵 Музика" },
  { word: "METALLICA",  hint: "🤘 Nothing Else Matters — хеви метъл легенда", category: "🎵 Музика" },
  { word: "COLDPLAY",   hint: "🌟 Yellow, Fix You — британска рок банда",    category: "🎵 Музика" },
  { word: "MADONNA",    hint: "💄 Queen of Pop — Material Girl",             category: "🎵 Музика" },
  { word: "DAFTPUNK",   hint: "🤖 Роботски шлемове — Get Lucky",             category: "🎵 Музика" },
  { word: "RADIOHEAD",  hint: "🎵 Creep — Thom Yorke",                       category: "🎵 Музика" },
  { word: "DRAKE",      hint: "🦉 Started from the bottom...",               category: "🎵 Музика" },
  { word: "BILLIE",     hint: "🖤 Billie Eilish — Bad Guy",                  category: "🎵 Музика" },
  { word: "RIHANNA",    hint: "☂️ Umbrella, ella, ella...",                   category: "🎵 Музика" },

  // ═══════════ ⚽ СПОРТ ═══════════
  { word: "MESSI",      hint: "🐐 Аржентинска легенда, 8x Балон д'Ор",      category: "⚽ Спорт" },
  { word: "JORDAN",     hint: "🏀 Най-великият баскетболист на всички времена", category: "⚽ Спорт" },
  { word: "FEDERER",    hint: "🎾 20 Grand Slam титли — Swiss Maestro",      category: "⚽ Спорт" },
  { word: "BOLT",       hint: "⚡ Найбързият човек в историята — 9.58 сек",  category: "⚽ Спорт" },
  { word: "NEYMAR",     hint: "🇧🇷 Бразилски дрибльор — PSG и Барса",       category: "⚽ Спорт" },
  { word: "HAMILTON",   hint: "🏎️ F1 световен шампион 7 пъти",              category: "⚽ Спорт" },
  { word: "LEBRON",     hint: "👑 King James — NBA легенда",                 category: "⚽ Спорт" },
  { word: "RONALDO",    hint: "🇵🇹 CR7 — 5 Ballon d'Or",                    category: "⚽ Спорт" },
  { word: "DJOKOVIC",   hint: "🎾 Новак — 24 Grand Slam",                    category: "⚽ Спорт" },
  { word: "TIGER",      hint: "⛳ Tiger Woods — голф легенда",               category: "⚽ Спорт" },
  { word: "PHELPS",     hint: "🏊 Майкъл Фелпс — 23 олимпийски златни медала", category: "⚽ Спорт" },
  { word: "SERENA",     hint: "🎾 Серина Уилямс — 23 Grand Slam",           category: "⚽ Спорт" },

  // ═══════════ 🔬 НАУКА ═══════════
  { word: "GRAVITY",    hint: "🍎 Нютон и паднала ябълка",                   category: "🔬 Наука" },
  { word: "PHOTON",     hint: "💡 Частица от светлина",                      category: "🔬 Наука" },
  { word: "NEUTRON",    hint: "⚛️ Неутрална частица в ядрото",              category: "🔬 Наука" },
  { word: "PLASMA",     hint: "🔥 Четвъртото агрегатно състояние",           category: "🔬 Наука" },
  { word: "Darwin",     hint: "🦎 Теорията за еволюцията",                   category: "🔬 Наука" },
  { word: "NEWTON",     hint: "🍎 Законите на движението",                   category: "🔬 Наука" },
  { word: "EINSTEIN",   hint: "💡 E=mc² — теория на относителността",       category: "🔬 Наука" },
  { word: "OXYGEN",     hint: "💨 Газ необходим за дишане (O)",              category: "🔬 Наука" },
  { word: "CARBON",     hint: "⚫ Основата на органичния живот (C)",         category: "🔬 Наука" },
  { word: "GALAXY",     hint: "🌌 Млечен път е такава",                      category: "🔬 Наука" },
  { word: "NUCLEUS",    hint: "⚛️ Център на атома",                          category: "🔬 Наука" },
  { word: "VOLCANO",    hint: "🌋 Изригва лава и пепел",                     category: "🔬 Наука" },

  // ═══════════ 🍕 ХРАНА ═══════════
  { word: "PIZZA",      hint: "🍕 Италианско ястие с тесто и домати",        category: "🍕 Храна" },
  { word: "SUSHI",      hint: "🍣 Японски деликатес с ориз и риба",          category: "🍕 Храна" },
  { word: "BURGER",     hint: "🍔 Кифла + месо + зеленчуци",                 category: "🍕 Храна" },
  { word: "TACOS",      hint: "🌮 Мексиканска тортила с пълнеж",             category: "🍕 Храна" },
  { word: "RAMEN",      hint: "🍜 Японска супа с юфка",                      category: "🍕 Храна" },
  { word: "PASTA",      hint: "🍝 Италианско ястие от брашно",               category: "🍕 Храна" },
  { word: "WAFFLE",     hint: "🧇 Хрупкав решетъчен десерт",                 category: "🍕 Храна" },
  { word: "AVOCADO",    hint: "🥑 Зелен плод, тренди закуска",               category: "🍕 Храна" },
  { word: "CROISSANT",  hint: "🥐 Маслено Френско кифле",                    category: "🍕 Храна" },
  { word: "CHEESECAKE", hint: "🍰 Кремообразен десерт с крема сирене",       category: "🍕 Храна" },
  { word: "TIRAMISU",   hint: "☕ Италиански десерт с маскарпоне и кафе",    category: "🍕 Храна" },
  { word: "HUMMUS",     hint: "🫘 Близкоизточна намазка от нахут",           category: "🍕 Храна" },
];

// Difficulty word length limits
const DIFF_MAX_LEN = { easy: 6, medium: 8, hard: 99 };

function getWordsForDiff(diff, cats) {
  const maxLen = DIFF_MAX_LEN[diff];
  let pool = WORDS.filter(w => w.word.replace(/\s/g,'').length <= maxLen);
  if (!cats.has('all')) {
    pool = pool.filter(w => cats.has(w.category));
  }
  if (pool.length < 10) pool = WORDS; // fallback
  return shuffleArray(pool).slice(0, 10);
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function scrambleWord(word) {
  // Remove spaces for scrambling, keep only letters
  const letters = word.replace(/\s/g, '').split('');
  let scrambled;
  let attempts = 0;
  do {
    scrambled = shuffleArray(letters).join('');
    attempts++;
  } while (scrambled === word.replace(/\s/g,'') && attempts < 20);
  return scrambled;
}
