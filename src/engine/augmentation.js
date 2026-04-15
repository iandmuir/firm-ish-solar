/**
 * Builds an augmentation schedule for a solar or battery asset.
 *
 * @param {number} cycle - Augmentation cycle in years
 * @param {number} lifetime - Project lifetime in years
 * @param {number} buffer - End-of-life buffer in years (default 3)
 * @returns {{ augmentationYears: number[], intervals: number[], maxDegradationInterval: number }}
 */
export function buildAugmentationSchedule(cycle, lifetime, buffer = 3) {
  const augmentationYears = []
  let year = cycle

  while (year < lifetime) {
    // Include this augmentation only if at least `buffer` years remain after it
    if ((lifetime - year) >= buffer) {
      augmentationYears.push(year)
    }
    year += cycle
  }

  // Compute intervals between events
  const intervals = []
  let prev = 0
  for (const augYear of augmentationYears) {
    intervals.push(augYear - prev)
    prev = augYear
  }
  intervals.push(lifetime - prev) // final stretch to end of life

  const maxDegradationInterval = Math.max(...intervals)

  return { augmentationYears, intervals, maxDegradationInterval }
}
