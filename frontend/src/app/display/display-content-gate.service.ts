import { Injectable, computed, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';

import { DisplayContentItem } from '../core/api/display.api';
import { DisplayMediaCacheService } from './display-media-cache.service';
import type { ShowContentPayload } from './display-stream.models';
import { DisplayViewerController } from './display-viewer.controller';

export const GATE_TIMEOUT_MS = 30_000;

@Injectable()
export class DisplayContentGateService {
  private readonly mediaCache = inject(DisplayMediaCacheService);
  private readonly displayViewer = inject(DisplayViewerController);

  private readonly pendingPayload = signal<ShowContentPayload | null>(null);
  private readonly committedPayload = signal<ShowContentPayload | null>(null);
  private gateTimer: ReturnType<typeof setTimeout> | null = null;
  private commitGeneration = 0;

  readonly committedContent = computed(() => this.committedPayload()?.content ?? null);
  readonly committedShowReason = computed(() => this.committedPayload()?.reason ?? 'bootstrap');

  private readonly committedSubject = new Subject<string>();
  /** Emits contentId when content is committed to the viewer. */
  readonly onCommitted = this.committedSubject.asObservable();

  enqueueShowContent(payload: ShowContentPayload): void {
    if (!this.isGateActive()) {
      this.commitImmediately(payload);
      return;
    }

    this.pendingPayload.set(payload);
    this.commitGeneration += 1;
    const generation = this.commitGeneration;
    this.clearGateTimer();
    this.gateTimer = globalThis.setTimeout(() => {
      if (this.commitGeneration !== generation) {
        return;
      }
      this.handleFailure(payload);
    }, GATE_TIMEOUT_MS);
    void this.commitWhenReady(generation);
  }

  applySnapshotContent(payload: ShowContentPayload): void {
    this.clearGateTimer();
    this.pendingPayload.set(null);
    this.commitImmediately(payload);
  }

  clearPending(): void {
    this.clearGateTimer();
    this.pendingPayload.set(null);
  }

  retryPendingCommit(): void {
    const pending = this.pendingPayload();
    if (!pending) {
      return;
    }
    void this.commitWhenReady(this.commitGeneration);
  }

  private async commitWhenReady(generation: number): Promise<void> {
    const payload = this.pendingPayload();
    if (!payload || this.commitGeneration !== generation) {
      return;
    }

    const mediaUrl = this.rawMediaUrl(payload.content);
    if (!mediaUrl) {
      this.commitPayload(payload);
      return;
    }

    const readyState = this.mediaCache.getReadyState(mediaUrl);
    if (readyState === 'failed') {
      this.handleFailure(payload);
      return;
    }

    try {
      await this.mediaCache.ensureReady(mediaUrl, payload.content.contentType);
      if (this.commitGeneration !== generation || this.pendingPayload()?.commandId !== payload.commandId) {
        return;
      }
      this.commitPayload(payload);
    } catch {
      if (this.commitGeneration !== generation || this.pendingPayload()?.commandId !== payload.commandId) {
        return;
      }
      this.handleFailure(payload);
    }
  }

  private commitImmediately(payload: ShowContentPayload): void {
    this.commitPayload(payload);
  }

  private commitPayload(payload: ShowContentPayload): void {
    this.clearGateTimer();
    this.pendingPayload.set(null);
    this.committedPayload.set(payload);
    this.displayViewer.applyShowContent(payload);
    this.committedSubject.next(payload.content.id);
  }

  private handleFailure(payload: ShowContentPayload): void {
    this.clearGateTimer();
    this.pendingPayload.set(null);
    this.displayViewer.reportMediaError(
      payload.content.id,
      { source: 'display_content_gate' },
      payload.commandId,
    );
  }

  private clearGateTimer(): void {
    if (this.gateTimer !== null) {
      globalThis.clearTimeout(this.gateTimer);
      this.gateTimer = null;
    }
  }

  private isGateActive(): boolean {
    if (this.displayViewer.contentMode() !== 'loop') {
      return false;
    }
    if (this.displayViewer.isPaused()) {
      return false;
    }
    if (this.displayViewer.iframeActive()) {
      return false;
    }
    return true;
  }

  private rawMediaUrl(content: DisplayContentItem): string {
    return content.mediaFile?.mediaUrl ?? content.sourceReference;
  }
}
