'use server';

import { Account, Avatars, Client, Databases, Storage } from 'node-appwrite';
import { appwriteConfig } from './config';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const createSessionClient = async () => {
  // Create a new Appwrite client
  const client = new Client();

  // Set the Appwrite endpoint and project ID
  client
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId);

  // Set the session ID
  const session = (await cookies()).get('appwrite-session');

  if (!session || !session?.value) return redirect('/sign-in');
  // if (!session || !session?.value) throw new Error('No session found');

  // Set the session ID
  client.setSession(session.value);

  return {
    // Return the account and databases services
    get account() {
      return new Account(client);
    },

    get databases() {
      return new Databases(client);
    },
  };
};

export const createAdminClient = async () => {
  // Create a new Appwrite client
  const client = new Client();

  // Set the Appwrite endpoint and project ID
  client
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId)
    .setKey(appwriteConfig.secretKey);

  return {
    // Return the account, databases, and storage services
    get account() {
      return new Account(client);
    },

    get databases() {
      return new Databases(client);
    },

    get storage() {
      return new Storage(client);
    },
    get avatars() {
      return new Avatars(client);
    },
  };
};
