"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  Geolocation,
  type CallbackID,
  type Position as CapacitorPosition,
} from "@capacitor/geolocation";
import { getDeviceInfo, type DeviceInfo } from "@/utils/device";
import {
  queryGeolocationPermission,
  requestBluetoothPermission,
  requestCompassPermission,
  requestDeviceMotionPermission,
  requestGeolocationPermission,
  type BluetoothDeviceLike,
  type PermissionResult,
  type SensorPermissionState,
} from "@/utils/permissions";

export interface SensorPermissions {
  compass: SensorPermissionState;
  location: SensorPermissionState;
  motion: SensorPermissionState;
  bluetooth: SensorPermissionState;
}

export interface LocationSnapshot {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface MotionSnapshot {
  x: number | null;
  y: number | null;
  z: number | null;
  interval: number | null;
}

export interface BluetoothSnapshot {
  deviceName: string;
  deviceId: string;
  rssi: number | null;
  txPower: number | null;
  watching: boolean;
  note: string;
}

type BluetoothDeviceWithAdvertisements = BluetoothDeviceLike & {
  watchAdvertisements?: () => Promise<void>;
};

interface BluetoothAdvertisingEventLike extends Event {
  rssi?: number;
  txPower?: number;
}

const DEFAULT_PERMISSIONS: SensorPermissions = {
  compass: "prompt",
  location: "prompt",
  motion: "prompt",
  bluetooth: "prompt",
};

const DEFAULT_BLUETOOTH: BluetoothSnapshot = {
  deviceName: "",
  deviceId: "",
  rssi: null,
  txPower: null,
  watching: false,
  note: "Chưa kết nối BLE.",
};

const DEFAULT_DEVICE_INFO: DeviceInfo = {
  type: "unknown",
  os: "unknown",
  browser: "Unknown Browser",
  touch: false,
};

const MOTION_ALPHA = 0.28;
const MOTION_COMMIT_INTERVAL = 280;
const BLE_COMMIT_INTERVAL = 360;
const LOCATION_COMMIT_INTERVAL = 1700;
const LOG_DEDUP_INTERVAL = 1200;

function smoothValue(
  previous: number | null,
  incoming: number | null,
  alpha: number,
): number | null {
  if (incoming === null || Number.isNaN(incoming)) {
    return previous;
  }

  if (previous === null || Number.isNaN(previous)) {
    return incoming;
  }

  return previous + (incoming - previous) * alpha;
}

function roundNumber(value: number | null, fractionDigits = 2): number | null {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  return Number(value.toFixed(fractionDigits));
}

function distanceInMeters(a: LocationSnapshot, b: LocationSnapshot): number {
  const earthRadius = 6371000;
  const toRadians = (degree: number) => (degree * Math.PI) / 180;

  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLon = toRadians(b.longitude - a.longitude);

  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);

  const haversine =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;

  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

export function useSensorHub() {
  const [hydrated, setHydrated] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(DEFAULT_DEVICE_INFO);
  const [secureContext, setSecureContext] = useState<boolean | null>(null);
  const [currentOrigin, setCurrentOrigin] = useState<string>("");

  const [permissions, setPermissions] =
    useState<SensorPermissions>(DEFAULT_PERMISSIONS);
  const [location, setLocation] = useState<LocationSnapshot | null>(null);
  const [motion, setMotion] = useState<MotionSnapshot | null>(null);
  const [bluetooth, setBluetooth] =
    useState<BluetoothSnapshot>(DEFAULT_BLUETOOTH);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastActionMessage, setLastActionMessage] = useState<string>(
    "Ứng dụng đang sẵn sàng.",
  );
  const [securityLocked, setSecurityLocked] = useState(false);
  const [securityReason, setSecurityReason] = useState<string>("");

  const geoWatchIdRef = useRef<number | CallbackID | null>(null);
  const bluetoothCleanupRef = useRef<(() => void) | null>(null);

  const motionFilterRef = useRef<MotionSnapshot | null>(null);
  const motionCommitRef = useRef(0);

  const locationCommitRef = useRef(0);
  const locationFilterRef = useRef<LocationSnapshot | null>(null);

  const bleCommitRef = useRef(0);
  const lastLogRef = useRef<{ message: string; timestamp: number } | null>(null);
  const securityLockRef = useRef(false);

  useEffect(() => {
    securityLockRef.current = securityLocked;
  }, [securityLocked]);

  const appendLog = useCallback((message: string) => {
    const now = Date.now();

    if (
      lastLogRef.current &&
      lastLogRef.current.message === message &&
      now - lastLogRef.current.timestamp < LOG_DEDUP_INTERVAL
    ) {
      return;
    }

    lastLogRef.current = { message, timestamp: now };

    const stamp = new Date(now).toLocaleTimeString("vi-VN", {
      hour12: false,
    });

    setLastActionMessage(message);
    setLogs((previous) => [`${stamp} ${message}`, ...previous].slice(0, 12));
  }, []);

  const activateSecurityLock = useCallback(
    (reason: string) => {
      if (securityLockRef.current) {
        return;
      }

      securityLockRef.current = true;
      setSecurityLocked(true);
      setSecurityReason(reason);
      appendLog(reason);
    },
    [appendLog],
  );

  const setPermissionState = useCallback(
    (key: keyof SensorPermissions, state: SensorPermissionState) => {
      setPermissions((previous) => ({ ...previous, [key]: state }));
    },
    [],
  );

  const isMobileSupported = hydrated && deviceInfo.type === "mobile";

  const accessMessage = useMemo(() => {
    if (!hydrated) {
      return "Đang khởi tạo thiết bị...";
    }

    if (deviceInfo.type !== "mobile") {
      return "Tính năng cảm biến chỉ khả dụng trên điện thoại di động.";
    }

    if (securityLocked) {
      return securityReason || "Ứng dụng đã khóa vì phát hiện can thiệp bất thường.";
    }

    return "";
  }, [deviceInfo.type, hydrated, securityLocked, securityReason]);

  const accessBlocked = !isMobileSupported || securityLocked;

  const ensureHardwareAccess = useCallback(
    (intentLabel: string): boolean => {
      if (!hydrated) {
        appendLog("Ứng dụng đang khởi tạo, vui lòng chờ giây lát.");
        return false;
      }

      if (deviceInfo.type !== "mobile") {
        appendLog("Thiết bị này không được phép sử dụng tính năng phần cứng.");
        return false;
      }

      if (securityLocked) {
        appendLog(securityReason || "Ứng dụng đã khóa bảo mật.");
        return false;
      }

      if (secureContext === false) {
        appendLog(`${intentLabel} yêu cầu HTTPS để hoạt động ổn định.`);
      }

      return true;
    },
    [appendLog, deviceInfo.type, hydrated, secureContext, securityLocked, securityReason],
  );

  const processPermissionResult = useCallback(
    (
      key: keyof SensorPermissions,
      result: PermissionResult,
      successMessage: string,
    ) => {
      setPermissionState(key, result.state);

      if (result.state === "granted") {
        appendLog(successMessage);
      } else if (result.error) {
        appendLog(result.error);
      }

      return result.state;
    },
    [appendLog, setPermissionState],
  );

  const requestCompass = useCallback(async () => {
    if (!ensureHardwareAccess("La bàn")) {
      return "unsupported" as SensorPermissionState;
    }

    const result = await requestCompassPermission();

    return processPermissionResult(
      "compass",
      result,
      "Đã cấp quyền la bàn (DeviceOrientation).",
    );
  }, [ensureHardwareAccess, processPermissionResult]);

  const requestMotion = useCallback(async () => {
    if (!ensureHardwareAccess("Device Motion")) {
      return "unsupported" as SensorPermissionState;
    }

    const result = await requestDeviceMotionPermission();

    return processPermissionResult(
      "motion",
      result,
      "Đã cấp quyền DeviceMotionEvent.",
    );
  }, [ensureHardwareAccess, processPermissionResult]);

  const requestLocation = useCallback(async () => {
    if (!ensureHardwareAccess("Vị trí")) {
      return "unsupported" as SensorPermissionState;
    }

    const result = await requestGeolocationPermission();

    return processPermissionResult(
      "location",
      result,
      "Đã cấp quyền vị trí (Geolocation).",
    );
  }, [ensureHardwareAccess, processPermissionResult]);

  const requestBluetooth = useCallback(async () => {
    if (!ensureHardwareAccess("Bluetooth")) {
      return "unsupported" as SensorPermissionState;
    }

    const result = await requestBluetoothPermission();

    setPermissionState("bluetooth", result.state);

    if (result.state !== "granted" || !result.device) {
      setBluetooth((previous) => ({
        ...previous,
        watching: false,
        note: result.error ?? "Không kết nối được Bluetooth.",
      }));

      if (result.error) {
        appendLog(result.error);
      }

      return result.state;
    }

    const device = result.device;
    const advertisementDevice = device as BluetoothDeviceWithAdvertisements;

    bluetoothCleanupRef.current?.();

    const onAdvertisement = (event: Event) => {
      const now = Date.now();
      if (now - bleCommitRef.current < BLE_COMMIT_INTERVAL) {
        return;
      }

      bleCommitRef.current = now;

      const advertisement = event as BluetoothAdvertisingEventLike;

      setBluetooth((previous) => ({
        ...previous,
        rssi:
          typeof advertisement.rssi === "number"
            ? advertisement.rssi
            : previous.rssi,
        txPower:
          typeof advertisement.txPower === "number"
            ? advertisement.txPower
            : previous.txPower,
      }));
    };

    device.addEventListener(
      "advertisementreceived",
      onAdvertisement as EventListener,
    );

    bluetoothCleanupRef.current = () => {
      device.removeEventListener(
        "advertisementreceived",
        onAdvertisement as EventListener,
      );
    };

    setBluetooth({
      deviceName: device.name ?? "Thiết bị BLE không tên",
      deviceId: device.id,
      rssi: null,
      txPower: null,
      watching: false,
      note: "Đang chờ gói advertisement để cập nhật RSSI.",
    });

    if (typeof advertisementDevice.watchAdvertisements !== "function") {
      setBluetooth((previous) => ({
        ...previous,
        note: "Trình duyệt chưa hỗ trợ watchAdvertisements()/RSSI thời gian thực.",
      }));
      appendLog(
        "Đã kết nối Bluetooth nhưng trình duyệt hiện tại không hỗ trợ RSSI thời gian thực.",
      );
      return result.state;
    }

    try {
      await advertisementDevice.watchAdvertisements();
      setBluetooth((previous) => ({
        ...previous,
        watching: true,
        note: "Đang nghe BLE advertisement (RSSI thời gian thực).",
      }));
      appendLog(`Đã kết nối BLE: ${device.name ?? device.id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Không thể bật watchAdvertisements.";

      setBluetooth((previous) => ({
        ...previous,
        watching: false,
        note: errorMessage,
      }));
      appendLog(errorMessage);
    }

    return result.state;
  }, [appendLog, ensureHardwareAccess, setPermissionState]);

  const requestCorePermissions = useCallback(async () => {
    if (!ensureHardwareAccess("Quyền cảm biến")) {
      return;
    }

    appendLog("Bắt đầu xin quyền cảm biến... (lần lượt)");
    await requestCompass();
    await requestMotion();
    await requestLocation();
  }, [appendLog, ensureHardwareAccess, requestCompass, requestLocation, requestMotion]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const timerId = window.setTimeout(() => {
      setDeviceInfo(getDeviceInfo());
      setSecureContext(window.isSecureContext);
      setCurrentOrigin(window.location.origin);
      setHydrated(true);
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  useEffect(() => {
    if (!hydrated || deviceInfo.type !== "mobile") {
      return;
    }

    let active = true;

    void (async () => {
      const locationState = await queryGeolocationPermission();

      if (!active) {
        return;
      }

      setPermissionState("location", locationState);
    })();

    return () => {
      active = false;
    };
  }, [deviceInfo.type, hydrated, setPermissionState]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }

    const blockedCombo = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if (key === "f12") {
        return true;
      }

      if (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key)) {
        return true;
      }

      return event.ctrlKey && key === "u";
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!blockedCombo(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      activateSecurityLock(
        "Đã phát hiện thao tác công cụ phát triển. Tính năng phần cứng đã bị khóa.",
      );
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const devtoolsCheck = () => {
      if (deviceInfo.type !== "mobile") {
        return;
      }

      const widthGap = window.outerWidth - window.innerWidth;
      const heightGap = window.outerHeight - window.innerHeight;

      if (widthGap > 170 || heightGap > 170) {
        activateSecurityLock(
          "Phát hiện dấu hiệu mở DevTools. Ứng dụng tạm khóa cảm biến để bảo vệ logic.",
        );
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("contextmenu", onContextMenu);
    const intervalId = window.setInterval(devtoolsCheck, 1500);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("contextmenu", onContextMenu);
      window.clearInterval(intervalId);
    };
  }, [activateSecurityLock, deviceInfo.type, hydrated]);

  const canReadSensors = hydrated && deviceInfo.type === "mobile" && !securityLocked;

  useEffect(() => {
    if (!canReadSensors || permissions.motion !== "granted" || typeof window === "undefined") {
      return;
    }

    motionFilterRef.current = null;
    motionCommitRef.current = 0;

    const onMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity ?? event.acceleration ?? null;

      const nextRaw: MotionSnapshot = {
        x: typeof acceleration?.x === "number" ? acceleration.x : null,
        y: typeof acceleration?.y === "number" ? acceleration.y : null,
        z: typeof acceleration?.z === "number" ? acceleration.z : null,
        interval: typeof event.interval === "number" ? event.interval : null,
      };

      const previous = motionFilterRef.current;
      const filtered: MotionSnapshot = {
        x: smoothValue(previous?.x ?? null, nextRaw.x, MOTION_ALPHA),
        y: smoothValue(previous?.y ?? null, nextRaw.y, MOTION_ALPHA),
        z: smoothValue(previous?.z ?? null, nextRaw.z, MOTION_ALPHA),
        interval: smoothValue(previous?.interval ?? null, nextRaw.interval, MOTION_ALPHA),
      };

      motionFilterRef.current = filtered;

      const now = performance.now();
      if (now - motionCommitRef.current < MOTION_COMMIT_INTERVAL) {
        return;
      }

      motionCommitRef.current = now;

      const rounded: MotionSnapshot = {
        x: roundNumber(filtered.x),
        y: roundNumber(filtered.y),
        z: roundNumber(filtered.z),
        interval: roundNumber(filtered.interval),
      };

      setMotion((previousMotion) => {
        if (!previousMotion) {
          return rounded;
        }

        const hasMeaningfulChange =
          Math.abs((rounded.x ?? 0) - (previousMotion.x ?? 0)) > 0.05 ||
          Math.abs((rounded.y ?? 0) - (previousMotion.y ?? 0)) > 0.05 ||
          Math.abs((rounded.z ?? 0) - (previousMotion.z ?? 0)) > 0.05 ||
          Math.abs((rounded.interval ?? 0) - (previousMotion.interval ?? 0)) > 0.8;

        return hasMeaningfulChange ? rounded : previousMotion;
      });
    };

    window.addEventListener("devicemotion", onMotion, true);

    return () => {
      window.removeEventListener("devicemotion", onMotion, true);
    };
  }, [canReadSensors, permissions.motion]);

  useEffect(() => {
    if (
      !canReadSensors ||
      permissions.location !== "granted" ||
      typeof navigator === "undefined" ||
      !navigator.geolocation
    ) {
      if (!Capacitor.isNativePlatform()) {
        return;
      }
    }

    locationCommitRef.current = 0;
    const commitLocationSnapshot = (next: LocationSnapshot) => {
      const now = Date.now();
      const previous = locationFilterRef.current;

      if (previous) {
        const movedDistance = distanceInMeters(previous, next);
        const minAcceptedMove = Math.max(1.5, Math.min(10, next.accuracy * 0.25));

        if (movedDistance < minAcceptedMove && now - locationCommitRef.current < 3500) {
          return;
        }

        if (now - locationCommitRef.current < LOCATION_COMMIT_INTERVAL) {
          return;
        }
      }

      locationFilterRef.current = next;
      locationCommitRef.current = now;
      setLocation(next);
    };

    if (Capacitor.isNativePlatform()) {
      let active = true;
      let watchId: CallbackID | null = null;

      const onPosition = (position: CapacitorPosition | null, err?: unknown) => {
        if (!active) {
          return;
        }

        if (err) {
          appendLog("Không thể cập nhật vị trí native thời gian thực.");
          return;
        }

        if (!position) {
          return;
        }

        commitLocationSnapshot({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      };

      void (async () => {
        try {
          watchId = await Geolocation.watchPosition(
            {
              enableHighAccuracy: true,
              timeout: 20000,
              maximumAge: 3000,
              minimumUpdateInterval: 1300,
              interval: 1400,
            },
            onPosition,
          );

          geoWatchIdRef.current = watchId;

          if (!active && watchId) {
            await Geolocation.clearWatch({ id: watchId });
          }
        } catch (error) {
          appendLog(
            error instanceof Error
              ? error.message
              : "Không thể bật theo dõi vị trí native.",
          );
        }
      })();

      return () => {
        active = false;

        if (watchId) {
          void Geolocation.clearWatch({ id: watchId });
        }

        if (geoWatchIdRef.current === watchId) {
          geoWatchIdRef.current = null;
        }
      };
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        commitLocationSnapshot({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionState("location", "denied");
        }

        appendLog(error.message || "Không thể cập nhật vị trí thời gian thực.");
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 3000,
      },
    );

    geoWatchIdRef.current = watchId;

    return () => {
      navigator.geolocation.clearWatch(watchId);

      if (geoWatchIdRef.current === watchId) {
        geoWatchIdRef.current = null;
      }
    };
  }, [appendLog, canReadSensors, permissions.location, setPermissionState]);

  useEffect(() => {
    return () => {
      if (geoWatchIdRef.current !== null) {
        if (typeof geoWatchIdRef.current === "string") {
          void Geolocation.clearWatch({ id: geoWatchIdRef.current });
        } else if (typeof navigator !== "undefined" && navigator.geolocation) {
          navigator.geolocation.clearWatch(geoWatchIdRef.current);
        }
      }

      bluetoothCleanupRef.current?.();
    };
  }, []);

  return {
    hydrated,
    deviceInfo,
    secureContext,
    currentOrigin,
    permissions,
    location,
    motion,
    bluetooth,
    logs,
    lastActionMessage,
    isMobileSupported,
    accessBlocked,
    accessMessage,
    securityLocked,
    requestCompass,
    requestMotion,
    requestLocation,
    requestBluetooth,
    requestCorePermissions,
  };
}
