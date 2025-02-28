"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Printer } from "lucide-react"

// 创建小票类型
type Receipt = {
  id: string;
  content: string[];
  status: 'printing' | 'transitioning' | 'complete';
}

export default function ReceiptPrinter() {
  const [inputText, setInputText] = useState("")
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isPrinting, setIsPrinting] = useState(false)
  const receiptContainerRef = useRef<HTMLDivElement>(null)
  const printIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 处理打印
  const handlePrint = () => {
    if (!inputText.trim() || isPrinting) return

    setIsPrinting(true)
    // 生成一个唯一ID
    const receiptId = `receipt-${Date.now()}`

    // 将输入文本分割成行
    const lines = inputText.split("\n").filter((line) => line.trim() !== "")

    // 清空输入框
    setInputText("")

    // 准备新的小票内容模板
    const newReceiptTemplate = [
      "收据",
      new Date().toLocaleString(),
      "------------------------",
      ...lines,
      "------------------------",
      "谢谢惠顾",
      "* * * * *",
    ]

    // 创建新小票对象并添加到列表
    setReceipts(prev => [...prev, {
      id: receiptId,
      content: [], // 初始为空
      status: 'printing'
    }])

    // 逐行打印效果
    let lineIndex = 0
    let currentLines: string[] = []

    printIntervalRef.current = setInterval(() => {
      if (lineIndex < newReceiptTemplate.length) {
        // 添加新行
        currentLines = [...currentLines, newReceiptTemplate[lineIndex]]
        lineIndex++
        
        // 更新特定小票的内容
        setReceipts(prev => prev.map(receipt => 
          receipt.id === receiptId 
            ? { ...receipt, content: [...currentLines] } 
            : receipt
        ))
      } else {
        // 打印完成
        if (printIntervalRef.current) {
          clearInterval(printIntervalRef.current)
          printIntervalRef.current = null
        }
        
        // 先将状态改为过渡中
        setReceipts(prev => prev.map(receipt => 
          receipt.id === receiptId 
            ? { ...receipt, status: 'transitioning' } 
            : receipt
        ))
        
        // 延迟后改为完成状态
        setTimeout(() => {
          setReceipts(prev => prev.map(receipt => 
            receipt.id === receiptId 
              ? { ...receipt, status: 'complete' } 
              : receipt
          ))
          
          setIsPrinting(false)
        }, 800) // 给足够的过渡时间
      }
    }, 200) // 每行打印间隔时间
  }

  // 监听回车键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handlePrint()
    }
  }

  // 确保滚动到最新的小票
  useEffect(() => {
    const scrollToBottom = () => {
      if (receiptContainerRef.current) {
        receiptContainerRef.current.scrollTop = receiptContainerRef.current.scrollHeight
      }
    }

    const timeoutId = setTimeout(scrollToBottom, 10)
    return () => clearTimeout(timeoutId)
  }, [receipts])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (printIntervalRef.current) {
        clearInterval(printIntervalRef.current)
      }
    }
  }, [])

  // 获取小票的CSS类名
  const getReceiptClassName = (status: Receipt['status']) => {
    switch (status) {
      case 'printing': return 'receipt-printing';
      case 'transitioning': return 'receipt-finishing';
      case 'complete': return 'receipt-complete';
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-100 overflow-hidden">
      <div className="relative w-full max-w-md h-screen flex flex-col items-center justify-end pb-4">
        {/* 小票展示区域 */}
        <div
          ref={receiptContainerRef}
          className="absolute inset-0 bottom-[220px] w-full overflow-y-auto flex flex-col items-center"
          style={{
            maskImage: "linear-gradient(to top, black 90%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to top, black 90%, transparent 100%)",
          }}
        >
          <div className="w-full flex flex-col items-center justify-end min-h-full pb-2">
            {/* 所有小票列表 - 不再区分当前打印和已打印 */}
            {receipts.map((receipt) => (
              <div
                key={receipt.id}
                className={`w-4/5 bg-white shadow-md mb-0 font-mono text-sm ${getReceiptClassName(receipt.status)}`}
              >
                <div className="p-4 whitespace-pre-line">
                  {receipt.content.map((line, lineIndex) => (
                    <div key={`${receipt.id}-${lineIndex}`} className="mb-1 text-center">
                      {line}
                    </div>
                  ))}
                </div>
                {/* 小票底部的虚线 */}
                <div className="w-full border-b border-dashed border-gray-400 relative">
                  <div className="absolute -right-1 -top-2 text-gray-400 text-xs">✂</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 打印机外壳 - 固定位置 */}
        <div className="relative w-full bg-gray-800 rounded-t-lg p-6 pb-0 shadow-lg z-10">
          {/* 打印口 */}
          <div className="absolute left-0 right-0 top-0 flex justify-center">
            <div className="w-4/5 h-2 bg-gray-900 rounded-t-md"></div>
          </div>

          {/* 打印机指示灯 */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isPrinting ? "bg-green-500 animate-pulse" : "bg-gray-600"}`}></div>
            <Printer size={18} className="text-gray-400" />
          </div>

          {/* 打印机名称 */}
          <div className="text-center mb-4">
            <span className="text-xs text-gray-400 font-mono">RECEIPT-MATIC 3000</span>
          </div>
        </div>

        {/* 输入区域 - 固定在打印机下方 */}
        <div className="w-full bg-white rounded-b-lg shadow-md p-4 z-10">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="在此输入文本，按回车键打印..."
            className="w-full h-24 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
            disabled={isPrinting}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handlePrint}
              disabled={isPrinting || !inputText.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPrinting ? "打印中..." : "打印"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

