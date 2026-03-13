import { AdminPage } from "@/components/layout/AdminPage";
import GrnApprovalList from "@/components/inbound/GrnApprovalList";

export default function GrnApprovalPage() {
  return (
    <AdminPage
      title="Duyệt GRN"
      description="Manager xem xét và phê duyệt phiếu nhập kho (GRN) từ Keeper."
    >
      <GrnApprovalList />
    </AdminPage>
  );
}