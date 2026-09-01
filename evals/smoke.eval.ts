import { defineEval } from "eve/evals";

export default defineEval({
  description: "The scaffolded agent can complete a simple greeting turn.",
  async test(t) {
    await t.send("Say hello in one sentence.");
    t.succeeded();
  },
});
