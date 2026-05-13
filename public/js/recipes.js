(() => {
  function uid(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 9)}`;
  }

  function calcRecipe(recipe) {
    let total = 0;
    recipe.ingredients.forEach((ing) => {
      const food = window.FOODS_MAP.get(ing.foodId);
      if (food) {
        total += (food.calories_100g * ing.grams) / 100;
      }
    });
    const portions = Math.max(1, Number(recipe.portions) || 1);
    return {
      total: Math.round(total),
      perPortion: Math.round(total / portions)
    };
  }

  async function saveRecipe({ name, portions, ingredients }) {
    const recipe = {
      id: uid("recipe"),
      name,
      portions: Number(portions) || 1,
      ingredients: ingredients.map((i) => ({
        foodId: i.foodId,
        foodName: i.foodName,
        grams: Number(i.grams) || 0
      })),
      createdAt: Date.now()
    };
    const kcal = calcRecipe(recipe);
    recipe.totalKcal = kcal.total;
    recipe.kcalPerPortion = kcal.perPortion;
    await window.CFDB.put(window.CFDB.STORES.recipes, recipe);
    return recipe;
  }

  async function listRecipes() {
    const all = await window.CFDB.getAll(window.CFDB.STORES.recipes);
    return all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  async function removeRecipe(id) {
    return window.CFDB.remove(window.CFDB.STORES.recipes, id);
  }

  async function saveTemplate({ name, items }) {
    const tpl = {
      id: uid("tpl"),
      name,
      items,
      updatedAt: Date.now()
    };
    await window.CFDB.put(window.CFDB.STORES.templates, tpl);
    return tpl;
  }

  async function listTemplates() {
    const all = await window.CFDB.getAll(window.CFDB.STORES.templates);
    return all.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  async function renameTemplate(id, name) {
    const tpl = await window.CFDB.getByKey(window.CFDB.STORES.templates, id);
    if (!tpl) {
      return null;
    }
    tpl.name = name;
    tpl.updatedAt = Date.now();
    await window.CFDB.put(window.CFDB.STORES.templates, tpl);
    return tpl;
  }

  async function deleteTemplate(id) {
    return window.CFDB.remove(window.CFDB.STORES.templates, id);
  }

  async function applyTemplate(templateId, date) {
    const tpl = await window.CFDB.getByKey(window.CFDB.STORES.templates, templateId);
    if (!tpl) {
      return 0;
    }
    let count = 0;
    for (let i = 0; i < tpl.items.length; i += 1) {
      const item = tpl.items[i];
      const food = window.FOODS_MAP.get(item.foodId);
      if (!food) {
        continue;
      }
      await window.CFMeals.addEntry({
        date,
        mealType: item.mealType,
        food,
        grams: item.grams,
        source: "template"
      });
      count += 1;
    }
    return count;
  }

  async function saveTodayAsTemplate(name) {
    const entries = await window.CFMeals.getEntriesForDate(window.CFMeals.todayStr());
    const items = entries.map((e) => ({
      foodId: e.foodId,
      foodName: e.foodName,
      grams: e.grams,
      mealType: e.mealType
    }));
    return saveTemplate({ name, items });
  }

  window.CFRecipes = {
    calcRecipe,
    saveRecipe,
    listRecipes,
    removeRecipe,
    saveTemplate,
    listTemplates,
    renameTemplate,
    deleteTemplate,
    applyTemplate,
    saveTodayAsTemplate
  };
})();
