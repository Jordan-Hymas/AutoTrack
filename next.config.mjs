import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  outputFileTracingRoot: __dirname,
  allowedDevOrigins: ["http://192.168.0.191:3000"]
};

export default nextConfig;
