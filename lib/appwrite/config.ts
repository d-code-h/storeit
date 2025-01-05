export const appwriteConfig = {
  endpoint: process.env.APPWRITE_ENDPOINT!,
  projectId: process.env.APPWRITE_PROJECT!,
  databaseId: process.env.APPWRITE_DATABASE!,
  usersCollectionId: process.env.APPWRITE_USERS_COLLECTION!,
  filesCollectionId: process.env.APPWRITE_FILES_COLLECTION!,
  bucketId: process.env.APPWRITE_BUCKET!,
  secretKey: process.env.APPWRITE_KEY!,
};
