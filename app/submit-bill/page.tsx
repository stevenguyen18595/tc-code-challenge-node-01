"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreateBillRequest } from "../types";
import { useUsersBasic, useCreateBill } from "../queries/queries";

export default function SubmitBillPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<CreateBillRequest>({
    billReference: "",
    billDate: "",
    assignedToId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Queries
  const {
    data: users,
    isLoading: usersLoading,
    error: usersError,
  } = useUsersBasic();

  // Mutation
  const { mutate: createBill, isPending: isCreating } = useCreateBill();

  // Loading and error states
  if (usersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-xl text-gray-600">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (usersError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-xl text-red-600">Error loading data</div>
          </div>
        </div>
      </div>
    );
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.billReference.trim()) {
      newErrors.billReference = "Bill reference is required";
    }

    if (!formData.billDate) {
      newErrors.billDate = "Bill date is required";
    }

    if (!formData.assignedToId) {
      newErrors.assignedToId = "Please select a user to assign the bill to";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    createBill(formData, {
      onSuccess: () => {
        router.push("/");
      },
      onError: (error) => {
        setErrors({ submit: error.message });
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Submit New Bill</h1>
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bill Reference */}
            <div>
              <label
                htmlFor="billReference"
                className="block text-sm font-medium text-gray-700 mb-2">
                Bill Reference *
              </label>
              <input
                type="text"
                id="billReference"
                name="billReference"
                value={formData.billReference}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.billReference ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter bill reference"
              />
              {errors.billReference && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.billReference}
                </p>
              )}
            </div>

            {/* Bill Date */}
            <div>
              <label
                htmlFor="billDate"
                className="block text-sm font-medium text-gray-700 mb-2">
                Bill Date *
              </label>
              <input
                type="date"
                id="billDate"
                name="billDate"
                value={formData.billDate}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.billDate ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.billDate && (
                <p className="mt-1 text-sm text-red-600">{errors.billDate}</p>
              )}
            </div>

            {/* Assigned To */}
            <div>
              <label
                htmlFor="assignedToId"
                className="block text-sm font-medium text-gray-700 mb-2">
                Assign to User *
              </label>
              <select
                id="assignedToId"
                name="assignedToId"
                value={formData.assignedToId}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.assignedToId ? "border-red-500" : "border-gray-300"
                }`}>
                <option value="">Select a user</option>
                {users?.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              {errors.assignedToId && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.assignedToId}
                </p>
              )}
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Link
                href="/"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {isCreating ? "Submitting..." : "Submit Bill"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
