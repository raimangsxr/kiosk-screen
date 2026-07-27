import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { OverlayModule } from '@angular/cdk/overlay';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import {
  MediaHoverPreviewPanelComponent,
  MediaHoverPreviewService
} from './media-hover-preview.component';

describe('MediaHoverPreviewService', () => {
  let service: MediaHoverPreviewService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, OverlayModule, MediaHoverPreviewPanelComponent],
      providers: [MediaHoverPreviewService]
    });
    service = TestBed.inject(MediaHoverPreviewService);
  });

  afterEach(() => {
    service.hideImmediate();
  });

  it('opens hover preview on focus within 500ms', fakeAsync(() => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    service.showHover(trigger, {
      mediaUrl: 'https://example.com/photo.jpg',
      contentType: 'photo'
    });
    tick(50);
    expect(document.querySelector('[data-testid="media-hover-preview-image"]')).not.toBeNull();
    service.hideImmediate();
    trigger.remove();
  }));

  it('closes on Escape', fakeAsync(() => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    service.showHover(trigger, {
      mediaUrl: 'https://example.com/photo.jpg',
      contentType: 'photo'
    });
    tick(50);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    service.hideImmediate();
    tick(50);
    expect(document.querySelector('[data-testid="media-hover-preview-image"]')).toBeNull();
    trigger.remove();
  }));

  it('does not open preview without media url', () => {
    const trigger = document.createElement('button');
    service.showHover(trigger, { mediaUrl: '', contentType: 'photo' });
    expect(document.querySelector('[data-testid="media-hover-preview-image"]')).toBeNull();
  });
});
