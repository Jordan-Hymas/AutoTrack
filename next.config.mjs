import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  outputFileTracingRoot: __dirname,
  allowedDevOrigins: [
    "http://192.168.0.13",
    "http://192.168.0.13:3000",
    "http://192.168.0.191",
    "http://192.168.0.191:3000"
  ],
  serverExternalPackages: ["better-sqlite3", "web-push"]
};

export default nextConfig;
