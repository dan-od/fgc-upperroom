// src/api/types.ts

export type AdminRole = "super_admin" | "editor" | "reviewer";

export type GivingTransactionStatus = "pending" | "success" | "failed" | "abandoned";

export type GivingTransactionTimelineEntry = {
  event: string;
  status: GivingTransactionStatus;
  at: string;
  payloadHash: string;
};

export type GivingTransaction = {
  id: string;
  reference: string;
  provider: "paystack" | "crypto" | "bank_transfer";
  status: GivingTransactionStatus;
  amountKobo: number;
  currency: string;
  fund: string;
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  message: string;
  source: string;
  providerStatus: string;
  providerMessage: string;
  initializedAt: string;
  updatedAt: string;
  paidAt: string | null;
  timeline: GivingTransactionTimelineEntry[];
  metadata: Record<string, unknown>;
  txHash?: string;
  walletAddress?: string;
};

export type RumMetricEvent = {
  id: string;
  metric: string;
  value: number;
  rating: string;
  page: string;
  route: string;
  source: string;
  userAgent: string;
  ip?: string;
  timestamp: string;
};

export type ContactSubmission = {
  id: string;
  ticketId: string;
  name: string;
  email: string;
  phoneNumber: string;
  subject: string;
  subjectLabel: string;
  message: string;
  source: string;
  createdAt: string;
  autoResponseMessage: string;
};

export type AdminUserRecord = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  passwordHash: string;
  passwordSalt: string;
  isActive: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  pendingTwoFactorSecret: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

export type AdminSessionRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

export type AdminAuditLogEntry = {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actorRole: AdminRole | null;
  action: string;
  resource: string;
  ip: string;
  userAgent: string;
  details: Record<string, unknown>;
  createdAt: string;
};

export type AdminResetTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
};

export type AdminTestimonyRecord = {
  id: string;
  name: string;
  role: string;
  quote: string;
  createdAt: string;
  updatedAt: string | null;
};
