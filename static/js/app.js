/* ═══════════════════════════════════
   app.js — SPA router & API helpers
═══════════════════════════════════ */

// ── Date helpers ─────────────────────────────────────────────
function todayStr() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatDate(dateStr) {
  // "29-05-2026" -> "29 May 2026"
  if (!dateStr) return "";
  const [dd, mm, yyyy] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${parseInt(dd)} ${months[parseInt(mm)-1]} ${yyyy}`;
}

// ── API wrappers ──────────────────────────────────────────────
const API = {
  async get(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async post(url, body) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async put(url, body) {
    const r = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async del(url) {
    const r = await fetch(url, { method: "DELETE" });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
};

// ── Currency formatter ────────────────────────────────────────
function fmtAED(amount) {
  if (amount == null || amount === "") return "AED 0";
  return "AED " + Number(amount).toLocaleString("en-AE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

// ── Toast notifications ───────────────────────────────────────
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const icons = { success: "✓", error: "✕", info: "ℹ" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("exiting");
    toast.addEventListener("animationend", () => toast.remove());
  }, 3200);
}

// ── Confirm dialog ────────────────────────────────────────────
function showConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirm-modal-overlay");
    document.getElementById("confirm-modal-message").textContent = message;
    overlay.classList.remove("hidden");
    const ok = document.getElementById("confirm-modal-ok");
    const cancel = document.getElementById("confirm-modal-cancel");
    function cleanup(result) {
      overlay.classList.add("hidden");
      ok.removeEventListener("click", onOk);
      cancel.removeEventListener("click", onCancel);
      resolve(result);
    }
    const onOk = () => cleanup(true);
    const onCancel = () => cleanup(false);
    ok.addEventListener("click", onOk);
    cancel.addEventListener("click", onCancel);
  });
}

// ── SPA Router ────────────────────────────────────────────────
const VIEWS = ["bills", "history", "products", "dashboard"];

function navigate(view) {
  VIEWS.forEach((v) => {
    document.getElementById(`view-${v}`).classList.toggle("hidden", v !== view);
    document.getElementById(`nav-${v}`).classList.toggle("active", v === view);
  });
  if (view === "bills")     loadBills();
  if (view === "history")   loadHistoryDates();
  if (view === "products")  loadProducts();
  if (view === "dashboard") loadDashboard();
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Sidebar date
  const today = todayStr();
  const el = document.getElementById("sidebar-date");
  if (el) el.textContent = formatDate(today);

  // Nav items
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.view));
  });

  // Boot view
  navigate("bills");
});
