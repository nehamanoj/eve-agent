import { defineChannel, POST } from "eve/channels";

/**
 * Custom HTTP channel. The file stem is the channel id (`intake`).
 * Route paths are app URLs and are not prefixed by the filename.
 *
 * This scaffold accepts unauthenticated local posts. Replace `{ auth: null }`
 * and add route auth before exposing it beyond localhost.
 */
export default defineChannel({
  routes: [
    POST("/intake/message", async (request, { from }) => {
      const body = (await request.json()) as {
        threadId?: unknown;
        message?: unknown;
      };
      const threadId = typeof body.threadId === "string" ? body.threadId.trim() : "";
      const message = typeof body.message === "string" ? body.message.trim() : "";

      if (!threadId || !message) {
        return Response.json(
          { ok: false, error: "threadId and message are required" },
          { status: 400 },
        );
      }

      const session = await from(threadId).send(message, { auth: null });
      return Response.json({ ok: true, sessionId: session.id });
    }),
  ],
});
