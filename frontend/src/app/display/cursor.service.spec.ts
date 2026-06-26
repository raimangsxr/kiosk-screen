import { TestBed } from '@angular/core/testing';

import { CursorService } from './cursor.service';

describe('CursorService (pure transitions)', () => {
  let service: CursorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CursorService]
    });
    service = TestBed.inject(CursorService);
  });

  describe('applySetCursor', () => {
    it('updates both ids for a regular item', () => {
      const result = service.applySetCursor('item-1', null, true);
      expect(result).toEqual({ currentContentId: 'item-1', regularCursorId: 'item-1' });
    });

    it('only updates currentContentId for a recurring item (isRegular=false)', () => {
      const result = service.applySetCursor('item-recurring', 'item-prev', false);
      expect(result).toEqual({
        currentContentId: 'item-recurring',
        regularCursorId: 'item-prev'
      });
    });

    it('clears both ids when itemId is null', () => {
      const result = service.applySetCursor(null, 'item-prev', true);
      expect(result).toEqual({ currentContentId: null, regularCursorId: null });
    });
  });

  describe('applyEnterFixed', () => {
    it('memorizes the current cursor on the first pin', () => {
      const result = service.applyEnterFixed('fixed', 'item-loop', null);
      expect(result).toEqual({
        currentContentId: 'fixed',
        loopCursorBeforeFixed: 'item-loop'
      });
    });

    it('preserves the previously memorized cursor on subsequent pins', () => {
      const result = service.applyEnterFixed('fixed-2', 'item-other', 'item-loop');
      expect(result).toEqual({
        currentContentId: 'fixed-2',
        loopCursorBeforeFixed: 'item-loop'
      });
    });

    it('records null as the memorized cursor when no item was displayed', () => {
      const result = service.applyEnterFixed('fixed', null, null);
      expect(result.loopCursorBeforeFixed).toBeNull();
      expect(result.currentContentId).toBe('fixed');
    });
  });

  describe('applyExitFixed', () => {
    it('restores the memorized cursor and clears the memory', () => {
      const result = service.applyExitFixed('fixed', 'item-loop');
      expect(result).toEqual({ currentContentId: 'item-loop', loopCursorBeforeFixed: null });
    });

    it('leaves the cursor untouched when no memory was set', () => {
      const result = service.applyExitFixed('fixed', null);
      expect(result).toEqual({ currentContentId: 'fixed', loopCursorBeforeFixed: null });
    });
  });
});