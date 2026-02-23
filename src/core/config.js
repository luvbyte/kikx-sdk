let customApiUrl = null;
let customWsUrl = null;

export const configureUrls = options => {
  const { apiUrl, wsUrl } = options;

  if (apiUrl) customApiUrl = apiUrl;
  if (wsUrl) customWsUrl = wsUrl;
};

const getDefaultBase = () => {
  const { protocol, hostname, port } = window.location;
  return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
};

export const apiUrl = () => customApiUrl || getDefaultBase();

export const getWsUrl = () => {
  if (customWsUrl) return customWsUrl;

  const { protocol, hostname, port } = window.location;
  return `${protocol === "https:" ? "wss:" : "ws:"}//${hostname}${port ? `:${port}` : ""}`;
};

export const getUrl = end => {
  let endUrl = end.startsWith("/") ? end : "/" + end;
  return apiUrl() + endUrl;
};
