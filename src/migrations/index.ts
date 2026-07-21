import * as migration_20260721_032229_initial from './20260721_032229_initial';
import * as migration_20260721_033208 from './20260721_033208';
import * as migration_20260721_162047_add_reviews_and_bonuses from './20260721_162047_add_reviews_and_bonuses';
import * as migration_20260721_164432_add_agent_logs from './20260721_164432_add_agent_logs';

export const migrations = [
  {
    up: migration_20260721_032229_initial.up,
    down: migration_20260721_032229_initial.down,
    name: '20260721_032229_initial',
  },
  {
    up: migration_20260721_033208.up,
    down: migration_20260721_033208.down,
    name: '20260721_033208',
  },
  {
    up: migration_20260721_162047_add_reviews_and_bonuses.up,
    down: migration_20260721_162047_add_reviews_and_bonuses.down,
    name: '20260721_162047_add_reviews_and_bonuses',
  },
  {
    up: migration_20260721_164432_add_agent_logs.up,
    down: migration_20260721_164432_add_agent_logs.down,
    name: '20260721_164432_add_agent_logs'
  },
];
