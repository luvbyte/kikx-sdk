import Service from "./Service.js";

export default class ProxyService extends Service {
  constructor(app) {
    super(app, "proxy");
  }
  fetch(url, { method = "GET", headers = {}, body = null } = {}) {
    return globalThis.fetch(`${this.baseURL}?url=${encodeURIComponent(url)}`, {
      method,
      headers,
      ...(body != null && { body })
    });
  }
}
