import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { RecentBookings } from "@/components/dashboard/RecentBookings";
import { YearlyRevenueTable } from "@/components/dashboard/YearlyRevenueTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { TrendingUp, Users, CalendarSync } from "lucide-react";

type DailyRevenueRow = Pick<
  Database["public"]["Tables"]["daily_revenues"]["Row"],
  "target_date" | "daily_amount"
>;

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

type YearlyRevenueData = {
  year: string;
  data: { month: string; amount: number }[];
};

export const revalidate = 0;

function buildYearlyRevenueData(revenueRows: DailyRevenueRow[]): YearlyRevenueData[] {
  const yearlyDataRecord: Record<string, number[]> = {};

  revenueRows.forEach((row) => {
    const year = row.target_date.slice(0, 4);
    const monthIndex = Number(row.target_date.slice(5, 7)) - 1;

    if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
      return;
    }

    if (!yearlyDataRecord[year]) {
      yearlyDataRecord[year] = Array(12).fill(0);
    }

    yearlyDataRecord[year][monthIndex] += Number(row.daily_amount ?? 0);
  });

  return Object.keys(yearlyDataRecord)
    .sort((left, right) => Number(right) - Number(left))
    .map((year) => ({
      year,
      data: yearlyDataRecord[year].map((amount, index) => ({
        month: `${index + 1}月`,
        amount: Math.round(amount),
      })),
    }));
}

function getCurrentMonthRevenue(
  yearlyRevenueData: YearlyRevenueData[],
  now: Date,
): number {
  const currentYear = now.getFullYear().toString();
  const currentMonthIndex = now.getMonth();
  const currentYearData = yearlyRevenueData.find(
    (yearData) => yearData.year === currentYear,
  );

  return currentYearData?.data[currentMonthIndex]?.amount ?? 0;
}

export default async function DashboardPage() {
  const supabase = getServerSupabase();
  const [revenueResult, bookingsResult, bookingCountResult] = await Promise.all([
    supabase.from("daily_revenues").select("target_date, daily_amount"),
    supabase
      .from("bookings")
      .select("*")
      .order("checkin_date", { ascending: false })
      .limit(10),
    supabase.from("bookings").select("*", { count: "exact", head: true }),
  ]);

  const formattedYearlyData = buildYearlyRevenueData(revenueResult.data ?? []);
  const bookings: BookingRow[] = bookingsResult.data ?? [];
  const totalBookings = bookingCountResult.count ?? 0;
  const currentMonthRevenue = getCurrentMonthRevenue(
    formattedYearlyData,
    new Date(),
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 pt-12 pb-24 text-slate-900 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ヘッダーエリア */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            経営ダッシュボード
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            株式会社東京福祉不動産 - Shibamata Minpaku Project
          </p>
        </div>

        {/* 状態サマリー KPIカード群 */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-3">
          <Card className="shadow-sm border-none ring-1 ring-slate-100 bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-slate-500">今月の売上見込</CardTitle>
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-800">
                ¥{currentMonthRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Beds24 日割り計算ベース
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-none ring-1 ring-slate-100 bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-slate-500">取得済みの予約</CardTitle>
              <Users className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-800">
                {totalBookings} <span className="text-xl font-bold text-slate-600">件</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Supabase に保存済みの予約総数
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-none ring-1 ring-slate-100 bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-slate-500">API 同期ステータス</CardTitle>
              <CalendarSync className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-800">Active</div>
              <p className="text-xs text-emerald-600/80 mt-1 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                Webhook待機・過去同期済
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 年間売上表エリア (全幅で一覧表示) */}
        {formattedYearlyData.length > 0 && (
          <Card className="shadow-sm border-none ring-1 ring-slate-100 bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">年間売上表</CardTitle>
              <CardDescription className="font-medium text-slate-500">
                年ごとの各月の売上実績と、年間合計の一覧です。（Beds24日割りベース）
              </CardDescription>
            </CardHeader>
            <CardContent>
              <YearlyRevenueTable yearlyData={formattedYearlyData} />
            </CardContent>
          </Card>
        )}

        {/* メインチャートエリア */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          
          {/* 左側：年別の売上推移グラフ群 */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {formattedYearlyData.length > 0 ? (
              formattedYearlyData.map(({ year, data }) => (
                <Card key={year} className="shadow-sm border-none ring-1 ring-slate-100 bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-slate-800">{year}年 売上推移</CardTitle>
                    <CardDescription className="font-medium text-slate-500">
                      Beds24の日割り売上を、1月から12月まで集計しています。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pl-0 pr-4">
                    <RevenueChart data={data} />
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="shadow-sm border-none ring-1 ring-slate-100 bg-white p-8 text-center text-slate-500">
                売上データがありません
              </Card>
            )}
          </div>

          {/* 右側：直近の予約一覧 (スティッキーにすると見やすい) */}
          <Card className="lg:col-span-5 shadow-sm border-none ring-1 ring-slate-100 bg-white flex flex-col sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">直近のチェックイン</CardTitle>
              <CardDescription className="font-medium text-slate-500">
                最新の予約・変更ステータスの一覧
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 border-t border-slate-100 text-sm overflow-auto">
              <RecentBookings bookings={bookings} />
            </CardContent>
          </Card>
          
        </div>

      </div>
    </div>
  );
}
