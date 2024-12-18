import { db } from "./dbConfig";
import {
  Users,
  Notifications,
  Transactions,
  Reports,
  Rewards,
  CollectedWastes,
} from "./schema";
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
    await createOrUpdateReportingReward(userId, pointsEarned);

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

export const createOrUpdateReportingReward = async (
  userId: number,
  pointsToAdd: number
) => {
  // finding the reward related to user

  try {
    const [existingReward] = await db
      .select()
      .from(Rewards)
      .where(eq(Rewards.userId, userId));

    if (!existingReward) {
      // create the reward
      const [newReward] = await db
        .insert(Rewards)
        .values({
          userId,
          name: "Waste Reporting Reward",
          collectionInfo: "Points earned from waste Reporting",
          points: pointsToAdd,
          level: 1,
          isAvailable: true,
        })
        .returning()
        .execute();

      return newReward;
    }

    // perform sql calculation on the existing one

    const [updatedReward] = await db
      .update(Rewards)
      .set({
        points: sql`${Rewards.points} + ${pointsToAdd}`, // perform a sql calculation
      })
      .where(eq(Rewards.userId, existingReward.userId))
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

export const getBalance = async (userId: number) => {
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
        userId: Reports.userId,
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

    return wasteCollectionTask.length > 0 ? wasteCollectionTask : [];
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
      .where(eq(Reports.id, taskId))
      .returning()
      .execute();

    return updatedTaskStatus;
  } catch (error) {
    console.error("Error in updateTaskStatus", error);
    return null;
  }
};

// error fix later
export const saveWasteCollectionReward = async (
  userId: number,
  amount: number
) => {
  try {
    // fetching the existing user reward
    const [existingReward] = await db
      .select()
      .from(Rewards)
      .where(eq(Rewards.userId, userId));

    if (!existingReward) {
      // create the reward
      const [newReward] = await db
        .insert(Rewards)
        .values({
          userId,
          name: "Waste Collection Reward",
          collectionInfo: "Points earned from waste Collections",
          points: amount,
          level: 1,
          isAvailable: true,
        })
        .returning()
        .execute();

      return newReward;
    }

    const [updatedReward] = await db
      .update(Rewards)
      .set({
        points: sql`${Rewards.points} + ${amount}`, // perform a sql calculation
      })
      .where(eq(Rewards.userId, existingReward.userId))
      .returning()
      .execute();

    // making a transaction
    await createTransaction(
      userId,
      "earned_collect",
      amount,
      "Points earned for collecting waste"
    );

    return updatedReward;
  } catch (error) {
    console.error("Error in saveRewards", error);
  }
};

export const saveCollectedWaste = async (
  reportId: number,
  collectorId: number,
  verificationResult: any
) => {
  try {
    const [collectedWaste] = await db
      .insert(CollectedWastes)
      .values({
        reportId,
        collectionDate: new Date(),
        collectorId,
        status: "verified",
      })
      .returning()
      .execute();

    return collectedWaste;
  } catch (error) {
    console.error("Error in saveCollectedWaste", error);
  }
};

// for Rewards page
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
    console.log("all rewards: ", allRewards);

    return allRewards;
  } catch (error) {
    console.error("Error in getAvailableRewards", error);
    return [];
  }
};

export async function redeemReward(userId: number, rewardId: number) {
  try {
    const userReward = (await getOrCreateReward(userId)) as any;

    if (rewardId === 0) {
      // Redeem all points
      const [updatedReward] = await db
        .update(Rewards)
        .set({
          points: 0,
          updatedAt: new Date(),
        })
        .where(eq(Rewards.userId, userId))
        .returning()
        .execute();

      // Create a transaction for this redemption
      await createTransaction(
        userId,
        "redeemed",
        userReward.points,
        `Redeemed all points: ${userReward.points}`
      );

      return updatedReward;
    } else {
      // Existing logic for redeeming specific rewards
      const availableReward = await db
        .select()
        .from(Rewards)
        .where(eq(Rewards.id, rewardId))
        .execute();

      if (
        !userReward ||
        !availableReward[0] ||
        userReward.points < availableReward[0].points
      ) {
        throw new Error("Insufficient points or invalid reward");
      }

      const [updatedReward] = await db
        .update(Rewards)
        .set({
          points: sql`${Rewards.points} - ${availableReward[0].points}`,
          updatedAt: new Date(),
        })
        .where(eq(Rewards.userId, userId))
        .returning()
        .execute();

      // Create a transaction for this redemption
      await createTransaction(
        userId,
        "redeemed",
        availableReward[0].points,
        `Redeemed: ${availableReward[0].name}`
      );

      return updatedReward;
    }
  } catch (error) {
    console.error("Error redeeming reward:", error);
    throw error;
  }
}

export const refreshUserData = async () => {};

// leaderboard ....

export async function getAllRewards() {
  try {
    const rewards = await db
      .select({
        id: Rewards.id,
        userId: Rewards.userId,
        points: Rewards.points,
        level: Rewards.level,
        createdAt: Rewards.createdAt,
        userName: Users.name,
      })
      .from(Rewards)
      .leftJoin(Users, eq(Rewards.userId, Users.id))
      .orderBy(desc(Rewards.points))
      .execute();

    return rewards;
  } catch (error) {
    console.error("Error fetching all rewards:", error);
    return [];
  }
}

// unknown

export async function getOrCreateReward(userId: number) {
  try {
    let [reward] = await db
      .select()
      .from(Rewards)
      .where(eq(Rewards.userId, userId))
      .execute();
    if (!reward) {
      [reward] = await db
        .insert(Rewards)
        .values({
          userId,
          name: "Default Reward",
          collectionInfo: "Default Collection Info",
          points: 0,
          level: 1,
          isAvailable: true,
        })
        .returning()
        .execute();
    }
    return reward;
  } catch (error) {
    console.error("Error getting or creating reward:", error);
    return null;
  }
}

// total points earned by user all the users
export const getTotalPoints = async () => {
  try {
    // get all the rewards
    const allRewards = await db.select().from(Rewards).execute();

    const allPoints = allRewards.reduce((total, reward) => {
      return total + reward.points;
    }, 0);

    return allPoints;
  } catch (error) {
    console.error("Error in getTotalPoints", error);
    return 0;
  }
};

export const getTotalReportCount = async () => {
  try {
    const totalReports = await db.select().from(Reports);

    return totalReports.length;
  } catch (error) {
    console.error("Error in getTotalReportCount", error);
    return 0;
  }
};
