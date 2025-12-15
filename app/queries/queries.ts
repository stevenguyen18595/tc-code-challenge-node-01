import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreateBillRequest,
  UserWithBillsResponse,
  UserResponse,
  BillWithRelationsResponse,
} from "../types";

// API Functions
const fetchBills = async (): Promise<BillWithRelationsResponse[]> => {
  const response = await fetch("/api/bills");
  if (!response.ok) {
    throw new Error("Failed to fetch bills");
  }
  return response.json();
};

const fetchUsers = async (): Promise<UserWithBillsResponse[]> => {
  const response = await fetch("/api/users");
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }
  return response.json();
};

const fetchUsersBasic = async (): Promise<UserResponse[]> => {
  const response = await fetch("/api/users");
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }
  return response.json();
};

const createBill = async (
  billData: CreateBillRequest,
): Promise<BillWithRelationsResponse> => {
  const response = await fetch("/api/bills", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(billData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create bill");
  }

  return response.json();
};

// Query Hooks
export const useBills = () => {
  return useQuery({
    queryKey: ["bills"],
    queryFn: fetchBills,
  });
};

export const useUsers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });
};

export const useUsersBasic = () => {
  return useQuery({
    queryKey: ["users-basic"],
    queryFn: fetchUsersBasic,
  });
};

// Mutation Hooks
export const useCreateBill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBill,
    onSuccess: () => {
      // Invalidate and refetch bills data
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};
