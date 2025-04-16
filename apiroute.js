var express = require("express");
const authenticateJWT = require("../helper/helper").authenticateJWT;
const AuthController = require("../Controller/Api/AuthController");
const CmsController = require("../Controller/Api/CmsController");
const ContactusController = require("../Controller/Api/ContactusController");
const NotesController = require("../Controller/Api/NotesController");
const LikeController = require("../Controller/Api/LikeController");
const PostController = require("../Controller/Api/PostController");
const ReportController = require("../Controller/Api/ReportController");
const FilterController = require("../Controller/Api/FilterController");
const UserController = require("../Controller/Api/UserController");
const NotificationController = require("../Controller/Api/NotificationController");

var router = express.Router();
module.exports = (io) => {
  router.post("/signin", AuthController.signin);
  router.post("/verifyotp", AuthController.verifyotp);
  router.post("/otpresend", AuthController.otpresend);
  router.get("/cms", CmsController.cms);
  router.post("/socialLogin", AuthController.socialLogin);

  router.use(authenticateJWT);
  router.post("/getprofile", AuthController.getprofile);
  router.post("/profileComplete", AuthController.profileComplete);
  router.post("/contactus", ContactusController.contactus);
  router.post("/notificationStatus", AuthController.notificationStatus);
  router.post("/userupdate", AuthController.userupdate);
  router.post("/addnote", NotesController.addnote);
  router.get("/getnotes", NotesController.getnotes);
  router.post("/user_like", LikeController.user_like);
  router.get("/my_matches", LikeController.my_matches);
  router.post("/addpost", PostController.addpost);
  router.get("/getposts", PostController.getposts);
  router.post("/updatepost", PostController.updatepost);
  router.post("/addreport", ReportController.addreport);
  router.post("/manage", ReportController.manage);
  router.get("/deletenote/:id", NotesController.deletenote);
  router.get("/getlifechallenge", AuthController.getlifechallenge);
  router.get("/filterdata", FilterController.filterdata);
  router.post("/like_unlike_post", PostController.like_unlike_post);
  router.post("/comment_post", PostController.comment_post);
  router.get("/getcommunication", AuthController.getcommunication);
  router.get("/getuser", UserController.getuser);
  router.get("/notificationList", NotificationController.notificationlisting);
  router.post( "/notification_readstatus", NotificationController.notification_readstatus);
  router.get("/deletepost/:id", PostController.deletepost);
  router.post("/userDetails", AuthController.userDetails);
  router.get("/userfeed", UserController.userfeed);
  router.get("/userfeedblock",UserController.userfeedblock)
  router.post("/add_comment", UserController.add_comment);
  router.post("/get_comment", UserController.get_comment);
  router.post("/fileUpload", UserController.fileUpload);
  router.post("/updateLocation", UserController.updateLocation);
  router.post("/add_subscription", ReportController.add_subscription);
  router.post("/unmatch", LikeController.unmatch(io));
  router.post("/logout", AuthController.logout);
  router.post("/deleteaccount",AuthController.deleteaccount)

  return router;
};
