export const appwriteConfig = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT!,
  databaseId: process.env.APPWRITE_DATABASE!,
  usersCollectionId: process.env.APPWRITE_USERS_COLLECTION!,
  filesCollectionId: process.env.APPWRITE_FILES_COLLECTION!,
  bucketId: process.env.NEXT_PUBLIC_APPWRITE_BUCKET!,
  secretKey: process.env.APPWRITE_KEY!,
};
