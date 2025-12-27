// Admin User Types
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
  createdAt: Date;
  repoCount: number;
}

export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
  twoFactorEnabled: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

// Activity Types
export interface ActivityLog {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
  impersonatedBy: string | null;
}

// User Related Types
export interface UserRepo {
  id: string;
  repoName: string;
  lastNotifiedTag: string | null;
  createdAt: Date;
}

export interface UserChannel {
  id: string;
  type: string;
  enabled: boolean;
  createdAt: Date;
}

export interface ConnectedAccount {
  id: string;
  providerId: string;
  createdAt: Date;
}

// API Response Types
export interface UsersApiResponse {
  users: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}

export interface ActivityApiResponse {
  activity: ActivityLog[];
  limit: number;
  offset: number;
}

export interface UserDetailApiResponse {
  user: AdminUserDetail;
  repos: UserRepo[];
  channels: UserChannel[];
  connectedAccounts: ConnectedAccount[];
}

// Ban Types
export interface BanUserRequest {
  action: "ban" | "unban";
  banReason?: string;
  banExpiresIn?: number;
}

export interface BanUserResponse {
  success: boolean;
  action: "banned" | "unbanned";
}

// Error Types
export interface ApiError {
  error: string;
}
