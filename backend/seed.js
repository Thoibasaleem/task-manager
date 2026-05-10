import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from './src/models/User.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ethara-task-manager';
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'Password@123';
const USERS_TO_CREATE = 10;

function randomName() {
  const first = [
    'Amina',
    'Yousef',
    'Layla',
    'Omar',
    'Noor',
    'Salma',
    'Zayd',
    'Huda',
    'Rami',
    'Mariam',
    'Khalid',
    'Sara',
  ];
  const last = [
    'Hassan',
    'Farouk',
    'Rahman',
    'Kareem',
    'Nasser',
    'Mahmoud',
    'Aziz',
    'Saeed',
    'Hamdan',
    'Tariq',
  ];
  return `${first[Math.floor(Math.random() * first.length)]} ${last[Math.floor(Math.random() * last.length)]}`;
}

function randomEmail(index) {
  const stamp = Date.now();
  const rand = Math.floor(Math.random() * 100000);
  return `member${index + 1}_${stamp}_${rand}@ethara.test`;
}

async function seedMembers() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to MongoDB: ${MONGODB_URI}`);

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const docs = Array.from({ length: USERS_TO_CREATE }, (_, i) => ({
    name: randomName(),
    email: randomEmail(i),
    password: passwordHash,
    role: 'Member',
  }));

  const inserted = await User.insertMany(docs);
  console.log(`Inserted ${inserted.length} member users.`);
  console.log(`Default password for all seeded users: ${DEFAULT_PASSWORD}`);
}

seedMembers()
  .catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  });
