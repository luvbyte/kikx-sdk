export function getAppID() {
  return location.pathname.split("/")[2];
}
