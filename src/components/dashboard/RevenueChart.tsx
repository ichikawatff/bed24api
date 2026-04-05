"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type RevenueData = {
  month: string; // 例: "2026-04"
  amount: number; // 月の総売上
}[];

export function RevenueChart({ data }: { data: RevenueData }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center text-muted-foreground border border-dashed rounded-lg">
        集計できる売上データがありません
      </div>
    );
  }

  // Y軸のフォーマッター（金額表示）
  const formatYAxis = (value: number) => {
    if (value >= 10000) {
      return `¥${(value / 10000).toLocaleString()}万`;
    }
    return `¥${value.toLocaleString()}`;
  };

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 20, right: 0, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          fontSize={12}
          tickMargin={10}
        />
        <YAxis
          tickFormatter={formatYAxis}
          tickLine={false}
          axisLine={false}
          fontSize={12}
          width={70}
        />
        <Tooltip
          cursor={{ fill: "#f3f4f6" }}
          formatter={(value) => [`¥${Number(value).toLocaleString()}`, "売上"]}
          labelStyle={{ color: "#374151", fontWeight: "bold" }}
          contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
        />
        <Bar
          dataKey="amount"
          fill="#3b82f6" // 鮮やかな青
          radius={[6, 6, 0, 0]}
          barSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
