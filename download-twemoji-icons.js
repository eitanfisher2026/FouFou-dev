const https = require('https');
const fs = require('fs');
const path = require('path');

const mapping = {
  'i_all_restaurants':          '🍽️',
  'i_architecture_and_museums': '🏛️',
  'i_asian_food':               '🍜',
  'i_beaches_waterfront':       '🏖️',
  'i_brunch_coffee':            '🥐',
  'i_cat_dog_coffee':           '🐱',
  'i_churches':                 '⛪',
  'i_coffee':                   '☕',
  'i_craft_beer_pubs':          '🍺',
  'i_crafts_artisans':          '🧵',
  'i_day_markets':              '🧺',
  'i_day_street':               '🛣️',
  'i_entertainment':            '🎭',
  'i_fountain_and_statues':     '⛲',
  'i_galleries':                '🖼️',
  'i_kids':                     '🎡',
  'i_mediterranean_food':       '🥙',
  'i_mosque':                   '🕌',
  'i_nature':                   '🌿',
  'i_nightlife':                '🪩',
  'i_night_markets':            '🏮',
  'i_night_street':             '🌃',
  'i_parks_and_gardens':        '🌳',
  'i_rooftop':                  '🥂',
  'i_scenic_viewpoints':        '🔭',
  'i_shopping_malls':           '🏪',
  'i_spa_wellness':             '🧘',
  'i_specialty_stores':         '🛍️',
  'i_sports_stadiums':          '⚽',
  'i_street_art_murals':        '🎨',
  'i_street_food_day':          '🍢',
  'i_street_food_night':        '🍱',
  'i_sweets':                   '🧁',
  'i_synagogue':                '🕍',
  'i_temples':                  '🛕',
  'i_vegetarian_food':          '🥗',
  'i_vintage':                  '🕰️',
  'i_wine_cocktail_bars':       '🍷',
};

function emojiToCp(emoji, keepFe0f = false) {
  const cps = [...emoji].map(c => c.codePointAt(0).toString(16));
  return (keepFe0f ? cps : cps.filter(cp => cp !== 'fe0f')).join('-');
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      if (res.statusCode === 200) {
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      } else {
        file.close();
        try { fs.unlinkSync(dest); } catch {}
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    }).on('error', err => {
      try { fs.unlinkSync(dest); } catch {}
      reject(err);
    });
  });
}

async function tryDownload(emoji, dest) {
  const cp0 = emojiToCp(emoji, false);
  const cp1 = emojiToCp(emoji, true);
  const attempts = [
    `https://twemoji.maxcdn.com/v/latest/72x72/${cp0}.png`,
    `https://twemoji.maxcdn.com/v/latest/72x72/${cp1}.png`,
    `https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/${cp0}.png`,
    `https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/${cp1}.png`,
  ];
  for (const url of attempts) {
    try {
      await download(url, dest);
      return url;
    } catch {}
  }
  throw new Error('all attempts failed');
}

async function main() {
  const dir = path.join(__dirname, 'interest-icons');
  let ok = 0, fail = 0;

  for (const [id, emoji] of Object.entries(mapping)) {
    const dest = path.join(dir, `${id}.png`);
    try {
      const url = await tryDownload(emoji, dest);
      console.log(`✓  ${id}  ${emoji}  →  ${path.basename(url)}`);
      ok++;
    } catch (e) {
      console.log(`✗  ${id}  ${emoji}  →  FAILED`);
      fail++;
    }
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed`);
}

main();
