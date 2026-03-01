"use client";

import { useMemo } from "react";
import { useSensorHub } from "@/hooks/useSensorHub";
import { type SensorPermissionState } from "@/utils/permissions";
import styles from "./page.module.css";

const PERMISSION_LABELS: Record<SensorPermissionState, string> = {
  granted: "Granted",
  denied: "Denied",
  prompt: "Prompt",
  unsupported: "Unsupported",
  error: "Error",
};

const DIRECTION_LABELS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function toCardinalDirection(heading: number | null): string {
  if (heading === null) {
    return "Unknown";
  }

  const normalizedHeading = ((heading % 360) + 360) % 360;
  const index = Math.round(normalizedHeading / 45) % 8;

  return DIRECTION_LABELS[index];
}

function statusClassName(
  permission: SensorPermissionState,
  styleMap: Record<string, string>,
): string {
  const mapping: Record<SensorPermissionState, string> = {
    granted: styleMap.statusGranted,
    denied: styleMap.statusDenied,
    prompt: styleMap.statusPrompt,
    unsupported: styleMap.statusUnsupported,
    error: styleMap.statusError,
  };

  return mapping[permission];
}

function formatFixed(value: number | null, fractionDigits = 2): string {
  if (value === null) {
    return "--";
  }

  return value.toFixed(fractionDigits);
}

export default function Home() {
  const {
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
    requestCorePermissions,
    requestCompass,
    requestMotion,
    requestLocation,
    requestBluetooth,
  } = useSensorHub();

  const compassRotation = useMemo(() => (heading === null ? 0 : -heading), [heading]);

  const ticks = useMemo(
    () =>
      Array.from({ length: 36 }, (_, index) => ({
        id: index,
        degree: index * 10,
        major: index % 3 === 0,
      })),
    [],
  );

  return (
    <div className={styles.page}>
      <div className={styles.noiseLayer} />
      <main className={styles.main}>
        <header className={styles.header}>
          <p className={styles.kicker}>TestLoc Sensor Hub</p>
          <h1>PWA La Ban Realtime</h1>
          <p className={styles.description}>
            Xin quyen cam bien, theo doi huong la ban, vi tri, DeviceMotion va BLE RSSI theo
            thoi gian thuc tren PC, laptop va mobile.
          </p>
          {secureContext === false && (
            <p className={styles.warning}>
              Dang o insecure context: <span className={styles.mono}>{currentOrigin}</span>. Hay
              mo bang HTTPS de xin quyen la ban/vi tri/motion/bluetooth tren dien thoai.
            </p>
          )}
        </header>

        <section className={styles.compassSection}>
          <div className={styles.compassBody}>
            <div className={styles.forwardMarker} aria-hidden="true" />

            <div
              className={styles.roseLayer}
              style={{ transform: `rotate(${compassRotation}deg)` }}
              aria-label="Compass rose"
            >
              {ticks.map((tick) => (
                <span
                  key={tick.id}
                  className={`${styles.tick} ${tick.major ? styles.tickMajor : ""}`}
                  style={{ transform: `translate(-50%, -100%) rotate(${tick.degree}deg)` }}
                />
              ))}

              <span className={`${styles.cardinal} ${styles.north}`}>N</span>
              <span className={`${styles.cardinal} ${styles.east}`}>E</span>
              <span className={`${styles.cardinal} ${styles.south}`}>S</span>
              <span className={`${styles.cardinal} ${styles.west}`}>W</span>
            </div>

            <div className={styles.centerPoint} />
          </div>

          <div className={styles.headingReadout}>
            <strong>{heading === null ? "--.-°" : `${heading.toFixed(1)}°`}</strong>
            <span>{toCardinalDirection(heading)}</span>
          </div>
        </section>

        <section className={styles.controlPanel}>
          <button className={styles.primaryButton} onClick={() => void requestCorePermissions()}>
            Xin nhanh (Compass + Motion + Location)
          </button>
          <button className={styles.secondaryButton} onClick={() => void requestCompass()}>
            Xin quyen la ban
          </button>
          <button className={styles.secondaryButton} onClick={() => void requestMotion()}>
            Xin quyen DeviceMotion
          </button>
          <button className={styles.secondaryButton} onClick={() => void requestLocation()}>
            Xin quyen vi tri
          </button>
          <button className={styles.secondaryButton} onClick={() => void requestBluetooth()}>
            Ket noi BLE + RSSI
          </button>
        </section>
        <p className={styles.liveMessage}>{lastActionMessage}</p>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2>Thiet bi</h2>
            <div className={styles.itemRow}>
              <span>Loai:</span>
              <strong>{deviceInfo.type}</strong>
            </div>
            <div className={styles.itemRow}>
              <span>He dieu hanh:</span>
              <strong>{deviceInfo.os}</strong>
            </div>
            <div className={styles.itemRow}>
              <span>Trinh duyet:</span>
              <strong>{deviceInfo.browser}</strong>
            </div>
            <div className={styles.itemRow}>
              <span>Cam ung:</span>
              <strong>{deviceInfo.touch ? "Co" : "Khong"}</strong>
            </div>
          </article>

          <article className={styles.card}>
            <h2>Trang thai quyen</h2>
            <div className={styles.permissionRow}>
              <span>Compass</span>
              <span className={statusClassName(permissions.compass, styles)}>
                {PERMISSION_LABELS[permissions.compass]}
              </span>
            </div>
            <div className={styles.permissionRow}>
              <span>Location</span>
              <span className={statusClassName(permissions.location, styles)}>
                {PERMISSION_LABELS[permissions.location]}
              </span>
            </div>
            <div className={styles.permissionRow}>
              <span>DeviceMotion</span>
              <span className={statusClassName(permissions.motion, styles)}>
                {PERMISSION_LABELS[permissions.motion]}
              </span>
            </div>
            <div className={styles.permissionRow}>
              <span>Web Bluetooth</span>
              <span className={statusClassName(permissions.bluetooth, styles)}>
                {PERMISSION_LABELS[permissions.bluetooth]}
              </span>
            </div>
          </article>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2>Vi tri (Realtime)</h2>
            <div className={styles.itemRow}>
              <span>Latitude:</span>
              <strong className={styles.mono}>{formatFixed(location?.latitude ?? null, 6)}</strong>
            </div>
            <div className={styles.itemRow}>
              <span>Longitude:</span>
              <strong className={styles.mono}>{formatFixed(location?.longitude ?? null, 6)}</strong>
            </div>
            <div className={styles.itemRow}>
              <span>Accuracy:</span>
              <strong>{formatFixed(location?.accuracy ?? null, 1)} m</strong>
            </div>
          </article>

          <article className={styles.card}>
            <h2>DeviceMotion (Realtime)</h2>
            <div className={styles.itemRow}>
              <span>X:</span>
              <strong className={styles.mono}>{formatFixed(motion?.x ?? null)}</strong>
            </div>
            <div className={styles.itemRow}>
              <span>Y:</span>
              <strong className={styles.mono}>{formatFixed(motion?.y ?? null)}</strong>
            </div>
            <div className={styles.itemRow}>
              <span>Z:</span>
              <strong className={styles.mono}>{formatFixed(motion?.z ?? null)}</strong>
            </div>
            <div className={styles.itemRow}>
              <span>Interval:</span>
              <strong>{formatFixed(motion?.interval ?? null)} ms</strong>
            </div>
          </article>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2>Bluetooth RSSI</h2>
            <div className={styles.itemRow}>
              <span>Device:</span>
              <strong className={styles.mono}>
                {bluetooth.deviceName || bluetooth.deviceId || "--"}
              </strong>
            </div>
            <div className={styles.itemRow}>
              <span>RSSI:</span>
              <strong>{bluetooth.rssi === null ? "--" : `${bluetooth.rssi} dBm`}</strong>
            </div>
            <div className={styles.itemRow}>
              <span>Tx Power:</span>
              <strong>{bluetooth.txPower === null ? "--" : `${bluetooth.txPower} dBm`}</strong>
            </div>
            <div className={styles.itemRow}>
              <span>Status:</span>
              <strong>{bluetooth.watching ? "Dang theo doi" : "Chua theo doi"}</strong>
            </div>
            <p className={styles.note}>{bluetooth.note}</p>
          </article>

          <article className={styles.card}>
            <h2>Su kien gan nhat</h2>
            {logs.length === 0 ? (
              <p className={styles.note}>Chua co su kien.</p>
            ) : (
              <ul className={styles.logList}>
                {logs.map((line) => (
                  <li key={line} className={styles.mono}>
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}
