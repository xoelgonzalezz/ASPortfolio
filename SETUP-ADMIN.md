# Panel de administración a medida

La web es estática y **data-driven**: todo el contenido vive en `content.json`.
El panel (`/admin`) es **a medida** (mismo estilo que la web). Agustín entra con una
**contraseña** (sin GitHub, sin instalar nada), edita textos/secciones/fotos/vídeos y,
al **Guardar**, los cambios se publican **al instante** (se guardan en Vercel Blob; la
web los lee en vivo).

## Cómo funciona (resumen técnico)

- `admin/` → el panel (HTML + CSS + JS, sin build).
- `api/login.js` → comprueba la contraseña y entrega una cookie de sesión firmada (HMAC).
- `api/content.js` → `GET` devuelve el contenido (Blob o, si aún no hay, el `content.json` del repo); `PUT` lo guarda (requiere sesión).
- `api/upload.js` → sube las fotos (ya reescaladas en el navegador) a Vercel Blob.
- `lib/session.js` → firma/verifica la sesión.
- La web (`script.js`) lee de `/api/content` (con respaldo al `content.json` estático).

El contenido se guarda como un blob nuevo en cada `Guardar` (y se borra el anterior),
así **no hay caché obsoleta**: los cambios se ven al recargar.

---

## Configuración en Vercel (una vez, ~5 min)

### 1) Crear el almacén Blob y conectarlo al proyecto
1. En tu proyecto de Vercel → pestaña **Storage** → **Create → Blob** (ya creado: `as-portfolio-blob`).
2. Conéctalo al proyecto `as-portfolio` (botón **Connect Project** del store, o en el asistente al crearlo).
   Esto añade automáticamente la variable **`BLOB_READ_WRITE_TOKEN`** al proyecto. **No hay que copiarla a mano.**
   (Si prefieres a mano: en el store, pestaña **`.env.local`** del Quickstart, copia el valor de `BLOB_READ_WRITE_TOKEN`
   y añádelo en Settings → Environment Variables.)

### 2) Variables de entorno del proyecto
En Vercel → proyecto `as-portfolio` → **Settings → Environment Variables**, añade (en los 3 entornos):

| Nombre | Valor |
|---|---|
| `ADMIN_PASSWORD` | la contraseña de Agustín — **larga y robusta** (no hay segundo factor; p.ej. 4 palabras al azar o `openssl rand -base64 18`) |
| `SESSION_SECRET` | una cadena larga al azar (genera una con `openssl rand -hex 48`) |
| `BLOB_READ_WRITE_TOKEN` | lo añade solo el paso 1 |
| `SESSION_GENERATION` | *(opcional)* un número, p.ej. `1`. Súbelo (`2`, `3`…) para **cerrar todas las sesiones** de golpe |

> **Seguridad:** la sesión dura 2 días y la cookie es `HttpOnly` + `Secure` + `SameSite=Strict`. «Cerrar sesión» borra la cookie del navegador; para revocar una sesión que se sospeche filtrada, cambia `SESSION_GENERATION`. Tras el primer deploy nuevo, en GitHub elimina la antigua *OAuth App* y borra de Vercel las variables `OAUTH_GITHUB_CLIENT_ID`/`OAUTH_GITHUB_CLIENT_SECRET` (ya no se usan).

### 3) Redeploy
**Deployments → (último) → ⋯ → Redeploy** (sin caché). En el primer deploy Vercel instalará `@vercel/blob`.

---

## Cómo edita Agustín

1. Entra en `https://agustinseguraprado.com/admin` (o la URL `.vercel.app/admin`).
2. Escribe la **contraseña**.
3. En el menú lateral:
   - **Portada** — foto de inicio y textos (ES/GL/EN).
   - **Secciones** — añadir/eliminar/reordenar; en galerías: subir, **reordenar (arrastrar o flechas)** y borrar fotos; añadir vídeos de YouTube.
   - **Sobre mí** — foto, biografía y servicios.
   - **Contacto** — el titular final.
   - **Redes y datos** — email e Instagram/LinkedIn.
   - **Textos web** — botones, menú y pie en cada idioma.
4. Pulsa **Guardar cambios** (o `Ctrl/Cmd + S`). Recarga la web y ya está.

> Las fotos se optimizan solas para web al subirlas (máx. 2560 px). No hay que indicar tamaños.

## Local

- `node server.js` → `http://localhost:4321` muestra la web (lee el `content.json` del repo; el panel necesita la API).
- Para probar el panel y la API en local: `npm install` y luego `vercel dev`.

## Notas
- Si un vídeo da **Error 153**, en YouTube Studio activa **«Permitir insertar»** y ponlo en *Público*/*No listado*.
- Falta rellenar el **NIF** y el **domicilio** en `aviso-legal.html` y `privacidad.html` (marcados como `[completar]`).
