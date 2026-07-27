import { ContentItem } from '../../core/api/content.api';
import { RotationAnimation } from '../../shared/media-upload.models';

/**
 * Pure presentation helpers for a {@link ContentItem}, shared by the content
 * list table and its card variant so both render identical copy. Extracted
 * from `ContentListComponent` during the CHG-046 structural split.
 */

export function contentTypeLabel(type: ContentItem['contentType']): string {
  switch (type) {
    case 'photo':
      return 'Foto';
    case 'video':
      return 'Vídeo';
    default:
      return type;
  }
}

export function contentMediaLabel(item: ContentItem): string {
  if (item.mediaFile) {
    return item.mediaFile.originalFilename;
  }
  return 'Origen externo';
}

export function contentRotationSummary(item: ContentItem): string {
  const duration = item.effectiveDurationSeconds ?? item.durationSeconds;
  const animation: RotationAnimation | null | undefined =
    item.effectiveRotationAnimation ?? item.rotationAnimation;
  const durationLabel = duration ? `${duration}s` : 'predeterminado';
  const animationLabel = animation ?? 'predeterminada';
  return `${durationLabel}, ${animationLabel}`;
}
