import Service from "./Service.js";

export default class KVService extends Service {
  constructor(app) {
    super(app, "kv");
  }
  // Get info
  info = () => this.fetch("info");
  // Get value by key
  get = key => this.fetch(`get?key=${key}`);
  // Set key: value
  set = (key, value) => this.fetch("set", "POST", { key, value });
  // Check if key exists
  exists = key => this.fetch(`exists?key=${key}`);
  // Get or set
  getOrSet = (key, value) => this.fetch("get-set", "POST", { key, value });
  // Pop
  pop = key => this.fetch(`pop?key=${key}`);
  // Save
  save = () => this.fetch("save", "POST");
  // Reset
  reset = () => this.fetch("reset", "POST");
  // Config
  config = command => this.fetch(`config?command=${command}`);
}
