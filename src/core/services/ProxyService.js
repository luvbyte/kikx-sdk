import Service from "./Service.js";

export default class ProxyService extends Service {
  constructor(app) {
    super(app, "proxy");
  }
  
  // Proxy Request non-cors blocking response
  proxyRequest = (
    url,
    {
      method = "GET",
      params = {},
      body = undefined,
      headers = {},
      ...options
    } = {}
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
