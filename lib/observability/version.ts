/** Identity of the running build, injected as env vars by the image / Helm chart. */
export function buildInfo() {
  return {
    service: "vigneshwara-web",
    version: process.env.APP_VERSION ?? "dev",
    commit: process.env.GIT_SHA ?? "unknown",
    builtAt: process.env.BUILD_TIME ?? "unknown",
  };
}
