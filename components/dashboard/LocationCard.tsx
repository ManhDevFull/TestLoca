import type { LocationSnapshot } from "@/hooks/useSensorHub";
import styles from "@/app/page.module.css";

function formatFixed(value: number | null, fractionDigits = 2): string {
  if (value === null) {
    return "--";
  }

  return value.toFixed(fractionDigits);
}

interface LocationCardProps {
  location: LocationSnapshot | null;
}

export default function LocationCard({ location }: LocationCardProps) {
  return (
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
  );
}
