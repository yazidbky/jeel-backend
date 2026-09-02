import app from "./app.js";
import { initializeDatabase } from "./core/db/init.js";
import http from "http";
import { createSocketServer } from "./realtime/socket.server.js";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
createSocketServer(server);

initializeDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
