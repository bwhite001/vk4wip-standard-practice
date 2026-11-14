/* Safe localStorage wrapper. Everything degrades to in-memory if storage is blocked. */
(function (root) {
  const PREFIX = "vk4wip-std:";
  const mem = {};
  function get(key, fallback) {
    try {
      const v = root.localStorage.getItem(PREFIX + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) {
      return key in mem ? mem[key] : fallback;
    }
  }
  function set(key, value) {
    mem[key] = value;
    try { root.localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function remove(key) {
    delete mem[key];
    try { root.localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ }
  }
  function available() {
    try { root.localStorage.setItem(PREFIX + "t", "1"); root.localStorage.removeItem(PREFIX + "t"); return true; } catch (e) { return false; }
  }
  root.Store = { get, set, remove, available };
})(typeof self !== "undefined" ? self : this);
