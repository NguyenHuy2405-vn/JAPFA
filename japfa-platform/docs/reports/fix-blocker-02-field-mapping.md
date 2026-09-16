# Fix Blocker 02: Field Mapping

**Ngày:** 2026-09-15

## Tóm tắt

Đã thêm canonical-to-production field mapping layer để tài liệu domain dùng canonical names nhưng code vẫn giữ production schema hiện hữu. Mapping bao phủ tenants, products, notifications và FMS daily logs; có cả chiều production → canonical và canonical → production cho các field chính.

## Files changed

| File                                                                                                   | Loại     | Mô tả                                              |
| ------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------- |
| [src/domains/shared/field-mapping.ts](../../src/domains/shared/field-mapping.ts)                       | New      | Bảng mapping tập trung.                            |
| [src/domains/tenants/mapper.ts](../../src/domains/tenants/mapper.ts)                                   | New      | `type` ↔ `tenantType`.                             |
| [src/domains/products/mapper.ts](../../src/domains/products/mapper.ts)                                 | New      | `productType` ↔ `category`.                        |
| [src/domains/notifications/mapper.ts](../../src/domains/notifications/mapper.ts)                       | New      | `message`/`recipient` ↔ `content`/`targetUser`.    |
| [src/domains/fms/mapper.ts](../../src/domains/fms/mapper.ts)                                           | New      | `feedQtyAct`/`mortAct`/`endQty` ↔ canonical names. |
| [src/domains/**tests**/field-mapping.test.ts](../../src/domains/__tests__/field-mapping.test.ts)       | New      | Test mapping behavior.                             |
| [docs/phases/02-phase-core-domain-and-data-model.md](../phases/02-phase-core-domain-and-data-model.md) | Modified | Thêm Field Mapping section.                        |

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
```

## Acceptance Criteria

- [x] `tenantType` maps to production `type`.
- [x] `category` maps to production `productType`.
- [x] `content`/`targetUser` map to `message`/`recipient`.
- [x] FMS canonical fields map to production fields.
- [x] Phase 02 documentation contains the production/canonical mapping table.
- [x] No destructive field rename or data migration was required.

## Known Issues

- `avgWeight -> endQty` follows the requested mapping but is semantically unusual; domain owner should confirm before using it for analytics.
- Mapping layer chưa được tích hợp vào mọi service/query path; hiện đã có reusable mappers và tests.

## Rollback Plan

- Stop using mapper imports and keep direct production field access.
- Revert documentation mapping section without changing database schema.
- Vì không có destructive migration, rollback không cần data restore.
