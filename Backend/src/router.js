const {
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
} = require('./handlers');
const { sendError } = require('./utils');

async function route(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const segments = url.pathname.split('/').filter(Boolean);
  const method = req.method.toUpperCase();

  if (url.pathname === '/health') {
    return res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"status":"ok"}');
  }

  try {
    if (segments.length === 2 && segments[0] === 'auth' && segments[1] === 'login' && method === 'POST') {
      return login(req, res);
    }

    // Owners
    if (segments.length === 1 && segments[0] === 'owners') {
      if (method === 'GET') return listOwners(req, res);
      if (method === 'POST') return createOwner(req, res);
    }

    // Cinemas
    if (segments.length === 1 && segments[0] === 'cinemas') {
      if (method === 'GET') return listCinemas(req, res);
      if (method === 'POST') return createCinema(req, res);
    }
    if (segments.length === 2 && segments[0] === 'cinemas' && method === 'GET') {
      return getCinema(req, res, segments[1]);
    }

    // Films
    if (segments.length === 1 && segments[0] === 'films') {
      if (method === 'GET') return listFilms(req, res, url.searchParams);
      if (method === 'POST') return createFilm(req, res);
    }
    if (segments.length === 2 && segments[0] === 'films') {
      if (method === 'GET') return getFilm(req, res, segments[1]);
      if (method === 'PUT') return updateFilm(req, res, segments[1]);
      if (method === 'DELETE') return deleteFilm(req, res, segments[1]);
    }
    if (segments.length === 3 && segments[0] === 'films' && segments[2] === 'seances') {
      if (method === 'GET') return getFilmSeances(req, res, segments[1]);
      if (method === 'POST') return addFilmSeances(req, res, segments[1]);
    }
  } catch (err) {
    sendError(res, 500, 'Internal error');
    return;
  }

  sendError(res, 404, 'Not found');
}

module.exports = { route };
