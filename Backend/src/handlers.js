const crypto = require('node:crypto');
const { db } = require('./db');
const {
  sendJson,
  sendError,
  readJson,
  parseId,
  toPojo,
  validateDate,
} = require('./utils');

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function requireOwner(req, res) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    sendError(res, 401, 'Missing X-API-Key');
    return null;
  }
  const owner = db.prepare('SELECT id, name FROM owners WHERE api_key = ?').get(apiKey);
  if (!owner) {
    sendError(res, 403, 'Invalid API key');
    return null;
  }
  return owner;
}

function fetchSeances(filmId) {
  const rows = db
    .prepare('SELECT id, day_of_week, start_time FROM seances WHERE film_id = ?')
    .all(filmId);
  return rows.map(toPojo);
}

async function listOwners(req, res) {
  const rows = db.prepare('SELECT id, name FROM owners').all();
  sendJson(res, 200, { owners: rows.map(toPojo) });
}

async function createOwner(req, res) {
  try {
    const body = await readJson(req);
    if (!body || !body.name || !body.username || !body.password) {
      sendError(res, 400, 'Missing name/username/password');
      return;
    }
    const apiKey = crypto.randomBytes(16).toString('hex');
    const info = db
      .prepare(
        'INSERT INTO owners (name, api_key, username, password_hash) VALUES (?, ?, ?, ?)',
      )
      .run(body.name, apiKey, body.username, hashPassword(body.password));
    sendJson(res, 201, {
      id: info.lastInsertRowid,
      name: body.name,
      username: body.username,
      api_key: apiKey,
    });
  } catch (err) {
    sendError(res, 400, err.message || 'Bad request');
  }
}

async function listCinemas(req, res) {
  const rows = db.prepare('SELECT * FROM cinemas').all();
  sendJson(res, 200, { cinemas: rows.map(toPojo) });
}

async function getCinema(req, res, cinemaIdRaw) {
  const cinemaId = parseId(cinemaIdRaw);
  if (!cinemaId) {
    sendError(res, 400, 'Invalid cinema id');
    return;
  }
  const row = db.prepare('SELECT * FROM cinemas WHERE id = ?').get(cinemaId);
  if (!row) {
    sendError(res, 404, 'Cinema not found');
    return;
  }
  sendJson(res, 200, toPojo(row));
}

async function createCinema(req, res) {
  const owner = requireOwner(req, res);
  if (!owner) return;
  try {
    const body = await readJson(req);
    const required = ['name', 'address', 'city'];
    if (!body || !required.every((k) => body[k])) {
      sendError(res, 400, 'Missing fields');
      return;
    }
    const stmt = db.prepare('INSERT INTO cinemas (name, address, city) VALUES (?, ?, ?)');
    const info = stmt.run(body.name, body.address, body.city);
    sendJson(res, 201, {
      id: info.lastInsertRowid,
      name: body.name,
      address: body.address,
      city: body.city,
    });
  } catch (err) {
    sendError(res, 400, err.message || 'Bad request');
  }
}

async function listFilms(req, res, searchParams) {
  const city = searchParams.get('ville');
  let rows;
  if (city) {
    rows = db
      .prepare(
        `
        SELECT f.*, c.name AS cinema_name, c.city
        FROM films f
        JOIN cinemas c ON c.id = f.cinema_id
        WHERE c.city = ?
      `,
      )
      .all(city);
  } else {
    rows = db
      .prepare(
        `
        SELECT f.*, c.name AS cinema_name, c.city
        FROM films f
        JOIN cinemas c ON c.id = f.cinema_id
      `,
      )
      .all();
  }
  const films = rows.map((row) => {
    const film = toPojo(row);
    film.seances = fetchSeances(row.id);
    return film;
  });
  sendJson(res, 200, { films });
}

async function getFilm(req, res, filmIdRaw) {
  const filmId = parseId(filmIdRaw);
  if (!filmId) {
    sendError(res, 400, 'Invalid film id');
    return;
  }
  const row = db
    .prepare(
      `
      SELECT f.*, c.name AS cinema_name, c.city
      FROM films f
      JOIN cinemas c ON c.id = f.cinema_id
      WHERE f.id = ?
    `,
    )
    .get(filmId);
  if (!row) {
    sendError(res, 404, 'Film not found');
    return;
  }
  const film = toPojo(row);
  film.seances = fetchSeances(filmId);
  sendJson(res, 200, film);
}

async function getFilmSeances(req, res, filmIdRaw) {
  const filmId = parseId(filmIdRaw);
  if (!filmId) {
    sendError(res, 400, 'Invalid film id');
    return;
  }
  const exists = db.prepare('SELECT id FROM films WHERE id = ?').get(filmId);
  if (!exists) {
    sendError(res, 404, 'Film not found');
    return;
  }
  const seances = fetchSeances(filmId);
  sendJson(res, 200, { film_id: filmId, seances });
}

function validateFilmPayload(body, requireSeances = true) {
  const required = [
    'title',
    'duration_minutes',
    'language',
    'director',
    'main_cast',
    'min_age',
    'start_date',
    'end_date',
    'cinema_id',
    'image_url',
  ];
  if (!body || !required.every((k) => body[k] !== undefined && body[k] !== null)) {
    return 'Missing fields';
  }
  if (!validateDate(body.start_date) || !validateDate(body.end_date)) {
    return 'Dates must be YYYY-MM-DD';
  }
  if (requireSeances && (!Array.isArray(body.seances) || body.seances.length === 0)) {
    return 'Seances must be a non-empty array';
  }
  return null;
}

async function createFilm(req, res) {
  const owner = requireOwner(req, res);
  if (!owner) return;
  let body;
  try {
    body = await readJson(req);
  } catch (err) {
    sendError(res, 400, err.message);
    return;
  }
  const validationError = validateFilmPayload(body, true);
  if (validationError) {
    sendError(res, 400, validationError);
    return;
  }
  const filmStmt = db.prepare(
    `
    INSERT INTO films
    (title, duration_minutes, language, subtitles, director, main_cast, min_age, start_date, end_date, cinema_id, owner_id, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  );
  const seanceStmt = db.prepare(
    'INSERT INTO seances (film_id, day_of_week, start_time) VALUES (?, ?, ?)',
  );
  db.exec('BEGIN');
  try {
    const filmInfo = filmStmt.run(
      body.title,
      body.duration_minutes,
      body.language,
      body.subtitles || null,
      body.director,
      body.main_cast,
      body.min_age,
      body.start_date,
      body.end_date,
      body.cinema_id,
      owner.id,
      body.image_url || null,
    );
    const filmId = filmInfo.lastInsertRowid;
    for (const s of body.seances) {
      if (!s || !s.day_of_week || !s.start_time) {
        throw new Error('Each seance needs day_of_week and start_time');
      }
      seanceStmt.run(filmId, s.day_of_week, s.start_time);
    }
    db.exec('COMMIT');
    await getFilm(req, res, String(filmId));
  } catch (err) {
    db.exec('ROLLBACK');
    sendError(res, 400, err.message || 'Failed to create film');
  }
}

async function updateFilm(req, res, filmIdRaw) {
  const owner = requireOwner(req, res);
  if (!owner) return;
  const filmId = parseId(filmIdRaw);
  if (!filmId) {
    sendError(res, 400, 'Invalid film id');
    return;
  }
  let body;
  try {
    body = await readJson(req);
  } catch (err) {
    sendError(res, 400, err.message);
    return;
  }
  if (!body || Object.keys(body).length === 0) {
    sendError(res, 400, 'Missing body');
    return;
  }
  const fields = [
    'title',
    'duration_minutes',
    'language',
    'subtitles',
    'director',
    'main_cast',
    'min_age',
    'start_date',
    'end_date',
    'cinema_id',
  ];
  const sets = [];
  const values = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      if ((f === 'start_date' || f === 'end_date') && !validateDate(body[f])) {
        sendError(res, 400, 'Dates must be YYYY-MM-DD');
        return;
      }
      sets.push(`${f} = ?`);
      values.push(body[f]);
    }
  }
  db.exec('BEGIN');
  try {
    if (sets.length) {
      values.push(filmId);
      db.prepare(`UPDATE films SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }
    if (body.seances) {
      if (!Array.isArray(body.seances)) {
        throw new Error('Seances must be an array');
      }
      db.prepare('DELETE FROM seances WHERE film_id = ?').run(filmId);
      const seanceStmt = db.prepare(
        'INSERT INTO seances (film_id, day_of_week, start_time) VALUES (?, ?, ?)',
      );
      for (const s of body.seances) {
        if (!s || !s.day_of_week || !s.start_time) {
          throw new Error('Each seance needs day_of_week and start_time');
        }
        seanceStmt.run(filmId, s.day_of_week, s.start_time);
      }
    }
    db.exec('COMMIT');
    await getFilm(req, res, String(filmId));
  } catch (err) {
    db.exec('ROLLBACK');
    sendError(res, 400, err.message || 'Failed to update film');
  }
}

async function deleteFilm(req, res, filmIdRaw) {
  const owner = requireOwner(req, res);
  if (!owner) return;
  const filmId = parseId(filmIdRaw);
  if (!filmId) {
    sendError(res, 400, 'Invalid film id');
    return;
  }
  const info = db.prepare('DELETE FROM films WHERE id = ?').run(filmId);
  if (info.changes === 0) {
    sendError(res, 404, 'Film not found');
    return;
  }
  sendJson(res, 200, { deleted: filmId });
}

async function addFilmSeances(req, res, filmIdRaw) {
  const owner = requireOwner(req, res);
  if (!owner) return;
  const filmId = parseId(filmIdRaw);
  if (!filmId) {
    sendError(res, 400, 'Invalid film id');
    return;
  }
  const exists = db.prepare('SELECT id FROM films WHERE id = ?').get(filmId);
  if (!exists) {
    sendError(res, 404, 'Film not found');
    return;
  }
  let body;
  try {
    body = await readJson(req);
  } catch (err) {
    sendError(res, 400, err.message);
    return;
  }
  if (!body || !Array.isArray(body.seances) || body.seances.length === 0) {
    sendError(res, 400, 'Seances must be a non-empty array');
    return;
  }
  const stmt = db.prepare('INSERT INTO seances (film_id, day_of_week, start_time) VALUES (?, ?, ?)');
  db.exec('BEGIN');
  try {
    for (const s of body.seances) {
      if (!s || !s.day_of_week || !s.start_time) {
        throw new Error('Each seance needs day_of_week and start_time');
      }
      stmt.run(filmId, s.day_of_week, s.start_time);
    }
    db.exec('COMMIT');
    const seances = fetchSeances(filmId);
    sendJson(res, 201, { film_id: filmId, seances });
  } catch (err) {
    db.exec('ROLLBACK');
    sendError(res, 400, err.message || 'Failed to add seances');
  }
}

async function login(req, res) {
  let body;
  try {
    body = await readJson(req);
  } catch (err) {
    sendError(res, 400, err.message);
    return;
  }
  if (!body || !body.username || !body.password) {
    sendError(res, 400, 'Missing username/password');
    return;
  }
  const user = db
    .prepare('SELECT id, name, username, api_key, password_hash FROM owners WHERE username = ?')
    .get(body.username);
  if (!user || user.password_hash !== hashPassword(body.password)) {
    sendError(res, 401, 'Invalid credentials');
    return;
  }
  sendJson(res, 200, {
    id: user.id,
    name: user.name,
    username: user.username,
    api_key: user.api_key,
  });
}

module.exports = {
  listOwners,
  createOwner,
  listCinemas,
  getCinema,
  createCinema,
  listFilms,
  getFilm,
  getFilmSeances,
  createFilm,
  updateFilm,
  deleteFilm,
  addFilmSeances,
  login,
};
