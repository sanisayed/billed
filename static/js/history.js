/* ═══════════════════════════════════
   history.js — Sales History view
   Theme: Posting Date calendar with Today shortcut
   ═══════════════════════════════════ */

let historyDate = null;

// Convert "YYYY-MM-DD" (from <input type="date">) to "DD-MM-YYYY" (API format)
function toApiDate(inputDateStr) {
  if (!inputDateStr) return "";
  const [yyyy, mm, dd] = inputDateStr.split("-");
  return `${dd}-${mm}-${yyyy}`;
}

// Convert "DD-MM-YYYY" (from API/dateStr) to "YYYY-MM-DD" (for <input type="date">)
function toInputDate(apiDateStr) {
  if (!apiDateStr) return "";
  const [dd, mm, yyyy] = apiDateStr.split("-");
  return `${yyyy}-${mm}-${dd}`;
}

async function loadHistoryDates() {
  const dateInput = document.getElementById("history-date-input");
  // Set default to today's date if empty
  if (!dateInput.value) {
    const today = todayStr();
    dateInput.value = toInputDate(today);
    await loadHistoryForDate(today);
  }
}

async function loadHistoryForDate(date) {
  if (!date) return;
  historyDate = date;

  try {
    const bills = await API.get(`/api/bills?date=${date}`);
    const card  = document.getElementById("history-table-card");
    card.style.display = "block";

    document.getElementById("history-table-title").textContent =
      `Transactions — ${formatDate(date)}`;
    document.getElementById("history-count-badge").textContent =
      `${bills.length} ${bills.length === 1 ? "entry" : "entries"}`;

    document.getElementById("btn-export-history").disabled = bills.length === 0;

    const tbody = document.getElementById("history-tbody");
    if (!bills.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="11">No transactions for this date.</td></tr>`;
      return;
    }

    tbody.innerHTML = bills.map((b, i) => buildHistoryRow(b, i + 1)).join("");
  } catch (e) {
    showToast("Failed to load history: " + e.message, "error");
  }
}

function buildHistoryRow(b, idx) {
  const mopText = b.payment_mode === "Mixed"
    ? buildMixedText(b)
    : b.payment_mode;

  return `<tr>
    <td>${idx}</td>
    <td>${esc(b.customer_name) || "<span class='text-muted'>—</span>"}</td>
    <td>${esc(b.brand) || "—"}</td>
    <td>${esc(b.model) || "—"}</td>
    <td><code>${esc(b.dta) || "—"}</code></td>
    <td class="price-cell">${fmtAED(b.price)}</td>
    <td><span class="mop-badge">${esc(mopText)}</span></td>
    <td>${esc(b.note) || "<span class='text-muted'>—</span>"}</td>
    <td><span class="type-badge type-${b.transaction_type}">${b.transaction_type}</span></td>
    <td>${esc(b.platform)}</td>
    <td class="${b.delivery ? 'delivery-yes' : 'delivery-no'}">${b.delivery ? "✓ Yes" : "No"}</td>
  </tr>`;
}

function buildMixedText(b) {
  const parts = [];
  if (b.mixed_cash)   parts.push(`Cash`);
  if (b.mixed_card)   parts.push(`Card`);
  if (b.mixed_tabby)  parts.push(`Tabby`);
  if (b.mixed_tamara) parts.push(`Tamara`);
  return "Mixed (" + parts.join("+") + ")";
}

document.addEventListener("DOMContentLoaded", () => {
  const dateInput = document.getElementById("history-date-input");
  const todayBtn = document.getElementById("btn-history-today");
  const loadBtn = document.getElementById("btn-history-load");

  todayBtn.addEventListener("click", async () => {
    const today = todayStr();
    dateInput.value = toInputDate(today);
    await loadHistoryForDate(today);
  });

  loadBtn.addEventListener("click", async () => {
    const dateVal = dateInput.value;
    if (!dateVal) {
      showToast("Please choose a date first", "error");
      return;
    }
    await loadHistoryForDate(toApiDate(dateVal));
  });

  dateInput.addEventListener("change", async (e) => {
    if (e.target.value) {
      await loadHistoryForDate(toApiDate(e.target.value));
    }
  });

  document.getElementById("btn-export-history").addEventListener("click", () => {
    if (!historyDate) return;
    window.location.href = `/api/export?date=${historyDate}`;
    showToast("Generating Excel file…", "info");
  });
});
