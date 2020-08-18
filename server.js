const express = require("express");
const app = express();

const dotenv = require("dotenv");

dotenv.config();

const monk = require("monk");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const cors = require("cors");
const PORT = process.env.PORT;

// authentication import packages

const bcrypt = require("bcrypt");
const jsonwebtoken = require("jsonwebtoken");

// jwt and bcrypt config

const tokenSecretKey = process.env.TOKEN_SECRET;
const saltRounds = 10;

// end jwt and bcrypt config

// start db config

const dbURI = process.env.DB_URI;
const db = monk(dbURI);

db.then(() => {
  console.log("Connected to DB Successfulyy");
});

const todo = db.get("todo");

const user = db.get("user");

// end db config

// start middleware config

app.use(helmet());
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

// rate limiter config

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use(limiter);

// end middleware config

// start routes

app.get("/", (req, res) => {
  // res.send("hello world");
  user.find().then((docs) => res.json(docs));
});

// user registration

app.post("/users/register", (req, res) => {
  const { username, email, password } = req.body;

  let newUser = {
    username,
    email,
  };

  bcrypt.hash(password, saltRounds, (err, result) => {
    if (result) {
      newUser.password = result;

      user
        .insert(newUser)
        .then((user) =>
          res.json({ message: "success", action: "user created" })
        )
        .catch((err) => res.json({ error: err }));
    } else {
      res.sendStatus(500);
    }
  });
});

// get all todo item from database

app.get("/todos", (req, res) => {
  todo
    .find()
    .then((docs) => {
      res.json({ data: docs });
    })
    .catch((err) => res.json({ error: err }));
});

// add todo item to database

app.post("/todos", (req, res) => {
  data = req.body;
  let newTodo = {
    item: data.item,
    completed: data.completed,
    created_at: new Date(),
  };

  todo
    .insert(newTodo)
    .then((doc) => {
      res.json(doc);
    })
    .catch((err) => {
      res.json({ error: err });
    });
});

// get single todo item matching the id

app.get("/todos/:id", (req, res) => {
  let todo_id = req.params.id;

  todo
    .findOne({ _id: todo_id })
    .then((doc) => {
      res.json({ data: doc });
    })
    .catch((err) => {
      res.json({ error: err });
    });
});

// update single todo item matching the id

app.put("/todos/:id", (req, res) => {
  let todo_id = req.params.id;

  if (req.body.item) {
    todo
      .findOneAndUpdate({ _id: todo_id }, { $set: { item: req.body.item } })
      .then((doc) => {
        res.json(doc);
      })
      .catch((err) => res.json({ error: err }));
  }

  if (req.body.completed) {
    todo
      .findOneAndUpdate(
        { _id: todo_id },
        { $set: { completed: req.body.completed } }
      )
      .then((doc) => {
        res.json(doc);
      })
      .catch((err) => res.json({ error: err }));
  }
});

// delete single todo item matching the id

app.delete("/todos/:id", (req, res) => {
  let todo_id = req.params.id;

  todo
    .findOneAndDelete({ _id: todo_id })
    .then((doc) => {
      res.json({ message: "success" });
    })
    .catch((err) => res.json({ error: err }));
});

// end routes

// start server

app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`);
});
