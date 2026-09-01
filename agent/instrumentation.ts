import { defineInstrumentation } from "eve/instrumentation";

/**
 * Presence of this file enables authored telemetry and replaces eve's local
 * disk traces (`eve traces` / TUI `/traces`). Delete it to restore local traces.
 *
 * Add a `setup` callback (for example `registerOTel` from `@vercel/otel`) when
 * you want to export spans to an OpenTelemetry backend.
 */
export default defineInstrumentation({
  recordInputs: false,
  recordOutputs: false,
});
