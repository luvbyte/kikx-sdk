export const base64ToBytes = base64 =>
  new Uint8Array(
    atob(base64)
      .split("")
      .map(c => c.charCodeAt(0))
  );

export const decodeBytes = (data, enc = "utf-8", fatal = true) =>
  new TextDecoder(enc, { fatal }).decode(data);

export async function blobToText(blob) {
  return await blob.text();
}
