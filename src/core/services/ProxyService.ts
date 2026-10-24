import Service from "./Service.js";
import type { KikxApp } from "../KikxApp.js";
import type { RequestOptions } from "../../types.js";

export default class ProxyService extends Service {
  constructor(app: KikxApp) {
    super(app, "proxy");
  }
  
  // Proxy Request non-cors blocking response
  proxyRequest = (
    url: string,
    {
      method = "GET",
      params = {},
      body = undefined,
      headers = {},
      ...options
    }: RequestOptions = {}
  ) =>
    this.api("", {
      method,
      params: {
        __proxy_target: url,
        ...params
      },
      body,
      headers,
      ...options
    });
}
