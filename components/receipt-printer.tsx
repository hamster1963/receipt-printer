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

// API 响应类型
type ApiResponse = {
  status: number;
  msg: string;
  data: {
    Content: string;
  };
}

export default function ReceiptPrinter() {
  const [inputText, setInputText] = useState("")
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isPrinting, setIsPrinting] = useState(false)
  const [cursorPosition, setCursorPosition] = useState({top: 3, left: 3}) // 光标位置状态
  const receiptContainerRef = useRef<HTMLDivElement>(null)
  const printIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null) // 添加textarea引用

  // 请求API获取内容
  const fetchReceiptContent = async (content: string): Promise<string | null> => {
    try {
      const response = await fetch('https://blog-api.nosion.ac.cn/api/v1/single/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        throw new Error('API请求失败');
      }
      
      const data: ApiResponse = await response.json();
      
      if (data.status === 200 && data.data?.Content) {
        return data.data.Content;
      }
      
      return null;
    } catch (error) {
      console.error('获取API内容时出错:', error);
      return null;
    }
  }

  // 处理打印
  const handlePrint = async () => {
    if (!inputText.trim() || isPrinting) return

    setIsPrinting(true)
    // 生成一个唯一ID
    const receiptId = `receipt-${Date.now()}`

    // 将输入文本分割成行
    const lines = inputText.split("\n").filter((line) => line.trim() !== "")

    // 清空输入框
    setInputText("")
    
    // 请求API获取额外内容
    const apiContent = await fetchReceiptContent(inputText);
    const apiLines = apiContent ? apiContent.split('\n') : [];

    // 准备新的小票内容模板
    const newReceiptTemplate = [
      "收据",
      new Date().toLocaleString(),
      "------------------------",
      ...lines,
      "------------------------",
      ...(apiLines.length > 0 ? [...apiLines, "------------------------"] : []),
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
    } else {
      // 对于其他键，等待处理后更新光标位置
      setTimeout(updateCursorPosition, 0);
    }
  }

  // 计算光标位置的函数
  const updateCursorPosition = () => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const selectionStart = textarea.selectionStart || 0;

    // 创建一个临时元素来计算文本尺寸
    const textMeasure = document.createElement('div');
    textMeasure.style.font = window.getComputedStyle(textarea).font;
    textMeasure.style.position = 'absolute';
    textMeasure.style.visibility = 'hidden';
    textMeasure.style.whiteSpace = 'pre-wrap';
    textMeasure.style.wordWrap = 'break-word';
    textMeasure.style.width = `${textarea.clientWidth - 20}px`; // 减去padding
    
    // 获取光标前的文本
    const textBeforeCursor = inputText.substring(0, selectionStart);
    
    // 创建行元素
    textMeasure.textContent = textBeforeCursor;
    document.body.appendChild(textMeasure);
    
    // 计算光标位置
    const textHeight = textMeasure.clientHeight;
    const lines = textBeforeCursor.split('\n');
    const lastLine = lines[lines.length - 1];
    
    // 如果在最后一行的最后位置，使用文本测量的宽度
    textMeasure.textContent = lastLine;
    const lastLineWidth = textMeasure.clientWidth;
    
    document.body.removeChild(textMeasure);
    
    // 计算光标的top和left位置
    // 基本padding为3，每行高度大约是字体大小的1.5倍
    const lineHeight = 1.5 * parseFloat(window.getComputedStyle(textarea).fontSize);
    const linesBeforeCursor = textBeforeCursor.split('\n').length - 1;
    
    // 设置光标位置
    setCursorPosition({
      top: 3 + linesBeforeCursor * lineHeight,
      left: lastLine.length === 0 ? 3 : 3 + lastLineWidth
    });
  };

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    // 在下一个微任务中更新光标位置，确保DOM已更新
    setTimeout(updateCursorPosition, 0);
  };

  // 处理鼠标点击或键盘导航
  const handleSelectionChange = () => {
    updateCursorPosition();
  };

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

  // 组件挂载和输入文本变化时更新光标位置
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('click', handleSelectionChange);
      textarea.addEventListener('keyup', handleSelectionChange);
      
      return () => {
        textarea.removeEventListener('click', handleSelectionChange);
        textarea.removeEventListener('keyup', handleSelectionChange);
      };
    }
  }, []);

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
            {/* 所有小票列表 */}
            {receipts.map((receipt) => (
              <div
                key={receipt.id}
                className={`w-4/5 bg-[#fffdf8] shadow-md mb-0 font-mono text-sm relative ${getReceiptClassName(receipt.status)}`}
                style={{
                  boxShadow: "0 2px 6px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05)",
                  backgroundImage: "radial-gradient(rgba(0,0,0,0.02) 1px, transparent 1px)",
                  backgroundSize: "8px 8px"
                }}
              >
                {/* 小票顶部穿孔 */}
                <div className="w-full h-1 bg-white border-t border-dashed border-gray-300 relative">
                  <div className="absolute w-full h-1 bg-gradient-to-b from-gray-200/50 to-transparent"></div>
                  <div className="absolute -left-1 -top-2 text-gray-400 text-xs">✂</div>
                </div>
                
                {/* 热敏打印头效果 */}
                <div className="h-1 w-full bg-gradient-to-b from-orange-50 to-transparent"></div>

                {/* 小票内容 */}
                <div className="p-4 whitespace-pre-line">
                  {receipt.content.map((line, lineIndex) => {
                    // 检测是否是标题行（第一行）
                    if (lineIndex === 0) {
                      return (
                        <div key={`${receipt.id}-${lineIndex}`} className="text-center font-bold text-lg mb-2">
                          {line}
                        </div>
                      );
                    }
                    // 检测是否是日期行（第二行）
                    else if (lineIndex === 1) {
                      return (
                        <div key={`${receipt.id}-${lineIndex}`} className="text-center text-xs text-gray-600 mb-2">
                          {line}
                        </div>
                      );
                    }
                    // 检测是否是分隔线
                    else if (line.includes("----")) {
                      return (
                        <div key={`${receipt.id}-${lineIndex}`} className="border-b border-dashed border-gray-300 my-2"></div>
                      );
                    }
                    // 检测是否是谢谢惠顾行
                    else if (line.includes("谢谢惠顾")) {
                      return (
                        <div key={`${receipt.id}-${lineIndex}`} className="text-center font-medium mt-2">
                          {line}
                        </div>
                      );
                    }
                    // 检测是否是星号行（最后一行）
                    else if (line.includes("*")) {
                      return (
                        <div key={`${receipt.id}-${lineIndex}`} className="text-center text-gray-400 text-xs mt-1">
                          {line}
                        </div>
                      );
                    }
                    // 普通内容行
                    else {
                      return (
                        <div key={`${receipt.id}-${lineIndex}`} className="mb-1 text-center text-gray-800">
                          {line}
                        </div>
                      );
                    }
                  })}
                </div>
                
                {/* 小票底部的虚线 */}
                <div className="w-full border-b border-dashed border-gray-300 relative">
                  <div className="absolute -right-1 -top-2 text-gray-400 text-xs">✂</div>
                  <div className="absolute w-full h-1 bg-gradient-to-t from-gray-200/50 to-transparent"></div>
                </div>
                
                {/* 小票底部阴影效果 */}
                <div className="absolute w-full h-4 bottom-0 bg-gradient-to-t from-gray-200/10 to-transparent"></div>
                
                {/* 小票侧边褶皱效果 */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-gray-200/30 to-transparent"></div>
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-l from-gray-200/30 to-transparent"></div>
              </div>
            ))}
          </div>
        </div>

        {/* 打印机外壳 - 固定位置 */}
        <div className="relative w-full bg-gradient-to-b from-gray-800 to-gray-700 rounded-t-lg p-6 pb-0 shadow-lg z-10">
          {/* 打印口 */}
          <div className="absolute left-0 right-0 top-0 flex justify-center">
            <div className="w-4/5 h-3 bg-gray-900 rounded-t-md shadow-inner flex items-center justify-center">
              <div className="w-[98%] h-1 bg-black/30 rounded"></div>
            </div>
          </div>

          {/* 打印机指示灯 */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isPrinting ? "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]" : "bg-gray-600"}`}></div>
            <Printer size={18} className="text-gray-300" />
          </div>

          {/* 打印机名称 */}
          <div className="text-center mb-4">
            <span className="text-xs text-gray-300 font-mono tracking-wider">RECEIPT-MATIC 3000</span>
          </div>
        </div>

        {/* 输入区域 - 固定在打印机下方 */}
        <div className="w-full bg-gradient-to-b from-white to-gray-50 rounded-b-lg shadow-md p-4 z-10">
          <div className="relative">
            {/* 输入框标签 */}
            <div className="absolute -top-2 left-3 px-1 bg-gray-100 text-xs text-gray-500 font-mono z-10">
              <span>INPUT</span>
            </div>
            
            {/* 输入框外壳 */}
            <div className="relative border-2 border-gray-400 rounded-md p-1 bg-gray-200 shadow-inner">
              {/* 仿CRT屏幕效果 */}
              <div className="absolute inset-0 rounded-sm overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[length:100%_3px] pointer-events-none"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.2)_100%)] pointer-events-none"></div>
              </div>
              
              {/* 输入框容器 */}
              <div className="relative">
                {/* 输入框 */}
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onClick={handleSelectionChange}
                  placeholder="在此输入文本，按回车键打印..."
                  className="w-full h-20 p-3 bg-[#efefef] placeholder:text-gray-500 rounded-sm focus:outline-none focus:ring-0 border-none resize-none font-mono text-gray-800 text-sm relative z-0 shadow-inner"
                  style={{
                    caretColor: "transparent", // 隐藏原生光标
                    letterSpacing: "0.5px"
                  }}
                  disabled={isPrinting}
                />
                
                {/* 自定义闪烁光标 */}
                {!isPrinting && (
                  <div 
                    className="absolute w-[2px] h-4 bg-gray-800 opacity-70 animate-[blink_1s_step-end_infinite] pointer-events-none"
                    style={{
                      top: `${cursorPosition.top}px`,
                      left: `${cursorPosition.left}px`,
                      transition: "left 0.05s ease-out, top 0.05s ease-out"
                    }}
                  />
                )}
              </div>
              
              {/* 输入框底部控制按钮装饰 */}
              <div className="flex justify-between items-center mt-1 px-1">
                <div className="flex space-x-1">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  ))}
                </div>
                <div className="text-[10px] font-mono text-gray-500 tracking-tighter">
                  {isPrinting ? "PRINTING..." : "READY"}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              type="button"
              disabled={isPrinting || !inputText.trim()}
              className="relative flex min-h-[40px] min-w-[80px] cursor-pointer items-center justify-center overflow-hidden rounded-sm bg-gradient-to-b from-red-700 to-red-900 px-4 py-2 font-medium text-white text-sm border border-red-900/50 transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-red-700 disabled:hover:to-red-900"
              onClick={handlePrint}
              style={{
                boxShadow: isPrinting 
                  ? 'inset 0 2px 4px rgba(0,0,0,0.4)' 
                  : '0 2px 0 #7f1d1d, 0 3px 5px rgba(0,0,0,0.3)',
                transform: isPrinting ? 'translateY(2px)' : 'none'
              }}
            >
              <div className="flex items-center gap-2 font-mono tracking-wide" style={{ textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}>
                {isPrinting ? (
                  <>
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    <span>打印中...</span>
                  </>
                ) : (
                  <>
                    <Printer size={16} className="text-white" />
                    <span>打印</span>
                  </>
                )}
              </div>
              {/* 按钮顶部高光效果 */}
              <div className="absolute inset-0 bg-gradient-to-b from-white to-transparent opacity-10 pointer-events-none"></div>
              {/* 按钮表面纹理 */}
              <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px] opacity-5 pointer-events-none"></div>
              {/* 按钮底部阴影 */}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-black opacity-20 pointer-events-none"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

