import type { MotionSnapshot } from "@/hooks/useSensorHub";
import styles from "@/app/page.module.css";

function formatFixed(value: number | null, fractionDigits = 2): string {
  if (value === null) {
    return "--";
  }

  return value.toFixed(fractionDigits);
}

interface MotionCardProps {
  motion: MotionSnapshot | null;
}

export default function MotionCard({ motion }: MotionCardProps) {
  return (
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
  );
}
