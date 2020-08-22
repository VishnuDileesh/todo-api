const express = require("express");
const app = express();

const dotenv = require("dotenv");

dotenv.config();

const monk = require("monk");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const cors = require("cors");
const yup = require("yup");
const PORT = process.env.PORT;

// authentication import packages

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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

// jwt veryification middleware

const jwtVerify = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];

    jwt.verify(token, tokenSecretKey, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }

      req.user = user;

      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// end jwt verification middleware

// yup - userSchema config

let userSchema = yup.object().shape({
  username: yup.string().required(),
  email: yup.string().email().required(),
  password: yup.string().min(8).required(),
  joined_on: yup.date().default(() => {
    return new Date();
  }),
});

// end yup - userSchema config

// start routes

app.get("/", (req, res) => {
  res.send("hello world");
});

// user registration

app.post("/users/register", (req, res) => {
  const { username, email, password } = req.body;

  let newUser = {
    username,
    email,
    password,
  };

  userSchema
    .validate(newUser)
    .then((validUser) => {
      bcrypt.hash(validUser.password, saltRounds, (err, result) => {
        if (result) {
          validUser.password = result;

          user
            .insert(validUser)
            .then((user) => {
              console.log(user);
              res.json({ message: "success" });
            })
            .catch((err) => {
              res.status(500).json({ error: err });
            });
        } else {
          res.sendStatus(500);
        }
      });
    })
    .catch((err) => {
      res.status(422).json({ error: err.name, detail: err.errors });
    });
});

// user login

app.post("/users/login", (req, res) => {
  const { email, password } = req.body;

  user
    .findOne({ email })
    .then((user) => {
      bcrypt.compare(password, user.password).then((result) => {
        if (result) {
          const accessToken = jwt.sign(
            { id: user._id, email: user.email },
            tokenSecretKey,
            {
              expiresIn: "1d",
            }
          );
          res.json(accessToken);
        } else {
          res.json({ error: "email or password is incorrect" });
        }
      });
    })
    .catch((err) => res.json({ error: "email or password is incorrect" }));
});

// get all todo item from database

app.get("/todos", jwtVerify, (req, res) => {
  const user_id = req.user.id;

  todo
    .find({ user_id })
    .then((docs) => {
      res.json({ data: docs });
    })
    .catch((err) => res.json({ error: err }));
});

// add todo item to database

app.post("/todos", jwtVerify, (req, res) => {
  const { item } = req.body;

  let completed = req.body.completed;

  if (completed === undefined) {
    completed = false;
  }

  const user_id = req.user.id;

  let newTodo = {
    item,
    completed,
    user_id,
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

app.get("/todos/:id", jwtVerify, (req, res) => {
  let todo_id = req.params.id;

  const user_id = req.user.id;

  todo
    .findOne({ _id: todo_id, user_id: user_id })
    .then((doc) => {
      if (doc === null) {
        res.sendStatus(404);
      }
      res.json({ data: doc });
    })
    .catch((err) => {
      res.sendStatus(404);
    });
});

// update single todo item matching the id

app.put("/todos/:id", jwtVerify, (req, res) => {
  const todo_id = req.params.id;

  const user_id = req.user.id;

  if (req.body.item === undefined && req.body.completed === undefined) {
    res.json({ message: "value of item or completed is to be passed" });
  }

  if (req.body.item) {
    todo
      .findOneAndUpdate(
        { _id: todo_id, user_id: user_id },
        { $set: { item: req.body.item } }
      )
      .then((doc) => {
        if (doc === null) {
          res.sendStatus(404);
        }
        res.json(doc);
      })
      .catch((err) => {
        res.sendStatus(404);
      });
  }

  if (req.body.completed) {
    todo
      .findOneAndUpdate(
        { _id: todo_id, user_id: user_id },
        { $set: { completed: req.body.completed } }
      )
      .then((doc) => {
        if (doc === null) {
          res.sendStatus(401);
        }
        res.json(doc);
      })
      .catch((err) => res.json({ error: err }));
  }
});

// delete single todo item matching the id

app.delete("/todos/:id", jwtVerify, (req, res) => {
  const todo_id = req.params.id;

  const user_id = req.user.id;

  todo
    .findOneAndDelete({ _id: todo_id, user_id: user_id })
    .then((doc) => {
      if (doc === null) {
        res.sendStatus(404);
      }

      res.json({ message: "success", action: "todo deleted" });
    })
    .catch((err) => res.json({ error: err }));
});

// end routes

// start server

app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`);
});
