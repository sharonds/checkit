import type { Skill, SkillResult, EnricherSkill } from "./types.ts";
import { isEnricher } from "./types.ts";
import type { Config } from "../config.ts";
import { enrichFindings } from "./enrich.ts";

export class SkillRegistry {
  constructor(private readonly skills: Skill[]) {}

  async runAll(text: string, config: Config): Promise<SkillResult[]> {
    const primary = this.skills.filter((s) => !isEnricher(s));
    const enrichers = this.skills.filter((s): s is EnricherSkill => isEnricher(s));

    const primaryResults = await Promise.all(
      primary.map((skill) => this.runOne(skill, text, config)),
    );

    const enricherResults = await Promise.all(
      enrichers.map((e) => this.runOneEnricher(e, text, config, primaryResults)),
    );

    return enrichFindings([...primaryResults, ...enricherResults]);
  }

  private async runOne(skill: Skill, text: string, config: Config): Promise<SkillResult> {
    try {
      return await skill.run(text, config);
    } catch (err) {
      return {
        skillId: skill.id,
        name: skill.name,
        score: 0,
        verdict: "fail",
        summary: "Skill failed — see error",
        findings: [],
        costUsd: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async runOneEnricher(
    enricher: EnricherSkill,
    text: string,
    config: Config,
    priorResults: SkillResult[],
  ): Promise<SkillResult> {
    try {
      return await enricher.enrich(text, config, priorResults);
    } catch (err) {
      return {
        skillId: enricher.id,
        name: enricher.name,
        score: 0,
        verdict: "fail",
        summary: "Skill failed — see error",
        findings: [],
        costUsd: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
