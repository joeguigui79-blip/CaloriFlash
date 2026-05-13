(() => {
  function formatDate(date) {
    return date.toISOString().slice(0, 10);
  }

  async function getLast7DaysTotals(goal) {
    const out = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = formatDate(d);
      const entries = await window.CFMeals.getEntriesForDate(date);
      const total = entries.reduce((sum, e) => sum + (e.calories || 0), 0);
      out.push({ date, total, completed: total >= goal * 0.9 });
    }
    return out;
  }

  async function getLast7DaysMacros() {
    const out = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = formatDate(d);
      const entries = await window.CFMeals.getEntriesForDate(date);
      const proteins = entries.reduce((sum, e) => sum + (Number(e.proteins) || 0), 0);
      const carbs = entries.reduce((sum, e) => sum + (Number(e.carbs) || 0), 0);
      const fats = entries.reduce((sum, e) => sum + (Number(e.fats) || 0), 0);
      out.push({
        date,
        proteins: Math.round(proteins * 10) / 10,
        carbs: Math.round(carbs * 10) / 10,
        fats: Math.round(fats * 10) / 10
      });
    }
    return out;
  }

  function getMacroAverages(data) {
    const len = Math.max(1, data.length);
    const total = data.reduce(
      (acc, d) => {
        acc.proteins += d.proteins || 0;
        acc.carbs += d.carbs || 0;
        acc.fats += d.fats || 0;
        return acc;
      },
      { proteins: 0, carbs: 0, fats: 0 }
    );
    return {
      proteins: Math.round((total.proteins / len) * 10) / 10,
      carbs: Math.round((total.carbs / len) * 10) / 10,
      fats: Math.round((total.fats / len) * 10) / 10
    };
  }

  async function getFrequentFoods(limit = 3) {
    const entries = await window.CFDB.getAll(window.CFDB.STORES.entries);
    const map = new Map();
    entries.forEach((e) => {
      map.set(e.foodName, (map.get(e.foodName) || 0) + 1);
    });
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name]) => name);
  }

  function drawSimpleBars(canvas, data, goal) {
    const ctx = canvas.getContext("2d");
    const cssW = canvas.clientWidth || canvas.width;
    const cssH = Math.round(cssW * (170 / 320));
    canvas.width = cssW;
    canvas.height = cssH;
    const w = cssW;
    const h = cssH;
    ctx.clearRect(0, 0, w, h);

    const pad = 18;
    const maxValue = Math.max(goal, ...data.map((d) => d.total), 1);
    const barW = (w - pad * 2) / data.length - 8;

    ctx.fillStyle = "#67707c";
    ctx.font = "11px sans-serif";
    ctx.fillText("kcal (7 jours)", 10, 12);

    const goalY = h - pad - (goal / maxValue) * (h - pad * 2);
    ctx.strokeStyle = "rgba(255,167,38,0.9)";
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(pad, goalY);
    ctx.lineTo(w - pad, goalY);
    ctx.stroke();
    ctx.setLineDash([]);

    data.forEach((d, i) => {
      const x = pad + i * (barW + 8);
      const bh = (d.total / maxValue) * (h - pad * 2);
      const y = h - pad - bh;
      ctx.fillStyle = d.completed ? "#8bc34a" : "rgba(139,195,74,0.45)";
      ctx.fillRect(x, y, barW, bh);
      ctx.fillStyle = "#4b5561";
      ctx.fillText(String(new Date(d.date).getDate()), x + 2, h - 4);
    });
  }

  function drawMacroLines(canvas, data, targets = { proteins: 0, carbs: 0, fats: 0 }) {
    const ctx = canvas.getContext("2d");
    const cssW = canvas.clientWidth || canvas.width;
    const cssH = Math.round(cssW * (170 / 320));
    canvas.width = cssW;
    canvas.height = cssH;
    const w = cssW;
    const h = cssH;
    ctx.clearRect(0, 0, w, h);

    const padX = 24;
    const padY = 20;
    const maxValue = Math.max(
      1,
      ...data.map((d) => Math.max(d.proteins || 0, d.carbs || 0, d.fats || 0)),
      targets.proteins || 0,
      targets.carbs || 0,
      targets.fats || 0
    );

    function yFor(v) {
      return h - padY - (v / maxValue) * (h - padY * 2);
    }

    const series = [
      { key: "proteins", color: "#3b82f6" },
      { key: "carbs", color: "#fb923c" },
      { key: "fats", color: "#facc15" }
    ];

    ctx.strokeStyle = "rgba(103,112,124,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, h - padY);
    ctx.lineTo(w - 8, h - padY);
    ctx.stroke();

    series.forEach((s) => {
      const target = Number(targets[s.key]) || 0;
      if (target <= 0) {
        return;
      }
      ctx.strokeStyle = `${s.color}80`;
      ctx.setLineDash([4, 4]);
      const y = yFor(target);
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(w - 8, y);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    series.forEach((s) => {
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach((d, i) => {
        const x = padX + (i * (w - padX * 2)) / Math.max(1, data.length - 1);
        const y = yFor(Number(d[s.key]) || 0);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      data.forEach((d, i) => {
        const x = padX + (i * (w - padX * 2)) / Math.max(1, data.length - 1);
        const y = yFor(Number(d[s.key]) || 0);
        ctx.beginPath();
        ctx.arc(x, y, 2.8, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    ctx.fillStyle = "#67707c";
    ctx.font = "11px sans-serif";
    ctx.fillText("macros (7 jours)", 10, 12);
    data.forEach((d, i) => {
      const x = padX + (i * (w - padX * 2)) / Math.max(1, data.length - 1);
      ctx.fillText(String(new Date(d.date).getDate()), x - 4, h - 5);
    });
  }

  window.CFStats = {
    getLast7DaysTotals,
    getLast7DaysMacros,
    getMacroAverages,
    getFrequentFoods,
    drawSimpleBars,
    drawMacroLines
  };
})();
