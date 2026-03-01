import type { SensorPermissions } from "@/hooks/useSensorHub";
import type { SensorPermissionState } from "@/utils/permissions";
import styles from "@/app/page.module.css";

const PERMISSION_LABELS: Record<SensorPermissionState, string> = {
  granted: "Đã cấp",
  denied: "Từ chối",
  prompt: "Chờ cấp",
  unsupported: "Không hỗ trợ",
  error: "Lỗi",
};

function statusClassName(permission: SensorPermissionState): string {
  const mapping: Record<SensorPermissionState, string> = {
    granted: styles.statusGranted,
    denied: styles.statusDenied,
    prompt: styles.statusPrompt,
    unsupported: styles.statusUnsupported,
    error: styles.statusError,
  };

  return mapping[permission];
}

interface PermissionStatusCardProps {
  permissions: SensorPermissions;
}

export default function PermissionStatusCard({
  permissions,
}: PermissionStatusCardProps) {
  return (
    <article className={styles.card}>
      <h2>Trạng thái quyền</h2>
      <div className={styles.permissionRow}>
        <span>La bàn</span>
        <span className={statusClassName(permissions.compass)}>
          {PERMISSION_LABELS[permissions.compass]}
        </span>
      </div>
      <div className={styles.permissionRow}>
        <span>Vị trí</span>
        <span className={statusClassName(permissions.location)}>
          {PERMISSION_LABELS[permissions.location]}
        </span>
      </div>
      <div className={styles.permissionRow}>
        <span>DeviceMotion</span>
        <span className={statusClassName(permissions.motion)}>
          {PERMISSION_LABELS[permissions.motion]}
        </span>
      </div>
      <div className={styles.permissionRow}>
        <span>Web Bluetooth</span>
        <span className={statusClassName(permissions.bluetooth)}>
          {PERMISSION_LABELS[permissions.bluetooth]}
        </span>
      </div>
    </article>
  );
}
