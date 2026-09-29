require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Lost & Found API running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
  });
});
