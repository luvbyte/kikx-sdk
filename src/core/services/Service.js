import { request } from "../Api.js";

export default class Service {
  constructor(app, name) {
    this.app = app;
    this.serviceName = name;
    this.baseURL = `/service/${this.serviceName}`;
  }

  async request(endpoint, method = "GET", body = null, isJson = true) {
    let headers = {};

    Object.assign(headers, { "kikx-app-id": this.app.getAppID() });

    return await request(
      this.app.getUrl(`${this.baseURL}/${endpoint}`),
      method,
      body,
      isJson,
      headers
    );
  }

  async fetch(endpoint, method = "GET", body = null, isJson = true) {
    const res = await this.request(endpoint, method, body, isJson);

    if (!res.ok) {
      throw Error(res.error);
    }

    return res.data;
  }
}
