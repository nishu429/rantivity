const path = require("path");
const db = require("../models");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const fs = require("fs");
const apn = require("apn");
const { v4: uuid } = require("uuid");
const fcmfile = require("./rantivity-df896-firebase-adminsdk-5ujz3-1dfe83265c.json");
const { google } = require("googleapis");
const SCOPES = ["https://www.googleapis.com/auth/cloud-platform"];
const push_projectName = "rantivity-df896";

const jwtClient = new google.auth.JWT(
  fcmfile.client_email,
  null,
  fcmfile.private_key,
  SCOPES,
  null
);
module.exports = {
  checksession: async (req, res, next) => {
    if (req.session.user) {
      return next();
    } else {
      return res.redirect("/");
    }
  },

  checkValidation: async (v) => {
    var errorsResponse;
    await v.check().then(function (matched) {
      if (!matched) {
        var valdErrors = v.errors;
        var respErrors = [];
        Object.keys(valdErrors).forEach(function (key) {
          if (valdErrors && valdErrors[key] && valdErrors[key].message) {
            respErrors.push(valdErrors[key].message);
          }
        });
        errorsResponse = respErrors.join(", ");
      }
    });
    return errorsResponse;
  },

  authenticateJWT: async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = authHeader.split(" ")[1];

      jwt.verify(token, "secret@123", async (err, user) => {
        if (err) {
          // return res.sendStatus(403);
          // return error400(res, "Token is required.");
          return res.status(400).json({
            success: true,
            code: 400,
            message: "Token is required.",
            body: {},
          });
        }

        const userInfo = await db.users.findOne({
          where: { id: user.id },
          raw: true,
        });
        if (userInfo.status === 0) {
          return res.status(401).json({
            success: true,
            code: 401,
            message: "user Inactive.",
            body: {},
          });
        }
        if (userInfo) {
          req.user = userInfo;

          next();
        } else {
          // return error403(res, "Authorization is required.");
          return res.status(401).json({
            success: true,
            code: 401,
            message: "Authorization is required.",
            body: {},
          });
        }
      });
    } else {
      return res.status(400).json({
        success: true,
        code: 400,
        message: "Authorization is required.",
        body: {},
      });
    }
  },
  unixTimestamp: function () {
    var time = Date.now();
    var n = time / 1000;
    return (time = Math.floor(n));
  },
  success: function (res, message = "", body = {}) {
    return res.status(200).json({
      success: true,
      code: 200,
      message: message,
      body: body,
    });
  },
  error403: function (res, err) {
    let code =
      typeof err === "object"
        ? err.statusCode
          ? err.statusCode
          : err.code
          ? err.code
          : 403
        : 403;
    let message = typeof err === "object" ? err.message : err;
    res.status(code).json({
      success: false,
      message: message,
      code: code,
      body: {},
    });
  },
  error400: function (res, err) {
    let code =
      typeof err === "object"
        ? err.statusCode
          ? err.statusCode
          : err.code
          ? err.code
          : 400
        : 400;
    let message = typeof err === "object" ? err.message : err;
    res.status(code).json({
      success: false,
      message: message,
      code: code,
      body: {},
    });
  },

  sendNotification_android: async (token, noti_data) => {
    try {
      jwtClient.authorize(async (err, tokens) => {
        if (err) {
          console.log("Error during JWT authorization:", err);
          return;
        }

        const accessToken = tokens.access_token;

        console.log("Access Token:", accessToken);

        const apiUrl = `https://fcm.googleapis.com/v1/projects/${push_projectName}/messages:send`;
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        };

        console.log("Token to send notification:", token);

        const data = {
          message: {
            token: token,

            notification: {
              title: "rantivity ",
              body: noti_data.message,
            },

            data: {
              title: "rantivity",
              body: noti_data.message,
              deviceToken: noti_data.deviceToken,
              deviceType: JSON.stringify(noti_data.deviceType),
              Receiver_name: noti_data.Receiver_name,
              Receiver_image: noti_data.Receiver_image,
              type: JSON.stringify(noti_data.type),
              senderId: JSON.stringify(noti_data.senderId),
              user2_Id: JSON.stringify(noti_data.user2_Id),
              sender_name: noti_data.sender_name,
              sender_image: noti_data.sender_image,
              channel_name: noti_data.channel_name || "",
              video_token: noti_data.video_token || "",
            },
          },
        };

        console.log(
          data,
          apiUrl,
          headers,
          "ddddddddddddddddddddddddddddddddddddddddddd"
        );

        try {
          const response = await axios.post(apiUrl, data, { headers });

          console.log("Push sent successfully:", response.data);
        } catch (error) {
          console.error(
            "Error sending push notification:",
            error.response ? error.response.data : error.data
          );
        }
      });
    } catch (error) {
      console.error("Error in sendNotification_android:", error);
    }
  },

  async fileUpload(files) {
    const file_name_string = files.name;
    const file_name_array = file_name_string.split(".");
    const file_ext = file_name_array[file_name_array.length - 1];

    const letters = "ABCDE1234567890FGHJK1234567890MNPQRSTUXY";
    let result = "";

    while (result.length < 28) {
      const rand_int = Math.floor(Math.random() * 19 + 1);
      const rand_chr = letters[rand_int];
      if (result.substr(-1, 1) !== rand_chr) result += rand_chr;
    }

    const resultExt = `${result}.${file_ext}`;
    result = uuid();
    let name = result + "." + file_ext;
    await files.mv("public/images/" + resultExt, function (err) {
      if (err) throw err;
    });
    return "/" + resultExt;
    // // console.log("🚀  file: file.js:2--1  fileUpload ~ resultExt:", resultExt);
    // await files.mv(`public/images/${folder}${resultExt}`, function (err) {
    //   if (err) {
    //     throw err;
    //   }
    // });

    // return resultExt;
  },
  p8: async (device_token, payload, collapseId) => {
    var options = {
      token: {
        key: path.join(__dirname, "./AuthKey_76AW9XYDLJ.p8"),
        keyId: "76AW9XYDLJ",
        teamId: "UL6P4CWL4N",
      },
      production: false,
    };
    console.log(options, "========");

    var apnProvider = new apn.Provider(options);

    var note = new apn.Notification();

    // note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
    // note.badge = 3;
    if (payload.status == 4) {
      note.sound = "default";
    } else {
      note.sound = "note.aiff";
    }
    //  note.alert = "You have a video call";

    note.alert = payload.notificationTitle;
    // note.payload = {};
    // note.payload = payload
    // note.payload = payload
    note.aps.payload = payload;
    // note.topic = "Cqlsys.live.Nauatili.voip";
    // note.topic = "com.cqlsys.App";
    note.collapseId = collapseId;
    // note.body = {
    //     notification_type: notification_type,
    //     message: message
    // };

    console.log(note);
    // return

    apnProvider.send(note, device_token).then((result) => {
      // see documentation for an explanation of result
      console.log(result);
    });
  },
};
