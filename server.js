const express = require("express");
const app = express();

const dotenv = require("dotenv");

dotenv.config();

const monk = require("monk");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const PORT = process.env.PORT || 3000;

// start db config

const dbURI = process.env.DB_URI;
const db = monk(dbURI);

db.then(() => {
  console.log("Connected to DB Successfulyy");
});

const todo = db.get("document");

// end db config

// start middleware config

app.use(helmet());
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

// end middleware config

// start routes

app.get("/", (req, res) => {
  res.send("hello world");
});

app.post("/todos", (req, res) => {
  data = req.body;
  console.log(data);
  let newTodo = {
    item: data.item,
    completed: data.completed,
    created_at: new Date(),
  };

  todo
    .insert(newTodo)
    .then((doc) => {
      console.log(doc);
      res.json(doc);
    })
    .catch((err) => {
      console.log(err);
      res.json({ error: err });
    });
});

// end routes

// start server

app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`);
});
