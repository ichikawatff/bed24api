import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parseISO } from "date-fns";

export type Booking = {
  id: string;
  beds24_booking_id: string;
  guest_name: string | null;
  checkin_date: string;
  checkout_date: string;
  ota_name: string | null;
  status: string | null;
  total_amount: number | null;
  property_id: string;
  room_id: string;
};

export function RecentBookings({ bookings }: { bookings: Booking[] }) {
  if (!bookings || bookings.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground border border-dashed rounded-lg">
        直近の予約データがありません
      </div>
    );
  }

  // ステータスの色分け用ヘルパー
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "0":
      case "cancelled":
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">キャンセル</span>;
      default:
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">確定</span>;
    }
  };

  return (
    <Table className="w-full">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[120px]">チェックイン</TableHead>
          <TableHead>ゲスト名</TableHead>
          <TableHead>チャネル</TableHead>
          <TableHead>金額</TableHead>
          <TableHead className="text-right">ステータス</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((booking) => (
          <TableRow key={booking.id} className="cursor-pointer hover:bg-slate-50 transition-colors">
            <TableCell className="font-medium whitespace-nowrap">
              {format(parseISO(booking.checkin_date), "yyyy/MM/dd")}
            </TableCell>
            <TableCell className="font-semibold text-slate-800">
              {booking.guest_name || "未入力"}
            </TableCell>
            <TableCell>
              {booking.ota_name || "Direct"}
            </TableCell>
            <TableCell>
              ¥{(booking.total_amount || 0).toLocaleString()}
            </TableCell>
            <TableCell className="text-right">
              {getStatusBadge(booking.status)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
