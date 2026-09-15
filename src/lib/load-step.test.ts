import { describe, expect, test } from "bun:test";
import {
  classifyExercise,
  failureBackoff,
  isBigJump,
  loadIncrement,
  plateResolution,
} from "./load-step";

describe("classifyExercise", () => {
  test("big lower-body patterns", () => {
    expect(classifyExercise({ nome: "Leg Press", grupoPrimario: "Quads" })).toBe("lower-compound");
    expect(classifyExercise({ nome: "Barbell Squat", grupoPrimario: "Quads" })).toBe(
      "lower-compound",
    );
    expect(classifyExercise({ nome: "Romanian Deadlift", grupoPrimario: "Hamstrings" })).toBe(
      "lower-compound",
    );
    expect(classifyExercise({ nome: "Hip Thrust", grupoPrimario: "Glutes" })).toBe(
      "lower-compound",
    );
    expect(classifyExercise({ nome: "Agachamento livre", grupoPrimario: "Pernas" })).toBe(
      "lower-compound",
    );
  });

  test("upper-body compounds", () => {
    expect(classifyExercise({ nome: "Bench Press", grupoPrimario: "Chest" })).toBe(
      "upper-compound",
    );
    expect(classifyExercise({ nome: "Barbell Row", grupoPrimario: "Back" })).toBe("upper-compound");
    expect(classifyExercise({ nome: "Lat Pulldown", grupoPrimario: "Back" })).toBe(
      "upper-compound",
    );
    expect(classifyExercise({ nome: "Overhead Press", grupoPrimario: "Shoulders" })).toBe(
      "upper-compound",
    );
    expect(classifyExercise({ nome: "Supino reto", grupoPrimario: "Peito" })).toBe(
      "upper-compound",
    );
  });

  test("isolation by name even inside a big muscle group", () => {
    expect(classifyExercise({ nome: "Leg Extension", grupoPrimario: "Quads" })).toBe("isolation");
    expect(classifyExercise({ nome: "Lying Leg Curl", grupoPrimario: "Hamstrings" })).toBe(
      "isolation",
    );
    expect(classifyExercise({ nome: "Pec Deck Machine", grupoPrimario: "Chest" })).toBe(
      "isolation",
    );
    expect(classifyExercise({ nome: "Lateral Raise", grupoPrimario: "Shoulders" })).toBe(
      "isolation",
    );
    expect(classifyExercise({ nome: "Cadeira extensora", grupoPrimario: "Quadríceps" })).toBe(
      "isolation",
    );
  });

  test("small muscle groups fall back to isolation", () => {
    expect(classifyExercise({ nome: "Skull Crusher", grupoPrimario: "Triceps" })).toBe("isolation");
    expect(classifyExercise({ nome: "Hammer Curl", grupoPrimario: "Biceps" })).toBe("isolation");
  });
});

describe("plateResolution", () => {
  test("dumbbells step by the rack, plate-loaded leg machines by 5 kg", () => {
    expect(plateResolution({ nome: "Dumbbell Fly", equipamento: "Dumbbells" })).toBe(2);
    expect(
      plateResolution({ nome: "Leg Press", grupoPrimario: "Quads", equipamento: "Machine" }),
    ).toBe(5);
    expect(plateResolution({ nome: "Bench Press", equipamento: "Barbell" })).toBe(2.5);
    expect(plateResolution({ nome: "Cable Curl", equipamento: "Cable" })).toBe(2.5);
  });
});

describe("loadIncrement", () => {
  const legPress = { nome: "Leg Press", grupoPrimario: "Quads", equipamento: "Machine" };
  const bench = { nome: "Bench Press", grupoPrimario: "Chest", equipamento: "Barbell" };
  const dbPress = {
    nome: "Dumbbell Bench Press",
    grupoPrimario: "Chest",
    equipamento: "Dumbbells",
  };
  const lateral = { nome: "Lateral Raise", grupoPrimario: "Shoulders", equipamento: "Dumbbells" };
  const curl = { nome: "Cable Curl", grupoPrimario: "Biceps", equipamento: "Cable" };

  test("leg press jumps more than a dumbbell exercise at the same effort", () => {
    expect(loadIncrement(legPress, 200)).toBe(10);
    expect(loadIncrement(dbPress, 30)).toBe(2);
    expect(loadIncrement(legPress, 200)).toBeGreaterThan(loadIncrement(dbPress, 30));
  });

  test("percent of load, rounded to what the equipment can add", () => {
    expect(loadIncrement(legPress, 100)).toBe(5); // 5% → 5 kg
    expect(loadIncrement(legPress, 60)).toBe(5); // 3 kg → min plate step
    expect(loadIncrement(bench, 80)).toBe(2.5); // 2 kg → 2.5 plate
    expect(loadIncrement(bench, 120)).toBe(2.5); // 3 kg → 2.5
    expect(loadIncrement(bench, 140)).toBe(2.5); // 3.5 kg → 2.5 (rounds down)
    expect(loadIncrement(bench, 160)).toBe(5); // 4 kg → 5
    expect(loadIncrement(curl, 30)).toBe(2.5); // 0.6 kg → min plate step
  });

  test("never exceeds the class ceiling", () => {
    expect(loadIncrement(legPress, 400)).toBe(10);
    expect(loadIncrement(bench, 300)).toBe(5);
    expect(loadIncrement(curl, 200)).toBe(2.5);
  });

  test("dumbbells always move one rack step", () => {
    expect(loadIncrement(lateral, 8)).toBe(2);
    expect(loadIncrement(lateral, 14)).toBe(2);
  });

  test("falls back to the plate step when the load is unknown", () => {
    expect(loadIncrement(bench, 0)).toBe(2.5);
  });
});

describe("isBigJump", () => {
  test("the next dumbbell after 8 kg is a big jump; +2.5 on 80 kg is not", () => {
    expect(isBigJump(8, 2)).toBe(true);
    expect(isBigJump(80, 2.5)).toBe(false);
    expect(isBigJump(16, 2)).toBe(true); // 12.5%
    expect(isBigJump(20, 2)).toBe(false); // 10%
  });
});

describe("failureBackoff", () => {
  test("compound lifts drop ~5% rounded to a plate step", () => {
    expect(
      failureBackoff({ nome: "Leg Press", grupoPrimario: "Quads", equipamento: "Machine" }, 200),
    ).toBe(10);
    expect(
      failureBackoff({ nome: "Bench Press", grupoPrimario: "Chest", equipamento: "Barbell" }, 100),
    ).toBe(5);
    expect(
      failureBackoff({ nome: "Bench Press", grupoPrimario: "Chest", equipamento: "Barbell" }, 60),
    ).toBe(2.5);
  });

  test("returns 0 when one plate step would be a huge share of the load", () => {
    expect(
      failureBackoff(
        { nome: "Lateral Raise", grupoPrimario: "Shoulders", equipamento: "Dumbbells" },
        8,
      ),
    ).toBe(0);
    expect(failureBackoff({ nome: "Cable Curl", equipamento: "Cable" }, 10)).toBe(0);
  });
});
