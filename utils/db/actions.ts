import { Crete_Round } from "next/font/google";
import { db } from "./dbConfig";
import { Users, Notifications, Transactions, Reports, Rewards } from "./schema";
import { eq, and, desc, sql } from "drizzle-orm";

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
    const [notification] = await db
      .select()
      .from(Notifications)
      .where(
        and(eq(Notifications.isRead, false), eq(Notifications.userId, userId))
      )
      .execute();
    return notification || [];
  } catch (error) {
    console.error("Error in getUnreadNotification", error);
    return null;
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

    return formattedTransaction;
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
        // @ts-ignore
        userId,
        location,
        wasteType,
        amount,
        imageUrl,
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
