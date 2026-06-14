// Callback OAuth de GitHub para el CMS (Vercel Serverless Function).
// Intercambia el "code" por un token y lo devuelve al panel mediante postMessage.
module.exports = async (req, res) => {
  const code = req.query && req.query.code;
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  const clientSecret = process.env.OAUTH_GITHUB_CLIENT_SECRET;
  if (!code || !clientId || !clientSecret) {
    res.statusCode = 400;
    return res.end("Faltan parámetros o variables de entorno (OAUTH_GITHUB_CLIENT_ID/SECRET).");
  }
  try {
    const r = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json", "User-Agent": "asp-cms" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
    });
    const data = await r.json();
    const token = data.access_token;
    const status = token ? "success" : "error";
    const content = token ? { token, provider: "github" } : { message: data.error_description || "No se recibió token" };
    const payload = JSON.stringify(content).replace(/</g, "\\u003c");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Autenticando…</title></head>
<body style="font-family:system-ui;background:#0a0d14;color:#eef1f8;display:grid;place-items:center;height:100vh;margin:0">
<p>${status === "success" ? "Conectado. Esta ventana se cerrará…" : "Error de autenticación."}</p>
<script>
  (function(){
    function receiveMessage(e){
      window.opener && window.opener.postMessage('authorization:github:${status}:${payload}', e.origin);
      window.removeEventListener('message', receiveMessage, false);
      ${status === "success" ? "setTimeout(function(){ window.close(); }, 800);" : ""}
    }
    window.addEventListener('message', receiveMessage, false);
    window.opener && window.opener.postMessage('authorizing:github', '*');
  })();
</script>
</body></html>`);
  } catch (e) {
    res.statusCode = 500;
    res.end("Error en el intercambio OAuth: " + (e && e.message));
  }
};
