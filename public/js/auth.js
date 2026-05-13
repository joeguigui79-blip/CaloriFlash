(() => {
  const PASSWORD_HASH = "9e604ae369406626ad2a58b24eadfa46470a4768e92263e75c57a1543f86bc33";
  const SESSION_KEY = "caloriflash_auth_ok";

  async function sha256Hex(value) {
    const encoded = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    const bytes = Array.from(new Uint8Array(digest));
    return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function isAuthenticated() {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  }

  function setAuthenticated(ok) {
    if (ok) {
      sessionStorage.setItem(SESSION_KEY, "1");
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }

  async function checkPassword(plain) {
    const hash = await sha256Hex(plain || "");
    return hash === PASSWORD_HASH;
  }

  window.CFAuth = {
    isAuthenticated,
    setAuthenticated,
    checkPassword
  };
})();
