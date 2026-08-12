import app from "./hono";

console.log("Hono backend server running on http://localhost:4000");

export default {
  port: 4000,
  fetch: app.fetch,
};
