document.addEventListener("DOMContentLoaded", () => {
  const { apiFetch, showToast, getConfig } = window.AppCommon;

  const cinemaCreateResult = document.getElementById("cinema-create-result");
  const filmFormResult = document.getElementById("film-form-result");
  const deleteFilmResult = document.getElementById("delete-film-result");
  const seanceAddResult = document.getElementById("seance-add-result");
  const markRefresh = (key) => localStorage.setItem(key, Date.now().toString());

  const setStatus = (el, message) => {
    if (el) el.textContent = message;
  };

  const handleError = (target, err) => {
    const message = err?.payload?.detail || err.message || "Erreur";
    setStatus(target, message);
    showToast(message, "bad");
  };

  const { apiKey } = getConfig();
  if (!apiKey) {
    showToast("Connectez-vous d'abord", "bad");
    window.location.href = "admin-login.html";
    return;
  }

  // --- New Logic: Load Films for Select ---
  const loadFilmsForSelect = async () => {
    const selects = document.querySelectorAll("select[name='filmId']");
    if (!selects.length) return;

    // Add loading state
    selects.forEach(s => s.innerHTML = '<option value="">Chargement...</option>');

    try {
      const data = await apiFetch("/films");
      const films = Array.isArray(data) ? data : data?.films || [];
      
      const optionsHtml = films.length 
        ? `<option value="">-- Choisir un film --</option>` + 
          films.map(f => `<option value="${f.id}">${f.title} (ID: ${f.id})</option>`).join("")
        : '<option value="">Aucun film disponible</option>';

      selects.forEach(s => s.innerHTML = optionsHtml);
    } catch (err) {
      console.error("Error loading films for select:", err);
      selects.forEach(s => s.innerHTML = '<option value="">Erreur de chargement</option>');
      showToast("Impossible de charger la liste des films", "bad");
    }
  };

  // Load films initially
  loadFilmsForSelect();

  // Refresh films list when a film is created/deleted
  window.addEventListener("storage", (e) => {
    if (e.key === "refreshFilms") {
      loadFilmsForSelect();
    }
  });

  // Creer un cinema
  document.getElementById("cinema-create-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      name: form.name.value.trim(),
      city: form.city.value.trim(),
      address: form.address.value.trim(),
    };
    try {
      const data = await apiFetch("/cinemas", { method: "POST", body: payload, requireKey: true });
      setStatus(cinemaCreateResult, `Cinema cree (#${data?.id || "?"})`);
      showToast("Cinema cree", "ok");
      markRefresh("refreshCinemas");
      form.reset();
    } catch (err) {
      handleError(cinemaCreateResult, err);
    }
  });

  // Gestion des seances pour POST/PUT film
  const seancesContainer = document.getElementById("seances-list");
  const addSeanceRow = (container, day = "", time = "") => {
    if (!container) return;
    const row = document.createElement("div");
    row.className = "seance-row";
    row.innerHTML = `
      <label class="field">
        <span>Jour (Monday, Friday...)</span>
        <input type="text" name="day_of_week" placeholder="Friday" value="${day}" required>
      </label>
      <label class="field">
        <span>Heure (HH:MM)</span>
        <input type="time" name="start_time" value="${time}" required>
      </label>
      <button type="button" class="button ghost small remove">Supprimer</button>
    `;
    row.querySelector(".remove")?.addEventListener("click", () => row.remove());
    container.appendChild(row);
  };

  document.getElementById("add-seance")?.addEventListener("click", () => addSeanceRow(seancesContainer));
  addSeanceRow(seancesContainer, "Friday", "19:30");
  addSeanceRow(seancesContainer, "Saturday", "21:00");
  addSeanceRow(seancesContainer, "Sunday", "17:00");

  const collectSeances = (container) => {
    const rows = Array.from(container?.querySelectorAll(".seance-row") || []);
    const sessions = rows
      .map((row) => {
        const day = row.querySelector('input[name="day_of_week"]')?.value.trim();
        const start = row.querySelector('input[name="start_time"]')?.value;
        if (!day || !start) return null;
        return { day_of_week: day, start_time: start };
      })
      .filter(Boolean);
    if (!sessions.length) throw new Error("Ajouter au moins une seance.");
    return sessions;
  };

  // Creer ou mettre a jour un film (POST/PUT)
  document.getElementById("film-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    let seances;
    try {
      seances = collectSeances(seancesContainer);
    } catch (err) {
      showToast(err.message, "bad");
      return;
    }

    const filmId = form.filmId.value.trim();
    const payload = {
      title: form.title.value.trim(),
      duration_minutes: Number(form.duration_minutes.value),
      language: form.language.value.trim(),
      subtitles: form.subtitles.value.trim(),
      director: form.director.value.trim(),
      main_cast: form.main_cast.value.trim(),
      min_age: form.min_age.value ? Number(form.min_age.value) : null,
      start_date: form.start_date.value,
      end_date: form.end_date.value,
      cinema_id: Number(form.cinema_id.value),
      image_url: form.image_url.value.trim(),
      seances,
    };

    if (!payload.subtitles) delete payload.subtitles;
    if (!payload.image_url) delete payload.image_url;
    if (payload.min_age === null || Number.isNaN(payload.min_age)) delete payload.min_age;

    const method = filmId ? "PUT" : "POST";
    const path = filmId ? `/films/${filmId}` : "/films";

    try {
      const data = await apiFetch(path, { method, body: payload, requireKey: true });
      setStatus(filmFormResult, `${filmId ? "Film mis a jour" : "Film cree"} (#${data?.id || filmId || "?"})`);
      showToast(filmId ? "Film mis a jour" : "Film cree", "ok");
      showToast(filmId ? "Film mis a jour" : "Film cree", "ok");
      markRefresh("refreshFilms");
      // Reload selects locally too
      loadFilmsForSelect();
    } catch (err) {
      handleError(filmFormResult, err);
    }
  });

  // Ajouter des seances sans ecraser (POST /films/{id}/seances)
  const extraContainer = document.getElementById("seances-list-extra");
  const addExtraRow = (day = "", time = "") => addSeanceRow(extraContainer, day, time);
  document.getElementById("add-seance-extra")?.addEventListener("click", () => addExtraRow());
  addExtraRow("Friday", "18:00");

  document.getElementById("seance-add-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    let seances;
    try {
      seances = collectSeances(extraContainer);
    } catch (err) {
      showToast(err.message, "bad");
      return;
    }
    const filmId = form.filmId.value.trim();
    try {
      const data = await apiFetch(`/films/${filmId}/seances`, {
        method: "POST",
        body: { seances },
        requireKey: true,
      });
      setStatus(seanceAddResult, data?.detail || "Seances ajoutees");
      showToast("Seances ajoutees", "ok");
      markRefresh("refreshFilms");
    } catch (err) {
      handleError(seanceAddResult, err);
    }
  });

  // Supprimer un film
  document.getElementById("delete-film-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = e.target.filmId.value;
    try {
      const data = await apiFetch(`/films/${id}`, { method: "DELETE", requireKey: true });
      setStatus(deleteFilmResult, data?.detail || "Film supprime");
      showToast("Film supprime", "ok");
      showToast("Film supprime", "ok");
      markRefresh("refreshFilms");
      // Reload selects locally too
      loadFilmsForSelect();
    } catch (err) {
      handleError(deleteFilmResult, err);
    }
  });
});
