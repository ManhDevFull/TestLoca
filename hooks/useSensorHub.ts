"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

interface SensorPermissions {
  compass: SensorPermissionState;
  location: SensorPermissionState;
  motion: SensorPermissionState;
  bluetooth: SensorPermissionState;
}

interface LocationSnapshot {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface MotionSnapshot {
  x: number | null;
  y: number | null;
  z: number | null;
  interval: number | null;
}

interface BluetoothSnapshot {
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
  note: "Chua ket noi BLE.",
};

const DEFAULT_DEVICE_INFO: DeviceInfo = {
  type: "unknown",
  os: "unknown",
  browser: "Unknown Browser",
  touch: false,
};

export function useSensorHub() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(DEFAULT_DEVICE_INFO);
  const [secureContext, setSecureContext] = useState<boolean | null>(null);
  const [currentOrigin, setCurrentOrigin] = useState<string>("");

  const [permissions, setPermissions] =
    useState<SensorPermissions>(DEFAULT_PERMISSIONS);
  const [heading, setHeading] = useState<number | null>(null);
  const [location, setLocation] = useState<LocationSnapshot | null>(null);
  const [motion, setMotion] = useState<MotionSnapshot | null>(null);
  const [bluetooth, setBluetooth] =
    useState<BluetoothSnapshot>(DEFAULT_BLUETOOTH);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastActionMessage, setLastActionMessage] = useState<string>(
    "Chua co su kien.",
  );

  const geoWatchIdRef = useRef<number | null>(null);
  const bluetoothCleanupRef = useRef<(() => void) | null>(null);

  const appendLog = useCallback((message: string) => {
    const stamp = new Date().toLocaleTimeString("vi-VN", {
      hour12: false,
    });

    setLastActionMessage(message);
    setLogs((previous) => [`${stamp} ${message}`, ...previous].slice(0, 8));
  }, []);

  const setPermissionState = useCallback(
    (key: keyof SensorPermissions, state: SensorPermissionState) => {
      setPermissions((previous) => ({ ...previous, [key]: state }));
    },
    [],
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
    const result = await requestCompassPermission();

    return processPermissionResult(
      "compass",
      result,
      "Da cap quyen la ban (DeviceOrientation).",
    );
  }, [processPermissionResult]);

  const requestMotion = useCallback(async () => {
    const result = await requestDeviceMotionPermission();

    return processPermissionResult(
      "motion",
      result,
      "Da cap quyen DeviceMotionEvent.",
    );
  }, [processPermissionResult]);

  const requestLocation = useCallback(async () => {
    const result = await requestGeolocationPermission();

    return processPermissionResult(
      "location",
      result,
      "Da cap quyen vi tri (Geolocation).",
    );
  }, [processPermissionResult]);

  const requestBluetooth = useCallback(async () => {
    const result = await requestBluetoothPermission();

    setPermissionState("bluetooth", result.state);

    if (result.state !== "granted" || !result.device) {
      setBluetooth((previous) => ({
        ...previous,
        watching: false,
        note: result.error ?? "Khong ket noi duoc Bluetooth.",
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
      deviceName: device.name ?? "Unknown BLE Device",
      deviceId: device.id,
      rssi: null,
      txPower: null,
      watching: false,
      note: "Dang cho advertisement packet de cap nhat RSSI.",
    });

    if (typeof advertisementDevice.watchAdvertisements !== "function") {
      setBluetooth((previous) => ({
        ...previous,
        note: "Trinh duyet nay khong ho tro watchAdvertisements()/RSSI realtime.",
      }));
      appendLog("Bluetooth ket noi thanh cong, nhung khong doc duoc RSSI realtime.");
      return result.state;
    }

    try {
      await advertisementDevice.watchAdvertisements();
      setBluetooth((previous) => ({
        ...previous,
        watching: true,
        note: "Dang nghe BLE advertisement (RSSI realtime).",
      }));
      appendLog(`Da ket noi BLE: ${device.name ?? device.id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Khong the bat watchAdvertisements.";

      setBluetooth((previous) => ({
        ...previous,
        watching: false,
        note: errorMessage,
      }));
      appendLog(errorMessage);
    }

    return result.state;
  }, [appendLog, setPermissionState]);

  const requestCorePermissions = useCallback(async () => {
    appendLog("Dang xin nhanh quyen cam bien...");
    await Promise.all([requestCompass(), requestMotion(), requestLocation()]);
  }, [appendLog, requestCompass, requestLocation, requestMotion]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const timerId = window.setTimeout(() => {
      setDeviceInfo(getDeviceInfo());
      setSecureContext(window.isSecureContext);
      setCurrentOrigin(window.location.origin);
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  useEffect(() => {
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
  }, [setPermissionState]);

  useEffect(() => {
    if (permissions.compass !== "granted" || typeof window === "undefined") {
      return;
    }

    const onOrientation = (event: DeviceOrientationEvent) => {
      const iosHeading = (
        event as DeviceOrientationEvent & { webkitCompassHeading?: number }
      ).webkitCompassHeading;

      let nextHeading: number | null = null;

      if (typeof iosHeading === "number" && !Number.isNaN(iosHeading)) {
        nextHeading = iosHeading;
      } else if (typeof event.alpha === "number" && !Number.isNaN(event.alpha)) {
        nextHeading = (360 - event.alpha + 360) % 360;
      }

      if (nextHeading !== null) {
        setHeading(Number(nextHeading.toFixed(1)));
      }
    };

    window.addEventListener("deviceorientation", onOrientation, true);
    window.addEventListener(
      "deviceorientationabsolute",
      onOrientation as EventListener,
      true,
    );

    return () => {
      window.removeEventListener("deviceorientation", onOrientation, true);
      window.removeEventListener(
        "deviceorientationabsolute",
        onOrientation as EventListener,
        true,
      );
    };
  }, [permissions.compass]);

  useEffect(() => {
    if (permissions.motion !== "granted" || typeof window === "undefined") {
      return;
    }

    const onMotion = (event: DeviceMotionEvent) => {
      const acceleration =
        event.accelerationIncludingGravity ?? event.acceleration ?? null;

      setMotion({
        x:
          typeof acceleration?.x === "number"
            ? Number(acceleration.x.toFixed(2))
            : null,
        y:
          typeof acceleration?.y === "number"
            ? Number(acceleration.y.toFixed(2))
            : null,
        z:
          typeof acceleration?.z === "number"
            ? Number(acceleration.z.toFixed(2))
            : null,
        interval:
          typeof event.interval === "number"
            ? Number(event.interval.toFixed(2))
            : null,
      });
    };

    window.addEventListener("devicemotion", onMotion, true);

    return () => {
      window.removeEventListener("devicemotion", onMotion, true);
    };
  }, [permissions.motion]);

  useEffect(() => {
    if (
      permissions.location !== "granted" ||
      typeof navigator === "undefined" ||
      !navigator.geolocation
    ) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionState("location", "denied");
        }

        appendLog(error.message || "Khong the cap nhat vi tri realtime.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 1000,
      },
    );

    geoWatchIdRef.current = watchId;

    return () => {
      navigator.geolocation.clearWatch(watchId);

      if (geoWatchIdRef.current === watchId) {
        geoWatchIdRef.current = null;
      }
    };
  }, [appendLog, permissions.location, setPermissionState]);

  useEffect(() => {
    return () => {
      if (
        geoWatchIdRef.current !== null &&
        typeof navigator !== "undefined" &&
        navigator.geolocation
      ) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
      }

      bluetoothCleanupRef.current?.();
    };
  }, []);

  return {
    deviceInfo,
    secureContext,
    currentOrigin,
    permissions,
    heading,
    location,
    motion,
    bluetooth,
    logs,
    lastActionMessage,
    requestCompass,
    requestMotion,
    requestLocation,
    requestBluetooth,
    requestCorePermissions,
  };
}
