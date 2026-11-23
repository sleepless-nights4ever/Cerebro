const entries = [
  {
    title: "Breathing exercises for stress (NHS)",
    url: "https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/",
    terms: ["breath", "breathing", "panic", "anxiety", "anxious", "calm"],
    summary: "Sit or stand comfortably and let your breath flow gently without forcing it. You can breathe in through your nose and slowly out through your mouth."
  },
  {
    title: "Doing What Matters in Times of Stress (WHO)",
    url: "https://www.who.int/publications/i/item/9789240003927",
    terms: ["stress", "stressed", "overwhelmed", "grounding", "pressure", "worry"],
    summary: "Try grounding by noticing what you are feeling, pressing your feet gently into the floor, and turning your attention to what you can see or hear around you."
  }
];

function retrieveWellnessGuidance(message) {
  const words = new Set(message.toLowerCase().match(/[a-z]+/g));
  return entries
    .map(entry => ({
      entry,
      score: entry.terms.filter(term => words.has(term)).length
    }))
    .filter(match => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(match => match.entry);
}

module.exports = { retrieveWellnessGuidance };
