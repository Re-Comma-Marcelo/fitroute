import { describe, expect, test } from "bun:test";
import { nextSetTarget } from "./next-set";

const legPress = {
  nome: "Leg Press",
  grupoPrimario: "Quads",
  equipamento: "Machine",
  repsMin: 8,
  repsMax: 12,
};
const bench = {
  nome: "Bench Press",
  grupoPrimario: "Chest",
  equipamento: "Barbell",
  repsMin: 8,
  repsMax: 12,
};
const lateral = {
  nome: "Lateral Raise",
  grupoPrimario: "Shoulders",
  equipamento: "Dumbbells",
  repsMin: 10,
  repsMax: 15,
};

describe("nextSetTarget — increases", () => {
  test("top of the range at RPE 8 or easier: weight goes up by the class step", () => {
    const t = nextSetTarget(legPress, { pesoKg: 200, reps: 12, rpe: 8 });
    expect(t?.decision).toBe("increase");
    expect(t?.pesoKg).toBe(210);
    expect(t?.reps).toBe(8);

    const b = nextSetTarget(bench, { pesoKg: 80, reps: 12, rpe: 7 });
    expect(b?.pesoKg).toBe(82.5);
  });

  test("no RPE logged still increases at the top of the range", () => {
    const t = nextSetTarget(bench, { pesoKg: 80, reps: 12 });
    expect(t?.decision).toBe("increase");
  });

  test("top of the range but RPE 9: hold, trim a rep", () => {
    const t = nextSetTarget(bench, { pesoKg: 80, reps: 12, rpe: 9 });
    expect(t?.decision).toBe("hold");
    expect(t?.pesoKg).toBe(80);
    expect(t?.reps).toBe(12);
  });
});

describe("nextSetTarget — failure back-off", () => {
  test("RPE 10 on a compound drops the load one small step, same reps", () => {
    const t = nextSetTarget(legPress, { pesoKg: 200, reps: 10, rpe: 10 });
    expect(t?.decision).toBe("backoff");
    expect(t?.pesoKg).toBe(190);
    expect(t?.reps).toBe(10);

    const b = nextSetTarget(bench, { pesoKg: 100, reps: 9, rpe: 10 });
    expect(b?.pesoKg).toBe(95);
    expect(b?.reps).toBe(9);
  });

  test("RPE 10 on an isolation move holds the weight and trims two reps", () => {
    const t = nextSetTarget(lateral, { pesoKg: 10, reps: 14, rpe: 10 });
    expect(t?.decision).toBe("trim-reps");
    expect(t?.pesoKg).toBe(10);
    expect(t?.reps).toBe(12);
  });

  test("RPE 10 at the top of the range never increases", () => {
    const t = nextSetTarget(bench, { pesoKg: 80, reps: 12, rpe: 10 });
    expect(t?.decision).toBe("backoff");
    expect(t?.pesoKg).toBe(77.5);
  });

  test("RPE 9.5 holds the weight and trims one rep", () => {
    const t = nextSetTarget(bench, { pesoKg: 80, reps: 10, rpe: 9.5 });
    expect(t?.decision).toBe("trim-reps");
    expect(t?.pesoKg).toBe(80);
    expect(t?.reps).toBe(9);
  });
});

describe("nextSetTarget — under the range", () => {
  test("short of the range while grinding: load comes down to the bottom of the range", () => {
    const t = nextSetTarget(bench, { pesoKg: 100, reps: 6, rpe: 9 });
    expect(t?.decision).toBe("backoff");
    expect(t?.pesoKg).toBe(95);
    expect(t?.reps).toBe(8);
  });

  test("short of the range without RPE also backs off", () => {
    const t = nextSetTarget(legPress, { pesoKg: 200, reps: 5 });
    expect(t?.decision).toBe("backoff");
    expect(t?.pesoKg).toBe(190);
    expect(t?.reps).toBe(8);
  });

  test("short of the range but easy (RPE 7): the lifter just stopped early — hold", () => {
    const t = nextSetTarget(bench, { pesoKg: 80, reps: 6, rpe: 7 });
    expect(t?.decision).toBe("trim-reps");
    expect(t?.pesoKg).toBe(80);
    expect(t?.reps).toBe(8);
  });

  test("isolation under the range drops one rack step when the load allows it", () => {
    const t = nextSetTarget(lateral, { pesoKg: 16, reps: 6, rpe: 10 });
    expect(t?.decision).toBe("backoff");
    expect(t?.pesoKg).toBe(14);
    expect(t?.reps).toBe(10);
  });
});

describe("nextSetTarget — middle of the range", () => {
  test("asks for one more rep at the same weight", () => {
    const t = nextSetTarget(bench, { pesoKg: 80, reps: 10, rpe: 8 });
    expect(t?.decision).toBe("hold");
    expect(t?.pesoKg).toBe(80);
    expect(t?.reps).toBe(11);
  });

  test("returns null without a usable set", () => {
    expect(nextSetTarget(bench, { pesoKg: 0, reps: 10 })).toBeNull();
    expect(nextSetTarget(bench, { pesoKg: 80, reps: 0 })).toBeNull();
  });
});
