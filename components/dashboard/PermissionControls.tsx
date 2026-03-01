import styles from "@/app/page.module.css";

interface PermissionControlsProps {
  disabled: boolean;
  onRequestCorePermissions: () => void;
  onRequestCompass: () => void;
  onRequestMotion: () => void;
  onRequestLocation: () => void;
  onRequestBluetooth: () => void;
}

export default function PermissionControls({
  disabled,
  onRequestCorePermissions,
  onRequestCompass,
  onRequestMotion,
  onRequestLocation,
  onRequestBluetooth,
}: PermissionControlsProps) {
  return (
    <section className={styles.controlPanel}>
      <button
        className={styles.primaryButton}
        disabled={disabled}
        onClick={onRequestCorePermissions}
      >
        Xin nhanh (La bàn + Motion + Vị trí)
      </button>
      <button
        className={styles.secondaryButton}
        disabled={disabled}
        onClick={onRequestCompass}
      >
        Xin quyền la bàn
      </button>
      <button
        className={styles.secondaryButton}
        disabled={disabled}
        onClick={onRequestMotion}
      >
        Xin quyền DeviceMotion
      </button>
      <button
        className={styles.secondaryButton}
        disabled={disabled}
        onClick={onRequestLocation}
      >
        Xin quyền vị trí
      </button>
      <button
        className={styles.secondaryButton}
        disabled={disabled}
        onClick={onRequestBluetooth}
      >
        Kết nối BLE + RSSI
      </button>
    </section>
  );
}
