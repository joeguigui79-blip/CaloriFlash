(() => {
  function round(n) {
    return Math.round(n * 10) / 10;
  }

  function clonePortions(obj) {
    return Object.assign({}, obj);
  }

  const CATEGORY_PORTIONS = {
    fruits: { unite: 120, tranche: 80, bol: 150, grammes: 100 },
    legumes: { bol: 200, cuillere: 15, grammes: 100 },
    feculents: { bol: 180, cuillere: 20, grammes: 100 },
    viandes: { tranche: 100, unite: 120, grammes: 100 },
    poissons: { tranche: 120, unite: 120, grammes: 100 },
    oeufs: { unite: 60, grammes: 100 },
    "produits laitiers": { pot: 125, verre: 200, cuillere: 15, grammes: 100 },
    "pains/viennoiseries": { tranche: 30, unite: 60, grammes: 100 },
    "biscuits/gateaux": { unite: 12, tranche: 35, grammes: 100 },
    boissons: { verre: 250, canette: 330, tasse: 200, grammes: 100 },
    "plats courants": { assiette: 350, portion: 300, bol: 300, grammes: 100 },
    "sauces/condiments": { cuillere: 15, portion: 30, grammes: 100 },
    cereales: { bol: 45, cuillere: 15, grammes: 100 },
    snacks: { unite: 25, portion: 35, grammes: 100 }
  };

  const BASE_FOODS = [
    { nom: "Pomme", categorie: "fruits", kcal: 52, p: 0.3, g: 13.8, l: 0.2 },
    { nom: "Banane", categorie: "fruits", kcal: 89, p: 1.1, g: 22.8, l: 0.3 },
    { nom: "Orange", categorie: "fruits", kcal: 47, p: 0.9, g: 11.8, l: 0.1 },
    { nom: "Poire", categorie: "fruits", kcal: 57, p: 0.4, g: 15.2, l: 0.1 },
    { nom: "Fraise", categorie: "fruits", kcal: 32, p: 0.7, g: 7.7, l: 0.3 },
    { nom: "Framboise", categorie: "fruits", kcal: 52, p: 1.2, g: 11.9, l: 0.7 },
    { nom: "Myrtille", categorie: "fruits", kcal: 57, p: 0.7, g: 14.5, l: 0.3 },
    { nom: "Kiwi", categorie: "fruits", kcal: 61, p: 1.1, g: 14.7, l: 0.5 },
    { nom: "Ananas", categorie: "fruits", kcal: 50, p: 0.5, g: 13.1, l: 0.1 },
    { nom: "Mangue", categorie: "fruits", kcal: 60, p: 0.8, g: 15, l: 0.4 },
    { nom: "Raisin", categorie: "fruits", kcal: 69, p: 0.7, g: 18.1, l: 0.2 },
    { nom: "Melon", categorie: "fruits", kcal: 34, p: 0.8, g: 8.2, l: 0.2 },
    { nom: "Pasteque", categorie: "fruits", kcal: 30, p: 0.6, g: 7.6, l: 0.2 },
    { nom: "Abricot", categorie: "fruits", kcal: 48, p: 1.4, g: 11.1, l: 0.4 },
    { nom: "Peche", categorie: "fruits", kcal: 39, p: 0.9, g: 9.5, l: 0.3 },
    { nom: "Prune", categorie: "fruits", kcal: 46, p: 0.7, g: 11.4, l: 0.3 },
    { nom: "Cerise", categorie: "fruits", kcal: 63, p: 1.1, g: 16, l: 0.2 },
    { nom: "Pamplemousse", categorie: "fruits", kcal: 42, p: 0.8, g: 10.7, l: 0.1 },
    { nom: "Citron", categorie: "fruits", kcal: 29, p: 1.1, g: 9.3, l: 0.3 },
    { nom: "Compote de pomme sans sucre", categorie: "fruits", kcal: 68, p: 0.2, g: 17, l: 0.1 },

    { nom: "Carotte", categorie: "legumes", kcal: 41, p: 0.9, g: 9.6, l: 0.2 },
    { nom: "Courgette", categorie: "legumes", kcal: 17, p: 1.2, g: 3.1, l: 0.3 },
    { nom: "Tomate", categorie: "legumes", kcal: 18, p: 0.9, g: 3.9, l: 0.2 },
    { nom: "Concombre", categorie: "legumes", kcal: 15, p: 0.7, g: 3.6, l: 0.1 },
    { nom: "Poivron rouge", categorie: "legumes", kcal: 31, p: 1, g: 6, l: 0.3 },
    { nom: "Aubergine", categorie: "legumes", kcal: 25, p: 1, g: 5.9, l: 0.2 },
    { nom: "Brocoli", categorie: "legumes", kcal: 34, p: 2.8, g: 6.6, l: 0.4 },
    { nom: "Chou-fleur", categorie: "legumes", kcal: 25, p: 1.9, g: 5, l: 0.3 },
    { nom: "Haricots verts", categorie: "legumes", kcal: 31, p: 1.8, g: 7, l: 0.1 },
    { nom: "Epinards", categorie: "legumes", kcal: 23, p: 2.9, g: 3.6, l: 0.4 },
    { nom: "Poireau", categorie: "legumes", kcal: 61, p: 1.5, g: 14.2, l: 0.3 },
    { nom: "Oignon", categorie: "legumes", kcal: 40, p: 1.1, g: 9.3, l: 0.1 },
    { nom: "Champignon de Paris", categorie: "legumes", kcal: 22, p: 3.1, g: 3.3, l: 0.3 },
    { nom: "Petits pois", categorie: "legumes", kcal: 81, p: 5.4, g: 14.5, l: 0.4 },
    { nom: "Mais doux", categorie: "legumes", kcal: 86, p: 3.2, g: 19, l: 1.2 },
    { nom: "Laitue", categorie: "legumes", kcal: 15, p: 1.4, g: 2.9, l: 0.2 },
    { nom: "Betterave", categorie: "legumes", kcal: 43, p: 1.6, g: 9.6, l: 0.2 },
    { nom: "Fenouil", categorie: "legumes", kcal: 31, p: 1.2, g: 7.3, l: 0.2 },
    { nom: "Celeri branche", categorie: "legumes", kcal: 16, p: 0.7, g: 3, l: 0.2 },
    { nom: "Asperge", categorie: "legumes", kcal: 20, p: 2.2, g: 3.9, l: 0.1 },

    { nom: "Riz blanc cuit", categorie: "feculents", kcal: 130, p: 2.7, g: 28.2, l: 0.3 },
    { nom: "Riz complet cuit", categorie: "feculents", kcal: 112, p: 2.3, g: 23.5, l: 0.8 },
    { nom: "Pates cuites", categorie: "feculents", kcal: 131, p: 5, g: 25, l: 1.1 },
    { nom: "Pates completes cuites", categorie: "feculents", kcal: 124, p: 5.3, g: 26.8, l: 1 },
    { nom: "Semoule cuite", categorie: "feculents", kcal: 112, p: 3.8, g: 23.2, l: 0.2 },
    { nom: "Quinoa cuit", categorie: "feculents", kcal: 120, p: 4.4, g: 21.3, l: 1.9 },
    { nom: "Boulgour cuit", categorie: "feculents", kcal: 83, p: 3.1, g: 18.6, l: 0.2 },
    { nom: "Pommes de terre cuites", categorie: "feculents", kcal: 87, p: 1.9, g: 20.1, l: 0.1 },
    { nom: "Patate douce cuite", categorie: "feculents", kcal: 90, p: 2, g: 20.7, l: 0.2 },
    { nom: "Lentilles cuites", categorie: "feculents", kcal: 116, p: 9, g: 20.1, l: 0.4 },
    { nom: "Pois chiches cuits", categorie: "feculents", kcal: 164, p: 8.9, g: 27.4, l: 2.6 },
    { nom: "Haricots rouges cuits", categorie: "feculents", kcal: 127, p: 8.7, g: 22.8, l: 0.5 },
    { nom: "Haricots blancs cuits", categorie: "feculents", kcal: 140, p: 9.7, g: 25.1, l: 0.6 },
    { nom: "Ble tendre cuit", categorie: "feculents", kcal: 111, p: 3.6, g: 24.9, l: 0.4 },
    { nom: "Polenta cuite", categorie: "feculents", kcal: 70, p: 1.5, g: 15.5, l: 0.3 },

    { nom: "Poulet blanc", categorie: "viandes", kcal: 165, p: 31, g: 0, l: 3.6 },
    { nom: "Poulet cuisse", categorie: "viandes", kcal: 209, p: 26, g: 0, l: 10.9 },
    { nom: "Dinde", categorie: "viandes", kcal: 135, p: 29, g: 0, l: 1.6 },
    { nom: "Steak hache 5%", categorie: "viandes", kcal: 137, p: 21, g: 0, l: 5 },
    { nom: "Steak hache 15%", categorie: "viandes", kcal: 215, p: 18, g: 0, l: 15 },
    { nom: "Boeuf rumsteck", categorie: "viandes", kcal: 170, p: 27, g: 0, l: 6.5 },
    { nom: "Veau", categorie: "viandes", kcal: 172, p: 30, g: 0, l: 5 },
    { nom: "Porc filet", categorie: "viandes", kcal: 143, p: 26, g: 0, l: 3.5 },
    { nom: "Jambon blanc", categorie: "viandes", kcal: 116, p: 20, g: 1, l: 3.5 },
    { nom: "Jambon cru", categorie: "viandes", kcal: 241, p: 26, g: 0.5, l: 15 },
    { nom: "Canard", categorie: "viandes", kcal: 201, p: 19, g: 0, l: 14 },
    { nom: "Saucisse de volaille", categorie: "viandes", kcal: 180, p: 14, g: 2, l: 13 },
    { nom: "Merguez", categorie: "viandes", kcal: 316, p: 16, g: 1, l: 28 },
    { nom: "Lardon", categorie: "viandes", kcal: 353, p: 16, g: 1.4, l: 32 },
    { nom: "Rosbif", categorie: "viandes", kcal: 180, p: 28, g: 0, l: 8 },

    { nom: "Saumon", categorie: "poissons", kcal: 208, p: 20, g: 0, l: 13 },
    { nom: "Thon nature", categorie: "poissons", kcal: 132, p: 28, g: 0, l: 1.3 },
    { nom: "Cabillaud", categorie: "poissons", kcal: 82, p: 18, g: 0, l: 0.7 },
    { nom: "Merlu", categorie: "poissons", kcal: 90, p: 19, g: 0, l: 1.2 },
    { nom: "Sardine", categorie: "poissons", kcal: 208, p: 25, g: 0, l: 11.5 },
    { nom: "Maquereau", categorie: "poissons", kcal: 205, p: 19, g: 0, l: 14 },
    { nom: "Truite", categorie: "poissons", kcal: 190, p: 20, g: 0, l: 12 },
    { nom: "Crevettes", categorie: "poissons", kcal: 99, p: 24, g: 0.2, l: 0.3 },
    { nom: "Moules", categorie: "poissons", kcal: 86, p: 12, g: 3.7, l: 2.2 },
    { nom: "Surimi", categorie: "poissons", kcal: 95, p: 10, g: 14, l: 0.7 },
    { nom: "Colin", categorie: "poissons", kcal: 92, p: 20, g: 0, l: 1 },
    { nom: "Lieu noir", categorie: "poissons", kcal: 95, p: 19, g: 0, l: 1.3 },

    { nom: "Oeuf entier", categorie: "oeufs", kcal: 143, p: 12.6, g: 0.7, l: 9.5 },
    { nom: "Blanc d'oeuf", categorie: "oeufs", kcal: 52, p: 10.9, g: 0.7, l: 0.2 },
    { nom: "Oeuf brouille", categorie: "oeufs", kcal: 149, p: 10, g: 1.6, l: 11 },
    { nom: "Omelette nature", categorie: "oeufs", kcal: 154, p: 10.6, g: 1.9, l: 11.5 },
    { nom: "Oeuf dur", categorie: "oeufs", kcal: 155, p: 12.6, g: 1.1, l: 10.6 },

    { nom: "Lait demi-ecreme", categorie: "produits laitiers", kcal: 46, p: 3.3, g: 4.8, l: 1.6 },
    { nom: "Lait ecreme", categorie: "produits laitiers", kcal: 34, p: 3.4, g: 5, l: 0.2 },
    { nom: "Lait entier", categorie: "produits laitiers", kcal: 64, p: 3.3, g: 4.8, l: 3.6 },
    { nom: "Yaourt nature", categorie: "produits laitiers", kcal: 61, p: 3.5, g: 4.7, l: 3.3 },
    { nom: "Yaourt grec", categorie: "produits laitiers", kcal: 97, p: 9, g: 3.9, l: 5 },
    { nom: "Fromage blanc 0%", categorie: "produits laitiers", kcal: 45, p: 8.5, g: 3.5, l: 0.2 },
    { nom: "Petit suisse 0%", categorie: "produits laitiers", kcal: 52, p: 8.7, g: 3.6, l: 0.2 },
    { nom: "Skyr nature", categorie: "produits laitiers", kcal: 63, p: 11, g: 4, l: 0.2 },
    { nom: "Emmental", categorie: "produits laitiers", kcal: 381, p: 27, g: 0.5, l: 29 },
    { nom: "Comte", categorie: "produits laitiers", kcal: 398, p: 27, g: 0.4, l: 32 },
    { nom: "Mozzarella", categorie: "produits laitiers", kcal: 280, p: 18, g: 2, l: 21 },
    { nom: "Chevre frais", categorie: "produits laitiers", kcal: 210, p: 14, g: 2.5, l: 16 },
    { nom: "Camembert", categorie: "produits laitiers", kcal: 300, p: 20, g: 0.5, l: 24 },
    { nom: "Beurre", categorie: "produits laitiers", kcal: 717, p: 0.9, g: 0.1, l: 81 },
    { nom: "Creme fraiche 15%", categorie: "produits laitiers", kcal: 162, p: 2.4, g: 4.1, l: 15 },

    { nom: "Pain de campagne", categorie: "pains/viennoiseries", kcal: 262, p: 8.6, g: 52, l: 1.7 },
    { nom: "Baguette", categorie: "pains/viennoiseries", kcal: 274, p: 8.9, g: 56, l: 0.8 },
    { nom: "Pain complet", categorie: "pains/viennoiseries", kcal: 247, p: 12.5, g: 41, l: 3.5 },
    { nom: "Pain de mie", categorie: "pains/viennoiseries", kcal: 266, p: 8, g: 49, l: 4.2 },
    { nom: "Croissant", categorie: "pains/viennoiseries", kcal: 406, p: 8.2, g: 45, l: 21 },
    { nom: "Pain au chocolat", categorie: "pains/viennoiseries", kcal: 423, p: 7.9, g: 46, l: 23 },
    { nom: "Brioche", categorie: "pains/viennoiseries", kcal: 337, p: 8.2, g: 50, l: 10.2 },
    { nom: "Cracotte", categorie: "pains/viennoiseries", kcal: 390, p: 11, g: 76, l: 3.5 },
    { nom: "Wrap ble", categorie: "pains/viennoiseries", kcal: 312, p: 8.5, g: 51, l: 7.9 },
    { nom: "Pain burger", categorie: "pains/viennoiseries", kcal: 295, p: 10, g: 49, l: 6.5 },

    { nom: "Biscuit petit beurre", categorie: "biscuits/gateaux", kcal: 438, p: 7, g: 74, l: 13 },
    { nom: "Cookie pepites chocolat", categorie: "biscuits/gateaux", kcal: 488, p: 6, g: 63, l: 23 },
    { nom: "Sable", categorie: "biscuits/gateaux", kcal: 502, p: 6.6, g: 61, l: 25 },
    { nom: "Madeleine", categorie: "biscuits/gateaux", kcal: 436, p: 6.8, g: 58, l: 20 },
    { nom: "Quatre-quarts", categorie: "biscuits/gateaux", kcal: 401, p: 5.6, g: 49, l: 20 },
    { nom: "Cake marbre", categorie: "biscuits/gateaux", kcal: 420, p: 5.5, g: 50, l: 22 },
    { nom: "Pain d'epices", categorie: "biscuits/gateaux", kcal: 330, p: 4.3, g: 70, l: 3.5 },
    { nom: "Muffin nature", categorie: "biscuits/gateaux", kcal: 377, p: 5.7, g: 54, l: 15 },
    { nom: "Brownie", categorie: "biscuits/gateaux", kcal: 466, p: 5.3, g: 50, l: 27 },
    { nom: "Crepe sucree", categorie: "biscuits/gateaux", kcal: 227, p: 6.4, g: 28, l: 9.7 },

    { nom: "Eau", categorie: "boissons", kcal: 0, p: 0, g: 0, l: 0 },
    { nom: "Eau gazeuse", categorie: "boissons", kcal: 0, p: 0, g: 0, l: 0 },
    { nom: "Cafe sans sucre", categorie: "boissons", kcal: 2, p: 0.3, g: 0, l: 0 },
    { nom: "The sans sucre", categorie: "boissons", kcal: 1, p: 0, g: 0.3, l: 0 },
    { nom: "Jus d'orange 100%", categorie: "boissons", kcal: 45, p: 0.7, g: 10.4, l: 0.2 },
    { nom: "Jus de pomme", categorie: "boissons", kcal: 46, p: 0.1, g: 11.3, l: 0.1 },
    { nom: "Smoothie fruits", categorie: "boissons", kcal: 60, p: 0.8, g: 13.9, l: 0.4 },
    { nom: "Soda cola", categorie: "boissons", kcal: 42, p: 0, g: 10.6, l: 0 },
    { nom: "Limonade", categorie: "boissons", kcal: 40, p: 0, g: 10, l: 0 },
    { nom: "Boisson energetique", categorie: "boissons", kcal: 45, p: 0, g: 11, l: 0 },
    { nom: "Lait chocolat", categorie: "boissons", kcal: 81, p: 3.2, g: 12.2, l: 2.2 },
    { nom: "Chocolat chaud", categorie: "boissons", kcal: 89, p: 2.8, g: 14.8, l: 2.3 },
    { nom: "Cidre doux", categorie: "boissons", kcal: 50, p: 0, g: 5, l: 0 },
    { nom: "Biere blonde", categorie: "boissons", kcal: 43, p: 0.5, g: 3.6, l: 0 },
    { nom: "Vin rouge", categorie: "boissons", kcal: 85, p: 0.1, g: 2.6, l: 0 },

    { nom: "Pizza margherita", categorie: "plats courants", kcal: 266, p: 11, g: 33, l: 10 },
    { nom: "Pizza jambon fromage", categorie: "plats courants", kcal: 282, p: 12.5, g: 31, l: 12 },
    { nom: "Quiche lorraine", categorie: "plats courants", kcal: 308, p: 10, g: 18, l: 21 },
    { nom: "Lasagnes bolognaise", categorie: "plats courants", kcal: 150, p: 7, g: 13, l: 8 },
    { nom: "Hachis parmentier", categorie: "plats courants", kcal: 155, p: 8.8, g: 12.5, l: 7.8 },
    { nom: "Ratatouille", categorie: "plats courants", kcal: 72, p: 1.6, g: 6.5, l: 4.2 },
    { nom: "Gratin dauphinois", categorie: "plats courants", kcal: 160, p: 3.4, g: 13, l: 10.2 },
    { nom: "Couscous poulet legumes", categorie: "plats courants", kcal: 138, p: 8, g: 15, l: 5.2 },
    { nom: "Paella", categorie: "plats courants", kcal: 158, p: 8.5, g: 18, l: 5.4 },
    { nom: "Boeuf bourguignon", categorie: "plats courants", kcal: 141, p: 11.5, g: 4.4, l: 8.6 },
    { nom: "Blanquette de veau", categorie: "plats courants", kcal: 133, p: 10.6, g: 3.2, l: 8.4 },
    { nom: "Poulet curry", categorie: "plats courants", kcal: 145, p: 12, g: 4.2, l: 8.5 },
    { nom: "Riz cantonais", categorie: "plats courants", kcal: 167, p: 6, g: 24, l: 5 },
    { nom: "Nouilles sautees legumes", categorie: "plats courants", kcal: 153, p: 5, g: 23, l: 4.4 },
    { nom: "Burger boeuf", categorie: "plats courants", kcal: 250, p: 13, g: 21, l: 13 },
    { nom: "Frites", categorie: "plats courants", kcal: 312, p: 3.4, g: 41, l: 15 },
    { nom: "Sandwich jambon beurre", categorie: "plats courants", kcal: 285, p: 12, g: 32, l: 12 },
    { nom: "Omelette fromage", categorie: "plats courants", kcal: 210, p: 12, g: 2, l: 16 },
    { nom: "Soupe de legumes", categorie: "plats courants", kcal: 38, p: 1.2, g: 6, l: 1 },
    { nom: "Salade nicoise", categorie: "plats courants", kcal: 122, p: 8.8, g: 4.9, l: 7.3 },

    { nom: "Huile d'olive", categorie: "sauces/condiments", kcal: 884, p: 0, g: 0, l: 100 },
    { nom: "Huile de tournesol", categorie: "sauces/condiments", kcal: 884, p: 0, g: 0, l: 100 },
    { nom: "Vinaigrette", categorie: "sauces/condiments", kcal: 460, p: 0.3, g: 3, l: 49 },
    { nom: "Mayonnaise", categorie: "sauces/condiments", kcal: 680, p: 1, g: 1, l: 75 },
    { nom: "Ketchup", categorie: "sauces/condiments", kcal: 112, p: 1.3, g: 25.8, l: 0.2 },
    { nom: "Moutarde", categorie: "sauces/condiments", kcal: 66, p: 4.4, g: 5.8, l: 3.6 },
    { nom: "Sauce tomate", categorie: "sauces/condiments", kcal: 41, p: 1.7, g: 7.5, l: 0.5 },
    { nom: "Sauce soja", categorie: "sauces/condiments", kcal: 53, p: 8.1, g: 4.9, l: 0.6 },
    { nom: "Pesto", categorie: "sauces/condiments", kcal: 480, p: 4.5, g: 7, l: 47 },
    { nom: "Miel", categorie: "sauces/condiments", kcal: 304, p: 0.3, g: 82.4, l: 0 },
    { nom: "Confiture fraise", categorie: "sauces/condiments", kcal: 250, p: 0.3, g: 60, l: 0.1 },
    { nom: "Sucre blanc", categorie: "sauces/condiments", kcal: 400, p: 0, g: 100, l: 0 },

    { nom: "Flocons d'avoine", categorie: "cereales", kcal: 370, p: 13.5, g: 58.7, l: 7 },
    { nom: "Muesli nature", categorie: "cereales", kcal: 360, p: 10, g: 61, l: 7.3 },
    { nom: "Corn flakes", categorie: "cereales", kcal: 357, p: 7.4, g: 84, l: 0.4 },
    { nom: "Granola", categorie: "cereales", kcal: 450, p: 10, g: 64, l: 16 },
    { nom: "Cereales chocolat", categorie: "cereales", kcal: 390, p: 7, g: 78, l: 4.2 },
    { nom: "Riz souffle", categorie: "cereales", kcal: 383, p: 6.9, g: 84, l: 0.9 },
    { nom: "Son d'avoine", categorie: "cereales", kcal: 246, p: 17, g: 23, l: 7 },
    { nom: "Semoule ble cru", categorie: "cereales", kcal: 360, p: 12, g: 73, l: 1.5 },
    { nom: "Farine de ble", categorie: "cereales", kcal: 364, p: 10.3, g: 76, l: 1 },
    { nom: "Farine de sarrasin", categorie: "cereales", kcal: 335, p: 13, g: 70, l: 3.4 },

    { nom: "Amandes", categorie: "snacks", kcal: 579, p: 21.2, g: 21.6, l: 49.9 },
    { nom: "Noix", categorie: "snacks", kcal: 654, p: 15.2, g: 13.7, l: 65.2 },
    { nom: "Noisettes", categorie: "snacks", kcal: 628, p: 15, g: 17, l: 60.8 },
    { nom: "Pistaches", categorie: "snacks", kcal: 562, p: 20.3, g: 27.2, l: 45.3 },
    { nom: "Cacahuetes grillees", categorie: "snacks", kcal: 585, p: 24.4, g: 21.3, l: 49.7 },
    { nom: "Barre cereales", categorie: "snacks", kcal: 410, p: 7, g: 65, l: 13 },
    { nom: "Chips nature", categorie: "snacks", kcal: 536, p: 6.2, g: 53, l: 34 },
    { nom: "Pop-corn sucre", categorie: "snacks", kcal: 387, p: 4.5, g: 79, l: 4.3 },
    { nom: "Pop-corn sale", categorie: "snacks", kcal: 382, p: 12, g: 74, l: 4.5 },
    { nom: "Chocolat noir 70%", categorie: "snacks", kcal: 598, p: 7.8, g: 46.4, l: 42.6 },
    { nom: "Chocolat au lait", categorie: "snacks", kcal: 535, p: 7.6, g: 59, l: 30 },
    { nom: "Compote a boire", categorie: "snacks", kcal: 72, p: 0.2, g: 17, l: 0.1 }
  ];

  const VARIANTS = {
    fruits: [
      { suffix: "frais", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "bio", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "mature", k: 1.03, p: 1, g: 1.03, l: 1 },
      { suffix: "surgeles", k: 0.98, p: 1, g: 0.98, l: 1 },
      { suffix: "en morceaux", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "sans peau", k: 0.95, p: 1, g: 0.95, l: 0.95 },
      { suffix: "avec peau", k: 1.03, p: 1, g: 1.03, l: 1.05 },
      { suffix: "portion standard", k: 1, p: 1, g: 1, l: 1 }
    ],
    legumes: [
      { suffix: "crus", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "cuits vapeur", k: 0.95, p: 1, g: 0.95, l: 1 },
      { suffix: "poeles", k: 1.12, p: 1, g: 1, l: 1.35 },
      { suffix: "surgeles", k: 0.98, p: 1, g: 0.98, l: 1 },
      { suffix: "bio", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "en conserve egouttee", k: 1.05, p: 1.02, g: 1.03, l: 1 },
      { suffix: "grilles", k: 1.08, p: 1.02, g: 1.01, l: 1.15 },
      { suffix: "sautes", k: 1.1, p: 1, g: 1, l: 1.25 }
    ],
    feculents: [
      { suffix: "nature", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "sans sel", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "al dente", k: 0.98, p: 1, g: 0.98, l: 1 },
      { suffix: "bien cuit", k: 0.96, p: 1, g: 0.96, l: 1 },
      { suffix: "micro-ondes", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "saute", k: 1.14, p: 1, g: 1, l: 1.25 },
      { suffix: "bio", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "portion cantine", k: 1.02, p: 1, g: 1.02, l: 1 }
    ],
    viandes: [
      { suffix: "grille", k: 1.03, p: 1.04, g: 1, l: 1.02 },
      { suffix: "poelee", k: 1.1, p: 1.02, g: 1, l: 1.15 },
      { suffix: "rotie", k: 1.04, p: 1.03, g: 1, l: 1.06 },
      { suffix: "sans peau", k: 0.92, p: 1.05, g: 1, l: 0.75 },
      { suffix: "avec peau", k: 1.15, p: 1, g: 1, l: 1.35 },
      { suffix: "fumee", k: 1.03, p: 1, g: 1.02, l: 1.05 },
      { suffix: "nature", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "portion familiale", k: 1.02, p: 1, g: 1, l: 1 }
    ],
    poissons: [
      { suffix: "nature", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "grille", k: 1.03, p: 1.02, g: 1, l: 1.04 },
      { suffix: "vapeur", k: 0.97, p: 1.02, g: 1, l: 0.95 },
      { suffix: "fume", k: 1.05, p: 1.02, g: 1, l: 1.06 },
      { suffix: "en conserve egouttee", k: 1.03, p: 1.02, g: 1, l: 1.04 },
      { suffix: "poele", k: 1.1, p: 1.01, g: 1, l: 1.2 },
      { suffix: "surgeles", k: 0.99, p: 1, g: 1, l: 1 },
      { suffix: "bio", k: 1, p: 1, g: 1, l: 1 }
    ],
    oeufs: [
      { suffix: "nature", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "au plat", k: 1.12, p: 1, g: 1, l: 1.2 },
      { suffix: "mollet", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "dur", k: 1.02, p: 1, g: 1, l: 1.03 },
      { suffix: "bio", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "extra frais", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "taille M", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "taille L", k: 1.01, p: 1, g: 1, l: 1.01 }
    ],
    "produits laitiers": [
      { suffix: "nature", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "bio", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "sans lactose", k: 1, p: 1, g: 1.02, l: 1 },
      { suffix: "allege", k: 0.85, p: 1.05, g: 0.95, l: 0.6 },
      { suffix: "enrichi proteines", k: 1.05, p: 1.3, g: 0.95, l: 0.9 },
      { suffix: "fermier", k: 1.07, p: 1.02, g: 1, l: 1.08 },
      { suffix: "portion individuelle", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "sans sucre ajoute", k: 0.9, p: 1, g: 0.8, l: 1 }
    ],
    "pains/viennoiseries": [
      { suffix: "tranche", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "complet", k: 0.96, p: 1.08, g: 0.92, l: 1.05 },
      { suffix: "cereales", k: 1.03, p: 1.07, g: 1, l: 1.08 },
      { suffix: "grille", k: 1.02, p: 1, g: 1, l: 1.01 },
      { suffix: "artisanal", k: 1.04, p: 1.02, g: 1.02, l: 1.04 },
      { suffix: "mini", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "standard", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "bio", k: 1.01, p: 1.02, g: 1, l: 1.01 }
    ],
    "biscuits/gateaux": [
      { suffix: "nature", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "chocolat", k: 1.08, p: 1, g: 1.04, l: 1.11 },
      { suffix: "maison", k: 1.05, p: 1.03, g: 1.02, l: 1.06 },
      { suffix: "portion individuelle", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "allege sucre", k: 0.87, p: 1.02, g: 0.8, l: 1 },
      { suffix: "pepites", k: 1.06, p: 1, g: 1.02, l: 1.08 },
      { suffix: "bio", k: 1.02, p: 1, g: 1.01, l: 1.02 },
      { suffix: "sachet", k: 1, p: 1, g: 1, l: 1 }
    ],
    boissons: [
      { suffix: "sans sucre", k: 0.2, p: 1, g: 0.1, l: 1 },
      { suffix: "classique", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "zero", k: 0.1, p: 1, g: 0.05, l: 1 },
      { suffix: "avec pulpe", k: 1.02, p: 1, g: 1.03, l: 1 },
      { suffix: "frais", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "allonge", k: 0.9, p: 1, g: 0.9, l: 1 },
      { suffix: "format 33cl", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "format 50cl", k: 1, p: 1, g: 1, l: 1 }
    ],
    "plats courants": [
      { suffix: "maison", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "restauration", k: 1.08, p: 1, g: 1.03, l: 1.1 },
      { suffix: "allege", k: 0.82, p: 1.05, g: 0.92, l: 0.72 },
      { suffix: "portion standard", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "portion XL", k: 1.03, p: 1.01, g: 1.01, l: 1.02 },
      { suffix: "surgelé", k: 0.98, p: 0.99, g: 1, l: 0.99 },
      { suffix: "traiteur", k: 1.06, p: 1, g: 1.02, l: 1.08 },
      { suffix: "cantine", k: 1.02, p: 1, g: 1, l: 1.02 }
    ],
    "sauces/condiments": [
      { suffix: "classique", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "leger", k: 0.7, p: 1, g: 0.85, l: 0.55 },
      { suffix: "bio", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "maison", k: 1.03, p: 1, g: 1.02, l: 1.03 },
      { suffix: "sans sucre ajoute", k: 0.82, p: 1, g: 0.65, l: 1 },
      { suffix: "sans sel", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "allonge eau", k: 0.7, p: 1, g: 0.7, l: 0.7 },
      { suffix: "portion restaurant", k: 1.02, p: 1, g: 1.02, l: 1.03 }
    ],
    cereales: [
      { suffix: "nature", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "bio", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "sans sucre ajoute", k: 0.86, p: 1.03, g: 0.8, l: 0.95 },
      { suffix: "complet", k: 0.98, p: 1.06, g: 0.95, l: 1.06 },
      { suffix: "enrichi fibres", k: 0.96, p: 1.05, g: 0.92, l: 1 },
      { suffix: "enrichi proteines", k: 1.05, p: 1.35, g: 0.88, l: 1.1 },
      { suffix: "portion bol", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "format familial", k: 1, p: 1, g: 1, l: 1 }
    ],
    snacks: [
      { suffix: "nature", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "sale", k: 1.01, p: 1, g: 1, l: 1.02 },
      { suffix: "grille", k: 1.03, p: 1.02, g: 1, l: 1.04 },
      { suffix: "non sale", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "portion 30g", k: 1, p: 1, g: 1, l: 1 },
      { suffix: "mix fruits secs", k: 1.02, p: 1, g: 1.02, l: 1.02 },
      { suffix: "chocolat", k: 1.09, p: 0.98, g: 1.08, l: 1.08 },
      { suffix: "bio", k: 1, p: 1, g: 1, l: 1 }
    ]
  };

  function makeFood(base, suffix, mult, idx) {
    return {
      id: `${base.nom.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${suffix.replace(/[^a-z0-9]+/g, "-")}-${idx}`,
      nom: `${base.nom} ${suffix}`,
      categorie: base.categorie,
      calories_100g: Math.max(0, round(base.kcal * mult.k)),
      proteines_100g: Math.max(0, round(base.p * mult.p)),
      glucides_100g: Math.max(0, round(base.g * mult.g)),
      lipides_100g: Math.max(0, round(base.l * mult.l)),
      portions_standards: clonePortions(CATEGORY_PORTIONS[base.categorie] || { grammes: 100 })
    };
  }

  function generateFoods(targetCount) {
    const out = [];
    let idx = 0;
    BASE_FOODS.forEach((base) => {
      const variants = VARIANTS[base.categorie] || [{ suffix: "standard", k: 1, p: 1, g: 1, l: 1 }];
      variants.forEach((variant) => {
        idx += 1;
        out.push(makeFood(base, variant.suffix, variant, idx));
      });
    });

    const pass = [];
    BASE_FOODS.forEach((base) => {
      idx += 1;
      pass.push(
        makeFood(base, "portion individuelle", { k: 1, p: 1, g: 1, l: 1 }, idx),
        makeFood(base, "portion moyenne", { k: 1, p: 1, g: 1, l: 1 }, idx + 5000)
      );
    });
    out.push(...pass);

    let cursor = 0;
    while (out.length < targetCount) {
      const b = BASE_FOODS[cursor % BASE_FOODS.length];
      idx += 1;
      const v = makeFood(
        b,
        `reference nutritionnelle ${Math.floor(cursor / BASE_FOODS.length) + 1}`,
        { k: 1, p: 1, g: 1, l: 1 },
        idx + 10000
      );
      out.push(v);
      cursor += 1;
    }
    return out.slice(0, targetCount);
  }

  const FOODS_DB = generateFoods(1500);
  const FOODS_MAP = new Map(FOODS_DB.map((f) => [f.id, f]));

  window.FOODS_DB = FOODS_DB;
  window.FOODS_MAP = FOODS_MAP;
})();
