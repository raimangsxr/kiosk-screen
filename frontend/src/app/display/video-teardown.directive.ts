import { Directive, ElementRef, OnDestroy, inject } from '@angular/core';

/**
 * Releases a `<video>` element's media pipeline when Angular removes it from
 * the DOM.
 *
 * In the kiosk loop a fresh `<video>` is created on every content rotation.
 * Without explicit teardown, Chromium retains the decoder and decoded-frame
 * buffers of the detached element, so RAM climbs monotonically over a
 * multi-hour event until the tab is killed (CHG-051). Pausing, detaching the
 * source and calling `load()` frees those resources immediately.
 */
@Directive({
  selector: 'video[appVideoTeardown]',
  standalone: true,
})
export class VideoTeardownDirective implements OnDestroy {
  private readonly el = inject<ElementRef<HTMLVideoElement>>(ElementRef);

  ngOnDestroy(): void {
    const video = this.el.nativeElement;
    try {
      video.pause();
    } catch {
      // Pausing a not-yet-initialised element can throw; safe to ignore.
    }
    // Detaching the source is what actually releases the decoder + buffers.
    video.removeAttribute('src');
    try {
      // Force the element to re-read the (now empty) source so the media
      // pipeline is torn down synchronously instead of lingering.
      video.load();
    } catch {
      // load() may throw on partially-constructed elements; ignore.
    }
  }
}
