(() => {
  let stream = null;
  let scanTimer = null;
  let detector = null;

  async function startCamera(videoEl) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Camera non supportee");
    }
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    videoEl.srcObject = stream;
    return stream;
  }

  function stopCamera() {
    if (scanTimer) {
      clearInterval(scanTimer);
      scanTimer = null;
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
  }

  async function fetchOpenFoodFacts(barcode) {
    if (!navigator.onLine) {
      throw new Error("Scanner necessite une connexion internet");
    }
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("Erreur reseau OpenFoodFacts");
    }
    const data = await res.json();
    if (!data || data.status !== 1 || !data.product) {
      throw new Error("Produit introuvable");
    }
    const p = data.product;
    const nutr = p.nutriments || {};
    return {
      id: `off-${barcode}`,
      nom: p.product_name_fr || p.product_name || `Produit ${barcode}`,
      categorie: "produits",
      calories_100g: Number(nutr["energy-kcal_100g"] || nutr["energy-kcal"] || 0),
      proteines_100g: Number(nutr.proteins_100g || 0),
      glucides_100g: Number(nutr.carbohydrates_100g || 0),
      lipides_100g: Number(nutr.fat_100g || 0),
      portions_standards: { grammes: 100, portion: 100, unite: 100 }
    };
  }

  async function getDetector() {
    if (!("BarcodeDetector" in window)) {
      return null;
    }
    if (!detector) {
      detector = new window.BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"]
      });
    }
    return detector;
  }

  function startLightScanner(videoEl, onBarcode) {
    let locked = false;
    scanTimer = setInterval(async () => {
      if (locked) {
        return;
      }
      const w = videoEl.videoWidth || 0;
      const h = videoEl.videoHeight || 0;
      if (!w || !h) {
        return;
      }
      const det = await getDetector();
      if (!det) {
        return;
      }
      locked = true;
      try {
        const found = await det.detect(videoEl);
        if (found && found.length) {
          const raw = (found[0].rawValue || "").replace(/\D+/g, "");
          if (raw.length >= 8) {
            onBarcode(raw);
          }
        }
      } catch (_) {
      } finally {
        locked = false;
      }
    }, 700);
  }

  window.CFScanner = {
    startCamera,
    stopCamera,
    fetchOpenFoodFacts,
    startLightScanner
  };
})();
