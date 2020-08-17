const express = require("express");
const app = express();
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(morgan("dev"));
app.use(cors());

app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`);
});
