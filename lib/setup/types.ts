export type InstallationStatus = "pending" | "in_progress" | "completed";

export type SetupStepId =
  | "branding"
  | "integrations"
  | "validation"
  | "summary"
  | "completed";

export type SecretKeyName =
  | "backup.google_service_account_key"
  | "backup.google_drive_backup_folder_id";

export interface PublicAppSettings {
  institutionName: string;
  logoUrl: string;
  primaryColor: string;
  supportEmail: string;
  supportPhone: string;
  googleClientId: string;
  googleApiKey: string;
}

export interface SetupWizardState {
  installation: {
    status: InstallationStatus;
    isSetupComplete: boolean;
    currentStep: SetupStepId;
    claimedBy: string | null;
    installedBy: string | null;
    completedAt: string | null;
  };
  publicSettings: PublicAppSettings;
  secretStatus: {
    key: SecretKeyName;
    isConfigured: boolean;
    maskedValue: string | null;
    lastValidatedAt: string | null;
  }[];
  validation: {
    canComplete: boolean;
    issues: string[];
    checks: {
      key: string;
      status: "ok" | "error";
      message: string;
    }[];
  };
}

export interface BrandingSetupPayload {
  institutionName: string;
  logoUrl: string;
  primaryColor: string;
  supportEmail: string;
  supportPhone: string;
}

export interface IntegrationsSetupPayload {
  googleClientId: string;
  googleApiKey: string;
  googleServiceAccountKey: string;
  googleDriveBackupFolderId: string;
}

export interface SetupValidationResult {
  canComplete: boolean;
  issues: string[];
  checks: {
    key: string;
    status: "ok" | "error";
    message: string;
  }[];
}
