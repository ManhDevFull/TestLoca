import styles from "@/app/page.module.css";

interface LogCardProps {
  logs: string[];
}

export default function LogCard({ logs }: LogCardProps) {
  return (
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
  );
}
