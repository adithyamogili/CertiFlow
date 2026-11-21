
import { useState } from "react";

const API = "http://localhost:4000/api";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type ApiResult = {
  message?: string;
  batchId?: string;
  id?: string;
  batch?: {
    id?: string;
  };
  [key: string]: any;
};

const demoUsers = [
  { name: "Anika", email: "anika@certiflow.demo", role: "Training Centre" },
  { name: "Dev", email: "dev@certiflow.demo", role: "District Officer" },
  { name: "Meera", email: "meera@certiflow.demo", role: "District Officer" },
  { name: "Kabir", email: "kabir@certiflow.demo", role: "District Officer" },
  { name: "Neha", email: "neha@certiflow.demo", role: "Quality Team" },
  { name: "Farah", email: "farah@certiflow.demo", role: "State Office" }
];

const demoPassword = "CertiFlow@123";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState("");

  const [email, setEmail] = useState("anika@certiflow.demo");
  const [password, setPassword] = useState(demoPassword);

  const [batchName, setBatchName] = useState("Hyderabad Demo Batch");
  const [csv, setCsv] = useState(
    "externalId,name,phone,email\nC101,Rahul,9876543210,rahul@example.com\nC102,Priya,9876543211,priya@example.com"
  );

  const [batchId, setBatchId] = useState("");
  const [uploadedBatchId, setUploadedBatchId] = useState("");
  const [certificateId, setCertificateId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);

  const role = user?.role;

  const isCentre = role === "TRAINING_CENTRE";
  const isDistrict = role === "DISTRICT_OFFICER";
  const isQuality = role === "QUALITY_TEAM";
  const isState = role === "STATE_OFFICE";

  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    publicRequest = false
  ): Promise<ApiResult> {
    const response = await fetch(`${API}${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(!publicRequest && token
          ? { Authorization: `Bearer ${token}` }
          : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError(false);
    setResult(null);

    try {
      const data = await request(
        "/auth/login",
        "POST",
        { email, password },
        true
      );

      if (!data.token || !data.user) {
        throw new Error("Invalid login response from server");
      }

      setToken(data.token);
      setUser(data.user);
      setMessage(`Welcome, ${data.user.name}!`);
    } catch (err) {
      setError(true);
      setMessage(
        err instanceof Error ? err.message : "Login failed"
      );
    } finally {
      setLoading(false);
    }
  }

  async function perform(
    path: string,
    method = "POST",
    body?: unknown,
    publicRequest = false
  ) {
    setLoading(true);
    setMessage("");
    setError(false);
    setResult(null);

    try {
      const data = await request(path, method, body, publicRequest);

      // Automatically capture the uploaded batch ID.
      if (path === "/batches/upload") {
        const newBatchId =
          data.batchId ||
          data.batch?.id ||
          data.id;

        if (newBatchId) {
          setBatchId(newBatchId);
          setUploadedBatchId(newBatchId);
        } else {
          setUploadedBatchId("");
        }
      }

      setResult(data);
      setMessage(data.message || "Operation completed successfully");
    } catch (err) {
      setError(true);
      setMessage(
        err instanceof Error ? err.message : "Operation failed"
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyBatchId() {
    if (!uploadedBatchId) return;

    try {
      await navigator.clipboard.writeText(uploadedBatchId);
      setMessage("Batch ID copied successfully!");
      setError(false);
    } catch {
      setMessage("Unable to copy automatically. Please select the Batch ID.");
      setError(true);
    }
  }

  function logout() {
    setUser(null);
    setToken("");
    setResult(null);
    setMessage("You have been logged out.");
    setError(false);
  }

  const cardStyle: React.CSSProperties = {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 24,
    marginBottom: 20,
    boxShadow: "0 3px 12px rgba(15, 23, 42, 0.04)"
  };

  const buttonStyle: React.CSSProperties = {
    background: "#2457d6",
    color: "#ffffff",
    border: 0,
    padding: "12px 18px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    marginTop: 10
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: 12,
    border: "1px solid #d1d5db",
    borderRadius: 8,
    marginTop: 7,
    marginBottom: 15,
    boxSizing: "border-box",
    fontSize: 14
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: "#374151"
  };

  function batchInput(label = "Batch ID") {
    return (
      <>
        <label style={labelStyle}>{label}</label>
        <input
          style={inputStyle}
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
          placeholder="Enter batch ID"
        />
      </>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f6fb",
        fontFamily: "Inter, Arial, sans-serif",
        color: "#172033"
      }}
    >
      <header
        style={{
          background: "#101d3a",
          color: "white",
          padding: "18px 6%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 2,
              color: "#9fb7ef"
            }}
          >
            PRAGATI SKILLS MISSION
          </div>
          <h1 style={{ margin: "5px 0", fontSize: 26 }}>
            CertiFlow
          </h1>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>
            Certificate Issuance and Verification Platform
          </div>
        </div>

        {user && (
          <button
            onClick={logout}
            style={{
              ...buttonStyle,
              background: "#ffffff",
              color: "#101d3a",
              margin: 0
            }}
          >
            Logout
          </button>
        )}
      </header>

      <div
        style={{
          maxWidth: 1050,
          margin: "35px auto",
          padding: "0 20px"
        }}
      >
        {!user ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 22
            }}
          >
            <section style={{ ...cardStyle, padding: 32 }}>
              <p style={{ color: "#2457d6", fontWeight: 700 }}>
                CERTIFICATE MANAGEMENT
              </p>

              <h2 style={{ fontSize: 29, marginBottom: 10 }}>
                Welcome to CertiFlow
              </h2>

              <p style={{ color: "#64748b", lineHeight: 1.7 }}>
                A secure platform for candidate batch submission,
                multi-level approvals and certificate verification.
              </p>

              <form onSubmit={login}>
                <label style={labelStyle}>Email address</label>
                <input
                  style={inputStyle}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <label style={labelStyle}>Password</label>
                <input
                  style={inputStyle}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  disabled={loading}
                  style={{
                    ...buttonStyle,
                    width: "100%",
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>
            </section>

            <section style={cardStyle}>
              <h3>Demo accounts</h3>

              <p style={{ color: "#64748b", fontSize: 13 }}>
                Select an account to fill in the login details.
              </p>

              {demoUsers.map((item) => (
                <button
                  key={item.email}
                  onClick={() => {
                    setEmail(item.email);
                    setPassword(demoPassword);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: 13,
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    background: "#fff",
                    marginBottom: 9,
                    cursor: "pointer"
                  }}
                >
                  <strong>{item.name}</strong>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {item.role} · {item.email}
                  </div>
                </button>
              ))}
            </section>
          </div>
        ) : (
          <>
            <section
              style={{
                ...cardStyle,
                background: "#101d3a",
                color: "white"
              }}
            >
              <p style={{ color: "#9fb7ef", margin: 0 }}>
                YOUR WORKSPACE
              </p>

              <h2 style={{ marginBottom: 5 }}>
                Welcome, {user.name}
              </h2>

              <span style={{ color: "#cbd5e1" }}>
                {user.role.replace(/_/g, " ")}
              </span>
            </section>

            {isCentre && (
              <section style={cardStyle}>
                <h3>1. Upload candidate batch</h3>

                <label style={labelStyle}>Batch name</label>
                <input
                  style={inputStyle}
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                />

                <label style={labelStyle}>Candidate CSV</label>
                <textarea
                  style={{
                    ...inputStyle,
                    minHeight: 150,
                    fontFamily: "monospace"
                  }}
                  value={csv}
                  onChange={(e) => setCsv(e.target.value)}
                />

                <button
                  style={buttonStyle}
                  disabled={loading}
                  onClick={() =>
                    perform("/batches/upload", "POST", {
                      name: batchName,
                      csv
                    })
                  }
                >
                  {loading ? "Uploading..." : "Upload batch"}
                </button>

                {uploadedBatchId && (
                  <div
                    style={{
                      background: "#f0fdf4",
                      border: "1px solid #86efac",
                      padding: 16,
                      borderRadius: 9,
                      marginTop: 18
                    }}
                  >
                    <strong style={{ color: "#166534" }}>
                      Batch uploaded successfully!
                    </strong>

                    <p style={{ fontSize: 13 }}>
                      Your Batch ID:
                    </p>

                    <code
                      style={{
                        display: "block",
                        overflowWrap: "anywhere",
                        padding: 12,
                        background: "#ffffff",
                        borderRadius: 6,
                        border: "1px solid #dcfce7"
                      }}
                    >
                      {uploadedBatchId}
                    </code>

                    <button
                      style={{
                        ...buttonStyle,
                        background: "#15803d"
                      }}
                      onClick={copyBatchId}
                    >
                      Copy Batch ID
                    </button>
                  </div>
                )}

                <hr
                  style={{
                    border: 0,
                    borderTop: "1px solid #e5e7eb",
                    margin: "28px 0"
                  }}
                />

                <h3>2. Submit batch for approval</h3>

                {batchInput()}

                <button
                  style={buttonStyle}
                  disabled={loading || !batchId.trim()}
                  onClick={() =>
                    perform(`/approvals/${batchId.trim()}/submit`)
                  }
                >
                  Submit for approval
                </button>
              </section>
            )}

            {isDistrict && (
              <section style={cardStyle}>
                <h3>District approval</h3>

                <p style={{ color: "#64748b" }}>
                  Review batches submitted by training centres.
                  Two distinct district officers must approve each batch.
                </p>

                {batchInput()}

                <button
                  style={buttonStyle}
                  disabled={loading || !batchId.trim()}
                  onClick={() =>
                    perform(
                      `/approvals/${batchId.trim()}/district-approve`,
                      "POST",
                      { remarks: `Reviewed by ${user.name}` }
                    )
                  }
                >
                  Approve district batch
                </button>
              </section>
            )}

            {isQuality && (
              <section style={cardStyle}>
                <h3>Quality review</h3>

                <p style={{ color: "#64748b" }}>
                  Review eligible large candidate batches.
                </p>

                {batchInput()}

                <button
                  style={buttonStyle}
                  disabled={loading || !batchId.trim()}
                  onClick={() =>
                    perform(
                      `/approvals/${batchId.trim()}/quality-approve`
                    )
                  }
                >
                  Approve quality review
                </button>
              </section>
            )}

            {isState && (
              <>
                <section style={cardStyle}>
                  <h3>Final state approval</h3>

                  {batchInput()}

                  <button
                    style={buttonStyle}
                    disabled={loading || !batchId.trim()}
                    onClick={() =>
                      perform(
                        `/approvals/${batchId.trim()}/state-approve`
                      )
                    }
                  >
                    Give final approval
                  </button>
                </section>

                <section style={cardStyle}>
                  <h3>Generate certificates</h3>

                  {batchInput("Approved Batch ID")}

                  <button
                    style={buttonStyle}
                    disabled={loading || !batchId.trim()}
                    onClick={() =>
                      perform(
                        `/certificates/batches/${batchId.trim()}/generate`
                      )
                    }
                  >
                    Generate certificates
                  </button>
                </section>

                <section style={cardStyle}>
                  <h3>Cancel certificate</h3>

                  <label style={labelStyle}>
                    Certificate database ID
                  </label>

                  <input
                    style={inputStyle}
                    value={certificateId}
                    onChange={(e) => setCertificateId(e.target.value)}
                    placeholder="Paste certificate ID"
                  />

                  <button
                    style={{
                      ...buttonStyle,
                      background: "#b42318"
                    }}
                    disabled={loading || !certificateId.trim()}
                    onClick={() =>
                      perform(
                        `/certificates/${certificateId.trim()}/cancel`
                      )
                    }
                  >
                    Cancel certificate
                  </button>
                </section>
              </>
            )}
          </>
        )}

        <section style={cardStyle}>
          <h3>Public certificate verification</h3>

          <p style={{ color: "#64748b", fontSize: 13 }}>
            Anyone can verify a certificate without signing in.
          </p>

          <label style={labelStyle}>Verification code</label>

          <input
            style={inputStyle}
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="Enter certificate verification code"
          />

          <button
            style={buttonStyle}
            disabled={loading || !verificationCode.trim()}
            onClick={() =>
              perform(
                `/certificates/verify/${encodeURIComponent(
                  verificationCode.trim()
                )}`,
                "GET",
                undefined,
                true
              )
            }
          >
            Verify certificate
          </button>
        </section>

        {message && (
          <section
            style={{
              ...cardStyle,
              borderLeft: `5px solid ${error ? "#dc2626" : "#16a34a"}`,
              background: error ? "#fff7f7" : "#f0fdf4"
            }}
          >
            <strong>
              {error ? "Something went wrong" : "Operation result"}
            </strong>

            <p style={{ marginBottom: 0 }}>{message}</p>

            {result && (
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  fontSize: 12,
                  marginTop: 15,
                  padding: 12,
                  borderRadius: 8,
                  background: "#ffffff",
                  border: "1px solid #e5e7eb"
                }}
              >
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </section>
        )}

        <footer
          style={{
            textAlign: "center",
            color: "#94a3b8",
            padding: 20,
            fontSize: 12
          }}
        >
          CertiFlow · Pragati Skills Mission · Secure Certificate Platform
        </footer>
      </div>
    </main>
  );
}

export default App;
