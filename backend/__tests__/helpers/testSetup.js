import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../server.js';

let mongod;

export const connectTestDB = async () => {
  mongod = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' }
  });
  let uri = mongod.getUri();
  if (uri.includes('?')) {
    uri += '&retryWrites=false';
  } else {
    uri += '?retryWrites=false';
  }
  await mongoose.connect(uri);
  // Wait for all indexes to build to prevent catalog write conflicts in transactions
  await Promise.all(
    mongoose.modelNames().map((modelName) => mongoose.model(modelName).ensureIndexes())
  );
};

export const disconnectTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongod) {
    await mongod.stop();
  }
};

export const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

export { app };
