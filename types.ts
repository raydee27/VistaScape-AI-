export interface ImageData {
  base64: string;
  mimeType: string;
}

export interface VideoData {
  videoUrl: string;
  mimeType: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: ImageData;
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  DESCRIBE = 'DESCRIBE',
  GENERATING = 'GENERATING',
  VIDEO_GENERATING = 'VIDEO_GENERATING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}