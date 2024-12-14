import { Crete_Round } from "next/font/google";
import { db } from "./dbConfig";
import { Users, Notifications, Transactions, Reports, Rewards } from "./schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { use } from "react";

export const createUser = async (email: string, name: string) => {
  try {
    const [existingUser] = await db
      .select()
      .from(Users)
      .where(eq(Users.email, email))
      .execute();

    if (existingUser) return existingUser;

    const [user] = await db
      .insert(Users)
      .values({ email, name })
      .returning()
      .execute();
    return user;
  } catch (error) {
    console.error("Error creating User", error);
    return null;
  }
};

export const getUserByEmail = async (email: string) => {
  try {
    const [user] = await db
      .select()
      .from(Users)
      .where(eq(Users.email, email))
      .execute();
    return user;
  } catch (error) {
    console.error("Error in getUserByEmail", error);
    return null;
  }
};

export const getUnreadNotification = async (userId: number) => {
  try {
    const notification = await db
      .select()
      .from(Notifications)
      .where(
        and(eq(Notifications.isRead, false), eq(Notifications.userId, userId))
      )
      .execute();
    return notification || [];
  } catch (error) {
    console.error("Error in getUnreadNotification", error);
    return [];
  }
};

// when calling another method put the promise syntax
export const getUserBalance = async (userId: number): Promise<number> => {
  try {
    const transcation = await getRewardTransaction(userId);

    if (!transcation) return 0;

    const userBalance = transcation.reduce((acc, transcation) => {
      return transcation.type.startsWith("earned")
        ? acc + transcation.amount
        : acc - transcation.amount;
    }, 0);

    return Math.max(userBalance, 0);
  } catch (error) {
    console.error("Error in getUserBalance", error);
    return 0;
  }
};

export const getRewardTransaction = async (userId: number) => {
  try {
    const transcations = await db
      .select({
        id: Transactions.id,
        type: Transactions.type,
        amount: Transactions.amount,
        description: Transactions.description,
        date: Transactions.date,
      })
      .from(Transactions)
      .where(eq(Transactions.userId, userId))
      .orderBy(desc(Transactions.date))
      .limit(10)
      .execute();

    const formattedTransaction = transcations.map((transaction) => ({
      ...transaction,
      date: transaction.date.toISOString().split("T")[0],
    }));

    return transcations;
  } catch (error) {
    console.error("Error in getRewardTransaction", error);
    return null;
  }
};

export const markNotificationAsRead = async (notificationId: number) => {
  try {
    await db
      .update(Notifications)
      .set({
        isRead: true,
      })
      .where(eq(Notifications.id, notificationId))
      .execute();
  } catch (error) {
    console.error("Error in markNotificationAsRead", error);
    return null;
  }
};

// here for report page
export const createReport = async (
  userId: number,
  location: string,
  wasteType: string,
  amount: string,
  imageUrl?: string,
  verificationResult?: string
) => {
  try {
    const [report] = await db
      .insert(Reports)
      .values({
        userId,
        location,
        wasteType,
        amount,
        imageUrl: imageUrl || "",
        verificationResult,
        status: "pending",
      })
      .returning()
      .execute();

    const pointsEarned = 10;

    // updateReward points
    await updateRewardPoints(userId, pointsEarned);

    // create transaction
    await createTransaction(
      userId,
      "earned_report",
      pointsEarned,
      "Points earned from reporting waste"
    );

    // create notification
    await createNotification(
      userId,
      `You've earned ${pointsEarned} points for reporting waste`,
      "reward"
    );

    return report;
  } catch (error) {
    console.error("Error in createReport", error);
    return null;
  }
};

export const updateRewardPoints = async (
  userId: number,
  pointsToAdd: number
) => {
  try {
    const [updatedReward] = await db
      .update(Rewards)
      .set({
        points: sql`${Rewards.points} + ${pointsToAdd}`, // perform a sql calculation
      })
      .where(eq(Rewards.userId, userId))
      .returning()
      .execute();

    return updatedReward;
  } catch (error) {
    console.error("Error in updateRewardPoints", error);
    return null;
  }
};

type TransactionsType = "earned_report" | "earned_collect" | "redeemed";

export const createTransaction = async (
  userId: number,
  type: TransactionsType,
  amount: number,
  description: string
) => {
  try {
    const [transaction] = await db
      .insert(Transactions)
      .values({
        userId,
        amount,
        type,
        description,
      })
      .returning()
      .execute();

    return transaction;
  } catch (error) {
    console.error("Error in createTransaction", error);
    return null;
  }
};

export const createNotification = async (
  userId: number,
  message: string,
  type: string
) => {
  try {
    const [notification] = await db
      .insert(Notifications)
      .values({
        userId,
        message,
        type,
        isRead: false,
      })
      .returning()
      .execute();

    return notification;
  } catch (error) {
    console.error("Error in createNotification", error);
    return null;
  }
};

export const getAllReports = async (limit: number = 10) => {
  try {
    const reports = await db
      .select({
        id: Reports.id,
        userId: Reports.userId,
        location: Reports.location,
        wasteType: Reports.wasteType,
        amount: Reports.amount,
        imageUrl: Reports.imageUrl,
        verificationResult: Reports.verificationResult,
        status: Reports.status,
        collectorId: Reports.collectorId,
        createdAt: Reports.createdAt,
        updatedAt: Reports.updatedAt,
      })
      .from(Reports)
      .orderBy(desc(Reports.createdAt))
      .limit(limit)
      .execute();

    return reports;
  } catch (error) {
    console.error("Error in getAllReports", error);
    return [];
  }
};

// for layout page

export const getAvailableRewards = async (userId: number) => {
  try {
    const userTransaction = await getRewardTransaction(userId);

    // Get user's total points
    const userPoints =
      userTransaction?.reduce((total, transaction) => {
        return transaction.type.startsWith("earned")
          ? total + transaction.amount
          : total - transaction.amount;
      }, 0) ?? 0;

    // Get available rewards from the database
    const dbRewards = await db
      .select({
        id: Rewards.id,
        name: Rewards.name,
        cost: Rewards.points,
        description: Rewards.description,
        collectionInfo: Rewards.collectionInfo,
      })
      .from(Rewards)
      .where(eq(Rewards.isAvailable, true))
      .execute();

    // Combine user points and database rewards
    const allRewards = [
      {
        id: 0, // Use a special ID for user's points
        name: "Your Points",
        cost: userPoints,
        description: "Redeem your earned points",
        collectionInfo: "Points earned from reporting and collecting waste",
      },
      ...dbRewards,
    ];

    return userPoints;
  } catch (error) {
    console.error("Error in getAvailableRewards", error);
    return 0.0;
  }
};

// for collect page
export const getWasteCollectionTask = async (limit: number = 20) => {
  try {
    const wasteCollectionTask = await db
      .select({
        id: Reports.id,
        location: Reports.location,
        wasteType: Reports.wasteType,
        amount: Reports.amount,
        status: Reports.status,
        date: Reports.createdAt,
        collectorId: Reports.collectorId,
      })
      .from(Reports)
      .limit(limit)
      .execute();

    return wasteCollectionTask && [];
  } catch (error) {
    console.error("Error in getWasteCollectionTask", error);
    return [];
  }
};

export const updateTaskStatus = async (
  taskId: number,
  newStatus: string,
  userId: number
) => {
  try {
    const [updatedTaskStatus] = await db
      .update(Reports)
      .set({
        status: newStatus,
      })
      .where(eq(Reports.userId, userId))
      .returning()
      .execute();

    return updatedTaskStatus;
  } catch (error) {
    console.error("Error in updateTaskStatus", error);
    return null;
  }
};
