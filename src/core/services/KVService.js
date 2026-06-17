import Service from "./Service.js";

export default class KVService extends Service {
  constructor(app) {
    super(app, "kv");
  }
  info() {
    return this.fetch("info");
  }
  get(key) {
    return this.fetch(`get?key=${key}`);
  }
  set(key, value) {
    return this.fetch("set", "POST", {
      key,
      value
    });
  }
  exists(key) {
    return this.fetch(`exists?key=${key}`);
  }
  config(command) {
    return this.fetch(`config?command=${command}`)
  }
}
