"use client";

import TreasurePodSection from "./treasure-pod-section";

interface TreasurePodMonitorProps {
  month: string;
}

export default function TreasurePodMonitor({ month }: TreasurePodMonitorProps) {
  return <TreasurePodSection month={month} alwaysExpanded />;
}
