"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getStoredSession } from "@/services/authService";
import {
  fetchNotificationsByStatus,
  type NotificationItem,
} from "@/services/notificationService";

// Cấu hình thông báo theo role
const ROLE_NOTIFICATION_CONFIG: Record<
  string,
  {
    status: string;
    label: string;
    description: string;
    navigateTo: string;
    color: string;
  }
> = {
  QC: {
    status: "SUBMITTED",
    label: "Chờ QC kiểm tra",
    description: "Keeper vừa scan xong, cần QC duyệt chất lượng",
    navigateTo: "/inbound/gate-check",
    color: "text-yellow-600",
  },
  MANAGER: {
    status: "GRN_CREATED",
    label: "Chờ duyệt GRN",
    description: "GRN đã tạo, chờ Manager phê duyệt",
    navigateTo: "/manager-dashboard/grn",
    color: "text-purple-600",
  },
  KEEPER: {
    status: "PENDING_INCIDENT",
    label: "Sự cố cần xử lý",
    description: "Có phiếu đang bị sự cố, cần xem lại",
    navigateTo: "/inbound/gate-check",
    color: "text-red-600",
  },
};

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lấy role từ session
  useEffect(() => {
    const session = getStoredSession();
    const roles = session?.user?.roleCodes ?? [];
    // Ưu tiên: MANAGER > QC > KEEPER
    if (roles.includes("MANAGER")) setUserRole("MANAGER");
    else if (roles.includes("QC")) setUserRole("QC");
    else if (roles.includes("KEEPER")) setUserRole("KEEPER");
  }, []);

  const config = userRole ? ROLE_NOTIFICATION_CONFIG[userRole] : null;

  const fetchNotifications = useCallback(async () => {
    if (!config) return;
    try {
      const data = await fetchNotificationsByStatus(config.status, 8);
      setItems(data);
    } catch {
      // silent fail
    }
  }, [config]);

  // Polling mỗi 30 giây
  useEffect(() => {
    if (!config) return;

    fetchNotifications();

    intervalRef.current = setInterval(fetchNotifications, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [config, fetchNotifications]);

  // Fetch thêm khi mở dropdown
  useEffect(() => {
    if (open && config) {
      setLoading(true);
      fetchNotificationsByStatus(config.status, 8)
        .then(setItems)
        .finally(() => setLoading(false));
    }
  }, [open, config]);

  // Click outside đóng dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!config) return null;

  const count = items.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <span className="material-symbols-outlined text-gray-600 text-[20px]">
          notifications
        </span>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">Thông báo</p>
              <p className={`text-xs font-medium mt-0.5 ${config.color}`}>
                {config.label}
              </p>
            </div>
            {count > 0 && (
              <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {count} mới
              </span>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <span className="material-symbols-outlined text-gray-300 text-4xl">
                  notifications_off
                </span>
                <p className="text-xs text-gray-400">Không có thông báo mới</p>
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.receivingId}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(config.navigateTo);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        config.status === "SUBMITTED"
                          ? "bg-yellow-400"
                          : config.status === "GRN_CREATED"
                            ? "bg-purple-400"
                            : "bg-red-400"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900">
                        {item.receivingCode}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {item.supplierName ?? item.warehouseName ?? "—"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(item.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-gray-300 text-base flex-shrink-0">
                      chevron_right
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer — xem tất cả */}
          {items.length > 0 && (
            <div className="border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(config.navigateTo);
                }}
                className="w-full px-4 py-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
              >
                Xem tất cả
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
