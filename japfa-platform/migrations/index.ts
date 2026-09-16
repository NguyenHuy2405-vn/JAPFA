import * as migration_20260904_034732_initial_payload_schema from "./20260904_034732_initial_payload_schema";
import * as migration_20260904_150000_widen_user_auth_columns from "./20260904_150000_widen_user_auth_columns";
import * as migration_20260904_160000_add_fms_source_tenant from "./20260904_160000_add_fms_source_tenant";
import * as migration_20260904_170000_fix_wms_tenant_types from "./20260904_170000_fix_wms_tenant_types";
import * as migration_20260907_143000_add_loss_transaction_type from "./20260907_143000_add_loss_transaction_type";
import * as migration_20260907_150000_add_order_location_display from "./20260907_150000_add_order_location_display";
import * as migration_20260907_160000_add_flock_source_group from "./20260907_160000_add_flock_source_group";
import * as migration_20260908_100000_allow_null_fms_bird_count from "./20260908_100000_allow_null_fms_bird_count";
import * as migration_20260910_200000_consolidate_phase4_schema from "./20260910_200000_consolidate_phase4_schema";
import * as migration_20260910_210000_add_notifications from "./20260910_210000_add_notifications";
import * as migration_20260910_220000_add_notification_lock_relation from "./20260910_220000_add_notification_lock_relation";
import * as migration_20260911_000001_align_order_status_enum from "./20260911_000001_align_order_status_enum";
import * as migration_20260911_000002_align_transfer_requests_schema from "./20260911_000002_align_transfer_requests_schema";
import * as migration_20260911_100000_add_audit_logs from "./20260911_100000_add_audit_logs";
import * as migration_20260911_110000_add_audit_log_lock_relation from "./20260911_110000_add_audit_log_lock_relation";
import * as migration_20260911_120000_fix_audit_actor_relation from "./20260911_120000_fix_audit_actor_relation";
import * as migration_20260911_130000_fix_audit_legacy_actor_nullable from "./20260911_130000_fix_audit_legacy_actor_nullable";
import * as migration_20260913_102833_add_transfer_requests from "./20260913_102833_add_transfer_requests";
import * as migration_20260913_180500_ensure_users_sessions_table from "./20260913_180500_ensure_users_sessions_table";
import * as migration_20260914_000001_add_feed_standards_status from "./20260914_000001_add_feed_standards_status";
import * as migration_20260914_000002_add_missing_users_columns from "./20260914_000002_add_missing_users_columns";
import * as migration_20260914_000003_drop_unused_schema from "./20260914_000003_drop_unused_schema";
import * as migration_20260914_102435_add_search_collection from "./20260914_102435_add_search_collection";
import * as migration_20260915_170000_add_phase3_audit_actions from "./20260915_170000_add_phase3_audit_actions";
import * as migration_20260915_180000_add_phase4_jobs_task_slugs from "./20260915_180000_add_phase4_jobs_task_slugs";

export const migrations = [
  {
    up: migration_20260904_034732_initial_payload_schema.up,
    down: migration_20260904_034732_initial_payload_schema.down,
    name: "20260904_034732_initial_payload_schema",
  },
  {
    up: migration_20260904_150000_widen_user_auth_columns.up,
    down: migration_20260904_150000_widen_user_auth_columns.down,
    name: "20260904_150000_widen_user_auth_columns",
  },
  {
    up: migration_20260904_160000_add_fms_source_tenant.up,
    down: migration_20260904_160000_add_fms_source_tenant.down,
    name: "20260904_160000_add_fms_source_tenant",
  },
  {
    up: migration_20260904_170000_fix_wms_tenant_types.up,
    down: migration_20260904_170000_fix_wms_tenant_types.down,
    name: "20260904_170000_fix_wms_tenant_types",
  },
  {
    up: migration_20260907_143000_add_loss_transaction_type.up,
    down: migration_20260907_143000_add_loss_transaction_type.down,
    name: "20260907_143000_add_loss_transaction_type",
  },
  {
    up: migration_20260907_150000_add_order_location_display.up,
    down: migration_20260907_150000_add_order_location_display.down,
    name: "20260907_150000_add_order_location_display",
  },
  {
    up: migration_20260907_160000_add_flock_source_group.up,
    down: migration_20260907_160000_add_flock_source_group.down,
    name: "20260907_160000_add_flock_source_group",
  },
  {
    up: migration_20260908_100000_allow_null_fms_bird_count.up,
    down: migration_20260908_100000_allow_null_fms_bird_count.down,
    name: "20260908_100000_allow_null_fms_bird_count",
  },
  {
    up: migration_20260910_200000_consolidate_phase4_schema.up,
    down: migration_20260910_200000_consolidate_phase4_schema.down,
    name: "20260910_200000_consolidate_phase4_schema",
  },
  {
    up: migration_20260910_210000_add_notifications.up,
    down: migration_20260910_210000_add_notifications.down,
    name: "20260910_210000_add_notifications",
  },
  {
    up: migration_20260910_220000_add_notification_lock_relation.up,
    down: migration_20260910_220000_add_notification_lock_relation.down,
    name: "20260910_220000_add_notification_lock_relation",
  },
  {
    up: migration_20260911_000001_align_order_status_enum.up,
    down: migration_20260911_000001_align_order_status_enum.down,
    name: "20260911_000001_align_order_status_enum",
  },
  {
    up: migration_20260911_000002_align_transfer_requests_schema.up,
    down: migration_20260911_000002_align_transfer_requests_schema.down,
    name: "20260911_000002_align_transfer_requests_schema",
  },
  {
    up: migration_20260911_100000_add_audit_logs.up,
    down: migration_20260911_100000_add_audit_logs.down,
    name: "20260911_100000_add_audit_logs",
  },
  {
    up: migration_20260911_110000_add_audit_log_lock_relation.up,
    down: migration_20260911_110000_add_audit_log_lock_relation.down,
    name: "20260911_110000_add_audit_log_lock_relation",
  },
  {
    up: migration_20260911_120000_fix_audit_actor_relation.up,
    down: migration_20260911_120000_fix_audit_actor_relation.down,
    name: "20260911_120000_fix_audit_actor_relation",
  },
  {
    up: migration_20260911_130000_fix_audit_legacy_actor_nullable.up,
    down: migration_20260911_130000_fix_audit_legacy_actor_nullable.down,
    name: "20260911_130000_fix_audit_legacy_actor_nullable",
  },
  {
    up: migration_20260913_102833_add_transfer_requests.up,
    down: migration_20260913_102833_add_transfer_requests.down,
    name: "20260913_102833_add_transfer_requests",
  },
  {
    up: migration_20260913_180500_ensure_users_sessions_table.up,
    down: migration_20260913_180500_ensure_users_sessions_table.down,
    name: "20260913_180500_ensure_users_sessions_table",
  },
  {
    up: migration_20260914_000001_add_feed_standards_status.up,
    down: migration_20260914_000001_add_feed_standards_status.down,
    name: "20260914_000001_add_feed_standards_status",
  },
  {
    up: migration_20260914_000002_add_missing_users_columns.up,
    down: migration_20260914_000002_add_missing_users_columns.down,
    name: "20260914_000002_add_missing_users_columns",
  },
  {
    up: migration_20260914_000003_drop_unused_schema.up,
    down: migration_20260914_000003_drop_unused_schema.down,
    name: "20260914_000003_drop_unused_schema",
  },
  {
    up: migration_20260914_102435_add_search_collection.up,
    down: migration_20260914_102435_add_search_collection.down,
    name: "20260914_102435_add_search_collection",
  },
  {
    up: migration_20260915_170000_add_phase3_audit_actions.up,
    down: migration_20260915_170000_add_phase3_audit_actions.down,
    name: "20260915_170000_add_phase3_audit_actions",
  },
  {
    up: migration_20260915_180000_add_phase4_jobs_task_slugs.up,
    down: migration_20260915_180000_add_phase4_jobs_task_slugs.down,
    name: "20260915_180000_add_phase4_jobs_task_slugs",
  },
];
