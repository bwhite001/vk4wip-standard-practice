/* Seeded random numbers (mulberry32) and shuffle. Works in the browser (window.RNG) and in Node (module.exports). */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RNG = api;
})(typeof self !== "undefined" ? self : this, function () {
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rand) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function randomSeed() {
    try {
      const u = new Uint32Array(1);
      (self.crypto || crypto).getRandomValues(u);
      return u[0] >>> 0 || 1;
    } catch (e) {
      return (Math.floor(Math.random() * 4294967295) >>> 0) || 1;
    }
  }
  const seedToCode = (seed) => (seed >>> 0).toString(36).toUpperCase();
  function codeToSeed(code) {
    if (!/^[0-9A-Za-z]{1,7}$/.test(code || "")) return null;
    const n = parseInt(code, 36);
    return Number.isFinite(n) && n > 0 && n <= 4294967295 ? n >>> 0 : null;
  }
  return { mulberry32, shuffle, randomSeed, seedToCode, codeToSeed };
});
