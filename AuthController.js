const { Validator } = require("node-input-validator");
const helper = require("../../helper/helper");
const db = require("../../models");
const crypto = require("crypto");
const CryptoJS = require("crypto-js");
const path = require("path");
const jwt = require("jsonwebtoken");
const { where } = require("sequelize");
const nodemailer = require("nodemailer");
const accountSid = "AC9ef6dc632e761bed823efad993421461";
const authToken = "1a5f3175f48eaef7fcc823eb2781f6c3";
const client = require("twilio")(accountSid, authToken);

const secretkey = "secret@123";
const { v4: uuidv4 } = require("uuid");
const { log } = require("console");
const fs = require("fs");
const { Op } = require("sequelize");
const { Sequelize } = require("sequelize");
db.users.hasMany(db.user_lifechallege, {
  foreignKey: "user_id",
});
db.users.hasMany(db.user_prefrences, {
  foreignKey: "user_id",
});
db.users.hasMany(db.user_images, {
  foreignKey: "user_id",
  as: "images",
});
db.user_lifechallege.belongsTo(db.current_life_challenge, {
  foreignKey: "challenge_id",
});
db.user_prefrences.belongsTo(db.communication_preferences, {
  foreignKey: "communication_id",
});
db.likes.belongsTo(db.users, {
  foreignKey: "user2_id",
  as: "userthatlike",
});
db.likes.belongsTo(db.users, {
  foreignKey: "user_id",
  as: "likedbyuser",
});
module.exports = {
  signin: async (req, res) => {
    try {
      const {
        country_code,
        phone,
        email,
        role,
        device_token,
        device_type,
        longitude,
        latitude,
        location,
      } = req.body;

      // Validate that role, device_token, and device_type are provided
      let v = new Validator(req.body, {
        role: "required",
        device_token: "required",
        device_type: "required",
      });

      let validationError = await helper.checkValidation(v);
      if (validationError) {
        return helper.error400(res, validationError);
      }

      // Check if at least one of phone or email is provided
      if (!phone && !email) {
        return helper.error400(res, "Either phone or email is required");
      }

      let data = { role };
      if (phone && country_code) {
        data.phone = phone;
        data.country_code = country_code;
      }
      if (email) {
        data.email = email;
      }

      // Find the user by phone or email
      let user = await db.users.findOne({
        where: data,
        raw: true,
      });

      const otp = Math.floor(1000 + Math.random() * 9000);
      // const otp=1111

      if (user) {
        await db.users.update(
          {
            otp: otp,
            device_token: device_token,
            device_type: device_type,
            login_time: await helper.unixTimestamp(),
          },
          {
            where: {
              id: user.id,
            },
          }
        );

        let data = await db.users.findOne({
          where: { id: user.id },
          raw: true,
          nest: true,
        });

        const token = jwt.sign(
          {
            id: data.id,
            phone_number: data.phone_number,
            email: data.email,
            login_time: data.login_time,
          },
          secretkey
        );

        data.token = token;

        // Send OTP via SMS if phone is provided
        if (phone) {
          await client.messages
            .create({
              body: `${otp} is your one time password (OTP) to login to Rantivity. Please enter OTP to proceed.`,
              from: "Rantivity",
              to: `${country_code}${phone}`,
            })
            .then((message) => console.log(message.sid))
            .catch((error) => {
              if (error.code === 63038) {
                console.error(
                  "Daily message limit exceeded. Please try again later."
                );
              } else {
                console.error("Error sending message:", error);
              }
            });
        }

        // Send OTP via email if email is provided
        if (email) {
          const transport = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
              user: "mailto:kasie@rantivity.com",
              pass: "husx bgyq lvps dpzh",
            },
          });

          const mailOptions = {
            from: "mailto:kasie@rantivity.com",
            to: email,
            subject: "Your OTP for Verification",
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                  <h2 style="color: #007bff;">Your OTP Code</h2>
                  <p>Dear ${email},</p>
                  <p>Here is your One-Time Password (OTP) for verification:</p>
                  <h1 style="text-align: center; color: #007bff; font-size: 2.5em;">${otp}</h1>
                  <p>Please use this OTP to complete your verification process. The OTP is valid for the next 10 minutes.</p>
                  <p>If you did not request this OTP, please ignore this email or contact our support team.</p>
                  <p style="margin-top: 20px;">Best regards,</p>
                  <p style="font-weight: bold;">kasiey</p>
                  <p>Rantivity Team</p>
              </div>
            `,
          };
          await transport.sendMail(mailOptions);
          console.log(`OTP email sent successfully to ${email}`);
        }

        return helper.success(res, "Login successful", data);
      } else {
        // Create a new user if not found
        let phone_number = phone ? country_code + phone : null;

        let newUser = await db.users.create(
          {
            name: "",
            email: email || "",
            gender: "",
            dob: "",
            current_life_challenge: "",
            communication_style: "",
            bio: "",
            socket_id: "",
            phone_number: phone_number || "",
            role: role,
            device_token: device_token,
            device_type: device_type,
            phone: phone || "",
            country_code: country_code || "",
            otp: otp,
            longitude: longitude,
            latitude: latitude,
            location: location,
            sub_value: 0.0,
            login_time: await helper.unixTimestamp(),
            status: 1,
          },
          { raw: true }
        );

        const token = jwt.sign(
          {
            id: newUser.id,
            phone_number: newUser.phone_number,
            email: newUser.email,
            login_time: newUser.login_time,
          },
          secretkey
        );

        let data = await db.users.findOne({
          where: { id: newUser.id },
          raw: true,
          nest: true,
        });

        data.token = token;

        // Send OTP via SMS if phone is provided
        if (phone) {
          await client.messages
            .create({
              body: `${otp} is your one time password (OTP) to login to Rantivity. Please enter OTP to proceed.`,
              from: "Rantivity",
              to: `${country_code}${phone}`,
            })
            .then((message) => console.log(message.sid))
            .catch((error) => {
              if (error.code === 63038) {
                console.error(
                  "Daily message limit exceeded. Please try again later."
                );
              } else {
                console.error("Error sending message:", error);
              }
            });
        }

        // Send OTP via email if email is provided
        if (email) {
          const transport = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
              user: "mailto:kasie@rantivity.com",
              pass: "husx bgyq lvps dpzh",
            },
          });

          const mailOptions = {
            from: "mailto:kasie@rantivity.com",
            to: email,
            subject: "Your OTP for Verification",
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                  <h2 style="color: #007bff;">Your OTP Code</h2>
                  <p>Dear ${email},</p>
                  <p>Here is your One-Time Password (OTP) for verification:</p>
                  <h1 style="text-align: center; color: #007bff; font-size: 2.5em;">${otp}</h1>
                  <p>Please use this OTP to complete your verification process. The OTP is valid for the next 10 minutes.</p>
                  <p>If you did not request this OTP, please ignore this email or contact our support team.</p>
                  <p style="margin-top: 20px;">Best regards,</p>
                  <p style="font-weight: bold;">kasiey</p>
                  <p>Rantivity Team</p>
              </div>
            `,
          };
          await transport.sendMail(mailOptions);
          console.log(`OTP email sent successfully to ${email}`);
        }

        return helper.success(res, "User created successfully", data);
      }
    } catch (error) {
      console.error(error);
      return helper.error400(res, "Error");
    }
  },


  verifyotp: async (req, res) => {
    try {
      let v = new Validator(req.body, {
        otp: "required",
      });

      let validationerror = await helper.checkValidation(v);
      if (validationerror) {
        return res.status(400).json({ error: validationerror });
      }

      // Determine if the user is verifying via phone or email
      let whereClause = {};
      if (req.body.phone) {
        whereClause.phone = req.body.phone;
        if (req.body.country_code) {
          whereClause.country_code = req.body.country_code;
        }
      } else if (req.body.email) {
        whereClause.email = req.body.email;
      } else {
        return helper.error400(res, "Either phone or email must be provided");
      }

      let getuser = await db.users.findOne({
        where: whereClause,
        raw: true,
      });

      if (!getuser) {
        return helper.error400(res, "User not found");
      }

      if (getuser.otp !== req.body.otp) {
        return helper.error400(res, "OTP is Not correct");
      } else {
        await db.users.update(
          {
            otp_verified: 1,
          },
          {
            where: {
              id: getuser.id,
            },
          }
        );

        let getuserdata = await db.users.findOne({
          where: {
            id: getuser.id,
          },
          raw: true,
        });

        return helper.success(res, "OTP verified successfully", getuserdata);
      }
    } catch (error) {
      return helper.error400(res, "Error");
    }
  },

  otpresend: async (req, res) => {
    try {
      let v = new Validator(req.body, {});

      let validationError = await helper.checkValidation(v);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const { phone, email, country_code } = req.body;

      if (!phone && !email) {
        return res
          .status(400)
          .json({ error: "Either phone or email is required" });
      }
      let whereClause = {};
      if (phone) {
        whereClause.phone = phone;
        whereClause.country_code = country_code;
      } else if (email) {
        whereClause.email = email;
      }

      let User = await db.users.findOne({
        where: whereClause,
      });

      if (!User) {
        return helper.error400(res, "User not Found");
      } else {
        const otp = Math.floor(1000 + Math.random() * 9000);
        await db.users.update(
          {
            otp_verified: 0,
            otp: otp,
          },
          {
            where: { id: User.id },
          }
        );

        let updatedUser = await db.users.findOne({
          where: { id: User.id },
        });

        if (phone) {
          // Send OTP via Twilio
          await client.messages
            .create({
              body: `${otp} is your one time password (OTP) to login to Rantivity. Please enter OTP to proceed.`,
              from: "Rantivity",
              to: `${country_code}${phone}`,
            })
            .then((message) => console.log(message.sid))
            .catch((error) => {
              if (error.code === 63038) {
                console.error(
                  "Daily message limit exceeded. Please try again later."
                );
              } else {
                console.error("Error sending message:", error);
              }
            });

          console.log(`OTP sent to phone: ${phone}`);
        } else if (email) {
          // Send OTP via Nodemailer
          const transport = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
              user: "kasie@rantivity.com",
              pass: "husx bgyq lvps dpzh",
            },
          });

          const mailOptions = {
            from: "kasie@rantivity.com",
            to: email,
            subject: "Your OTP for Verification",
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                  <h2 style="color: #007bff;">Your OTP Code</h2>
                  <p>Dear ${User.name || "User"},</p>
                  <p>Here is your One-Time Password (OTP) for verification:</p>
                  <h1 style="text-align: center; color: #007bff; font-size: 2.5em;">${otp}</h1>
                  <p>Please use this OTP to complete your verification process. The OTP is valid for the next 10 minutes.</p>
                  <p>If you did not request this OTP, please ignore this email or contact our support team.</p>
                  <p style="margin-top: 20px;">Best regards,</p>
                  <p style="font-weight: bold;">Kasie</p>
                  <p>Rantivity Team</p>
              </div>
            `,
          };

          await transport.sendMail(mailOptions);
          console.log(`OTP email sent successfully to ${email}`);
        }

        return helper.success(res, "OTP sent successfully", updatedUser);
      }
    } catch (error) {
      console.log(error, "error");
      return helper.error400(res, "Error");
    }
  },

  profileComplete: async (req, res) => {
    try {
      const find_user = await db.users.findOne({ where: { id: req.user.id } });

      if (!find_user) {
        throw new Error("User not found");
      }

      let updatedRowsCount;
      let userdata1;
      const imgData = [];

      const fetchUserData = async () => {
        return await db.users.findOne({
          where: { id: req.user.id },
          raw: true,
          nest: true,
        });
      };

      const checkEmailUnique = async (email) => {
        return await db.users.findOne({ where: { email } });
      };
      const checkPhoneUnique = async (phone) => {
        return await db.users.findOne({ where: { phone } });
      };

      switch (req.body.is_complete) {
        case "2":
          let phoneNumber = req.body.country_code + req.body.phone;

          if (req.body.phone) {
            const phoneExists = await checkPhoneUnique(req.body.phone);
            if (phoneExists) {
              return helper.error400(res, "Phone number already exists");
            }

            updatedRowsCount = await db.users.update(
              {
                phone_number: phoneNumber,
                country_code: req.body.country_code,
                device_type: req.body.device_type,
                device_token: req.body.device_token,
                name: req.body.name,
                is_complete: req.body.is_complete,
                latitude: req.body.latitude,
                longitude: req.body.longitude,
                location: req.body.location,
              },
              { where: { id: find_user.id } }
            );
          }

          if (req.body.email) {
            const emailExists = await checkEmailUnique(req.body.email);
            if (emailExists) {
              return helper.error400(res, "Email already exists");
            }

            updatedRowsCount = await db.users.update(
              {
                email: req.body.email,
                name: req.body.name,
                device_type: req.body.device_type,
                device_token: req.body.device_token,
                is_complete: req.body.is_complete,
                latitude: req.body.latitude,
                longitude: req.body.longitude,
                location: req.body.location,
              },
              { where: { id: find_user.id } }
            );
          }

          break;
        case "3":
          updatedRowsCount = await db.users.update(
            {
              gender: req.body.gender,
              is_complete: req.body.is_complete,
            },
            { where: { id: find_user.id } }
          );
          break;

        case "4":
          updatedRowsCount = await db.users.update(
            {
              dob: req.body.dob,
              is_complete: req.body.is_complete,
            },
            { where: { id: find_user.id } }
          );
          break;

        case "5":
          updatedRowsCount = await db.users.update(
            {
              bio: req.body.bio,
              is_complete: req.body.is_complete,
            },
            { where: { id: find_user.id } }
          );

          const lifeChallenges = req.body.challenge_id.split(",");
          lifeChallenges.map(async (challenge) => {
            let obj = {
              user_id: find_user.id,
              challenge_id: challenge,
            };
            await db.user_lifechallege.create(obj);
          });

          const communication = req.body.communication_id.split(",");
          communication.map(async (communication) => {
            let obj = {
              user_id: find_user.id,
              communication_id: communication,
            };
            await db.user_prefrences.create(obj);
          });
          break;

        case "6":
          let image;
          if (req.files && req.files.image) {
            image = req.files.image.name;
            const uploadDir = path.join(
              __dirname,
              "../../public/images",
              image
            );
            await req.files.image.mv(uploadDir);
          }

          updatedRowsCount = await db.users.update(
            {
              image: image,
              is_complete: req.body.is_complete,
            },
            { where: { id: req.user.id } }
          );

          if (req.files && req.files.images) {
            const myImages = Array.isArray(req.files.images)
              ? req.files.images
              : [req.files.images];
            for (const imageData of myImages) {
              const imageName = uuidv4() + imageData.name;
              const imagePath = path.join(
                __dirname,
                "../../public/images",
                imageName
              );
              imgData.push(imageName);
              await imageData.mv(imagePath);
            }
          }
          break;

        default:
          return helper.error400(res, "Invalid completion step", "error");
      }

      if (updatedRowsCount === 0) {
        throw new Error("User not found");
      }

      const images = imgData.map((data) => ({
        user_id: req.user.id,
        images: data,
      }));
      if (images.length > 0) {
        await db.user_images.bulkCreate(images);
      }

      userdata1 = await fetchUserData();
      const token = jwt.sign(
        {
          id: userdata1.id,
          phone_number: userdata1.phone_number,
          email: userdata1.email,
          login_time: userdata1.login_time,
        },
        secretkey
      );

      userdata1.token = token;

      return helper.success(
        res,
        "Your profile has been updated successfully.",
        userdata1
      );
    } catch (error) {
      return helper.error400(res, error.message || "An error occurred");
    }
  },

  userupdate: async (req, res) => {
    try {
      const idToUpdate = req.user.id;
      const {
        delete_ids,
        name,
        email,
        phone,
        country_code,
        gender,
        dob,
        bio,
        challenge_id,
        communication_id,
        latitude,
        longitude,
        location,
      } = req.body;

      const fullPhoneNumber = country_code + phone;

      let userImage = null;

      if (req.files?.image) {
        const imageData = req.files.image;
        const imageName = uuidv4() + path.extname(imageData.name);
        userImage = `${imageName}`;

        await imageData.mv(
          path.join(__dirname, "../../public/images", userImage)
        );
      }

      const userImages = [];
      if (req.files?.images) {
        const imagesArray = Array.isArray(req.files.images)
          ? req.files.images
          : [req.files.images];
        for (const imageData of imagesArray) {
          const imageName = uuidv4() + path.extname(imageData.name);
          const imagePath = `${imageName}`;

          await imageData.mv(
            path.join(__dirname, "../../public/images", imagePath)
          );

          userImages.push({
            user_id: idToUpdate,
            images: imagePath,
          });
        }
      }

      const existingUser = await db.users.findOne({
        where: { id: idToUpdate },
      });
      if (!existingUser) {
        return helper.error400(res, "User not found");
      }

      const updateData = {
        name,
        email,
        phone,
        phone_number: fullPhoneNumber,
        gender,
        dob,
        bio,
        latitude,
        longitude,
        location,
      };

      if (userImage) {
        updateData.image = userImage;
      } else {
        updateData.images = existingUser.image;
      }

      const [updatedRowsCount] = await db.users.update(updateData, {
        where: { id: idToUpdate },
      });

      if (updatedRowsCount === 0) {
        return helper.error400(res, "User not found");
      }

      if (delete_ids) {
        await db.user_images.destroy({
          where: { id: delete_ids },
        });
      }

      if (userImages.length > 0) {
        await db.user_images.bulkCreate(userImages);
      }

      const lifeChallenges = challenge_id.split(",");
      await db.user_lifechallege.destroy({ where: { user_id: idToUpdate } });
      for (const challenge of lifeChallenges) {
        await db.user_lifechallege.create({
          user_id: idToUpdate,
          challenge_id: challenge,
        });
      }

      const communicationPrefs = communication_id.split(",");
      await db.user_prefrences.destroy({ where: { user_id: idToUpdate } });
      for (const communication of communicationPrefs) {
        await db.user_prefrences.create({
          user_id: idToUpdate,
          communication_id: communication,
        });
      }

      const users_list = await db.users.findOne({
        include: [
          {
            model: db.user_images,
            as: "images",
          },
          {
            model: db.user_lifechallege,
            include: [
              {
                model: db.current_life_challenge,
              },
            ],
          },
          {
            model: db.user_prefrences,
            include: [
              {
                model: db.communication_preferences,
              },
            ],
          },
        ],
        where: { id: idToUpdate },
      });

      console.log("User updated successfully");
      return helper.success(res, "User Updated Successfully", users_list);
    } catch (error) {
      return helper.error400(res, "Error");
    }
  },

  socialLogin: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        email: "required|email",
        social_type: "required",
        social_id: "required",
      });

      const errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) {
        return helper.failed(res, errorsResponse);
      }

      if (!req.body.social_id.trim()) {
        return helper.failed(res, "Social ID cannot be empty.");
      }

      let socialdata = await db.users.findOne({
        where: { email: req.body.email },
      });
      let time = await helper.unixTimestamp();

      if (socialdata && !socialdata.social_id) {
        console.log("Updating user with social_id:", req.body.social_id);
        await db.users.update(
          {
            social_type: req.body.social_type,
            social_id: req.body.social_id,
            device_type: req.body.device_type,
            device_token: req.body.device_token,
            login_time: time,
            otp_verified: 1,
          },
          { where: { id: socialdata.id } }
        );
      } else if (!socialdata) {
        let fileImage = null;
        if (req.files && req.files.image) {
          const extension = path.extname(req.files.image.name);
          fileImage = uuid() + extension;
          req.files.image.mv(
            process.cwd() + "/public/images/" + fileImage,
            (err) => {
              if (err) {
                console.log(err);
              }
            }
          );
        }

        t;
        const createUser = await db.users.create({
          email: req.body.email,
          social_type: req.body.social_type,
          social_id: req.body.social_id,
          device_type: req.body.device_type,
          device_token: req.body.device_token,
          login_time: time,
          role: 1,
          otp_verified: 1,
        });

        socialdata = createUser;
      }

      const userdata = await db.users.findOne({
        where: { id: socialdata.id },
      });

      if (!userdata) {
        return helper.failed(res, "User not found");
      }

      const data = {
        _id: userdata.id,
        email: userdata.email,
        name: userdata.name,
        role: userdata.role,
        login_time: time,
      };

      const token = jwt.sign(
        {
          id: userdata.id,
          email: userdata.email,
          login_time: userdata.login_time,
        },
        "secret@123",
        { expiresIn: "720h" }
      );

      userdata.token = token;

      return helper.success(res, "Login Successfully", userdata);
    } catch (error) {
      return helper.error400(res, error);
    }
  },

  getprofile: async (req, res) => {
    try {
       const matchcount = await db.likes.count({
              where: { user_id: req.user.id, status: 2 },
            });
            const megCount = await db.messages.count({
              where: { userid: req.user.id },
            });
      
            const videoCount = await db.call_history.count({
              where: { sender_id: req.user.id },
            });
            var pending_matchcount = 0;
            var pending_videoCount = 0;
            var pending_megCount = 0;
      
            if (req.user.sub_plan == 1)   {
              pending_matchcount = 50 - matchcount;
              pending_videoCount = 25 - videoCount;
              pending_megCount = 25 - megCount;
            }
      
            if (req.user.sub_plan == 2) {
              pending_matchcount = 100- matchcount;
              pending_videoCount = 50 - videoCount;
              pending_megCount = 50 - megCount;
            }
            if (pending_matchcount == 0 && pending_videoCount == 0 && pending_megCount == 0) {
              await db.users.update(
                { sub_plan: 0 },
                { where: { id: req.user.id } }
              );
            }
      const userId = req.body.id ? req.body.id : req.user.id;
      let user = await db.users.findOne({
        include: [
          {
            model: db.user_lifechallege,
            include: [
              {
                model: db.current_life_challenge,
              },
            ],
          },
          {
            model: db.user_prefrences,
            include: [
              {
                model: db.communication_preferences,
              },
            ],
          },
          {
            model: db.user_images,
            as: "images",
          },
        ],

        where: { id: userId },
      });
      if (!user) {
        return res.status(404).send("User not found");
      }
      // let userstatus = await db.likes.findOne({
      //     where: {
      //         user_id: req.body.id,
      //         user2_id: req.user.id,
      //         status: 1
      //     }
      // });

      // user.is_like = userstatus ? userstatus.status : 0;
      user.setDataValue('pending_matchcount', pending_matchcount);
      user.setDataValue('pending_videoCount', pending_videoCount);
      user.setDataValue('pending_megCount', pending_megCount);
      return helper.success(res, "Profile fetched successfully", user);
    } catch (error) {
      console.log("error", error);
      return helper.error400(res, "Error");
    }
  },

  userDetails: async (req, res) => {
    try {
      const userId = req.body.userId;
      const currentUserId = req.user.id;
      let user = await db.users.findOne({
        include: [
          {
            model: db.user_lifechallege,
            include: [
              {
                model: db.current_life_challenge,
              },
            ],
          },
          {
            model: db.user_prefrences,
            include: [
              {
                model: db.communication_preferences,
              },
            ],
          },
          {
            model: db.user_images,
            as: "images",
          },
        ],
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).send("User not found");
      }

      // Check like status for both directions
      const likeFromUser1 = await db.likes.findOne({
        where: {
          user_id: currentUserId,
          user2_id: userId,
        },
      });

      const likeFromUser2 = await db.likes.findOne({
        where: {
          user_id: userId,
          user2_id: currentUserId,
        },
      });
      let status = 0;

      if (likeFromUser1 && likeFromUser2) {
        status = 3;
      } else if (likeFromUser1) {
        status = 1;
      } else if (likeFromUser2) {
        status = 2;
      }

      // Convert user data to plain object and add additional data
      user = user.toJSON(); // Convert to plain object
      user.likeStatus = status;

      return helper.success(res, "Profile fetched successfully", user);
    } catch (error) {
      console.log("error", error);
      return helper.error400(res, "Error");
    }
  },

  notificationStatus: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        is_notification: "string|required",
      });
      const value = JSON.parse(JSON.stringify(v));
      const errorResponse = await helper.checkValidation(v);
      if (errorResponse) {
        return helper.error400(res, errorResponse);
      }
      await db.users.update(
        { is_notification: req.body.is_notification },
        { where: { id: req.user.id } }
      );

      let detail_user = await db.users.findOne({ where: { id: req.user.id } });
      return helper.success(
        res,
        "Notification Status Updated Successfully",
        detail_user
      );
    } catch (error) {
      console.log(error, "error");
      return helper.error400(res, "Error");
    }
  },

  getlifechallenge: async (req, res) => {
    try {
      let note_listing = await db.current_life_challenge.findAll({
        order: [["id", "DESC"]],
        raw: true,
      });
      return helper.success(
        res,
        "Lifechallenge get Successfully",
        note_listing
      );
    } catch (error) {
      console.log("error", error);
      return helper.error400(res, "Error");
    }
  },

  getcommunication: async (req, res) => {
    try {
      let com_listing = await db.communication_preferences.findAll({
        order: [["id", "DESC"]],
        raw: true,
      });
      return helper.success(res, "Preferences get Successfully", com_listing);
    } catch (error) {
      console.log("error", error);
      return helper.error400(res, "Error");
    }
  },

  logout: async (req, res) => {
    try {
      const updatedRows = await db.users.update(
        {
          login_time: 0,
          device_token: "",
          device_type: 0,
        },
        {
          where: {
            id: req.user.id,
          },
        }
      );

      return helper.success(res, "Logout Successfully", {});
    } catch (error) {
      console.log(error, "error");
      return helper.error400(res, "Error");
    }
  },


  deleteaccount: async (req, res) => {
    try {
      const userid = req.user.id;
  
      let user = await db.users.findOne({
        where: { id: userid },
      });
  
      if (!user) {
        return helper.error400(res, "User not found");
      }
      await db.users.update({
        deletedAt: new Date()
      }, 
        {
          where:
            { id: userid }
        }
      );
      return helper.success(res, "Account deleted successfully");
    } catch (error) {
      return helper.error400(res,  "An error occurred.");
    }
  }
};
