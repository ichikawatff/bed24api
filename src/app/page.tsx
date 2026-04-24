import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { RecentBookings } from "@/components/dashboard/RecentBookings";
import { YearlyRevenueTable } from "@/components/dashboard/YearlyRevenueTable";
import { SyncButton } from "@/components/dashboard/SyncButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { TrendingUp, Users, CalendarSync, PieChart } from "lucide-react";

type DailyRevenueRow = {
  target_date: string;
  daily_amount: number;
  bookings: {
    property_id: string;
  } | null;
};

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

type YearlyRevenueData = {
  year: string;
  data: { month: string; amount: number }[];
};

const PROPERTY_NAMES: Record<string, string> = {
  "all": "全物件 合計",
  "201437": "HIDAKA STAY VILLA 柴又",
  "319753": "Hidaka Stay Villa SHIBAMATA SAKURA",
  "unknown": "物件不明",
};

export const revalidate = 0;

function buildYearlyRevenueData(
  revenueRows: DailyRevenueRow[],
  filterPropertyId?: string
): YearlyRevenueData[] {
  const yearlyDataRecord: Record<string, number[]> = {};

  revenueRows.forEach((row) => {
    // 物件フィルターが指定されている場合、一致しないものはスキップ
    if (filterPropertyId && row.bookings?.property_id !== filterPropertyId) {
      if (!(filterPropertyId === "unknown" && !row.bookings?.property_id)) {
        return;
      }
    }

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

function getCurrentTermBounds(now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 is Jan, 7 is Aug
  
  const startYear = month >= 7 ? year : year - 1;
  const endYear = startYear + 1;
  const term = startYear - 2021 + 1;
  
  return {
    term,
    startStr: `${startYear}-08-01`,
    endStr: `${endYear}-07-31`,
  };
}

function getTermRevenue(
  revenueRows: DailyRevenueRow[],
  startStr: string,
  endStr: string,
  propertyId?: string
) {
  return revenueRows.reduce((acc, row) => {
    if (propertyId && row.bookings?.property_id !== propertyId) {
      if (!(propertyId === "unknown" && !row.bookings?.property_id)) {
        return acc;
      }
    }
    if (row.target_date >= startStr && row.target_date <= endStr) {
      return acc + Number(row.daily_amount ?? 0);
    }
    return acc;
  }, 0);
}

export default async function DashboardPage() {
  const supabase = getServerSupabase();
  const [revenueResult, bookingsResult, bookingCountResult] = await Promise.all([
    supabase
      .from("daily_revenues")
      .select("target_date, daily_amount, bookings(property_id)"),
    supabase
      .from("bookings")
      .select("*")
      .order("checkin_date", { ascending: false })
      .limit(10),
    supabase.from("bookings").select("*", { count: "exact", head: true }),
  ]);

  const rawRevenueData = (revenueResult.data as unknown as DailyRevenueRow[]) ?? [];

  // 物件IDのリストを抽出（重複排除）
  const propertyIds = Array.from(
    new Set(rawRevenueData.map((r) => r.bookings?.property_id || "unknown"))
  ).sort();

  // 各表示用データの生成
  const formattedYearlyData = buildYearlyRevenueData(rawRevenueData);

  // 物件別の年間売上データ
  const propertyRevenueData = propertyIds.map((id) => ({
    id,
    name: PROPERTY_NAMES[id] || `物件 ID: ${id}`,
    data: buildYearlyRevenueData(rawRevenueData, id),
  }));
  const bookings: BookingRow[] = bookingsResult.data ?? [];
  const totalBookings = bookingCountResult.count ?? 0;
  const currentMonthRevenue = getCurrentMonthRevenue(
    formattedYearlyData,
    new Date(),
  );

  const termBounds = getCurrentTermBounds(new Date());
  const termRevenueAll = getTermRevenue(rawRevenueData, termBounds.startStr, termBounds.endStr);
  const termRevenuesByProperty = propertyIds
    .map((id) => ({
      id,
      name: PROPERTY_NAMES[id] || `物件 ID: ${id}`,
      amount: getTermRevenue(rawRevenueData, termBounds.startStr, termBounds.endStr, id),
    }))
    .filter((p) => p.amount > 0);

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 pt-12 pb-24 text-slate-900 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ヘッダーエリア */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              経営ダッシュボード
            </h1>
            <p className="text-slate-500 mt-2 font-medium">
              株式会社東京福祉不動産 - Shibamata Minpaku Project
            </p>
          </div>
          <SyncButton />
        </div>

        {/* 状態サマリー KPIカード群 */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
              <CardTitle className="text-sm font-semibold text-slate-500">第{termBounds.term}期 売上見込</CardTitle>
              <PieChart className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-800">
                ¥{termRevenueAll.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium mb-3">
                {termBounds.startStr.replace("-", "/").replace("-", "/")} 〜 {termBounds.endStr.replace("-", "/").replace("-", "/")}
              </p>
              <div className="space-y-1 pt-2 border-t border-slate-50">
                {termRevenuesByProperty.map((p) => (
                  <div key={p.id} className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 truncate max-w-[140px]" title={p.name}>{p.name}</span>
                    <span className="font-semibold text-slate-700">¥{p.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
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
            <CardContent className="space-y-8">
              {/* 合計表 */}
              <YearlyRevenueTable 
                yearlyData={formattedYearlyData} 
                title={PROPERTY_NAMES["all"]} 
              />
              
              {/* 物件別の表（区切り線付き） */}
              {propertyRevenueData.map((p) => (
                <div key={p.id} className="pt-6 border-t border-slate-100">
                  <YearlyRevenueTable 
                    yearlyData={p.data} 
                    title={p.name} 
                  />
                </div>
              ))}
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
