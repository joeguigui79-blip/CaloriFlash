(() => {
  const MEAL_TYPES = ["petit-dejeuner", "dejeuner", "diner", "collations"];
  const DEFAULT_SETTINGS = {
    objectiveType: "maintenir",
    currentWeight: null,
    targetWeight: null,
    goalCalories: 2000,
    macroMode: "percent",
    macroPercentages: { proteins: 25, carbs: 50, fats: 25 },
    macroGrams: { proteins: 125, carbs: 250, fats: 55 }
  };
  const BADGE_STEPS = [
    { threshold: 3, label: "Bon debut" },
    { threshold: 7, label: "Une semaine!" },
    { threshold: 14, label: "Habitue" },
    { threshold: 30, label: "Expert" }
  ];

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

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function safeNum(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function round1(value) {
    return Math.round(value * 10) / 10;
  }

  function caloriesFor(food, grams) {
    return Math.round((food.calories_100g * grams) / 100);
  }

  function macrosFor(food, grams) {
    return {
      p: Math.round((food.proteines_100g * grams) / 100 * 10) / 10,
      g: Math.round((food.glucides_100g * grams) / 100 * 10) / 10,
      l: Math.round((food.lipides_100g * grams) / 100 * 10) / 10
    };
  }

  function normalizePercentages(percentages) {
    const p = clamp(Math.round(safeNum(percentages?.proteins, 25)), 5, 80);
    const c = clamp(Math.round(safeNum(percentages?.carbs, 50)), 5, 85);
    const f = clamp(Math.round(safeNum(percentages?.fats, 25)), 5, 60);
    const sum = Math.max(1, p + c + f);
    return {
      proteins: Math.round((p / sum) * 100),
      carbs: Math.round((c / sum) * 100),
      fats: 100 - Math.round((p / sum) * 100) - Math.round((c / sum) * 100)
    };
  }

  function percentagesToGrams(goalCalories, percentages) {
    return {
      proteins: round1(((goalCalories * percentages.proteins) / 100) / 4),
      carbs: round1(((goalCalories * percentages.carbs) / 100) / 4),
      fats: round1(((goalCalories * percentages.fats) / 100) / 9)
    };
  }

  function gramsToPercentages(goalCalories, grams) {
    const proteinsKcal = safeNum(grams?.proteins, 0) * 4;
    const carbsKcal = safeNum(grams?.carbs, 0) * 4;
    const fatsKcal = safeNum(grams?.fats, 0) * 9;
    const totalKcal = Math.max(1, proteinsKcal + carbsKcal + fatsKcal, goalCalories);
    return normalizePercentages({
      proteins: (proteinsKcal / totalKcal) * 100,
      carbs: (carbsKcal / totalKcal) * 100,
      fats: (fatsKcal / totalKcal) * 100
    });
  }

  function suggestGoalCalories(objectiveType, baseGoal = 2000) {
    const current = clamp(Math.round(safeNum(baseGoal, 2000)), 1200, 5000);
    if (objectiveType === "perdre") {
      return clamp(current - 250, 1200, 5000);
    }
    if (objectiveType === "prendre") {
      return clamp(current + 250, 1200, 5000);
    }
    return current;
  }

  function normalizeSettings(raw = {}) {
    const objectiveType = ["perdre", "maintenir", "prendre"].includes(raw.objectiveType)
      ? raw.objectiveType
      : DEFAULT_SETTINGS.objectiveType;
    const goalCalories = clamp(Math.round(safeNum(raw.goalCalories, DEFAULT_SETTINGS.goalCalories)), 1200, 5000);
    const macroMode = raw.macroMode === "grams" ? "grams" : "percent";
    const macroPercentages = normalizePercentages(raw.macroPercentages || DEFAULT_SETTINGS.macroPercentages);
    const macroGrams =
      macroMode === "grams"
        ? {
            proteins: round1(clamp(safeNum(raw.macroGrams?.proteins, 125), 20, 500)),
            carbs: round1(clamp(safeNum(raw.macroGrams?.carbs, 250), 20, 700)),
            fats: round1(clamp(safeNum(raw.macroGrams?.fats, 55), 10, 250))
          }
        : percentagesToGrams(goalCalories, macroPercentages);
    const harmonizedPercentages =
      macroMode === "grams" ? gramsToPercentages(goalCalories, macroGrams) : macroPercentages;
    const harmonizedGrams =
      macroMode === "grams" ? macroGrams : percentagesToGrams(goalCalories, harmonizedPercentages);

    return {
      objectiveType,
      currentWeight: raw.currentWeight == null || raw.currentWeight === "" ? null : round1(safeNum(raw.currentWeight, 0)),
      targetWeight: raw.targetWeight == null || raw.targetWeight === "" ? null : round1(safeNum(raw.targetWeight, 0)),
      goalCalories,
      macroMode,
      macroPercentages: harmonizedPercentages,
      macroGrams: harmonizedGrams
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
    const mealMacros = {
      "petit-dejeuner": { proteins: 0, carbs: 0, fats: 0 },
      dejeuner: { proteins: 0, carbs: 0, fats: 0 },
      diner: { proteins: 0, carbs: 0, fats: 0 },
      collations: { proteins: 0, carbs: 0, fats: 0 }
    };
    let total = 0;
    const macros = { proteins: 0, carbs: 0, fats: 0 };
    entries.forEach((e) => {
      total += e.calories;
      macros.proteins += safeNum(e.proteins, 0);
      macros.carbs += safeNum(e.carbs, 0);
      macros.fats += safeNum(e.fats, 0);
      if (mealTotals[e.mealType] != null) {
        mealTotals[e.mealType] += e.calories;
        mealMacros[e.mealType].proteins += safeNum(e.proteins, 0);
        mealMacros[e.mealType].carbs += safeNum(e.carbs, 0);
        mealMacros[e.mealType].fats += safeNum(e.fats, 0);
      }
    });
    MEAL_TYPES.forEach((t) => {
      mealMacros[t] = {
        proteins: round1(mealMacros[t].proteins),
        carbs: round1(mealMacros[t].carbs),
        fats: round1(mealMacros[t].fats)
      };
    });
    return {
      total,
      mealTotals,
      mealMacros,
      macros: {
        proteins: round1(macros.proteins),
        carbs: round1(macros.carbs),
        fats: round1(macros.fats)
      }
    };
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

  async function saveProfileSettings(settings) {
    const normalized = normalizeSettings(settings);
    await saveGoal(normalized.goalCalories);
    await window.CFDB.put(window.CFDB.STORES.settings, {
      key: "profileSettings",
      value: normalized,
      updatedAt: Date.now()
    });
    return normalized;
  }

  async function getProfileSettings() {
    const row = await window.CFDB.getByKey(window.CFDB.STORES.settings, "profileSettings");
    const legacyGoal = await getGoal();
    if (!row?.value) {
      return normalizeSettings({ ...DEFAULT_SETTINGS, goalCalories: legacyGoal });
    }
    return normalizeSettings({ ...row.value, goalCalories: row.value.goalCalories || legacyGoal });
  }

  function toDateOnly(date) {
    return date.toISOString().slice(0, 10);
  }

  function previousDate(dateStr) {
    const d = new Date(`${dateStr}T12:00:00`);
    d.setDate(d.getDate() - 1);
    return toDateOnly(d);
  }

  function nextDate(dateStr) {
    const d = new Date(`${dateStr}T12:00:00`);
    d.setDate(d.getDate() + 1);
    return toDateOnly(d);
  }

  async function getStreakInfo(minEntries = 2) {
    const entries = await window.CFDB.getAll(window.CFDB.STORES.entries);
    const dayCounts = new Map();
    entries.forEach((entry) => {
      const date = entry.date;
      dayCounts.set(date, (dayCounts.get(date) || 0) + 1);
    });
    const completedDays = [...dayCounts.entries()]
      .filter(([, count]) => count >= minEntries)
      .map(([date]) => date)
      .sort();

    const today = todayStr();
    let currentStreak = 0;
    let cursor = completedDays.includes(today) ? today : previousDate(today);
    while (completedDays.includes(cursor)) {
      currentStreak += 1;
      cursor = previousDate(cursor);
    }

    let bestStreak = 0;
    let streak = 0;
    let previous = null;
    completedDays.forEach((date) => {
      if (!previous) {
        streak = 1;
      } else if (nextDate(previous) === date) {
        streak += 1;
      } else {
        streak = 1;
      }
      bestStreak = Math.max(bestStreak, streak);
      previous = date;
    });

    return {
      current: currentStreak,
      best: bestStreak,
      completedDays
    };
  }

  function getEarnedBadges(bestStreak) {
    return BADGE_STEPS.filter((b) => bestStreak >= b.threshold);
  }

  window.CFMeals = {
    MEAL_TYPES,
    todayStr,
    yesterdayStr,
    DEFAULT_SETTINGS,
    BADGE_STEPS,
    caloriesFor,
    addEntry,
    getEntriesForDate,
    copyYesterdayToToday,
    summarize,
    upsertFavorite,
    getFavorites,
    getRecentFoods,
    saveGoal,
    getGoal,
    suggestGoalCalories,
    normalizeSettings,
    percentagesToGrams,
    gramsToPercentages,
    saveProfileSettings,
    getProfileSettings,
    getStreakInfo,
    getEarnedBadges
  };
})();
