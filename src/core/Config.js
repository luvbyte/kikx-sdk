class KikxConfig {
  constructor(config = {}) {
    // Extract custom configuration values.
    const { apiUrl, wsUrl, appID } = config || {};

    // Store custom API and WebSocket URLs.
    this.customApiUrl = apiUrl;
    this.customWsUrl = wsUrl;

    // Use the provided App ID.
    // If no App ID is provided, try to get it from the URL path:
    // /app/{appID}/...
    // Otherwise, use null.
    this.customAppID = appID || window.location.pathname.split("/")[2] || null;
  }

  // Get the current App ID.
  getAppID = () => this.customAppID;

  // Update custom API, WebSocket, and App ID configuration.
  configureUrls(options = {}) {
    const { apiUrl, wsUrl, appID } = options;

    // Only update values that are provided.
    if (apiUrl) this.customApiUrl = apiUrl;
    if (wsUrl) this.customWsUrl = wsUrl;
    if (appID) this.customAppID = appID;
  }

  // Get the default base URL from the current browser location.
  // Example:
  // http://localhost:3000
  // https://example.com
  getDefaultBase = () => {
    const { protocol, hostname, port } = window.location;

    return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
  };

  // Get the API base URL.
  // Use the custom API URL if configured;
  // otherwise, use the current page's base URL.
  getApiUrl = () => this.customApiUrl || this.getDefaultBase();

  // Get the WebSocket base URL.
  // Use the custom WebSocket URL if configured.
  // Otherwise, convert:
  //   http  -> ws
  //   https -> wss
  getWsUrl = () => {
    if (this.customWsUrl) return this.customWsUrl;

    const { protocol, hostname, port } = window.location;

    return `${protocol === "https:" ? "wss:" : "ws:"}//${hostname}${
      port ? `:${port}` : ""
    }`;
  };

  // Build a complete API URL with an endpoint.
  // Both of these work:
  //   getUrl("users")
  //   getUrl("/users")
  //
  // Result:
  //   https://example.com/users
  getUrl = (end = "") =>
    `${this.getApiUrl()}${end.startsWith("/") ? end : `/${end}`}`;
}

export default KikxConfig;
