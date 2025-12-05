const { init, db } = require('./db');
const crypto = require('node:crypto');

const cinemasData = [
  { name: 'Cinema Central', address: '1 Rue Exemple', city: 'Paris' },
  { name: 'Lumiere Lyon', address: '25 Quai du Rhone', city: 'Lyon' },
  { name: 'Mediterranee Marseille', address: '8 Rue Paradis', city: 'Marseille' },
  { name: 'Capitole Toulouse', address: '4 Place du Capitole', city: 'Toulouse' },
];

const filmsData = [
  {
    title: 'Inception',
    image_url: 'https://m.media-amazon.com/images/I/51v5ZpFyaFL._AC_.jpg',
    duration_minutes: 148,
    director: 'Christopher Nolan',
    main_cast: 'Leonardo DiCaprio, Joseph Gordon-Levitt',
    cinema: 'Cinema Central',
  },
  {
    title: 'Interstellar',
    image_url: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    duration_minutes: 169,
    director: 'Christopher Nolan',
    main_cast: 'Matthew McConaughey, Anne Hathaway',
    cinema: 'Lumiere Lyon',
  },
  {
    title: 'The Dark Knight',
    image_url: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    duration_minutes: 152,
    director: 'Christopher Nolan',
    main_cast: 'Christian Bale, Heath Ledger',
    cinema: 'Cinema Central',
  },
  {
    title: 'Dune',
    image_url: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg',
    duration_minutes: 155,
    director: 'Denis Villeneuve',
    main_cast: 'Timothee Chalamet, Rebecca Ferguson',
    cinema: 'Mediterranee Marseille',
  },
  {
    title: 'Mad Max: Fury Road',
    image_url: 'https://image.tmdb.org/t/p/w500/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg',
    duration_minutes: 120,
    director: 'George Miller',
    main_cast: 'Tom Hardy, Charlize Theron',
    cinema: 'Capitole Toulouse',
  },
  {
    title: 'Arrival',
    image_url: 'https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg',
    duration_minutes: 116,
    director: 'Denis Villeneuve',
    main_cast: 'Amy Adams, Jeremy Renner',
    cinema: 'Lumiere Lyon',
  },
  {
    title: 'Blade Runner 2049',
    image_url: 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
    duration_minutes: 164,
    director: 'Denis Villeneuve',
    main_cast: 'Ryan Gosling, Harrison Ford',
    cinema: 'Mediterranee Marseille',
  },
  {
    title: 'Whiplash',
    image_url: 'https://image.tmdb.org/t/p/w500/oPxnRhyAIzJKGUEdSiwTJQBa3NM.jpg',
    duration_minutes: 107,
    director: 'Damien Chazelle',
    main_cast: 'Miles Teller, J.K. Simmons',
    cinema: 'Cinema Central',
  },
  {
    title: 'Parasite',
    image_url: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    duration_minutes: 132,
    director: 'Bong Joon-ho',
    main_cast: 'Song Kang-ho, Lee Sun-kyun',
    cinema: 'Capitole Toulouse',
  },
  {
    title: 'La La Land',
    image_url: 'https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg',
    duration_minutes: 128,
    director: 'Damien Chazelle',
    main_cast: 'Emma Stone, Ryan Gosling',
    cinema: 'Cinema Central',
  },
  {
    title: 'The Grand Budapest Hotel',
    image_url: 'https://image.tmdb.org/t/p/w500/ncEsesgOJDNrTUED89hYbA117wo.jpg',
    duration_minutes: 100,
    director: 'Wes Anderson',
    main_cast: 'Ralph Fiennes, Tony Revolori',
    cinema: 'Lumiere Lyon',
  },
  {
    title: 'Skyfall',
    image_url: 'https://image.tmdb.org/t/p/w500/ghL4AZbVY9V9xglKcDq6P0I38An.jpg',
    duration_minutes: 143,
    director: 'Sam Mendes',
    main_cast: 'Daniel Craig, Judi Dench',
    cinema: 'Mediterranee Marseille',
  },
  {
    title: 'Spirited Away',
    image_url: 'https://image.tmdb.org/t/p/w500/dL11DBPcRhWWnJcFXl9A07MrqTI.jpg',
    duration_minutes: 125,
    language: 'VOST',
    subtitles: 'VF',
    min_age: 8,
    director: 'Hayao Miyazaki',
    main_cast: 'Chihiro, Haku',
    cinema: 'Capitole Toulouse',
  },
  {
    title: 'The Social Network',
    image_url: 'https://image.tmdb.org/t/p/w500/n0ybibhJtQ5icDqTp8eRytcIHJx.jpg',
    duration_minutes: 120,
    director: 'David Fincher',
    main_cast: 'Jesse Eisenberg, Andrew Garfield',
    cinema: 'Cinema Central',
  },
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

function ensureCinemas() {
  const mapping = new Map();
  const select = db.prepare('SELECT id FROM cinemas WHERE name = ? AND city = ?');
  const insert = db.prepare('INSERT INTO cinemas (name, address, city) VALUES (?, ?, ?)');
  for (const cinema of cinemasData) {
    const existing = select.get(cinema.name, cinema.city);
    if (existing) {
      mapping.set(cinema.name, existing.id);
    } else {
      const info = insert.run(cinema.name, cinema.address, cinema.city);
      mapping.set(cinema.name, info.lastInsertRowid);
    }
  }
  return mapping;
}

function resolveCinemaId(film, cinemaMap) {
  if (film.cinema && cinemaMap.has(film.cinema)) {
    return cinemaMap.get(film.cinema);
  }
  const first = cinemaMap.values().next();
  return first.done ? null : first.value;
}

function seedFilms(ownerId, cinemaMap) {
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
    const cinemaId = resolveCinemaId(film, cinemaMap);
    if (!cinemaId) {
      throw new Error('No cinema available to attach films');
    }
    const exists = db.prepare('SELECT id, image_url, cinema_id FROM films WHERE title = ?').get(film.title);
    if (exists) {
      const updates = [];
      const values = [];
      if (film.image_url && film.image_url !== exists.image_url) {
        updates.push('image_url = ?');
        values.push(film.image_url);
      }
      if (exists.cinema_id !== cinemaId) {
        updates.push('cinema_id = ?');
        values.push(cinemaId);
      }
      if (updates.length) {
        values.push(exists.id);
        db.prepare(`UPDATE films SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      }
      continue;
    }
    const startDate = film.start_date || '2025-01-10';
    const endDate = film.end_date || '2025-02-20';
    const duration = film.duration_minutes || 120;
    const language = film.language || 'VO';
    const subtitles = film.subtitles || 'VF';
    const director = film.director || 'Various';
    const mainCast = film.main_cast || 'Main Cast';
    const minAge = film.min_age ?? 12;
    const filmInfo = insertFilm.run(
      film.title,
      duration,
      language,
      subtitles,
      director,
      mainCast,
      minAge,
      startDate,
      endDate,
      cinemaId,
      ownerId,
      film.image_url,
    );
    const filmId = filmInfo.lastInsertRowid;
    const seances = film.seances || randomSeances();
    for (const s of seances) {
      insertSeance.run(filmId, s.day_of_week, s.start_time);
    }
  }
}

function main() {
  init();
  const owner = ensureAdminOwner();
  const cinemaMap = ensureCinemas();
  seedFilms(owner.id, cinemaMap);
  console.log('Seed done. Admin API key: admin');
}

main();
