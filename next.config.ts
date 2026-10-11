import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // don't advertise the framework in an X-Powered-By header
  poweredByHeader: false,
};

export default nextConfig;
