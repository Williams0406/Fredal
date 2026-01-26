"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChartCard({ title, children }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
