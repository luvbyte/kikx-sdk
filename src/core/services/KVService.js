import Service from "./Service.js";

export default class KVService extends Service {
  constructor(app) {
    // Initialize the base Service with the "kv" service name.
    super(app, "kv");

    // KV methods use the parsed API response directly.
    this.setFetchType();
  }

  // Get information about the KV collection.
  //
  // Returns:
  // {
  //   keys: number,
  //   size: number,
  //   path: string,
  //   closed: boolean
  // }
  info = () => this.api("info");

  // Get all key-value pairs from the collection.
  //
  // Example:
  // {
  //   name: "John",
  //   age: 20
  // }
  dump = () => this.api("dump");

  // Get a value by key.
  //
  // Example:
  // await kv.get("name");
  get = key =>
    this.api("get", {
      params: {
        key
      }
    });

  // Set a value for a key.
  //
  // Example:
  // await kv.set("name", "John");
  set = (key, value) =>
    this.api("set", {
      method: "POST",
      body: {
        key,
        value
      }
    });

  // Check whether a key exists.
  //
  // Example:
  // const exists = await kv.exists("name");
  exists = key =>
    this.api("exists", {
      params: {
        key
      }
    });

  // Get a value if it exists.
  // Otherwise, store the provided value and return it.
  //
  // Example:
  // await kv.getOrSet("count", 0);
  getOrSet = (key, value) =>
    this.api("get-set", {
      method: "POST",
      body: {
        key,
        value
      }
    });

  // Remove a key and return its previous value.
  //
  // Example:
  // const oldValue = await kv.pop("name");
  pop = key =>
    this.api("pop", {
      method: "DELETE",
      params: {
        key
      }
    });

  // Manually save the current KV collection to disk.
  //
  // Normally set/getOrSet/pop/reset already persist changes,
  // so this is mainly useful if you explicitly want to force
  // a save.
  save = () =>
    this.api("save", {
      method: "POST"
    });

  // Remove all key-value pairs from the collection.
  reset = () =>
    this.api("reset", {
      method: "POST"
    });
}
