import * as migration_20260721_032229_initial from './20260721_032229_initial';

export const migrations = [
  {
    up: migration_20260721_032229_initial.up,
    down: migration_20260721_032229_initial.down,
    name: '20260721_032229_initial'
  },
];
