# Fix Blocker 03: Production Build

**Ngày:** 2026-09-15

## Tóm tắt

Đã xử lý Windows `EPERM` tại `.next\\trace` bằng cách dừng Node processes, xóa build/cache artifacts, prune pnpm store và reinstall dependencies. Production build sau đó hoàn tất thành công trên Windows, không cần WSL.

## Files changed

| File                                   | Loại      | Mô tả                                                       |
| -------------------------------------- | --------- | ----------------------------------------------------------- |
| [package.json](../../package.json)     | Existing  | Dependency/toolchain được reinstall theo lockfile hiện tại. |
| [pnpm-lock.yaml](../../pnpm-lock.yaml) | Existing  | Được pnpm kiểm tra trong clean install.                     |
| `.next/`                               | Generated | Đã xóa và tạo lại trong build; không phải source artifact.  |

## Build Execution

### Commands

```powershell
taskkill /F /IM node.exe
Remove-Item .next -Recurse -Force
Remove-Item node_modules/.cache -Recurse -Force
pnpm store prune
pnpm install
pnpm build
```

### Output thực tế

```text
▲ Next.js 15.4.11
Creating an optimized production build ...
✓ Compiled successfully in 88s
✓ Checking validity of types
✓ Collecting page data
✓ Generating static pages (5/5)
✓ Collecting build traces
✓ Finalizing page optimization

○ (Static) prerendered as static content
ƒ (Dynamic) server-rendered on demand
```

## Acceptance Criteria

- [x] Windows EPERM tại `.next\\trace` được xử lý.
- [x] Clean install hoàn tất.
- [x] `pnpm build` pass.
- [x] Không cần WSL fallback.
- [x] Không có destructive source change hoặc migration để xử lý build.

## Known Issues

- `taskkill` báo không tìm thấy `node.exe` tại thời điểm chạy vì process đã dừng; cleanup vẫn hoàn tất.
- Build vẫn in warning email adapter chưa cấu hình trong Payload ở các command runtime, nhưng không làm build fail.

## Rollback Plan

- Xóa `.next/` và chạy lại build nếu artifact corrupt.
- Revert dependency/lockfile nếu clean install tạo ra thay đổi ngoài ý muốn.
- Giữ source code và database schema độc lập với build artifact; không cần rollback migration.
