export type SensorPermissionState = PermissionState | "unsupported" | "error";

export interface BluetoothDeviceLike extends EventTarget {
  id: string;
  name?: string | null;
  watchAdvertisements?: () => Promise<void>;
}

interface BluetoothNavigatorLike {
  requestDevice: (options: {
    acceptAllDevices: boolean;
    optionalServices?: string[];
  }) => Promise<BluetoothDeviceLike>;
}

export interface PermissionResult {
  state: SensorPermissionState;
  error?: string;
}

export interface BluetoothPermissionResult extends PermissionResult {
  device?: BluetoothDeviceLike;
}

type IOSPermissionCapable = {
  requestPermission?: () => Promise<"granted" | "denied">;
};

function secureContextError(apiName: string): PermissionResult {
  return {
    state: "unsupported",
    error: `${apiName} can HTTPS (hoac localhost) de hoat dong tren trinh duyet.`,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown permission error.";
}

async function requestIOSPermission(
  constructorLike: IOSPermissionCapable | undefined,
): Promise<PermissionResult | null> {
  if (!constructorLike?.requestPermission) {
    return null;
  }

  try {
    const state = await constructorLike.requestPermission();
    return { state };
  } catch (error) {
    return { state: "error", error: getErrorMessage(error) };
  }
}

export async function queryGeolocationPermission(): Promise<SensorPermissionState> {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "unsupported";
  }

  if (typeof navigator === "undefined" || !navigator.permissions) {
    return "prompt";
  }

  try {
    const permission = await navigator.permissions.query({ name: "geolocation" });
    return permission.state;
  } catch {
    return "prompt";
  }
}

export async function requestGeolocationPermission(): Promise<PermissionResult> {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return secureContextError("Geolocation");
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return {
      state: "unsupported",
      error: "Geolocation API is unavailable on this device/browser.",
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve({ state: "granted" }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve({
            state: "denied",
            error: "Geolocation permission was denied by the user.",
          });
          return;
        }

        resolve({
          state: "error",
          error: error.message || "Unable to retrieve location.",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  });
}

export async function requestCompassPermission(): Promise<PermissionResult> {
  if (typeof window === "undefined") {
    return {
      state: "unsupported",
      error: "Window is unavailable.",
    };
  }

  if (!window.isSecureContext) {
    return secureContextError("DeviceOrientation");
  }

  const iosResult = await requestIOSPermission(
    window.DeviceOrientationEvent as unknown as IOSPermissionCapable,
  );

  if (iosResult) {
    return iosResult;
  }

  if ("DeviceOrientationEvent" in window) {
    return { state: "granted" };
  }

  return {
    state: "unsupported",
    error: "DeviceOrientationEvent is unavailable.",
  };
}

export async function requestDeviceMotionPermission(): Promise<PermissionResult> {
  if (typeof window === "undefined") {
    return {
      state: "unsupported",
      error: "Window is unavailable.",
    };
  }

  if (!window.isSecureContext) {
    return secureContextError("DeviceMotion");
  }

  const iosResult = await requestIOSPermission(
    window.DeviceMotionEvent as unknown as IOSPermissionCapable,
  );

  if (iosResult) {
    return iosResult;
  }

  if ("DeviceMotionEvent" in window) {
    return { state: "granted" };
  }

  return {
    state: "unsupported",
    error: "DeviceMotionEvent is unavailable.",
  };
}

export async function requestBluetoothPermission(): Promise<BluetoothPermissionResult> {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return secureContextError("Web Bluetooth");
  }

  if (typeof navigator === "undefined") {
    return {
      state: "unsupported",
      error: "Web Bluetooth API is unavailable on this device/browser.",
    };
  }

  const nav = navigator as Navigator & { bluetooth?: BluetoothNavigatorLike };

  if (!nav.bluetooth) {
    return {
      state: "unsupported",
      error: "Web Bluetooth API is unavailable on this device/browser.",
    };
  }

  try {
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ["battery_service", "device_information"],
    });

    return {
      state: "granted",
      device,
    };
  } catch (error) {
    const errorName = error instanceof DOMException ? error.name : "";

    if (errorName === "NotFoundError") {
      return {
        state: "denied",
        error: "No Bluetooth device was selected.",
      };
    }

    if (errorName === "NotAllowedError" || errorName === "SecurityError") {
      return {
        state: "denied",
        error: getErrorMessage(error),
      };
    }

    return {
      state: "error",
      error: getErrorMessage(error),
    };
  }
}
