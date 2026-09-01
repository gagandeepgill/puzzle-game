/**
 * Every activation sequence has all of its frames, and they are all different.
 *
 * Both halves have already failed in delivery. Spring's six arrived with two
 * of them overwritten by the board tiles from the same download, so the
 * sequence would have flashed a cell mid-launch; the same collision replaced
 * `cell-alt` with a byte-identical copy of `cell`. Neither broke a build or a
 * test — the animation just played the wrong picture.
 *
 * A repeat is not always wrong: a pulse that starts and ends at rest has
 * frame 1 equal to frame 4 on purpose. What is wrong is a repeat in the
 * middle, which is what a clobbered download looks like.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PART_FRAMES } from '../pixel/hudArt.js';

const fileFor = (name: string, i: number) =>
  new URL(`../../../public/assets/pixel/effects/${name}-${i}.png`, import.meta.url);

const digest = (u: URL) => createHash('sha256').update(readFileSync(u)).digest('hex');

describe('part activation frames', () => {
  for (const [name, count] of Object.entries(PART_FRAMES)) {
    it(`${name} has all ${count} frames on disk`, () => {
      for (let i = 1; i <= count; i++) {
        expect(existsSync(fileFor(name, i)), `${name}-${i}.png is missing`).toBe(true);
      }
    });

    it(`${name} repeats a frame only at its ends`, () => {
      const hashes = Array.from({ length: count }, (_, i) => digest(fileFor(name, i + 1)));
      // Frame 1 matching the last is a pulse returning to rest. Any other
      // pair matching means one frame overwrote another.
      const inner = hashes.slice(1, -1);
      expect(new Set(inner).size, `${name} repeats a frame in the middle`)
        .toBe(inner.length);
      for (let i = 1; i < count - 1; i++) {
        expect(hashes[i], `${name}-${i + 1} is the same image as frame 1`)
          .not.toBe(hashes[0]);
      }
    });
  }

  it('no sequence collides with a board tile', () => {
    // The exact failure that took Spring out: two of its frames were the cell
    // tiles, saved over it by a download that shared their names.
    const tiles = ['cell', 'cell-alt'].map((t) =>
      digest(new URL(`../../../public/assets/pixel/tiles/${t}.png`, import.meta.url)));
    for (const [name, count] of Object.entries(PART_FRAMES)) {
      for (let i = 1; i <= count; i++) {
        expect(tiles, `${name}-${i}.png is a board tile`)
          .not.toContain(digest(fileFor(name, i)));
      }
    }
  });
});
