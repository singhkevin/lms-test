import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  if (!process.env.SETUP_TOKEN) {
    res.status(404).send("Not found");
    return;
  }
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Initial Setup</title>
  <style>
    body { font-family: sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; }
    input { width: 100%; padding: 10px; margin: 8px 0; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
    button { width: 100%; padding: 12px; background: #6366f1; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; }
    button:hover { background: #4f46e5; }
    #msg { margin-top: 16px; padding: 12px; border-radius: 6px; display: none; }
    .ok { background: #d1fae5; color: #065f46; }
    .err { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <h2>One-time Account Setup</h2>
  <p>This page is only active when SETUP_TOKEN is configured.</p>
  <input id="name" placeholder="Full Name" value="Kevin Singh" />
  <input id="email" placeholder="Email" value="kevin@viralinbound.com" />
  <input id="password" type="password" placeholder="Password" value="Nintendo@8593" />
  <input id="token" placeholder="Setup Token" value="Local-Host-999" />
  <button onclick="setup()">Create Owner Account</button>
  <div id="msg"></div>
  <script>
    async function setup() {
      const msg = document.getElementById('msg');
      msg.style.display = 'none';
      try {
        const res = await fetch('/api/auth/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            setupToken: document.getElementById('token').value
          })
        });
        const data = await res.json();
        msg.style.display = 'block';
        if (res.ok) {
          msg.className = 'ok';
          msg.textContent = 'Account created! You can now log in at /staff/login';
        } else {
          msg.className = 'err';
          msg.textContent = data.message || 'Error: ' + JSON.stringify(data);
        }
      } catch (e) {
        msg.style.display = 'block';
        msg.className = 'err';
        msg.textContent = 'Request failed: ' + e.message;
      }
    }
  </script>
</body>
</html>`);
});

export default router;
