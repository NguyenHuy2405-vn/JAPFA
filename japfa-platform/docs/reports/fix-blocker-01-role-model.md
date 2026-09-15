# Fix Blocker 01: Role Model

**Ngày:** 2026-09-15

## Tóm tắt

Đã mở rộng role model của Users từ chỉ `ADMIN` thành `ADMIN`, `OPERATOR` và `FARM`. User hiện hữu có role `ADMIN` được giữ nguyên; user mới dùng default `FARM`. Orders/Transfers dùng `operatorOrAdmin` cho create/update và authenticated cho read; FMS Daily Logs cho phép authenticated create/read/update nhưng chỉ ADMIN delete.

## Files changed

| File | Loại | Mô tả |
|---|---|---|
| [src/collections/Users.ts](../../src/collections/Users.ts) | Modified | Thêm role options `OPERATOR`, `FARM`; default user mới `FARM`. |
| [src/access/operator-or-admin.ts](../../src/access/operator-or-admin.ts) | New | Access helper cho ADMIN/OPERATOR. |
| [src/collections/Orders.ts](../../src/collections/Orders.ts) | Modified | Role-aware create/read/update/delete access. |
| [src/collections/TransferRequests.ts](../../src/collections/TransferRequests.ts) | Modified | Role-aware access tương tự Orders. |
| [src/collections/FmsDailyLogs.ts](../../src/collections/FmsDailyLogs.ts) | Modified | Authenticated create/read/update, ADMIN delete. |
| [migrations/20260915_160000_add_role_options.ts](../../migrations/20260915_160000_add_role_options.ts) | New | Additive migration, giữ nguyên existing ADMIN data. |
| [src/access/__tests__/access-control.test.ts](../../src/access/__tests__/access-control.test.ts) | Modified | Test ADMIN/OPERATOR/FARM access. |

## Test Execution

### Command

```bash
pnpm test
```

### Output thực tế

```text
Test Files  5 passed (5)
     Tests  25 passed (25)
  Duration  9.86s
```

### Validation bổ sung

```text
pnpm typecheck  -> pass
pnpm lint       -> pass
pnpm payload migrate -> pass
```

## Acceptance Criteria

- [x] ADMIN can access admin-only policies.
- [x] OPERATOR can create/update Orders and Transfer Requests.
- [x] FARM can create/read/update FMS Daily Logs.
- [x] FARM cannot pass `adminOnly` access.
- [x] Existing ADMIN data is preserved by migration.

## Known Issues

- Default role `FARM` chỉ áp dụng cho user mới; không tự động chuyển existing ADMIN users.
- Tenant-scoped filtering theo membership chưa được thêm; access hiện mới phân biệt role.

## Rollback Plan

- Revert collection role options về chỉ `ADMIN` nếu role rollout gây lỗi.
- Giữ migration additive và không đổi role hiện hữu.
- Nếu FMS write policy quá rộng, tạm chuyển create/read/update về `adminOnly` trong một release riêng.
