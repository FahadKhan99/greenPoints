export type Users = {
  id?: number;
  name: string;
  email: string;

  createdAt: Date;
  updatedAt: Date;
};

export type Reports = {
  id?: number;
  userId: number;
  location: string;
  wasteType: string;
  amount: number;
  imageUrl?: string;
  verificationResult?: string | null | unknown;
  status: string;
  collectorId?: number | null;

  createdAt: Date;
  updatedAt: Date;
};

export type Rewards = {
  id?: number;
  userId: number;
  points: number;
  isAvailable: boolean;
  description: string | null;
  name: string;
  collectorInfo: string;

  createdAt: Date;
  updatedAt: Date;
};

export type CollectedWastes = {
  id?: number;
  reportId: number;
  collectorId: number;
  collectionDate: Date;
  status: string;
};

export type Notifications = {
  id?: number;
  userId: number;
  message: string;
  type: string;
  isRead: boolean;

  createdAt: Date;
  updatedAt: Date;
};

export type Transactions = {
  id?: number;
  userId: number;
  type: string;
  amount: number;
  description: string;
  date: Date;
};
