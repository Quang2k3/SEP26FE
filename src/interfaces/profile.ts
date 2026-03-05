export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | string;
export type UserStatus = 'ACTIVE' | 'INACTIVE' | string;

export interface MeUser {
  userId: number;
  email: string;
  fullName: string;
  phone: string | null;
  gender: Gender | null;
  dateOfBirth: string | null;
  address: string | null;
  avatarUrl: string | null;
  roleCodes: string[];
  status: UserStatus;
  isPermanent: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface ProfileFormData {
  fullName: string;
  email: string;
  employeeId: string;
  department: string;
  warehouse: string;
}


