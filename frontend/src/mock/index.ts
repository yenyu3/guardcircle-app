import { DailyChallengeQuestion } from "../types";

const dailyChallengesRaw =
  require("./dailyChallenges.json") as DailyChallengeQuestion[];
export const mockDailyChallenges: DailyChallengeQuestion[] = dailyChallengesRaw;
