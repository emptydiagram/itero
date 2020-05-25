export default class DataStore {
  get(key) {
    const val = localStorage.getItem(key);
    if (val == null) {
      return null;
    }
    return val;
  }

  set(key, value) {
    return localStorage.setItem(key, value);
  }
}