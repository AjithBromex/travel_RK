"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { formatINR } from "@/lib/utils";

interface IncomeExpenseItem {
  month: string;
  income: number;
  expenses: number;
}

interface ProfitTrendItem {
  date: string;
  profit: number;
}

interface ReportChartsProps {
  incomeVsExpenseData: IncomeExpenseItem[];
  profitTrendData: ProfitTrendItem[];
  trendRange: "7d" | "30d" | "month";
  onTrendRangeChange: (range: "7d" | "30d" | "month") => void;
}

export default function ReportCharts({
  incomeVsExpenseData,
  profitTrendData,
  trendRange,
  onTrendRangeChange,
}: ReportChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
      {/* Chart 1: Income vs Expenses */}
      <div className="card">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <div>
            <h3 className="font-semibold text-sm text-text-primary">Income vs Expenses</h3>
            <p className="text-xs text-text-secondary">Monthly comparison breakdown</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-primary flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incomeVsExpenseData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value: unknown) => [formatINR(Number(value) || 0), ""]}
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "8px",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 4px 12px -2px rgba(15, 23, 42, 0.08)",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Bar dataKey="income" name="Income (₹)" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="expenses" name="Expenses (₹)" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Profit Trend */}
      <div className="card">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <div>
            <h3 className="font-semibold text-sm text-text-primary">Profit Trend</h3>
            <p className="text-xs text-text-secondary">Cumulative net margins over time</p>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs border border-slate-200">
            <button
              onClick={() => onTrendRangeChange("7d")}
              className={`px-2 py-0.5 rounded-md font-medium text-xs transition-colors ${
                trendRange === "7d" ? "bg-white shadow-xs text-primary font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              7D
            </button>
            <button
              onClick={() => onTrendRangeChange("30d")}
              className={`px-2 py-0.5 rounded-md font-medium text-xs transition-colors ${
                trendRange === "30d" ? "bg-white shadow-xs text-primary font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              30D
            </button>
            <button
              onClick={() => onTrendRangeChange("month")}
              className={`px-2 py-0.5 rounded-md font-medium text-xs transition-colors ${
                trendRange === "month" ? "bg-white shadow-xs text-primary font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Month
            </button>
          </div>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={profitTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value: unknown) => [formatINR(Number(value) || 0), "Profit"]}
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "8px",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 4px 12px -2px rgba(15, 23, 42, 0.08)",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="profit"
                name="Profit (₹)"
                stroke="#1A56DB"
                strokeWidth={2}
                dot={{ fill: "#1A56DB", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
