import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Tables cleared in dependency order (children before parents)
const TABLES_TO_CLEAR = [
  "activity_logs",
  "student_schedules",
  "student_grade_overrides",
  "tcc_submissions",
  "certificate_requests",
  "certificates",
  "test_grades",
  "test_attempts",
  "lesson_progress",
  "enrollment_modules",
  "enrollments",
] as const;

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Identify the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Acesso negado. Apenas administradores." },
      { status: 403 }
    );
  }

  // Verify the admin's password before proceeding
  const { password } = await request.json();
  if (!password) {
    return NextResponse.json({ error: "Senha obrigatória" }, { status: 400 });
  }

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  if (authError) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 403 });
  }

  // Delete all student data using the admin client (bypasses RLS)
  const adminSupabase = createAdminClient();
  const errors: string[] = [];

  for (const table of TABLES_TO_CLEAR) {
    const { error } = await adminSupabase
      .from(table)
      .delete()
      .not("id", "is", null);

    if (error) {
      errors.push(`${table}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Erros ao limpar dados", details: errors },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, tablesCleared: TABLES_TO_CLEAR.length });
}
