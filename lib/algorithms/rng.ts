export class RNG {
  constructor(private seed = 12345) {}

  private next() {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  float() {
    return this.next();
  }

  int(maxExclusive: number) {
    return Math.floor(this.next() * maxExclusive);
  }

  range(minInclusive: number, maxExclusive: number) {
    return minInclusive + this.int(Math.max(1, maxExclusive - minInclusive));
  }
}

