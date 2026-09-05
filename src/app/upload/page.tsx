import { UploadForm } from "@/components/upload/UploadForm";
import { PageHeader } from "@/components/ui/PageHeader";

export default function UploadPage() {
  return (
    <>
      <PageHeader
        title="Upload your notes"
        subtitle="Drop a PDF or paste text. We will pull out the topics for you."
      />
      <UploadForm />
    </>
  );
}
