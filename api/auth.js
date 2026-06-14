// Inicio del login con GitHub para el CMS (Vercel Serverless Function).
// Requiere las variables de entorno OAUTH_GITHUB_CLIENT_ID y OAUTH_GITHUB_CLIENT_SECRET.
module.exports = (req, res) => {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  if (!clientId) { res.statusCode = 500; return res.end("Falta OAUTH_GITHUB_CLIENT_ID"); }
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const redirectUri = `${proto}://${host}/api/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "repo,user",
    state: Math.random().toString(36).slice(2) + Date.now().toString(36),
    allow_signup: "false"
  });
  res.statusCode = 302;
  res.setHeader("Location", `https://github.com/login/oauth/authorize?${params.toString()}`);
  res.end();
};
