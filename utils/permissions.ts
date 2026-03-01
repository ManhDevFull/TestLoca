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
    error: `${apiName} cần HTTPS (hoặc localhost) để hoạt động trên trình duyệt.`,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Đã xảy ra lỗi chưa xác định khi xin quyền.";
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
      error: "Thiết bị/trình duyệt không hỗ trợ Geolocation API.",
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve({ state: "granted" }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve({
            state: "denied",
            error: "Người dùng đã từ chối quyền vị trí.",
          });
          return;
        }

        resolve({
          state: "error",
          error: error.message || "Không thể lấy vị trí hiện tại.",
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
      error: "Môi trường hiện tại không có Window.",
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
    error: "Thiết bị/trình duyệt không hỗ trợ DeviceOrientationEvent.",
  };
}

export async function requestDeviceMotionPermission(): Promise<PermissionResult> {
  if (typeof window === "undefined") {
    return {
      state: "unsupported",
      error: "Môi trường hiện tại không có Window.",
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
    error: "Thiết bị/trình duyệt không hỗ trợ DeviceMotionEvent.",
  };
}

export async function requestBluetoothPermission(): Promise<BluetoothPermissionResult> {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return secureContextError("Web Bluetooth");
  }

  if (typeof navigator === "undefined") {
    return {
      state: "unsupported",
      error: "Thiết bị/trình duyệt không hỗ trợ Web Bluetooth API.",
    };
  }

  const nav = navigator as Navigator & { bluetooth?: BluetoothNavigatorLike };

  if (!nav.bluetooth) {
    return {
      state: "unsupported",
      error: "Thiết bị/trình duyệt không hỗ trợ Web Bluetooth API.",
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
        error: "Không có thiết bị Bluetooth nào được chọn.",
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
