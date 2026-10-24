import { request as apiRequest } from "../Api.js";
import type { ApiResult, RequestOptions } from "../../types.js";
import type { KikxApp } from "../KikxApp.js";

export default class Service {
  app: KikxApp;
  serviceName: string;
  baseURL: string;
  _apiType: "request" | "fetch";

  constructor(app: KikxApp, name: string) {
    this.app = app;
    this.serviceName = name;
    this.baseURL = `/service/${this.serviceName}`;

    this._apiType = "request";
  }

  setRequestType() {
    this._apiType = "request";
  }

  setFetchType() {
    this._apiType = "fetch";
  }

  api = (endpoint: string, options: RequestOptions = {}): Promise<any> =>
    this._apiType === "request"
      ? this.request(endpoint, options)
      : this.fetch(endpoint, options);

  request = (endpoint: string, options: RequestOptions = {}): Promise<ApiResult> => {
    const { method = "GET", body, params = {}, headers = {}, ...fetchOptions } = options;
    Object.assign(headers, { "kikx-app-id": this.app.getAppID() });
    const url = this.app.getUrl(`${this.baseURL}/${endpoint}`);

    return apiRequest(url, {
      method,
      body,
      params,
      headers,
      ...fetchOptions
    });
  };

  fetch = async (endpoint: string, options: RequestOptions = {}): Promise<unknown> => {
    const { data, error } = await this.request(endpoint, options);

    if (error) {
      throw new Error(error.detail || error.message || "Error fetching data");
    }

    return data;
  };

  health = () => this.fetch("health");
}
