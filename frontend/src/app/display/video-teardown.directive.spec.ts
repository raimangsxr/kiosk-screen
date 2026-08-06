import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { VideoTeardownDirective } from './video-teardown.directive';

@Component({
  standalone: true,
  imports: [VideoTeardownDirective],
  template: `
    @if (show) {
      <video appVideoTeardown [src]="src"></video>
    }
  `,
})
class HostComponent {
  show = true;
  src = 'blob:https://example.test/abc';
}

describe('VideoTeardownDirective', () => {
  it('pauses, detaches the source and reloads the video when it leaves the DOM', () => {
    const fixture = TestBed.configureTestingModule({ imports: [HostComponent] }).createComponent(
      HostComponent,
    );
    fixture.detectChanges();

    const video = fixture.nativeElement.querySelector('video') as HTMLVideoElement;
    const pause = spyOn(video, 'pause');
    const removeAttribute = spyOn(video, 'removeAttribute').and.callThrough();
    const load = spyOn(video, 'load');

    fixture.componentInstance.show = false;
    fixture.detectChanges();

    expect(pause).toHaveBeenCalled();
    expect(removeAttribute).toHaveBeenCalledWith('src');
    expect(load).toHaveBeenCalled();
  });
});
