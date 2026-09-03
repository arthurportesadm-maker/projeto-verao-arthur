import test from "node:test";
import assert from "node:assert/strict";

test("abre as telas principais e inicia um treino", async () => {
  const listeners = {};
  const navListeners = {};
  const modalListeners = {};
  const classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } };
  const element = () => ({
    innerHTML: "", hidden: false, textContent: "", style: {}, classList,
    addEventListener(type, handler) { this.listeners ||= {}; this.listeners[type] = handler; },
    querySelector() { return null; }
  });
  const app = element();
  const nav = element(); nav.addEventListener = (type, handler) => { navListeners[type] = handler; };
  const modal = element(); modal.addEventListener = (type, handler) => { modalListeners[type] = handler; };
  const toast = element();
  const storage = new Map();
  const loginUsername = { value: "Fgvmoti" };
  const loginPassword = { value: "test-password", type: "password" };
  const fakeUser = { id: "00000000-0000-4000-8000-000000000001" };
  const fakeClient = {
    auth: {
      async signInWithPassword() { return { data: { user: fakeUser }, error: null }; },
      async getUser() { return { data: { user: fakeUser }, error: null }; },
      async signOut() { return { error: null }; }
    },
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() { return { data: null, error: null }; },
        async upsert() { return { error: null }; }
      };
    }
  };

  globalThis.localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) };
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { vibrate() {} } });
  globalThis.window = globalThis;
  globalThis.window.scrollTo = () => {};
  globalThis.window.addEventListener = () => {};
  globalThis.window.setTimeout = () => 1;
  globalThis.window.setInterval = () => 1;
  globalThis.window.clearInterval = () => {};
  globalThis.window.MEU_PLANO_CONFIG = { supabaseUrl: "https://example.supabase.co", supabasePublishableKey: "sb_publishable_test", allowedUsername: "Fgvmoti", authEmail: "fgvmoti@meuplano.app" };
  globalThis.window.supabase = { createClient: () => fakeClient };
  globalThis.document = {
    querySelector(selector) { return { "#app": app, "#bottomNav": nav, "#modalRoot": modal, "#toast": toast, "#loginUsername": loginUsername, "#loginPassword": loginPassword }[selector] || null; },
    querySelectorAll() { return []; },
    addEventListener(type, handler) { listeners[type] = handler; }
  };

  await import(`../js/app.js?smoke=${Date.now()}`);
  assert.match(app.innerHTML, /Entrar com segurança/);

  await listeners.click({ preventDefault() {}, target: { closest: () => ({ dataset: { action: "login" } }) } });
  assert.match(app.innerHTML, /Olá, Alex/);
  assert.match(app.innerHTML, /Resumo de hoje/);

  navListeners.click({ target: { closest: () => ({ dataset: { tab: "dieta" } }) } });
  assert.match(app.innerHTML, /Montar refeição/);
  assert.match(app.innerHTML, /Receitas para jantar/);

  listeners.click({ target: { closest: () => ({ dataset: { action: "register-meal" } }) } });
  assert.match(app.innerHTML, /1 de 4|Consumo do dia/);

  listeners.click({ target: { closest: () => ({ dataset: { action: "start-workout", type: "A" } }) } });
  assert.match(app.innerHTML, /TREINO A/);
  assert.match(app.innerHTML, /Leg press 45°/);
  assert.match(app.innerHTML, /RIR/);
});
