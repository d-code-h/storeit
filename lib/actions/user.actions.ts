'use server';

// Import the required modules
import { createAdminClient, createSessionClient } from '../appwrite';
import { appwriteConfig } from '../appwrite/config';
import { Query, ID } from 'node-appwrite';
import { parseStringify } from '@/lib/utils';
import { cookies } from 'next/headers';
import { avatarPlaceholderUrl } from '@/constants';
import { redirect } from 'next/navigation';

// Verify if email is already in use
const getUserByEmail = async (email: string) => {
  // Create a new Appwrite client
  const { databases } = await createAdminClient();

  // Get the user by email
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [Query.equal('email', [email])],
  );

  // Return the user if found
  return result.total > 0 ? result.documents[0] : null;
};

// Handle errors
const handleError = (error: unknown, message: string) => {
  console.error(error, message);

  // If the error is a string, throw a new error
  throw error;
};

// Send email OTP
export const sendEmailOTP = async ({ email }: { email: string }) => {
  // Create a new Appwrite client
  const { account } = await createAdminClient();

  try {
    // Send the email OTP
    const session = await account.createEmailToken(ID.unique(), email);

    // return the session
    return session.userId;
  } catch (error) {
    // Handle the error
    handleError(error, 'Failed to send email OTP');
  }
};

// Create an account
export const createAccount = async ({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) => {
  // Check if the user already exists
  const existingUser = await getUserByEmail(email);

  if (!existingUser) {
    // Send OTP if user does not exist
    const accountId = await sendEmailOTP({ email });

    if (!accountId) throw new Error('Failed to send email OTP');

    // Create a new Appwrite client
    const { databases } = await createAdminClient();

    // Create a new user
    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      ID.unique(),
      {
        fullName,
        email,
        avatar: avatarPlaceholderUrl,
        accountId,
      },
    );

    // Return the account ID
    return parseStringify({ accountId });
  }
  return parseStringify({
    accountId: null,
    error: 'A user with this credential already exist. Try signing in.',
  });
};

// Verify the email OTP
export const verifySecret = async ({
  accountId,
  password,
}: {
  accountId: string;
  password: string;
}) => {
  try {
    // Create a new Appwrite client
    const { account } = await createAdminClient();

    // Create a new session
    const session = await account.createSession(accountId, password);

    // Set the session cookie
    (await cookies()).set('appwrite-session', session.secret, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
    });

    // Return the session ID
    return parseStringify({ sessionId: session.$id });
  } catch (error) {
    // Handle the error
    handleError(error, 'Failed to verify email OTP');
  }
};

// Get the current user
export const getCurrentUser = async () => {
  try {
    // Create a new Appwrite client
    const { databases, account } = await createSessionClient();

    // Get the current account
    const result = await account.get();

    // Get the user by account ID
    const user = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.equal('accountId', [result.$id])],
    );

    // If the user is not found, return null
    if (user.total <= 0) return null;

    // Return the user
    return parseStringify(user.documents[0]);
  } catch (error) {
    // Handle the error
    handleError(error, 'Failed to get current user');
  }
};

// Sign out the user
export const signOutUser = async () => {
  // Create a new Appwrite client
  const { account } = await createSessionClient();

  try {
    // Delete the current session
    await account.deleteSession('current');
    // Delete the session cookie
    (await cookies()).delete('appwrite-session');
  } catch (error) {
    // Handle the error
    handleError(error, 'Failed to sign out user');
  } finally {
    // Redirect to the sign-in page
    redirect('/sign-in');
  }
};

// Sign in the user
export const signInUser = async ({ email }: { email: string }) => {
  try {
    // Check if the user already exists
    const existingUser = await getUserByEmail(email);

    // If the user already exists, send an email OTP
    if (existingUser) {
      await sendEmailOTP({ email });

      // Return the account ID
      return parseStringify({ accountId: existingUser.accountId });
    }

    // If the user does not exist, return an error
    return parseStringify({ accountId: null, error: 'User not found' });
  } catch (error) {
    // Handle the error
    handleError(error, 'Failed to sign in user');
  }
};
