const healthStatus = document.getElementById("healthStatus");
const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const selectedFile = document.getElementById("selectedFile");
const messageBox = document.getElementById("messageBox");
const analyzeButton = document.getElementById("analyzeButton");
const uploadButton = document.getElementById("uploadButton");
const sampleButton = document.getElementById("sampleButton");
const clearButton = document.getElementById("clearButton");
const summaryGrid = document.getElementById("summaryGrid");
const clauseList = document.getElementById("clauseList");
const inlineBadges = document.getElementById("inlineBadges");
const clauseTemplate = document.getElementById("clauseTemplate");

let currentFile = null;

const sampleContract = `1. Liability
Supplier accepts unlimited liability and agrees to indemnify and hold harmless the customer.

2. Renewal
This agreement will automatically renew and may modify at any time without prior notice.

3. Service Levels
Provider will use reasonable efforts and may suspend service as soon as possible after notice.`;

initialize();

function initialize() {
  bindEvents();
  loadHealth();
  renderEmptyState();
}

function bindEvents() {
  fileInput.addEventListener("change", () => {
    const [file] = fileInput.files;
    setCurrentFile(file ?? null);
  });

  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });

  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
    const [file] = event.dataTransfer.files;
    if (file) {
      fileInput.files = event.dataTransfer.files;
      setCurrentFile(file);
    }
  });

  analyzeButton.addEventListener("click", () => submitFile("/analyze-contract"));
  uploadButton.addEventListener("click", () => submitFile("/upload-contract"));
  sampleButton.addEventListener("click", () => {
    const blob = new Blob([sampleContract], { type: "text/plain" });
    const sampleFile = new File([blob], "sample-contract.txt", { type: "text/plain" });
    setCurrentFile(sampleFile);
    submitFile("/analyze-contract");
  });

  clearButton.addEventListener("click", clearWorkspace);
}

async function loadHealth() {
  try {
    const response = await fetch("/health");
    if (!response.ok) {
      throw new Error("health check failed");
    }

    const payload = await response.json();
    healthStatus.textContent = payload.status === "ok" ? "Online" : "Sorun var";
  } catch (error) {
    healthStatus.textContent = "Offline";
  }
}

async function submitFile(endpoint) {
  if (!currentFile) {
    setMessage("Önce bir dosya seç.", "error");
    return;
  }

  toggleBusyState(true);
  setMessage(endpoint === "/analyze-contract" ? "Analiz çalışıyor..." : "Upload işlemi yapılıyor...");

  try {
    const formData = new FormData();
    formData.append("file", currentFile);

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.detail || "İşlem başarısız oldu.");
    }

    if (endpoint === "/upload-contract") {
      renderUploadResult(payload);
      setMessage(`Upload tamamlandı: ${payload.name}`, "success");
      return;
    }

    renderAnalysisResult(payload);
    setMessage(`Analiz tamamlandı: ${payload.name}`, "success");
  } catch (error) {
    renderEmptyState();
    setMessage(error.message || "Beklenmeyen bir hata oluştu.", "error");
  } finally {
    toggleBusyState(false);
  }
}

function renderUploadResult(payload) {
  renderSummary([
    { label: "Contract", value: payload.name },
    { label: "Contract ID", value: `#${payload.id}` },
    { label: "Text length", value: String(payload.text_length) },
    { label: "Saved at", value: formatDate(payload.date) },
  ]);

  inlineBadges.innerHTML = '<span class="badge status-ok">Upload complete</span>';
  clauseList.className = "clause-list empty";
  clauseList.textContent = "Bu istek sadece ham sözleşmeyi kaydetti. Clause ve risk sonucu için Analyze Contract kullan.";
}

function renderAnalysisResult(payload) {
  renderSummary([
    { label: "Contract", value: payload.name },
    { label: "Clause count", value: String(payload.clause_count) },
    { label: "Violation", value: String(payload.summary.violation_count) },
    { label: "Avg ML risk", value: payload.summary.average_ml_risk_score.toFixed(4) },
  ]);

  inlineBadges.innerHTML = "";
  appendBadge(`Warnings ${payload.summary.warning_count}`, "status-warning");
  appendBadge(`High risk ${payload.summary.high_risk_clause_count}`, "status-violation");
  appendBadge(`Contract #${payload.id}`, "status-ok");

  clauseList.className = "clause-list";
  clauseList.innerHTML = "";

  payload.clauses.forEach((clause) => {
    const node = clauseTemplate.content.firstElementChild.cloneNode(true);

    node.querySelector(".clause-order").textContent = `Clause ${clause.order_index}`;
    node.querySelector(".clause-label").textContent = clause.label ? `${clause.label}. madde` : "Unnamed clause";
    node.querySelector(".clause-text").textContent = clause.text;

    const statusBadge = node.querySelector(".status-badge");
    statusBadge.textContent = clause.overall_status;
    statusBadge.classList.add(`status-${clause.overall_status}`);

    const riskBadge = node.querySelector(".risk-badge");
    riskBadge.textContent = `${clause.ml_risk_level} risk ${clause.ml_risk_score.toFixed(4)}`;
    riskBadge.classList.add(`risk-${clause.ml_risk_level}`);

    const ambiguousRow = node.querySelector(".ambiguous-row");
    if (clause.ambiguous_terms.length === 0) {
      ambiguousRow.innerHTML = '<span class="token">none</span>';
    } else {
      clause.ambiguous_terms.forEach((term) => {
        ambiguousRow.appendChild(makeToken(term));
      });
    }

    const ruleList = node.querySelector(".rule-list");
    if (clause.rule_results.length === 0) {
      const noRule = document.createElement("div");
      noRule.className = "rule-pill";
      noRule.innerHTML = "<strong>Kural tetiklenmedi</strong><small>Bu clause için sadece ML tabanlı risk hesaplandı.</small>";
      ruleList.appendChild(noRule);
    } else {
      clause.rule_results.forEach((rule) => {
        const pill = document.createElement("div");
        pill.className = `rule-pill ${rule.severity}`;
        pill.innerHTML = `
          <strong>${rule.rule_name} · ${rule.severity}</strong>
          <small>${rule.message}</small>
          <small>Matched: ${rule.matched_phrases.join(", ")}</small>
          <small>Action: ${rule.recommendation}</small>
        `;
        ruleList.appendChild(pill);
      });
    }

    clauseList.appendChild(node);
  });
}

function renderSummary(items) {
  summaryGrid.innerHTML = "";

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "metric-card";
    card.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
    summaryGrid.appendChild(card);
  });
}

function renderEmptyState() {
  renderSummary([
    { label: "Contract", value: "-" },
    { label: "Clause count", value: "-" },
    { label: "Violation", value: "-" },
    { label: "Avg ML risk", value: "-" },
  ]);
  inlineBadges.innerHTML = "";
  clauseList.className = "clause-list empty";
  clauseList.textContent = "Henüz analiz sonucu yok.";
}

function clearWorkspace() {
  fileInput.value = "";
  currentFile = null;
  selectedFile.textContent = "Henuz dosya secilmedi.";
  setMessage("Dosya sec ve analizi baslat.");
  renderEmptyState();
}

function setCurrentFile(file) {
  currentFile = file;
  selectedFile.textContent = file ? `${file.name} · ${formatBytes(file.size)}` : "Henuz dosya secilmedi.";
}

function setMessage(message, type = "") {
  messageBox.textContent = message;
  messageBox.className = "message-box";
  if (type) {
    messageBox.classList.add(type);
  }
}

function toggleBusyState(isBusy) {
  analyzeButton.disabled = isBusy;
  uploadButton.disabled = isBusy;
  sampleButton.disabled = isBusy;
}

function formatBytes(size) {
  if (!size) {
    return "0 B";
  }

  const units = ["B", "KB", "MB"];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function appendBadge(text, className) {
  const badge = document.createElement("span");
  badge.className = `badge ${className}`;
  badge.textContent = text;
  inlineBadges.appendChild(badge);
}

function makeToken(text) {
  const token = document.createElement("span");
  token.className = "token";
  token.textContent = text;
  return token;
}
