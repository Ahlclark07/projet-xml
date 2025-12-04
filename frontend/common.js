(() => {
  const DEFAULT_BASE = "http://localhost:8000";
  const BASE_KEY = "apiBaseUrl";
  const COOKIE_KEY = "api_key";

  const readCookie = (name) => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : "";
  };

  const setCookie = (name, value, days = 7) => {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value || "")}; expires=${expires}; path=/`;
  };

  const getConfig = () => ({
    baseUrl: localStorage.getItem(BASE_KEY) || DEFAULT_BASE,
    apiKey: readCookie(COOKIE_KEY) || "",
  });

  const setConfig = (baseUrl, apiKey) => {
    const normalized = (baseUrl || DEFAULT_BASE).replace(/\/+$/, "");
    localStorage.setItem(BASE_KEY, normalized);
    if (apiKey !== undefined) {
      setCookie(COOKIE_KEY, apiKey || "");
    }
    return { baseUrl: normalized, apiKey: apiKey || "" };
  };

  const syncConfigUI = () => {
    const { baseUrl, apiKey } = getConfig();
    document.querySelectorAll('[data-config="base-url"]').forEach((el) => {
      el.value = baseUrl;
    });
    document.querySelectorAll('[data-config="api-key"]').forEach((el) => {
      el.value = apiKey;
    });
  };

  const showToast = (message, type = "ok") => {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("hidden", "ok", "bad");
    toast.classList.add(type === "bad" ? "bad" : "ok");
    setTimeout(() => toast.classList.add("hidden"), 3200);
  };

  const renderJson = (target, data) => {
    if (!target) return;
    if (data === undefined || data === null) {
      target.textContent = "";
      return;
    }
    if (typeof data === "string") {
      target.textContent = data;
      return;
    }
    target.textContent = JSON.stringify(data, null, 2);
  };

  const appendLog = (label, details) => {
    const log = document.getElementById("log");
    if (!log) return;
    const entry = document.createElement("div");
    entry.className = "entry";
    const timestamp = new Date().toLocaleTimeString();
    const labelEl = document.createElement("strong");
    labelEl.textContent = `[${timestamp}] ${label}: `;
    const span = document.createElement("span");
    span.textContent = details;
    entry.append(labelEl, span);
    log.prepend(entry);
  };

  const bindConfigForm = () => {
    syncConfigUI();
    document.querySelectorAll('[data-action="save-config"]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const base = document.querySelector('[data-config="base-url"]')?.value.trim();
        const key = document.querySelector('[data-config="api-key"]')?.value.trim();
        const cfg = setConfig(base, key);
        syncConfigUI();
        showToast("Configuration enregistree", "ok");
        appendLog("Config", `${cfg.baseUrl} | key: ${cfg.apiKey ? "presente" : "vide"}`);
      });
    });
    document.querySelectorAll('[data-action="reset-config"]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const cfg = setConfig(DEFAULT_BASE, "");
        syncConfigUI();
        showToast("Configuration reinitialisee", "ok");
        appendLog("Config", `${cfg.baseUrl} | cle vide`);
      });
    });
  };

  const buildUrl = (baseUrl, path) => {
    const clean = (baseUrl || DEFAULT_BASE).replace(/\/+$/, "");
    const suffix = path.startsWith("/") ? path : `/${path}`;
    return `${clean}${suffix}`;
  };

  const apiFetch = async (path, { method = "GET", body, requireKey = false } = {}) => {
    const { baseUrl, apiKey } = getConfig();
    const headers = { Accept: "application/json" };
    const options = { method, headers };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    } else if (requireKey) {
      throw new Error("Cle API requise pour cette operation.");
    }

    const response = await fetch(buildUrl(baseUrl, path), options);
    const contentType = response.headers.get("content-type") || "";
    let payload;
    try {
      payload = contentType.includes("application/json") ? await response.json() : await response.text();
    } catch (err) {
      payload = await response.text();
    }

    if (!response.ok) {
      const error = new Error(`Erreur ${response.status}: ${response.statusText}`);
      error.payload = payload;
      throw error;
    }

    return payload;
  };

  window.AppCommon = {
    getConfig,
    setConfig,
    syncConfigUI,
    bindConfigForm,
    apiFetch,
    renderJson,
    showToast,
    appendLog,
    readCookie: (name) => readCookie(name),
    setCookie: (name, value, days) => setCookie(name, value, days),
  };
})();
