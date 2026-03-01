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
        <h1 style={{ marginBottom: "8px" }}>Ban dang offline</h1>
        <p style={{ lineHeight: 1.5, color: "#cbd5e1" }}>
          Vui long kiem tra ket noi mang de tiep tuc theo doi du lieu realtime.
        </p>
      </section>
    </main>
  );
}
