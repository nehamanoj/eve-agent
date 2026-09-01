import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Investigate a focused question and return a short, sourced-or-uncertain summary.",
  model: "openai/gpt-5.6-luna-fast",
});
