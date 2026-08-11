import * as migration_20260721_032229_initial from './20260721_032229_initial';
import * as migration_20260721_033208 from './20260721_033208';
import * as migration_20260721_162047_add_reviews_and_bonuses from './20260721_162047_add_reviews_and_bonuses';
import * as migration_20260721_164432_add_agent_logs from './20260721_164432_add_agent_logs';
import * as migration_20260721_214311_sync_locked_rubric_weights from './20260721_214311_sync_locked_rubric_weights';
import * as migration_20260722_020512_add_operator_and_research_queue from './20260722_020512_add_operator_and_research_queue';
import * as migration_20260722_022400_add_case_governance_foundation from './20260722_022400_add_case_governance_foundation';
import * as migration_20260722_025903_harden_governance_phase2a from './20260722_025903_harden_governance_phase2a';
import * as migration_20260722_025946_remove_chat_history_placeholder from './20260722_025946_remove_chat_history_placeholder';
import * as migration_20260722_033154_protect_evidence_media from './20260722_033154_protect_evidence_media';
import * as migration_20260723_002255_add_research_queue_version from './20260723_002255_add_research_queue_version';
import * as migration_20260806_225622 from './20260806_225622';
import * as migration_20260808_add_claims_vs_reality from './20260808_add_claims_vs_reality';
import * as migration_20260809_162628 from './20260809_162628';
import * as migration_20260809_182227 from './20260809_182227';
import * as migration_20260809_183111 from './20260809_183111';
import * as migration_20260809_184012 from './20260809_184012';
import * as migration_20260809_185901 from './20260809_185901';
import * as migration_20260809_203730 from './20260809_203730';
import * as migration_20260809_210514 from './20260809_210514';
import * as migration_20260809_211624 from './20260809_211624';
import * as migration_20260810_add_system_settings_keys from './20260810_add_system_settings_keys';
import * as migration_20260811_add_open_seo_settings from './20260811_add_open_seo_settings';

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
    name: '20260722_022400_add_case_governance_foundation',
  },
  {
    up: migration_20260722_025903_harden_governance_phase2a.up,
    down: migration_20260722_025903_harden_governance_phase2a.down,
    name: '20260722_025903_harden_governance_phase2a',
  },
  {
    up: migration_20260722_025946_remove_chat_history_placeholder.up,
    down: migration_20260722_025946_remove_chat_history_placeholder.down,
    name: '20260722_025946_remove_chat_history_placeholder',
  },
  {
    up: migration_20260722_033154_protect_evidence_media.up,
    down: migration_20260722_033154_protect_evidence_media.down,
    name: '20260722_033154_protect_evidence_media',
  },
  {
    up: migration_20260723_002255_add_research_queue_version.up,
    down: migration_20260723_002255_add_research_queue_version.down,
    name: '20260723_002255_add_research_queue_version',
  },
  {
    up: migration_20260806_225622.up,
    down: migration_20260806_225622.down,
    name: '20260806_225622',
  },
  {
    up: migration_20260808_add_claims_vs_reality.up,
    down: migration_20260808_add_claims_vs_reality.down,
    name: '20260808_add_claims_vs_reality',
  },
  {
    up: migration_20260809_162628.up,
    down: migration_20260809_162628.down,
    name: '20260809_162628',
  },
  {
    up: migration_20260809_182227.up,
    down: migration_20260809_182227.down,
    name: '20260809_182227',
  },
  {
    up: migration_20260809_183111.up,
    down: migration_20260809_183111.down,
    name: '20260809_183111',
  },
  {
    up: migration_20260809_184012.up,
    down: migration_20260809_184012.down,
    name: '20260809_184012',
  },
  {
    up: migration_20260809_185901.up,
    down: migration_20260809_185901.down,
    name: '20260809_185901',
  },
  {
    up: migration_20260809_203730.up,
    down: migration_20260809_203730.down,
    name: '20260809_203730',
  },
  {
    up: migration_20260809_210514.up,
    down: migration_20260809_210514.down,
    name: '20260809_210514',
  },
  {
    up: migration_20260809_211624.up,
    down: migration_20260809_211624.down,
    name: '20260809_211624'
  },
  {
    up: migration_20260810_add_system_settings_keys.up,
    down: migration_20260810_add_system_settings_keys.down,
    name: '20260810_add_system_settings_keys',
  },
  {
    up: migration_20260811_add_open_seo_settings.up,
    down: migration_20260811_add_open_seo_settings.down,
    name: '20260811_add_open_seo_settings',
  },
];
