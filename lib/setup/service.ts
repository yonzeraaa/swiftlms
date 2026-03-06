import { google } from "googleapis";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/utils/logger";
import { decryptSecret, encryptSecret, maskSecret } from "./crypto";
import type {
  BrandingSetupPayload,
  InstallationStatus,
  IntegrationsSetupPayload,
  PublicAppSettings,
  SecretKeyName,
  SetupStepId,
  SetupValidationResult,
  SetupWizardState,
} from "./types";

const brandingSchema = z.object({
  institutionName: z.string().trim().min(2),
  logoUrl: z.string().trim().optional().default(""),
  primaryColor: z.string().trim().min(4).max(32),
  supportEmail: z.string().trim().email(),
  supportPhone: z.string().trim().min(8),
});

const integrationsSchema = z.object({
  googleClientId: z.string().trim().min(10),
  googleApiKey: z.string().trim().min(10),
  googleServiceAccountKey: z.string().trim(),
  googleDriveBackupFolderId: z.string().trim(),
});

const PUBLIC_SETTING_KEYS = {
  institutionName: { namespace: "branding", key: "institution_name" },
  logoUrl: { namespace: "branding", key: "logo_url" },
  primaryColor: { namespace: "branding", key: "primary_color" },
  supportEmail: { namespace: "branding", key: "support_email" },
  supportPhone: { namespace: "branding", key: "support_phone" },
  googleClientId: { namespace: "integrations", key: "google_client_id" },
  googleApiKey: { namespace: "integrations", key: "google_api_key" },
} as const;

const SECRET_ENV_FALLBACK: Record<SecretKeyName, string> = {
  "backup.google_service_account_key": "GOOGLE_SERVICE_ACCOUNT_KEY",
  "backup.google_drive_backup_folder_id": "GOOGLE_DRIVE_BACKUP_FOLDER_ID",
};

const DEFAULT_PUBLIC_SETTINGS: PublicAppSettings = {
  institutionName: process.env.NEXT_PUBLIC_INSTITUTION_NAME || "IPETEC / UCP",
  logoUrl: "",
  primaryColor: "#D4AF37",
  supportEmail: "",
  supportPhone: "",
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
  googleApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "",
};

export async function getInstallationStatus() {
  const admin = createAdminClient() as any;
  await ensureInstallationRow(admin);

  const { data, error } = await admin
    .from("app_installations")
    .select("*")
    .eq("singleton", true)
    .single();

  if (error) {
    throw new Error(`Erro ao carregar instalação: ${error.message}`);
  }

  return mapInstallation(data);
}

export async function claimInitialInstaller(userId: string) {
  const admin = createAdminClient() as any;
  const { data, error } = await admin.rpc("claim_initial_installer", {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(`Erro ao reservar setup inicial: ${error.message}`);
  }

  const installation = mapInstallation(data);
  if (installation.isSetupComplete) {
    throw new Error("O setup inicial já foi concluído.");
  }

  if (installation.claimedBy && installation.claimedBy !== userId && !installation.isSetupComplete) {
    throw new Error("O setup já está em andamento por outro usuário.");
  }

  await writeSetupAudit("setup_claimed", userId, {
    claimedBy: installation.claimedBy,
    status: installation.status,
  });

  return installation;
}

export async function saveSetupStep(
  step: Extract<SetupStepId, "branding" | "integrations">,
  payload: BrandingSetupPayload | IntegrationsSetupPayload,
  userId: string
) {
  if (step !== "branding" && step !== "integrations") {
    throw new Error("Etapa de setup inválida.");
  }

  const installation = await assertInstallerCanEdit(userId);

  if (installation.isSetupComplete && installation.installedBy !== userId) {
    throw new Error("Apenas o admin master pode editar a instalação.");
  }

  if (step === "branding") {
    const data = brandingSchema.parse(payload);
    await setPublicSetting("institutionName", data.institutionName, userId);
    await setPublicSetting("logoUrl", data.logoUrl, userId);
    await setPublicSetting("primaryColor", data.primaryColor, userId);
    await setPublicSetting("supportEmail", data.supportEmail, userId);
    await setPublicSetting("supportPhone", data.supportPhone, userId);
  }

  if (step === "integrations") {
    const data = integrationsSchema.parse(payload);
    const existingServiceAccountKey = await getSecret("backup.google_service_account_key");
    const existingDriveFolderId = await getSecret("backup.google_drive_backup_folder_id");
    const googleServiceAccountKey = data.googleServiceAccountKey || existingServiceAccountKey || "";
    const googleDriveBackupFolderId = data.googleDriveBackupFolderId || existingDriveFolderId || "";

    if (!googleServiceAccountKey) {
      throw new Error("Google Service Account JSON é obrigatório.");
    }
    if (!googleDriveBackupFolderId) {
      throw new Error("Pasta de backup do Google Drive é obrigatória.");
    }

    await setPublicSetting("googleClientId", data.googleClientId, userId);
    await setPublicSetting("googleApiKey", data.googleApiKey, userId);
    if (data.googleServiceAccountKey) {
      await setSecret("backup.google_service_account_key", googleServiceAccountKey, userId);
    }
    if (data.googleDriveBackupFolderId) {
      await setSecret("backup.google_drive_backup_folder_id", googleDriveBackupFolderId, userId);
    }
  }

  if (!installation.isSetupComplete) {
    await updateInstallationStep(step === "branding" ? "integrations" : "validation");
  }
  await writeSetupAudit("setup_step_saved", userId, { step });

  return getSetupWizardState();
}

export async function completeSetup(userId: string) {
  await assertInstallerCanEdit(userId);
  const validation = await validateCurrentSetup();
  if (!validation.canComplete) {
    throw new Error(validation.issues.join(" "));
  }

  const admin = createAdminClient() as any;
  const { error: roleError } = await admin
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", userId);

  if (roleError) {
    throw new Error(`Erro ao promover instalador: ${roleError.message}`);
  }

  const { data, error } = await admin.rpc("complete_app_setup", {
    p_user_id: userId,
    p_step: "completed",
  });

  if (error) {
    throw new Error(`Erro ao concluir setup: ${error.message}`);
  }

  await writeSetupAudit("setup_completed", userId, {
    installedBy: userId,
    completedAt: data?.completed_at ?? null,
  });

  return getSetupWizardState();
}

export async function getPublicSettings(): Promise<PublicAppSettings> {
  const rows = await loadAppSettings();
  return {
    institutionName: readPublicSetting(rows, "institutionName", DEFAULT_PUBLIC_SETTINGS.institutionName),
    logoUrl: readPublicSetting(rows, "logoUrl", DEFAULT_PUBLIC_SETTINGS.logoUrl),
    primaryColor: readPublicSetting(rows, "primaryColor", DEFAULT_PUBLIC_SETTINGS.primaryColor),
    supportEmail: readPublicSetting(rows, "supportEmail", DEFAULT_PUBLIC_SETTINGS.supportEmail),
    supportPhone: readPublicSetting(rows, "supportPhone", DEFAULT_PUBLIC_SETTINGS.supportPhone),
    googleClientId: readPublicSetting(rows, "googleClientId", DEFAULT_PUBLIC_SETTINGS.googleClientId),
    googleApiKey: readPublicSetting(rows, "googleApiKey", DEFAULT_PUBLIC_SETTINGS.googleApiKey),
  };
}

export async function getSecret(name: SecretKeyName): Promise<string | null> {
  const admin = createAdminClient() as any;
  const { data, error } = await admin
    .from("app_secrets")
    .select("encrypted_value")
    .eq("namespace", getSecretNamespace(name))
    .eq("key", getSecretKey(name))
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao ler segredo ${name}: ${error.message}`);
  }

  if (data?.encrypted_value) {
    return decryptSecret(data.encrypted_value);
  }

  const fallbackEnv = SECRET_ENV_FALLBACK[name];
  return fallbackEnv ? process.env[fallbackEnv] || null : null;
}

export async function setSecret(name: SecretKeyName, value: string, userId: string) {
  const admin = createAdminClient() as any;
  const { error } = await admin.from("app_secrets").upsert({
    namespace: getSecretNamespace(name),
    key: getSecretKey(name),
    encrypted_value: encryptSecret(value),
    masked_value: maskSecret(value),
    updated_by: userId,
  }, { onConflict: "namespace,key" });

  if (error) {
    throw new Error(`Erro ao salvar segredo ${name}: ${error.message}`);
  }
}

export async function getSetupWizardState(): Promise<SetupWizardState> {
  const installation = await getInstallationStatus();
  const publicSettings = await getPublicSettings();
  const validation = await validateCurrentSetup();
  const admin = createAdminClient() as any;
  const { data: secrets, error } = await admin
    .from("app_secrets")
    .select("namespace, key, masked_value, last_validated_at");

  if (error) {
    throw new Error(`Erro ao carregar status dos segredos: ${error.message}`);
  }

  const secretStatus = ([
    "backup.google_service_account_key",
    "backup.google_drive_backup_folder_id",
  ] as SecretKeyName[]).map((secretKey) => {
    const row = (secrets || []).find(
      (item: any) =>
        item.namespace === getSecretNamespace(secretKey) &&
        item.key === getSecretKey(secretKey)
    );

    return {
      key: secretKey,
      isConfigured: !!row || !!process.env[SECRET_ENV_FALLBACK[secretKey]],
      maskedValue: row?.masked_value ?? null,
      lastValidatedAt: row?.last_validated_at ?? null,
    };
  });

  return {
    installation,
    publicSettings,
    secretStatus,
    validation,
  };
}

export async function validateCurrentSetup(): Promise<SetupValidationResult> {
  const publicSettings = await getPublicSettings();
  const serviceAccountKey = await getSecret("backup.google_service_account_key");
  const driveFolderId = await getSecret("backup.google_drive_backup_folder_id");

  const issues: string[] = [];
  const checks: SetupValidationResult["checks"] = [];

  if (!publicSettings.institutionName) {
    issues.push("Nome da instituição é obrigatório.");
  }
  if (!publicSettings.supportEmail) {
    issues.push("Email de suporte é obrigatório.");
  }
  if (!publicSettings.googleClientId) {
    issues.push("Google Client ID é obrigatório.");
  }
  if (!publicSettings.googleApiKey) {
    issues.push("Google API Key é obrigatória.");
  }
  if (!serviceAccountKey) {
    issues.push("Credencial de Service Account do Google Drive é obrigatória.");
  }
  if (!driveFolderId) {
    issues.push("Pasta de backup do Google Drive é obrigatória.");
  }

  checks.push({
    key: "branding",
    status: issues.some((issue) => issue.includes("instituição") || issue.includes("suporte")) ? "error" : "ok",
    message: "Branding básico validado.",
  });
  checks.push({
    key: "google_public",
    status: publicSettings.googleClientId && publicSettings.googleApiKey ? "ok" : "error",
    message: publicSettings.googleClientId && publicSettings.googleApiKey
      ? "Google Client ID/API Key configurados."
      : "Google Client ID/API Key pendentes.",
  });

  if (serviceAccountKey && driveFolderId) {
    try {
      await testDriveAccess(serviceAccountKey, driveFolderId);
      await touchSecretValidation("backup.google_service_account_key");
      await touchSecretValidation("backup.google_drive_backup_folder_id");
      checks.push({
        key: "google_drive_backup",
        status: "ok",
        message: "Acesso ao Google Drive validado.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao validar Google Drive.";
      issues.push(message);
      checks.push({
        key: "google_drive_backup",
        status: "error",
        message,
      });
    }
  } else {
    checks.push({
      key: "google_drive_backup",
      status: "error",
      message: "Configuração de backup no Drive pendente.",
    });
  }

  return {
    canComplete: issues.length === 0,
    issues,
    checks,
  };
}

export async function getInstitutionName(): Promise<string> {
  const settings = await getPublicSettings();
  return settings.institutionName || DEFAULT_PUBLIC_SETTINGS.institutionName;
}

async function assertInstallerCanEdit(userId: string) {
  const installation = await getInstallationStatus();
  const userRole = await getUserRole(userId);

  if (installation.isSetupComplete) {
    if (installation.installedBy !== userId) {
      throw new Error("Apenas o admin master pode editar essa configuração.");
    }
    return installation;
  }

  if (!installation.claimedBy) {
    return claimInitialInstaller(userId);
  }

  if (installation.claimedBy !== userId && userRole !== "admin") {
    throw new Error("O setup inicial já foi reservado por outro usuário.");
  }

  return installation;
}

async function ensureInstallationRow(admin: any) {
  await admin.from("app_installations").upsert({
    singleton: true,
  }, { onConflict: "singleton" });
}

async function loadAppSettings() {
  const admin = createAdminClient() as any;
  const { data, error } = await admin
    .from("app_settings")
    .select("namespace, key, value_json, is_public");

  if (error) {
    throw new Error(`Erro ao carregar configurações do app: ${error.message}`);
  }

  return data || [];
}

async function setPublicSetting(
  field: keyof typeof PUBLIC_SETTING_KEYS,
  value: string,
  userId: string
) {
  const admin = createAdminClient() as any;
  const target = PUBLIC_SETTING_KEYS[field];
  const { error } = await admin.from("app_settings").upsert({
    namespace: target.namespace,
    key: target.key,
    value_json: { value },
    is_public: true,
    updated_by: userId,
  }, { onConflict: "namespace,key" });

  if (error) {
    throw new Error(`Erro ao salvar configuração ${target.namespace}.${target.key}: ${error.message}`);
  }
}

async function updateInstallationStep(step: SetupStepId) {
  const admin = createAdminClient() as any;
  const status: InstallationStatus = step === "completed" ? "completed" : "in_progress";

  const { error } = await admin
    .from("app_installations")
    .update({
      current_step: step,
      status,
      is_setup_complete: step === "completed",
    })
    .eq("singleton", true);

  if (error) {
    throw new Error(`Erro ao atualizar etapa do setup: ${error.message}`);
  }
}

async function writeSetupAudit(action: string, actorUserId: string, metadata: Record<string, unknown>) {
  const admin = createAdminClient() as any;
  const { error } = await admin.from("app_setup_audit").insert({
    action,
    actor_user_id: actorUserId,
    metadata,
  });

  if (error) {
    logger.error("Erro ao gravar auditoria de setup", error, {
      context: "SETUP",
      forceProduction: true,
    });
  }
}

async function touchSecretValidation(name: SecretKeyName) {
  const admin = createAdminClient() as any;
  await admin
    .from("app_secrets")
    .update({ last_validated_at: new Date().toISOString() })
    .eq("namespace", getSecretNamespace(name))
    .eq("key", getSecretKey(name));
}

async function getUserRole(userId: string) {
  const admin = createAdminClient() as any;
  const { data, error } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(`Erro ao carregar perfil do usuário: ${error.message}`);
  }

  return data?.role || null;
}

function readPublicSetting(
  rows: any[],
  field: keyof typeof PUBLIC_SETTING_KEYS,
  fallback: string
) {
  const target = PUBLIC_SETTING_KEYS[field];
  const row = rows.find(
    (item: any) => item.namespace === target.namespace && item.key === target.key
  );

  return row?.value_json?.value ?? fallback;
}

function mapInstallation(row: any) {
  return {
    status: (row?.status || "pending") as InstallationStatus,
    isSetupComplete: !!row?.is_setup_complete,
    currentStep: (row?.current_step || "branding") as SetupStepId,
    claimedBy: row?.claimed_by || null,
    installedBy: row?.installed_by || null,
    completedAt: row?.completed_at || null,
  };
}

function getSecretNamespace(name: SecretKeyName) {
  return name.split(".")[0];
}

function getSecretKey(name: SecretKeyName) {
  return name.split(".")[1];
}

async function testDriveAccess(credentialsJson: string, folderId: string) {
  const credentials = JSON.parse(credentialsJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  const drive = google.drive({ version: "v3", auth });

  const response = await drive.files.get({
    fileId: folderId,
    fields: "id,name,mimeType",
    supportsAllDrives: true,
  });

  if (!response.data.id) {
    throw new Error("Não foi possível validar a pasta de backup no Google Drive.");
  }
}
