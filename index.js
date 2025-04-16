var express = require('express');
const helper = require('../helper/helper');
const AuthController = require('../Controller/AuthController');
const UserController = require('../Controller/UserController');
const CmsController = require('../Controller/CmsController');
const ContactusController = require('../Controller/ContactusController');
const SubscriptionController = require('../Controller/SubscriptionController');
const ReportController = require('../Controller/ReportController');
const Curenlifecontroller = require('../Controller/Curenlifecontroller');
const CommunicationController = require('../Controller/CommunicationController');
const AddSubcriptioncontroller = require('../Controller/AddSubcriptioncontroller');
var router = express.Router();

/* GET home page. */
router.get("/", AuthController.login)
router.post("/loginsubmit", AuthController.loginsubmit)
router.get("/adminsignup", AuthController.adminsignup)
router.post("/signupsubmit", AuthController.signupsubmit)
//Authentication
router.use(helper.checksession)
router.get("/editprofile",AuthController .editprofile)
router.post("/updateprofile/:id", AuthController.updateprofile);
router.get('/changepassword', AuthController.changepassword)
router.post('/changepasswordpost', AuthController.changepasswordpost)
router.get("/dashboard", AuthController.dashboard)
router.get('/logout', AuthController.logout)

//users
router.get("/user-listing", UserController.userlisting)
router.get("/user-view/:id", UserController.userview)
router.post("/update_user/:id", UserController.update_user)
router.get("/deleteuser/:id", UserController.deleteuser)
router.post("/statusupdate_user", UserController.statusupdate_user);

//cms
router.get("/privacy-policy",CmsController.privacyPolicy)
router.get("/term-condition",CmsController.termscondition)
router.get("/about-us",CmsController.aboutus)
router.post("/postcms", CmsController.postcms);
router.post("/updatecms/:id", CmsController.updatecms);

//support
router.get("/contact/listing", ContactusController.contactlisting)
router.get("/contact/view/:id", ContactusController.contactview)

//subscription
// router.get("/addsubscription", SubscriptionController.addsubscription)
// router.post("/subscriptionadd", SubscriptionController.subscriptionadd)
router.get("/subscription-listing", SubscriptionController.subscriptionlisting)
router.get("/subscription-view/:id", SubscriptionController.subscriptionview)
// router.get("/edit/subscription/:id", SubscriptionController.editsubscription)
// router.post("/update_subscription/:id", SubscriptionController.update_subscription)
router.get("/deletesubscription/:id", SubscriptionController.deletesubscription)

//addsubscription
 router.get("/addsubscription", AddSubcriptioncontroller.addsubscription)
router.post("/subscriptionadd", AddSubcriptioncontroller.subscriptionadd)
router.get("/addsublisting", AddSubcriptioncontroller.addsublisting)
router.post("/statusupdate_sub", AddSubcriptioncontroller.statusupdate_sub);
 router.get("/edit/addsubscription/:id", AddSubcriptioncontroller.editaddsubscription)
 router.post("/updatesub/:id", AddSubcriptioncontroller.updatesub)
router.get("/addsubscriptionview/:id", AddSubcriptioncontroller.addsubscriptionview)
router.get("/deletesub/:id", AddSubcriptioncontroller.deletesub)
//report
router.get("/report-listing", ReportController.reportlisting)
router.get("/report-view/:id", ReportController.reportview)
router.get("/deletereport/:id", ReportController.deletereport)

//curren life
router.get("/addcurrentlife", Curenlifecontroller.addcurrentlife)
router.post("/currentlifeadd", Curenlifecontroller.currentlifeadd)
router.get("/currentlife-listing", Curenlifecontroller.currentlifelisting)
router.get("/currentlife-view/:id", Curenlifecontroller.currentlifeview)
router.get("/edit/currentlife/:id", Curenlifecontroller.editcurrentlife)
router.post("/update_currentlife/:id", Curenlifecontroller.update_currentlife)
router.get("/deletecurrentlife/:id", Curenlifecontroller.deletecurrentlife)

//communication
router.get("/addcommunication", CommunicationController.addcommunication)
router.post("/communicationadd", CommunicationController.communicationadd)
router.get("/communication-listing", CommunicationController.communicationlisting)
router.get("/communication-view/:id", CommunicationController.communicationview)
router.get("/edit/communication/:id", CommunicationController.editcommunication)
router.post("/update_communication/:id", CommunicationController.update_communication)
router.get("/deletecommunication/:id", CommunicationController.deletecommunication)
module.exports = router;
