'use client';

import { useState, useEffect } from "react";
import api from "@/utils/api";
import toast from "react-hot-toast";

interface SalesReport {
  period: string;
  summary: {
    total_orders: number;
    total_revenue: number;
    average_order_value: number;
    paid_orders: number;
    pending_orders: number;
  };
  top_products: Array<{
    name: string;
    total_quantity: number;
    total_revenue: number;
  }>;
}

interface DateRange {
  start_date: string;
  end_date: string;
}

export default function ReportsPage() {
  const [report, setReport] = useState<SalesReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [period, setPeriod] = useState("weekly");
  const [customDates, setCustomDates] = useState<DateRange>({
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    if (period !== "custom") {
      generateReport();
    }
  }, [period]);

  useEffect(() => {
    if (period === "custom" && customDates.start_date && customDates.end_date) {
      generateReport();
    }
  }, [customDates]);

  const generateReport = async () => {
    if (period === "custom" && (!customDates.start_date || !customDates.end_date)) {
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams();

      if (period === "custom") {
        params.append("start_date", customDates.start_date);
        params.append("end_date", customDates.end_date);
      } else {
        params.append("period", period);
      }

      const response = await api.get(`/reports/sales?${params.toString()}`);
      setReport(response.data);
    } catch (error: any) {
      console.error("Error generating report:", error);
      const msg = error?.response?.data?.error || "Failed to generate report";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString("id-ID")}`;
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportReport = () => {
    if (!report) return;

    const reportData = `
Sales Report - ${report.period}
Generated on: ${new Date().toLocaleString()}

SUMMARY:
- Total Orders: ${report.summary.total_orders}
- Total Revenue: ${formatCurrency(report.summary.total_revenue)}
- Average Order Value: ${formatCurrency(report.summary.average_order_value)}
- Paid Orders: ${report.summary.paid_orders}
- Pending Orders: ${report.summary.pending_orders}

TOP SELLING PRODUCTS:
${report.top_products
  .map(
    (product, index) =>
      `${index + 1}. ${product.name} - Qty: ${product.total_quantity}, Revenue: ${formatCurrency(
        product.total_revenue
      )}`
  )
  .join("\n")}
    `.trim();

    downloadFile(
      `sales-report-${report.period}-${new Date()
        .toISOString()
        .split("T")[0]}.txt`,
      reportData
    );
    toast.success("Report exported successfully");
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sales Reports</h1>
        {report && (
          <button
            onClick={exportReport}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Export Report
          </button>
        )}
      </div>

      {/* Report Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Generate Report</h2>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {period === "custom" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customDates.start_date}
                  onChange={(e) =>
                    setCustomDates((prev) => ({
                      ...prev,
                      start_date: e.target.value,
                    }))
                  }
                  className="border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={customDates.end_date}
                  onChange={(e) =>
                    setCustomDates((prev) => ({
                      ...prev,
                      end_date: e.target.value,
                    }))
                  }
                  className="border rounded px-3 py-2"
                />
              </div>
            </>
          )}

          <button
            onClick={generateReport}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isLoading ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      {/* Report Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="text-lg">Generating report...</div>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold">{report.summary.total_orders}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(report.summary.total_revenue)}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Order Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(report.summary.average_order_value)}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Paid Orders</p>
                  <p className="text-2xl font-bold text-green-600">{report.summary.paid_orders}</p>
                  <p className="text-sm text-gray-500">
                    Pending: {report.summary.pending_orders}
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold">Top Selling Products</h2>
            </div>
            <div className="p-6">
              {report.top_products.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No sales data available for this period</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Rank</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Product Name</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Quantity Sold</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {report.top_products.map((product, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3">
                            <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium">{product.name}</td>
                          <td className="px-4 py-3 text-right">{product.total_quantity}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatCurrency(product.total_revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">
            Select a period and click &quot;Generate Report&quot; to view sales data
          </p>
        </div>
      )}
    </div>
  );
}