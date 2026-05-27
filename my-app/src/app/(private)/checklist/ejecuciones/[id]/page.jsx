"use client";

import { useParams } from "next/navigation";
import ChecklistEjecucionDetailView from "@/components/checklist/ChecklistEjecucionDetailView";

export default function ChecklistEjecucionAliasPage() {
  const params = useParams();

  return (
    <ChecklistEjecucionDetailView
      ejecucionId={params?.id}
      backPath="/checklist"
    />
  );
}
