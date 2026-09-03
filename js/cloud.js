let client = null;
let syncTimer = null;

function config() {
  return window.MEU_PLANO_CONFIG || {};
}

export function cloudConfigured() {
  const current = config();
  return Boolean(current.supabaseUrl && current.supabasePublishableKey && window.supabase?.createClient);
}

function getClient() {
  if (client) return client;
  if (!cloudConfigured()) return null;
  const current = config();
  client = window.supabase.createClient(current.supabaseUrl, current.supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });
  return client;
}

export function allowedUsername() {
  return config().allowedUsername || "Fgvmoti";
}

export async function signIn(username, password) {
  const current = config();
  const supabaseClient = getClient();
  if (!supabaseClient) throw new Error("Supabase ainda não configurado.");
  if (username.trim().toLocaleLowerCase("pt-BR") !== allowedUsername().toLocaleLowerCase("pt-BR")) {
    throw new Error("Nome de acesso ou senha incorretos.");
  }
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: current.authEmail,
    password
  });
  if (error || !data?.user) throw new Error("Nome de acesso ou senha incorretos.");
  return data.user;
}

export async function signOut() {
  const supabaseClient = getClient();
  if (supabaseClient) await supabaseClient.auth.signOut({ scope: "local" });
}

async function authenticatedUser() {
  const supabaseClient = getClient();
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) return null;
  return data?.user || null;
}

export async function readCloudState() {
  const supabaseClient = getClient();
  const user = await authenticatedUser();
  if (!supabaseClient || !user) throw new Error("Sessão inválida.");
  const { data, error } = await supabaseClient
    .from("app_state")
    .select("payload,updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data?.payload || null;
}

export async function writeCloudState(payload) {
  const supabaseClient = getClient();
  const user = await authenticatedUser();
  if (!supabaseClient || !user) throw new Error("Sessão inválida.");
  const { error } = await supabaseClient.from("app_state").upsert({
    user_id: user.id,
    payload,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
  if (error) throw error;
}

export function queueCloudWrite(payload, onStatus = () => {}) {
  window.clearTimeout(syncTimer);
  onStatus("pending");
  syncTimer = window.setTimeout(async () => {
    try {
      await writeCloudState(payload);
      onStatus("synced");
    } catch {
      onStatus(navigator.onLine ? "error" : "offline");
    }
  }, 700);
}
