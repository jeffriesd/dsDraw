
class Dictionary {
  constructor(keyValueList) {
    keyValueList.forEach(([k, v]) => {
      this.set(k, v);
    });

    // store data in map
    this.map = new Map();
  }

  set(key, value) {
    if (! (typeof key == "number" || typeof key == "string"))
      throw `Dictionary keys must be string or number: ${key}.`;
    // this[key] =  value;
    this.map.set(key, value);
  }

  get(key) { 
    // return this[key];
    return this.map.get(key);
  }

  keys() {
    return this.map.keys();
  }

  values() {
    return this.map.values();
  }

  entries() {
    return this.map.entries();
  }

  forEach(f) {
    this.map.forEach(f);
  }
}
