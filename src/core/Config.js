class KikxConfig {
  constructor(config = {}) {
    const { apiUrl, wsUrl, appID } = config || {};

    this.customApiUrl = apiUrl;
    this.customWsUrl = wsUrl;
    this.customAppID = appID || window.location.pathname.split("/")[2] || null;
  }
  
  getAppID = () => this.customAppID
  

  configureUrls(options = {}) {
    const { apiUrl, wsUrl, appID } = options;

    if (apiUrl) this.customApiUrl = apiUrl;
    if (wsUrl) this.customWsUrl = wsUrl;
    if (appID) this.customAppID = appID;
  }

  getDefaultBase() {
    const { protocol, hostname, port } = window.location;
    return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
  }

  apiUrl() {
    return this.customApiUrl || this.getDefaultBase();
  }

  getWsUrl() {
    if (this.customWsUrl) return this.customWsUrl;

    const { protocol, hostname, port } = window.location;
    return `${protocol === "https:" ? "wss:" : "ws:"}//${hostname}${port ? `:${port}` : ""}`;
  }

  getUrl(end) {
    const endUrl = end.startsWith("/") ? end : `/${end}`;
    return this.apiUrl() + endUrl;
  }
}

export default KikxConfig;
