
const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../src/models/User");

test("should accept valid user data", async () => {
  const user = new User({
    name: "Manya",
    email: "manya@example.com",
    passwordHash: "hashed_password_123"
  });

  await assert.doesNotReject(() => user.validate());
});

test("should reject user without name", async () => {
  const user = new User({
    email: "manya@example.com",
    passwordHash: "hashed_password_123"
  });

  await assert.rejects(() => user.validate());
});

test("should reject name shorter than 2 characters", async () => {
  const user = new User({
    name: "M",
    email: "manya@example.com",
    passwordHash: "hashed_password_123"
  });

  await assert.rejects(() => user.validate());
});

test("should reject invalid email", async () => {
  const user = new User({
    name: "Manya",
    email: "invalid-email",
    passwordHash: "hashed_password_123"
  });

  await assert.rejects(() => user.validate());
});

test("should reject user without password hash", async () => {
  const user = new User({
    name: "Manya",
    email: "manya@example.com"
  });

  await assert.rejects(() => user.validate());
});

test("should reject invalid user role", async () => {
  const user = new User({
    name: "Manya",
    email: "manya@example.com",
    passwordHash: "hashed_password_123",
    role: "superadmin"
  });

  await assert.rejects(() => user.validate());
});

test("should default role to user", () => {
  const user = new User({
    name: "Manya",
    email: "manya@example.com",
    passwordHash: "hashed_password_123"
  });

  assert.equal(user.role, "user");
});

test("should convert email to lowercase", () => {
  const user = new User({
    name: "Manya",
    email: "MANYA@EXAMPLE.COM",
    passwordHash: "hashed_password_123"
  });

  assert.equal(user.email, "manya@example.com");
});
