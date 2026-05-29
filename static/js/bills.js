/* ═══════════════════════════════════
   bills.js — Today's Bill view
═══════════════════════════════════ */

let currentBills = [];
let activeTxType = "Sale";

// ── Load Today's Bills ────────────────────────────────────────
async function loadBills() {
  const today = todayStr();
  document.getElementById("bill-date-label").textContent = formatDate(today);

  try {
    currentBills = await API.get(`/api/bills?date=${today}`);
    renderBillsTable(currentBills);
  } catch (e) {
    showToast("Failed to load today's bills", "error");
  }
}

// ── Render Table ──────────────────────────────────────────────
function renderBillsTable(bills) {
  const tbody = document.getElementById("bills-tbody");
  const badge = document.getElementById("bill-count-badge");
  badge.textContent = `${bills.length} ${bills.length === 1 ? "entry" : "entries"}`;

  if (!bills.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="12">No transactions yet. Add your first sale above.</td></tr>`;
    return;
  }

  tbody.innerHTML = bills.map((b, i) => buildBillRow(b, i + 1)).join("");

  tbody.querySelectorAll(".btn-delete-bill").forEach((btn) => {
    btn.addEventListener("click", () => deleteBill(parseInt(btn.dataset.id)));
  });
}

function buildBillRow(b, idx) {
  const mopText = b.payment_mode === "Mixed" ? mixedDetail(b) : b.payment_mode;
  const isExchange = b.transaction_type === "Exchange";

  // For exchange, show new product info as the main row, then a sub-row
  const mainBrand = isExchange ? (b.exch_new_brand || b.brand || "—") : (b.brand || "—");
  const mainModel = isExchange ? (b.exch_new_model || b.model || "—") : (b.model || "—");
  const mainDta   = isExchange ? (b.exch_new_dta   || b.dta   || "—") : (b.dta   || "—");
  const mainPrice = isExchange ? (b.exch_new_price  || b.price || 0)   : (b.price || 0);

  let exchangeSubRow = "";
  if (isExchange) {
    const balance = b.exch_balance || 0;
    const isPositive = balance >= 0;
    const balanceClass = isPositive ? "balance-positive" : "balance-negative";
    const balanceLabel = isPositive ? "↑ Collect" : "↓ Refund";
    const oldLabel = [b.exch_old_brand, b.exch_old_model].filter(Boolean).join(" ") || "Unknown old product";
    const oldDtaTag = b.exch_old_dta ? `<code class="exch-dta-tag">${esc(b.exch_old_dta)}</code>` : "";

    exchangeSubRow = `
    <tr class="exchange-sub-row">
      <td></td>
      <td colspan="10">
        <div class="exchange-row-details">
          <span class="exchange-row-tag old-tag">OLD</span>
          <span class="exch-old-name">${esc(oldLabel)}</span>
          ${oldDtaTag}
          <span class="exch-old-price">${fmtAED(b.exch_old_price)}</span>
          <span class="exch-arrow-sep">→</span>
          <span class="exchange-balance-inline ${balanceClass}">${balanceLabel}: ${fmtAED(Math.abs(balance))}</span>
        </div>
      </td>
      <td></td>
    </tr>`;
  }

  return `<tr class="${isExchange ? 'exchange-main-row' : ''}">
    <td>${idx}</td>
    <td>${esc(b.customer_name) || "<span class='text-muted'>—</span>"}</td>
    <td>${esc(mainBrand)}</td>
    <td>
      ${esc(mainModel)}
      ${isExchange ? '<span class="exchange-new-tag">NEW</span>' : ""}
    </td>
    <td><code>${esc(mainDta)}</code></td>
    <td class="price-cell">${fmtAED(mainPrice)}</td>
    <td><span class="mop-badge">${esc(mopText)}</span></td>
    <td>${esc(b.note) || "<span class='text-muted'>—</span>"}</td>
    <td><span class="type-badge type-${b.transaction_type}">${b.transaction_type}</span></td>
    <td>${esc(b.platform)}</td>
    <td class="${b.delivery ? 'delivery-yes' : 'delivery-no'}">${b.delivery ? "✓ Yes" : "No"}</td>
    <td>
      <div class="table-actions">
        <button class="btn btn-icon danger btn-delete-bill" data-id="${b.id}" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </button>
      </div>
    </td>
  </tr>${exchangeSubRow}`;
}

function mixedDetail(b) {
  const parts = [];
  if (b.mixed_cash)   parts.push(`Cash ${fmtAED(b.mixed_cash)}`);
  if (b.mixed_card)   parts.push(`Card ${fmtAED(b.mixed_card)}`);
  if (b.mixed_tabby)  parts.push(`Tabby ${fmtAED(b.mixed_tabby)}`);
  if (b.mixed_tamara) parts.push(`Tamara ${fmtAED(b.mixed_tamara)}`);
  return parts.length ? parts.join(" + ") : "Mixed";
}

function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── DTA Auto-fill (reusable) ──────────────────────────────────
async function dtaLookup(dtaInput, brandField, modelField, priceField, onFilled) {
  const dta = (dtaInput.value || "").trim().toUpperCase();
  if (!dta) return;

  dtaInput.value = dta;
  try {
    const product = await API.get(`/api/products/${encodeURIComponent(dta)}`);
    if (product && !product.error) {
      // Sync the DTA input field value to the official code stored in database
      dtaInput.value = product.dta;
      if (brandField) { brandField.value = product.brand; brandField.classList.add("auto-filled"); }
      if (modelField) { modelField.value = product.model; modelField.classList.add("auto-filled"); }
      if (priceField && !priceField.value) {
        priceField.value = product.price;
        priceField.classList.add("auto-filled");
      }
      showToast(`Found: ${product.brand} ${product.model}`, "success");
      // Fire optional callback so balance can recalculate after programmatic fill
      if (onFilled) onFilled();
    } else {
      showToast("DTA not in database — fill in manually", "info");
    }
  } catch {
    showToast("DTA not found — fill in manually", "info");
  }
}

// ── Transaction Type Toggle ───────────────────────────────────
function initTxToggle() {
  document.querySelectorAll(".tx-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTxType = btn.dataset.type;
      document.querySelectorAll(".tx-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      if (activeTxType === "Exchange") {
        openExchangeModal();
      }
    });
  });
}

// ── Mixed Payment Panel (main form) ──────────────────────────
function initMopSelect() {
  const mopSelect = document.getElementById("f-mop");
  const mixedPanel = document.getElementById("mixed-panel");
  const priceInput = document.getElementById("f-price");

  mopSelect.addEventListener("change", () => {
    mixedPanel.classList.toggle("hidden", mopSelect.value !== "Mixed");
  });

  document.querySelectorAll(".mixed-input").forEach((inp) => {
    inp.addEventListener("input", () => {
      const total = ["f-mix-cash","f-mix-card","f-mix-tabby","f-mix-tamara"]
        .reduce((s, id) => s + (parseFloat(document.getElementById(id).value) || 0), 0);
      document.getElementById("mixed-total-display").textContent = fmtAED(total);
      priceInput.value = total || "";
    });
  });
}

// ── Delivery Toggle (main form) ───────────────────────────────
function initDeliveryToggle() {
  const toggle = document.getElementById("f-delivery");
  const label  = document.getElementById("delivery-label");
  toggle.addEventListener("change", () => {
    label.textContent = toggle.checked ? "Yes" : "No";
  });
}

// ── Form Submit ───────────────────────────────────────────────
function initBillForm() {
  const form = document.getElementById("bill-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitBill();
  });
  document.getElementById("btn-clear-form").addEventListener("click", resetForm);
}

async function submitBill() {
  if (activeTxType === "Exchange") {
    // Exchange is handled by the modal — clicking Exchange button opens the modal
    openExchangeModal();
    return;
  }

  const payload = collectMainFormData();
  if (!payload.price) {
    showToast("Please enter a price", "error");
    return;
  }

  try {
    await API.post("/api/bills", payload);
    showToast(`${activeTxType} recorded!`, "success");
    resetForm();
    await loadBills();
  } catch (e) {
    showToast("Failed to save: " + e.message, "error");
  }
}

function collectMainFormData() {
  return {
    date: todayStr(),
    customer_name: document.getElementById("f-name").value.trim(),
    brand: document.getElementById("f-brand").value.trim(),
    model: document.getElementById("f-model").value.trim(),
    dta: document.getElementById("f-dta").value.trim().toUpperCase(),
    price: parseFloat(document.getElementById("f-price").value) || 0,
    payment_mode: document.getElementById("f-mop").value,
    mixed_cash:   parseFloat(document.getElementById("f-mix-cash").value)   || 0,
    mixed_card:   parseFloat(document.getElementById("f-mix-card").value)   || 0,
    mixed_tabby:  parseFloat(document.getElementById("f-mix-tabby").value)  || 0,
    mixed_tamara: parseFloat(document.getElementById("f-mix-tamara").value) || 0,
    note: document.getElementById("f-note").value.trim(),
    transaction_type: activeTxType,
    platform: document.getElementById("f-platform").value,
    delivery: document.getElementById("f-delivery").checked ? 1 : 0,
    exch_new_brand: "", exch_new_model: "", exch_new_dta: "",
    exch_new_price: 0, exch_old_brand: "", exch_old_model: "",
    exch_old_dta: "", exch_old_price: 0, exch_balance: 0,
  };
}

function resetForm() {
  document.getElementById("bill-form").reset();
  document.getElementById("delivery-label").textContent = "No";
  document.getElementById("mixed-panel").classList.add("hidden");
  document.getElementById("mixed-total-display").textContent = "AED 0.00";
  document.querySelectorAll(".auto-filled").forEach((el) => el.classList.remove("auto-filled"));

  activeTxType = "Sale";
  document.querySelectorAll(".tx-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.type === "Sale");
  });
}

// ── Delete Bill ───────────────────────────────────────────────
async function deleteBill(id) {
  const confirmed = await showConfirm("Delete this transaction? This cannot be undone.");
  if (!confirmed) return;
  try {
    await API.del(`/api/bills/${id}`);
    showToast("Transaction deleted", "info");
    await loadBills();
  } catch (e) {
    showToast("Delete failed: " + e.message, "error");
  }
}

// ── Export ────────────────────────────────────────────────────
function initExportButton() {
  document.getElementById("btn-export-today").addEventListener("click", () => {
    window.location.href = `/api/export?date=${todayStr()}`;
    showToast("Generating Excel file…", "info");
  });
}

// ══════════════════════════════════════════════════════════════
//  EXCHANGE MODAL — Fully self-contained
// ══════════════════════════════════════════════════════════════

function resetExchangeModal() {
  [
    "ex-new-dta","ex-new-brand","ex-new-model","ex-new-price",
    "ex-old-dta","ex-old-brand","ex-old-model","ex-old-price",
    "ex-customer","ex-note",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) { el.value = ""; el.classList.remove("auto-filled"); }
  });

  document.getElementById("ex-mop").value = "Cash";
  document.getElementById("ex-platform").value = "Regular Customer";
  document.getElementById("ex-delivery").checked = false;
  document.getElementById("ex-delivery-label").textContent = "No";
  document.getElementById("ex-mixed-panel").classList.add("hidden");

  // Reset balance display
  const amountEl = document.getElementById("balance-amount");
  amountEl.textContent = "AED 0.00";
  amountEl.className = "balance-amount";
  document.getElementById("balance-direction-label").textContent = "Balance";
  document.getElementById("balance-note").textContent = "Enter both prices above to calculate";
}

function openExchangeModal() {
  resetExchangeModal();
  document.getElementById("exchange-modal-overlay").classList.remove("hidden");
  document.getElementById("ex-new-dta").focus();
}

function closeExchangeModal(cancelled = true) {
  document.getElementById("exchange-modal-overlay").classList.add("hidden");

  if (cancelled) {
    // Revert tx type to Sale
    activeTxType = "Sale";
    document.querySelectorAll(".tx-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.type === "Sale");
    });
  }
}

function updateExchangeBalance() {
  const newPrice = parseFloat(document.getElementById("ex-new-price").value) || 0;
  const oldPrice = parseFloat(document.getElementById("ex-old-price").value) || 0;
  const balance  = newPrice - oldPrice;
  const amountEl = document.getElementById("balance-amount");
  const dirLabel = document.getElementById("balance-direction-label");
  const noteEl   = document.getElementById("balance-note");

  if (newPrice > 0 || oldPrice > 0) {
    amountEl.textContent = fmtAED(Math.abs(balance));
    if (balance > 0) {
      amountEl.className = "balance-amount balance-positive";
      dirLabel.textContent = "↑ Customer Pays";
      noteEl.textContent = `New (${fmtAED(newPrice)}) − Old (${fmtAED(oldPrice)}) = Customer owes this amount`;
    } else if (balance < 0) {
      amountEl.className = "balance-amount balance-negative";
      dirLabel.textContent = "↓ Refund to Customer";
      noteEl.textContent = `Old (${fmtAED(oldPrice)}) > New (${fmtAED(newPrice)}) = Refund this amount`;
    } else {
      amountEl.className = "balance-amount";
      dirLabel.textContent = "✓ Even Exchange";
      noteEl.textContent = "Prices match — no balance to collect or refund";
    }
  } else {
    amountEl.textContent = "AED 0.00";
    amountEl.className = "balance-amount";
    dirLabel.textContent = "Balance";
    noteEl.textContent = "Enter both prices above to calculate";
  }
}

function validateExchangeForm() {
  const newBrand = document.getElementById("ex-new-brand").value.trim();
  const newModel = document.getElementById("ex-new-model").value.trim();
  const newPrice = parseFloat(document.getElementById("ex-new-price").value);

  if (!newBrand) {
    showToast("New product Brand is required", "error");
    document.getElementById("ex-new-brand").focus();
    return false;
  }
  if (!newModel) {
    showToast("New product Model is required", "error");
    document.getElementById("ex-new-model").focus();
    return false;
  }
  if (!newPrice || newPrice <= 0) {
    showToast("New product Selling Price is required", "error");
    document.getElementById("ex-new-price").focus();
    return false;
  }
  return true;
}

async function submitExchange() {
  if (!validateExchangeForm()) return;

  const newPrice = parseFloat(document.getElementById("ex-new-price").value) || 0;
  const oldPrice = parseFloat(document.getElementById("ex-old-price").value) || 0;

  // Collect mixed payment for exchange
  let mixCash = 0, mixCard = 0, mixTabby = 0, mixTamara = 0;
  const exMop = document.getElementById("ex-mop").value;
  if (exMop === "Mixed") {
    mixCash   = parseFloat(document.getElementById("ex-mix-cash").value)   || 0;
    mixCard   = parseFloat(document.getElementById("ex-mix-card").value)   || 0;
    mixTabby  = parseFloat(document.getElementById("ex-mix-tabby").value)  || 0;
    mixTamara = parseFloat(document.getElementById("ex-mix-tamara").value) || 0;
  }

  const payload = {
    date: todayStr(),
    customer_name: document.getElementById("ex-customer").value.trim(),
    // Main product fields = new product
    brand: document.getElementById("ex-new-brand").value.trim(),
    model: document.getElementById("ex-new-model").value.trim(),
    dta:   document.getElementById("ex-new-dta").value.trim().toUpperCase(),
    price: newPrice,
    payment_mode: exMop,
    mixed_cash:   mixCash,
    mixed_card:   mixCard,
    mixed_tabby:  mixTabby,
    mixed_tamara: mixTamara,
    note: document.getElementById("ex-note").value.trim(),
    transaction_type: "Exchange",
    platform: document.getElementById("ex-platform").value,
    delivery: document.getElementById("ex-delivery").checked ? 1 : 0,
    // Exchange-specific
    exch_new_brand: document.getElementById("ex-new-brand").value.trim(),
    exch_new_model: document.getElementById("ex-new-model").value.trim(),
    exch_new_dta:   document.getElementById("ex-new-dta").value.trim().toUpperCase(),
    exch_new_price: newPrice,
    exch_old_brand: document.getElementById("ex-old-brand").value.trim(),
    exch_old_model: document.getElementById("ex-old-model").value.trim(),
    exch_old_dta:   document.getElementById("ex-old-dta").value.trim().toUpperCase(),
    exch_old_price: oldPrice,
    exch_balance:   newPrice - oldPrice,
  };

  const btn = document.getElementById("exchange-modal-confirm");
  btn.disabled = true;
  btn.textContent = "Saving…";

  try {
    await API.post("/api/bills", payload);
    showToast("Exchange saved!", "success");
    closeExchangeModal(false);
    resetForm();
    await loadBills();
  } catch (e) {
    showToast("Failed to save exchange: " + e.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Save Exchange`;
  }
}

function initExchangeModal() {
  // Close handlers
  document.getElementById("exchange-modal-close").addEventListener("click", () => closeExchangeModal(true));
  document.getElementById("exchange-modal-cancel").addEventListener("click", () => closeExchangeModal(true));
  document.getElementById("exchange-modal-overlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("exchange-modal-overlay")) closeExchangeModal(true);
  });

  // Balance live update
  ["ex-new-price", "ex-old-price"].forEach((id) => {
    document.getElementById(id).addEventListener("input", updateExchangeBalance);
  });

  // DTA lookups — new product
  const newDtaInput = document.getElementById("ex-new-dta");
  newDtaInput.addEventListener("blur", () => {
    dtaLookup(newDtaInput,
      document.getElementById("ex-new-brand"),
      document.getElementById("ex-new-model"),
      document.getElementById("ex-new-price"),
      updateExchangeBalance  // recalc balance after fill
    );
  });
  document.getElementById("ex-new-dta-lookup").addEventListener("click", () => {
    dtaLookup(newDtaInput,
      document.getElementById("ex-new-brand"),
      document.getElementById("ex-new-model"),
      document.getElementById("ex-new-price"),
      updateExchangeBalance
    );
  });

  // DTA lookups — old product
  const oldDtaInput = document.getElementById("ex-old-dta");
  oldDtaInput.addEventListener("blur", () => {
    dtaLookup(oldDtaInput,
      document.getElementById("ex-old-brand"),
      document.getElementById("ex-old-model"),
      document.getElementById("ex-old-price"),
      updateExchangeBalance  // recalc balance after fill
    );
  });
  document.getElementById("ex-old-dta-lookup").addEventListener("click", () => {
    dtaLookup(oldDtaInput,
      document.getElementById("ex-old-brand"),
      document.getElementById("ex-old-model"),
      document.getElementById("ex-old-price"),
      updateExchangeBalance
    );
  });

  // MOP → mixed panel toggle inside exchange modal
  document.getElementById("ex-mop").addEventListener("change", (e) => {
    document.getElementById("ex-mixed-panel").classList.toggle("hidden", e.target.value !== "Mixed");
  });

  // Delivery toggle inside exchange modal
  document.getElementById("ex-delivery").addEventListener("change", (e) => {
    document.getElementById("ex-delivery-label").textContent = e.target.checked ? "Yes" : "No";
  });

  // Confirm button
  document.getElementById("exchange-modal-confirm").addEventListener("click", submitExchange);
}

// ── DTA auto-fill on main form ────────────────────────────────
function initMainDtaLookup() {
  const dtaInput  = document.getElementById("f-dta");
  const brandFld  = document.getElementById("f-brand");
  const modelFld  = document.getElementById("f-model");
  const priceFld  = document.getElementById("f-price");

  dtaInput.addEventListener("blur", () => {
    dtaInput.value = dtaInput.value.toUpperCase();
    dtaLookup(dtaInput, brandFld, modelFld, priceFld);
  });

  [brandFld, modelFld, priceFld].forEach((el) => {
    el.addEventListener("blur", () => {
      const dta   = dtaInput.value.trim().toUpperCase();
      const brand = brandFld.value.trim();
      const model = modelFld.value.trim();
      const price = parseFloat(priceFld.value) || 0;
      if (dta && brand && model) {
        API.post("/api/products", { dta, brand, model, price }).catch(() => {});
      }
    });
  });
}

// ── Bootstrap ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initTxToggle();
  initMopSelect();
  initDeliveryToggle();
  initBillForm();
  initExportButton();
  initExchangeModal();
  initMainDtaLookup();
});
