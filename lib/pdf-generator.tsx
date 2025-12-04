import jsPDF from "jspdf"
import { Transaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES, Account, Category } from "./types"
import NepaliDate from "nepali-date-converter"
import { create, mkdir, BaseDirectory } from "@tauri-apps/plugin-fs"
import { ask } from "@tauri-apps/plugin-dialog"

interface ReportData {
  transactions: Transaction[]
  period: "monthly" | "annual"
  month?: string
  year: number
  calendar: "AD" | "BS"
  currency: string,
  accounts: Account[],
  expenseCategories: Category[],
  incomeCategories: Category[]
}

// Modern color palette inspired by Notion/Stripe
const COLORS = {
  primary: [99, 102, 241], // Indigo
  success: [34, 197, 94], // Green
  danger: [239, 68, 68], // Red
  warning: [245, 158, 11], // Amber
  purple: [139, 92, 246],
  pink: [236, 72, 153],
  cyan: [6, 182, 212],
  blue: [59, 130, 246],
  
  // Text colors
  textPrimary: [15, 23, 42], // slate-900
  textSecondary: [55, 65, 81], // slate-800
  textMuted: [148, 163, 184], // slate-400
  
  // Background colors
  bgLight: [241, 245, 249], // slate-100
  bgCard: [255, 255, 255], // white
  bgDark: [225, 230, 235], // slate-200
  
  // Border
  border: [226, 232, 240], // slate-200
}

const CHART_COLORS = [
  [34, 197, 94],   // green
  [239, 68, 68],   // red
  [99, 102, 241],  // indigo
  [255, 140, 0],  // orange
  [128, 128, 128],  // gray
  [236, 72, 153],  // pink
  [6, 182, 212],   // cyan
  [0, 128, 128],  // teal
  [255, 215, 0],   // yellow
  [168, 85, 247]   // violet
]

// Helper function to create a pie chart as SVG
function generatePieChartSVG(
  categories: { name: string; amount: number }[],
  width: number = 400,   // increased default width
  height: number = 400   // increased default height
): string {
  const total = categories.reduce((sum, cat) => sum + cat.amount, 0);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 20;  // more padding

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<circle cx="${centerX}" cy="${centerY}" r="${radius + 10}" fill="#fefefe" opacity="0.5"/>`;

  if (categories.length === 1) {
    const color = CHART_COLORS[0];
    const colorStr = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    svg += `<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="${colorStr}" stroke="white" stroke-width="0.5"/>`;
    svg += `<circle cx="${centerX}" cy="${centerY}" r="${radius * 0.55}" fill="white"/>`;
    svg += `</svg>`;
    return svg;
  }

  let currentAngle = -Math.PI / 2;
  categories.forEach((category, index) => {
    const sliceAngle = (category.amount / total) * 2 * Math.PI;
    const x1 = centerX + radius * Math.cos(currentAngle);
    const y1 = centerY + radius * Math.sin(currentAngle);
    const x2 = centerX + radius * Math.cos(currentAngle + sliceAngle);
    const y2 = centerY + radius * Math.sin(currentAngle + sliceAngle);
    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const color = CHART_COLORS[index % CHART_COLORS.length];
    const colorStr = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    // Slice (skip shadow for smaller PDF size)
    svg += `<path d="${pathData}" fill="${colorStr}" stroke="white" stroke-width="0.5"/>`;
    currentAngle += sliceAngle;
  });

  // Donut center
  svg += `<circle cx="${centerX}" cy="${centerY}" r="${radius * 0.55}" fill="white"/>`;
  svg += `</svg>`;
  return svg;
}

// Helper function to create a bar chart as SVG
function generateBarChartSVG(
  data: { month: string; income: number; expenses: number }[],
  maxAmount: number
): string {
  const barWidth = 16;
  const spacing = 38;
  const width = data.length * spacing + 80;
  const height = 240;  // increased height for quality
  const padding = 50;
  const chartHeight = height - 2 * padding;

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${width}" height="${height}" fill="#fafbfc" rx="8"/>`;

  // Grid lines
  for (let i = 0; i <= 4; i++) {
    const y = padding + (chartHeight / 4) * i;
    svg += `<line x1="${padding}" y1="${y}" x2="${width - 20}" y2="${y}" stroke="#e2e8f0" stroke-width="1" opacity="0.5"/>`;
  }

  // Axes
  svg += `<line x1="${padding}" y1="${height - padding}" x2="${width - 20}" y2="${height - padding}" stroke="#94a3b8" stroke-width="2"/>`;
  svg += `<line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#94a3b8" stroke-width="2"/>`;

  // Bars
  data.forEach((item, index) => {
    const x = padding + index * spacing + 8;
    const incomeHeight = maxAmount > 0 ? (item.income / maxAmount) * chartHeight : 0;
    const expensesHeight = maxAmount > 0 ? (item.expenses / maxAmount) * chartHeight : 0;

    svg += `<rect x="${x}" y="${height - padding - incomeHeight}" width="${barWidth / 2}" height="${incomeHeight}" fill="#22c55e" rx="2"/>`;
    svg += `<rect x="${x + barWidth / 2}" y="${height - padding - expensesHeight}" width="${barWidth / 2}" height="${expensesHeight}" fill="#ef4444" rx="2"/>`;

    svg += `<text x="${x + barWidth / 2}" y="${height - padding + 20}" font-size="10" font-family="Arial, sans-serif" text-anchor="middle" fill="#64748b">${item.month}</text>`;
  });

  // Legend
  svg += `<rect x="${width - 100}" y="3" width="12" height="12" fill="#22c55e" rx="2"/>`;
  svg += `<text x="${width - 82}" y="13" font-size="11" font-family="Arial" fill="#475569">Income</text>`;
  svg += `<rect x="${width - 100}" y="19" width="12" height="12" fill="#ef4444" rx="2"/>`;
  svg += `<text x="${width - 82}" y="29" font-size="11" font-family="Arial" fill="#475569">Expenses</text>`;

  svg += `</svg>`;
  return svg;
}

// Convert SVG to PNG using canvas
function svgToBase64Image(svgString: string, scale: number = 8): Promise<string> {
  return new Promise((resolve) => {
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.fillStyle = "white"; // optional for PDF
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      ctx.restore();

      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85)); // JPEG + quality = smaller file
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve("");
    };

    img.src = url;
  });
}

function drawCard(
    doc: jsPDF, 
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    shadow: boolean = true,
    // Add the new parameter for border color (e.g., using primary color as default)
    borderColor: number[] = [5, 150, 105], 
    borderWidth: number = 0.5 
) {
  // Shadow
  if (shadow) {
    doc.setFillColor(0, 0, 0)
    doc.setFillColor(200, 200, 200) 
    doc.roundedRect(x + 1, y + 1, width, height, 3, 3, "F")
  }
  
  // Set the color for the border (stroke)
  doc.setDrawColor(200, 200, 200)
  
  // Set the thickness of the border line
  doc.setLineWidth(borderWidth)
  
  // --- Card Fill Color ---
  doc.setFillColor(COLORS.bgCard[0], COLORS.bgCard[1], COLORS.bgCard[2])
  
  // --- Draw the Card ---
  doc.roundedRect(x, y, width, height, 3, 3, "FD")
}

// Helper to draw section divider
function drawSectionDivider(doc: jsPDF, y: number) {
  const pageWidth = doc.internal.pageSize.getWidth()
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2])
  doc.setLineWidth(0.5)
  doc.line(20, y, pageWidth - 20, y)
}

const isTauri = () =>
    typeof window !== "undefined" && "__TAURI_INTERNALS__" in window

export async function generatePDFReport(data: ReportData) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let yPosition = 25

  // Background color for entire page
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageWidth, pageHeight, "F")

  const getCategoryName = (catId: string) => {
    const category = [...data.expenseCategories, ...data.incomeCategories].find((c) => c.id === catId)
    return category ? category.name : catId
  }

  const getAccountName = (accId: string) => {
    const account = data.accounts.find((a) => a.id === accId)
    return account ? account.name : accId
  }

  // Helper to check page break
  const checkPageBreak = (space: number = 20) => {
    if (yPosition + space > pageHeight - 20) {
      doc.addPage()
      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, pageWidth, pageHeight, "F")
      yPosition = 25
      return true
    }
    return false
  }

  const customDateFormat = (date: string) => {
    const d = new Date(date)
    if(data.calendar === "BS") {
      const nepaliDate = new NepaliDate(new Date(date))
      return `${nepaliDate.getYear()}-${(nepaliDate.getMonth() + 1).toString().padStart(2,"0")}-${nepaliDate.getDate().toString().padStart(2,"0")}`
    }
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,"0")}-${d.getDate().toString().padStart(2,"0")}`
  }

  // ========== HEADER SECTION ==========
  // Large header card
  drawCard(doc, 15, 15, pageWidth - 30, 40, true)
  
  doc.setFont("helvetica", "bold")
  doc.setFontSize(24)
  doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])

  const periodText =
    data.period === "monthly"
      ? `Financial Report`
      : `Annual Financial Report`

  doc.text(periodText, 25, 32)
  
  // Subheading
  doc.setFont("helvetica", "normal")
  doc.setFontSize(18)
  doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
  const subheading = data.period === "monthly" 
    ? `${data.month} ${data.year} ${data.calendar}`
    : `${data.year} ${data.calendar}`
  doc.text(subheading, 25, 42)
  
  // Generated date (top right)
  doc.setFontSize(9)
  doc.setTextColor(COLORS.textMuted[0], COLORS.textMuted[1], COLORS.textMuted[2])
  const genDate = `Generated: ${customDateFormat(new Date().toDateString())}`
  doc.text(genDate, pageWidth - 25, 45, { align: "right" })

  yPosition = 70

  // ========== SUMMARY METRICS CARDS ==========
  const transactions = data.transactions
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0)

  const balance = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(2) : 0

  // Three metric cards in a row
  const cardWidth = (pageWidth - 55) / 3
  const cardHeight = 32
  
  const metrics = [
    { label: "Total Income", value: `${data.currency} ${totalIncome.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, color: COLORS.success },
    { label: "Total Expenses", value: `${data.currency} ${totalExpenses.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, color: COLORS.danger },
    { label: "Net Balance", value: `${balance >= 0 ? '+ ' : '- '}${data.currency} ${Math.abs(balance).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, color: COLORS.textSecondary }
  ]

  metrics.forEach((metric, idx) => {
    const cardX = 15 + idx * (cardWidth + 5)
    drawCard(doc, cardX, yPosition, cardWidth, cardHeight, true)
    
    // Colored bar on top
    doc.setFillColor(metric.color[0], metric.color[1], metric.color[2])
    doc.roundedRect(cardX, yPosition, cardWidth, 3, 2, 2, "F")
    
    // Label
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
    doc.text(metric.label, cardX + cardWidth / 2, yPosition + 12, { align: "center" })
    
    // Value
    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
    doc.text(metric.value, cardX + cardWidth / 2, yPosition + 24, { align: "center" })
  })

  yPosition += cardHeight + 15

  // Savings rate card
  drawCard(doc, 15, yPosition - 5, pageWidth - 150, 20, true)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
  doc.text("Savings Rate:", 25, yPosition + 6)
  
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
  doc.text(`${Number(savingsRate) >= 0 ? savingsRate : '-- '}%`, 50, yPosition + 6, { align: "left" })

  // Total transactions card
  drawCard(doc, 80, yPosition - 5, pageWidth - 150, 20, true)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
  doc.text("Total Transactions:", 90, yPosition + 6)
  
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
  doc.text(`${transactions.length}`, 123, yPosition + 6, { align: "left" })

  yPosition += 35

  // ========== INCOME VS EXPENSE OVERVIEW ==========
  checkPageBreak(120)
  
  // Section header
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
  doc.text("Income vs Expenses Overview", 20, yPosition)
  yPosition += 3
  
  drawSectionDivider(doc, yPosition)
  yPosition += 15

  // Income vs Expense pie chart
  if (totalIncome > 0 || totalExpenses > 0) {
    drawCard(doc, 15, yPosition, pageWidth - 30, 95, true)
    
    const overviewData = [
      { name: "Income", amount: totalIncome },
      { name: "Expenses", amount: totalExpenses }
    ]
    
    try {
      const overviewSVG = generatePieChartSVG(overviewData, 160, 160)
      const overviewImage = await svgToBase64Image(overviewSVG)
      if (overviewImage) {
        doc.addImage(overviewImage, "PNG", 25, yPosition + 5, 85, 85)
      }
    } catch (error) {
      console.error("Error generating overview pie chart:", error)
    }

    // Summary text next to chart
    const summaryX = 120
    let summaryY = yPosition + 20
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
    doc.text("Financial Overview", summaryX, summaryY)
    summaryY += 10

    // Income
    doc.setFillColor(COLORS.success[0], COLORS.success[1], COLORS.success[2])
    doc.roundedRect(summaryX, summaryY - 2, 4, 4, 1, 1, "F")
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
    doc.text("Total Income", summaryX + 7, summaryY + 1)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
    doc.text(`${data.currency} ${totalIncome.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, summaryX + 7, summaryY + 8)
    summaryY += 18

    // Expenses
    doc.setFillColor(COLORS.danger[0], COLORS.danger[1], COLORS.danger[2])
    doc.roundedRect(summaryX, summaryY - 2, 4, 4, 1, 1, "F")
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
    doc.text("Total Expenses", summaryX + 7, summaryY + 1)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
    doc.text(`${data.currency} ${totalExpenses.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, summaryX + 7, summaryY + 8)
    summaryY += 18

    // Net balance
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
    doc.text("Net Balance", summaryX, summaryY + 1)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    const balanceColor = balance >= 0 ? COLORS.success : COLORS.danger
    doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2])
    doc.text(`${balance >= 0 ? '+ ' : '- '}${data.currency} ${Math.abs(balance).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, summaryX, summaryY + 10)

    yPosition += 110
  }

  // ========== INCOME ANALYSIS SECTION ==========
  checkPageBreak(120)
  
  // Section header
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
  doc.text("Income Analysis", 20, yPosition)
  yPosition += 3
  
  drawSectionDivider(doc, yPosition)
  yPosition += 15

  // Income category breakdown
  const incomeCategoryMap: { [key: string]: number } = {}
  transactions
    .filter((t) => t.type === "income")
    .forEach((t) => {
      incomeCategoryMap[t.category] = (incomeCategoryMap[t.category] || 0) + t.amount
    })

  const incomeCategoryData = Object.entries(incomeCategoryMap)
    .sort((a, b) => b[1] - a[1])
    .map(([categoryId, amount]) => {
      const categoryInfo = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find(
        (cat) => cat.id === categoryId
      )
      return {
        name: getCategoryName(categoryId) || categoryInfo?.name || categoryId,
        amount,
      }
    })

  if (incomeCategoryData.length > 0) {
    // Card for chart and legend
    drawCard(doc, 15, yPosition, pageWidth - 30, 95, true)
    
    // Generate and add income pie chart
    try {
      const incomeChartSVG = generatePieChartSVG(incomeCategoryData, 160, 160)
      const incomeChartImage = await svgToBase64Image(incomeChartSVG)
      if (incomeChartImage) {
        doc.addImage(incomeChartImage, "PNG", 25, yPosition + 5, 85, 85)
      }
    } catch (error) {
      console.error("Error generating income pie chart:", error)
    }

    // Legend next to chart
    const legendX = 120
    let legendY = yPosition + 11
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
    doc.text(`${incomeCategoryData.length > 10 ? "Top 10 Income Categories" : "Income Categories"}`, legendX, legendY)
    legendY += 8

    incomeCategoryData.slice(0, 10).forEach((cat, idx) => {
      const color = CHART_COLORS[idx % CHART_COLORS.length]
      
      // Color box
      doc.setFillColor(color[0], color[1], color[2])
      doc.roundedRect(legendX, legendY - 2, 4, 4, 1, 1, "F")
      
      // Category name
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
      const catName = cat.name.length > 18 ? cat.name.substring(0, 18) + "..." : cat.name
      doc.text(catName, legendX + 7, legendY + 1)
      
      // Amount
      doc.setFont("helvetica", "bold")
      doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
      const percentage = totalIncome > 0 ? ((cat.amount / totalIncome) * 100).toFixed(2) : "0"
      doc.text(`${percentage}%`, pageWidth - 25, legendY + 1, { align: "right" })
      
      legendY += 7
    })

    yPosition += 110
  } else {
    // No income data message
    drawCard(doc, 15, yPosition, pageWidth - 30, 30, true)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(12)
    doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
    doc.text("No income transactions recorded for this period.", 25, yPosition + 16)
    yPosition += 45
  }

  // Income details table
  if (incomeCategoryData.length > 0) {
    checkPageBreak(80)
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
    doc.text("Income Details", 20, yPosition)
    yPosition += 3
    
    drawSectionDivider(doc, yPosition)
    yPosition += 12

    // Table card
    const incomeTableHeight = 100
    drawCard(doc, 15, yPosition, pageWidth - 30, incomeTableHeight, true)
    
    let incomeTableY = yPosition + 10

    // Table headers with background
    doc.setFillColor(COLORS.bgDark[0], COLORS.bgDark[1], COLORS.bgDark[2])
    doc.roundedRect(20, incomeTableY - 4, pageWidth - 40, 10, 2, 2, "F")
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
    doc.text("Category", 25, incomeTableY + 2)
    doc.text("Amount", pageWidth / 2 - 10, incomeTableY + 2)
    doc.text("Percentage", pageWidth - 55, incomeTableY + 2)
    incomeTableY += 12

    // Table rows
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)

    incomeCategoryData.forEach((cat, idx) => {
      if (incomeTableY > yPosition + incomeTableHeight - 5) return
      
      // Alternating row colors
      if (idx % 2 === 1) {
        doc.setFillColor(COLORS.bgLight[0], COLORS.bgLight[1], COLORS.bgLight[2])
        doc.rect(20, incomeTableY - 5, pageWidth - 40, 8, "F")
      }
      
      doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
      const catName = cat.name.length > 25 ? cat.name.substring(0, 25) + "..." : cat.name
      doc.text(catName, 25, incomeTableY)
      
      doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
      doc.text(`${data.currency} ${cat.amount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, pageWidth / 2 - 10, incomeTableY)
      
      const percentage = totalIncome > 0 ? ((cat.amount / totalIncome) * 100).toFixed(2) : "0"
      doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
      doc.text(`${percentage}%`, pageWidth - 55, incomeTableY)
      
      incomeTableY += 8
    })
  }
  yPosition += pageHeight + 20

  // ========== EXPENSE BREAKDOWN SECTION ==========
  checkPageBreak(120)
  
  // Section header
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
  doc.text("Expense Analysis", 20, yPosition)
  yPosition += 3
  
  drawSectionDivider(doc, yPosition)
  yPosition += 15

  // Category breakdown
  const categoryMap: { [key: string]: number } = {}
  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount
    })

  const categoryData = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .map(([categoryId, amount]) => {
      const categoryInfo = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find(
        (cat) => cat.id === categoryId
      )
      return {
        name: getCategoryName(categoryId) || categoryInfo?.name || categoryId,
        amount,
      }
    })

  if (categoryData.length > 0) {
    // Card for chart and legend
    drawCard(doc, 15, yPosition, pageWidth - 30, 95, true)
    
    // Generate and add pie chart
    try {
      const chartSVG = generatePieChartSVG(categoryData, 160, 160)
      const chartImage = await svgToBase64Image(chartSVG)
      if (chartImage) {
        doc.addImage(chartImage, "PNG", 25, yPosition + 5, 85, 85)
      }
    } catch (error) {
      console.error("Error generating pie chart:", error)
    }

    // Legend next to chart
    const legendX = 120
    let legendY = yPosition + 11
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
    doc.text(`${categoryData.length > 10 ? "Top 10 Expense Categories" : "Expense Categories"}`, legendX, legendY)
    legendY += 8

    categoryData.slice(0, 10).forEach((cat, idx) => {
      const color = CHART_COLORS[idx % CHART_COLORS.length]
      
      // Color box
      doc.setFillColor(color[0], color[1], color[2])
      doc.roundedRect(legendX, legendY - 2, 4, 4, 1, 1, "F")
      
      // Category name
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
      const catName = cat.name.length > 18 ? cat.name.substring(0, 18) + "..." : cat.name
      doc.text(catName, legendX + 7, legendY + 1)
      
      // Amount
      doc.setFont("helvetica", "bold")
      doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
      const percentage = totalExpenses > 0 ? ((cat.amount / totalExpenses) * 100).toFixed(2) : "0"
      doc.text(`${percentage}%`, pageWidth - 25, legendY + 1, { align: "right" })
      
      legendY += 7
    })

    yPosition += 110
  } else {
    // No expense data message
    drawCard(doc, 15, yPosition, pageWidth - 30, 30, true)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(12)
    doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
    doc.text("No expense transactions recorded for this period.", 25, yPosition + 16)
    yPosition += 45
  }

  // ========== CATEGORY DETAILS TABLE ==========
  if (categoryData.length > 0) {
    checkPageBreak(80)
  
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
    doc.text("Expense Details", 20, yPosition)
    yPosition += 3
    
    drawSectionDivider(doc, yPosition)
    yPosition += 12

    // Table card
    const tableHeight = 100
    drawCard(doc, 15, yPosition, pageWidth - 30, tableHeight, true)
    
    let tableY = yPosition + 10

    // Table headers with background
    doc.setFillColor(COLORS.bgDark[0], COLORS.bgDark[1], COLORS.bgDark[2])
    doc.roundedRect(20, tableY - 4, pageWidth - 40, 10, 2, 2, "F")
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
    doc.text("Category", 25, tableY + 2)
    doc.text("Amount", pageWidth / 2 - 10, tableY + 2)
    doc.text("Percentage", pageWidth - 55, tableY + 2)
    tableY += 12

    // Table rows
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)

    categoryData.forEach((cat, idx) => {
      if (tableY > yPosition + tableHeight - 5) return
      
      // Alternating row colors
      if (idx % 2 === 1) {
        doc.setFillColor(COLORS.bgLight[0], COLORS.bgLight[1], COLORS.bgLight[2])
        doc.rect(20, tableY - 5, pageWidth - 40, 8, "F")
      }
      
      doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
      const catName = cat.name.length > 25 ? cat.name.substring(0, 25) + "..." : cat.name
      doc.text(catName, 25, tableY)
      
      doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
      doc.text(`${data.currency} ${cat.amount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, pageWidth / 2 - 10, tableY)
      
      const percentage = totalExpenses > 0 ? ((cat.amount / totalExpenses) * 100).toFixed(2) : "0"
      doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
      doc.text(`${percentage}%`, pageWidth - 55, tableY)
      
      tableY += 8
    })
  }
  yPosition += pageHeight + 20

  // ========== MONTHLY TREND (for annual reports) ==========
  if (data.period === "annual") {
    checkPageBreak(110)
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
    doc.text(`Monthly Trend for ${data.year} ${data.calendar}`, 20, yPosition)
    yPosition += 3
    
    drawSectionDivider(doc, yPosition)
    yPosition += 15

    // Prepare monthly data
    const monthlyData: { [key: string]: { income: number; expenses: number } } = {}
    const adMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const bsMonths = [
      "Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Ashwin",
      "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
    ]
    const monthNames = data.calendar === "AD" ? adMonths : bsMonths

    monthNames.forEach((month) => {
      monthlyData[month] = { income: 0, expenses: 0 }
    })

    transactions.forEach((transaction) => {
      const transactionDate = data.calendar === "AD" ? new Date(transaction.date) : new NepaliDate(new Date(transaction.date)).getBS()
      const monthIndex = data.calendar === "AD" ? transactionDate.getMonth() : transactionDate.month
      const monthKey = monthNames[monthIndex]

      if (monthlyData[monthKey]) {
        if (transaction.type === "income") {
          monthlyData[monthKey].income += transaction.amount
        } else {
          monthlyData[monthKey].expenses += transaction.amount
        }
      }
    })

    const trendData = monthNames.map((month) => ({
      month,
      income: monthlyData[month].income,
      expenses: monthlyData[month].expenses,
    }))

    const maxAmount = Math.max(
      ...trendData.map((d) => Math.max(d.income, d.expenses)),
      1
    )

    if (maxAmount > 0) {
      drawCard(doc, 15, yPosition, pageWidth - 30, 78, true)
      
      try {
        const chartSVG = generateBarChartSVG(trendData, maxAmount)
        const chartImage = await svgToBase64Image(chartSVG)
        if (chartImage) {
          doc.addImage(chartImage, "PNG", 18, yPosition + 5, 170, 70)
        }
      } catch (error) {
        console.error("Error generating bar chart:", error)
      }
      

      yPosition += 95
    }

    // Table card
    const tableHeight = 130
    drawCard(doc, 15, yPosition - 10, pageWidth - 30, tableHeight, true)
    
    let tableY = yPosition

    // Table headers with background
    doc.setFillColor(COLORS.bgDark[0], COLORS.bgDark[1], COLORS.bgDark[2])
    doc.roundedRect(20, tableY - 4, pageWidth - 40, 10, 2, 2, "F")
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
    doc.text("Month", 25, tableY + 2)
    doc.text("Income", pageWidth / 2 - 35, tableY + 2)
    doc.text("Expenses", pageWidth - 100, tableY + 2)
    doc.text("Balance", pageWidth - 60, tableY + 2)
    tableY += 12

    // Table rows
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)

    monthNames.forEach((m, idx) => {
      // Alternating row colors
      if (idx % 2 === 1) {
        doc.setFillColor(COLORS.bgLight[0], COLORS.bgLight[1], COLORS.bgLight[2])
        doc.rect(20, tableY - 5, pageWidth - 40, 8, "F")
      }

      doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])
      doc.text(m, 25, tableY)
      
      if (monthlyData[m].income > 0) {
        doc.setTextColor(COLORS.success[0], COLORS.success[1], COLORS.success[2])
      } else {
        doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
      }
      doc.text(`${data.currency} ${monthlyData[m].income.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, pageWidth / 2 - 35, tableY)
      
      if (monthlyData[m].expenses > 0) {
        doc.setTextColor(COLORS.danger[0], COLORS.danger[1], COLORS.danger[2])
      } else {
        doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
      }
      doc.text(`${data.currency} ${monthlyData[m].expenses.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, pageWidth - 100, tableY)
      
      doc.setFont("helvetica", "bold")
      const balance = monthlyData[m].income - monthlyData[m].expenses
      doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
      doc.text(`${balance >= 0 ? '+ ' : '- '}${data.currency} ${(Math.abs(balance)).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, pageWidth - 60, tableY)

      doc.setFont("helvetica", "normal")
      tableY += 8
    })

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)

    doc.setFillColor(COLORS.bgDark[0], COLORS.bgDark[1], COLORS.bgDark[2])
    doc.rect(20, tableY - 5, pageWidth - 40, 10, "F")

    doc.text("TOTAL", 25, tableY + 1)

    doc.setTextColor(COLORS.success[0], COLORS.success[1], COLORS.success[2])
    doc.text(`${data.currency} ${totalIncome.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, pageWidth / 2 - 35, tableY + 1)

    doc.setTextColor(COLORS.danger[0], COLORS.danger[1], COLORS.danger[2])
    doc.text(`${data.currency} ${totalExpenses.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, pageWidth - 100, tableY + 1)

    doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
    doc.text(`${(totalIncome - totalExpenses) >= 0 ? '+ ' : '- '}${data.currency} ${Math.abs(totalIncome - totalExpenses).toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, pageWidth - 60, tableY + 1, {
      align: "left",
    })

    yPosition += pageHeight + 20
  }

  // ========== ACCOUNTS LIST ==========
  checkPageBreak(120)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
  doc.text("Accounts List", 20, yPosition)
  yPosition += 3

  drawSectionDivider(doc, yPosition)
  yPosition += 12

  const accountRows = data.accounts.map((acc) => {
    const accountTransactions = transactions.filter((t) => t.account === acc.id)

    let income = 0
    let expense = 0

    accountTransactions.forEach((t) => {
      if (t.type === "income") {
        income += t.amount
      } else {
        expense += t.amount
      }
    })

    return {
      name: acc.name,
      income,
      expense,
      balance: income - expense
    }
  })

  // === Draw table headers ===
  function drawAccountTableHeader(startY) {
    doc.setFillColor(COLORS.bgDark[0], COLORS.bgDark[1], COLORS.bgDark[2])
    doc.roundedRect(20, startY - 4, pageWidth - 40, 10, 2, 2, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])

    doc.text("Account", 25, startY + 2)
    doc.text("Income", 85, startY + 2)
    doc.text("Expense", 120, startY + 2)
    doc.text("Balance", 155, startY + 2)
  }

  // === Card container ===
  const accountTableHeight = pageHeight - 70
  drawCard(doc, 15, yPosition, pageWidth - 30, accountTableHeight, true)

  let txnY = yPosition + 10
  drawAccountTableHeader(txnY)
  txnY += 12

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)

  // === Table Rows ===
  accountRows.forEach((row, idx) => {
    if (txnY > pageHeight - 20) {
      doc.addPage()

      drawCard(doc, 15, 20, pageWidth - 30, pageHeight - 40, true)

      txnY = 30
      drawAccountTableHeader(txnY)
      txnY += 12
    }

    // Alternating row shading
    if (idx % 2 === 1) {
      doc.setFillColor(COLORS.bgLight[0], COLORS.bgLight[1], COLORS.bgLight[2])
      doc.rect(20, txnY - 5, pageWidth - 40, 8, "F")
    }

    doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])

    const accName = row.name.length > 30 ? row.name.substring(0, 30) + "..." : row.name
    doc.text(accName, 25, txnY)

    // Income Column
    doc.setFont("helvetica", row.income ? "bold" : "normal")
    doc.setTextColor(COLORS.success[0], COLORS.success[1], COLORS.success[2])
    doc.text(
      row.income ? `${data.currency} ${row.income.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : "-",
      85,
      txnY
    )

    // Expense Column
    doc.setFont("helvetica", row.expense ? "bold" : "normal")
    doc.setTextColor(COLORS.danger[0], COLORS.danger[1], COLORS.danger[2])
    doc.text(
      row.expense ? `${data.currency} ${row.expense.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : "-",
      120,
      txnY
    )

    // Balance Column
    doc.setFont("helvetica", "bold")
    doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
    doc.text(
      `${row.balance >= 0 ? '+ ' : '- '}${data.currency} ${Math.abs(row.balance).toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
      155,
      txnY,
      { align: "left" }
    )

    doc.setFont("helvetica", "normal")

    txnY += 8
  })

  // === SUMMARY ROW ===
  if (txnY > pageHeight - 20) {
    doc.addPage()
    drawCard(doc, 15, 20, pageWidth - 30, pageHeight - 40, true)
    txnY = 30
    drawAccountTableHeader(txnY)
    txnY += 12
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)

  doc.setFillColor(COLORS.bgDark[0], COLORS.bgDark[1], COLORS.bgDark[2])
  doc.rect(20, txnY - 5, pageWidth - 40, 10, "F")

  doc.text("TOTAL", 25, txnY + 1)

  doc.setTextColor(COLORS.success[0], COLORS.success[1], COLORS.success[2])
  doc.text(`${data.currency} ${totalIncome.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 85, txnY + 1)

  doc.setTextColor(COLORS.danger[0], COLORS.danger[1], COLORS.danger[2])
  doc.text(`${data.currency} ${totalExpenses.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 120, txnY + 1)

  doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
  doc.text(`${(totalIncome - totalExpenses) >= 0 ? '+ ' : '- '}${data.currency} ${Math.abs(totalIncome - totalExpenses).toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 155, txnY + 1, {
    align: "left",
  })
  yPosition += pageHeight + 20

  // ========== TRANSACTIONS LIST ==========
  checkPageBreak(120)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
  doc.text("Transactions List", 20, yPosition)
  yPosition += 3

  drawSectionDivider(doc, yPosition)
  yPosition += 12

  // ===== Build rows with running balance =====
  let runningBalance = 0
  let totalIncomeTxn = 0
  let totalExpenseTxn = 0

  const transactionRows = transactions.map((t) => {
    const isIncome = t.type === "income"
    const income = isIncome ? t.amount : 0
    const expense = !isIncome ? t.amount : 0

    // Update totals
    totalIncomeTxn += income
    totalExpenseTxn += expense

    // Update running balance
    runningBalance += income - expense

    return {
      date: customDateFormat(t.date),
      category: getCategoryName(t.category),
      account: getAccountName(t.account),
      income,
      expense,
      balance: runningBalance,
    }
  })

  // === Draw table headers ===
  function drawTxnTableHeader(startY) {
    doc.setFillColor(COLORS.bgDark[0], COLORS.bgDark[1], COLORS.bgDark[2])
    doc.roundedRect(20, startY - 4, pageWidth - 40, 10, 2, 2, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])

    doc.text("Date", 25, startY + 2)
    doc.text("Account", 50, startY + 2)
    doc.text("Category", 82, startY + 2)
    doc.text("Income", 115, startY + 2)
    doc.text("Expense", 140, startY + 2)
    doc.text("Balance", 165, startY + 2)
  }

  // === Card container ===
  const txnTableHeight = pageHeight - 70
  drawCard(doc, 15, yPosition, pageWidth - 30, txnTableHeight, true)

  txnY = yPosition + 10
  drawTxnTableHeader(txnY)
  txnY += 12

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)

  // === Table Rows ===
  transactionRows.forEach((row, idx) => {
    if (txnY > pageHeight - 20) {
      doc.addPage()

      drawCard(doc, 15, 20, pageWidth - 30, pageHeight - 40, true)

      txnY = 30
      drawTxnTableHeader(txnY)
      txnY += 12
    }

    // Alternating row shading
    if (idx % 2 === 1) {
      doc.setFillColor(COLORS.bgLight[0], COLORS.bgLight[1], COLORS.bgLight[2])
      doc.rect(20, txnY - 5, pageWidth - 40, 8, "F")
    }

    doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2])

    doc.text(row.date, 25, txnY)

    const accName = row.account.length > 20 ? row.account.substring(0, 15) + "..." : row.account
    doc.text(accName, 50, txnY)

    const catName = row.category.length > 20 ? row.category.substring(0, 15) + "..." : row.category
    doc.text(catName, 82, txnY)

    // Income Column
    doc.setFont("helvetica", row.income ? "bold" : "normal")
    doc.setTextColor(COLORS.success[0], COLORS.success[1], COLORS.success[2])
    doc.text(
      row.income ? `${data.currency} ${row.income.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : "-",
      115,
      txnY
    )

    // Expense Column
    doc.setFont("helvetica", row.expense ? "bold" : "normal")
    doc.setTextColor(COLORS.danger[0], COLORS.danger[1], COLORS.danger[2])
    doc.text(
      row.expense ? `${data.currency} ${row.expense.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : "-",
      140,
      txnY
    )

    // Balance Column
    doc.setFont("helvetica", "bold")
    doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
    doc.text(
      `${row.balance >= 0 ? '+ ' : '- '}${data.currency} ${Math.abs(row.balance).toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
      165,
      txnY,
      { align: "left" }
    )

    doc.setFont("helvetica", "normal")

    txnY += 8
  })

  // === SUMMARY ROW ===
  if (txnY > pageHeight - 20) {
    doc.addPage()
    drawCard(doc, 15, 20, pageWidth - 30, pageHeight - 40, true)
    txnY = 30
    drawTxnTableHeader(txnY)
    txnY += 12
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)

  doc.setFillColor(COLORS.bgDark[0], COLORS.bgDark[1], COLORS.bgDark[2])
  doc.rect(20, txnY - 5, pageWidth - 40, 10, "F")

  doc.text("TOTAL", 82, txnY + 1)

  doc.setTextColor(COLORS.success[0], COLORS.success[1], COLORS.success[2])
  doc.text(`${data.currency} ${totalIncomeTxn.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 115, txnY + 1)

  doc.setTextColor(COLORS.danger[0], COLORS.danger[1], COLORS.danger[2])
  doc.text(`${data.currency} ${totalExpenseTxn.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 140, txnY + 1)

  doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2])
  doc.text(`${(totalIncomeTxn - totalExpenseTxn) >= 0 ? '+ ' : '- '}${data.currency} ${Math.abs(totalIncomeTxn - totalExpenseTxn).toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 165, txnY + 1, {
    align: "left",
  })

  // ========== FOOTER ==========
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(COLORS.textMuted[0], COLORS.textMuted[1], COLORS.textMuted[2])
  doc.text(
    "This report was auto-generated by NepaliWallet",
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  )

  const d = new Date()
  const stamp = `exported-${d.getFullYear()}-${(d.getMonth()+1)
    .toString().padStart(2,"0")}-${d.getDate()
    .toString().padStart(2,"0")}_${d.getHours()
    .toString().padStart(2,"0")}-${d.getMinutes()
    .toString().padStart(2,"0")}-${d.getSeconds()
    .toString().padStart(2,"0")}`

  // Save the PDF
  const fileName = `financial-report-${data.period === "monthly" ? `${data.month}-` : ""}${data.year}${data.calendar}-${stamp}.pdf`
  
  try {
    // -----------------------------------------------------
    // Convert PDF to Uint8Array
    // -----------------------------------------------------
    const pdfArrayBuffer = doc.output("arraybuffer")
    const pdfUint8 = new Uint8Array(pdfArrayBuffer)
    let binary = ""
    for (let i = 0; i < pdfUint8.length; i++) {
      binary += String.fromCharCode(pdfUint8[i])
    }
    const pdfBase64 = btoa(binary)

    // ---------------------------------------------------------
    // 🌐 WEB EXPORT
    // ---------------------------------------------------------
    if (!isTauri()) {
      const blob = new Blob([pdfUint8], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)

      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      a.click()

      URL.revokeObjectURL(url)
    }

    // ---------------------------------------------------------
    // 🤖 DESKTOP EXPORT (Documents/NepaliWallet)
    // ---------------------------------------------------------
    if (isTauri()) {
      // ✅ Ensure folder exists
      await mkdir("NepaliWallet", {
        baseDir: BaseDirectory.Document,
        recursive: true,
      })

      // ✅ Create PDF file
      const file = await create(`NepaliWallet/${fileName}`, {
        baseDir: BaseDirectory.Document,
      })

      // ✅ Convert base64 → Uint8Array (REQUIRED FOR PDF)
      const binary = Uint8Array.from(
        atob(pdfBase64),
        (char) => char.charCodeAt(0)
      )

      // ✅ Write binary PDF data
      await file.write(binary)
      await file.close()
    }
  }
  catch (e: any) {
    console.error("PDF generation failed:", e)
  }
}