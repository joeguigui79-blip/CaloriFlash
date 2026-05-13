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
    const w = canvas.width;
    const h = canvas.height;
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

  window.CFStats = {
    getLast7DaysTotals,
    getFrequentFoods,
    drawSimpleBars
  };
})();
