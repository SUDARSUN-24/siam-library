import "server-only";
import QRCode from "qrcode";
import { config } from "./config";

/** Absolute URL for a site path, using NEXT_PUBLIC_SITE_URL (what phones will open). */
export function siteUrl(path: string) {
  return `${config.siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/** QR code as an SVG string. Medium error correction survives small scratches on stickers. */
export async function qrSvg(path: string) {
  return QRCode.toString(siteUrl(path), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#1d2433", light: "#ffffff" },
  });
}

export function isLocalSiteUrl() {
  return /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/.test(config.siteUrl);
}
