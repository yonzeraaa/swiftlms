import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const STORAGE_PAGE_SIZE = 1000;
const STORAGE_REMOVE_BATCH = 100;

export async function POST(request: NextRequest) {
  const supabase = await createClient();

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

  const adminSupabase = createAdminClient();

  const { data: profiles, error: profilesError } = await adminSupabase
    .from("profiles")
    .select("id, role");

  if (profilesError) {
    return NextResponse.json(
      { error: "Falha ao preparar limpeza", details: [profilesError.message] },
      { status: 500 }
    );
  }

  const authUsersToDelete = (profiles || [])
    .filter((item) => item.role !== "admin")
    .map((item) => item.id);

  const { data: clearResult, error: clearError } = await (adminSupabase as any).rpc(
    "clear_application_data"
  );

  if (clearError) {
    return NextResponse.json(
      { error: "Falha ao limpar banco de dados", details: [clearError.message] },
      { status: 500 }
    );
  }

  const storageResult = await clearStorageBuckets(adminSupabase);
  const authUsersResult = await deleteAuthUsers(adminSupabase, authUsersToDelete);
  const details = [...storageResult.errors, ...authUsersResult.errors];

  if (details.length > 0) {
    return NextResponse.json(
      {
        error: "Limpeza parcial concluída",
        details,
        database: clearResult,
        storageObjectsDeleted: storageResult.deletedCount,
        authUsersDeleted: authUsersResult.deletedCount,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    database: clearResult,
    storageObjectsDeleted: storageResult.deletedCount,
    authUsersDeleted: authUsersResult.deletedCount,
  });
}

async function clearStorageBuckets(adminSupabase: ReturnType<typeof createAdminClient>) {
  const deletedCount = { value: 0 };
  const errors: string[] = [];

  const { data: buckets, error } = await adminSupabase.storage.listBuckets();
  if (error) {
    return { deletedCount: 0, errors: [`storage.buckets: ${error.message}`] };
  }

  for (const bucket of buckets || []) {
    const objectNames = await listBucketObjectNames(adminSupabase, bucket.id);

    if ("error" in objectNames) {
      errors.push(`storage.${bucket.name}: ${objectNames.error}`);
      continue;
    }

    for (let index = 0; index < objectNames.length; index += STORAGE_REMOVE_BATCH) {
      const chunk = objectNames.slice(index, index + STORAGE_REMOVE_BATCH);
      if (chunk.length === 0) {
        continue;
      }

      const { error: removeError } = await adminSupabase.storage
        .from(bucket.name)
        .remove(chunk);

      if (removeError) {
        errors.push(`storage.${bucket.name}: ${removeError.message}`);
        break;
      }

      deletedCount.value += chunk.length;
    }
  }

  return { deletedCount: deletedCount.value, errors };
}

async function listBucketObjectNames(
  adminSupabase: ReturnType<typeof createAdminClient>,
  bucketId: string
) {
  const names: string[] = [];
  let from = 0;

  while (true) {
    const query = (adminSupabase as any)
      .schema("storage")
      .from("objects")
      .select("name")
      .eq("bucket_id", bucketId)
      .range(from, from + STORAGE_PAGE_SIZE - 1);

    const { data, error } = await query;

    if (error) {
      return { error: error.message };
    }

    const page = (data || [])
      .map((item: { name: string | null }) => item.name)
      .filter((name: string | null): name is string => Boolean(name));

    names.push(...page);

    if (page.length < STORAGE_PAGE_SIZE) {
      break;
    }

    from += STORAGE_PAGE_SIZE;
  }

  return [...new Set(names)];
}

async function deleteAuthUsers(
  adminSupabase: ReturnType<typeof createAdminClient>,
  userIds: string[]
) {
  const errors: string[] = [];
  let deletedCount = 0;

  for (const userId of userIds) {
    const { error } = await adminSupabase.auth.admin.deleteUser(userId);

    if (error) {
      if (!/not found/i.test(error.message)) {
        errors.push(`auth.${userId}: ${error.message}`);
      }
      continue;
    }

    deletedCount += 1;
  }

  return { deletedCount, errors };
}
