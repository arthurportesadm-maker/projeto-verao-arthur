import {
  BLOCKS, DAILY_TARGETS, MEALS, MEAL_FORMULAS, READY_MEALS, RECIPES, WORKOUTS, exerciseFromRow
} from "./data.js";
import {
  formatDuration, isoToday, mealTargetForDay, progressionForExercise, round, sumMacros, workoutVolume
} from "./logic.js";
import {
  allowedUsername, cloudConfigured, queueCloudWrite, readCloudState, signIn, signOut, writeCloudState
} from "./cloud.js";

const STORAGE_KEY = "meu-plano-alex-v1";
const app = document.querySelector("#app");
const nav = document.querySelector("#bottomNav");
const modalRoot = document.querySelector("#modalRoot");
const toast = document.querySelector("#toast");
let activeTab = "hoje";
let expandedExercises = false;
let workoutChoice = null;
let installPrompt = null;
let tickHandle = null;
let authUnlocked = false;
let authBusy = false;
let syncStatus = "local";
let hydrating = false;

function newDay() {
  return {
    meals: Object.fromEntries(MEALS.map(meal => [meal.id, { status: "pending", entries: [] }])),
    water: 0,
    rebalanceMode: null,
    skipMessage: null
  };
}

function defaultState() {
  return {
    version: 2,
    profile: { name: "Alex Mendonça", age: 18, height: 1.8, weight: 125, bodyFatGoal: 15 },
    targets: { ...DAILY_TARGETS },
    days: {},
    favorites: [],
    measurements: [{ date: isoToday(), weight: 125, waist: null }],
    workoutHistory: [],
    increments: {},
    builder: {
      mealId: "dinner",
      selections: Object.fromEntries(Object.keys(BLOCKS).map(key => [key, 0])),
      templates: {},
      recipeId: null
    },
    activeWorkout: null
  };
}

function normalizeState(saved) {
  const base = defaultState();
  if (!saved) return base;
  return {
    ...base,
    ...saved,
    version: 2,
    profile: { ...base.profile, ...(saved.profile || {}) },
    targets: { ...base.targets, ...(saved.targets || {}) },
    builder: { ...base.builder, ...(saved.builder || {}), selections: { ...base.builder.selections, ...(saved.builder?.selections || {}) } }
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return normalizeState(saved);
  } catch {
    return defaultState();
  }
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (authUnlocked && !hydrating && cloudConfigured()) {
    queueCloudWrite(state, status => {
      syncStatus = status;
      updateSyncBadge();
    });
  }
}

function todayDay() {
  const key = isoToday();
  if (!state.days[key]) {
    state.days[key] = newDay();
    saveState();
  }
  return state.days[key];
}

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function brDate(date = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).format(date).replace(".", "");
}

function percent(value, total) {
  return Math.max(0, Math.min(100, round((Number(value || 0) / Math.max(1, Number(total || 1))) * 100)));
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(Number(value || 0));
}

function mealInfo(id) {
  return MEALS.find(meal => meal.id === id) || MEALS[0];
}

function allDayEntries(day = todayDay()) {
  return Object.values(day.meals).flatMap(meal => meal.entries || []);
}

function consumed(day = todayDay()) {
  return sumMacros(allDayEntries(day));
}

function mealEntriesSummary(meal) {
  const items = meal.entries || [];
  if (!items.length) return "Ainda não registrada";
  if (items.length === 1) return items[0].name;
  return `${items.length} registros`;
}

function macroCard(kind, label, value, target, unit = "g") {
  return `<div class="macro ${kind}">
    <div class="macro-top"><span>${label}</span><span>${percent(value, target)}%</span></div>
    <strong>${formatNumber(value)} / ${formatNumber(target)} ${unit}</strong>
    <div class="bar"><i style="width:${percent(value, target)}%"></i></div>
  </div>`;
}

function topbar(title, subtitle, pill = "") {
  return `<header class="topbar"><div class="topbar-row"><div><h1>${title}</h1><p>${subtitle}</p></div>${pill ? `<span class="date-pill">${pill}</span>` : ""}</div>${authUnlocked ? `<div id="syncBadge" class="sync-badge ${syncStatus}">${syncStatusText()}</div>` : ""}</header>`;
}

function syncStatusText() {
  return ({ synced: "✓ Salvo no Supabase", pending: "↻ Salvando...", offline: "○ Offline — sincronização pendente", error: "! Falha ao sincronizar", local: "○ Dados locais" })[syncStatus] || "";
}

function updateSyncBadge() {
  const badge = document.querySelector("#syncBadge");
  if (!badge) return;
  badge.className = `sync-badge ${syncStatus}`;
  badge.textContent = syncStatusText();
}

function renderLogin(errorMessage = "") {
  nav.hidden = true;
  const configured = cloudConfigured();
  app.innerHTML = `<div class="login-page">
    <section class="login-card">
      <div class="login-logo"><img src="./icons/icon-192.png" alt=""></div>
      <span class="login-eyebrow">MEU PLANO</span>
      <h1>Bem-vindo</h1>
      <p class="login-intro">Acesse sua dieta, seus treinos e sua evolução.</p>
      ${!configured ? `<div class="login-alert"><strong>Conexão pendente</strong><br>Escolha o projeto Supabase para concluir a configuração segura.</div>` : ""}
      ${errorMessage ? `<div class="login-alert error" role="alert">${esc(errorMessage)}</div>` : ""}
      <form id="loginForm" autocomplete="on">
        <div class="field"><label for="loginUsername">Nome de acesso</label><input id="loginUsername" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" value="${esc(allowedUsername())}" ${!configured || authBusy ? "disabled" : ""}></div>
        <div class="field"><label for="loginPassword">Senha</label><div class="password-field"><input id="loginPassword" name="password" type="password" inputmode="numeric" autocomplete="current-password" ${!configured || authBusy ? "disabled" : ""}><button type="button" class="password-toggle" data-action="toggle-password" aria-label="Mostrar senha">◉</button></div></div>
        <button type="submit" class="btn btn-primary btn-block" data-action="login" ${!configured || authBusy ? "disabled" : ""}>${authBusy ? "Entrando..." : "Entrar com segurança"}</button>
      </form>
      <div class="security-note"><span>⌾</span><p><strong>Senha protegida pelo Supabase Auth</strong><br>Ela não fica escrita no aplicativo nem é salva junto com seus dados.</p></div>
    </section>
  </div>`;
}

async function performLogin() {
  if (authBusy) return;
  const usernameInput = document.querySelector("#loginUsername");
  const passwordInput = document.querySelector("#loginPassword");
  const username = usernameInput?.value || "";
  const password = passwordInput?.value || "";
  if (!username || !password) {
    renderLogin("Preencha o nome de acesso e a senha.");
    return;
  }
  authBusy = true;
  renderLogin();
  try {
    await signIn(username, password);
    const remoteState = await readCloudState();
    hydrating = true;
    if (remoteState) {
      state = normalizeState(remoteState);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      await writeCloudState(state);
    }
    hydrating = false;
    authUnlocked = true;
    syncStatus = "synced";
    authBusy = false;
    todayDay();
    render();
    if (state.activeWorkout) startTicking();
  } catch (error) {
    hydrating = false;
    authUnlocked = false;
    authBusy = false;
    renderLogin(error?.message || "Não foi possível entrar.");
  }
}

function nextWorkoutType() {
  if (workoutChoice) return workoutChoice;
  return state.workoutHistory.length % 2 === 0 ? "A" : "B";
}

function isWorkoutDay(date = new Date()) {
  return [1, 3, 5].includes(date.getDay());
}

function weeklyHistory() {
  const now = new Date();
  const monday = new Date(now);
  const delta = (now.getDay() + 6) % 7;
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - delta);
  return state.workoutHistory.filter(item => new Date(item.completedAt) >= monday);
}

function previousExercise(id) {
  for (let i = state.workoutHistory.length - 1; i >= 0; i -= 1) {
    const found = state.workoutHistory[i].exercises.find(exercise => exercise.id === id);
    if (found) return found;
  }
  return null;
}

function latestRecommendation() {
  const last = state.workoutHistory.at(-1);
  if (!last) return { label: "Comece registrando o primeiro treino", reason: "As sugestões aparecerão com base nas suas repetições, RIR, técnica e dor." };
  const rec = last.exercises.find(exercise => exercise.recommendation?.action !== "none")?.recommendation;
  return rec || { label: "Treino registrado", reason: "Continue acumulando histórico para receber sugestões." };
}

function renderToday() {
  const day = todayDay();
  const totals = consumed(day);
  const completedMeals = MEALS.filter(meal => day.meals[meal.id].status === "done").length;
  const workoutType = nextWorkoutType();
  const measurements = state.measurements.filter(item => item.weight).sort((a, b) => a.date.localeCompare(b.date));
  const latest = measurements.at(-1);
  const prior = measurements.length > 1 ? measurements.at(-2) : null;
  const weekly = weeklyHistory();

  app.innerHTML = `<div class="page">
    ${topbar(`Olá, ${esc(state.profile.name.split(" ")[0])}`, "Seu plano de hoje", brDate())}
    <section class="section">
      <div class="card hero-card">
        <div class="between"><span class="card-title">Resumo de hoje</span><span class="tag">Meta ${formatNumber(state.targets.kcal)} kcal</span></div>
        <div class="summary-grid">
          <div class="ring" style="--progress:${percent(totals.kcal, state.targets.kcal)}%"><div class="ring-value"><strong>${formatNumber(totals.kcal)}</strong><small>kcal consumidas</small></div></div>
          <div class="macro-lead"><span>Restam hoje</span><strong>${formatNumber(Math.max(0, state.targets.kcal - totals.kcal))} kcal</strong><span>${completedMeals} de 4 refeições concluídas</span></div>
        </div>
        <div class="macro-grid">
          ${macroCard("protein", "Proteína", totals.protein, state.targets.protein)}
          ${macroCard("carbs", "Carbo", totals.carbs, state.targets.carbs)}
          ${macroCard("fat", "Gordura", totals.fat, state.targets.fat)}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="between"><h2 class="section-title">Refeições</h2><button class="link-btn" data-action="go-diet">Registrar refeição</button></div>
      <div class="card flat meal-list">
        ${MEALS.map(meal => {
          const record = day.meals[meal.id];
          return `<div class="meal-row">
            <div class="status-icon ${record.status}">${record.status === "done" ? "✓" : record.status === "skipped" ? "–" : meal.icon}</div>
            <div><div class="meal-name">${meal.label}</div><div class="meal-detail">${esc(record.status === "skipped" ? "Refeição pulada" : mealEntriesSummary(record))}</div></div>
            <button class="link-btn meal-status ${record.status}" data-action="select-meal" data-meal="${meal.id}">${record.status === "done" ? "Concluída" : record.status === "skipped" ? "Desfazer" : "Registrar"}</button>
          </div>`;
        }).join("")}
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">${isWorkoutDay() ? "Treino do dia" : "Próximo treino"}</h2>
      <div class="card workout-hero">
        <div class="between"><span class="tag">FULL BODY</span><span class="card-meta">3x por semana</span></div>
        <h3 class="workout-title">Treino ${workoutType}</h3>
        <p class="card-meta">${isWorkoutDay() ? "Hoje é dia de treino." : "Planejado para seg/qua/sex."} Técnica, consistência e progressão gradual.</p>
        <div class="workout-facts"><span>6 exercícios</span><span>12 séries</span><span>~40 min</span></div>
        <button class="btn btn-block" data-action="start-workout" data-type="${workoutType}">▶ Iniciar treino ${workoutType}</button>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Evolução</h2>
      <div class="card flat mini-stats">
        <div class="mini-stat"><strong>${latest ? `${formatNumber(latest.weight)} kg` : "–"}</strong><small>Peso atual</small></div>
        <div class="mini-stat"><strong>${prior && latest ? `${round(latest.weight - prior.weight, 1) > 0 ? "+" : ""}${formatNumber(round(latest.weight - prior.weight, 1))} kg` : "–"}</strong><small>Última variação</small></div>
        <div class="mini-stat"><strong>${weekly.length}/3</strong><small>Treinos na semana</small></div>
      </div>
    </section>
  </div>`;
}

function renderDiet() {
  const day = todayDay();
  const totals = consumed(day);
  const selectedMeal = mealInfo(state.builder.mealId);
  const target = mealTargetForDay(selectedMeal.id, day, state.targets);
  const formula = MEAL_FORMULAS[selectedMeal.id];
  const selectedTemplate = READY_MEALS[selectedMeal.id].find(item => item.id === state.builder.templates?.[selectedMeal.id]);
  const selectedRecipe = RECIPES.find(item => item.id === state.builder.recipeId);
  const recipes = RECIPES.filter(recipe => recipe.meals.includes(selectedMeal.id));

  app.innerHTML = `<div class="page">
    ${topbar("Dieta", "Seu plano modular de hoje", `${formatNumber(state.targets.kcal)} kcal`)}
    ${day.skipMessage ? `<div class="banner warning"><span>↻</span><div><strong>${esc(day.skipMessage)}</strong><br>As metas abaixo refletem o restante do dia.</div><button class="link-btn" data-action="undo-skip">Desfazer</button></div>` : ""}
    <section class="section">
      <div class="card hero-card">
        <div class="between"><span class="card-title">Consumo do dia</span><strong>${formatNumber(totals.kcal)} / ${formatNumber(state.targets.kcal)} kcal</strong></div>
        <div class="bar" style="margin:10px 0 4px;height:7px"><i style="width:${percent(totals.kcal, state.targets.kcal)}%"></i></div>
        <div class="macro-grid">
          ${macroCard("protein", "Proteína", totals.protein, state.targets.protein)}
          ${macroCard("carbs", "Carbo", totals.carbs, state.targets.carbs)}
          ${macroCard("fat", "Gordura", totals.fat, state.targets.fat)}
        </div>
        <p class="card-meta" style="margin-top:10px">Faltam ${formatNumber(Math.max(0, state.targets.protein - totals.protein))} g de proteína. Valores estimados pela estrutura de blocos do plano.</p>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Montar refeição</h2>
      <p class="section-sub">Troque os blocos aqui mesmo. As porções equivalentes mantêm a estrutura do plano.</p>
      <div class="meal-tabs">
        ${MEALS.map(meal => `<button class="pill ${meal.id === selectedMeal.id ? "active" : ""}" data-action="builder-meal" data-meal="${meal.id}">${meal.short}</button>`).join("")}
      </div>
      <div class="card">
        <div class="between"><div><div class="card-title">${selectedMeal.label}</div><div class="card-meta">${target.adjusted ? `<span class="adjusted">Plano reajustado</span>` : "Fórmula original do plano"}</div></div><button class="link-btn" data-action="ready-meals">Modelos prontos</button></div>
        <div class="formula">${formula.map(item => `<span class="formula-chip">${item.count}× ${item.label || BLOCKS[item.key].label}</span>`).join("")}</div>
        ${selectedTemplate ? `<div class="banner success"><span>✓</span><div><strong>${esc(selectedTemplate.name)}</strong><br>${esc(selectedTemplate.items.join(" • "))}</div><button class="link-btn" data-action="clear-template">Limpar</button></div>` : ""}
        ${selectedRecipe ? `<div class="banner"><span>${selectedRecipe.icon}</span><div><strong>${esc(selectedRecipe.name)} + complementos</strong><br>Construtor ajustado ao alvo desta refeição.</div><button class="link-btn" data-action="clear-recipe">Limpar</button></div>` : ""}
        <div class="block-grid">
          ${formula.map(item => {
            const block = BLOCKS[item.key];
            const choice = block.items[state.builder.selections[item.key] || 0];
            return `<article class="food-block"><span class="block-badge ${block.color}">${item.key}</span><h4>${esc(choice[0])}</h4><p>${esc(choice[1])} × ${item.count}</p><button data-action="swap-block" data-block="${item.key}">Trocar ${item.label || block.label}</button></article>`;
          }).join("")}
        </div>
        <div class="target-strip">
          <span>Energia<b>~${formatNumber(target.kcal)} kcal</b></span><span>Proteína<b>${formatNumber(target.protein)} g</b></span><span>Carbo<b>${formatNumber(target.carbs)} g</b></span><span>Gordura<b>${formatNumber(target.fat)} g</b></span>
        </div>
        <div class="actions"><button class="btn btn-primary" data-action="register-meal">✓ Registrar refeição</button><button class="btn btn-secondary" data-action="favorite-meal">☆ Favoritar</button></div>
        <button class="btn btn-ghost btn-block" data-action="skip-meal" ${day.meals[selectedMeal.id].status === "skipped" ? "disabled" : ""}>Pular esta refeição</button>
      </div>
    </section>

    <section class="section">
      <div class="between"><div><h2 class="section-title">Receitas para ${selectedMeal.label.toLowerCase()}</h2><p class="section-sub">Ideias do seu plano com ingredientes e preparo.</p></div></div>
      <div class="scroll-cards">
        ${recipes.map(recipe => `<article class="recipe-card"><div class="recipe-icon">${recipe.icon}</div><h4>${esc(recipe.name)}</h4><div class="recipe-macro">${recipe.kcal} kcal • ${recipe.protein} g proteína</div><button class="link-btn" data-action="recipe-detail" data-recipe="${recipe.id}">Ver receita →</button></article>`).join("")}
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Água</h2>
      <div class="card water-control"><button class="circle-btn" data-action="water" data-amount="-250">−</button><div class="water-center"><strong>${formatNumber(day.water / 1000)} L</strong><small>meta pessoal: 3-4 L/dia</small><div class="bar" style="margin-top:8px"><i style="width:${percent(day.water, 3500)}%"></i></div></div><button class="circle-btn" data-action="water" data-amount="250">+</button></div>
    </section>
  </div>`;
}

function renderTraining() {
  const type = nextWorkoutType();
  const workout = WORKOUTS[type];
  const exercises = workout.exercises.map(exerciseFromRow);
  const visible = expandedExercises ? exercises : exercises.slice(0, 3);
  const week = weeklyHistory();
  const minutes = week.reduce((sum, item) => sum + Math.round(item.duration / 60), 0);
  const volume = week.reduce((sum, item) => sum + item.volume, 0);
  const rec = latestRecommendation();

  app.innerHTML = `<div class="page">
    ${topbar("Treino", "Seu plano full body", "3×/semana")}
    <section class="section">
      <h2 class="section-title">Resumo da semana</h2>
      <div class="card flat mini-stats">
        <div class="mini-stat"><strong>${week.length}/3</strong><small>Concluídos</small></div>
        <div class="mini-stat"><strong>${minutes}</strong><small>Minutos</small></div>
        <div class="mini-stat"><strong>${formatNumber(volume)}</strong><small>kg de volume</small></div>
      </div>
    </section>
    <section class="section">
      <h2 class="section-title">Próximo treino</h2>
      <div class="card workout-hero">
        <div class="between"><span class="tag">TREINO ${type}</span><span class="card-meta">~40 min</span></div>
        <h3 class="workout-title">Full body • ${exercises.length} exercícios</h3>
        <p class="card-meta">2 séries por exercício, com RIR e descanso guiado.</p>
        <div class="actions"><button class="btn" data-action="start-workout" data-type="${type}">▶ Iniciar treino</button><button class="btn btn-secondary" data-action="switch-workout">Trocar para ${type === "A" ? "B" : "A"}</button></div>
      </div>
    </section>
    <section class="section">
      <h2 class="section-title">Exercícios de hoje</h2>
      <div class="card flat exercise-list">
        ${visible.map((exercise, index) => {
          const previous = previousExercise(exercise.id);
          const best = previous?.sets?.filter(set => set.completed).sort((a, b) => (b.kg * b.reps) - (a.kg * a.reps))[0];
          return `<div class="exercise-row"><div class="exercise-glyph">${index + 1}</div><div><div class="exercise-name">${esc(exercise.name)}</div><div class="exercise-meta">${exercise.sets} séries • ${exercise.minReps}-${exercise.maxReps} reps • ${exercise.rest}s</div></div><div class="previous">${best ? `Anterior<br><b>${best.kg} kg × ${best.reps}</b>` : "Sem histórico"}</div></div>`;
        }).join("")}
        <button class="btn btn-secondary btn-block" data-action="toggle-exercises">${expandedExercises ? "Mostrar menos" : `Ver tudo (${exercises.length})`}</button>
      </div>
      ${type === "B" ? `<p class="section-sub" style="margin-top:8px">* Sem hack disponível: use o leg press novamente.</p>` : ""}
    </section>
    <section class="section">
      <h2 class="section-title">Progressão</h2>
      <div class="card progression-card"><strong>${esc(rec.label)}</strong><p>${esc(rec.reason)}</p></div>
    </section>
  </div>`;
}

function measurementChart(measurements) {
  const values = measurements.slice(-10).filter(item => item.weight);
  if (values.length < 2) return `<div class="empty"><strong>Registre mais uma medida</strong>A tendência aparecerá após dois registros de peso.</div>`;
  const min = Math.min(...values.map(item => item.weight));
  const max = Math.max(...values.map(item => item.weight));
  const spread = Math.max(1, max - min);
  const points = values.map((item, index) => {
    const x = 24 + index * (292 / Math.max(1, values.length - 1));
    const y = 120 - ((item.weight - min) / spread) * 86;
    return { x, y, item };
  });
  const line = points.map(point => `${point.x},${point.y}`).join(" ");
  const area = `24,130 ${line} 316,130`;
  return `<svg class="chart" viewBox="0 0 340 150" role="img" aria-label="Evolução do peso"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b6bcb" stop-opacity=".22"/><stop offset="1" stop-color="#0b6bcb" stop-opacity="0"/></linearGradient></defs><line x1="24" y1="130" x2="316" y2="130" stroke="#dfe7f1"/><polygon class="chart-area" points="${area}"/><polyline class="chart-line" points="${line}"/>${points.map(point => `<circle class="chart-dot" cx="${point.x}" cy="${point.y}" r="4"/>`).join("")}<text x="24" y="146">${values[0].date.slice(5).split("-").reverse().join("/")}</text><text x="285" y="146">${values.at(-1).date.slice(5).split("-").reverse().join("/")}</text><text x="270" y="18">${formatNumber(values.at(-1).weight)} kg</text></svg>`;
}

function renderEvolution() {
  const measurements = [...state.measurements].sort((a, b) => a.date.localeCompare(b.date));
  const latest = measurements.at(-1);
  const first = measurements[0];
  const history30 = state.workoutHistory.filter(item => Date.now() - new Date(item.completedAt).getTime() <= 30 * 86400000);
  const volume30 = history30.reduce((sum, item) => sum + item.volume, 0);
  const duration30 = history30.reduce((sum, item) => sum + item.duration, 0);
  const performance = [];
  Object.values(WORKOUTS).flatMap(workout => workout.exercises.map(exerciseFromRow)).forEach(exercise => {
    const prev = previousExercise(exercise.id);
    if (!prev) return;
    const best = prev.sets.filter(set => set.completed).sort((a, b) => (b.kg * b.reps) - (a.kg * a.reps))[0];
    if (best && !performance.some(item => item.id === exercise.id)) performance.push({ ...exercise, best });
  });

  app.innerHTML = `<div class="page">
    ${topbar("Evolução", "Tendências com os seus dados", "Últimos 30 dias")}
    <section class="section">
      <div class="between"><h2 class="section-title">Resumo</h2><button class="link-btn" data-action="add-measurement">+ Registrar medida</button></div>
      <div class="card flat mini-stats">
        <div class="mini-stat"><strong>${history30.length}</strong><small>Treinos</small></div>
        <div class="mini-stat"><strong>${formatNumber(volume30)}</strong><small>kg de volume</small></div>
        <div class="mini-stat"><strong>${Math.floor(duration30 / 3600)}h ${Math.floor((duration30 % 3600) / 60)}m</strong><small>Tempo</small></div>
      </div>
    </section>
    <section class="section"><div class="card"><div class="between"><div><div class="card-title">Peso corporal</div><div class="card-meta">${latest ? `${formatNumber(latest.weight)} kg hoje` : "Sem registro"}</div></div>${first && latest && measurements.length > 1 ? `<span class="tag">${round(latest.weight - first.weight, 1) > 0 ? "+" : ""}${formatNumber(round(latest.weight - first.weight, 1))} kg</span>` : ""}</div>${measurementChart(measurements)}</div></section>
    <section class="section"><h2 class="section-title">Performance nos exercícios</h2><div class="card flat exercise-list">${performance.length ? performance.slice(0, 5).map((item, index) => `<div class="exercise-row"><div class="exercise-glyph">${index + 1}</div><div><div class="exercise-name">${esc(item.name)}</div><div class="exercise-meta">Melhor série recente</div></div><div class="previous"><b>${item.best.kg} kg × ${item.best.reps}</b><br>RIR ${item.best.rir}</div></div>`).join("") : `<div class="empty"><strong>Ainda sem performance registrada</strong>Conclua o primeiro treino para ver carga e repetições.</div>`}</div></section>
    <section class="section"><h2 class="section-title">Medidas</h2><div class="card settings-list"><div class="setting-row"><strong>Peso atual</strong><span>${latest ? `${formatNumber(latest.weight)} kg` : "Não informado"}</span></div><div class="setting-row"><strong>Cintura</strong><span>${latest?.waist ? `${formatNumber(latest.waist)} cm` : "Não informada"}</span></div><div class="setting-row"><strong>Composição corporal</strong><span>Somente se você registrar</span></div></div></section>
  </div>`;
}

function renderProfile() {
  const latest = [...state.measurements].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  app.innerHTML = `<div class="page">
    ${topbar("Perfil", "Metas e preferências pessoais")}
    <section class="section"><div class="card profile-card"><div class="avatar">AM</div><div><div class="profile-name">${esc(state.profile.name)}</div><div class="profile-meta">${state.profile.age} anos • ${formatNumber(state.profile.height)} m<br>${latest?.weight ? `${formatNumber(latest.weight)} kg` : "Peso não informado"}</div></div><button class="link-btn" data-action="edit-profile">Editar</button></div></section>
    <section class="section"><div class="between"><h2 class="section-title">Meu objetivo</h2><button class="link-btn" data-action="edit-profile">Editar</button></div><div class="card"><div class="row" style="gap:12px"><div class="recipe-icon">◎</div><div><div class="card-title">Chegar a ${formatNumber(state.profile.bodyFatGoal)}% de gordura</div><div class="card-meta">Perder gordura gradualmente e preservar massa magra.</div></div></div></div></section>
    <section class="section"><div class="between"><h2 class="section-title">Metas nutricionais</h2><button class="link-btn" data-action="edit-targets">Editar</button></div><div class="card flat mini-stats"><div class="mini-stat"><strong>${formatNumber(state.targets.kcal)}</strong><small>kcal/dia</small></div><div class="mini-stat"><strong>${formatNumber(state.targets.protein)} g</strong><small>Proteína</small></div><div class="mini-stat"><strong>${formatNumber(state.targets.carbs)} g</strong><small>Carbo</small></div></div><div class="card flat settings-list"><div class="setting-row"><strong>Gordura diária</strong><span>${formatNumber(state.targets.fat)} g</span></div><div class="setting-row"><strong>Revisão do plano</strong><span>Após 2-3 semanas de boa adesão</span></div></div></section>
    <section class="section"><h2 class="section-title">Preferências alimentares</h2><div class="card"><div class="card-title">Restrições do seu plano</div><ul class="restriction-list"><li>Sem carne de porco.</li><li>Peixes somente com escamas.</li><li>Carne bovina sem leite ou derivados na mesma refeição.</li><li>Óleos, castanhas, queijo, molhos e pasta de amendoim devem ser medidos.</li></ul></div></section>
    <section class="section"><h2 class="section-title">Configurações</h2><div class="card settings-list"><div class="setting-row"><strong>Dados e privacidade</strong><span>Supabase + cópia offline</span></div><div class="setting-row"><strong>Sincronização</strong><span>${syncStatusText()}</span></div><div class="setting-row"><strong>Unidades</strong><span>kg, cm e ml</span></div><div class="setting-row"><strong>Progressão</strong><button class="link-btn" data-action="edit-increments">Editar incrementos</button></div><div class="setting-row"><strong>Instalação</strong><button class="link-btn" data-action="install-app">Instalar no Android</button></div></div></section>
    <section class="section"><button class="btn btn-secondary btn-block" data-action="logout">Sair da conta</button><button class="btn btn-danger btn-block" style="margin-top:8px" data-action="reset-data">Apagar meus registros</button><p class="section-sub" style="text-align:center;margin-top:8px">As metas e porções são iniciais e não substituem acompanhamento profissional.</p></section>
  </div>`;
}

function render() {
  if (!authUnlocked) {
    renderLogin();
    return;
  }
  if (state.activeWorkout) {
    nav.hidden = true;
    renderActiveWorkout();
    return;
  }
  nav.hidden = false;
  document.querySelectorAll(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.tab === activeTab));
  ({ hoje: renderToday, dieta: renderDiet, treino: renderTraining, evolucao: renderEvolution, perfil: renderProfile }[activeTab] || renderToday)();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function closeModal() {
  modalRoot.innerHTML = "";
}

function openModal(content) {
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true">${content}</section></div>`;
  modalRoot.querySelector("input")?.focus();
}

function modalHead(title, subtitle = "") {
  return `<div class="modal-head"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ""}</div><button class="close-btn" data-action="close-modal" aria-label="Fechar">×</button></div>`;
}

function openBlockOptions(key) {
  const block = BLOCKS[key];
  openModal(`${modalHead(`Trocar ${block.label}`, "Escolha uma porção equivalente do seu plano.")}<div class="option-list">${block.items.map((item, index) => `<button class="option ${index === state.builder.selections[key] ? "selected" : ""}" data-action="choose-block" data-block="${key}" data-index="${index}"><span><strong>${esc(item[0])}</strong><span>${esc(item[1])}</span></span><b>${index === state.builder.selections[key] ? "✓" : ""}</b></button>`).join("")}</div>`);
}

function openReadyMeals() {
  const meal = mealInfo(state.builder.mealId);
  openModal(`${modalHead(`Modelos para ${meal.label.toLowerCase()}`, "Combinações exatas do seu plano pessoal.")}<div class="option-list">${READY_MEALS[meal.id].map(item => `<button class="option ${state.builder.templates?.[meal.id] === item.id ? "selected" : ""}" data-action="choose-template" data-template="${item.id}"><span><strong>${esc(item.name)}</strong><span>${esc(item.items.join(" • "))}</span></span><b>›</b></button>`).join("")}</div>`);
}

function openRecipe(id) {
  const recipe = RECIPES.find(item => item.id === id);
  if (!recipe) return;
  openModal(`${modalHead(recipe.name, `${recipe.kcal} kcal • ${recipe.protein} g de proteína`)}<div class="recipe-icon">${recipe.icon}</div><h3 class="section-title" style="margin-top:14px">Ingredientes</h3><ul class="ingredients">${recipe.ingredients.map(item => `<li>${esc(item)}</li>`).join("")}</ul><h3 class="section-title">Preparo</h3><div class="prep">${esc(recipe.prep)}</div><button class="btn btn-primary btn-block" style="margin-top:14px" data-action="use-recipe" data-recipe="${recipe.id}">Usar no construtor + complementos</button>`);
}

function openSkipMeal() {
  const meal = mealInfo(state.builder.mealId);
  if (todayDay().meals[meal.id].status === "done") {
    showToast("Esta refeição já foi registrada.");
    return;
  }
  openModal(`${modalHead(`Pular ${meal.label.toLowerCase()}?`, "A meta diária não será alterada; apenas o restante de hoje pode ser redistribuído.")}<div class="option-list"><button class="option" data-action="confirm-skip" data-mode="auto"><span><strong>Reajustar automaticamente</strong><span>Divide calorias e macros restantes entre as próximas refeições.</span></span><b>›</b></button><button class="option" data-action="confirm-skip" data-mode="protein"><span><strong>Priorizar proteína</strong><span>Proteína restante vira a âncora; carbo e gordura seguem proporcionais.</span></span><b>›</b></button><button class="option" data-action="confirm-skip" data-mode="none"><span><strong>Não reajustar</strong><span>Apenas marca a refeição como pulada.</span></span><b>›</b></button></div>`);
}

function openMeasurement() {
  openModal(`${modalHead("Registrar medida", "Use dados medidos por você; nenhum valor será estimado.")}<div class="field-grid"><div class="field"><label for="measureDate">Data</label><input id="measureDate" type="date" value="${isoToday()}" max="${isoToday()}"></div><div class="field"><label for="measureWeight">Peso (kg)</label><input id="measureWeight" type="number" min="30" max="400" step="0.1" placeholder="Ex.: 124,5"></div><div class="field full"><label for="measureWaist">Cintura (cm, opcional)</label><input id="measureWaist" type="number" min="30" max="300" step="0.1" placeholder="Ex.: 118"></div></div><button class="btn btn-primary btn-block" data-action="save-measurement">Salvar medida</button>`);
}

function openProfileEditor() {
  openModal(`${modalHead("Editar perfil", "Atualize apenas as informações que você mede ou conhece.")}<div class="field-grid"><div class="field full"><label for="profileName">Nome</label><input id="profileName" value="${esc(state.profile.name)}"></div><div class="field"><label for="profileAge">Idade</label><input id="profileAge" type="number" min="14" max="100" value="${state.profile.age}"></div><div class="field"><label for="profileHeight">Altura (m)</label><input id="profileHeight" type="number" min="1" max="2.5" step="0.01" value="${state.profile.height}"></div><div class="field full"><label for="profileGoal">Meta de gordura corporal (%)</label><input id="profileGoal" type="number" min="3" max="60" step="0.5" value="${state.profile.bodyFatGoal}"></div></div><button class="btn btn-primary btn-block" data-action="save-profile">Salvar alterações</button>`);
}

function openTargetsEditor() {
  openModal(`${modalHead("Editar metas", "O plano inicial usa 2.600 kcal, 180 g de proteína, 280 g de carboidrato e 85 g de gordura.")}<div class="field-grid"><div class="field"><label for="targetKcal">Calorias</label><input id="targetKcal" type="number" min="1000" max="6000" step="50" value="${state.targets.kcal}"></div><div class="field"><label for="targetProtein">Proteína (g)</label><input id="targetProtein" type="number" min="40" max="400" value="${state.targets.protein}"></div><div class="field"><label for="targetCarbs">Carboidrato (g)</label><input id="targetCarbs" type="number" min="40" max="800" value="${state.targets.carbs}"></div><div class="field"><label for="targetFat">Gordura (g)</label><input id="targetFat" type="number" min="20" max="250" value="${state.targets.fat}"></div></div><button class="btn btn-primary btn-block" data-action="save-targets">Salvar metas</button>`);
}

function openIncrementsEditor() {
  const exercises = [];
  Object.values(WORKOUTS).forEach(workout => workout.exercises.map(exerciseFromRow).forEach(exercise => {
    if (!exercises.some(item => item.id === exercise.id)) exercises.push(exercise);
  }));
  openModal(`${modalHead("Incrementos disponíveis", "O app nunca recomendará uma carga intermediária que seu equipamento não oferece.")}<div class="field-grid">${exercises.map(exercise => `<div class="field full"><label for="inc-${exercise.id}">${esc(exercise.name)} (kg)</label><input id="inc-${exercise.id}" data-increment-id="${exercise.id}" type="number" min="0.5" max="50" step="0.5" value="${state.increments[exercise.id] ?? exercise.increment}"></div>`).join("")}</div><button class="btn btn-primary btn-block" data-action="save-increments">Salvar incrementos</button>`);
}

function startWorkout(type) {
  const workout = WORKOUTS[type];
  state.activeWorkout = {
    type,
    startedAt: Date.now(),
    currentIndex: 0,
    restRemaining: 0,
    restTotal: 0,
    restPaused: false,
    exercises: workout.exercises.map(row => {
      const exercise = exerciseFromRow(row);
      const previous = previousExercise(exercise.id);
      return {
        ...exercise,
        technique: "good",
        pain: false,
        sets: Array.from({ length: exercise.sets }, (_, index) => ({
          number: index + 1,
          kg: previous?.sets?.[index]?.kg ?? "",
          reps: "",
          rir: "",
          completed: false
        }))
      };
    })
  };
  saveState();
  render();
  startTicking();
}

function activeExercise() {
  return state.activeWorkout?.exercises[state.activeWorkout.currentIndex];
}

function renderActiveWorkout() {
  const workout = state.activeWorkout;
  if (!workout) return;
  const exercise = activeExercise();
  const previous = previousExercise(exercise.id);
  const bestPrev = previous?.sets?.filter(set => set.completed).sort((a, b) => (b.kg * b.reps) - (a.kg * a.reps))[0];
  const next = workout.exercises[workout.currentIndex + 1];
  const completedSets = workout.exercises.reduce((sum, item) => sum + item.sets.filter(set => set.completed).length, 0);
  const totalSets = workout.exercises.reduce((sum, item) => sum + item.sets.length, 0);
  const elapsed = Math.floor((Date.now() - workout.startedAt) / 1000);

  app.innerHTML = `<div class="active-shell">
    <header class="active-header"><button class="circle-btn dark-btn" data-action="leave-workout">‹</button><div><h1>TREINO ${workout.type}</h1><p>${workout.currentIndex + 1} / ${workout.exercises.length} exercícios • ${completedSets}/${totalSets} séries</p></div><button class="btn dark-btn" data-action="finish-workout"><span id="elapsedTime" class="active-timer">${formatDuration(elapsed)}</span>&nbsp; Finalizar</button></header>
    <div class="active-progress"><i style="width:${percent(completedSets, totalSets)}%"></i></div>
    <section class="dark-card active-exercise">
      <h2>${esc(exercise.name)}</h2><p>${exercise.sets} séries • ${exercise.minReps}-${exercise.maxReps} reps • descanso ${exercise.rest}s</p>
      <div class="last-session">Última vez<strong>${bestPrev ? `${bestPrev.kg} kg × ${bestPrev.reps} • RIR ${bestPrev.rir}` : "Sem histórico — comece leve"}</strong></div>
      <div class="series-head"><span>SÉRIE</span><span>ANTERIOR</span><span>KG</span><span>REPS</span><span>RIR</span><span>✓</span></div>
      ${exercise.sets.map((set, index) => {
        const prior = previous?.sets?.[index];
        return `<div class="series-row"><b>${index + 1}</b><span class="previous">${prior ? `${prior.kg} × ${prior.reps}` : "—"}</span><input class="series-input" inputmode="decimal" type="number" min="0" step="0.5" aria-label="Carga da série ${index + 1}" data-active-field="kg" data-set="${index}" value="${esc(set.kg)}"><input class="series-input" inputmode="numeric" type="number" min="1" max="50" aria-label="Repetições da série ${index + 1}" data-active-field="reps" data-set="${index}" value="${esc(set.reps)}"><input class="series-input" inputmode="numeric" type="number" min="0" max="10" aria-label="RIR da série ${index + 1}" data-active-field="rir" data-set="${index}" value="${esc(set.rir)}"><button class="check-set ${set.completed ? "done" : ""}" data-action="complete-set" data-set="${index}">${set.completed ? "✓" : "○"}</button></div>`;
      }).join("")}
      <div class="quality-row"><label>Técnica<select data-active-quality="technique"><option value="good" ${exercise.technique === "good" ? "selected" : ""}>Boa</option><option value="bad" ${exercise.technique === "bad" ? "selected" : ""}>Precisa corrigir</option></select></label><label>Dor articular<span class="pain-toggle"><input type="checkbox" data-active-quality="pain" ${exercise.pain ? "checked" : ""}> Senti dor</span></label></div>
    </section>
    ${workout.restRemaining > 0 ? `<section class="dark-card rest-card"><div class="rest-label">◴ DESCANSO</div><div id="restTime" class="rest-clock">${formatDuration(workout.restRemaining)}</div><div class="bar" style="height:6px;background:#363d47;margin-bottom:12px"><i id="restProgress" style="width:${percent(workout.restRemaining, workout.restTotal)}%;background:#9b7cf5"></i></div><div class="rest-actions"><button class="btn" data-action="adjust-rest" data-amount="-15">− 15s</button><button class="btn" data-action="pause-rest">${workout.restPaused ? "▶ Retomar" : "Ⅱ Pausar"}</button><button class="btn" data-action="adjust-rest" data-amount="15">+ 15s</button></div><button class="btn btn-ghost btn-block" style="color:#ab90ff;margin-top:7px" data-action="skip-rest">Pular descanso</button></section>` : ""}
    ${next ? `<section class="dark-card next-card"><div><small>Próximo exercício</small><strong>${esc(next.name)}</strong><span class="card-meta">${next.sets} séries • ${next.minReps}-${next.maxReps} reps</span></div><span>›</span></section><button class="btn active-primary btn-block" data-action="next-exercise">Próximo exercício</button>` : `<button class="btn active-primary btn-block" data-action="finish-workout">Finalizar treino</button>`}
  </div>`;
}

function startTicking() {
  window.clearInterval(tickHandle);
  tickHandle = window.setInterval(() => {
    const workout = state.activeWorkout;
    if (!workout) return;
    const elapsedNode = document.querySelector("#elapsedTime");
    if (elapsedNode) elapsedNode.textContent = formatDuration(Math.floor((Date.now() - workout.startedAt) / 1000));
    if (workout.restRemaining > 0 && !workout.restPaused) {
      workout.restRemaining = Math.max(0, workout.restRemaining - 1);
      const node = document.querySelector("#restTime");
      const bar = document.querySelector("#restProgress");
      if (node) node.textContent = formatDuration(workout.restRemaining);
      if (bar) bar.style.width = `${percent(workout.restRemaining, workout.restTotal)}%`;
      if (workout.restRemaining === 0) {
        navigator.vibrate?.(120);
        saveState();
        renderActiveWorkout();
        showToast("Descanso concluído.");
      }
    }
  }, 1000);
}

function finishWorkout() {
  const workout = state.activeWorkout;
  if (!workout) return;
  const completedCount = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.filter(set => set.completed).length, 0);
  if (!completedCount) {
    showToast("Conclua pelo menos uma série antes de finalizar.");
    return;
  }
  const duration = Math.max(1, Math.floor((Date.now() - workout.startedAt) / 1000));
  const record = {
    type: workout.type,
    completedAt: new Date().toISOString(),
    duration,
    exercises: workout.exercises.map(exercise => {
      const sets = exercise.sets.map(set => ({ ...set, kg: Number(set.kg || 0), reps: Number(set.reps || 0), rir: Number(set.rir || 0), technique: exercise.technique, pain: exercise.pain }));
      const increment = state.increments[exercise.id] ?? exercise.increment;
      return { ...exercise, sets, recommendation: progressionForExercise(exercise, sets, increment) };
    })
  };
  record.volume = workoutVolume(record);
  state.workoutHistory.push(record);
  state.activeWorkout = null;
  workoutChoice = null;
  saveState();
  window.clearInterval(tickHandle);
  activeTab = "treino";
  render();
  const recs = record.exercises.filter(exercise => exercise.sets.some(set => set.completed));
  openModal(`${modalHead("Treino concluído!", `${formatDuration(duration)} • ${formatNumber(record.volume)} kg de volume`)}<div class="option-list">${recs.map(exercise => `<div class="option"><span><strong>${esc(exercise.name)}</strong><span>${esc(exercise.recommendation.label)} — ${esc(exercise.recommendation.reason)}</span></span><b>${exercise.recommendation.action === "increase" ? "↑" : exercise.recommendation.action === "review" ? "!" : "→"}</b></div>`).join("")}</div><button class="btn btn-primary btn-block" style="margin-top:14px" data-action="close-modal">Concluir</button>`);
}

function registerMeal() {
  const day = todayDay();
  const id = state.builder.mealId;
  if (day.meals[id].status === "skipped") {
    day.meals[id].status = "pending";
    day.skipMessage = null;
    day.rebalanceMode = null;
  }
  const target = mealTargetForDay(id, day, state.targets);
  const template = READY_MEALS[id].find(item => item.id === state.builder.templates?.[id]);
  const recipe = RECIPES.find(item => item.id === state.builder.recipeId);
  const formulaName = MEAL_FORMULAS[id].map(item => {
    const choice = BLOCKS[item.key].items[state.builder.selections[item.key] || 0];
    return `${choice[0]} ${choice[1]} × ${item.count}`;
  }).join(" • ");
  const name = recipe ? `${recipe.name} + complementos` : template?.name || formulaName;
  const entry = { name, at: new Date().toISOString(), kcal: target.kcal, protein: target.protein, carbs: target.carbs, fat: target.fat };
  day.meals[id].entries = [...(day.meals[id].entries || []), entry];
  day.meals[id].status = "done";
  state.builder.recipeId = null;
  saveState();
  renderDiet();
  showToast(`${mealInfo(id).label} registrada.`);
}

function saveMeasurement() {
  const date = document.querySelector("#measureDate")?.value;
  const weight = Number(document.querySelector("#measureWeight")?.value);
  const waistRaw = document.querySelector("#measureWaist")?.value;
  if (!date || !weight || weight < 30) {
    showToast("Informe uma data e um peso válido.");
    return;
  }
  state.measurements = state.measurements.filter(item => item.date !== date);
  state.measurements.push({ date, weight, waist: waistRaw ? Number(waistRaw) : null });
  state.measurements.sort((a, b) => a.date.localeCompare(b.date));
  state.profile.weight = weight;
  saveState();
  closeModal();
  render();
  showToast("Medida salva.");
}

function handleClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;

  if (action === "login") { event.preventDefault(); return performLogin(); }
  if (action === "toggle-password") {
    const input = document.querySelector("#loginPassword");
    if (input) input.type = input.type === "password" ? "text" : "password";
    return;
  }
  if (action === "logout") {
    signOut().finally(() => {
      authUnlocked = false;
      syncStatus = "local";
      activeTab = "hoje";
      renderLogin();
    });
    return;
  }
  if (action === "close-modal") return closeModal();
  if (action === "go-diet") { activeTab = "dieta"; render(); return; }
  if (action === "select-meal") {
    const day = todayDay();
    if (day.meals[button.dataset.meal].status === "skipped") {
      day.meals[button.dataset.meal] = { status: "pending", entries: [] };
      day.rebalanceMode = null; day.skipMessage = null; saveState(); render(); return;
    }
    state.builder.mealId = button.dataset.meal; activeTab = "dieta"; saveState(); render(); return;
  }
  if (action === "builder-meal") { state.builder.mealId = button.dataset.meal; state.builder.recipeId = null; saveState(); renderDiet(); return; }
  if (action === "swap-block") return openBlockOptions(button.dataset.block);
  if (action === "choose-block") { state.builder.selections[button.dataset.block] = Number(button.dataset.index); saveState(); closeModal(); renderDiet(); return; }
  if (action === "ready-meals") return openReadyMeals();
  if (action === "choose-template") { state.builder.templates[state.builder.mealId] = button.dataset.template; state.builder.recipeId = null; saveState(); closeModal(); renderDiet(); return; }
  if (action === "clear-template") { delete state.builder.templates[state.builder.mealId]; saveState(); renderDiet(); return; }
  if (action === "recipe-detail") return openRecipe(button.dataset.recipe);
  if (action === "use-recipe") { state.builder.recipeId = button.dataset.recipe; delete state.builder.templates[state.builder.mealId]; saveState(); closeModal(); renderDiet(); showToast("Receita adicionada ao construtor."); return; }
  if (action === "clear-recipe") { state.builder.recipeId = null; saveState(); renderDiet(); return; }
  if (action === "register-meal") return registerMeal();
  if (action === "favorite-meal") {
    const id = state.builder.templates?.[state.builder.mealId] || state.builder.recipeId || `${state.builder.mealId}-${Object.values(state.builder.selections).join("-")}`;
    if (!state.favorites.includes(id)) state.favorites.push(id);
    saveState(); showToast("Refeição adicionada aos favoritos."); return;
  }
  if (action === "skip-meal") return openSkipMeal();
  if (action === "confirm-skip") {
    const day = todayDay(); const meal = mealInfo(state.builder.mealId);
    day.meals[meal.id] = { status: "skipped", entries: [] };
    day.rebalanceMode = button.dataset.mode;
    day.skipMessage = `${meal.label} pulado${meal.label.endsWith("a") ? "a" : ""} — ${button.dataset.mode === "none" ? "sem reajuste" : "plano reajustado"}`;
    const currentIndex = MEALS.findIndex(item => item.id === meal.id);
    const nextPending = [...MEALS.slice(currentIndex + 1), ...MEALS.slice(0, currentIndex)].find(item => day.meals[item.id].status === "pending");
    if (nextPending) state.builder.mealId = nextPending.id;
    saveState(); closeModal(); renderDiet(); showToast("Refeição pulada."); return;
  }
  if (action === "undo-skip") {
    const day = todayDay();
    Object.keys(day.meals).forEach(id => { if (day.meals[id].status === "skipped") day.meals[id] = { status: "pending", entries: [] }; });
    day.rebalanceMode = null; day.skipMessage = null; saveState(); renderDiet(); return;
  }
  if (action === "water") { const day = todayDay(); day.water = Math.max(0, Math.min(6000, day.water + Number(button.dataset.amount))); saveState(); renderDiet(); return; }
  if (action === "start-workout") return startWorkout(button.dataset.type);
  if (action === "switch-workout") { workoutChoice = nextWorkoutType() === "A" ? "B" : "A"; renderTraining(); return; }
  if (action === "toggle-exercises") { expandedExercises = !expandedExercises; renderTraining(); return; }
  if (action === "complete-set") {
    const exercise = activeExercise(); const set = exercise.sets[Number(button.dataset.set)];
    if (!set.completed && (!set.kg || !set.reps || set.rir === "")) { showToast("Preencha kg, repetições e RIR."); return; }
    set.completed = !set.completed;
    if (set.completed) { state.activeWorkout.restRemaining = exercise.rest; state.activeWorkout.restTotal = exercise.rest; state.activeWorkout.restPaused = false; navigator.vibrate?.(45); }
    saveState(); renderActiveWorkout(); return;
  }
  if (action === "adjust-rest") { state.activeWorkout.restRemaining = Math.max(0, state.activeWorkout.restRemaining + Number(button.dataset.amount)); state.activeWorkout.restTotal = Math.max(state.activeWorkout.restTotal, state.activeWorkout.restRemaining); saveState(); renderActiveWorkout(); return; }
  if (action === "pause-rest") { state.activeWorkout.restPaused = !state.activeWorkout.restPaused; saveState(); renderActiveWorkout(); return; }
  if (action === "skip-rest") { state.activeWorkout.restRemaining = 0; saveState(); renderActiveWorkout(); return; }
  if (action === "next-exercise") { state.activeWorkout.currentIndex = Math.min(state.activeWorkout.exercises.length - 1, state.activeWorkout.currentIndex + 1); state.activeWorkout.restRemaining = 0; saveState(); renderActiveWorkout(); window.scrollTo(0, 0); return; }
  if (action === "finish-workout") return finishWorkout();
  if (action === "leave-workout") {
    openModal(`${modalHead("Sair do treino?", "Seu registro atual continuará salvo no aparelho.")}<button class="btn btn-secondary btn-block" data-action="close-modal">Continuar treinando</button><button class="btn btn-danger btn-block" style="margin-top:8px" data-action="discard-workout">Encerrar sem salvar</button>`); return;
  }
  if (action === "discard-workout") { state.activeWorkout = null; saveState(); closeModal(); window.clearInterval(tickHandle); activeTab = "treino"; render(); return; }
  if (action === "add-measurement") return openMeasurement();
  if (action === "save-measurement") return saveMeasurement();
  if (action === "edit-profile") return openProfileEditor();
  if (action === "save-profile") {
    const name = document.querySelector("#profileName")?.value.trim();
    const age = Number(document.querySelector("#profileAge")?.value);
    const height = Number(document.querySelector("#profileHeight")?.value);
    const goal = Number(document.querySelector("#profileGoal")?.value);
    if (!name || !age || !height || !goal) { showToast("Preencha os campos corretamente."); return; }
    state.profile = { ...state.profile, name, age, height, bodyFatGoal: goal }; saveState(); closeModal(); render(); showToast("Perfil atualizado."); return;
  }
  if (action === "edit-targets") return openTargetsEditor();
  if (action === "save-targets") {
    const next = { kcal: Number(document.querySelector("#targetKcal")?.value), protein: Number(document.querySelector("#targetProtein")?.value), carbs: Number(document.querySelector("#targetCarbs")?.value), fat: Number(document.querySelector("#targetFat")?.value) };
    if (Object.values(next).some(value => !value || value < 1)) { showToast("Preencha metas válidas."); return; }
    state.targets = next; saveState(); closeModal(); render(); showToast("Metas atualizadas."); return;
  }
  if (action === "edit-increments") return openIncrementsEditor();
  if (action === "save-increments") {
    document.querySelectorAll("[data-increment-id]").forEach(input => {
      const value = Number(input.value);
      if (value > 0) state.increments[input.dataset.incrementId] = value;
    });
    saveState(); closeModal(); render(); showToast("Incrementos atualizados."); return;
  }
  if (action === "reset-data") { openModal(`${modalHead("Apagar todos os registros?", "Treinos, refeições, medidas e favoritos serão removidos deste aparelho.")}<button class="btn btn-danger btn-block" data-action="confirm-reset">Sim, apagar tudo</button><button class="btn btn-secondary btn-block" style="margin-top:8px" data-action="close-modal">Cancelar</button>`); return; }
  if (action === "confirm-reset") { state = defaultState(); saveState(); closeModal(); activeTab = "hoje"; render(); showToast("Registros apagados."); return; }
  if (action === "install-app") {
    if (installPrompt) installPrompt.prompt(); else showToast("No Chrome, abra o menu e toque em ‘Instalar app’.");
  }
}

function handleInput(event) {
  const field = event.target.dataset.activeField;
  if (field && state.activeWorkout) {
    activeExercise().sets[Number(event.target.dataset.set)][field] = event.target.value;
    saveState();
  }
  const quality = event.target.dataset.activeQuality;
  if (quality && state.activeWorkout) {
    activeExercise()[quality] = quality === "pain" ? event.target.checked : event.target.value;
    saveState();
  }
}

nav.addEventListener("click", event => {
  const button = event.target.closest("[data-tab]");
  if (!button) return;
  activeTab = button.dataset.tab;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.addEventListener("click", handleClick);
document.addEventListener("input", handleInput);
document.addEventListener("change", handleInput);
document.addEventListener("submit", event => {
  if (event.target.id === "loginForm") {
    event.preventDefault();
    performLogin();
  }
});
modalRoot.addEventListener("click", event => { if (event.target.classList.contains("modal-backdrop")) closeModal(); });
window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); installPrompt = event; });

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
render();
