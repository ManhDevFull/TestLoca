"use client";

import { useMemo } from "react";
import { useSensorHub } from "@/hooks/useSensorHub";
import { type DeviceType, type OperatingSystem } from "@/utils/device";
import { type SensorPermissionState } from "@/utils/permissions";
import styles from "./page.module.css";

const PERMISSION_LABELS: Record<SensorPermissionState, string> = {
  granted: "Đã cấp",
  denied: "Từ chối",
  prompt: "Chờ cấp",
  unsupported: "Không hỗ trợ",
  error: "Lỗi",
};

const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  mobile: "Điện thoại",
  tablet: "Máy tính bảng",
  desktop: "Máy tính",
  unknown: "Không xác định",
};

const OS_LABELS: Record<OperatingSystem, string> = {
  ios: "iOS",
  android: "Android",
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
  chromeos: "ChromeOS",
  unknown: "Không xác định",
};

const DIRECTION_LABELS = [
  "Bắc",
  "Đông Bắc",
  "Đông",
  "Đông Nam",
  "Nam",
  "Tây Nam",
  "Tây",
  "Tây Bắc",
];

function toCardinalDirection(heading: number | null): string {
  if (heading === null) {
    return "Không xác định";
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
    hydrated,
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
    isMobileSupported,
    accessBlocked,
    accessMessage,
    securityLocked,
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

  if (!hydrated) {
    return (
      <div className={styles.page}>
        <div className={styles.noiseLayer} />
        <main className={styles.loadingScreen}>
          <h1>Đang khởi tạo TestLoc Compass...</h1>
          <p>Đang nhận diện thiết bị và đồng bộ trạng thái bảo mật.</p>
        </main>
      </div>
    );
  }

  if (!isMobileSupported) {
    return (
      <div className={styles.page}>
        <div className={styles.noiseLayer} />
        <main className={styles.blockedCard}>
          <p className={styles.kicker}>Truy cập bị giới hạn</p>
          <h1 className={styles.blockedTitle}>Chức năng không khả dụng trên thiết bị này</h1>
          <p className={styles.blockedText}>
            Ứng dụng chỉ cho phép điện thoại di động truy cập và thao tác cảm biến phần cứng.
            Máy tính/laptop chỉ được xem thông báo chặn để tránh sai mục đích sử dụng.
          </p>

          <div className={styles.grid}>
            <article className={styles.card}>
              <h2>Thông tin thiết bị</h2>
              <div className={styles.itemRow}>
                <span>Loại thiết bị:</span>
                <strong>{DEVICE_TYPE_LABELS[deviceInfo.type]}</strong>
              </div>
              <div className={styles.itemRow}>
                <span>Hệ điều hành:</span>
                <strong>{OS_LABELS[deviceInfo.os]}</strong>
              </div>
              <div className={styles.itemRow}>
                <span>Trình duyệt:</span>
                <strong>{deviceInfo.browser}</strong>
              </div>
              <div className={styles.itemRow}>
                <span>Màn hình cảm ứng:</span>
                <strong>{deviceInfo.touch ? "Có" : "Không"}</strong>
              </div>
            </article>

            <article className={styles.card}>
              <h2>Chính sách truy cập</h2>
              <p className={styles.note}>
                - Chỉ cho phép điện thoại truy cập tính năng la bàn, vị trí, cảm biến chuyển động,
                Bluetooth.
              </p>
              <p className={styles.note}>- Toàn bộ thao tác phần cứng sẽ bị vô hiệu hóa trên desktop/laptop.</p>
              <p className={styles.note}>- Truy cập hiện tại: {currentOrigin || "Không xác định"}</p>
            </article>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.noiseLayer} />
      <main className={styles.main}>
        <header className={styles.header}>
          <p className={styles.kicker}>TestLoc Sensor Hub</p>
          <h1>PWA La Bàn Thời Gian Thực</h1>
          <p className={styles.description}>
            Theo dõi hướng la bàn, vị trí, DeviceMotion và BLE RSSI theo thời gian thực với bộ lọc
            ổn định dữ liệu để trải nghiệm mượt như ứng dụng thật.
          </p>
          <p className={styles.policyText}>
            Chính sách bảo mật: chỉ cho phép điện thoại truy cập cảm biến phần cứng.
          </p>

          {secureContext === false && (
            <p className={styles.warning}>
              Bạn đang ở kết nối không bảo mật: <span className={styles.mono}>{currentOrigin}</span>.
              Hãy dùng HTTPS để xin quyền cảm biến trên điện thoại.
            </p>
          )}

          {accessBlocked && (
            <p className={styles.securityLock}>
              {accessMessage || "Ứng dụng đang khóa tính năng phần cứng."}
            </p>
          )}
        </header>

        <section className={styles.compassSection}>
          <div className={styles.compassBody}>
            <div className={styles.forwardMarker} aria-hidden="true" />

            <div
              className={styles.roseLayer}
              style={{ transform: `rotate(${compassRotation}deg)` }}
              aria-label="La bàn"
            >
              {ticks.map((tick) => (
                <span
                  key={tick.id}
                  className={`${styles.tick} ${tick.major ? styles.tickMajor : ""}`}
                  style={{ transform: `translate(-50%, -100%) rotate(${tick.degree}deg)` }}
                />
              ))}

              <span className={`${styles.cardinal} ${styles.north}`}>B</span>
              <span className={`${styles.cardinal} ${styles.east}`}>Đ</span>
              <span className={`${styles.cardinal} ${styles.south}`}>N</span>
              <span className={`${styles.cardinal} ${styles.west}`}>T</span>
            </div>

            <div className={styles.centerPoint} />
          </div>

          <div className={styles.headingReadout}>
            <strong>{heading === null ? "--.-°" : `${heading.toFixed(1)}°`}</strong>
            <span>{toCardinalDirection(heading)}</span>
          </div>
        </section>

        <section className={styles.controlPanel}>
          <button
            className={styles.primaryButton}
            disabled={accessBlocked}
            onClick={() => void requestCorePermissions()}
          >
            Xin nhanh (La bàn + Motion + Vị trí)
          </button>
          <button
            className={styles.secondaryButton}
            disabled={accessBlocked}
            onClick={() => void requestCompass()}
          >
            Xin quyền la bàn
          </button>
          <button
            className={styles.secondaryButton}
            disabled={accessBlocked}
            onClick={() => void requestMotion()}
          >
            Xin quyền DeviceMotion
          </button>
          <button
            className={styles.secondaryButton}
            disabled={accessBlocked}
            onClick={() => void requestLocation()}
          >
            Xin quyền vị trí
          </button>
          <button
            className={styles.secondaryButton}
            disabled={accessBlocked}
            onClick={() => void requestBluetooth()}
          >
            Kết nối BLE + RSSI
          </button>
        </section>

        <p className={styles.liveMessage} aria-live="polite">
          {lastActionMessage}
        </p>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2>Thiết bị hiện tại</h2>
            <div className={styles.itemRow}>
              <span>Loại:</span>
              <strong>{DEVICE_TYPE_LABELS[deviceInfo.type]}</strong>
            </div>
            <div className={styles.itemRow}>
              <span>Hệ điều hành:</span>
              <strong>{OS_LABELS[deviceInfo.os]}</strong>
            </div>
            <div className={styles.itemRow}>
              <span>Trình duyệt:</span>
              <strong>{deviceInfo.browser}</strong>
            </div>
            <div className={styles.itemRow}>
              <span>Cảm ứng:</span>
              <strong>{deviceInfo.touch ? "Có" : "Không"}</strong>
            </div>
            <div className={styles.itemRow}>
              <span>Khóa bảo mật:</span>
              <strong>{securityLocked ? "Đang khóa" : "Bình thường"}</strong>
            </div>
          </article>

          <article className={styles.card}>
            <h2>Trạng thái quyền</h2>
            <div className={styles.permissionRow}>
              <span>La bàn</span>
              <span className={statusClassName(permissions.compass, styles)}>
                {PERMISSION_LABELS[permissions.compass]}
              </span>
            </div>
            <div className={styles.permissionRow}>
              <span>Vị trí</span>
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
            <h2>Vị trí (đã lọc ổn định)</h2>
            <div className={styles.itemRow}>
              <span>Vĩ độ:</span>
              <strong className={styles.mono}>{formatFixed(location?.latitude ?? null, 6)}</strong>
            </div>
            <div className={styles.itemRow}>
              <span>Kinh độ:</span>
              <strong className={styles.mono}>{formatFixed(location?.longitude ?? null, 6)}</strong>
            </div>
            <div className={styles.itemRow}>
              <span>Sai số:</span>
              <strong>{formatFixed(location?.accuracy ?? null, 1)} m</strong>
            </div>
          </article>

          <article className={styles.card}>
            <h2>DeviceMotion (đã lọc nhiễu)</h2>
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
              <span>Chu kỳ:</span>
              <strong>{formatFixed(motion?.interval ?? null)} ms</strong>
            </div>
          </article>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2>Bluetooth RSSI</h2>
            <div className={styles.itemRow}>
              <span>Thiết bị:</span>
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
              <span>Trạng thái:</span>
              <strong>{bluetooth.watching ? "Đang theo dõi" : "Chưa theo dõi"}</strong>
            </div>
            <p className={styles.note}>{bluetooth.note}</p>
          </article>

          <article className={styles.card}>
            <h2>Nhật ký gần nhất</h2>
            {logs.length === 0 ? (
              <p className={styles.note}>Chưa có sự kiện.</p>
            ) : (
              <ul className={styles.logList}>
                {logs.map((line, index) => (
                  <li key={`${line}-${index}`} className={styles.mono}>
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
