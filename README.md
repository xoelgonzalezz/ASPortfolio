# Portfolio — Agustín Segura Prado

Sitio web estático (HTML/CSS/JS, sin build ni framework) para Agustín Segura Prado,
comunicador audiovisual y fotógrafo. Estética cianotipo azul (la marca del "caballito").

> ⚠️ Debe servirse por **HTTP/HTTPS**. No funciona abriendo `index.html` con `file://`
> (los vídeos de YouTube y las fuentes lo requieren).

## Desarrollo local

```bash
node server.js
```

Abre http://localhost:4321 (el puerto se puede cambiar con la variable de entorno `PORT`).

## Estructura

```
index.html            La página.
styles.css            Estilos (paleta azul de marca, masonry, responsive, a11y).
script.js             Galerías, visor (lightbox), menú, vídeos, masonry.
fonts.css             @font-face de las fuentes auto-alojadas (sin Google Fonts).
manifest.webmanifest  Metadatos PWA.
robots.txt / sitemap.xml   SEO.
404.html              Página de error con la estética del sitio.
assets/
  thumbs/   Miniaturas de galería (~1100px) — la cuadrícula.
  full/     Fotos a alta resolución (hasta 3840px, q95) — el visor.
  video/    Pósters de los vídeos de YouTube.
  fonts/    Fuentes .woff2 (Inter + Fraunces).
  favicon.svg, icon-192.png, icon-512.png, apple-touch-icon.png, og-cover.jpg
server.js             Servidor estático SOLO para desarrollo (no se despliega).
```

## Antes de publicar (importante)

1. **Dominio**: reemplaza `https://www.agustinsegura.com/` por el dominio real en:
   `index.html` (canonical, Open Graph, Twitter, JSON-LD), `robots.txt` y `sitemap.xml`.
2. **El caballito (logo de marca)**: coloca el archivo del caballito en
   `assets/caballito.png` (idealmente PNG cuadrado con fondo transparente, 512×512).
   El sitio lo detecta solo y lo usa en el preloader, la barra de navegación y el footer.
   Mientras no exista, se muestra un wordmark elegante como respaldo.
   - Opcional: regenera el favicon/iconos a partir del caballito para unificar la marca.
3. Revisa los textos legales (`aviso-legal.html`, `privacidad.html`) y rellena los campos
   marcados como `[...]` (identidad, etc.).

## Despliegue (100% estático)

- **Netlify**: arrastra la carpeta a app.netlify.com/drop, o conecta el repo.
  Build command: *(vacío)* · Publish directory: `.`
- **Vercel**: Framework preset: *Other* · Output directory: `.` · sin build command.
- **GitHub Pages**: Settings → Pages → Deploy from a branch → `main`, carpeta `/ (root)`.

## Notas

- Los vídeos de YouTube usan una *fachada*: no se carga nada de YouTube (ni cookies)
  hasta que el usuario pulsa play. Se usa el dominio `youtube-nocookie.com`.
- Si algún vídeo diera **Error 153** al incrustarse, es configuración del vídeo en
  YouTube: en YouTube Studio, marca **"Permitir incrustar"** y ponlo en *Público* o
  *No listado* (no *Privado*).
- Las fotos del visor pesan bastante (alta calidad). Si el hosting tiene límite de ancho
  de banda, vigílalo; se cargan solo bajo demanda al abrir cada foto.
