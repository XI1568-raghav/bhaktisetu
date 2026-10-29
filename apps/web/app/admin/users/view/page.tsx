// /admin/users/view?id=<uuid>: the account record. A fully static page (the id is a query
// parameter read in the browser), so Cloudflare serves it without starting the Worker.
export { default } from '../user-detail-screen';
