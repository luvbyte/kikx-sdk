import { getUrl } from "./config.js";

export async function request(
  endpoint,
  method = "GET",
  body = null,
  isJson = true,
  headers = {}
) {
  if (body && isJson) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }

  try {
    const response = await fetch(getUrl(endpoint), {
      method,
      headers,
      body
    });

    const contentType = response.headers.get("content-type");

    let data = null;
    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else if (contentType?.includes("text/")) {
      data = await response.text();
    } else if (contentType?.includes("application/octet-stream")) {
      data = await response.blob();
    }

    return {
      ok: response.ok,
      code: response.status,
      contentType,
      data: response.ok ? data : null,
      error: response.ok ? null : data || `Error ${response.status}`
    };
  } catch (err) {
    return {
      code: 500,
      ok: false,
      data: null,
      error: err.message || "Unknown error"
    };
  }
}

export async function fetchAppConfig(appID) {
  const res = await request(`/api/app/config?app_id=${appID}`);

  if (res.error) {
    throw Error(res.error);
  }

  return res.data;
}
