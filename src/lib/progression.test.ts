import { describe, expect, test } from "bun:test";
import { suggestProgression, type PrevSet } from "./progression";

function sets(pesoKg: number, reps: number[], rpe?: number): PrevSet[] {
  return reps.map((r) => ({
    pesoKg,
    reps: r,
    tipoSerie: "normal" as const,
    ...(rpe !== undefined ? { rpe } : {}),
  }));
}

const legPress = { nome: "Leg Press", grupoPrimario: "Quads", equipamento: "Machine" };
const bench = { nome: "Bench Press", grupoPrimario: "Chest", equipamento: "Barbell" };
const lateral = { nome: "Lateral Raise", grupoPrimario: "Shoulders", equipamento: "Dumbbells" };

describe("suggestProgression — step size by exercise class", () => {
  test("leg press at the top of the range jumps 5% (10 kg at 200)", () => {
    const s = suggestProgression({
      ...legPress,
      anteriores: sets(200, [12, 12, 12], 8),
      repsMin: 8,
      repsMax: 12,
    });
    expect(s?.aumentou).toBe(true);
    expect(s?.classe).toBe("lower-compound");
    expect(s?.incrementoKg).toBe(10);
    expect(s?.pesoSugerido).toBe(210);
    expect(s?.incrementoPct).toBe(5);
  });

  test("bench at the top of the range jumps one plate (2.5 kg at 80)", () => {
    const s = suggestProgression({
      ...bench,
      anteriores: sets(80, [12, 12, 12], 8),
      repsMin: 8,
      repsMax: 12,
    });
    expect(s?.aumentou).toBe(true);
    expect(s?.classe).toBe("upper-compound");
    expect(s?.incrementoKg).toBe(2.5);
    expect(s?.pesoSugerido).toBe(82.5);
  });
});

describe("suggestProgression — gates", () => {
  test("holds when any set is under the top of the range", () => {
    const s = suggestProgression({
      ...bench,
      anteriores: sets(80, [12, 12, 10], 8),
      repsMin: 8,
      repsMax: 12,
    });
    expect(s?.aumentou).toBe(false);
    expect(s?.pesoSugerido).toBe(80);
  });

  test("holds when the average RPE was 9.5 or more (session at the limit)", () => {
    const s = suggestProgression({
      ...bench,
      anteriores: sets(80, [12, 12, 12], 9.5),
      repsMin: 8,
      repsMax: 12,
    });
    expect(s?.aumentou).toBe(false);
    expect(s?.motivo).toContain("High RPE");
  });

  test("holds at RPE 8.5-9 with reps at the top and says why", () => {
    const s = suggestProgression({
      ...bench,
      anteriores: sets(80, [12, 12, 12], 9),
      repsMin: 8,
      repsMax: 12,
    });
    expect(s?.aumentou).toBe(false);
    expect(s?.motivo).toContain("too close to the limit");
  });

  test("a big relative jump (next dumbbell = +25%) needs RPE 7 or easier", () => {
    const atEight = suggestProgression({
      ...lateral,
      anteriores: sets(8, [15, 15, 15], 8),
      repsMin: 10,
      repsMax: 15,
    });
    expect(atEight?.aumentou).toBe(false);
    expect(atEight?.motivo).toContain("+25%");

    const atSeven = suggestProgression({
      ...lateral,
      anteriores: sets(8, [15, 15, 15], 7),
      repsMin: 10,
      repsMax: 15,
    });
    expect(atSeven?.aumentou).toBe(true);
    expect(atSeven?.pesoSugerido).toBe(10);
  });

  test("a big relative jump without RPE needs two reps past the top of the range", () => {
    const justTop = suggestProgression({
      ...lateral,
      anteriores: sets(8, [15, 15, 15]),
      repsMin: 10,
      repsMax: 15,
    });
    expect(justTop?.aumentou).toBe(false);

    const twoOver = suggestProgression({
      ...lateral,
      anteriores: sets(8, [17, 17, 17]),
      repsMin: 10,
      repsMax: 15,
    });
    expect(twoOver?.aumentou).toBe(true);
  });

  test("a normal jump without RPE increases at the top of the range", () => {
    const s = suggestProgression({
      ...bench,
      anteriores: sets(80, [12, 12, 12]),
      repsMin: 8,
      repsMax: 12,
    });
    expect(s?.aumentou).toBe(true);
  });

  test("warm-up and timed sets are ignored", () => {
    const s = suggestProgression({
      ...bench,
      anteriores: [
        { pesoKg: 40, reps: 12, tipoSerie: "aquecimento" },
        ...sets(80, [12, 12, 12], 8),
      ],
      repsMin: 8,
      repsMax: 12,
    });
    expect(s?.pesoAnterior).toBe(80);
    expect(s?.aumentou).toBe(true);
  });
});
