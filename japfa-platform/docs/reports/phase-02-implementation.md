# Phase 02 Implementation Report

**Ngày:** 2026-09-15
**Phase:** 02 — Core Domain & Data Model

## Tóm tắt

Đã đọc và triển khai các phần Phase 02 còn thiếu trên schema hiện tại: state machine Order/Transfer được đồng bộ với ERD/state diagram, generated IDs được bổ sung cho các domain record, WMS/Audit giữ append-only, và field contract tests được thêm trên Payload collection configs.

Do repository đã có schema production/migrations riêng, các field đang được service sử dụng như `Tenants.type`, `Products.productType`, `FmsDailyLogs.feedQtyAct`, `Notifications.message` được giữ nguyên để tránh phá dữ liệu. Các khác biệt này được ghi trong Known Issues thay vì đổi tên destructive.

## Files đã thay đổi

| File | Loại | Mô tả |
|---|---|---|
| [src/domains/orders/state-machine.ts](../../src/domains/orders/state-machine.ts) | Modified | Cho phép transition `SUBMITTED/APPROVED -> CANCELLED`, validate finite state machine. |
| [src/domains/transfers/state-machine.ts](../../src/domains/transfers/state-machine.ts) | Modified | Đồng bộ transfer lifecycle với Order state machine. |
| [src/collections/Orders.ts](../../src/collections/Orders.ts) | Existing | Đã có generated `ORD` ID hook và `orderId` read-only; được kiểm tra bằng contract test. |
| [src/collections/TransferRequests.ts](../../src/collections/TransferRequests.ts) | Existing | Đã có generated `TRF` ID hook và `transferId` read-only; được kiểm tra bằng contract test. |
| [src/collections/FeedStandards.ts](../../src/collections/FeedStandards.ts) | Modified | Thêm `standardId` required/unique/read-only và generated ID hook. |
| [src/collections/PolicyThresholds.ts](../../src/collections/PolicyThresholds.ts) | Modified | Thêm `thresholdId` required/unique/read-only và generated ID hook. |
| [src/collections/FmsDailyLogs.ts](../../src/collections/FmsDailyLogs.ts) | Modified | Thêm `logId` required/unique/read-only và generated ID hook. |
| [src/collections/WmsTransactions.ts](../../src/collections/WmsTransactions.ts) | Existing | Append-only: update/delete deny. |
| [src/collections/AuditLogs.ts](../../src/collections/AuditLogs.ts) | Existing | Append-only: update/delete deny. |
| [migrations/20260915_150000_add_phase2_generated_ids.ts](../../migrations/20260915_150000_add_phase2_generated_ids.ts) | New | Backfill và unique index cho `standardId`, `thresholdId`, `logId`. |
| [src/collections/__tests__/phase-02-contracts.test.ts](../../src/collections/__tests__/phase-02-contracts.test.ts) | New | Test field contract, append-only policy và generated IDs. |
| [src/domains/__tests__/state-machine.test.ts](../../src/domains/__tests__/state-machine.test.ts) | Existing/Updated coverage | Test happy path và invalid transitions. |
| [payload-types.ts](../../payload-types.ts) | Generated | Regenerated Payload types sau schema changes. |

## Field Contract Applied

- Generated identifiers `orderId`, `transferId`, `standardId`, `thresholdId`, `logId` là `required`, `unique`, `admin.readOnly` và bị chặn update ở field level.
- Các relationship chính dùng Payload `relationship`: tenant, flock, product, order, transfer và user.
- WMS transactions giữ append-only ở collection access: `update: denyAll`, `delete: denyAll`.
- Audit logs giữ append-only: `update: denyAll`, `delete: denyAll`.
- Các field calculated của WMS (`beginQuantity`, `inQuantity`, `outQuantity`, `endQuantity`) được giữ read-only.
- Các field migration/source legacy được giữ nguyên vì đang được dùng trong migrations/import flows.

## State Machine

- Order statuses: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `IN_TRANSIT`, `RECEIVED`, `COMPLETED`, `CANCELLED`.
- Transfer dùng cùng lifecycle finite-state.
- Transition `SUBMITTED -> CANCELLED` và `APPROVED -> CANCELLED` đã được bổ sung theo Phase 02 diagram.
- Terminal states `REJECTED`, `COMPLETED`, `CANCELLED` không được mở lại.
- Invalid source/target status bị từ chối bằng `INVALID_TRANSITION`.

## Test Execution

### Command

```bash
pnpm test
```

### Output thực tế

```text
RUN v2.1.9 D:/JAPFA/japfa-platform

✓ src/collections/__tests__/phase-02-contracts.test.ts (5)
✓ src/access/__tests__/access-control.test.ts (5)
✓ src/domains/__tests__/state-machine.test.ts (6)
✓ src/services/idempotency/__tests__/idempotency.integration.test.ts (3)

Test Files  4 passed (4)
     Tests  19 passed (19)
  Duration  8.16s
```

Migration được chạy trước test trên PostgreSQL thật:

```text
Migrated: 20260915_150000_add_phase2_generated_ids
```

### Validation bổ sung

```text
pnpm typecheck  -> pass
pnpm lint       -> pass
```

## Acceptance Criteria

- [x] State machine Order được implement và test.
- [x] State machine Transfer được implement và test.
- [x] Generated IDs `ORD-*`, `TRF-*`, `FST-*`, `POL-*`, `FMS-*` được tạo khi create.
- [x] WMS transactions append-only.
- [x] Audit logs append-only.
- [x] Field contract tests cho generated IDs và read-only fields pass.
- [x] Migration backfill/unique indexes chạy trên PostgreSQL.
- [x] `pnpm test` pass 19/19.
- [x] `pnpm typecheck` pass.
- [x] `pnpm lint` pass.
- [ ] Toàn bộ field contract trong tài liệu khớp 1:1 với production schema hiện tại.

## Known Issues

- Phase 02 document mô tả một số field khác tên với production schema hiện tại: `tenantType` vs `type`, `Products.category` vs `productType`, và notification `content/targetUser` vs `message/recipient`.
- `users.password`, `hash`, `salt` là auth fields do Payload quản lý tự động, không khai báo trùng trong collection fields.
- `FmsDailyLogs` hiện dùng các field production như `feedQtyAct`, `endQty`, `mortAct` thay cho tên rút gọn trong Phase 02 contract.
- Full workflow transaction/rollback thuộc Phase 03, chưa được mở rộng trong report này.

## Next Steps

- [ ] Tạo migration/schema reconciliation riêng nếu cần đổi tên field về contract canonical.
- [ ] Bổ sung ERD relationship tests cho tenant ownership và inventory scope.
- [ ] Bổ sung PostgreSQL integration tests cho Order/Transfer/WMS lifecycle.
- [ ] Hoàn thiện Phase 03 rollback tests sau khi Phase 02 schema reconciliation được chốt.

## Rollback Plan

- Nếu generated ID migration gây lỗi, giữ các cột additive và rollback application về version trước; không drop dữ liệu production.
- Nếu state transition mới gây regression, revert riêng transition map về version trước nhưng giữ test để xác định hành vi mong muốn.
- Nếu contract reconciliation gây migration risk, giữ production field names hiện tại và thực hiện mapping ở domain service thay vì đổi schema trực tiếp.
