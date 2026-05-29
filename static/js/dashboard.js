/* ═══════════════════════════════════
   dashboard.js — Stats & Charts view
   Theme: Premium Interactive Charts via Chart.js
   ═══════════════════════════════════ */

let revenueChartInstance = null;
let mopChartInstance = null;
let platformChartInstance = null;

async function loadDashboard() {
  try {
    const stats = await API.get("/api/stats");
    renderStatCards(stats.today);
    renderRevenueLineChart(stats.monthly);
    renderMopDoughnutChart(stats.mop);
    renderPlatformBarChart(stats.platforms);
  } catch (e) {
    showToast("Failed to load dashboard stats", "error");
  }
}

function renderStatCards(today) {
  document.getElementById("stat-sales").textContent    = today.sales_count;
  document.getElementById("stat-revenue").textContent  = fmtAED(today.revenue);
  document.getElementById("stat-returns").textContent  = today.returns;
  document.getElementById("stat-exchanges").textContent = today.exchanges;
}

function renderRevenueLineChart(monthly) {
  const canvas = document.getElementById("revenue-chart-canvas");
  if (!canvas) return;

  if (revenueChartInstance) {
    revenueChartInstance.destroy();
  }

  if (!monthly || !monthly.length) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "14px Inter";
    ctx.fillStyle = "#6c757d";
    ctx.textAlign = "center";
    ctx.fillText("No revenue data available", canvas.width / 2, canvas.height / 2);
    return;
  }

  // Last 30 days, oldest first
  const sortedData = [...monthly].reverse().slice(-30);
  const labels = sortedData.map((d) => {
    // Format date "DD-MM-YYYY" -> "DD May"
    const [dd, mm, yyyy] = d.date.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${dd} ${months[parseInt(mm)-1]}`;
  });
  const revenues = sortedData.map((d) => d.rev || 0);

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, "rgba(113, 75, 103, 0.45)");
  gradient.addColorStop(1, "rgba(113, 75, 103, 0.02)");

  revenueChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Revenue (AED)",
        data: revenues,
        borderColor: "#714b67",
        borderWidth: 3,
        pointBackgroundColor: "#714b67",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        lineTension: 0.35,
        fill: true,
        backgroundColor: gradient,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#1f2d40",
          titleFont: { family: "Inter", weight: "bold" },
          bodyFont: { family: "Inter" },
          callbacks: {
            label: function(context) {
              return " " + fmtAED(context.raw);
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: "Inter", size: 10 }, color: "#6c757d" }
        },
        y: {
          grid: { color: "#edf0f3" },
          ticks: {
            font: { family: "Inter", size: 10 },
            color: "#6c757d",
            callback: function(value) {
              return value >= 1000 ? (value / 1000) + "k" : value;
            }
          }
        }
      }
    }
  });
}

function renderMopDoughnutChart(mop) {
  const canvas = document.getElementById("mop-chart-canvas");
  if (!canvas) return;

  if (mopChartInstance) {
    mopChartInstance.destroy();
  }

  const values = [mop.Cash || 0, mop.Card || 0, mop.Tabby || 0, mop.Tamara || 0];
  const total = values.reduce((a, b) => a + b, 0);

  const ctx = canvas.getContext("2d");

  if (total === 0) {
    mopChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["No Sales Today"],
        datasets: [{
          data: [1],
          backgroundColor: ["#edf0f3"],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "75%",
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });
    return;
  }

  mopChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Cash", "Card", "Tabby", "Tamara"],
      datasets: [{
        data: values,
        backgroundColor: ["#28a745", "#0d6efd", "#714b67", "#f59e0b"],
        borderWidth: 2,
        borderColor: "#fff",
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 12,
            font: { family: "Inter", size: 11, weight: "500" },
            color: "#212529",
            padding: 10
          }
        },
        tooltip: {
          backgroundColor: "#1f2d40",
          titleFont: { family: "Inter", weight: "bold" },
          bodyFont: { family: "Inter" },
          callbacks: {
            label: function(context) {
              const val = context.raw;
              const pct = ((val / total) * 100).toFixed(0);
              return ` ${context.label}: ${fmtAED(val)} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

function renderPlatformBarChart(platforms) {
  const canvas = document.getElementById("platform-chart-canvas");
  if (!canvas) return;

  if (platformChartInstance) {
    platformChartInstance.destroy();
  }

  const ctx = canvas.getContext("2d");

  if (!platforms || !platforms.length) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "14px Inter";
    ctx.fillStyle = "#6c757d";
    ctx.textAlign = "center";
    ctx.fillText("No platforms data available today", canvas.width / 2, canvas.height / 2);
    return;
  }

  const labels = platforms.map((p) => p.platform);
  const counts = platforms.map((p) => p.cnt);

  platformChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Transactions Count",
        data: counts,
        backgroundColor: "rgba(113, 75, 103, 0.85)",
        hoverBackgroundColor: "#714b67",
        borderRadius: 5,
        borderSkipped: false,
        barThickness: 24,
      }]
    },
    options: {
      indexAxis: "y", // Horizontal bar chart
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#1f2d40",
          titleFont: { family: "Inter", weight: "bold" },
          bodyFont: { family: "Inter" }
        }
      },
      scales: {
        x: {
          grid: { color: "#edf0f3" },
          ticks: {
            font: { family: "Inter", size: 10 },
            color: "#6c757d",
            stepSize: 1
          }
        },
        y: {
          grid: { display: false },
          ticks: { font: { family: "Inter", size: 11, weight: "600" }, color: "#212529" }
        }
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-refresh-stats").addEventListener("click", loadDashboard);
});
