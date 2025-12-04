const { init, db } = require('./db');
const crypto = require('node:crypto');

const filmsData = [
  { title: 'Inception', image_url: 'https://image.tmdb.org/t/p/w500/qmDpIHrmpJINaRKAfWQfftjCdyi.jpg' },
  { title: 'Interstellar', image_url: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg' },
  { title: 'The Dark Knight', image_url: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg' },
  { title: 'Dune', image_url: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg' },
  { title: 'Mad Max: Fury Road', image_url: 'https://image.tmdb.org/t/p/w500/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg' },
  { title: 'Arrival', image_url: 'https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg' },
  { title: 'Blade Runner 2049', image_url: 'https://image.tmdb.org/t/p/w500/aMpyrCizvSgcJ1nF7nHZ6isLuEw.jpg' },
  { title: 'Whiplash', image_url: 'https://image.tmdb.org/t/p/w500/oPxnRhyAIzJKGUEdSiwTJQBa3NM.jpg' },
  { title: 'Parasite', image_url: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg' },
  { title: 'La La Land', image_url: 'https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg' },
];

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSeances() {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const times = ['14:00', '17:00', '20:00', '22:30'];
  const count = 3;
  const chosen = new Set();
  const out = [];
  while (out.length < count) {
    const day = randomFrom(days);
    if (chosen.has(day)) continue;
    chosen.add(day);
    out.push({ day_of_week: day, start_time: randomFrom(times) });
  }
  return out;
}

function ensureAdminOwner() {
  const existing = db
    .prepare('SELECT id, api_key, username FROM owners WHERE username = ? OR name = ?')
    .get('admin', 'admin');
  const apiKey = 'admin';
  const passwordHash = hashPassword('admin');
  if (existing) {
    db.prepare('UPDATE owners SET username = ?, password_hash = ?, api_key = ? WHERE id = ?').run(
      'admin',
      passwordHash,
      apiKey,
      existing.id,
    );
    return { id: existing.id, api_key: apiKey };
  }
  const info = db
    .prepare('INSERT INTO owners (name, api_key, username, password_hash) VALUES (?, ?, ?, ?)')
    .run('admin', apiKey, 'admin', passwordHash);
  return { id: info.lastInsertRowid, api_key: apiKey };
}

function ensureCinema() {
  const existing = db.prepare('SELECT id FROM cinemas LIMIT 1').get();
  if (existing) return existing.id;
  const info = db
    .prepare('INSERT INTO cinemas (name, address, city) VALUES (?, ?, ?)')
    .run('Cinema Central', '1 Rue Exemple', 'Paris');
  return info.lastInsertRowid;
}

function seedFilms(ownerId, cinemaId) {
  const insertFilm = db.prepare(
    `
    INSERT INTO films
    (title, duration_minutes, language, subtitles, director, main_cast, min_age, start_date, end_date, cinema_id, owner_id, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  );
  const insertSeance = db.prepare(
    'INSERT INTO seances (film_id, day_of_week, start_time) VALUES (?, ?, ?)',
  );

  for (const film of filmsData) {
    const exists = db.prepare('SELECT id FROM films WHERE title = ?').get(film.title);
    if (exists) continue;
    const startDate = '2025-01-10';
    const endDate = '2025-02-20';
    const filmInfo = insertFilm.run(
      film.title,
      120,
      'VO',
      'VF',
      'Various',
      'Main Cast',
      12,
      startDate,
      endDate,
      cinemaId,
      ownerId,
      film.image_url,
    );
    const filmId = filmInfo.lastInsertRowid;
    const seances = randomSeances();
    for (const s of seances) {
      insertSeance.run(filmId, s.day_of_week, s.start_time);
    }
  }
}

function main() {
  init();
  const owner = ensureAdminOwner();
  const cinemaId = ensureCinema();
  seedFilms(owner.id, cinemaId);
  console.log('Seed done. Admin API key: admin');
}

main();
