import { Column } from "@/components/ui/Table";
import { UserSummary, UserStatus } from "@/interfaces/user";

export function getUserColumns(
  onRequestToggle: (user: UserSummary) => void,
  statusLoadingId: number | null,
): Column<UserSummary>[] {
  return [
    {
      key: "email",
      title: "Email",
      render: (u) => (
        <span className="font-medium text-gray-900">{u.email}</span>
      ),
    },
    {
      key: "name",
      title: "Full Name",
      render: (u) => u.fullName || "-",
    },
    {
      key: "phone",
      title: "Phone",
      render: (u) => u.phone || "-",
    },
    {
      key: "roles",
      title: "Roles",
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roleCodes.map((r) => (
            <span
              key={r}
              className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full font-medium"
            >
              {r}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "expire",
      title: "Expire",
      align: "center",
      render: (u) => {
        if (u.isPermanent) {
          return (
            <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full">
              Permanent
            </span>
          );
        }
        if (!u.expireDate) return "-";
        return (
          <span className="text-xs text-gray-700">
            {new Date(u.expireDate).toLocaleDateString()}
          </span>
        );
      },
    },
    {
      key: "status",
      title: "Status",
      align: "center",
      render: (u) => {
        const isActive = u.status === "ACTIVE";
        const isToggleable = u.status === "ACTIVE" || u.status === "INACTIVE";

        if (!isToggleable) {
          const badgeStyle: Record<string, string> = {
            PENDING_VERIFY: "bg-yellow-50 text-yellow-700",
            LOCKED: "bg-red-50 text-red-700",
          };
          const badgeLabel: Record<string, string> = {
            PENDING_VERIFY: "Pending",
            LOCKED: "Locked",
          };
          return (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              badgeStyle[u.status] ?? "bg-gray-100 text-gray-600"
            }`}>
              {badgeLabel[u.status] ?? u.status}
            </span>
          );
        }

        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation(); // không trigger onRowClick
              onRequestToggle(u); // mở confirm modal ở parent
            }}
            disabled={statusLoadingId === u.userId}
            className={`inline-flex items-center h-6 w-11 rounded-full px-0.5 transition-colors disabled:opacity-60 ${
              isActive ? "bg-green-500" : "bg-gray-300"
            }`}
          >
            <span className={`h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
              isActive ? "translate-x-5" : ""
            }`} />
          </button>
        );
      },
    },
  ];
}