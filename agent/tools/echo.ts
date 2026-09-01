import { defineTool } from "eve/tools";
import { z } from "zod";

import { formatNote } from "../lib/notes";

export default defineTool({
  description: "Repeat a short note back to confirm you heard the user.",
  inputSchema: z.object({
    note: z.string().min(1).describe("The text to repeat back."),
  }),
  async execute({ note }) {
    return { echoed: formatNote(note) };
  },
});
