import { pool } from "@workspace/db";
import dns from "dns";
import net from "net";
import { URL } from "url";

async function runDiagnostics() {
  console.log("==================================================");
  console.log("   DATABASE CONNECTION DIAGNOSTICS & TEST SCRIPT  ");
  console.log("==================================================\n");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ ERROR: DATABASE_URL environment variable is not defined!");
    console.log("Please define DATABASE_URL in your environment or .env file.");
    process.exit(1);
  }

  console.log("1. Parsing DATABASE_URL...");
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(dbUrl);
  } catch (err: any) {
    console.error("❌ ERROR: Failed to parse DATABASE_URL as a valid URL.");
    console.error(`Message: ${err.message}`);
    process.exit(1);
  }

  const host = parsedUrl.hostname;
  const port = parsedUrl.port || "5432";
  const user = parsedUrl.username;
  const password = parsedUrl.password;
  const database = parsedUrl.pathname.replace(/^\//, "");

  console.log(`   - Host: ${host}`);
  console.log(`   - Port: ${port}`);
  console.log(`   - User: ${user}`);
  console.log(`   - Database: ${database}`);
  console.log(`   - Password length: ${password.length} characters`);
  console.log(`   - Password starts with: ${password.slice(0, 3)}...`);
  console.log(`   - Password ends with: ...${password.slice(-3)}`);
  
  if (password.includes("\\")) {
    console.warn("⚠️  WARNING: Password contains backslashes ('\\'). Verify if it was accidentally double-escaped or corrupted in the environment settings.");
  }
  
  console.log("\n2. Performing DNS Lookup...");
  try {
    const addresses = await dns.promises.lookup(host, { all: true });
    console.log("✅ DNS lookup succeeded. Resolved addresses:");
    let hasIPv4 = false;
    let hasIPv6 = false;
    
    for (const addr of addresses) {
      console.log(`   - Address: ${addr.address} (Family: IPv${addr.family})`);
      if (addr.family === 4) hasIPv4 = true;
      if (addr.family === 6) hasIPv6 = true;
    }
    
    if (hasIPv6 && !hasIPv4) {
      console.warn("⚠️  WARNING: Host resolves ONLY to IPv6 addresses!");
      console.warn("   Supabase direct connections are IPv6-only by default.");
      console.warn("   If Hostinger (or your current server environment) does not support outbound IPv6,");
      console.warn("   the connection will FAIL with ECONNREFUSED or ENETUNREACH.");
      console.warn("   👉 FIX: Use the Supavisor Connection Pooler host (aws-0-[region].pooler.supabase.com) from the Supabase dashboard on port 6543/5432 which supports IPv4.");
    }
  } catch (err: any) {
    console.error("❌ ERROR: DNS lookup failed!");
    console.error(`Message: ${err.message}`);
  }

  console.log("\n3. Testing TCP Socket Connectivity...");
  const socketResult = await new Promise<{ success: boolean; error?: string }>((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(5000); // 5 seconds timeout
    
    socket.on("connect", () => {
      socket.destroy();
      resolve({ success: true });
    });
    
    socket.on("error", (err) => {
      socket.destroy();
      resolve({ success: false, error: err.message });
    });
    
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ success: false, error: "Connection timed out (5s limit reached)" });
    });
    
    console.log(`   Connecting to ${host}:${port} over TCP...`);
    socket.connect(Number(port), host);
  });

  if (socketResult.success) {
    console.log("✅ TCP socket connection succeeded! The host is reachable on this port.");
  } else {
    console.error(`❌ ERROR: TCP connection failed! Host is unreachable.`);
    console.error(`Reason: ${socketResult.error}`);
    console.log("👉 Troubleshoot: Outbound database ports (5432 or 6543) might be blocked by your hosting firewall, or you are trying to reach an IPv6-only host on an IPv4-only network.");
  }

  console.log("\n4. Testing Database Client Connection and Query Execution...");
  const useSSL = host.includes("supabase.co") || host.includes("neon.tech") || dbUrl.includes("sslmode=require");
  console.log(`   - SSL Configuration: ${useSSL ? "Enabled (rejectUnauthorized: false)" : "Disabled"}`);
  
  try {
    console.log("   Connecting to database and running: SELECT 1;");
    const client = await pool.connect();
    console.log("✅ Connected! Executing test query...");
    const res = await client.query("SELECT NOW() as current_time, version();");
    console.log("✅ Query executed successfully!");
    console.log(`   - DB Server Time: ${res.rows[0].current_time}`);
    console.log(`   - DB Version: ${res.rows[0].version}`);
    client.release();
  } catch (err: any) {
    console.error("❌ ERROR: Database client connection or query failed!");
    console.error(`Message: ${err.message}`);
    if (err.cause) {
      console.error(`Cause: ${err.cause.message || err.cause}`);
    }
    
    if (err.message.includes("password authentication failed")) {
      console.log("👉 Suggestion: Your database password is incorrect. Verify the credentials inside DATABASE_URL.");
    } else if (err.message.includes("SSL") || err.message.includes("encryption")) {
      console.log("👉 Suggestion: SSL connection parameters are rejected or required. Try appending ?sslmode=require to DATABASE_URL.");
    }
  }
  
  console.log("\n==================================================");
  console.log("              DIAGNOSTICS COMPLETE                ");
  console.log("==================================================");
}

runDiagnostics().catch(console.error);
