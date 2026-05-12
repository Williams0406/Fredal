"use client";

import ManagementMatrix from "@/components/management/ManagementMatrix";
import ManagementMachineIndicators from "@/components/management/ManagementMachineIndicators";
import ManagementItemHistoryTable from "@/components/management/ManagementItemHistoryTable";
import ManagementProviderMatrix from "@/components/management/ManagementProviderMatrix";
import ManagementReplacementBubbleChart from "@/components/management/ManagementReplacementBubbleChart";
import ManagementSurvivalCurve from "@/components/management/ManagementSurvivalCurve";

export default function GestionPage() {
  return (
    <div className="space-y-6">
      <ManagementMatrix />
      <ManagementProviderMatrix />
      <ManagementMachineIndicators />
      <ManagementSurvivalCurve />
      <ManagementReplacementBubbleChart />
      <ManagementItemHistoryTable />
    </div>
  );
}
