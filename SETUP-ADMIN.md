# Puesta en marcha: Vercel + panel de administración

El sitio es estático y **data-driven**: todo el contenido vive en `content.json`.
El panel (`/admin`) es **Sveltia CMS**: Agustín entra, edita textos/secciones/fotos/vídeos
con formularios y, al guardar, se hace un commit en GitHub y **Vercel republica solo**.

Hay que hacer una configuración inicial (una vez, ~15 min). Necesitas una cuenta de
**GitHub** y otra de **Vercel** (ambas gratis). Yo no puedo crear cuentas ni meter tus
contraseñas; estos son los pasos:

---

## 1) Subir el proyecto a GitHub

1. Crea un repositorio nuevo en https://github.com/new (privado o público), por ejemplo `portfolio-agustin`.
2. Sube esta carpeta. Desde una terminal en la carpeta del proyecto:
   ```bash
   git init
   git add .
   git commit -m "Portfolio Agustín Segura Prado"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/portfolio-agustin.git
   git push -u origin main
   ```
   (O usa GitHub Desktop si prefieres botones.)

## 2) Desplegar en Vercel

1. Entra en https://vercel.com con tu cuenta de GitHub.
2. **Add New… → Project → Import** el repositorio.
3. Framework Preset: **Other**. Build command: *(vacío)*. Output dir: *(vacío / raíz)*.
4. **Deploy**. En 1 minuto tendrás una URL tipo `https://portfolio-agustin.vercel.app`.
5. (Opcional) Conecta tu dominio **agustinseguraprado.com** en *Settings → Domains*.

## 3) Conectar el dominio en el código

Pon tu dominio real (o la URL `.vercel.app`) en estos sitios y vuelve a hacer commit:
- `admin/config.yml` → `repo: TU_USUARIO/portfolio-agustin` y `base_url: https://TU_DOMINIO`
- Si NO usas dominio propio todavía, usa la URL `.vercel.app` en `base_url`.
- (Opcional, SEO) Sustituye `agustinseguraprado.com` por tu dominio en `index.html`,
  `robots.txt` y `sitemap.xml` si cambia.

## 4) Crear la app OAuth de GitHub (para el login del panel)

1. Ve a https://github.com/settings/developers → **OAuth Apps → New OAuth App**.
2. Rellena:
   - **Application name**: `Portfolio Agustín`
   - **Homepage URL**: `https://TU_DOMINIO`
   - **Authorization callback URL**: `https://TU_DOMINIO/api/callback`
3. Crea la app. Copia el **Client ID** y genera un **Client Secret**.

## 5) Variables de entorno en Vercel

En Vercel → tu proyecto → **Settings → Environment Variables**, añade:
- `OAUTH_GITHUB_CLIENT_ID` = (el Client ID)
- `OAUTH_GITHUB_CLIENT_SECRET` = (el Client Secret)

Vuelve a desplegar (**Deployments → Redeploy**) para que tomen efecto.

---

## Listo: cómo edita Agustín

1. Entra en `https://TU_DOMINIO/admin`
2. **Iniciar sesión con GitHub** (la primera vez autoriza la app).
3. En **Contenido → Portfolio** puede:
   - Cambiar cualquier texto en **Español / Galego / English**.
   - **Añadir / eliminar / reordenar secciones** (botón “Secciones”, arrastrar para ordenar).
   - En una sección de fotos: **subir fotos** (arrastrar) y **reordenarlas**.
   - **Añadir vídeos de YouTube a cualquier sección** (pega el ID del vídeo: lo que va
     tras `v=` en la URL de YouTube).
   - Cambiar la foto de portada y la de *Sobre mí*.
4. Pulsa **Guardar / Publicar**. En ~1 minuto los cambios están online (Vercel republica).

> Consejo: las fotos que suba se guardan en `assets/uploads/`. No hace falta indicar tamaños;
> el sitio calcula la proporción solo.

## Editar en local (opcional, sin publicar)

```bash
node server.js   # http://localhost:4321
```
Para probar el panel en local, Sveltia tiene “modo local”; para producción usa los pasos de arriba.

## Notas
- Si un vídeo da **Error 153**, entra en YouTube Studio y activa **“Permitir insertar”**
  y ponlo en *Público* o *No listado*.
- Falta rellenar el **NIF** y el **domicilio** en `aviso-legal.html` y `privacidad.html`
  (marcados como `[completar]`).
