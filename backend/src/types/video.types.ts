
import type { 
  Meeting,
  Attendee 
} from '@aws-sdk/client-connect';

export interface StartVideoCallRequest {
  displayName: string;
  appointmentId: string;
  email?: string;
  phoneNumber?: string;
  attributes?: Record<string, string>;
}

export interface StartVideoCallResponse {
  contactId: string;
  participantToken: string;
  meeting: Meeting;      
  attendee: Attendee;    
}

export interface VideoCallSession {
  contactId: string;
  participantToken: string;
  displayName: string;
  startedAt: Date;
  meetingId?: string;
}

export interface VideoCallError {
  code: string;
  message: string;
  details?: any;
}