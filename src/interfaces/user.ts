// BE UserStatus enum: ACTIVE | INACTIVE | PENDING_VERIFY | LOCKED
export type UserStatus = "ACTIVE" | "INACTIVE" | "PENDING_VERIFY" | "LOCKED";

// BE UserRole enum: MANAGER | QC | KEEPER
export type UserRole = "MANAGER" | "QC" | "KEEPER";

// Khớp với BE UserListResponse.UserItemDTO
export interface UserSummary {
  userId: number;
  email: string;
  fullName: string;
  phone: string;
  roleCodes: string[];      // BE trả Set<String> → serialize thành array
  status: UserStatus;
  isPermanent: boolean;
  expireDate: string | null; // BE LocalDate → "yyyy-MM-dd"
  createdAt: string;         // BE LocalDateTime → ISO string
  lastLoginAt: string | null;
}

// Khớp với BE UserListResponse
export interface UserListPage {
  users: UserSummary[];
  totalElements: number;   // BE Long
  totalPages: number;      // BE Integer
  currentPage: number;     // BE Integer
  pageSize: number;        // BE Integer
}

// Query params cho GET /v1/users/list-users
export interface UserListQuery {
  page?: number;
  size?: number;
  keyword?: string;
  status?: UserStatus;     // Không gửi nếu ALL — lọc ở FE trước khi gọi
}

// Khớp với BE CreateUserRequest
export interface CreateUserPayload {
  email: string;
  roleCodes: string[];     // BE nhận Set<String>
  isPermanent: boolean;
  expireDate: string | null; // "yyyy-MM-dd" hoặc null
}

// Khớp với BE ChangeStatusRequest
export interface ChangeStatusPayload {
  status: UserStatus;
  suspendUntil?: string | null; // "yyyy-MM-dd" hoặc null
  reason?: string | null;
}

// Khớp với BE UserResponse (trả về sau assign-role / change-status)
export interface AssignRoleResponseUser {
  userId: number;
  email: string;
  fullName: string;
  phone: string;
  gender: string | null;
  dateOfBirth: string | null;
  address: string | null;
  avatarUrl: string | null;
  roleCodes: string[];
  status: UserStatus;
  isPermanent: boolean;
  expireDate: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}