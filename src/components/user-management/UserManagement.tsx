"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AdminPage } from "@/components/layout/AdminPage";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/Table";
import { Select } from "antd";
import {
  assignUserRole,
  changeUserStatus,
  createUser,
  fetchUsers,
} from "@/services/userService";
import type { UserSummary, UserListPage, UserStatus } from "@/interfaces/user";
import { getUserColumns } from "./components/columns";
import UserFilter from "./components/UserFilter";

interface AddUserForm {
  email: string;
  isPermanent: boolean;
  expireDate: string;
}

type FilterStatus = UserStatus | "ALL";

const ROLE_OPTIONS = [
  { label: "MANAGER", value: "MANAGER" },
  { label: "KEEPER", value: "KEEPER" },
  { label: "QC", value: "QC" },
];

export default function UserManagementContent() {
  const [userPage, setUserPage] = useState<UserListPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState<number | null>(null);
  const [assignLoadingId, setAssignLoadingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");

  // Modal: Thêm user
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddUserForm>({
    email: "",
    isPermanent: true,
    expireDate: "",
  });

  // Modal: Assign role
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");

  // Modal: Xác nhận toggle status
  const [confirmUser, setConfirmUser] = useState<UserSummary | null>(null);

  const currentPage = userPage?.currentPage ?? 0;
  const pageSize = userPage?.pageSize ?? 10;
  const totalPages = userPage?.totalPages ?? 0;
  const totalElements = userPage?.totalElements ?? 0;

  const loadUsers = async (page: number = 0) => {
    setLoading(true);
    try {
      const data = await fetchUsers({
        page,
        size: pageSize,
        keyword: search || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });
      setUserPage(data);
    } finally {
      setLoading(false);
    }
  };

  // Load lần đầu
useEffect(() => {
  loadUsers(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// Live search: debounce 400ms khi search hoặc statusFilter thay đổi
useEffect(() => {
  const timer = setTimeout(() => {
    loadUsers(0);
  }, 400);
  return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [search, statusFilter]);

  const users = useMemo(() => userPage?.users ?? [], [userPage]);


  const handleChangePage = (nextPage: number) => {
    if (nextPage < 0 || nextPage >= totalPages) return;
    loadUsers(nextPage);
  };

  // Columns gọi hàm này khi click toggle → mở confirm modal
  const handleRequestToggle = (user: UserSummary) => {
    setConfirmUser(user);
  };

  // Sau khi user xác nhận trong modal
  const handleConfirmToggle = async () => {
    if (!confirmUser) return;
    const nextStatus: UserStatus =
      confirmUser.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    setStatusLoadingId(confirmUser.userId);
    setConfirmUser(null);
    try {
      await changeUserStatus(confirmUser.userId, {
        status: nextStatus,
        suspendUntil: null,
        reason: null,
      });
      loadUsers(currentPage);
    } finally {
      setStatusLoadingId(null);
    }
  };

  const handleRowClick = (user: UserSummary) => {
    setSelectedUser(user);
    setSelectedRole(user.roleCodes?.[0] ?? "");
    setShowRoleModal(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !selectedRole) return;
    setAssignLoadingId(selectedUser.userId);
    try {
      await assignUserRole(selectedUser.userId, selectedRole);
      setShowRoleModal(false);
      loadUsers(currentPage);
    } finally {
      setAssignLoadingId(null);
    }
  };

  const handleOpenAdd = () => {
    setAddForm({ email: "", isPermanent: true, expireDate: "" });
    setShowAddModal(true);
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.email.trim()) return;
    await createUser({
      email: addForm.email.trim(),
      roleCodes: ["KEEPER"],
      isPermanent: addForm.isPermanent,
      expireDate: addForm.isPermanent ? null : addForm.expireDate || null,
    });
    setShowAddModal(false);
    loadUsers(0);
  };

  const columns = getUserColumns(handleRequestToggle, statusLoadingId);

  return (
    <AdminPage
      title="User Management"
      description="Quản lý người dùng: tạo mới, kích hoạt/vô hiệu hoá, phân quyền."
      actions={
        <Button
          size="sm"
          onClick={handleOpenAdd}
          leftIcon={
            <span className="material-symbols-outlined text-sm">add</span>
          }
        >
          Thêm người dùng
        </Button>
      }
    >
      <Card className="flex flex-col gap-3">
        <UserFilter
          search={search}
          statusFilter={statusFilter}
          setSearch={setSearch}
          setStatusFilter={setStatusFilter}
        />
      </Card>

      <Card className="overflow-hidden" padded={false}>
        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          page={currentPage}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPrev={() => handleChangePage(currentPage - 1)}
          onNext={() => handleChangePage(currentPage + 1)}
          onRowClick={handleRowClick}
        />
      </Card>

      {/* ── Modal: Xác nhận toggle status ── */}
      {confirmUser && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Icon header */}
            <div
              className={`p-6 flex flex-col items-center gap-3 ${
                confirmUser.status === "ACTIVE" ? "bg-red-50" : "bg-green-50"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  confirmUser.status === "ACTIVE"
                    ? "bg-red-100"
                    : "bg-green-100"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-2xl ${
                    confirmUser.status === "ACTIVE"
                      ? "text-red-500"
                      : "text-green-600"
                  }`}
                >
                  {confirmUser.status === "ACTIVE" ? "block" : "check_circle"}
                </span>
              </div>
              <div className="text-center">
                <h3 className="text-sm font-bold text-gray-900">
                  {confirmUser.status === "ACTIVE"
                    ? "Vô hiệu hoá tài khoản?"
                    : "Kích hoạt tài khoản?"}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {confirmUser.status === "ACTIVE"
                    ? "Người dùng sẽ không thể đăng nhập cho đến khi được kích hoạt lại."
                    : "Người dùng sẽ có thể đăng nhập trở lại."}
                </p>
              </div>
            </div>

            {/* User info */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-gray-400 text-lg">
                    person
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {confirmUser.fullName || "—"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {confirmUser.email}
                  </p>
                </div>
                <span
                  className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                    confirmUser.status === "ACTIVE"
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {confirmUser.status === "ACTIVE" ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 p-4">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setConfirmUser(null)}
              >
                Huỷ
              </Button>
              <Button
                variant={confirmUser.status === "ACTIVE" ? "danger" : "primary"}
                size="sm"
                className="flex-1"
                isLoading={statusLoadingId === confirmUser.userId}
                onClick={handleConfirmToggle}
              >
                {confirmUser.status === "ACTIVE" ? "Vô hiệu hoá" : "Kích hoạt"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Thêm người dùng mới ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-100">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-sm font-semibold text-gray-900">
                Thêm người dùng mới
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <form
              className="p-5 space-y-4"
              onSubmit={(e) => {
                if (!addForm.isPermanent && !addForm.expireDate) {
                  e.preventDefault();
                  alert("Vui lòng chọn ngày hết hạn");
                  return;
                }
                handleSubmitAdd(e);
              }}
            >
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="nhap-email@congty.com"
                  value={addForm.email}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={addForm.isPermanent}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      isPermanent: e.target.checked,
                      expireDate: e.target.checked ? "" : prev.expireDate,
                    }))
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span>Người dùng vĩnh viễn (không hết hạn)</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Ngày hết hạn
                </label>
                <input
                  type="date"
                  disabled={addForm.isPermanent}
                  value={addForm.expireDate}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      expireDate: e.target.value,
                    }))
                  }
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    addForm.isPermanent
                      ? "bg-gray-100 text-gray-400 border-gray-200"
                      : "border-gray-300"
                  }`}
                />
                {!addForm.isPermanent && !addForm.expireDate && (
                  <p className="text-xs text-red-500">
                    Vui lòng chọn ngày hết hạn
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t mt-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Huỷ
                </Button>
                <Button type="submit" size="sm" disabled={!addForm.email}>
                  Thêm
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Assign Role ── */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl border">
            <div className="flex justify-between items-center p-4 border-b">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Phân quyền người dùng
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[220px]">
                  {selectedUser.email}
                </p>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <div className="p-5">
              <label className="text-xs font-medium text-gray-700 block mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <Select
                placeholder="Chọn role"
                style={{ width: "100%" }}
                value={selectedRole || undefined}
                onChange={(value) => setSelectedRole(value)}
                options={ROLE_OPTIONS}
              />
              <p className="text-xs text-gray-400 mt-2">
                Role cũ sẽ bị thay thế hoàn toàn bởi role mới.
              </p>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowRoleModal(false)}
              >
                Huỷ
              </Button>
              <Button
                size="sm"
                isLoading={assignLoadingId === selectedUser.userId}
                disabled={!selectedRole}
                onClick={handleUpdateRole}
              >
                Lưu
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
