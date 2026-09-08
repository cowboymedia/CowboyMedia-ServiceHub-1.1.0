export const APP_VERSION = "9.2";

export function versionAnchor(version: string): string {
  return `version-${version.replace(/\./g, "-")}`;
}
