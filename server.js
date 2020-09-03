const express = require('express');

const app = express();

const dotenv = require('dotenv');

dotenv.config();

const monk = require('monk');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const cors = require('cors');
const yup = require('yup');

const {PORT} = process.env;

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

db.catch((code) => process.exit(code));



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
  windowMs : 15 * 60 * 1000, // 15 minutes
  max : 100,                 // limit each IP to 100 requests per windowMs
});

app.use(limiter);

// end middleware config

// jwt veryification middleware

const jwtVerify = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];

    jwt.verify(token, tokenSecretKey, (err, authUser) => {
      if (err) {
        return res.sendStatus(403);
      }

      req.user = authUser;

      return next();
    });
  } else {
    res.sendStatus(401);
  }
};

// end jwt verification middleware

// yup - userSchema config

const userRegistrationSchema = yup.object().shape({
  username : yup.string().required(),
  email : yup.string().email().required(),
  password : yup.string().min(8).required(),
  joined_on : yup.date().default(() => { return new Date(); }),
});

const userLoginSchema = yup.object().shape({
  email : yup.string().email().required(),
  password : yup.string().min(8).required(),
});

// end yup - userSchema config

// yup - todoSchema config

const addTodoSchema = yup.object().shape({
  item : yup.string().required(),
  completed : yup.boolean().default(false),
  created_at : yup.date().default(() => { return new Date(); }),
});


const updateTodoSchema = yup.object().shape({
  item: yup.string(),
  completed: yup.boolean(),
})


// end yup - todoSchema config



// start routes

app.get("/", (req, res) => { res.send("hello world"); });

// user registration

app.post("/users/register", (req, res) => {
  const {username, email, password} = req.body;

  const newUser = {
    username,
    email,
    password,
  };

  userRegistrationSchema.validate(newUser)
      .then(() => {
        bcrypt.hash(newUser.password, saltRounds, (err, result) => {
          if (result) {
            newUser.password = result;

            user.insert(newUser)
                .then(
                    () => { res.status(201).json({message : "success"}); })
                .catch(() => { res.status(500).json({error : err}); });
          } else {
            res.sendStatus(500);
          }
        });
      })
      .catch((err) => {
        res.status(422).json({error : err.name, detail : err.errors});
      });
});

// user login

app.post("/users/login", (req, res) => {
  const {email, password} = req.body;

  const newUserLogin = {
    email,
    password
  }

  userLoginSchema.validate(newUserLogin)
    .then(() => {
    
      user.findOne({email})
        .then((foundUser) => {
          bcrypt.compare(password, foundUser.password)
            .then((result) => {
              if(result){
                const accessToken = jwt.sign({id: foundUser._id, username: foundUser.username, email: foundUser.email}, tokenSecretKey, {
                  expiresIn: "1d",
                });

                res.json(accessToken);
              }else{
                res.json({error: "email or password is incorrect"});
              }
            });
        })
        .catch(() => res.json({error: "email or password is incorrect"})); 
    })
    .catch((err) => {
      res.status(422).json({error: err.name, details: err.errors});
    });

});

// get all todo item from database

app.get("/todos", jwtVerify, (req, res) => {
  const userId = req.user.id;


  todo.find({user_id: userId})
      .then((docs) => { res.json({data : docs}); })
      .catch((err) => res.json({error : err}));
});

// add todo item to database

app.post("/todos", jwtVerify, (req, res) => {



  const userId = req.user.id;

  addTodoSchema.validate(req.body)
    .then((validatedTodo) => {
    
      const newTodo = validatedTodo;

      newTodo.user_id = userId;

      todo.insert(newTodo)
        .then((doc) => { res.status(201).json(doc); })
        .catch((err) => { res.json({error: err}); });
    })
    .catch((err) => {
      res.status(422).json({error: err.name, details: err.errors});
    });


});

// get single todo item matching the id

app.get("/todos/:id", jwtVerify, (req, res) => {
  const todoId = req.params.id;

  const userId = req.user.id;



  todo.findOne({_id : todoId, user_id: userId})
      .then((doc) => {
        if (doc === null) {
          res.sendStatus(404);
        }
        res.json({data : doc});
      })
      .catch(() => { res.sendStatus(404); });
});

// update single todo item matching the id

app.put("/todos/:id", jwtVerify, (req, res) => {
  const todoId = req.params.id;

  const userId = req.user.id;


  updateTodoSchema.validate(req.body)
    .then((validatedItem) => {

      todo.findOneAndUpdate({_id: todoId, user_id: userId}, {$set: validatedItem})
        .then((doc) => doc === null ? res.sendStatus(404) : res.sendStatus(204))
        .catch(() => { res.sendStatus(404); })
    })

});

// delete single todo item matching the id

app.delete("/todos/:id", jwtVerify, (req, res) => {
  const todoId = req.params.id;

  const userId = req.user.id;

  todo.findOneAndDelete({_id : todoId, userId})
      .then((doc) => {
        if (doc === null) {
          res.sendStatus(404);
        }

        res.json({message : "success", action : "todo deleted"});
      })
      .catch((err) => res.json({error : err}));
});

// end routes

// start server

app.listen(PORT, () => { console.log(`Server running at port ${PORT}`); });
