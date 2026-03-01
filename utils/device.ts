export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

export type OperatingSystem =
  | "ios"
  | "android"
  | "windows"
  | "macos"
  | "linux"
  | "chromeos"
  | "unknown";

export interface DeviceInfo {
  type: DeviceType;
  os: OperatingSystem;
  browser: string;
  touch: boolean;
}

interface UserAgentDataLike {
  mobile?: boolean;
  platform?: string;
  brands?: Array<{ brand: string; version: string }>;
}

type NavigatorWithUAData = Navigator & {
  userAgentData?: UserAgentDataLike;
};

const mobilePattern = /mobile|iphone|ipod|android.+mobile|windows phone/i;
const tabletPattern = /ipad|tablet|android(?!.*mobile)|silk/i;

function detectDeviceType(ua: string, uaData?: UserAgentDataLike): DeviceType {
  if (typeof uaData?.mobile === "boolean") {
    return uaData.mobile ? "mobile" : "desktop";
  }

  if (tabletPattern.test(ua)) {
    return "tablet";
  }

  if (mobilePattern.test(ua)) {
    return "mobile";
  }

  if (ua) {
    return "desktop";
  }

  return "unknown";
}

function detectOperatingSystem(
  ua: string,
  uaData?: UserAgentDataLike,
): OperatingSystem {
  const platform = uaData?.platform?.toLowerCase() ?? "";

  if (platform.includes("android") || /android/i.test(ua)) {
    return "android";
  }

  if (
    platform.includes("ios") ||
    /iphone|ipad|ipod/i.test(ua) ||
    (platform.includes("mac") && /mobile/i.test(ua))
  ) {
    return "ios";
  }

  if (platform.includes("win") || /windows/i.test(ua)) {
    return "windows";
  }

  if (platform.includes("cros") || /cros/i.test(ua)) {
    return "chromeos";
  }

  if (platform.includes("mac") || /mac os x/i.test(ua)) {
    return "macos";
  }

  if (platform.includes("linux") || /linux|x11/i.test(ua)) {
    return "linux";
  }

  return "unknown";
}

function detectBrowser(
  ua: string,
  brands?: Array<{ brand: string; version: string }>,
): string {
  const fromBrands =
    brands?.find((brand) => !/not\s*a\s*brand/i.test(brand.brand))?.brand ?? "";

  if (fromBrands) {
    return fromBrands;
  }

  if (/edg/i.test(ua)) {
    return "Microsoft Edge";
  }

  if (/opr|opera/i.test(ua)) {
    return "Opera";
  }

  if (/chrome|crios/i.test(ua)) {
    return "Google Chrome";
  }

  if (/firefox|fxios/i.test(ua)) {
    return "Mozilla Firefox";
  }

  if (/safari/i.test(ua)) {
    return "Safari";
  }

  return "Unknown Browser";
}

export function getDeviceInfo(): DeviceInfo {
  if (typeof navigator === "undefined") {
    return {
      type: "unknown",
      os: "unknown",
      browser: "Unknown Browser",
      touch: false,
    };
  }

  const nav = navigator as NavigatorWithUAData;
  const ua = nav.userAgent ?? "";
  const uaData = nav.userAgentData;
  const touchPoints =
    typeof navigator.maxTouchPoints === "number" ? navigator.maxTouchPoints : 0;
  const hasTouch =
    touchPoints > 0 ||
    (typeof window !== "undefined" && "ontouchstart" in window);
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1366;

  let type = detectDeviceType(ua, uaData);

  // Fallback for browsers reporting desktop UA on touch phones.
  if (type === "desktop" && hasTouch && viewportWidth <= 820) {
    type = "mobile";
  }

  return {
    type,
    os: detectOperatingSystem(ua, uaData),
    browser: detectBrowser(ua, uaData?.brands),
    touch: hasTouch,
  };
}
