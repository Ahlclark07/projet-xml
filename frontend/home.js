document.addEventListener("DOMContentLoaded", async () => {
  const { apiFetch, showToast } = window.AppCommon;

  const filmsGrid = document.getElementById("home-films-grid");
  const cinemasGrid = document.getElementById("home-cinemas-grid");

  // --- Render Functions ---

  const renderFilmCard = (film) => {
    const card = document.createElement("div");
    card.className = "film-card";
    
    // Fallback image if none provided
    const image = film.image_url || "https://via.placeholder.com/300x450/1e293b/94a3b8?text=Affiche";
    
    card.innerHTML = `
      <img src="${image}" alt="${film.title}" class="film-poster" loading="lazy">
      <div class="film-content">
        <div class="film-title">${film.title}</div>
        <div class="film-meta">
          <span>${film.duration_minutes} min</span>
          <span>•</span>
          <span>${film.director}</span>
        </div>
        <div class="tags">
          <span class="tag">${film.language}</span>
          ${film.min_age ? `<span class="tag">-${film.min_age}</span>` : ""}
        </div>
      </div>
    `;
    // Make the whole card clickable
    const link = document.createElement("a");
    link.href = `films.html?id=${film.id}`;
    link.style.textDecoration = "none";
    link.appendChild(card);
    return link;
  };

  const renderCinemaCard = (cinema) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${cinema.name}</h3>
      <p class="muted" style="margin-top: 8px;">${cinema.address}</p>
      <p class="eyebrow" style="margin-top: 12px; display: inline-block;">${cinema.city}</p>
    `;
    return card;
  };

  // --- Data Fetching ---

  try {
    // Fetch Films
    const {films} = await apiFetch("/films");
    filmsGrid.innerHTML = "";
    // Show top 4 films
    films.slice(0, 4).forEach(film => {
      filmsGrid.appendChild(renderFilmCard(film));
    });
    if (films.length === 0) {
      filmsGrid.innerHTML = `<div class="card" style="grid-column: 1/-1;">Aucun film pour le moment.</div>`;
    }

    // Fetch Cinemas
    const {cinemas} = await apiFetch("/cinemas");
    cinemasGrid.innerHTML = "";
    // Show top 3 cinemas
    cinemas.slice(0, 3).forEach(cinema => {
      cinemasGrid.appendChild(renderCinemaCard(cinema));
    });
    if (cinemas.length === 0) {
      cinemasGrid.innerHTML = `<div class="card" style="grid-column: 1/-1;">Aucun cinéma trouvé.</div>`;
    }

  } catch (err) {
    console.error("Home fetch error:", err);
    showToast("Impossible de charger les données.", "bad");
    filmsGrid.innerHTML = `<div class="card" style="grid-column: 1/-1; color: var(--danger);">Erreur de chargement.</div>`;
    cinemasGrid.innerHTML = `<div class="card" style="grid-column: 1/-1; color: var(--danger);">Erreur de chargement.</div>`;
  }
});
