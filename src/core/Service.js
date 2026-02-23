import { getAppID } from "../utils/app.js";
import { request } from "./api.js";

export default class Service {
  constructor(name) {
    this.appID = getAppID();
    this.serviceName = name;
    this.baseURL = `/service/${this.serviceName}`;
  }

  async request(endpoint, method = "GET", body = null, isJson = true) {
    let headers = {};

    Object.assign(headers, { "kikx-app-id": this.appID });

    return await request(
      `${this.baseURL}/${endpoint}`,
      method,
      body,
      isJson,
      headers
    );
  }
}
