export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export interface RiskAssessment {
  passwordRisk: number;
  ddosRisk: number;
  infectionRisk: number;
  score: number;
  level: RiskLevel;
}

export function computeRisk(opts: {
  passwordEntropy: number; // 0-100+
  serverLoad: number; // %
  infectionPercent: number; // %
}): RiskAssessment {
  // Password risk: lower entropy = higher risk. Cap entropy at 100.
  const cappedEntropy = Math.min(100, Math.max(0, opts.passwordEntropy));
  const passwordRisk = 100 - cappedEntropy;

  const ddosRisk = Math.min(100, Math.max(0, opts.serverLoad));
  const infectionRisk = Math.min(100, Math.max(0, opts.infectionPercent));

  const score =
    0.3 * passwordRisk + 0.4 * ddosRisk + 0.3 * infectionRisk;

  let level: RiskLevel;
  if (score < 25) level = "Low";
  else if (score < 50) level = "Medium";
  else if (score < 75) level = "High";
  else level = "Critical";

  return { passwordRisk, ddosRisk, infectionRisk, score, level };
}
