(() => {
  const state = {
    selectedFood: null,
    favorites: [],
    recents: [],
    quickResults: [],
    recipeDraft: { ingredients: [] },
    tplDraft: { items: [] },
    pendingTemplate: null,
    pendingRecipe: null,
    editingRecipeId: null,
    cfPortionsDraft: {},
    editingCustomFoodId: null,
    recipeIngFood: null,
    goal: 2000,
    profileSettings: window.CFMeals.DEFAULT_SETTINGS,
    todaySummary: null,
    streakInfo: { current: 0, best: 0, completedDays: [] },
    offProduct: null,
    selectedFilter: "all",
    detailFood: null,
    detailMealType: "dejeuner"
  };

  function $(id) {
    return document.getElementById(id);
  }

  function safeInt(value, fallback) {
    fallback = fallback == null ? 0 : fallback;
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : fallback;
  }

  function safeNum(value, fallback) {
    fallback = fallback == null ? 0 : fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function round1(value) {
    return Math.round(value * 10) / 10;
  }

  let _toastTimer = null;
  function toast(message) {
    const node = $("toast");
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => node.classList.remove("show"), 2500);
  }

  function getPortionGrams(food, selectedLabel) {
    const portions = food.portions_standards || { grammes: 100 };
    if (selectedLabel && portions[selectedLabel] != null) {
      return Number(portions[selectedLabel]);
    }
    return 100;
  }

  function mealTypeLabel(type) {
    return {
      "petit-dejeuner": "Petit-dejeuner",
      dejeuner: "Dejeuner",
      diner: "Diner",
      collations: "Collations"
    }[type] || type;
  }

  function formatPortionLabel(label) {
    return label
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // =============================================
  // Custom Foods CRUD
  // =============================================

  async function loadCustomFoods() {
    const customs = await window.CFDB.getAll(window.CFDB.STORES.custom_foods);
    window.CUSTOM_FOODS_LIST = customs;
    // Rebuild FOODS_MAP: restore base foods, then overlay custom overrides
    (window.FOODS_DB || []).forEach((f) => window.FOODS_MAP.set(f.id, f));
    customs.forEach((f) => window.FOODS_MAP.set(f.id, f));
  }

  function openCustomFoodModal(food) {
    food = food || null;
    state.editingCustomFoodId = food ? food.id : null;

    $("cf-modal-title").textContent = food ? "Modifier l'aliment" : "Creer un aliment";
    $("cf-modal-tag").textContent = food
      ? (food.is_custom ? "Personnalise" : "Modification")
      : "Nouvel aliment";

    $("cf-name").value = food ? food.nom : "";
    $("cf-category").value = food ? (food.categorie || "custom") : "custom";
    $("cf-calories").value = food ? String(food.calories_100g || 0) : "";
    $("cf-proteins").value = food ? String(food.proteines_100g || 0) : "";
    $("cf-carbs").value = food ? String(food.glucides_100g || 0) : "";
    $("cf-fats").value = food ? String(food.lipides_100g || 0) : "";

    state.cfPortionsDraft = food && food.portions_standards
      ? Object.assign({}, food.portions_standards)
      : { grammes: 100 };

    renderCfPortionsList();

    const delBtn = $("cf-delete-btn");
    if (food && food.is_custom) {
      delBtn.classList.remove("hidden");
    } else {
      delBtn.classList.add("hidden");
    }

    const modal = $("custom-food-modal");
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    setTimeout(() => { const inp = $("cf-name"); if (inp) inp.focus(); }, 120);
  }

  function closeCustomFoodModal() {
    const modal = $("custom-food-modal");
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    state.editingCustomFoodId = null;
    state.cfPortionsDraft = {};
  }

  function renderCfPortionsList() {
    const list = $("cf-portions-list");
    list.innerHTML = "";
    Object.entries(state.cfPortionsDraft).forEach(function(entry) {
      var name = entry[0];
      var grams = entry[1];
      const row = document.createElement("div");
      row.className = "cf-portion-row";
      const nameSpan = document.createElement("span");
      nameSpan.className = "cf-portion-name";
      nameSpan.textContent = formatPortionLabel(name);
      const gramsSpan = document.createElement("span");
      gramsSpan.className = "cf-portion-grams";
      gramsSpan.textContent = grams + "g";
      row.appendChild(nameSpan);
      row.appendChild(gramsSpan);
      if (name !== "grammes") {
        const delBtn = document.createElement("button");
        delBtn.className = "btn-delete";
        delBtn.setAttribute("aria-label", "Retirer");
        delBtn.innerHTML = "&#10005;";
        delBtn.addEventListener("click", function() {
          delete state.cfPortionsDraft[name];
          renderCfPortionsList();
        });
        row.appendChild(delBtn);
      }
      list.appendChild(row);
    });
  }

  function addCfPortion() {
    const rawName = $("cf-portion-name").value.trim().toLowerCase().replace(/\s+/g, "_");
    const grams = safeInt($("cf-portion-grams").value, 0);
    if (!rawName || grams < 1) {
      toast("Nom et quantite (g) requis");
      return;
    }
    state.cfPortionsDraft[rawName] = grams;
    $("cf-portion-name").value = "";
    $("cf-portion-grams").value = "";
    renderCfPortionsList();
  }

  async function saveCustomFood() {
    const name = $("cf-name").value.trim();
    if (!name) {
      toast("Nom de l'aliment requis");
      return;
    }
    const caloriesVal = safeNum($("cf-calories").value, -1);
    if (caloriesVal < 0) {
      toast("Calories requises (minimum 0)");
      return;
    }

    const id = state.editingCustomFoodId
      || ("custom_" + Date.now() + "_" + Math.random().toString(16).slice(2, 8));

    const portions = Object.keys(state.cfPortionsDraft).length > 0
      ? Object.assign({}, state.cfPortionsDraft)
      : { grammes: 100 };

    const food = {
      id: id,
      nom: name,
      categorie: $("cf-category").value || "custom",
      calories_100g: Math.round(safeNum($("cf-calories").value, 0)),
      proteines_100g: safeNum($("cf-proteins").value, 0),
      glucides_100g: safeNum($("cf-carbs").value, 0),
      lipides_100g: safeNum($("cf-fats").value, 0),
      portions_standards: portions,
      is_custom: true,
      created_at: Date.now()
    };

    const wasEditing = !!state.editingCustomFoodId;
    await window.CFDB.put(window.CFDB.STORES.custom_foods, food);
    await loadCustomFoods();
    closeCustomFoodModal();
    toast(name + " " + (wasEditing ? "modifie !" : "cree !"));
    renderQuickLists($("quick-search").value || "");
    await refreshFavoritesAndRecents();
  }

  async function deleteCustomFood(id) {
    if (!confirm("Supprimer cet aliment personnalise ?")) {
      return;
    }
    await window.CFDB.remove(window.CFDB.STORES.custom_foods, id);
    await loadCustomFoods();
    closeCustomFoodModal();
    toast("Aliment supprime");
    renderQuickLists($("quick-search").value || "");
    await refreshFavoritesAndRecents();
  }

  // =============================================
  // Food Detail Bottom Sheet
  // =============================================

  function openFoodDetail(food) {
    state.detailFood = food;
    const mealSel = $("meal-select");
    state.detailMealType = mealSel ? mealSel.value : "dejeuner";

    $("food-detail-name").textContent = food.nom;
    $("food-detail-base-kcal").textContent = food.calories_100g + " kcal / 100g \u00b7 P:" + food.proteines_100g + "g G:" + food.glucides_100g + "g L:" + food.lipides_100g + "g";
    $("food-detail-meal-tag").textContent = mealTypeLabel(state.detailMealType);

    const mealRow = $("food-detail-meal-btns");
    mealRow.innerHTML = "";
    window.CFMeals.MEAL_TYPES.forEach((type) => {
      const btn = document.createElement("button");
      btn.className = "btn-meal-pick" + (type === state.detailMealType ? " selected" : "");
      btn.textContent = mealTypeLabel(type);
      btn.addEventListener("click", () => {
        state.detailMealType = type;
        $("food-detail-meal-tag").textContent = mealTypeLabel(type);
        mealRow.querySelectorAll(".btn-meal-pick").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
      });
      mealRow.appendChild(btn);
    });

    const portionContainer = $("food-detail-portions");
    portionContainer.innerHTML = "";
    const opts = window.CFSearch.formatPortionOptions(food.portions_standards);
    const firstGrams = opts.length > 0 ? opts[0].grams : 100;
    $("food-detail-qty").value = String(firstGrams);

    opts.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.className = "btn-portion" + (idx === 0 ? " selected" : "");
      btn.innerHTML = formatPortionLabel(opt.label) + "<small>" + opt.grams + "g</small>";
      btn.addEventListener("click", () => {
        portionContainer.querySelectorAll(".btn-portion").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        $("food-detail-qty").value = String(opt.grams);
        updateDetailCalc();
      });
      portionContainer.appendChild(btn);
    });

    updateDetailCalc();

    const modal = $("food-detail-modal");
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeDetailModal() {
    const modal = $("food-detail-modal");
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    state.detailFood = null;
  }

  function updateDetailCalc() {
    const food = state.detailFood;
    if (!food) {
      return;
    }
    const qty = Math.max(0, safeInt($("food-detail-qty").value, 100));
    const kcal = Math.round((food.calories_100g * qty) / 100);
    const proteins = round1((food.proteines_100g || 0) * qty / 100);
    const carbs = round1((food.glucides_100g || 0) * qty / 100);
    const fats = round1((food.lipides_100g || 0) * qty / 100);
    $("food-detail-kcal-value").textContent = String(kcal);
    $("food-detail-macros-preview").textContent = "P: " + proteins + "g \u00b7 G: " + carbs + "g \u00b7 L: " + fats + "g";
  }

  async function addFoodFromDetail() {
    const food = state.detailFood;
    if (!food) {
      return;
    }
    const qty = Math.max(1, safeInt($("food-detail-qty").value, 100));
    await window.CFMeals.addEntry({
      date: window.CFMeals.todayStr(),
      mealType: state.detailMealType,
      food,
      grams: qty,
      source: food.id.startsWith("off-") ? "barcode" : "manual"
    });
    await window.CFMeals.upsertFavorite(food.id);
    const label = mealTypeLabel(state.detailMealType);
    closeDetailModal();
    toast(food.nom + " ajoute (" + label + ")");
    openTab("today");
    await refreshToday();
    await refreshStreak();
    await refreshFavoritesAndRecents();
    await refreshStats();
  }

  function getMacroTargets(settings) {
    settings = settings || state.profileSettings;
    if (!settings) {
      return { proteins: 125, carbs: 250, fats: 55 };
    }
    if (settings.macroMode === "grams") {
      return settings.macroGrams;
    }
    return window.CFMeals.percentagesToGrams(settings.goalCalories, settings.macroPercentages);
  }

  function getMacroRatio(consumed, target) {
    return Math.min(1.5, consumed / Math.max(1, target));
  }

  function computeBalanceScore(summary, targets) {
    const macros = summary && summary.macros ? summary.macros : { proteins: 0, carbs: 0, fats: 0 };
    const pDiff = Math.abs((macros.proteins - targets.proteins) / Math.max(1, targets.proteins));
    const cDiff = Math.abs((macros.carbs - targets.carbs) / Math.max(1, targets.carbs));
    const fDiff = Math.abs((macros.fats - targets.fats) / Math.max(1, targets.fats));
    const averageDiff = (pDiff + cDiff + fDiff) / 3;
    const score = Math.max(0, Math.round(100 - averageDiff * 100));
    return Math.min(100, score);
  }

  function getMotivationMessage(summary) {
    const entriesCount = (summary && summary.entries ? summary.entries : []).length;
    if (entriesCount === 0) {
      return "Bonne journee! N'oublie pas de noter tes repas";
    }
    if (summary.total < state.goal * 0.95) {
      return "Tu es sur la bonne voie!";
    }
    if (summary.total <= state.goal * 1.05) {
      return "Bravo, objectif atteint!";
    }
    return "Attention, tu depasses un peu aujourd'hui";
  }

  async function deleteEntry(id) {
    await window.CFDB.remove(window.CFDB.STORES.entries, id);
    toast("Aliment supprime");
    await refreshToday();
    await refreshStreak();
    await refreshStats();
  }

  function renderTodayEntries(entries) {
    const root = $("today-entries");
    if (!root) {
      return;
    }
    root.innerHTML = "";
    if (!entries || entries.length === 0) {
      return;
    }
    const grouped = {};
    window.CFMeals.MEAL_TYPES.forEach((t) => {
      grouped[t] = [];
    });
    entries.forEach((e) => {
      if (grouped[e.mealType]) {
        grouped[e.mealType].push(e);
      }
    });

    window.CFMeals.MEAL_TYPES.forEach((type) => {
      const typeEntries = grouped[type];
      if (!typeEntries.length) {
        return;
      }
      const block = document.createElement("div");
      block.className = "card";
      const h = document.createElement("h3");
      h.textContent = mealTypeLabel(type);
      block.appendChild(h);
      typeEntries.forEach((entry) => {
        const row = document.createElement("div");
        row.className = "list-item";
        row.innerHTML =
          "<div>" +
          "<strong>" + entry.foodName + "</strong>" +
          "<p class=\"small-label\">" + entry.grams + " g \u00b7 " + entry.calories + " kcal \u00b7 P:" + entry.proteins + "g G:" + entry.carbs + "g L:" + entry.fats + "g</p>" +
          "</div>" +
          "<button class=\"btn-delete\" aria-label=\"Supprimer cet aliment\">&#x2715;</button>";
        row.querySelector(".btn-delete").addEventListener("click", () => deleteEntry(entry.id));
        block.appendChild(row);
      });
      root.appendChild(block);
    });
  }

  function renderMealBlocks(mealTotals, mealMacros) {
    const root = $("meal-blocks");
    root.innerHTML = "";
    window.CFMeals.MEAL_TYPES.forEach((type) => {
      const m = (mealMacros && mealMacros[type]) || { proteins: 0, carbs: 0, fats: 0 };
      const card = document.createElement("div");
      card.className = "meal-block";
      card.innerHTML =
        "<p class=\"small-label\">" + mealTypeLabel(type) + "</p>" +
        "<h3>" + ((mealTotals && mealTotals[type]) || 0) + " kcal</h3>" +
        "<p class=\"meal-macros\">P: " + m.proteins + "g \u00b7 G: " + m.carbs + "g \u00b7 L: " + m.fats + "g</p>";
      root.appendChild(card);
    });
  }

  function updateGauge(total, goal) {
    const ratio = Math.min(1.5, total / Math.max(1, goal));
    const circumference = 327;
    const offset = Math.max(0, circumference - circumference * Math.min(1, ratio));
    $("gauge-ring").style.strokeDashoffset = String(offset);
    $("gauge-percent").textContent = Math.round(ratio * 100) + "%";
  }

  function renderMacroProgress(summary, targets) {
    const root = $("macro-progress-list");
    const macros = summary.macros;
    const rows = [
      { key: "proteins", label: "Proteines", consumed: macros.proteins, target: targets.proteins, color: "#3b82f6" },
      { key: "carbs", label: "Glucides", consumed: macros.carbs, target: targets.carbs, color: "#fb923c" },
      { key: "fats", label: "Lipides", consumed: macros.fats, target: targets.fats, color: "#facc15" }
    ];

    root.innerHTML = "";
    rows.forEach((row) => {
      const ratio = getMacroRatio(row.consumed, row.target);
      const line = document.createElement("div");
      line.className = "macro-item";
      line.innerHTML =
        "<div class=\"macro-head\">" +
        "<strong>" + row.label + "</strong>" +
        "<span>" + round1(row.consumed) + "g / " + round1(row.target) + "g</span>" +
        "</div>" +
        "<div class=\"macro-bar-bg\">" +
        "<div class=\"macro-bar-fill\" style=\"width:" + Math.min(100, ratio * 100) + "%;background:" + row.color + "\"></div>" +
        "</div>";
      root.appendChild(line);
    });
  }

  function renderStreakAndBadges() {
    $("streak-current").textContent = String(state.streakInfo.current || 0);
    $("streak-best").textContent = String(state.streakInfo.best || 0);
    $("stats-streak-current").textContent = String(state.streakInfo.current || 0);
    $("stats-streak-best").textContent = String(state.streakInfo.best || 0);

    const badges = window.CFMeals.getEarnedBadges(state.streakInfo.best || 0);
    const badgesRoot = $("badges-list");
    badgesRoot.innerHTML = "";
    if (!badges.length) {
      badgesRoot.innerHTML = "<span class=\"badge muted\">Aucun badge pour l'instant</span>";
      return;
    }
    badges.forEach((b) => {
      const chip = document.createElement("span");
      chip.className = "badge";
      chip.textContent = b.threshold + " jours - " + b.label;
      badgesRoot.appendChild(chip);
    });
  }

  function openTab(tab) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    document.querySelectorAll(".bottom-tabs button").forEach((b) => b.classList.remove("active"));
    const target = $("view-" + tab);
    if (target) {
      target.classList.add("active");
    }
    const btn = document.querySelector(".bottom-tabs button[data-tab=\"" + tab + "\"]");
    if (btn) {
      btn.classList.add("active");
    }
  }

  async function refreshToday() {
    const date = window.CFMeals.todayStr();
    const entries = await window.CFMeals.getEntriesForDate(date);
    const summary = window.CFMeals.summarize(entries);
    summary.entries = entries;
    state.todaySummary = summary;

    const targets = getMacroTargets();
    const remaining = state.goal - summary.total;
    const score = computeBalanceScore(summary, targets);

    $("today-total").textContent = String(summary.total);
    $("goal-value").textContent = String(state.goal);
    $("goal-input").value = String(state.goal);
    $("remaining-kcal").textContent = String(Math.max(0, remaining));
    $("motivation-msg").textContent = getMotivationMessage(summary);
    $("balance-score").textContent = String(score);

    updateGauge(summary.total, state.goal);
    renderMealBlocks(summary.mealTotals, summary.mealMacros);
    renderTodayEntries(entries);
    renderMacroProgress(summary, targets);
  }

  function buildFoodRow(food, options) {
    options = options || {};
    const row = document.createElement("div");
    row.className = "list-item food-row";
    const isCustom = !!food.is_custom;
    const catText = food.categorie || "";

    const infoDiv = document.createElement("div");
    infoDiv.className = "food-row-info";
    const nameEl = document.createElement("strong");
    nameEl.textContent = food.nom;
    const metaEl = document.createElement("p");
    metaEl.className = "small-label";
    metaEl.textContent = food.calories_100g + " kcal / 100g" + (catText ? " \u00b7 " + catText : "");
    infoDiv.appendChild(nameEl);
    infoDiv.appendChild(metaEl);

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "food-row-actions";

    if (options.showFav) {
      const favBtn = document.createElement("button");
      favBtn.className = "btn-fav-star";
      favBtn.setAttribute("data-action", "fav");
      favBtn.setAttribute("aria-label", "Ajouter aux favoris");
      favBtn.innerHTML = "&#9734;";
      favBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await window.CFMeals.upsertFavorite(food.id);
        await refreshFavoritesAndRecents();
        toast("Ajoute aux favoris");
      });
      actionsDiv.appendChild(favBtn);
    }

    const editBtn = document.createElement("button");
    editBtn.className = "btn-food-edit";
    editBtn.setAttribute("data-action", "edit");
    editBtn.setAttribute("aria-label", "Modifier cet aliment");
    editBtn.innerHTML = "&#9998;";
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openCustomFoodModal(food);
    });
    actionsDiv.appendChild(editBtn);

    const arrow = document.createElement("span");
    arrow.className = "food-row-arrow";
    arrow.innerHTML = "&#8250;";
    actionsDiv.appendChild(arrow);

    row.appendChild(infoDiv);
    row.appendChild(actionsDiv);

    row.addEventListener("click", (e) => {
      if (e.target.closest("[data-action]")) {
        return;
      }
      openFoodDetail(food);
    });

    return row;
  }

  function section(title, foods, options) {
    options = options || {};
    const wrap = document.createElement("div");
    wrap.className = "card";
    const h = document.createElement("h3");
    h.textContent = title;
    wrap.appendChild(h);
    foods.forEach((food) => wrap.appendChild(buildFoodRow(food, options)));
    return wrap;
  }

  function renderPortions(food) {
    const select = $("portion-select");
    const opts = window.CFSearch.formatPortionOptions(food.portions_standards);
    select.innerHTML = "";
    opts.forEach((o, idx) => {
      const option = document.createElement("option");
      option.value = o.label;
      option.textContent = o.label + " (" + o.grams + " g)";
      if (idx === 0) {
        $("quantity-input").value = String(o.grams);
      }
      select.appendChild(option);
    });
  }

  async function refreshFavoritesAndRecents() {
    const favRows = await window.CFMeals.getFavorites();
    const favorites = favRows.map((f) => window.FOODS_MAP.get(f.id)).filter(Boolean);
    state.favorites = favorites.slice(0, 20);
    const recents = await window.CFMeals.getRecentFoods(20);
    state.recents = recents.map((r) => window.FOODS_MAP.get(r.id)).filter(Boolean);
    renderQuickLists($("quick-search").value || "");
  }

  function renderQuickLists(query) {
    const root = $("quick-lists");
    root.innerHTML = "";
    const favSet = new Set(state.favorites.map((f) => f.id));
    const recentSet = new Set(state.recents.map((f) => f.id));
    const ranked = window.CFSearch.rankFoods(query, {
      favoritesSet: favSet,
      recentSet: recentSet,
      type: state.selectedFilter
    });
    state.quickResults = ranked.slice(0, 50);
    const q = (query || "").trim();

    if (!q) {
      if (state.favorites.length) {
        root.appendChild(section("Favoris personnels", state.favorites.slice(0, 8), { showFav: false }));
      }
      if (state.recents.length) {
        root.appendChild(section("Aliments recents", state.recents.slice(0, 8), { showFav: true }));
      }
      // Custom foods section
      const customFoods = (window.CUSTOM_FOODS_LIST || []);
      if (customFoods.length) {
        root.appendChild(section("Mes aliments personnalises", customFoods.slice(0, 8), { showFav: true }));
      }
      root.appendChild(section("Suggestions", ranked.slice(0, 12), { showFav: true }));
      return;
    }

    root.appendChild(section("Resultats recherche", state.quickResults.slice(0, 25), { showFav: true }));
  }

  async function addSelectedToMeal() {
    const food = state.selectedFood || state.offProduct;
    if (!food) {
      toast("Selectionnez un aliment");
      return;
    }
    const mealType = $("meal-select").value;
    const quantityInput = safeInt($("quantity-input").value, 100);
    const portionLabel = $("portion-select").value;
    const portionBase = getPortionGrams(food, portionLabel);
    const grams = Math.max(1, quantityInput || portionBase);
    await window.CFMeals.addEntry({
      date: window.CFMeals.todayStr(),
      mealType,
      food,
      grams,
      source: food.id.startsWith("off-") ? "barcode" : "manual"
    });
    await window.CFMeals.upsertFavorite(food.id);
    state.selectedFood = food;
    toast("Ajoute");
    await refreshToday();
    await refreshStreak();
    await refreshFavoritesAndRecents();
    await refreshStats();
  }

  async function renderTemplates() {
    const list = $("templates-list");
    list.innerHTML = "";
    const templates = await window.CFRecipes.listTemplates();
    if (!templates.length) {
      list.innerHTML =
        "<div class=\"tpl-empty-state\">" +
        "<p class=\"tpl-empty-icon\">🍽</p>" +
        "<p class=\"tpl-empty-title\">Aucun repas type pour l'instant</p>" +
        "<p class=\"tpl-empty-hint\">Sauvegardez ce que vous mangez souvent pour le reutiliser en 1 tap.</p>" +
        "</div>";
      return;
    }
    templates.forEach((tpl) => {
      let totalKcal = 0;
      tpl.items.forEach((item) => {
        const food = window.FOODS_MAP.get(item.foodId);
        if (food) {
          totalKcal += Math.round((food.calories_100g * item.grams) / 100);
        }
      });
      const visibleItems = tpl.items.slice(0, 5);
      const extraCount = tpl.items.length - visibleItems.length;
      const chipsHtml = visibleItems.map((item) =>
        "<span class=\"tpl-food-chip\">" + item.foodName + " (" + item.grams + "g)</span>"
      ).join("") + (extraCount > 0 ? "<span class=\"tpl-food-chip tpl-food-more\">+" + extraCount + "</span>" : "");

      const card = document.createElement("div");
      card.className = "tpl-card";
      card.innerHTML =
        "<div class=\"tpl-card-header\">" +
        "<div class=\"tpl-card-meta\">" +
        "<p class=\"tpl-card-name\">" + tpl.name + "</p>" +
        "<p class=\"tpl-card-kcal\">" + totalKcal + " kcal &bull; " + tpl.items.length + " aliment" + (tpl.items.length > 1 ? "s" : "") + "</p>" +
        "</div>" +
        "<button class=\"btn-delete\" data-act=\"delete\" aria-label=\"Supprimer\">🗑</button>" +
        "</div>" +
        "<div class=\"tpl-card-foods\">" + chipsHtml + "</div>" +
        "<button class=\"btn-use-tpl\" data-act=\"apply\">Utiliser ce repas</button>";

      card.querySelector("[data-act=\"apply\"]").addEventListener("click", () => {
        applyTemplateWithMealPicker(tpl.id, tpl.name, totalKcal);
      });
      card.querySelector("[data-act=\"delete\"]").addEventListener("click", async () => {
        if (!confirm("Supprimer \"" + tpl.name + "\" ?")) {
          return;
        }
        await window.CFRecipes.deleteTemplate(tpl.id);
        toast("Repas type supprime");
        await renderTemplates();
      });
      list.appendChild(card);
    });
  }

  function applyTemplateWithMealPicker(tplId, tplName, totalKcal) {
    state.pendingTemplate = { id: tplId, name: tplName, totalKcal };
    $("meal-picker-tpl-name").textContent = tplName;
    $("meal-picker-tpl-kcal").textContent = totalKcal + " kcal";
    $("meal-picker-overlay").classList.remove("hidden");
  }

  async function applyTemplateToMealType(tplId, mealType) {
    const templates = await window.CFRecipes.listTemplates();
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl) {
      return 0;
    }
    let count = 0;
    for (const item of tpl.items) {
      const food = window.FOODS_MAP.get(item.foodId);
      if (!food) {
        continue;
      }
      await window.CFMeals.addEntry({
        date: window.CFMeals.todayStr(),
        mealType,
        food,
        grams: item.grams,
        source: "template"
      });
      count += 1;
    }
    return count;
  }

  function renderTplDraft() {
    const list = $("tpl-manual-draft");
    const kcalEl = $("tpl-manual-kcal");
    list.innerHTML = "";
    let total = 0;
    state.tplDraft.items.forEach((item, idx) => {
      const food = window.FOODS_MAP.get(item.foodId);
      const kcal = food ? Math.round((food.calories_100g * item.grams) / 100) : 0;
      total += kcal;
      const li = document.createElement("li");
      li.className = "list-item";
      li.innerHTML = "<span>" + item.foodName + " - " + item.grams + "g (" + kcal + " kcal)</span><button class=\"btn-delete\" aria-label=\"Retirer\">&#10005;</button>";
      li.querySelector("button").addEventListener("click", () => {
        state.tplDraft.items.splice(idx, 1);
        renderTplDraft();
      });
      list.appendChild(li);
    });
    kcalEl.textContent = state.tplDraft.items.length ? "Total : " + total + " kcal" : "";
  }

  function addToTplDraft() {
    const query = $("tpl-manual-search").value.trim();
    if (!query) {
      toast("Recherchez un aliment d'abord");
      return;
    }
    const match = window.CFSearch.rankFoods(query, { type: "all" })[0];
    if (!match) {
      toast("Aucun aliment trouve");
      return;
    }
    const grams = Math.max(1, safeInt($("tpl-manual-qty").value, 100));
    state.tplDraft.items.push({ foodId: match.id, foodName: match.nom, grams, mealType: "dejeuner" });
    $("tpl-manual-search").value = "";
    renderTplDraft();
  }

  async function saveTplManual() {
    const name = $("tpl-manual-name").value.trim();
    if (!name) {
      toast("Nom du repas requis");
      return;
    }
    if (!state.tplDraft.items.length) {
      toast("Ajoutez des aliments d'abord");
      return;
    }
    try {
      await window.CFRecipes.saveTemplate({ name, items: state.tplDraft.items });
      state.tplDraft.items = [];
      $("tpl-manual-name").value = "";
      renderTplDraft();
      toast("Repas type cree !");
      await renderTemplates();
    } catch (err) {
      console.error("saveTplManual error:", err);
      toast("Erreur lors de la creation");
    }
  }

  function updateRecipePreview() {
    const recipe = {
      portions: safeInt($("recipe-portions").value, 1),
      ingredients: state.recipeDraft.ingredients
    };
    const kcal = window.CFRecipes.calcRecipe(recipe);
    const totalsEl = $("recipe-totals");
    if (state.recipeDraft.ingredients.length > 0) {
      totalsEl.classList.remove("hidden");
      $("recipe-total-kcal").textContent = kcal.total + " kcal";
      $("recipe-portion-kcal").textContent = kcal.perPortion + " kcal";
    } else {
      totalsEl.classList.add("hidden");
    }
    const list = $("recipe-ingredients");
    list.innerHTML = "";
    state.recipeDraft.ingredients.forEach((ing, index) => {
      const food = window.FOODS_MAP.get(ing.foodId);
      const ingKcal = food ? Math.round((food.calories_100g * ing.grams) / 100) : 0;
      const li = document.createElement("li");
      li.className = "list-item";
      li.innerHTML =
        "<div>" +
        "<strong>" + ing.foodName + "</strong>" +
        "<p class=\"small-label\">" + ing.grams + "g \u00b7 " + ingKcal + " kcal</p>" +
        "</div>" +
        "<button class=\"btn-delete\" aria-label=\"Retirer\">&#10005;</button>";
      li.querySelector(".btn-delete").addEventListener("click", () => {
        state.recipeDraft.ingredients.splice(index, 1);
        updateRecipePreview();
      });
      list.appendChild(li);
    });
  }

  async function renderRecipes() {
    const list = $("recipes-list");
    list.innerHTML = "";
    const rows = await window.CFRecipes.listRecipes();
    if (!rows.length) {
      list.innerHTML =
        "<div class=\"tpl-empty-state\">" +
        "<p class=\"tpl-empty-icon\">🍲</p>" +
        "<p class=\"tpl-empty-title\">Aucune recette pour l'instant</p>" +
        "<p class=\"tpl-empty-hint\">Creez votre premiere recette avec ses ingredients et le nombre de portions.</p>" +
        "</div>";
      return;
    }
    rows.forEach((r) => {
      const visibleIngs = r.ingredients.slice(0, 5);
      const extraCount = r.ingredients.length - visibleIngs.length;
      const chipsHtml = visibleIngs.map((ing) =>
        "<span class=\"tpl-food-chip\">" + ing.foodName + " (" + ing.grams + "g)</span>"
      ).join("") + (extraCount > 0 ? "<span class=\"tpl-food-chip tpl-food-more\">+" + extraCount + "</span>" : "");

      const card = document.createElement("div");
      card.className = "tpl-card";
      card.innerHTML =
        "<div class=\"tpl-card-header\">" +
        "<div class=\"tpl-card-meta\">" +
        "<p class=\"tpl-card-name\">" + r.name + "</p>" +
        "<p class=\"tpl-card-kcal\">" + r.kcalPerPortion + " kcal / portion &bull; " + r.portions + " portion" + (r.portions > 1 ? "s" : "") + "</p>" +
        "<p class=\"recipe-total-tag\">" + r.totalKcal + " kcal au total</p>" +
        "</div>" +
        "<div class=\"recipe-card-actions-top\">" +
        "<button class=\"btn-recipe-edit\" data-act=\"edit\" aria-label=\"Modifier\">&#9998;</button>" +
        "<button class=\"btn-delete\" data-act=\"delete\" aria-label=\"Supprimer\">🗑</button>" +
        "</div>" +
        "</div>" +
        "<div class=\"tpl-card-foods\">" + chipsHtml + "</div>" +
        "<button class=\"btn-use-tpl\" data-act=\"add\">+ Ajouter 1 portion</button>";

      card.querySelector("[data-act=\"add\"]").addEventListener("click", () => {
        addRecipeWithMealPicker(r);
      });
      card.querySelector("[data-act=\"edit\"]").addEventListener("click", () => {
        editRecipe(r);
      });
      card.querySelector("[data-act=\"delete\"]").addEventListener("click", async () => {
        if (!confirm("Supprimer \"" + r.name + "\" ?")) {
          return;
        }
        await window.CFRecipes.removeRecipe(r.id);
        toast("Recette supprimee");
        await renderRecipes();
      });
      list.appendChild(card);
    });
  }

  async function refreshStreak() {
    state.streakInfo = await window.CFMeals.getStreakInfo(2);
    renderStreakAndBadges();
  }

  async function refreshStats() {
    const data = await window.CFStats.getLast7DaysTotals(state.goal);
    const avg = Math.round(data.reduce((a, b) => a + b.total, 0) / Math.max(1, data.length));
    const full = data.filter((d) => d.completed).length;
    const freq = await window.CFStats.getFrequentFoods(3);
    $("avg-7days").textContent = String(avg);
    $("full-days").textContent = String(full);
    $("freq-foods").textContent = freq.join(", ") || "-";
    window.CFStats.drawSimpleBars($("stats-chart"), data, state.goal);

    const macros7 = await window.CFStats.getLast7DaysMacros();
    const avgMacros = window.CFStats.getMacroAverages(macros7);
    $("avg-proteins").textContent = String(avgMacros.proteins);
    $("avg-carbs").textContent = String(avgMacros.carbs);
    $("avg-fats").textContent = String(avgMacros.fats);
    window.CFStats.drawMacroLines($("macros-chart"), macros7, getMacroTargets());
    renderStreakAndBadges();
  }

  async function saveTemplateFromToday() {
    const name = $("meal-template-name").value.trim();
    if (!name) {
      toast("Nom requis");
      return;
    }
    try {
      const entries = await window.CFMeals.getEntriesForDate(window.CFMeals.todayStr());
      if (!entries.length) {
        toast("Ajoutez d'abord des aliments aujourd'hui");
        return;
      }
      await window.CFRecipes.saveTemplate({
        name,
        items: entries.map((e) => ({
          foodId: e.foodId,
          foodName: e.foodName,
          grams: e.grams,
          mealType: e.mealType
        }))
      });
      $("meal-template-name").value = "";
      toast("Repas type enregistre !");
      await renderTemplates();
    } catch (err) {
      console.error("saveTemplateFromToday error:", err);
      toast("Erreur lors de l'enregistrement");
    }
  }

  function openRecipeIngSheet(food) {
    state.recipeIngFood = food;
    $("recipe-ing-name").textContent = food.nom;
    $("recipe-ing-base-kcal").textContent = food.calories_100g + " kcal / 100g";

    const portionContainer = $("recipe-ing-portions");
    portionContainer.innerHTML = "";
    const opts = window.CFSearch.formatPortionOptions(food.portions_standards);
    const firstGrams = opts.length > 0 ? opts[0].grams : 100;
    $("recipe-ing-qty").value = String(firstGrams);

    opts.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.className = "btn-portion" + (idx === 0 ? " selected" : "");
      btn.innerHTML = formatPortionLabel(opt.label) + "<small>" + opt.grams + "g</small>";
      btn.addEventListener("click", () => {
        portionContainer.querySelectorAll(".btn-portion").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        $("recipe-ing-qty").value = String(opt.grams);
        updateRecipeIngCalc();
      });
      portionContainer.appendChild(btn);
    });

    updateRecipeIngCalc();
    const modal = $("recipe-ing-modal");
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeRecipeIngSheet() {
    $("recipe-ing-modal").classList.add("hidden");
    $("recipe-ing-modal").setAttribute("aria-hidden", "true");
    state.recipeIngFood = null;
  }

  function updateRecipeIngCalc() {
    const food = state.recipeIngFood;
    if (!food) {
      return;
    }
    const qty = Math.max(0, safeInt($("recipe-ing-qty").value, 100));
    const kcal = Math.round((food.calories_100g * qty) / 100);
    $("recipe-ing-kcal-value").textContent = String(kcal);
  }

  function addFoodToRecipeDraft() {
    const food = state.recipeIngFood;
    if (!food) {
      return;
    }
    const qty = Math.max(1, safeInt($("recipe-ing-qty").value, 100));
    state.recipeDraft.ingredients.push({ foodId: food.id, foodName: food.nom, grams: qty });
    closeRecipeIngSheet();
    $("recipe-search").value = "";
    updateRecipePreview();
  }

  function addRecipeWithMealPicker(recipe) {
    state.pendingRecipe = recipe;
    state.pendingTemplate = null;
    $("meal-picker-tpl-name").textContent = recipe.name;
    $("meal-picker-tpl-kcal").textContent = recipe.kcalPerPortion + " kcal / portion";
    $("meal-picker-overlay").classList.remove("hidden");
  }

  function editRecipe(recipe) {
    state.editingRecipeId = recipe.id;
    $("recipe-name").value = recipe.name;
    $("recipe-portions").value = String(recipe.portions);
    state.recipeDraft.ingredients = recipe.ingredients.map((i) => ({
      foodId: i.foodId,
      foodName: i.foodName,
      grams: i.grams
    }));
    $("recipe-form-label").textContent = "Modifier la recette";
    $("save-recipe-btn").textContent = "Mettre a jour la recette";
    $("cancel-edit-recipe-btn").classList.remove("hidden");
    updateRecipePreview();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditRecipe() {
    state.editingRecipeId = null;
    state.recipeDraft.ingredients = [];
    $("recipe-name").value = "";
    $("recipe-portions").value = "1";
    $("recipe-form-label").textContent = "Creer une recette";
    $("save-recipe-btn").textContent = "Enregistrer la recette";
    $("cancel-edit-recipe-btn").classList.add("hidden");
    updateRecipePreview();
  }

  async function applyRecipeToMealType(recipe, mealType) {
    const portionsCount = Math.max(1, recipe.portions);
    for (const ing of recipe.ingredients) {
      const food = window.FOODS_MAP.get(ing.foodId);
      if (!food) {
        continue;
      }
      const grams = Math.max(1, Math.round(ing.grams / portionsCount));
      await window.CFMeals.addEntry({
        date: window.CFMeals.todayStr(),
        mealType,
        food,
        grams,
        source: "recipe"
      });
    }
  }

  function addRecipeIngredient() {
    const query = $("recipe-search").value.trim();
    if (!query) {
      toast("Saisissez un ingredient d'abord");
      return;
    }
    const match = window.CFSearch.rankFoods(query, { type: "all" })[0];
    if (!match) {
      toast("Aucun ingredient trouve");
      return;
    }
    openRecipeIngSheet(match);
  }

  async function saveRecipeDraft() {
    const name = $("recipe-name").value.trim();
    const portions = Math.max(1, safeInt($("recipe-portions").value, 1));
    if (!name) {
      toast("Nom de la recette requis");
      return;
    }
    if (!state.recipeDraft.ingredients.length) {
      toast("Ajoutez au moins un ingredient");
      return;
    }
    if (state.editingRecipeId) {
      await window.CFRecipes.removeRecipe(state.editingRecipeId);
      state.editingRecipeId = null;
    }
    await window.CFRecipes.saveRecipe({
      name,
      portions,
      ingredients: state.recipeDraft.ingredients
    });
    state.recipeDraft.ingredients = [];
    $("recipe-name").value = "";
    $("recipe-portions").value = "1";
    $("recipe-form-label").textContent = "Creer une recette";
    $("save-recipe-btn").textContent = "Enregistrer la recette";
    $("cancel-edit-recipe-btn").classList.add("hidden");
    updateRecipePreview();
    toast("Recette enregistree !");
    await renderRecipes();
  }

  function addFiltersForSearch() {
    const container = document.createElement("div");
    container.className = "filter-row";
    container.innerHTML =
      "<button class=\"btn-secondary\" data-type=\"all\">Tous</button>" +
      "<button class=\"btn-secondary\" data-type=\"bruts\">Bruts</button>" +
      "<button class=\"btn-secondary\" data-type=\"produits\">Produits</button>" +
      "<button class=\"btn-secondary\" data-type=\"plats\">Plats</button>" +
      "<button class=\"btn-secondary\" data-type=\"boissons\">Boissons</button>";
    container.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.selectedFilter = btn.dataset.type || "all";
        renderQuickLists($("quick-search").value);
      });
    });
    const target = $("add-search-card") || $("view-add").querySelector(".card");
    target.appendChild(container);
  }

  async function openScanner() {
    const modal = $("scanner-modal");
    const res = $("scanner-result");
    const video = $("scanner-video");
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    res.textContent = "Initialisation camera...";
    if (!navigator.onLine) {
      res.textContent = "Scanner necessite une connexion internet";
      return;
    }
    try {
      await window.CFScanner.startCamera(video);
      res.textContent = "Cadrez un code-barres ou saisissez-le.";
      window.CFScanner.startLightScanner(video, async (barcode) => {
        if (!barcode) {
          return;
        }
        $("barcode-input").value = barcode;
        await fetchBarcode(barcode);
      });
    } catch (err) {
      res.textContent = "Erreur camera: " + err.message;
    }
  }

  function closeScanner() {
    window.CFScanner.stopCamera();
    const modal = $("scanner-modal");
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }

  async function fetchBarcode(barcode) {
    const res = $("scanner-result");
    res.textContent = "Recherche OpenFoodFacts...";
    try {
      const product = await window.CFScanner.fetchOpenFoodFacts(barcode);
      state.offProduct = product;
      state.selectedFood = product;
      renderPortions(product);
      res.textContent = product.nom + " - " + product.calories_100g + " kcal/100g";
      closeScanner();
      openFoodDetail(product);
    } catch (err) {
      res.textContent = err.message || "Produit introuvable";
    }
  }

  function renderSettingsForm() {
    const s = state.profileSettings;
    $("objective-type").value = s.objectiveType;
    $("current-weight").value = s.currentWeight == null ? "" : String(s.currentWeight);
    $("target-weight").value = s.targetWeight == null ? "" : String(s.targetWeight);
    $("goal-calories-input").value = String(s.goalCalories);
    $("macro-mode").value = s.macroMode;
    $("macro-proteins-percent").value = String(s.macroPercentages.proteins);
    $("macro-carbs-percent").value = String(s.macroPercentages.carbs);
    $("macro-fats-percent").value = String(s.macroPercentages.fats);
    $("macro-proteins-grams").value = String(round1(s.macroGrams.proteins));
    $("macro-carbs-grams").value = String(round1(s.macroGrams.carbs));
    $("macro-fats-grams").value = String(round1(s.macroGrams.fats));
    updateMacroModeVisibility();
  }

  function updateMacroModeVisibility() {
    const mode = $("macro-mode").value;
    if (mode === "grams") {
      $("macro-percent-fields").classList.add("hidden");
      $("macro-gram-fields").classList.remove("hidden");
    } else {
      $("macro-percent-fields").classList.remove("hidden");
      $("macro-gram-fields").classList.add("hidden");
    }
  }

  function openSettings() {
    renderSettingsForm();
    const modal = $("settings-modal");
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeSettings() {
    const modal = $("settings-modal");
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }

  function collectSettingsFromForm() {
    const objectiveType = $("objective-type").value;
    const goalCalories = safeInt($("goal-calories-input").value, state.goal);
    const macroMode = $("macro-mode").value === "grams" ? "grams" : "percent";
    const macroPercentages = {
      proteins: safeInt($("macro-proteins-percent").value, 25),
      carbs: safeInt($("macro-carbs-percent").value, 50),
      fats: safeInt($("macro-fats-percent").value, 25)
    };
    const macroGrams = {
      proteins: safeNum($("macro-proteins-grams").value, 125),
      carbs: safeNum($("macro-carbs-grams").value, 250),
      fats: safeNum($("macro-fats-grams").value, 55)
    };
    return {
      objectiveType,
      currentWeight: $("current-weight").value === "" ? null : safeNum($("current-weight").value, 0),
      targetWeight: $("target-weight").value === "" ? null : safeNum($("target-weight").value, 0),
      goalCalories,
      macroMode,
      macroPercentages,
      macroGrams
    };
  }

  async function saveSettingsFromModal() {
    const data = collectSettingsFromForm();
    const normalized = await window.CFMeals.saveProfileSettings(data);
    state.profileSettings = normalized;
    state.goal = normalized.goalCalories;
    closeSettings();
    toast("Objectifs personnalises enregistres");
    await refreshToday();
    await refreshStats();
  }

  function initTheme() {
    const row = localStorage.getItem("caloriflash_theme");
    if (row === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    }
    $("theme-toggle").addEventListener("click", () => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      if (isDark) {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("caloriflash_theme", "light");
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("caloriflash_theme", "dark");
      }
    });
  }

  function initAuthGate() {
    const overlay = $("auth-overlay");
    const app = $("app");
    const input = $("password-input");
    const btn = $("login-btn");
    const errEl = $("auth-error");

    async function unlock() {
      const ok = await window.CFAuth.checkPassword(input.value);
      if (!ok) {
        errEl.textContent = "Mot de passe incorrect";
        return;
      }
      window.CFAuth.setAuthenticated(true);
      overlay.classList.remove("visible");
      overlay.setAttribute("aria-hidden", "true");
      app.classList.remove("hidden");
      errEl.textContent = "";
      input.value = "";
      await bootAfterAuth();
    }

    if (window.CFAuth.isAuthenticated()) {
      overlay.classList.remove("visible");
      app.classList.remove("hidden");
      bootAfterAuth();
      return;
    }

    overlay.classList.add("visible");
    app.classList.add("hidden");
    btn.addEventListener("click", unlock);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        unlock();
      }
    });
  }

  function registerSw() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  async function bindUi() {
    // Bottom tabs
    document.querySelectorAll(".bottom-tabs button").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const tab = btn.dataset.tab;
        openTab(tab);
        if (tab === "stats") {
          await refreshStats();
        }
        if (tab === "meals") {
          await renderTemplates();
        }
        if (tab === "recipes") {
          await renderRecipes();
        }
      });
    });

    // Meal selector buttons on add page
    document.querySelectorAll(".btn-add-meal").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".btn-add-meal").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        const sel = $("meal-select");
        if (sel) {
          sel.value = btn.dataset.meal;
        }
        state.detailMealType = btn.dataset.meal;
      });
    });

    $("open-settings-btn").addEventListener("click", openSettings);
    $("open-settings-inline-btn").addEventListener("click", openSettings);
    $("close-settings-btn").addEventListener("click", closeSettings);
    $("save-settings-btn").addEventListener("click", saveSettingsFromModal);
    $("macro-mode").addEventListener("change", updateMacroModeVisibility);
    $("suggest-goal-btn").addEventListener("click", () => {
      const objectiveType = $("objective-type").value;
      const currentGoal = safeInt($("goal-calories-input").value, state.goal);
      const suggestion = window.CFMeals.suggestGoalCalories(objectiveType, currentGoal);
      $("goal-calories-input").value = String(suggestion);
      toast("Suggestion appliquee");
    });

    $("floating-add-btn").addEventListener("click", () => openTab("add"));
    $("shortcut-favorites").addEventListener("click", () => {
      openTab("add");
      $("quick-search").value = "";
      renderQuickLists("");
    });
    $("shortcut-recents").addEventListener("click", () => {
      openTab("add");
      $("quick-search").value = "";
      renderQuickLists("");
    });
    $("shortcut-copy-yesterday").addEventListener("click", async () => {
      const copied = await window.CFMeals.copyYesterdayToToday();
      toast(copied + " elements copies");
      await refreshToday();
      await refreshStreak();
      await refreshStats();
    });

    $("quick-search").addEventListener("input", (e) => {
      renderQuickLists(e.target.value);
    });

    $("portion-select").addEventListener("change", () => {
      const food = state.selectedFood || state.offProduct;
      if (!food) {
        return;
      }
      const grams = getPortionGrams(food, $("portion-select").value);
      $("quantity-input").value = String(grams);
    });

    $("add-selected-btn").addEventListener("click", addSelectedToMeal);

    $("save-goal-btn").addEventListener("click", async () => {
      const goal = Math.min(8000, Math.max(800, safeInt($("goal-input").value, 2000)));
      state.goal = goal;
      state.profileSettings = await window.CFMeals.saveProfileSettings({
        ...state.profileSettings,
        goalCalories: goal
      });
      toast("Objectif enregistre");
      await refreshToday();
      await refreshStats();
    });

    $("save-template-btn").addEventListener("click", saveTemplateFromToday);

    $("tpl-add-food-btn").addEventListener("click", addToTplDraft);
    $("tpl-save-manual-btn").addEventListener("click", saveTplManual);
    $("tpl-manual-search").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        addToTplDraft();
      }
    });

    $("meal-picker-close").addEventListener("click", () => {
      $("meal-picker-overlay").classList.add("hidden");
      state.pendingTemplate = null;
      state.pendingRecipe = null;
    });
    $("meal-picker-overlay").addEventListener("click", (e) => {
      if (e.target === $("meal-picker-overlay")) {
        $("meal-picker-overlay").classList.add("hidden");
        state.pendingTemplate = null;
        state.pendingRecipe = null;
      }
    });
    document.querySelectorAll(".btn-meal-pick-big").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const mealType = btn.dataset.meal;
        if (state.pendingRecipe) {
          const recipe = state.pendingRecipe;
          $("meal-picker-overlay").classList.add("hidden");
          state.pendingRecipe = null;
          await applyRecipeToMealType(recipe, mealType);
          toast(recipe.name + " ajoute (" + recipe.kcalPerPortion + " kcal)");
          await refreshToday();
          await refreshStreak();
          await refreshStats();
          openTab("today");
        } else if (state.pendingTemplate) {
          const { id, name } = state.pendingTemplate;
          $("meal-picker-overlay").classList.add("hidden");
          state.pendingTemplate = null;
          const n = await applyTemplateToMealType(id, mealType);
          toast(name + " ajoute (" + n + " aliment" + (n > 1 ? "s" : "") + ")");
          await refreshToday();
          await refreshStreak();
          await refreshStats();
          openTab("today");
        }
      });
    });

    $("recipe-add-ing-btn").addEventListener("click", addRecipeIngredient);
    $("recipe-search").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        addRecipeIngredient();
      }
    });
    $("save-recipe-btn").addEventListener("click", saveRecipeDraft);
    $("cancel-edit-recipe-btn").addEventListener("click", cancelEditRecipe);
    $("recipe-portions").addEventListener("input", updateRecipePreview);
    $("recipe-portions-minus").addEventListener("click", () => {
      const v = Math.max(1, safeInt($("recipe-portions").value, 1) - 1);
      $("recipe-portions").value = String(v);
      updateRecipePreview();
    });
    $("recipe-portions-plus").addEventListener("click", () => {
      const v = safeInt($("recipe-portions").value, 1) + 1;
      $("recipe-portions").value = String(v);
      updateRecipePreview();
    });
    $("recipe-ing-back").addEventListener("click", closeRecipeIngSheet);
    $("recipe-ing-add-btn").addEventListener("click", addFoodToRecipeDraft);
    $("recipe-ing-qty-minus").addEventListener("click", () => {
      const v = Math.max(1, safeInt($("recipe-ing-qty").value, 100) - 10);
      $("recipe-ing-qty").value = String(v);
      updateRecipeIngCalc();
    });
    $("recipe-ing-qty-plus").addEventListener("click", () => {
      const v = safeInt($("recipe-ing-qty").value, 100) + 10;
      $("recipe-ing-qty").value = String(v);
      updateRecipeIngCalc();
    });
    $("recipe-ing-qty").addEventListener("input", updateRecipeIngCalc);
    $("recipe-ing-modal").addEventListener("click", (e) => {
      if (e.target === $("recipe-ing-modal")) {
        closeRecipeIngSheet();
      }
    });

    $("open-scanner-btn").addEventListener("click", openScanner);
    $("scanner-close-btn").addEventListener("click", closeScanner);
    $("scan-manual-btn").addEventListener("click", async () => {
      const code = $("barcode-input").value.trim();
      if (!code) {
        toast("Code requis");
        return;
      }
      await fetchBarcode(code);
    });

    $("food-detail-back").addEventListener("click", closeDetailModal);
    $("food-detail-add-btn").addEventListener("click", addFoodFromDetail);
    $("food-qty-minus").addEventListener("click", () => {
      const v = Math.max(1, safeInt($("food-detail-qty").value, 100) - 10);
      $("food-detail-qty").value = String(v);
      updateDetailCalc();
    });
    $("food-qty-plus").addEventListener("click", () => {
      const v = safeInt($("food-detail-qty").value, 100) + 10;
      $("food-detail-qty").value = String(v);
      updateDetailCalc();
    });
    $("food-detail-qty").addEventListener("input", updateDetailCalc);
    $("food-detail-modal").addEventListener("click", (e) => {
      if (e.target === $("food-detail-modal")) {
        closeDetailModal();
      }
    });

    // Custom food modal (CRUD)
    $("create-custom-food-btn").addEventListener("click", () => openCustomFoodModal(null));
    $("cf-back-btn").addEventListener("click", closeCustomFoodModal);
    $("custom-food-modal").addEventListener("click", (e) => {
      if (e.target === $("custom-food-modal")) {
        closeCustomFoodModal();
      }
    });
    $("cf-save-btn").addEventListener("click", saveCustomFood);
    $("cf-delete-btn").addEventListener("click", () => {
      if (state.editingCustomFoodId) {
        deleteCustomFood(state.editingCustomFoodId);
      }
    });
    $("cf-add-portion-btn").addEventListener("click", addCfPortion);
    $("cf-portion-name").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        addCfPortion();
      }
    });
    $("cf-portion-grams").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        addCfPortion();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeDetailModal();
        closeCustomFoodModal();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        closeScanner();
      }
    });
  }

  async function bootAfterAuth() {
    state.profileSettings = await window.CFMeals.getProfileSettings();
    state.goal = state.profileSettings.goalCalories;

    await loadCustomFoods();
    addFiltersForSearch();
    await bindUi();
    await refreshToday();
    await refreshStreak();
    await refreshFavoritesAndRecents();
    await renderTemplates();
    await renderRecipes();
    await refreshStats();
    openTab("today");
  }

  function init() {
    registerSw();
    initTheme();
    initAuthGate();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
