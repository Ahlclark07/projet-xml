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
    selects.forEach(
      (s) => (s.innerHTML = '<option value="">Chargement...</option>')
    );

    try {
      const data = await apiFetch("/films");
      const films = Array.isArray(data) ? data : data?.films || [];

      const optionsHtml = films.length
        ? `<option value="">-- Choisir un film --</option>` +
          films
            .map(
              (f) => `<option value="${f.id}">${f.title} (ID: ${f.id})</option>`
            )
            .join("")
        : '<option value="">Aucun film disponible</option>';

      selects.forEach((s) => (s.innerHTML = optionsHtml));
    } catch (err) {
      console.error("Error loading films for select:", err);
      selects.forEach(
        (s) => (s.innerHTML = '<option value="">Erreur de chargement</option>')
      );
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
  document
    .getElementById("cinema-create-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const payload = {
        name: form.name.value.trim(),
        city: form.city.value.trim(),
        address: form.address.value.trim(),
      };
      try {
        const data = await apiFetch("/cinemas", {
          method: "POST",
          body: payload,
          requireKey: true,
        });
        setStatus(cinemaCreateResult, `Cinema cree (#${data?.id || "?"})`);
        showToast("Cinema cree", "ok");
        markRefresh("refreshCinemas");
        form.reset();
      } catch (err) {
        handleError(cinemaCreateResult, err);
      }
    });

  // Gestion des seances pour POST/PUT film
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

  const seancesContainerCreate = document.getElementById("seances-list-create");
  const seancesContainerEdit = document.getElementById("seances-list-edit");

  document
    .getElementById("add-seance-create")
    ?.addEventListener("click", () => addSeanceRow(seancesContainerCreate));
  document
    .getElementById("add-seance-edit")
    ?.addEventListener("click", () => addSeanceRow(seancesContainerEdit));

  // Initiale rows for create form
  addSeanceRow(seancesContainerCreate, "Friday", "19:30");
  addSeanceRow(seancesContainerCreate, "Saturday", "21:00");

  const collectSeances = (container) => {
    const rows = Array.from(container?.querySelectorAll(".seance-row") || []);
    const sessions = rows
      .map((row) => {
        const day = row
          .querySelector('input[name="day_of_week"]')
          ?.value.trim();
        const start = row.querySelector('input[name="start_time"]')?.value;
        if (!day || !start) return null;
        return { day_of_week: day, start_time: start };
      })
      .filter(Boolean);
    // Allow empty seances for editing if needed, but usually we want at least one or it might clear them
    // For create, we enforce at least one. For edit, maybe same rule? Let's keep it strict.
    if (!sessions.length) throw new Error("Ajouter au moins une seance.");
    return sessions;
  };

  // ----------------------------------------------------
  // 1. CREATE FILM
  // ----------------------------------------------------
  const filmCreateForm = document.getElementById("film-create-form");
  const filmCreateResult = document.getElementById("film-create-result");

  filmCreateForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    let seances;
    try {
      seances = collectSeances(seancesContainerCreate);
    } catch (err) {
      showToast(err.message, "bad");
      return;
    }

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

    try {
      const data = await apiFetch("/films", {
        method: "POST",
        body: payload,
        requireKey: true,
      });
      setStatus(filmCreateResult, `Film cree (#${data?.id || "?"})`);
      showToast("Film cree avec succes", "ok");
      markRefresh("refreshFilms");
      loadFilmsForSelect(); // Reload select options
      form.reset();
      seancesContainerCreate.innerHTML = "";
      addSeanceRow(seancesContainerCreate, "Friday", "19:30");
    } catch (err) {
      handleError(filmCreateResult, err);
    }
  });

  // ----------------------------------------------------
  // 2. EDIT FILM
  // ----------------------------------------------------
  const filmEditForm = document.getElementById("film-edit-form");
  const filmEditResult = document.getElementById("film-edit-result");
  const filmSelectEdit = document.getElementById("film-select-edit");

  // Load film details when selected
  filmSelectEdit?.addEventListener("change", async (e) => {
    const filmId = e.target.value;
    if (!filmId) {
      filmEditForm.reset();
      seancesContainerEdit.innerHTML = "";
      return;
    }

    // Disable form while loading
    const fieldset = filmEditForm.querySelector("fieldset") || filmEditForm; // if we had fieldset

    try {
      const film = await apiFetch(`/films/${filmId}`);
      // Populate fields
      filmEditForm.title.value = film.title || "";
      filmEditForm.duration_minutes.value = film.duration_minutes || "";
      filmEditForm.language.value = film.language || "";
      filmEditForm.subtitles.value = film.subtitles || "";
      filmEditForm.director.value = film.director || "";
      filmEditForm.main_cast.value = film.main_cast || "";
      filmEditForm.min_age.value = film.min_age || "";
      filmEditForm.start_date.value = film.start_date || "";
      filmEditForm.end_date.value = film.end_date || "";
      filmEditForm.cinema_id.value = film.cinema_id || "";
      filmEditForm.image_url.value = film.image_url || "";

      // Populate seances
      seancesContainerEdit.innerHTML = "";
      if (film.seances && film.seances.length) {
        film.seances.forEach((s) =>
          addSeanceRow(seancesContainerEdit, s.day_of_week, s.start_time)
        );
      } else {
        addSeanceRow(seancesContainerEdit, "Friday", "20:00"); // default if empty
      }

      setStatus(filmEditResult, `Film #${film.id} charge.`);
    } catch (err) {
      handleError(filmEditResult, err);
    }
  });

  filmEditForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const filmId = form.filmId.value;

    if (!filmId) {
      showToast("Veuillez selectionner un film", "bad");
      return;
    }

    let seances;
    try {
      seances = collectSeances(seancesContainerEdit);
    } catch (err) {
      showToast(err.message, "bad");
      return;
    }

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

    try {
      await apiFetch(`/films/${filmId}`, {
        method: "PUT",
        body: payload,
        requireKey: true,
      });
      setStatus(filmEditResult, `Film #${filmId} mis a jour`);
      showToast("Film mis a jour", "ok");
      markRefresh("refreshFilms");
      loadFilmsForSelect();
    } catch (err) {
      handleError(filmEditResult, err);
    }
  });

  // Ajouter des seances sans ecraser (POST /films/{id}/seances)
  const extraContainer = document.getElementById("seances-list-extra");
  const addExtraRow = (day = "", time = "") =>
    addSeanceRow(extraContainer, day, time);
  document
    .getElementById("add-seance-extra")
    ?.addEventListener("click", () => addExtraRow());
  addExtraRow("Friday", "18:00");

  document
    .getElementById("seance-add-form")
    ?.addEventListener("submit", async (e) => {
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
  document
    .getElementById("delete-film-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = e.target.filmId.value;
      try {
        const data = await apiFetch(`/films/${id}`, {
          method: "DELETE",
          requireKey: true,
        });
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
