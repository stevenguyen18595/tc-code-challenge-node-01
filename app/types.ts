import { Prisma } from "@prisma/client";

// Stats types (custom business logic)
export type BillStats = {
  total: number;
  submitted: number;
  approved: number;
  onHold: number;
};

export type UserStats = {
  name: string;
  totalBills: number;
  totalSubmitted: number;
  totalApproved: number;
};

// API/queries request/response types
export type CreateBillRequest = {
  billReference: string;
  billDate: string;
  assignedToId: string;
};

export type UserWithBillsResponse = Prisma.UserGetPayload<{
  include: {
    bills: true;
  };
}>;

export type BillWithRelationsResponse = Prisma.BillGetPayload<{
  include: {
    assignedTo: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
    billStage: {
      select: {
        id: true;
        label: true;
        colour: true;
      };
    };
  };
}>;

export type UserResponse = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
  };
}>;
