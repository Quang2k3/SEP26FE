'use client';

interface Props {
  page: number;          // 0-indexed
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPage: (p: number) => void;
  extraInfo?: string;    // e.g. "2 được chọn"
}

export default function Pagination({ page, totalPages, totalItems, pageSize, onPage, extraInfo }: Props) {
  if (totalPages <= 0) return null;

  // Hiển thị tối đa 5 trang, căn giữa trang hiện tại
  const maxVisible = 5;
  const start = Math.max(0, Math.min(page - Math.floor(maxVisible / 2), totalPages - maxVisible));
  const pages = Array.from({ length: Math.min(maxVisible, totalPages) }, (_, i) => start + i);

  const from = page * pageSize + 1;
  const to   = Math.min((page + 1) * pageSize, totalItems);

  const btn = (disabled: boolean, onClick: () => void, icon: string) => (
    <button onClick={onClick} disabled={disabled}
      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
      <span className="material-symbols-outlined text-[15px]">{icon}</span>
    </button>
  );

  return (
    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
      <p className="text-xs text-gray-400">
        {from}–{to} / {totalItems}
        {extraInfo && <span className="ml-2 text-indigo-600 font-medium">· {extraInfo}</span>}
      </p>
      <div className="flex items-center gap-0.5">
        {btn(page === 0, () => onPage(0), 'first_page')}
        {btn(page === 0, () => onPage(page - 1), 'chevron_left')}
        {pages.map(p => (
          <button key={p} onClick={() => onPage(p)}
            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
              p === page
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
            }`}>
            {p + 1}
          </button>
        ))}
        {btn(page >= totalPages - 1, () => onPage(page + 1), 'chevron_right')}
        {btn(page >= totalPages - 1, () => onPage(totalPages - 1), 'last_page')}
      </div>
    </div>
  );
}
