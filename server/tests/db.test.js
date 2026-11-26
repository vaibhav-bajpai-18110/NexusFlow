const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
test("should reject connection when MONGODB_URI is missing", async (t) => {
  const originalURI = process.env.MONGODB_URI;
  const originalError = console.error;
  delete process.env.MONGODB_URI;
  console.error = () => {};
  t.after(() => {
    if (originalURI === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = originalURI;
    console.error = originalError;
  });
  await assert.rejects(connectDB(), {
    message: "MONGODB_URI is missing. Please configure it in your .env file."
  });
});
test("should propagate MongoDB connection errors", async (t) => {
  const originalConnect = mongoose.connect;
  const originalURI = process.env.MONGODB_URI;
  const originalError = console.error;
  const connectionError = new Error("MongoDB unavailable");
  process.env.MONGODB_URI = "mongodb://localhost:27017/test";
  mongoose.connect = async () => {
    throw connectionError;
  };
  console.error = () => {};
  t.after(() => {
    mongoose.connect = originalConnect;
    console.error = originalError;
    if (originalURI === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = originalURI;
  });
  await assert.rejects(connectDB(), (error) => error === connectionError);
});
test("should return the Mongoose connection after a successful mocked connection", async (t) => {
  const originalConnect = mongoose.connect;
  const originalURI = process.env.MONGODB_URI;
  const originalLog = console.log;
  process.env.MONGODB_URI = "mongodb://localhost:27017/test";
  mongoose.connect = async () => mongoose;
  console.log = () => {};
  t.after(() => {
    mongoose.connect = originalConnect;
    console.log = originalLog;
    if (originalURI === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = originalURI;
  });
  const result = await connectDB();
  assert.equal(result, mongoose.connection);
});
