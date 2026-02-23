import Service from "../Service.js";

export default class ProxyService extends Service {
  constructor() {
    super("proxy");
  }

  fetch(url, method = "GET", headers = {}, body = null) {
    return this._request(
      `?url=${encodeURIComponent(url)}`,
      method,
      headers,
      body
    );
  }

  get = (url, headers = {}) => this.fetch(url, "GET", headers);
  post = (url, body = null, headers = {}) =>
    this.fetch(url, "POST", headers, body);
}
