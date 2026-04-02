export const BEDS24_API_URL = "https://api.beds24.com/v2";

export async function getBookingFromBeds24(bookingId: string) {
  const token = process.env.BEDS24_API_KEY;
  if (!token) throw new Error("BEDS24_API_KEY is not set.");

  // Beds24 API V2 から指定の予約IDで1件取得
  // APIドキュメントベースのURLとパラメータ
  const response = await fetch(`${BEDS24_API_URL}/bookings?id=${bookingId}`, {
    method: "GET",
    headers: {
      token: token,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Beds24 Error: ${response.status} - ${text}`);
    throw new Error(`Beds24 API Booking fetch failed: ${response.statusText}`);
  }

  const data = await response.json();
  
  // get bookings は配列で返ってくるため、先頭の1件を返す
  if (data && data.data && data.data.length > 0) {
    return data.data[0];
  }
  
  return null;
}

// 追加: 過去の全ての予約を一括で取得する関数（会社設立の2021年から対象）
export async function getAllBookingsFromBeds24() {
  const token = process.env.BEDS24_API_KEY;
  if (!token) throw new Error("BEDS24_API_KEY is not set.");

  // 過去データ（チェックアウト済み等）も取得するため、十分に広い期間を指定する
  const query = new URLSearchParams({
    arrivalFrom: "2021-01-01", // 過去すべてのデータ
    arrivalTo: "2028-12-31",   // 将来の予約も含める
  }).toString();

  const response = await fetch(`${BEDS24_API_URL}/bookings?${query}`, {
    method: "GET",
    headers: {
      token: token,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Beds24 Error: ${response.status} - ${text}`);
    throw new Error(`Beds24 API Bookings fetch failed: ${response.statusText}`);
  }

  const data = await response.json();
  
  return data.data || [];
}
