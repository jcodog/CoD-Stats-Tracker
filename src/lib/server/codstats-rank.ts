type RankDivision = {
  rank: string;
  division?: string;
  minSr: number;
  maxSr: number;
};

export type RankLadder = {
  title: string;
  ruleset: string;
  divisions: RankDivision[];
  updatedAt: number;
};

export type RankProgress = {
  title: string;
  ruleset: string;
  currentSr: number;
  current: RankDivision;
  nextDivision?: RankDivision & {
    srNeeded: number;
  };
  nextRank?: RankDivision & {
    srNeeded: number;
  };
  prevDivision?: RankDivision & {
    srBack: number;
  };
  prevRank?: RankDivision & {
    srBack: number;
  };
};

const LADDER_UPDATED_AT = Date.UTC(2026, 1, 1);

const RANK_LADDER_CONFIG: Omit<RankLadder, "updatedAt"> = {
  title: "COD Ranked Skill Divisions",
  ruleset: "sr-based-v1",
  divisions: [
    { rank: "Bronze", division: "I", minSr: 0, maxSr: 899 },
    { rank: "Bronze", division: "II", minSr: 900, maxSr: 1199 },
    { rank: "Bronze", division: "III", minSr: 1200, maxSr: 1499 },
    { rank: "Silver", division: "I", minSr: 1500, maxSr: 1799 },
    { rank: "Silver", division: "II", minSr: 1800, maxSr: 2099 },
    { rank: "Silver", division: "III", minSr: 2100, maxSr: 2399 },
    { rank: "Gold", division: "I", minSr: 2400, maxSr: 2699 },
    { rank: "Gold", division: "II", minSr: 2700, maxSr: 2999 },
    { rank: "Gold", division: "III", minSr: 3000, maxSr: 3299 },
    { rank: "Platinum", division: "I", minSr: 3300, maxSr: 3599 },
    { rank: "Platinum", division: "II", minSr: 3600, maxSr: 3899 },
    { rank: "Platinum", division: "III", minSr: 3900, maxSr: 4199 },
    { rank: "Diamond", division: "I", minSr: 4200, maxSr: 4499 },
    { rank: "Diamond", division: "II", minSr: 4500, maxSr: 4799 },
    { rank: "Diamond", division: "III", minSr: 4800, maxSr: 5099 },
    { rank: "Crimson", division: "I", minSr: 5100, maxSr: 5399 },
    { rank: "Crimson", division: "II", minSr: 5400, maxSr: 5699 },
    { rank: "Crimson", division: "III", minSr: 5700, maxSr: 5999 },
    { rank: "Iridescent", minSr: 6000, maxSr: 9999 },
  ],
};

function cloneDivision(division: RankDivision): RankDivision {
  return {
    rank: division.rank,
    division: division.division,
    minSr: division.minSr,
    maxSr: division.maxSr,
  };
}

function getCurrentDivisionIndex(currentSr: number, divisions: RankDivision[]) {
  const inRangeIndex = divisions.findIndex(
    (division) => currentSr >= division.minSr && currentSr <= division.maxSr,
  );

  if (inRangeIndex !== -1) {
    return inRangeIndex;
  }

  if (currentSr < divisions[0].minSr) {
    return 0;
  }

  return divisions.length - 1;
}

function findNextRankIndex(currentIndex: number, divisions: RankDivision[]) {
  const currentRank = divisions[currentIndex].rank;

  for (let index = currentIndex + 1; index < divisions.length; index += 1) {
    if (divisions[index].rank !== currentRank) {
      return index;
    }
  }

  return null;
}

function findPrevRankIndex(currentIndex: number, divisions: RankDivision[]) {
  const currentRank = divisions[currentIndex].rank;

  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    if (divisions[index].rank !== currentRank) {
      return index;
    }
  }

  return null;
}

function getSrNeeded(currentSr: number, minSr: number) {
  return Math.max(0, minSr - currentSr);
}

function getSrBack(currentSr: number, maxSr: number) {
  return Math.max(0, currentSr - maxSr);
}

export function getCodstatsRankLadder(): RankLadder {
  return {
    title: RANK_LADDER_CONFIG.title,
    ruleset: RANK_LADDER_CONFIG.ruleset,
    divisions: RANK_LADDER_CONFIG.divisions.map(cloneDivision),
    updatedAt: LADDER_UPDATED_AT,
  };
}

export function getCodstatsRankProgress(
  currentSr: number,
  ladder: RankLadder,
): RankProgress {
  const divisions = ladder.divisions;

  if (divisions.length === 0) {
    throw new Error("rank_ladder_empty");
  }

  const currentIndex = getCurrentDivisionIndex(currentSr, divisions);
  const currentDivision = cloneDivision(divisions[currentIndex]);

  const nextDivision =
    currentIndex < divisions.length - 1
      ? {
          ...cloneDivision(divisions[currentIndex + 1]),
          srNeeded: getSrNeeded(currentSr, divisions[currentIndex + 1].minSr),
        }
      : undefined;

  const nextRankIndex = findNextRankIndex(currentIndex, divisions);
  const nextRank =
    nextRankIndex === null
      ? undefined
      : {
          ...cloneDivision(divisions[nextRankIndex]),
          srNeeded: getSrNeeded(currentSr, divisions[nextRankIndex].minSr),
        };

  const prevDivision =
    currentIndex > 0
      ? {
          ...cloneDivision(divisions[currentIndex - 1]),
          srBack: getSrBack(currentSr, divisions[currentIndex - 1].maxSr),
        }
      : undefined;

  const prevRankIndex = findPrevRankIndex(currentIndex, divisions);
  const prevRank =
    prevRankIndex === null
      ? undefined
      : {
          ...cloneDivision(divisions[prevRankIndex]),
          srBack: getSrBack(currentSr, divisions[prevRankIndex].maxSr),
        };

  return {
    title: ladder.title,
    ruleset: ladder.ruleset,
    currentSr,
    current: currentDivision,
    nextDivision,
    nextRank,
    prevDivision,
    prevRank,
  };
}
