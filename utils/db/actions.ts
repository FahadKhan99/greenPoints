import { db } from "./dbConfig";
import { Users, Notifications, Transactions } from "./schema";
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
