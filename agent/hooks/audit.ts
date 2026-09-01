import { defineHook } from "eve/hooks";

export default defineHook({
  events: {
    async "session.started"(_event, ctx) {
      console.info("session started", { sessionId: ctx.session.id });
    },
    async "turn.completed"(event, ctx) {
      console.info("turn completed", {
        sessionId: ctx.session.id,
        turnId: event.data.turnId,
      });
    },
  },
});
