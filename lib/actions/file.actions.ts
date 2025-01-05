'use server';

import { createAdminClient, createSessionClient } from '../appwrite';
import { ID, Models, Query } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import { appwriteConfig } from '../appwrite/config';
import { constructFileUrl, getFileType, parseStringify } from '../utils';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './user.actions';
import { redirect } from 'next/navigation';

// Upload file properties
const handleError = (error: unknown, message: string) => {
  console.error(error, message);
  throw error;
};

// Upload file properties
export const uploadFile = async ({
  file,
  ownerId,
  accountId,
  path,
}: UploadFileProps) => {
  // Create an admin client
  const { storage, databases } = await createAdminClient();

  try {
    // Create an input file from the buffer
    const inputFile = InputFile.fromBuffer(file, file.name);

    // Create a file in the storage
    const bucketFile = await storage.createFile(
      appwriteConfig.bucketId,
      ID.unique(),
      inputFile,
    );

    // Create a document for the file
    const fileDocument = {
      type: getFileType(bucketFile.name).type,
      name: bucketFile.name,
      url: constructFileUrl(bucketFile.$id),
      extension: getFileType(bucketFile.name).extension,
      size: bucketFile.sizeOriginal,
      owner: ownerId,
      accountId,
      users: [],
      bucketFileId: bucketFile.$id,
    };

    // Create a document in the database
    const newFile = await databases
      .createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.filesCollectionId,
        ID.unique(),
        fileDocument,
      )
      .catch(async (error: unknown) => {
        await storage.deleteFile(appwriteConfig.bucketId, bucketFile.$id);
        handleError(error, 'Error creating file document');
      });

    // Revalidate the path
    revalidatePath(path);

    // Return the new file
    return parseStringify(newFile);
  } catch (error) {
    // Handle the error
    handleError(error, 'Error uploading file');
  }
};

// Formulate queries for the files
const createQueries = (
  currentUser: Models.Document,
  types: string[],
  searchText: string,
  sort: string,
  limit?: number,
) => {
  // Create a query for the files
  const queries = [
    Query.or([
      Query.equal('owner', [currentUser.$id]),
      Query.contains('users', [currentUser.email]),
    ]),
  ];

  // Add the types, search text, and limit to the queries
  if (types.length > 0) queries.push(Query.equal('type', types));
  if (searchText) queries.push(Query.contains('name', searchText));
  if (limit) queries.push(Query.limit(limit));

  // Add the sort to the queries
  if (sort) {
    const [sortBy, orderBy] = sort.split('-');

    // Add the sort by and order by to the queries
    queries.push(
      orderBy === 'asc' ? Query.orderAsc(sortBy) : Query.orderDesc(sortBy),
    );
  }

  // Return the queries
  return queries;
};

// Get files properties
export const getFiles = async ({
  types = [],
  searchText = '',
  sort = '$createdAt-desc',
  limit,
}: GetFilesProps) => {
  // Create an admin client
  const { databases } = await createAdminClient();

  try {
    // Get the current user
    const currentUser = await getCurrentUser();

    // Throw an error if the current user is not found
    if (!currentUser) return redirect('/sign-in');

    // Create queries for the files
    const queries = createQueries(currentUser, types, searchText, sort, limit);

    // Get the files from the database
    const files = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      queries,
    );

    // Return the files
    return parseStringify(files);
  } catch (error) {
    // Handle the error
    handleError(error, 'Failed to get files');
  }
};

// Rename file properties
export const renameFile = async ({
  fileId,
  name,
  extension,
  path,
}: RenameFileProps) => {
  // Create an admin client
  const { databases } = await createAdminClient();

  try {
    // Create a new name for the file
    const newName = `${name}.${extension}`;

    // Update the file name
    const updatedFile = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
      {
        name: newName,
      },
    );

    // Revalidate the path
    revalidatePath(path);

    // Return the updated file
    return parseStringify(updatedFile);
  } catch (error) {
    // Handle the error
    handleError(error, 'Failed to rename file');
  }
};

// Update file users properties
export const updateFileUsers = async ({
  fileId,
  emails,
  path,
}: UpdateFileUsersProps) => {
  // Create an admin client
  const { databases } = await createAdminClient();

  try {
    // Update the file users
    const updatedFile = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
      {
        users: emails,
      },
    );

    // Revalidate the path
    revalidatePath(path);

    // Return the updated file
    return parseStringify(updatedFile);
  } catch (error) {
    // Handle the error
    handleError(error, 'Failed to rename file');
  }
};

// Delete file properties
export const deleteFile = async ({
  fileId,
  bucketFileId,
  path,
}: DeleteFileProps) => {
  // Create an admin client
  const { databases, storage } = await createAdminClient();

  try {
    // Delete the file from the database
    const deletedFile = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
    );

    // Delete the file from the storage
    if (deletedFile) {
      await storage.deleteFile(appwriteConfig.bucketId, bucketFileId);
    }

    // Revalidate the path
    revalidatePath(path);

    // Return the deleted file
    return parseStringify({ status: 'success' });
  } catch (error) {
    // Handle the error
    handleError(error, 'Failed to rename file');
  }
};

// Get total space used properties
export async function getTotalSpaceUsed() {
  try {
    // Create a session client
    const { databases } = await createSessionClient();

    // Get the current user
    const currentUser = await getCurrentUser();

    // Throw an error if the current user is not found
    if (!currentUser) throw new Error('User is not authenticated.');

    // Get the files from the database
    const files = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      [Query.equal('owner', [currentUser.$id])],
    );

    // Format the total space used
    const totalSpace = {
      image: { size: 0, latestDate: '' },
      document: { size: 0, latestDate: '' },
      video: { size: 0, latestDate: '' },
      audio: { size: 0, latestDate: '' },
      other: { size: 0, latestDate: '' },
      used: 0,
      all: 2 * 1024 * 1024 * 1024 /* 2GB available bucket storage */,
    };

    // Calculate the total space used
    files.documents.forEach((file) => {
      // Get the file type
      const fileType = file.type as FileType;
      // Add the file size to the total file size
      totalSpace[fileType].size += file.size;
      // Add the file size to the total space used
      totalSpace.used += file.size;

      // Update the latest date
      if (
        !totalSpace[fileType].latestDate ||
        new Date(file.$updatedAt) > new Date(totalSpace[fileType].latestDate)
      ) {
        // Update the latest date
        totalSpace[fileType].latestDate = file.$updatedAt;
      }
    });

    // Return the total space used
    return parseStringify(totalSpace);
  } catch (error) {
    // Handle the error
    handleError(error, 'Error calculating total space used:, ');
  }
}
