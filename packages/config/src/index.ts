export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface QueueConfig {
  host: string;
  port: number;
}

export interface FileStorageConfig {
  url: string;
  apiKey: string;
  useMock: boolean;
}
