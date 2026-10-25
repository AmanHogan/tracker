import { BarChart3 } from "lucide-react";

/**
 * Fills a chart's usual height with a centered icon + message instead of
 * letting the chart library render its bare axes/gridlines on an empty
 * dataset — that reads as a broken dashed placeholder box, not "no data
 * yet".
 */
export function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-center">
      <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
