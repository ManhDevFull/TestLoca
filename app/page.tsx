"use client";

import CompassPanel from "@/components/compass/CompassPanel";
import BluetoothCard from "@/components/dashboard/BluetoothCard";
import DeviceInfoCard from "@/components/dashboard/DeviceInfoCard";
import LocationCard from "@/components/dashboard/LocationCard";
import LogCard from "@/components/dashboard/LogCard";
import MotionCard from "@/components/dashboard/MotionCard";
import PermissionControls from "@/components/dashboard/PermissionControls";
import PermissionStatusCard from "@/components/dashboard/PermissionStatusCard";
import { useSensorHub } from "@/hooks/useSensorHub";
import { type DeviceType, type OperatingSystem } from "@/utils/device";
import styles from "./page.module.css";

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

export default function Home() {
  const {
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
    requestCorePermissions,
    requestCompass,
    requestMotion,
    requestLocation,
    requestBluetooth,
  } = useSensorHub();

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
              <p className={styles.note}>
                - Toàn bộ thao tác phần cứng sẽ bị vô hiệu hóa trên desktop/laptop.
              </p>
              <p className={styles.note}>
                - Truy cập hiện tại: {currentOrigin || "Không xác định"}
              </p>
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

        <CompassPanel
          canReadSensors={!accessBlocked}
          permissionState={permissions.compass}
        />

        <PermissionControls
          disabled={accessBlocked}
          onRequestCorePermissions={() => void requestCorePermissions()}
          onRequestCompass={() => void requestCompass()}
          onRequestMotion={() => void requestMotion()}
          onRequestLocation={() => void requestLocation()}
          onRequestBluetooth={() => void requestBluetooth()}
        />

        <p className={styles.liveMessage} aria-live="polite">
          {lastActionMessage}
        </p>

        <section className={styles.grid}>
          <DeviceInfoCard deviceInfo={deviceInfo} securityLocked={securityLocked} />
          <PermissionStatusCard permissions={permissions} />
        </section>

        <section className={styles.grid}>
          <LocationCard location={location} />
          <MotionCard motion={motion} />
        </section>

        <section className={styles.grid}>
          <BluetoothCard bluetooth={bluetooth} />
          <LogCard logs={logs} />
        </section>
      </main>
    </div>
  );
}
