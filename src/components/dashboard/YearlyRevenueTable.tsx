import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type YearlyData = {
  year: string;
  data: { month: string; amount: number }[];
};

export function YearlyRevenueTable({
  yearlyData,
  title,
}: {
  yearlyData: YearlyData[];
  title?: string;
}) {
  if (!yearlyData || yearlyData.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-md font-bold text-slate-700 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
          {title}
        </h3>
      )}
      <div className="rounded-md border border-slate-200 overflow-x-auto bg-white">
      <Table className="min-w-[900px]">
        <TableHeader className="bg-slate-50/80">
          <TableRow>
            <TableHead className="font-extrabold text-slate-800 border-r border-slate-200 bg-slate-100/50 w-[80px] sticky left-0 z-10">
              年
            </TableHead>
            {Array.from({ length: 12 }).map((_, i) => (
              <TableHead key={i} className="text-right text-xs font-semibold whitespace-nowrap">
                {i + 1}月
              </TableHead>
            ))}
            <TableHead className="text-right font-extrabold text-slate-800 border-l border-slate-200 bg-slate-100/50 w-[120px]">
              年間合計
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {yearlyData.map(({ year, data }) => {
            const total = data.reduce((acc, curr) => acc + curr.amount, 0);
            return (
              <TableRow key={year} className="hover:bg-slate-50 transition-colors">
                <TableCell className="font-bold border-r border-slate-200 bg-white sticky left-0 z-10">
                  {year}年
                </TableCell>
                {data.map((m, i) => (
                  <TableCell key={i} className="text-right tabular-nums text-sm whitespace-nowrap text-slate-600">
                    {m.amount > 0 ? `¥${m.amount.toLocaleString()}` : <span className="text-slate-300">-</span>}
                  </TableCell>
                ))}
                <TableCell className="text-right font-bold border-l border-slate-200 text-blue-700 bg-slate-50/50 tabular-nums">
                  ¥{total.toLocaleString()}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
