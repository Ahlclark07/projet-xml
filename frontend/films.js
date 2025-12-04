document.addEventListener("DOMContentLoaded", () => {
  const { bindConfigForm, apiFetch, showToast } = window.AppCommon;
  bindConfigForm();

  const filmsList = document.getElementById("films-list");
  const modal = document.getElementById("modal");
  const modalContent = document.getElementById("modal-content");
  const modalClose = document.getElementById("modal-close");
  const placeholderImg = "https://via.placeholder.com/400x250?text=Affiche";

  const renderSeances = (seances) => {
    if (!seances?.length) return '<p class="muted small">Pas de seances.</p>';
    return `<ul class="tags">${seances
      .map(
        (s) =>
          `<li class="tag">${s.day_of_week || ""} - ${s.start_time || ""}</li>`
      )
      .join("")}</ul>`;
  };

  const renderFilmCard = (film) => {
    const duration = film.duration_minutes
      ? `${film.duration_minutes} min`
      : "Duree inconnue";
    const img = film.image_url || placeholderImg;
    return `
      <article class="film-card" data-film-id="${film.id}">
        <img src="${img}" alt="${film.title || "Affiche"}">
        <div class="film-card__header">
          <div>
            <h3>${film.title || "Sans titre"}</h3>
            <p class="muted small">${film.language || "N/A"} ${
      film.subtitles ? ` - ST: ${film.subtitles}` : ""
    }</p>
          </div>
          <button class="button ghost small" data-detail="${
            film.id
          }">Details</button>
        </div>
        <p class="muted small">Realisateur : ${film.director || "?"}</p>
        <p class="muted small">Acteurs : ${film.main_cast || "?"}</p>
        <p class="muted small">Du ${film.start_date || "?"} au ${
      film.end_date || "?"
    } - ${duration}</p>
        <div class="seances">${renderSeances(film.seances)}</div>
      </article>
    `;
  };

  const renderFilms = (films) => {
    if (!films || !films.length) {
      filmsList.innerHTML =
        '<div class="empty-state">Aucun film pour cette ville.</div>';
      return;
    }
    filmsList.innerHTML = films.map(renderFilmCard).join("");
    filmsList
      .querySelectorAll("[data-detail]")
      .forEach((btn) =>
        btn.addEventListener("click", () => loadDetail(btn.dataset.detail))
      );
  };

  const renderDetail = (film) => {
    if (!film) {
      modalContent.innerHTML = '<div class="empty-state">Film introuvable.</div>';
      return;
    }
    const img = film.image_url || placeholderImg;
    modalContent.innerHTML = `
      <div class="film-detail__header">
        <div>
          <p class="eyebrow">Film #${film.id}</p>
          <h3>${film.title}</h3>
          <p class="muted small">${film.language || ""} ${
      film.subtitles ? ` - ST: ${film.subtitles}` : ""
    }</p>
        </div>
      </div>
      <img src="${img}" alt="${
      film.title || "Affiche"
    }" style="max-width: 100%; border-radius: 10px; border: 1px solid var(--border);">
      <p>${film.synopsis || ""}</p>
      <p class="muted small">Realisateur : ${film.director || "?"}</p>
      <p class="muted small">Acteurs : ${film.main_cast || "?"}</p>
      <p class="muted small">Age minimum : ${film.min_age ?? "Tous publics"}</p>
      <p class="muted small">Programmation : ${film.start_date || "?"} -> ${
      film.end_date || "?"
    }</p>
      <p class="muted small">Cinema ID : ${film.cinema_id ?? "?"}</p>
      <div class="seances">${renderSeances(film.seances)}</div>
    `;
    modal.classList.remove("hidden");
  };

  const handleError = (target, err) => {
    const message = err?.payload?.detail || err.message || "Erreur";
    target.innerHTML = `<div class="empty-state">${message}</div>`;
    showToast(message, "bad");
  };

  const loadList = async (city) => {
    const path = city ? `/films?ville=${encodeURIComponent(city)}` : "/films";
    filmsList.innerHTML = `<div class="muted small">Chargement...</div>`;
    try {
      const data = await apiFetch(path);
      const films = Array.isArray(data) ? data : data?.films;
      renderFilms(films);
      showToast("Programmation mise a jour", "ok");
    } catch (err) {
      handleError(filmsList, err);
    }
  };

  const loadDetail = async (id) => {
    modalContent.innerHTML = `<div class="muted small">Chargement...</div>`;
    modal.classList.remove("hidden");
    try {
      const data = await apiFetch(`/films/${id}`);
      renderDetail(data);
    } catch (err) {
      handleError(modalContent, err);
    }
  };

  document
    .getElementById("films-filter-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const city = e.target.city.value.trim();
      await loadList(city);
    });

  window.addEventListener("storage", (e) => {
    if (e.key === "refreshFilms") {
      document
        .getElementById("films-filter-form")
        ?.dispatchEvent(new Event("submit"));
      localStorage.removeItem("refreshFilms");
    }
  });

  document
    .getElementById("films-filter-form")
    ?.dispatchEvent(new Event("submit"));

  modalClose?.addEventListener("click", () => modal.classList.add("hidden"));
  modal?.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal__backdrop") || e.target === modal) {
      modal.classList.add("hidden");
    }
  });
});
