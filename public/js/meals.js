(() => {
  const MEAL_TYPES = ["petit-dejeuner", "dejeuner", "diner", "collations"];

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function yesterdayStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  function uid(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  }

  function caloriesFor(food, grams) {
    return Math.round((food.calories_100g * grams) / 100);
  }

  function macrosFor(food, grams) {
    return {
      p: Math.round((food.proteines_100g * grams) / 1000 * 10) / 10,
      g: Math.round((food.glucides_100g * grams) / 1000 * 10) / 10,
      l: Math.round((food.lipides_100g * grams) / 1000 * 10) / 10
    };
  }

  async function getEntriesForDate(date) {
    return window.CFDB.queryEntriesByDate(date);
  }

  async function addEntry({ date, mealType, food, grams, source = "manual" }) {
    const cals = caloriesFor(food, grams);
    const macros = macrosFor(food, grams);
    const entry = {
      id: uid("entry"),
      date,
      mealType,
      foodId: food.id,
      foodName: food.nom,
      category: food.categorie,
      grams,
      calories: cals,
      proteins: macros.p,
      carbs: macros.g,
      fats: macros.l,
      source,
      createdAt: Date.now()
    };
    await window.CFDB.put(window.CFDB.STORES.entries, entry);
    return entry;
  }

  async function copyYesterdayToToday() {
    const y = await getEntriesForDate(yesterdayStr());
    const t = todayStr();
    const tasks = y.map((e) =>
      window.CFDB.put(window.CFDB.STORES.entries, {
        ...e,
        id: uid("entry"),
        date: t,
        source: "copie-hier",
        createdAt: Date.now()
      })
    );
    await Promise.all(tasks);
    return y.length;
  }

  function summarize(entries) {
    const mealTotals = {
      "petit-dejeuner": 0,
      dejeuner: 0,
      diner: 0,
      collations: 0
    };
    let total = 0;
    entries.forEach((e) => {
      total += e.calories;
      if (mealTotals[e.mealType] != null) {
        mealTotals[e.mealType] += e.calories;
      }
    });
    return { total, mealTotals };
  }

  async function upsertFavorite(foodId) {
    const existing = await window.CFDB.getByKey(window.CFDB.STORES.favorites, foodId);
    const now = Date.now();
    if (existing) {
      existing.count = (existing.count || 0) + 1;
      existing.updatedAt = now;
      await window.CFDB.put(window.CFDB.STORES.favorites, existing);
      return existing;
    }
    const food = window.FOODS_MAP.get(foodId);
    const newFav = {
      id: foodId,
      foodName: food ? food.nom : foodId,
      count: 1,
      updatedAt: now
    };
    await window.CFDB.put(window.CFDB.STORES.favorites, newFav);
    return newFav;
  }

  async function getFavorites() {
    const all = await window.CFDB.getAll(window.CFDB.STORES.favorites);
    return all.sort((a, b) => (b.count || 0) - (a.count || 0) || (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  async function getRecentFoods(limit = 30) {
    const entries = await window.CFDB.getAll(window.CFDB.STORES.entries);
    entries.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const seen = new Set();
    const out = [];
    for (let i = 0; i < entries.length; i += 1) {
      const e = entries[i];
      if (!seen.has(e.foodId)) {
        seen.add(e.foodId);
        out.push({
          id: e.foodId,
          foodName: e.foodName,
          calories_100g: window.FOODS_MAP.get(e.foodId)?.calories_100g || 0
        });
      }
      if (out.length >= limit) {
        break;
      }
    }
    return out;
  }

  async function saveGoal(goal) {
    return window.CFDB.put(window.CFDB.STORES.settings, { key: "goal", value: goal, updatedAt: Date.now() });
  }

  async function getGoal() {
    const row = await window.CFDB.getByKey(window.CFDB.STORES.settings, "goal");
    return row?.value || 2000;
  }

  window.CFMeals = {
    MEAL_TYPES,
    todayStr,
    yesterdayStr,
    caloriesFor,
    addEntry,
    getEntriesForDate,
    copyYesterdayToToday,
    summarize,
    upsertFavorite,
    getFavorites,
    getRecentFoods,
    saveGoal,
    getGoal
  };
})();
