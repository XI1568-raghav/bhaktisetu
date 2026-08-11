# apps\admin\app\api\content-queue\route.ts

Server-side proxy route that forwards admin content-queue requests to the backend API with the bearer token injected server-side so credentials never reach the browser.

- GET · function · L12-L24 — Proxies GET requests for the content draft queue to the admin API, forwarding the optional status filter and returning the backend response verbatim.
