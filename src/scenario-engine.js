export const SCENARIOS = Object.freeze({
  ZERO_B: "ZERO_B",
  ZERO_A: "ZERO_A",
  ONE: "ONE",
  TWO: "TWO"
});

const LIMITS = Object.freeze({
  [SCENARIOS.ZERO_B]: 1,
  [SCENARIOS.ZERO_A]: 2,
  [SCENARIOS.ONE]: 3,
  [SCENARIOS.TWO]: 6
});

export class ScenarioEngine {
  constructor() {
    this.order = [SCENARIOS.ZERO_B, SCENARIOS.ZERO_A, SCENARIOS.ONE, SCENARIOS.TWO];
    this.demoIndex = 0;
    this.current = this.order[0];
    this.collected = 0;
    this.finished = false;
  }

  reset({ advanceDemo = false } = {}) {
    if (advanceDemo) this.demoIndex = (this.demoIndex + 1) % this.order.length;
    this.current = this.order[this.demoIndex];
    this.collected = 0;
    this.finished = false;
    return this.snapshot();
  }

  setScenario(code) {
    if (!(code in LIMITS)) throw new Error(`Unknown scenario: ${code}`);
    this.current = code;
    this.demoIndex = Math.max(0, this.order.indexOf(code));
    this.collected = 0;
    this.finished = false;
    return this.snapshot();
  }

  canCollect() {
    return !this.finished && this.collected < LIMITS[this.current];
  }

  registerCollection() {
    if (!this.canCollect()) return this.snapshot();
    this.collected += 1;
    if (this.collected >= LIMITS[this.current]) this.finished = true;
    return this.snapshot();
  }

  snapshot() {
    const limit = LIMITS[this.current];
    return {
      scenario: this.current,
      collected: this.collected,
      limit,
      remaining: Math.max(0, limit - this.collected),
      finished: this.finished
    };
  }

  resultText() {
    switch (this.current) {
      case SCENARIOS.ZERO_B: return "Билет завершён: 1/3 УПАЙ";
      case SCENARIOS.ZERO_A: return "Билет завершён: 2/3 УПАЙ";
      case SCENARIOS.ONE: return "Билет завершён: 1 УПАЙ";
      case SCENARIOS.TWO: return "Билет завершён: 2 УПАЙ";
      default: return "Билет завершён";
    }
  }
}