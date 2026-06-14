// POST /api/logout -> borra la cookie de sesión
const { cookieHeader } = require("../lib/session.js");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "Método no permitido" }));
  }
  res.setHeader("Set-Cookie", cookieHeader("", 0));
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ ok: true }));
};
