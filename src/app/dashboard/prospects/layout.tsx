import { ProspectTabNav } from "@/components/dashboard/ProspectTabNav";

export default function ProspectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0 min-h-0">
      <ProspectTabNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
