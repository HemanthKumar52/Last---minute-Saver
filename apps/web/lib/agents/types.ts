import type { TaskCategory, ArtifactKind, RadarState } from "@clutch/core";

export type AgentId =
  | "coordinator"
  | "context"
  | "prioritizer"
  | "classifier"
  | "methodology"
  | "sla"
  | "notification"
  | "executor"
  | "presenter";

export interface AgentStep {
  agent: AgentId;
  title: string;
  summary: string;
  output?: Record<string, unknown>;
  /** did the LLM actually run for this step, or the deterministic guardrail? */
  source: "ai" | "rule";
}

export interface AgentRunResult {
  taskId: string;
  taskTitle: string;
  steps: AgentStep[];
  type: TaskCategory;
  methodology: string;
  radar: RadarState;
  sla: string;
  notify: { strategy: string; message: string };
  presenter: { surface: string };
  artifact: { kind: ArtifactKind; body: string };
  aiUsed: boolean;
}
