export interface AuthenticatedActor {
  actorId: string;
  actorType: 'admin' | 'analyst' | 'uploader' | 'system';
  sessionId?: string;
  permissions: string[];
}
