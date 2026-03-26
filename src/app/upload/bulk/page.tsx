import BulkUploadForm from "@/components/BulkUploadForm";
import Header from "@/components/Header";

export default function BulkUploadPage() {
  return (
    <>
      <Header />

      <div className="container">
        <BulkUploadForm />
      </div>
    </>
  );
}
