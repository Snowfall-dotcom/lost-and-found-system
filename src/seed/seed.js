// Populates the database with sample users and reports so the frontend
// team has something to point their screens at right away.
// Run with: npm run seed
require("dotenv").config();
const connectDB = require("../config/db");
const User = require("../models/User");
const Report = require("../models/Report");
const Claim = require("../models/Claim");

async function seed() {
  await connectDB();

  console.log("Clearing existing data...");
  await Promise.all([User.deleteMany({}), Report.deleteMany({}), Claim.deleteMany({})]);

  console.log("Creating users...");
  const [admin, juan, maria, carlos, ana] = await User.create([
    {
      name: "Admin User",
      studentId: "ADMIN-0001",
      email: "admin@nu.edu.ph",
      password: "admin123",
      role: "admin",
      program: "System Administrator",
    },
    {
      name: "Juan Dela Cruz",
      studentId: "2024-12345",
      email: "juan.delacruz@nu.edu.ph",
      password: "password123",
      program: "BS Computer Science",
      year: "3rd Year",
    },
    {
      name: "Maria Santos",
      studentId: "2024-12346",
      email: "maria.santos@nu.edu.ph",
      password: "password123",
      program: "BS Psychology",
      year: "2nd Year",
    },
    {
      name: "Carlos Reyes",
      studentId: "2023-98765",
      email: "carlos.reyes@nu.edu.ph",
      password: "password123",
      program: "BS Information Technology",
      year: "3rd Year",
    },
    {
      name: "Ana Lim",
      studentId: "2022-54321",
      email: "ana.lim@nu.edu.ph",
      password: "password123",
      program: "BS Mechanical Engineering",
      year: "4th Year",
    },
  ]);

  console.log("Creating reports...");
  const wallet = await Report.create({
    type: "found",
    title: "Black Wallet",
    category: "Wallets & Accessories",
    description: "Black leather wallet, contains 3 cards, cash and a student ID (NU). Found near the library seating area.",
    location: "NU Library",
    date: new Date("2026-02-10"),
    photos: [],
    reporterId: juan._id,
    verificationQuestions: ["What is the color of the item?", "What items were inside?", "Where did you last see it?"],
  });

  const phone = await Report.create({
    type: "lost",
    title: "iPhone 13",
    category: "Electronics",
    description: "Lost near the engineering building, blue case with a small crack on the back.",
    location: "Engineering Building",
    date: new Date("2026-02-08"),
    photos: [],
    reporterId: maria._id,
  });

  await Report.create({
    type: "found",
    title: "Water Bottle",
    category: "Others",
    description: "Hydro Flask, navy blue, with a mountain sticker on the side.",
    location: "Cafeteria",
    date: new Date("2026-02-08"),
    photos: [],
    reporterId: carlos._id,
    verificationQuestions: ["What brand is it?", "What color is it?", "Any unique marks?"],
  });

  await Report.create({
    type: "lost",
    title: "ID Lanyard",
    category: "Personal Belongings",
    description: "NU lanyard with student ID attached, blue and white braid pattern.",
    location: "SHS Building",
    date: new Date("2026-02-07"),
    photos: [],
    reporterId: ana._id,
  });

  console.log("Creating a sample pending claim...");
  await Claim.create({
    reportId: wallet._id,
    claimantId: maria._id,
    answers: [
      { question: "What is the color of the item?", answer: "Black" },
      { question: "What items were inside?", answer: "3 cards, cash, and my student ID" },
      { question: "Where did you last see it?", answer: "Library, 2nd Floor" },
    ],
  });

  console.log("\nSeed complete. Sample logins:");
  console.log("  Admin:   admin@nu.edu.ph / admin123");
  console.log("  Student: juan.delacruz@nu.edu.ph / password123");
  console.log("  Student: maria.santos@nu.edu.ph / password123");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
