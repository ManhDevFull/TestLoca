import type { DeviceInfo, DeviceType, OperatingSystem } from "@/utils/device";
import styles from "@/app/page.module.css";

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

interface DeviceInfoCardProps {
  deviceInfo: DeviceInfo;
  securityLocked: boolean;
}

export default function DeviceInfoCard({
  deviceInfo,
  securityLocked,
}: DeviceInfoCardProps) {
  return (
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
  );
}
