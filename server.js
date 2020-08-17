const express = require("express");
const app = express();

const dotenv = require("dotenv");

dotenv.config();

const monk = require("monk");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const PORT = process.env.PORT || 3000;

const dbURI = process.env.DB_URI;
const db = monk(dbURI);

db.then(() => {
  console.log("Connected to DB Successfulyy");
});

app.use(helmet());
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("hello world");
});

app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`);
});
