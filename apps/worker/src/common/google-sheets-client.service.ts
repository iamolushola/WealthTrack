import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import type { sheets_v4, drive_v3 } from 'googleapis';

export interface GoogleCredentials {
  type: 'service_account' | 'oauth2';
  // service_account fields
  client_email?: string;
  private_key?: string;
  project_id?: string;
  // oauth2 fields
  client_id?: string;
  client_secret?: string;
  refresh_token?: string;
}

@Injectable()
export class GoogleSheetsClientService {
  private readonly logger = new Logger(GoogleSheetsClientService.name);

  async buildSheets(credentials: GoogleCredentials): Promise<sheets_v4.Sheets> {
    const auth = this.buildAuth(credentials);
    return google.sheets({ version: 'v4', auth: auth as never });
  }

  async buildDrive(credentials: GoogleCredentials): Promise<drive_v3.Drive> {
    const auth = this.buildAuth(credentials);
    return google.drive({ version: 'v3', auth: auth as never });
  }

  parseCredentials(raw: string): GoogleCredentials {
    try {
      return JSON.parse(raw) as GoogleCredentials;
    } catch {
      throw new Error('Failed to parse Google credentials JSON');
    }
  }

  private buildAuth(credentials: GoogleCredentials): ReturnType<typeof google.auth.fromJSON> | InstanceType<typeof google.auth.OAuth2> {
    if (credentials.type === 'service_account') {
      return google.auth.fromJSON(credentials as Parameters<typeof google.auth.fromJSON>[0]) as ReturnType<typeof google.auth.fromJSON>;
    }

    const oauth2 = new google.auth.OAuth2(credentials.client_id, credentials.client_secret);
    oauth2.setCredentials({ refresh_token: credentials.refresh_token });
    return oauth2;
  }
}
