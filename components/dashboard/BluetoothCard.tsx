import type { BluetoothSnapshot } from "@/hooks/useSensorHub";
import styles from "@/app/page.module.css";

interface BluetoothCardProps {
  bluetooth: BluetoothSnapshot;
}

export default function BluetoothCard({ bluetooth }: BluetoothCardProps) {
  return (
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
  );
}
