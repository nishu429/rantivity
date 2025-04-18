var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var session = require("express-session");
var logger = require("morgan");
var dotenv = require("dotenv");
const flash = require("connect-flash");
const fileUpload = require("express-fileupload");
const bodyParser = require("body-parser");
var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
dotenv.config();

var port = process.env.PORT || 2001;
var app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
var apiroute = require("./routes/apiroute")(io);

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(flash());
app.use(logger("dev"));
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(
  session({
    secret: "task",
    resave: true,
    saveUninitialized: false,
    cookie: {
      expires: 1800000, // 30 minutes
    },
  })
);
app.use(express.static(path.join(__dirname, "public")));
app.use(fileUpload());
app.use("/api", apiroute);
app.use("/", indexRouter);
app.use("/users", usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});
require("./socket/socket")(io);
http.listen(port, () => {
  console.log(`Rantivity project server started successfully on port ${port}`);
});
//module.exports = app;
