"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AdminPage } from "@/components/layout/AdminPage";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTable, Column } from "@/components/ui/Table";
import { Select } from "antd";
import {
  assignUserRole,
  changeUserStatus,
  createUser,
  fetchUsers,
} from "@/services/userService";
import type { UserSummary, UserListPage, UserStatus } from "@/interface/user";
import { getUserColumns } from "./components/columns";
import UserFilter from "./components/UserFilter";

interface AddUserForm {
  email: string;
  isPermanent: boolean;
  expireDate: string;
}

type FilterStatus = UserStatus | "ALL";

export default function UserManagementContent() {
  const [userPage, setUserPage] = useState<UserListPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState<number | null>(null);
  const [assignLoadingId, setAssignLoadingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [addForm, setAddForm] = useState<AddUserForm>({
    email: "",
    isPermanent: true,
    expireDate: "",
  });

  const roleOptions = [{ label: "MANAGER", value: "MANAGER" }];
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
      roleCodes: [], // role cố định
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

  const columns = getUserColumns(handleToggleStatus, statusLoadingId);

  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    if (selectedRoles.length === 0) return;

    try {
      setAssignLoadingId(selectedUser.userId);

      await assignUserRole(selectedUser.userId, selectedRoles[0]); // API bạn chỉ nhận 1 role

      setShowRoleModal(false);
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
        <UserFilter
          search={search}
          statusFilter={statusFilter}
          setSearch={setSearch}
          setStatusFilter={setStatusFilter}
          onSubmit={handleSearchSubmit}
        />
      </Card>

      {/* Table */}
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
          onRowClick={(user) => {
            setSelectedUser(user);
            setSelectedRoles(user.roleCodes);
            setShowRoleModal(true);
          }}
        />
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

      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-sm font-semibold text-gray-900">
                Chỉnh sửa người dùng
              </h3>

              <button
                onClick={() => setShowRoleModal(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Email */}
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Email
                </label>
                <input
                  value={selectedUser.email}
                  disabled
                  className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-gray-100"
                />
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Full name
                </label>
                <input
                  value={selectedUser.fullName || ""}
                  disabled
                  className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-gray-100"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Phone
                </label>
                <input
                  value={selectedUser.phone || ""}
                  disabled
                  className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-gray-100"
                />
              </div>

              {/* Roles */}
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Roles
                </label>

                <Select
                  mode="multiple"
                  placeholder="Chọn role"
                  style={{ width: "100%", marginTop: 6 }}
                  value={selectedRoles}
                  onChange={(values) => setSelectedRoles(values)}
                  options={roleOptions}
                />
              </div>
            </div>

            {/* Footer */}
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
                isLoading={assignLoadingId === selectedUser?.userId}
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
