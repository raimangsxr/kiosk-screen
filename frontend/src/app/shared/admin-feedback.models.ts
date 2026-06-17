export type AdminMessageType = 'success' | 'error' | 'info';

export interface AdminFeedbackMessage {
  type: AdminMessageType;
  text: string;
}
