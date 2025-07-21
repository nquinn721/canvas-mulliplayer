/**
 * Level Progression Chart for the New Experience System
 * This shows how much XP is required for each level
 */

console.log("=== NEW EXPERIENCE SYSTEM ===");
console.log("Level | Total XP | XP for Level | XP to Next | Notes");
console.log("------|----------|--------------|------------|-------");

let totalXP = 0;
const baseXP = 100;
const multiplier = 1.5;

for (let level = 1; level <= 15; level++) {
  let xpForLevel = 0;
  let xpToNext = 0;

  if (level > 1) {
    xpForLevel = Math.floor(baseXP * Math.pow(multiplier, level - 2));
    totalXP += xpForLevel;
  }

  if (level < 15) {
    xpToNext = Math.floor(baseXP * Math.pow(multiplier, level - 1));
  }

  let notes = "";
  if (level === 1) notes = "Starting level";
  if (level === 2) notes = "First level-up";
  if (level === 5) notes = "Early game goal";
  if (level === 10) notes = "Mid game milestone";
  if (level === 15) notes = "High level player";

  console.log(
    `  ${level.toString().padStart(2)}  |  ${totalXP.toString().padStart(6)}  |  ${xpForLevel.toString().padStart(10)}  |  ${xpToNext.toString().padStart(10)}  | ${notes}`
  );
}

console.log("\n=== XP REWARDS ===");
console.log("Action          | XP Reward");
console.log("----------------|----------");
console.log("Kill Player     |    50 XP");
console.log("Kill AI Enemy   |    20 XP");
console.log("Power-up Pickup |  5-10 XP");
console.log("");
console.log("Examples:");
console.log("- Level 1 → 2: Need 100 XP (2 player kills OR 5 AI kills)");
console.log("- Level 2 → 3: Need 150 XP (3 player kills OR 8 AI kills)");
console.log("- Level 3 → 4: Need 225 XP (5 player kills OR 12 AI kills)");
console.log("- Level 4 → 5: Need 338 XP (7 player kills OR 17 AI kills)");
console.log("- Level 5 → 6: Need 506 XP (11 player kills OR 26 AI kills)");

export {}; // Make this a module
