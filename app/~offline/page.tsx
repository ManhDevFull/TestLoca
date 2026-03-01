export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
      }}
    >
      <section
        style={{
          width: "min(560px, 100%)",
          borderRadius: "18px",
          border: "1px solid rgba(148,163,184,0.3)",
          background: "rgba(15,23,42,0.72)",
          padding: "20px",
        }}
      >
        <h1 style={{ marginBottom: "8px" }}>Bạn đang offline</h1>
        <p style={{ lineHeight: 1.5, color: "#cbd5e1" }}>
          Vui lòng kiểm tra kết nối mạng để tiếp tục theo dõi dữ liệu thời gian thực.
        </p>
      </section>
    </main>
  );
}
