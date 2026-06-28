export interface Pod {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  memberIds: string[];
  videos?: string[];
  skills?: string[];
  rewards?: string[];
  resources?: string[];
  createdAt: Date;
  updatedAt: Date;
  settings: {
    isPublic: boolean;
    allowInvites: boolean;
    maxMembers?: number;
  };
  metadata: {
    color?: string;
    icon?: string;
    tags?: string[];
  };
}

export interface PodMember {
  id: string;
  podId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
  permissions: {
    canInvite: boolean;
    canManageResources: boolean;
    canCreateThreads: boolean;
  };
}

export interface PodInvite {
  id: string;
  podId: string;
  invitedBy: string;
  invitedEmail?: string;
  invitedUserId?: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

export interface CreatePodRequest {
  title: string;
  description?: string;
  settings: {
    isPublic: boolean;
    allowInvites: boolean;
    maxMembers?: number;
  };
  metadata?: {
    color?: string;
    icon?: string;
    tags?: string[];
  };
}

export interface UpdatePodRequest {
  title?: string;
  description?: string;
  videos?: string[];
  skills?: string[];
  rewards?: string[];
  resources?: string[];
  settings?: {
    isPublic?: boolean;
    allowInvites?: boolean;
    maxMembers?: number;
  };
  metadata?: {
    color?: string;
    icon?: string;
    tags?: string[];
  };
}

export interface InviteToPodRequest {
  podId: string;
  email?: string;
  userId?: string;
  role?: 'admin' | 'member';
}

export interface PodResponse {
  success: boolean;
  pod?: Pod;
  pods?: Pod[];
  error?: string;
}
