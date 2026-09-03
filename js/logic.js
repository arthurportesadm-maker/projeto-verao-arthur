import { MEALS } from "./data.js";

export const round = (value, digits = 0) => Number(Number(value || 0).toFixed(digits));

export function kcalFromMacros(macros) {
  return round(macros.protein * 4 + macros.carbs * 4 + macros.fat * 9);
}

export function sumMacros(entries = []) {
  return entries.reduce((sum, entry) => ({
    kcal: sum.kcal + Number(entry?.kcal || 0),
    protein: sum.protein + Number(entry?.protein || 0),
    carbs: sum.carbs + Number(entry?.carbs || 0),
    fat: sum.fat + Number(entry?.fat || 0)
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

export function mealBaseTarget(mealId) {
  const target = MEALS.find(meal => meal.id === mealId)?.target || { protein: 0, carbs: 0, fat: 0 };
  return { ...target, kcal: kcalFromMacros(target) };
}

export function mealTargetForDay(mealId, day, dailyTargets) {
  if (!day?.rebalanceMode || day.rebalanceMode === "none") return mealBaseTarget(mealId);

  const entries = Object.values(day.meals || {}).filter(meal => meal.status === "done").flatMap(meal => meal.entries || (meal.entry ? [meal.entry] : []));
  const consumed = sumMacros(entries);
  const remaining = {
    protein: Math.max(0, dailyTargets.protein - consumed.protein),
    carbs: Math.max(0, dailyTargets.carbs - consumed.carbs),
    fat: Math.max(0, dailyTargets.fat - consumed.fat)
  };
  const pendingIds = MEALS.filter(meal => day.meals?.[meal.id]?.status === "pending").map(meal => meal.id);
  if (!pendingIds.includes(mealId) || !pendingIds.length) return mealBaseTarget(mealId);

  if (day.rebalanceMode === "protein") {
    const base = mealBaseTarget(mealId);
    const protein = round(remaining.protein / pendingIds.length);
    const pendingBase = pendingIds.map(mealBaseTarget);
    const baseCarbs = pendingBase.reduce((sum, item) => sum + item.carbs, 0) || 1;
    const baseFat = pendingBase.reduce((sum, item) => sum + item.fat, 0) || 1;
    const result = {
      protein,
      carbs: round(remaining.carbs * (base.carbs / baseCarbs)),
      fat: round(remaining.fat * (base.fat / baseFat))
    };
    return { ...result, kcal: kcalFromMacros(result), adjusted: true };
  }

  const result = {
    protein: round(remaining.protein / pendingIds.length),
    carbs: round(remaining.carbs / pendingIds.length),
    fat: round(remaining.fat / pendingIds.length)
  };
  return { ...result, kcal: kcalFromMacros(result), adjusted: true };
}

export function progressionForExercise(exercise, sets = [], increment = 0) {
  const completed = sets.filter(set => set.completed);
  if (!completed.length) return { action: "none", label: "Sem dados suficientes", reason: "Registre ao menos uma série concluída." };
  if (completed.some(set => set.pain || set.technique === "bad")) {
    return { action: "review", label: "Revisar ou reduzir carga", reason: "Houve dor ou perda de técnica; a prioridade é executar com segurança." };
  }
  if (completed.some(set => Number(set.rir) <= 0 || Number(set.reps) < exercise.minReps)) {
    return { action: "hold", label: "Manter ou reduzir carga", reason: "O esforço passou do alvo ou as repetições ficaram abaixo da faixa." };
  }
  const allAtTop = completed.length === exercise.sets && completed.every(set => Number(set.reps) >= exercise.maxReps && Number(set.rir) >= 2);
  const bestWeight = Math.max(...completed.map(set => Number(set.kg) || 0));
  if (allAtTop) {
    const next = round(bestWeight + Number(increment || exercise.increment || 0), 1);
    return { action: "increase", label: `Próxima sessão: ${next} kg`, reason: `Você atingiu ${exercise.maxReps} reps nas ${exercise.sets} séries com RIR adequado.` };
  }
  return { action: "reps", label: "Manter carga e buscar +1 rep", reason: "Você ainda não chegou ao topo da faixa em todas as séries." };
}

export function workoutVolume(workout) {
  return round((workout?.exercises || []).reduce((total, exercise) => total + exercise.sets.reduce((sum, set) => {
    return sum + (set.completed ? Number(set.kg || 0) * Number(set.reps || 0) : 0);
  }, 0), 0));
}

export function formatDuration(seconds = 0) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export function isoToday(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
