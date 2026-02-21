export type UserPreferences = {
  auditRefreshEnabled: boolean;
  auditRefreshInterval: number;
  scanRefreshEnabled: boolean;
  scanRefreshInterval: number;
  scanPinnedVisible: boolean;
};

export type PreferenceMeta = {
  updatedAt: string;
  updatedBy: {
    id: string;
    fullName: string;
    email: string;
  } | null;
};

export type PreferenceDefaultsResponse = {
  defaults: UserPreferences;
  updatedAt: string;
  updatedBy: {
    id: string;
    fullName: string;
    email: string;
  } | null;
};
