document.addEventListener("DOMContentLoaded", () => {
  const { bindConfigForm, apiFetch, showToast } = window.AppCommon;
  bindConfigForm();

  const listBox = document.getElementById("cinemas-list");
  const modal = document.getElementById("modal");
  const modalContent = document.getElementById("modal-content");
  const modalClose = document.getElementById("modal-close");

  const renderCinemaCard = (cinema) => `
    <article class="card" data-cinema-id="${cinema.id}">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <div>
          <h3 style="color: #fff; font-size: 1.2rem;">${cinema.name}</h3>
          <p class="eyebrow" style="margin-top: 4px; display: inline-block;">${cinema.city}</p>
        </div>
      </div>
      <p class="muted" style="font-size: 0.9rem; margin-bottom: 16px;">${cinema.address}</p>
      <button class="button ghost small" data-detail="${cinema.id}" style="width: 100%;">Voir les détails</button>
    </article>
  `;

  const renderCinemas = (cinemas) => {
    if (!cinemas?.length) {
      listBox.innerHTML = '<div class="empty-state">Aucune salle trouvée.</div>';
      return;
    }
    listBox.innerHTML = cinemas.map(renderCinemaCard).join("");
    listBox
      .querySelectorAll("[data-detail]")
      .forEach((btn) =>
        btn.addEventListener("click", () => loadDetail(btn.dataset.detail))
      );
  };

  const renderDetail = (cinema) => {
    if (!cinema) {
      modalContent.innerHTML = '<div class="empty-state">Cinema introuvable.</div>';
      return;
    }
    modalContent.innerHTML = `
      <p class="eyebrow">Cinema #${cinema.id}</p>
      <h3>${cinema.name}</h3>
      <p>${cinema.address}</p>
      <p class="muted small">${cinema.city}</p>
    `;
    modal.classList.remove("hidden");
  };

  const handleError = (target, err) => {
    const message = err?.payload?.detail || err.message || "Erreur";
    target.innerHTML = `<div class="empty-state">${message}</div>`;
    showToast(message, "bad");
  };

  const loadDetail = async (id) => {
    modalContent.innerHTML = `<div class="muted small">Chargement...</div>`;
    modal.classList.remove("hidden");
    try {
      const data = await apiFetch(`/cinemas/${id}`);
      renderDetail(data);
    } catch (err) {
      handleError(modalContent, err);
    }
  };

  document
    .getElementById("load-cinemas")
    ?.addEventListener("click", async () => {
      listBox.innerHTML = `<div class="muted small">Chargement...</div>`;
      try {
        const data = await apiFetch("/cinemas");
        const cinemas = Array.isArray(data) ? data : data?.cinemas;
        renderCinemas(cinemas);
        showToast("Liste mise a jour", "ok");
      } catch (err) {
        handleError(listBox, err);
      }
    });

  window.addEventListener("storage", (e) => {
    if (e.key === "refreshCinemas") {
      document
        .getElementById("load-cinemas")
        ?.dispatchEvent(new Event("click"));
      localStorage.removeItem("refreshCinemas");
    }
  });

  document.getElementById("load-cinemas")?.dispatchEvent(new Event("click"));

  modalClose?.addEventListener("click", () => modal.classList.add("hidden"));
  modal?.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal__backdrop") || e.target === modal) {
      modal.classList.add("hidden");
    }
  });
});
