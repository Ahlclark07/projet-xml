document.addEventListener("DOMContentLoaded", () => {
  const { bindConfigForm, apiFetch, showToast, setConfig, getConfig, syncConfigUI } = window.AppCommon;
  bindConfigForm();

  const result = document.getElementById("login-result");

  const setStatus = (message) => {
    if (result) result.textContent = message;
  };

  document.getElementById("login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = e.target.username.value.trim();
    const password = e.target.password.value.trim();
    if (!username || !password) return;
    setStatus("Connexion en cours...");
    try {
      const data = await apiFetch("/auth/login", { method: "POST", body: { username, password } });
      if (data?.api_key) {
        const { baseUrl } = getConfig();
        setConfig(baseUrl, data.api_key);
        syncConfigUI();
        setStatus("Connexion reussie. Cle stockee.");
        showToast("Connecte", "ok");
        setTimeout(() => (window.location.href = "admin.html"), 400);
      } else {
        setStatus("Connecte sans cle retournee.");
      }
    } catch (err) {
      const message = err?.payload?.detail || err.message || "Erreur";
      setStatus(message);
      showToast(message, "bad");
    }
  });
});
