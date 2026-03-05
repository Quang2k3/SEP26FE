"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AdminPage } from "@/components/layout/AdminPage";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  assignUserRole,
  changeUserStatus,
  createUser,
  fetchUsers,
  type UserListPage,
  type UserStatus,
} from "@/services/userService";

const FIXED_ROLE_CODE = "MANAGER";

interface AddUserForm {
  email: string;
  isPermanent: boolean;
  expireDate: string;
}

type FilterStatus = UserStatus | "ALL";

function UserManagementContent() {
  const [userPage, setUserPage] = useState<UserListPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState<number | null>(null);
  const [assignLoadingId, setAssignLoadingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddUserForm>({
    email: "",
    isPermanent: true,
    expireDate: "",
  });

  const currentPage = userPage?.currentPage ?? 0;
  const pageSize = userPage?.pageSize ?? 10;
  const totalPages = userPage?.totalPages ?? 0;

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

  useEffect(() => {
    loadUsers(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const users = useMemo(() => userPage?.users ?? [], [userPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(0);
  };

  const handleChangePage = (nextPage: number) => {
    if (nextPage < 0 || nextPage >= totalPages) return;
    loadUsers(nextPage);
  };

  const handleOpenAdd = () => {
    setAddForm({
      email: "",
      isPermanent: true,
      expireDate: "",
    });
    setShowAddModal(true);
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.email.trim()) return;

    const payload = {
      email: addForm.email.trim(),
      roleCodes: [FIXED_ROLE_CODE], // role cố định
      isPermanent: addForm.isPermanent,
      expireDate: addForm.isPermanent ? null : addForm.expireDate || null,
    };

    try {
      await createUser(payload);
      setShowAddModal(false);
      loadUsers(0);
    } catch (err) {
      console.error("Create user failed", err);
    }
  };

  const handleToggleStatus = async (
    userId: number,
    currentStatus: UserStatus,
  ) => {
    const nextStatus: UserStatus =
      currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setStatusLoadingId(userId);
    try {
      await changeUserStatus(userId, {
        status: nextStatus,
        suspendUntil: null,
        reason: null,
      });
      loadUsers(currentPage);
    } finally {
      setStatusLoadingId(null);
    }
  };

  const handleAssignRole = async (userId: number, hasRole: boolean) => {
    if (hasRole) return;
    setAssignLoadingId(userId);
    try {
      await assignUserRole(userId, FIXED_ROLE_CODE);
      loadUsers(currentPage);
    } finally {
      setAssignLoadingId(null);
    }
  };

  const totalElements = userPage?.totalElements ?? 0;
  const from = totalElements === 0 ? 0 : currentPage * pageSize + 1;
  const to = Math.min(totalElements, (currentPage + 1) * pageSize);

  return (
    <AdminPage
      title="User Management"
      description="Quản lý người dùng: danh sách, tạo mới, kích hoạt/vô hiệu hoá bằng toggle và phân quyền (cố định 1 role)."
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
      {/* Filters / Search */}
      <Card className="flex flex-col gap-3">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-wrap items-center gap-3"
        >
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 flex-1 min-w-[220px] focus-within:ring-2 focus-within:ring-blue-500 transition-all">
            <span className="material-symbols-outlined text-gray-400 text-xl">
              search
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none p-0 text-sm text-gray-900 focus:outline-none placeholder-gray-400"
              placeholder="Search by email, name, phone..."
              type="text"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING_VERIFY">Pending Verify</option>
            <option value="LOCKED">Locked</option>
          </select>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm">
              Tìm kiếm
            </Button>
          </div>
        </form>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden" padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Full Name</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Roles</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center">Permanent / Expire</th>
                <th className="px-6 py-3 text-center w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading && users.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-6 text-center text-gray-500"
                  >
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-6 text-center text-gray-500"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const hasFixedRole = u.roleCodes.includes(FIXED_ROLE_CODE);
                  const isActive = u.status === "ACTIVE";
                  return (
                    <tr
                      key={u.userId}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-3 font-medium text-gray-900">
                        {u.email}
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {u.fullName || "-"}
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {u.phone || "-"}
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {u.roleCodes.length === 0 ? (
                          <span className="text-xs text-gray-400">
                            No roles
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {u.roleCodes.map((r) => (
                              <span
                                key={r}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u.userId, u.status)}
                          disabled={statusLoadingId === u.userId}
                          className={`inline-flex items-center h-6 w-11 rounded-full px-0.5 transition-colors ${
                            isActive ? "bg-green-500" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                              isActive ? "translate-x-5" : ""
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-6 py-3 text-center text-xs text-gray-700">
                        {u.isPermanent ? "Permanent" : u.expireDate || "-"}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleAssignRole(u.userId, hasFixedRole)
                            }
                            disabled={
                              hasFixedRole || assignLoadingId === u.userId
                            }
                          >
                            {hasFixedRole ? "Role Assigned" : "Assign Role"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            {totalElements > 0 ? (
              <>
                Showing{" "}
                <span className="font-semibold text-gray-700">{from}</span> to{" "}
                <span className="font-semibold text-gray-700">{to}</span> of{" "}
                <span className="font-semibold text-gray-700">
                  {totalElements}
                </span>{" "}
                users
              </>
            ) : (
              "No users"
            )}
          </div>
          <div className="flex items-center gap-1 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChangePage(currentPage - 1)}
              disabled={currentPage === 0 || loading}
            >
              Previous
            </Button>
            <span className="px-2 text-xs text-gray-600">
              Page {totalPages === 0 ? 0 : currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChangePage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1 || loading}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal tạo người dùng */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-100">
            {/* Header */}
            <div className="flex justify-end p-4 border-b">
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            {/* Form */}
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
              {/* Email */}
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
                    setAddForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Permanent user */}
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

              {/* Expire date */}
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
                  className={`w-full px-3 py-2 text-sm border rounded-md
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${
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

              {/* Footer */}
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
    </AdminPage>
  );
}

export default function UserManagementPage() {
  return <UserManagementContent />;
}
