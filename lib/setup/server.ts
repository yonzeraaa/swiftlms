import { createClient } from "@/lib/supabase/server";

export async function getAuthenticatedSetupUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Não autenticado");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, email, full_name")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    throw new Error(error?.message || "Perfil do usuário não encontrado");
  }

  return {
    user,
    profile,
  };
}
