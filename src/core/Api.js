export async function request(
  endpoint,
  method = "GET",
  body = null,
  isJson = true,
  headers = {}
) {
  headers = { ...headers };

  if (body && isJson) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }

  try {
    const response = await fetch(endpoint, {
      method,
      headers,
      body
    });

    const contentType = response.headers.get("content-type");
    let data = null;

    if (response.status !== 204) {
      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else if (contentType?.includes("text/")) {
        data = await response.text();
      } else if (contentType?.includes("application/octet-stream")) {
        data = await response.blob();
      }
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
      ok: false,
      code: 500,
      data: null,
      error: err.message || "Unknown error"
    };
  }
}

