import { AdminPage } from "@/components/layout/AdminPage";
import GrnApprovalList from "@/components/inbound/GrnApprovalList";

export default function GrnApprovalPage() {
  return (
    <AdminPage
      title="Duyệt đơn nhập kho"
      description="Xem xét và phê duyệt phiếu nhập kho (GRN) từ Keeper. Sau khi duyệt, tiến hành nhập kho để tạo Putaway Task."
    >
      <GrnApprovalList />
    </AdminPage>
  );
}
