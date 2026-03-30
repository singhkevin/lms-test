import { useState } from "react";
import { useLocation } from "wouter";

export default function Setup() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "Kevin Singh",
    email: "kevin@viralinbound.com",
    password: "Nintendo@8593",
    setupToken: "Local-Host-999",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage("Account created! Redirecting to login…");
        setTimeout(() => setLocation("/staff/login"), 2000);
      } else {
        setStatus("error");
        setMessage(data.message || JSON.stringify(data));
      }
    } catch (err: unknown) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Request failed");
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <div style={{ width: 380, background: "#fff", borderRadius: 12, padding: 32, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700 }}>Initial Account Setup</h2>
        <p style={{ margin: "0 0 24px", color: "#64748b", fontSize: 14 }}>
          This page is only active when the setup token is configured.
        </p>

        <form onSubmit={handleSubmit}>
          {(["name", "email", "password", "setupToken"] as const).map((field) => (
            <div key={field} style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4, color: "#374151", textTransform: "capitalize" }}>
                {field === "setupToken" ? "Setup Token" : field.charAt(0).toUpperCase() + field.slice(1)}
              </label>
              <input
                type={field === "password" ? "password" : "text"}
                value={form[field]}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                required
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 14, boxSizing: "border-box", outline: "none" }}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={status === "loading" || status === "success"}
            style={{ width: "100%", padding: "11px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 7, fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 6 }}
          >
            {status === "loading" ? "Creating…" : "Create Owner Account"}
          </button>
        </form>

        {message && (
          <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 7, background: status === "success" ? "#d1fae5" : "#fee2e2", color: status === "success" ? "#065f46" : "#991b1b", fontSize: 14 }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
