//evals.ts

import { EvalConfig } from 'mcp-evals';
import { openai } from "@ai-sdk/openai";
import { grade, EvalFunction } from "mcp-evals";

const read_notesEval: EvalFunction = {
    name: "read_notes Tool Evaluation",
    description: "Evaluates reading multiple notes with partial failures",
    run: async () => {
        const result = await grade(openai("gpt-4"), "Please read the contents of note1.txt and note2.txt. Return their contents, and indicate if any note fails to be read.");
        return JSON.parse(result);
    }
};

const search_notesEval: EvalFunction = {
    name: "search_notes Tool Evaluation",
    description: "Evaluates searching for a note by partial or regex matches",
    run: async () => {
        const result = await grade(openai("gpt-4"), "Search for notes containing 'meeting' in their name using search_notes.");
        return JSON.parse(result);
    }
};

const config: EvalConfig = {
    model: openai("gpt-4"),
    evals: [read_notesEval, search_notesEval]
};
  
export default config;
  
export const evals = [read_notesEval, search_notesEval];