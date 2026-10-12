// Minimal service worker: makes the app installable and shows a friendly page when there's no connection.
// It never caches app data, so balances and stock are always fresh.

const OFFLINE_PAGE = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sin conexión · VitaEsme</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, sans-serif; background: #ffffff; color: #111811; }
  main { max-width: 22rem; padding: 2rem; text-align: center; }
  h1 { font-size: 1.25rem; margin: 0 0 .5rem; }
  p { color: #3d4a3e; line-height: 1.5; margin: 0 0 1.5rem; }
  button { font: inherit; font-weight: 600; color: #fff; background: #2e7d32; border: 0; border-radius: 14px; padding: .8rem 1.4rem; }
</style>
</head>
<body>
<main>
  <h1>Sin conexión</h1>
  <p>Revisa tu internet. Tus datos están a salvo y se verán en cuanto vuelvas a conectarte.</p>
  <button onclick="location.reload()">Reintentar</button>
</main>
</body>
</html>`

self.addEventListener("install", () => self.skipWaiting())

self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_PAGE, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }),
    ),
  )
})
