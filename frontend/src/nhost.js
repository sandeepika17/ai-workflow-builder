import { NhostClient } from "@nhost/react";

export const nhost = new NhostClient({
  subdomain: "local",
  region: "local",
});