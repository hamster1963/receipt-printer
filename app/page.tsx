import ReceiptPrinter from "@/components/receipt-printer"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="mb-8 text-2xl font-bold text-gray-800">模拟小票打印机</h1>
      <ReceiptPrinter />
    </main>
  )
}

