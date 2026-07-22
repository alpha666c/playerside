import * as migration_20260721_032229_initial from './20260721_032229_initial';
import * as migration_20260721_033208 from './20260721_033208';
import * as migration_20260721_162047_add_reviews_and_bonuses from './20260721_162047_add_reviews_and_bonuses';
import * as migration_20260721_164432_add_agent_logs from './20260721_164432_add_agent_logs';
import * as migration_20260721_214311_sync_locked_rubric_weights from './20260721_214311_sync_locked_rubric_weights';
import * as migration_20260722_020512_add_operator_and_research_queue from './20260722_020512_add_operator_and_research_queue';
import * as migration_20260722_022400_add_case_governance_foundation from './20260722_022400_add_case_governance_foundation';

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
    name: '20260721_164432_add_agent_logs',
  },
  {
    up: migration_20260721_214311_sync_locked_rubric_weights.up,
    down: migration_20260721_214311_sync_locked_rubric_weights.down,
    name: '20260721_214311_sync_locked_rubric_weights',
  },
  {
    up: migration_20260722_020512_add_operator_and_research_queue.up,
    down: migration_20260722_020512_add_operator_and_research_queue.down,
    name: '20260722_020512_add_operator_and_research_queue',
  },
  {
    up: migration_20260722_022400_add_case_governance_foundation.up,
    down: migration_20260722_022400_add_case_governance_foundation.down,
    name: '20260722_022400_add_case_governance_foundation'
  },
];
