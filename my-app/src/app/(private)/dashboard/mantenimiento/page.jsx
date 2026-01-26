import StatsGrid from "@/components/dashboard/StatsGrid";
import TrabajoTable from "@/components/tables/TrabajoTable";

export default function DashboardMantenimiento() {
  return (
    <>
      <h1 className="text-xl font-bold mb-4">
        Jefe de Técnicos
      </h1>
      <StatsGrid />
      <TrabajoTable />
    </>
  );
}
