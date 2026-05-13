(() => {
  const state = {
    selectedFood: null,
    favorites: [],
    recents: [],
    quickResults: [],
    recipeDraft: { ingredients: [] },
    goal: 2000,
    offProduct: null,
    selectedFilter: "all"
  };

  const el = {};

  function $(id) {
    return document.getElementById(id);
  }

  function safeInt(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : fallback;
  }

  function toast(message) {
    const node = $("toast");
    node.textContent = message;
    node.classList.add("show");
    setTimeout(() => node.classList.remove("show"), 1800);
  }

  function getPortionGrams(food, selectedLabel) {
    const portions = food.portions_standards || { grammes: 100 };
    if (selectedLabel && portions[selectedLabel] != null) {
      return Number(portions[selectedLabel]);
    }
    return 100;
  }

  function renderMealBlocks(mealTotals) {
    const root = $("meal-blocks");
    root.innerHTML = "";
    const labels = {
      "petit-dejeuner": "Petit-dejeuner",
      dejeuner: "Dejeuner",
      diner: "Diner",
      collations: "Collations"
    };
    window.CFMeals.MEAL_TYPES.forEach((type) => {
      const card = document.createElement("div");
      card.className = "meal-block";
      card.innerHTML = `<p class="small-label">${labels[type]}</p><h3>${mealTotals[type] || 0} kcal</h3>`;
      root.appendChild(card);
    });
  }

  function updateGauge(total, goal) {
    const ratio = Math.min(1.5, total / Math.max(1, goal));
    const circumference = 327;
    const offset = Math.max(0, circumference - circumference * Math.min(1, ratio));
    $("gauge-ring").style.strokeDashoffset = String(offset);
    $("gauge-percent").textContent = `${Math.round(ratio * 100)}%`;
  }

  function openTab(tab) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    document.querySelectorAll(".bottom-tabs button").forEach((b) => b.classList.remove("active"));
    const target = $(`view-${tab}`);
    if (target) {
      target.classList.add("active");
    }
    const btn = document.querySelector(`.bottom-tabs button[data-tab="${tab}"]`);
    if (btn) {
      btn.classList.add("active");
    }
  }

  async function refreshToday() {
    const date = window.CFMeals.todayStr();
    const entries = await window.CFMeals.getEntriesForDate(date);
    const summary = window.CFMeals.summarize(entries);
    $("today-total").textContent = String(summary.total);
    $("goal-value").textContent = String(state.goal);
    $("goal-input").value = String(state.goal);
    updateGauge(summary.total, state.goal);
    renderMealBlocks(summary.mealTotals);
  }

  function buildFoodRow(food, options = {}) {
    const row = document.createElement("div");
    row.className = "list-item";
    row.innerHTML = `
      <div>
        <strong>${food.nom}</strong>
        <p class="small-label">${food.calories_100g} kcal / 100g</p>
      </div>
      <div class="inline-row">
        ${options.showFav ? '<button class="btn-secondary" data-action="fav">☆</button>' : ""}
        <button class="btn-primary" data-action="pick">Choisir</button>
      </div>
    `;
    row.querySelector('[data-action="pick"]').addEventListener("click", () => {
      state.selectedFood = food;
      renderPortions(food);
      toast(`${food.nom} selectionne`);
    });
    const favBtn = row.querySelector('[data-action="fav"]');
    if (favBtn) {
      favBtn.addEventListener("click", async () => {
        await window.CFMeals.upsertFavorite(food.id);
        await refreshFavoritesAndRecents();
        toast("Ajoute aux favoris");
      });
    }
    return row;
  }

  function section(title, foods, options = {}) {
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
      option.textContent = `${o.label} (${o.grams} g)`;
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
    renderQuickLists("");
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
      root.appendChild(section("Repas enregistres et suggestions", ranked.slice(0, 12), { showFav: true }));
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
    await refreshFavoritesAndRecents();
  }

  async function renderTemplates() {
    const list = $("templates-list");
    list.innerHTML = "";
    const templates = await window.CFRecipes.listTemplates();
    if (!templates.length) {
      list.innerHTML = '<div class="card"><p>Aucun repas type.</p></div>';
      return;
    }
    templates.forEach((tpl) => {
      const item = document.createElement("div");
      item.className = "list-item";
      item.innerHTML = `
        <div>
          <strong>${tpl.name}</strong>
          <p class="small-label">${tpl.items.length} aliments</p>
        </div>
        <div class="inline-row">
          <button class="btn-primary" data-act="apply">Ajouter</button>
          <button class="btn-secondary" data-act="rename">Renommer</button>
          <button class="btn-secondary" data-act="delete">Suppr.</button>
        </div>
      `;
      item.querySelector('[data-act="apply"]').addEventListener("click", async () => {
        const n = await window.CFRecipes.applyTemplate(tpl.id, window.CFMeals.todayStr());
        toast(`${n} aliments ajoutes`);
        await refreshToday();
      });
      item.querySelector('[data-act="rename"]').addEventListener("click", async () => {
        const name = window.prompt("Nouveau nom", tpl.name);
        if (name && name.trim()) {
          await window.CFRecipes.renameTemplate(tpl.id, name.trim());
          await renderTemplates();
        }
      });
      item.querySelector('[data-act="delete"]').addEventListener("click", async () => {
        await window.CFRecipes.deleteTemplate(tpl.id);
        toast("Repas type supprime");
        await renderTemplates();
      });
      list.appendChild(item);
    });
  }

  function updateRecipePreview() {
    const recipe = {
      portions: safeInt($("recipe-portions").value, 1),
      ingredients: state.recipeDraft.ingredients
    };
    const kcal = window.CFRecipes.calcRecipe(recipe);
    $("recipe-kcal").textContent = `Total: ${kcal.total} kcal • Par portion: ${kcal.perPortion} kcal`;
    const list = $("recipe-ingredients");
    list.innerHTML = "";
    state.recipeDraft.ingredients.forEach((ing, index) => {
      const li = document.createElement("li");
      li.className = "list-item";
      li.innerHTML = `<span>${ing.foodName} - ${ing.grams} g</span><button class="btn-secondary">Retirer</button>`;
      li.querySelector("button").addEventListener("click", () => {
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
      list.innerHTML = '<div class="card"><p>Aucune recette enregistree.</p></div>';
      return;
    }
    rows.forEach((r) => {
      const item = document.createElement("div");
      item.className = "list-item";
      item.innerHTML = `
        <div>
          <strong>${r.name}</strong>
          <p class="small-label">${r.kcalPerPortion} kcal / portion (${r.portions} portions)</p>
        </div>
        <div class="inline-row">
          <button class="btn-primary" data-act="add">+1 portion</button>
          <button class="btn-secondary" data-act="delete">Suppr.</button>
        </div>
      `;
      item.querySelector('[data-act="add"]').addEventListener("click", async () => {
        for (let i = 0; i < r.ingredients.length; i += 1) {
          const ing = r.ingredients[i];
          const food = window.FOODS_MAP.get(ing.foodId);
          if (!food) {
            continue;
          }
          const grams = Math.max(1, Math.round(ing.grams / Math.max(1, r.portions)));
          await window.CFMeals.addEntry({
            date: window.CFMeals.todayStr(),
            mealType: "diner",
            food,
            grams,
            source: "recipe"
          });
        }
        toast("Recette ajoutee");
        await refreshToday();
      });
      item.querySelector('[data-act="delete"]').addEventListener("click", async () => {
        await window.CFRecipes.removeRecipe(r.id);
        await renderRecipes();
      });
      list.appendChild(item);
    });
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
  }

  async function saveTemplateFromToday() {
    const name = $("meal-template-name").value.trim();
    if (!name) {
      toast("Nom requis");
      return;
    }
    const entries = await window.CFMeals.getEntriesForDate(window.CFMeals.todayStr());
    if (!entries.length) {
      toast("Aucun aliment aujourd'hui");
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
    toast("Repas type enregistre");
    await renderTemplates();
  }

  async function addRecipeIngredient() {
    const query = $("recipe-search").value.trim();
    if (!query) {
      toast("Ingredient requis");
      return;
    }
    const match = window.CFSearch.rankFoods(query, { type: "all" })[0];
    if (!match) {
      toast("Aucun ingredient");
      return;
    }
    const grams = Math.max(1, safeInt($("recipe-qty").value, 100));
    state.recipeDraft.ingredients.push({ foodId: match.id, foodName: match.nom, grams });
    $("recipe-search").value = "";
    updateRecipePreview();
  }

  async function saveRecipeDraft() {
    const name = $("recipe-name").value.trim();
    const portions = Math.max(1, safeInt($("recipe-portions").value, 1));
    if (!name || !state.recipeDraft.ingredients.length) {
      toast("Nom + ingredients requis");
      return;
    }
    await window.CFRecipes.saveRecipe({
      name,
      portions,
      ingredients: state.recipeDraft.ingredients
    });
    state.recipeDraft.ingredients = [];
    $("recipe-name").value = "";
    $("recipe-portions").value = "2";
    updateRecipePreview();
    toast("Recette enregistree");
    await renderRecipes();
  }

  function addFiltersForSearch() {
    const container = document.createElement("div");
    container.className = "inline-row";
    container.innerHTML = `
      <button class="btn-secondary" data-type="all">Tous</button>
      <button class="btn-secondary" data-type="bruts">Bruts</button>
      <button class="btn-secondary" data-type="produits">Produits</button>
      <button class="btn-secondary" data-type="plats">Plats</button>
      <button class="btn-secondary" data-type="boissons">Boissons</button>
    `;
    container.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.selectedFilter = btn.dataset.type || "all";
        renderQuickLists($("quick-search").value);
      });
    });
    $("view-add").querySelector(".card").appendChild(container);
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
      res.textContent = `Erreur camera: ${err.message}`;
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
      res.textContent = `${product.nom} - ${product.calories_100g} kcal/100g`;
      toast("Produit detecte");
    } catch (err) {
      res.textContent = err.message || "Produit introuvable";
    }
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
      toast(`${copied} elements copies`);
      await refreshToday();
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
      await window.CFMeals.saveGoal(goal);
      toast("Objectif enregistre");
      await refreshToday();
      await refreshStats();
    });

    $("save-template-btn").addEventListener("click", saveTemplateFromToday);

    $("recipe-add-ing-btn").addEventListener("click", addRecipeIngredient);
    $("save-recipe-btn").addEventListener("click", saveRecipeDraft);
    $("recipe-portions").addEventListener("input", updateRecipePreview);

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

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        closeScanner();
      }
    });
  }

  async function bootAfterAuth() {
    state.goal = await window.CFMeals.getGoal();
    addFiltersForSearch();
    await bindUi();
    await refreshToday();
    await refreshFavoritesAndRecents();
    await renderTemplates();
    await renderRecipes();
    await refreshStats();
    const firstFood = (window.FOODS_DB || [])[0];
    if (firstFood) {
      state.selectedFood = firstFood;
      renderPortions(firstFood);
    }
    openTab("today");
  }

  function init() {
    registerSw();
    initTheme();
    initAuthGate();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
