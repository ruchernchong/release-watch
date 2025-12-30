import { app } from "./app";
import { handleSchedule } from "./handlers/schedule";

export { Stats } from "./durable-objects/stats";
export { ReleaseCheckWorkflow } from "./workflows/release-check";

export default {
  fetch: app.fetch,
  scheduled: handleSchedule,
};
