import test from "node:test";
import assert from "node:assert/strict";
import { DAILY_TARGETS } from "../js/data.js";
import { kcalFromMacros, mealTargetForDay, progressionForExercise, sumMacros, workoutVolume } from "../js/logic.js";

test("calcula energia a partir dos macronutrientes", () => {
  assert.equal(kcalFromMacros({ protein: 180, carbs: 280, fat: 85 }), 2605);
});

test("soma registros alimentares", () => {
  assert.deepEqual(sumMacros([{ kcal: 500, protein: 30, carbs: 50, fat: 15 }, { kcal: 600, protein: 40, carbs: 60, fat: 20 }]), {
    kcal: 1100, protein: 70, carbs: 110, fat: 35
  });
});

test("redistribui o restante após refeição pulada", () => {
  const day = {
    rebalanceMode: "auto",
    meals: {
      breakfast: { status: "done", entry: { kcal: 628, protein: 42, carbs: 70, fat: 20 } },
      lunch: { status: "skipped" }, snack: { status: "pending" }, dinner: { status: "pending" }
    }
  };
  const target = mealTargetForDay("snack", day, DAILY_TARGETS);
  assert.equal(target.protein, 69);
  assert.equal(target.carbs, 105);
  assert.equal(target.fat, 33);
  assert.equal(target.adjusted, true);
});

test("recomenda menor incremento após atingir topo com RIR adequado", () => {
  const exercise = { sets: 2, minReps: 6, maxReps: 10, increment: 5 };
  const result = progressionForExercise(exercise, [
    { completed: true, kg: 80, reps: 10, rir: 2, technique: "good", pain: false },
    { completed: true, kg: 80, reps: 10, rir: 3, technique: "good", pain: false }
  ], 5);
  assert.equal(result.action, "increase");
  assert.match(result.label, /85 kg/);
});

test("impede progressão quando há dor", () => {
  const result = progressionForExercise({ sets: 2, minReps: 6, maxReps: 10 }, [
    { completed: true, kg: 80, reps: 10, rir: 2, technique: "good", pain: true }
  ], 5);
  assert.equal(result.action, "review");
});

test("calcula volume apenas de séries concluídas", () => {
  const volume = workoutVolume({ exercises: [{ sets: [
    { completed: true, kg: 50, reps: 10 }, { completed: false, kg: 50, reps: 10 }
  ] }] });
  assert.equal(volume, 500);
});
