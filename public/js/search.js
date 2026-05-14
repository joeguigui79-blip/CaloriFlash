(() => {
  function normalize(value) {
    return (value || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function fuzzyScore(query, text) {
    if (!query) {
      return 1;
    }
    if (text.startsWith(query)) {
      return 120 - (text.length - query.length) * 0.02;
    }
    if (text.includes(query)) {
      return 95 - text.indexOf(query) * 0.2;
    }
    let q = 0;
    let t = 0;
    let streak = 0;
    let score = 0;
    while (q < query.length && t < text.length) {
      if (query[q] === text[t]) {
        streak += 1;
        score += 2 + streak * 0.8;
        q += 1;
      } else {
        streak = 0;
      }
      t += 1;
    }
    if (q !== query.length) {
      return -1;
    }
    return score - (text.length - query.length) * 0.1;
  }

  function filterByType(food, type) {
    if (!type || type === "all") {
      return true;
    }
    if (food.is_custom) {
      return true;
    }
    const cat = food.categorie;
    if (type === "bruts") {
      return ["fruits", "legumes", "feculents", "viandes", "poissons", "oeufs"].includes(cat);
    }
    if (type === "produits") {
      return ["produits laitiers", "pains/viennoiseries", "biscuits/gateaux", "cereales", "snacks"].includes(cat);
    }
    if (type === "plats") {
      return ["plats courants", "sauces/condiments"].includes(cat);
    }
    if (type === "boissons") {
      return cat === "boissons";
    }
    return true;
  }

  function getEffectiveFoods() {
    var customs = window.CUSTOM_FOODS_LIST || [];
    var customIds = new Set(customs.map(function (f) { return f.id; }));
    var base = (window.FOODS_DB || []).filter(function (f) { return !customIds.has(f.id); });
    return customs.concat(base);
  }

  function rankFoods(query, options) {
    options = options || {};
    const q = normalize(query);
    const foods = getEffectiveFoods();
    const favoritesSet = options.favoritesSet || new Set();
    const recentSet = options.recentSet || new Set();
    const type = options.type || "all";

    const rows = [];
    for (let i = 0; i < foods.length; i += 1) {
      const food = foods[i];
      if (!filterByType(food, type)) {
        continue;
      }
      const nameNorm = normalize(food.nom);
      const score = fuzzyScore(q, nameNorm);
      if (score < 0) {
        continue;
      }
      let weight = score;
      if (favoritesSet.has(food.id)) {
        weight += 45;
      }
      if (recentSet.has(food.id)) {
        weight += 20;
      }
      if (food.is_custom) {
        weight += 15;
      }
      rows.push({ food, score: weight });
    }

    rows.sort((a, b) => b.score - a.score || a.food.nom.localeCompare(b.food.nom, "fr"));
    return rows.map((row) => row.food);
  }

  function formatPortionOptions(portions) {
    const entries = Object.entries(portions || { grammes: 100 });
    return entries.map(([label, grams]) => ({ label, grams }));
  }

  window.CFSearch = {
    normalize,
    rankFoods,
    formatPortionOptions
  };
})();
