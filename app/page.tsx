"use client";

import Link from "next/link";
import { useBills, useUsers } from "@/app/queries/queries";
import { BillStats, UserStats } from "./types";
import { useMemo } from "react";

export default function Home() {
  const {
    data: bills,
    isLoading: billsLoading,
    error: billsError,
  } = useBills();

  const {
    data: users,
    isLoading: usersLoading,
    error: usersError,
  } = useUsers();

  // Compute bill statistics
  const billsStats: BillStats | undefined = useMemo(() => {
    if (!bills) return undefined;

    const totalBills = bills.length;
    const submittedBills = bills.filter(
      (bill) =>
        bill.submittedAt !== null && bill.billStage.label === "Submitted",
    ).length;
    const approvedBills = bills.filter(
      (bill) => bill.approvedAt !== null && bill.billStage.label === "Approved",
    ).length;
    const onHoldBills = bills.filter(
      (bill) => bill.onHoldAt !== null && bill.billStage.label === "On Hold",
    ).length;

    return {
      total: totalBills,
      submitted: submittedBills,
      approved: approvedBills,
      onHold: onHoldBills,
    };
  }, [bills]);

  // Compute user statistics
  const usersData: UserStats[] | undefined = useMemo(() => {
    if (!users) return undefined;

    return users.map((user) => ({
      name: user.name,
      totalBills: user.bills.length,
      totalSubmitted: user.bills.filter((bill) => bill.submittedAt !== null)
        .length,
      totalApproved: user.bills.filter((bill) => bill.approvedAt !== null)
        .length,
    }));
  }, [users]);

  if (billsLoading || usersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-xl text-gray-600">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (billsError || usersError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-xl text-red-600">Error loading data</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bills</h1>
          <Link
            href="/submit-bill"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
            Submit New Bill
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-200 p-6 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Total number submitted bills
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              {billsStats?.submitted}
            </p>
          </div>
          <div className="bg-gray-200 p-6 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Total number approved bills
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              {billsStats?.approved}
            </p>
          </div>
          <div className="bg-gray-200 p-6 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Total number on hold bills
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              {billsStats?.onHold}
            </p>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total bills
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total approved
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usersData?.map((user) => (
                  <tr key={user.name}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.totalBills}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.totalSubmitted}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.totalApproved}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
