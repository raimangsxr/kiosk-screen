export type RotationAnimation = 'none' | 'fade' | 'slide';

export interface MediaFileReference {
  id: string;
  mediaType: 'image' | 'video';
  contentType: string;
  fileSizeBytes: number;
  originalFilename: string;
  mediaUrl: string;
}

export const ROTATION_ANIMATIONS: RotationAnimation[] = ['none', 'fade', 'slide'];
