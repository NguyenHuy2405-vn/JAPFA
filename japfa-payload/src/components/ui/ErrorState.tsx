type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Không thể tải dữ liệu",
  message = "Vui lòng kiểm tra kết nối và thử lại.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-red-200 bg-red-50 p-12 text-center">
      <div className="text-4xl">⚠️</div>
      <h3 className="mt-4 text-base font-semibold text-red-800">{title}</h3>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
        >
          Thử lại
        </button>
      )}
    </div>
  );
}
