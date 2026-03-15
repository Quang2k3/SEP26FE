export interface NavAction {
  label: string;
  path: string;
  roles?: string[]; // nếu có, chỉ hiển thị với user có role phù hợp
}
