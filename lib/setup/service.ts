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
  googleClientSecret: z.string().trim(),
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
  "backup.google_client_secret": "GOOGLE_CLIENT_SECRET",
  "backup.google_refresh_token": "GOOGLE_DRIVE_BACKUP_REFRESH_TOKEN",
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
    const existingClientSecret = await getSecret("backup.google_client_secret");
    const existingDriveFolderId = await getSecret("backup.google_drive_backup_folder_id");
    const googleClientSecret = data.googleClientSecret || existingClientSecret || "";
    const googleDriveBackupFolderId = data.googleDriveBackupFolderId || existingDriveFolderId || "";

    if (!googleClientSecret) {
      throw new Error("Google Client Secret é obrigatório.");
    }
    if (!googleDriveBackupFolderId) {
      throw new Error("Pasta de backup do Google Drive é obrigatória.");
    }

    await setPublicSetting("googleClientId", data.googleClientId, userId);
    await setPublicSetting("googleApiKey", data.googleApiKey, userId);
    if (data.googleClientSecret) {
      await setSecret("backup.google_client_secret", googleClientSecret, userId);
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
    "backup.google_client_secret",
    "backup.google_refresh_token",
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
  const googleClientSecret = await getSecret("backup.google_client_secret");
  const googleRefreshToken = await getSecret("backup.google_refresh_token");
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
  if (!googleClientSecret) {
    issues.push("Google Client Secret é obrigatório para o backup.");
  }
  if (!googleRefreshToken) {
    issues.push("Conexão OAuth do backup com Google Drive é obrigatória.");
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

  if (publicSettings.googleClientId && googleClientSecret && googleRefreshToken && driveFolderId) {
    try {
      await testDriveAccess(publicSettings.googleClientId, googleClientSecret, googleRefreshToken, driveFolderId);
      await touchSecretValidation("backup.google_client_secret");
      await touchSecretValidation("backup.google_refresh_token");
      await touchSecretValidation("backup.google_drive_backup_folder_id");
      checks.push({
        key: "google_drive_backup",
        status: "ok",
        message: "OAuth do backup e acesso ao Google Drive validados.",
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
      message: "Configuração OAuth do backup no Drive pendente.",
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

export async function getBackupOAuthConnectConfig(userId: string, origin: string) {
  await assertInstallerCanEdit(userId);
  const settings = await getPublicSettings();
  const clientSecret = await getSecret("backup.google_client_secret");
  const folderId = await getSecret("backup.google_drive_backup_folder_id");

  if (!settings.googleClientId) {
    throw new Error("Google Client ID não configurado.");
  }

  if (!clientSecret) {
    throw new Error("Google Client Secret não configurado.");
  }

  if (!folderId) {
    throw new Error("Pasta de backup do Google Drive não configurada.");
  }

  return {
    clientId: settings.googleClientId,
    clientSecret,
    redirectUri: `${origin}/api/setup/backup-drive/callback`,
  };
}

export async function saveBackupRefreshToken(userId: string, refreshToken: string) {
  await assertInstallerCanEdit(userId);
  await setSecret("backup.google_refresh_token", refreshToken, userId);
  await writeSetupAudit("backup_drive_connected", userId, {
    connectedAt: new Date().toISOString(),
  });
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

async function testDriveAccess(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  folderId: string
) {
  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
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
