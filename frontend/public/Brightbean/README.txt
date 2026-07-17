Brightbean static pages (served at http://localhost:8000/Brightbean/)

Put HTML files here (NewPost.html, a.html, b.html, …). Accompanying assets
go in a sibling folder (e.g. NewPost_files/) and use relative links:

  ./NewPost_files/styles.css
  ./NewPost_files/app.js

CRA copies this folder into the production build. After adding or changing
files, rebuild the gateway:

  cd C:\app\SocialMediaStart
  docker compose --env-file .env up -d --build gateway

Examples:
  http://localhost:8000/Brightbean/NewPost.html
  http://localhost:8000/Brightbean/YouTubeBrightbean.html
  (YouTube compose prototype; assets in YouTubeBrightbean_files/)

If the browser shows the React “Not Found” UI instead of this HTML, unregister
Service Workers for localhost:8000 (DevTools → Application) and hard-refresh.
The site SW must not cache /Brightbean/* (see public/sw.js).
