import { StartVideoCallRequest } from '../types/video.types';

export class VideoCallValidator {
  static validateStartVideoCallRequest(data: any): StartVideoCallRequest {
    const errors: string[] = [];

    // Validate displayName
    if (!data.displayName || typeof data.displayName !== 'string') {
      errors.push('displayName is required and must be a string');
    }

    if (data.displayName?.length > 256) {
      errors.push('displayName must be less than 256 characters');
    }

    // Validate optional email
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('email format is invalid');
    }

    // Validate optional phone
    if (data.phoneNumber && !this.isValidPhoneNumber(data.phoneNumber)) {
      errors.push('phoneNumber format is invalid');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return {
      appointmentId: data.appointmentId,
      displayName: data.displayName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      attributes: data.attributes || {},
    };
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidPhoneNumber(phone: string): boolean {
    // Basic validation - adjust based on your requirements
    const phoneRegex = /^[\d\s\-\+\(\)]{7,}$/;
    return phoneRegex.test(phone);
  }
}