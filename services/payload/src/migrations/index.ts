import * as migration_20260508_140051_initial_schema from './20260508_140051_initial_schema';
import * as migration_20260508_143538_auto_20260508_173532 from './20260508_143538_auto_20260508_173532';

export const migrations = [
  {
    up: migration_20260508_140051_initial_schema.up,
    down: migration_20260508_140051_initial_schema.down,
    name: '20260508_140051_initial_schema',
  },
  {
    up: migration_20260508_143538_auto_20260508_173532.up,
    down: migration_20260508_143538_auto_20260508_173532.down,
    name: '20260508_143538_auto_20260508_173532'
  },
];
