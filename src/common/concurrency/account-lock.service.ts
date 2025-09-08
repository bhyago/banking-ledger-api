import { Injectable } from '@nestjs/common';
import { Mutex } from 'async-mutex';

@Injectable()
export class AccountLockService {
  private readonly locks = new Map<string, Mutex>();

  private getMutex(key: string): Mutex {
    let m = this.locks.get(key);
    if (!m) {
      m = new Mutex();
      this.locks.set(key, m);
    }
    return m;
  }

  async withLocks<T>(keys: string[], fn: () => Promise<T>): Promise<T> {
    const unique = Array.from(new Set(keys.filter(Boolean)));
    unique.sort();
    const releases: Array<() => void> = [];
    try {
      for (const k of unique) {
        const release = await this.getMutex(k).acquire();
        releases.push(release);
      }
      return await fn();
    } finally {
      for (let i = releases.length - 1; i >= 0; i--) {
        try {
          releases[i]();
        } catch {}
      }
    }
  }
}
