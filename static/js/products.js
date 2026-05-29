/* ═══════════════════════════════════
   products.js — Product Database view
═══════════════════════════════════ */

let allProducts = [];
let editingDta = null; // null = add mode, string = edit mode

async function loadProducts() {
  try {
    allProducts = await API.get("/api/products");
    renderProductsTable(allProducts);
  } catch (e) {
    showToast("Failed to load products", "error");
  }
}

function renderProductsTable(products) {
  const tbody = document.getElementById("products-tbody");

  if (!products.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">No products in database. Products are auto-saved when you enter DTA codes in bills.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map((p) => buildProductRow(p)).join("");

  tbody.querySelectorAll(".btn-edit-product").forEach((btn) => {
    btn.addEventListener("click", () => openProductModal(btn.dataset.dta));
  });

  tbody.querySelectorAll(".btn-delete-product").forEach((btn) => {
    btn.addEventListener("click", () => deleteProduct(btn.dataset.dta));
  });
}

function buildProductRow(p) {
  const updated = p.updated_at
    ? new Date(p.updated_at).toLocaleDateString("en-AE", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  return `<tr>
    <td><code style="font-size:0.85rem;font-weight:700;color:var(--accent)">${esc(p.dta)}</code></td>
    <td>${esc(p.brand)}</td>
    <td>${esc(p.model)}</td>
    <td class="price-cell">${fmtAED(p.price)}</td>
    <td style="color:var(--text-muted);font-size:0.8rem">${updated}</td>
    <td>
      <div class="table-actions">
        <button class="btn btn-icon btn-edit-product" data-dta="${esc(p.dta)}" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn btn-icon danger btn-delete-product" data-dta="${esc(p.dta)}" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </button>
      </div>
    </td>
  </tr>`;
}

// ── Search / Filter ────────────────────────────────────────────
function initProductSearch() {
  document.getElementById("product-search").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allProducts.filter(
      (p) =>
        p.dta.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q)
    );
    renderProductsTable(filtered);
  });
}

// ── Add Product Modal ─────────────────────────────────────────
function openProductModal(dta = null) {
  editingDta = dta;
  const overlay = document.getElementById("product-modal-overlay");
  const title   = document.getElementById("product-modal-title");
  const dtaField = document.getElementById("pm-dta");

  if (dta) {
    // Edit mode — populate
    title.textContent = "Edit Product";
    const product = allProducts.find((p) => p.dta === dta);
    if (product) {
      dtaField.value = product.dta;
      dtaField.readOnly = true;
      document.getElementById("pm-brand").value = product.brand;
      document.getElementById("pm-model").value = product.model;
      document.getElementById("pm-price").value = product.price;
    }
  } else {
    // Add mode
    title.textContent = "Add Product";
    document.getElementById("product-form").reset();
    dtaField.readOnly = false;
  }

  overlay.classList.remove("hidden");
  dtaField.focus();
}

function closeProductModal() {
  document.getElementById("product-modal-overlay").classList.add("hidden");
  document.getElementById("product-form").reset();
  document.getElementById("pm-dta").readOnly = false;
  editingDta = null;
}

async function saveProduct() {
  const dta   = document.getElementById("pm-dta").value.trim().toUpperCase();
  const brand = document.getElementById("pm-brand").value.trim();
  const model = document.getElementById("pm-model").value.trim();
  const price = parseFloat(document.getElementById("pm-price").value) || 0;

  if (!dta || !brand || !model) {
    showToast("DTA, Brand and Model are required", "error");
    return;
  }

  try {
    await API.post("/api/products", { dta, brand, model, price });
    showToast(`Product ${dta} saved`, "success");
    closeProductModal();
    await loadProducts();
  } catch (e) {
    showToast("Failed to save product: " + e.message, "error");
  }
}

async function deleteProduct(dta) {
  const confirmed = await showConfirm(`Delete product ${dta}? This won't affect existing bills.`);
  if (!confirmed) return;
  try {
    await API.del(`/api/products/${encodeURIComponent(dta)}`);
    showToast(`Product ${dta} deleted`, "info");
    await loadProducts();
  } catch (e) {
    showToast("Delete failed: " + e.message, "error");
  }
}

// ── Bulk Product Upload logic ───────────────────────────────
let uploadedProductsList = [];

function openUploadModal() {
  uploadedProductsList = [];
  
  const overlay = document.getElementById("upload-products-modal-overlay");
  const fileInput = document.getElementById("upload-file-input");
  const previewSection = document.getElementById("upload-preview-section");
  const dropzone = document.getElementById("upload-dropzone");
  const confirmBtn = document.getElementById("upload-products-modal-confirm");
  
  fileInput.value = "";
  previewSection.classList.add("hidden");
  dropzone.classList.remove("hidden");
  dropzone.style.pointerEvents = "auto";
  dropzone.style.opacity = "1";
  
  confirmBtn.disabled = true;
  confirmBtn.style.opacity = "0.65";
  confirmBtn.style.cursor = "not-allowed";
  document.getElementById("import-count-badge").textContent = "0";
  
  overlay.classList.remove("hidden");
}

function closeUploadModal() {
  document.getElementById("upload-products-modal-overlay").classList.add("hidden");
}

function initUploadDropzone() {
  const dropzone = document.getElementById("upload-dropzone");
  const fileInput = document.getElementById("upload-file-input");
  
  // Click dropzone to select file
  dropzone.addEventListener("click", () => fileInput.click());
  
  // File selection
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      processUploadFile(e.target.files[0]);
    }
  });
  
  // Drag & drop events
  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    }, false);
  });
  
  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    }, false);
  });
  
  dropzone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      processUploadFile(files[0]);
    }
  });
  
  // Remove file button
  document.getElementById("btn-remove-file").addEventListener("click", () => {
    openUploadModal();
  });
}

async function processUploadFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (ext !== "xlsx" && ext !== "csv") {
    showToast("Invalid file type. Please upload a .xlsx or .csv file.", "error");
    return;
  }
  
  const dropzone = document.getElementById("upload-dropzone");
  const previewSection = document.getElementById("upload-preview-section");
  const confirmBtn = document.getElementById("upload-products-modal-confirm");
  
  // Show parsing state
  dropzone.style.pointerEvents = "none";
  dropzone.style.opacity = "0.6";
  const dropzoneText = dropzone.querySelector(".dropzone-text");
  const originalHtml = dropzoneText.innerHTML;
  dropzoneText.innerHTML = `Parsing file <strong style="color:var(--accent)">${esc(file.name)}</strong>...`;
  
  const formData = new FormData();
  formData.append("file", file);
  
  try {
    const response = await fetch("/api/products/upload-preview", {
      method: "POST",
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(await response.text());
    }
    
    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.error || "Failed to parse file");
    }
    
    uploadedProductsList = data.products;
    
    // Update file details in modal
    document.getElementById("uploaded-filename").textContent = file.name;
    const sizeKb = (file.size / 1024).toFixed(1);
    document.getElementById("uploaded-filesize").textContent = `(${sizeKb} KB)`;
    
    // Render Preview Table
    const tbody = document.getElementById("upload-preview-tbody");
    if (!data.preview || data.preview.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted)">No valid items found in this file.</td></tr>`;
      confirmBtn.disabled = true;
      confirmBtn.style.opacity = "0.65";
      confirmBtn.style.cursor = "not-allowed";
    } else {
      tbody.innerHTML = data.preview.map((p) => `
        <tr>
          <td style="padding:8px 12px"><code>${esc(p.dta)}</code></td>
          <td style="padding:8px 12px">${esc(p.brand)}</td>
          <td style="padding:8px 12px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${esc(p.model)}">${esc(p.model)}</td>
          <td style="padding:8px 12px; font-weight:700">${fmtAED(p.price)}</td>
        </tr>
      `).join("");
      
      // Enable Import button
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = "1";
      confirmBtn.style.cursor = "pointer";
    }
    
    document.getElementById("import-count-badge").textContent = data.total_rows;
    
    // Switch panels
    dropzone.classList.add("hidden");
    previewSection.classList.remove("hidden");
    
  } catch (e) {
    showToast(e.message || "Failed to parse product upload file", "error");
    // Restore state
    dropzone.style.pointerEvents = "auto";
    dropzone.style.opacity = "1";
    dropzoneText.innerHTML = originalHtml;
  }
}

async function saveUploadedProducts() {
  if (uploadedProductsList.length === 0) return;
  
  const confirmBtn = document.getElementById("upload-products-modal-confirm");
  confirmBtn.disabled = true;
  confirmBtn.textContent = "Importing...";
  
  try {
    const data = await API.post("/api/products/upload-save", {
      products: uploadedProductsList
    });
    
    if (data.ok) {
      showToast(`Successfully imported ${data.count} products!`, "success");
      closeUploadModal();
      await loadProducts();
    } else {
      throw new Error(data.error || "Failed to import products");
    }
  } catch (e) {
    showToast("Import failed: " + e.message, "error");
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      Import Products (<span id="import-count-badge">${uploadedProductsList.length}</span>)
    `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initProductSearch();

  document.getElementById("btn-add-product").addEventListener("click", () => openProductModal());
  document.getElementById("product-modal-close").addEventListener("click", closeProductModal);
  document.getElementById("product-modal-cancel").addEventListener("click", closeProductModal);
  document.getElementById("product-modal-save").addEventListener("click", saveProduct);
  document.getElementById("product-modal-overlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("product-modal-overlay")) closeProductModal();
  });

  // Upload modal events
  document.getElementById("btn-upload-products").addEventListener("click", () => openUploadModal());
  document.getElementById("upload-products-modal-close").addEventListener("click", closeUploadModal);
  document.getElementById("upload-products-modal-cancel").addEventListener("click", closeUploadModal);
  document.getElementById("upload-products-modal-confirm").addEventListener("click", saveUploadedProducts);
  document.getElementById("upload-products-modal-overlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("upload-products-modal-overlay")) closeUploadModal();
  });
  
  initUploadDropzone();

  // DTA uppercase
  document.getElementById("pm-dta").addEventListener("input", (e) => {
    e.target.value = e.target.value.toUpperCase();
  });
});
