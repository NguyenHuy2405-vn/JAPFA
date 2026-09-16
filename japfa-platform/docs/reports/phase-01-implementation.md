# Phase 01 Implementation Report

**Ngày:** 2026-09-15  
**Phase:** 01 — Foundation & Governance

## Tóm tắt

Đã triển khai access control helpers và áp dụng access matrix cho 12 collections. Các collection append-only (`wms-transactions`, `audit-logs`) bị deny update/delete; Notifications và Audit Logs chỉ cho system create; các collection master data dùng `adminOnly` cho create/read/update/delete theo governance Phase 01.

Đã thêm test cho ADMIN/non-admin access, authenticated access, deny-all, WMS append-only và Audit Logs append-only. Test suite chạy thành công trên project hiện tại.

## Files đã thay đổi

| File                                                                                             | Loại     | Mô tả                                                               |
| ------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------- |
| [src/access/admin-only.ts](../../src/access/admin-only.ts)                                       | Modified | Chuẩn hóa `adminOnly`, compatibility exports và `systemOnly`.       |
| [src/access/authenticated.ts](../../src/access/authenticated.ts)                                 | New      | Access helper cho authenticated user.                               |
| [src/access/deny-all.ts](../../src/access/deny-all.ts)                                           | New      | Access helper luôn deny.                                            |
| [src/access/**tests**/access-control.test.ts](../../src/access/__tests__/access-control.test.ts) | New      | Test access helpers và append-only collections.                     |
| [src/collections/Users.ts](../../src/collections/Users.ts)                                       | Modified | Read-only `authzVersion`, `createdBy`; delete deny.                 |
| [src/collections/Tenants.ts](../../src/collections/Tenants.ts)                                   | Modified | Admin delete; `tenantId` read-only.                                 |
| [src/collections/Flocks.ts](../../src/collections/Flocks.ts)                                     | Modified | Admin delete; `flockId` read-only.                                  |
| [src/collections/Products.ts](../../src/collections/Products.ts)                                 | Modified | Admin delete; `sku` read-only.                                      |
| [src/collections/FeedStandards.ts](../../src/collections/FeedStandards.ts)                       | Modified | Admin delete theo matrix.                                           |
| [src/collections/PolicyThresholds.ts](../../src/collections/PolicyThresholds.ts)                 | Modified | Admin delete theo matrix.                                           |
| [src/collections/Orders.ts](../../src/collections/Orders.ts)                                     | Modified | Admin delete theo matrix; `orderId` read-only và không update được. |
| [src/collections/WmsTransactions.ts](../../src/collections/WmsTransactions.ts)                   | Modified | Dùng deny helper riêng; update/delete deny.                         |
| [src/collections/FmsDailyLogs.ts](../../src/collections/FmsDailyLogs.ts)                         | Modified | Admin delete theo matrix.                                           |
| [src/collections/TransferRequests.ts](../../src/collections/TransferRequests.ts)                 | Modified | Admin delete; `transferId` read-only và không update được.          |
| [src/collections/Notifications.ts](../../src/collections/Notifications.ts)                       | Modified | System create, admin read, deny update/delete.                      |
| [src/collections/AuditLogs.ts](../../src/collections/AuditLogs.ts)                               | Modified | System create, admin read, deny update/delete.                      |

## Sensitive fields

- `authzVersion` và `createdBy` đã có `admin.readOnly: true` và field-level update deny.
- `orderId`, `transferId`, `tenantId`, `flockId` và `sku` đã được đánh dấu read-only và không cho update.
- `password`, `hash`, `salt` là auth fields do Payload Auth tự sinh/quản lý; không khai báo trùng trong `fields` vì sẽ gây xung đột schema/auth. Việc quản lý chúng vẫn thuộc Payload Auth layer và không mở update field-level qua custom schema.

## Test Execution

### Command

```bash
pnpm test
```

### Output thực tế

```text
RUN v2.1.9 D:/JAPFA/japfa-platform

✓ src/access/__tests__/access-control.test.ts (5)
✓ src/domains/__tests__/state-machine.test.ts (6)
✓ src/services/idempotency/__tests__/idempotency.integration.test.ts (3)

Test Files  3 passed (3)
     Tests  14 passed (14)
  Duration  7.60s
```

### Validation bổ sung

```text
pnpm typecheck  -> pass
pnpm lint       -> pass
```

## Acceptance Criteria

- [x] `adminOnly` cho phép ADMIN và chặn non-admin.
- [x] WMS update/delete bị deny.
- [x] AuditLogs update/delete bị deny.
- [x] Access matrix được áp dụng cho 12 collections.
- [x] Generated identifiers được đánh dấu read-only.
- [x] Test suite pass 14/14.

## Known Issues

- Matrix Phase 01 ghi Users role có `OPERATOR`, `FARM`, nhưng implementation hiện tại chỉ khai báo option `ADMIN`; thay đổi role model cần một phase riêng và migration/access review.
- `systemOnly` yêu cầu `req.context.system === true`; internal service hiện dùng `overrideAccess: true`, nên các service call hiện hữu vẫn cần chuẩn hóa context nếu muốn enforce system boundary ở mọi path.
- Full production build không được rerun trong lượt này; lần kiểm tra trước bị Windows `EPERM` tại `.next\trace`.

## Next Steps

- [ ] Chuẩn hóa system request context cho audit/notification writes.
- [ ] Bổ sung test access matrix cho từng collection nếu cần compliance evidence.
- [ ] Review role model trước khi mở `OPERATOR` và `FARM` trong Users.
- [ ] Retry production build sau khi xử lý process/quyền khóa `.next\trace`.

## Rollback Plan

- Revert access changes collection-by-collection về policy trước Phase 01 nếu gây gián đoạn vận hành.
- Giữ append-only cho WMS và Audit Logs trong mọi rollback; không mở update/delete để sửa dữ liệu lịch sử.
- Nếu system-only create chặn một internal path, tạm thời dùng trusted `overrideAccess` trong service boundary và ghi audit đầy đủ.

## Blocker Fix Update — 2026-09-15

- Đã mở rộng role options thành `ADMIN`, `OPERATOR`, `FARM`; existing `ADMIN` users giữ nguyên.
- Orders và Transfer Requests dùng `operatorOrAdmin` cho create/update, authenticated cho read.
- FMS Daily Logs dùng authenticated cho create/read/update và ADMIN cho delete.
- Role/access regression tests nằm trong [access-control.test.ts](../../src/access/__tests__/access-control.test.ts).
- Production build đã pass sau clean Windows build procedure; chi tiết tại [fix-blocker-03-production-build.md](./fix-blocker-03-production-build.md).
