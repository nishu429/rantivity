const db = require("../../models");
const helper = require("../../helper/helper");
const { Sequelize } = require("sequelize");
const { Validator } = require("node-input-validator");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const { log } = require("console");
db.user_posts.hasMany(db.post_images, {
  foreignKey: "post_id",
  as: "postimages",
});
db.user_posts.belongsTo(db.users, {
  foreignKey: "user_id",
  as: "userdetail",
});

module.exports = {
  getposts: async (req, res) => {
    try {
      let post_listing = await db.user_posts.findAll({
        attributes: {
          include: [
            [
              Sequelize.literal(
                `IFNULL((SELECT COUNT(*) FROM post_like WHERE post_like.post_id = user_posts.id AND is_like = 1), 0)`
              ),
              "like_count",
            ],
            [
              Sequelize.literal(
                `IFNULL((SELECT COUNT(*) FROM post_comment WHERE post_comment.post_id = user_posts.id), 0)`
              ),
              "comment_count",
            ],
            [
              Sequelize.literal(
                `IFNULL((SELECT is_like FROM post_like WHERE post_like.post_id = user_posts.id AND post_like.user_id = ${req.user.id} LIMIT 1), 0)`
              ),
              "is_like",
            ],
          ],
        },
        where: {
          user_id: req.user.id,
        },
        include: [
          {
            model: db.post_images,
            as: "postimages",
          },
          {
            model: db.users,
            as: "userdetail",
          },
        ],
        order: [["id", "DESC"]],
      });

      // Check if no posts are found
      if (!post_listing || post_listing.length === 0) {
        return helper.success(res, "No posts found", []);
      }
      return helper.success(res, "Posts retrieved successfully", post_listing);
    } catch (error) {
      console.error("Error retrieving posts:", error);
      return helper.error400(res, "Error")
    }
  },

  addpost: async (req, res) => {
    try {
      // Create the post
      let post = await db.user_posts.create({
        user_id: req.user.id,
        comment: req.body.comment,
      });

      const imgData = [];

      // Check if there are any images
      if (req.files?.images) {
        const myimages = Array.isArray(req.files.images)
          ? req.files.images
          : [req.files.images];

        // Loop through images and save them
        for (const imageData of myimages) {
          const imageName = uuidv4() + path.extname(imageData.name);
          const imagePath = `images/${imageName}`;

          // Move the image to the public directory
          await imageData.mv(path.join(__dirname, "../../public", imagePath));

          // Push the image path to the array
          imgData.push(imagePath);
        }
      }

      // Prepare the images data for bulk insert
      const images = imgData.map((data) => ({
        post_id: post.id,
        user_id: req.user.id,
        images: data,
      }));

      if (images.length > 0) {
        await db.post_images.bulkCreate(images);
      }

      // Fetch the inserted images
      let data = await db.post_images.findAll({
        where: { post_id: post.id },
      });

      
      return helper.success(res, "Post Added Successfully", {
        post,
        images: data,
      });
    } catch (error) {
      console.log("error", error);
      return helper.error400(res, "Error")
    }
  },

  updatepost: async (req, res) => {
    try {
      const userId = req.user.id;
      const { comment, postId, delete_id } = req.body;

      
      const [updatedRowsCount] = await db.user_posts.update(
        { comment },
        { where: { id: postId, user_id: userId } }
      );

      if (updatedRowsCount === 0) {
        return helper.error400(res, "Post not found or user not authorized");
      }

     
      if (req.files?.images) {
        
        const currentImages = await db.post_images.findAll({
          where: { post_id: postId, user_id: userId },
          raw: true,
        });

       
        const imgData = [];
        const myimages = Array.isArray(req.files.images)
          ? req.files.images
          : [req.files.images];

        for (const imageData of myimages) {
          const imageName = uuidv4() + path.extname(imageData.name);
          const imagePath = `images/${imageName}`;
          imgData.push(imagePath);
          await imageData.mv(path.join(__dirname, "../../public", imagePath));
        }

       
        const images = imgData.map((data) => ({
          post_id: postId,
          user_id: userId,
          images: data,
        }));

        
        if (images.length > 0) {
          await db.post_images.bulkCreate(images);
        }
      }

      if (delete_id) {
        await db.post_images.destroy({
          where: {
            id: delete_id,
          },
        });
      }

      const updatedUserPost = await db.user_posts.findOne({
        include: [
          {
            model: db.post_images,
            as: "postimages",
          },
        ],
        where: { id: postId, user_id: userId },
      });

      console.log("Post updated successfully");
      return helper.success(res, "Post Updated Successfully", updatedUserPost);
    } catch (error) {
      console.log("Error:", error);
      return helper.error400(res, "Error")
    }
  },

  like_unlike_post: async (req, res) => {
    try {
      let v = new Validator(req.body, {
        post_id: "required",
      });

      let validationError = await helper.checkValidation(v);
      if (validationError) {
        return helper.error400(res, validationError);
      }

      const { post_id } = req.body;
      const user_id = req.user.id;

     
      const existingLike = await db.post_like.findOne({
        where: {
          user_id: user_id,
          post_id: post_id,
        },
      });
      console.log(existingLike, "Existing Like");

      if (existingLike) {
        if (existingLike.is_like == 1) {
    
          await db.post_like.destroy({
            where: {
              user_id: user_id,
              post_id: post_id,
            },
          });
          return helper.success(res, "Post unliked successfully");
        }
      }

    
      const newLike = await db.post_like.create({
        user_id: user_id,
        post_id: post_id,
        is_like: 1,
      });

      /////////////////////////////////Push Notification//////////////////////////////////////////////////////
      const userPost = await db.user_posts.findOne({
        where: { id: post_id },
        raw: true,
      });

      if (!userPost) {
        return helper.error400(res, "Post not found");
      }

      const find_sender = await db.users.findOne({
        where: { id: user_id },
        raw: true,
      });

      if (!find_sender) {
        return helper.error400(res, "Sender user not found");
      }

      const find_receiver = await db.users.findOne({
        where: { id: userPost.user_id },
        raw: true,
      });
      
      console.log(find_receiver, "sfghgfgfgdasfdf");
      // Check if the user is liking their own post
      if (find_sender.id !== find_receiver.id) {
        const msg = `${find_sender.name} liked your post`;
        const notification_type = 12;

        const notificationCreate = {
          sender_id: find_sender.id,
          receiver_id: find_receiver.id,
          message: msg,
          type: notification_type,
        };
        await db.notifications.create(notificationCreate);

        if (find_receiver.is_notification == 1) {
          const noti_data = {
            title: "Rantivity",
            message: msg,
            deviceToken: find_receiver.device_token,
            deviceType: find_receiver.device_type,
            Receiver_name: find_receiver.name,
            Receiver_image: find_receiver.image,
            type: notification_type,
            senderId: find_sender.id,
            user2_Id: find_receiver.id,
            sender_name: find_sender.name,
            sender_image: find_sender.image,
          };
          console.log(
            find_receiver.device_token,
            "dddddddddddddddddddddddddddddddddd"
          );
        

          await helper.sendNotification_android(
            find_receiver.device_token,
            noti_data
          );
        } else {
          console.log(
            "Notifications are disabled for user ID:",
            find_receiver.id
          );
        }
      } else {
        console.log("User liked their own post. No notification sent.");
      }
      ///////////////////////////////Push Notification//////////////////////////////////////////////////////

      return helper.success(res, "Post liked successfully.", newLike);
    } catch (error) {
      console.error("Error in like_unlike_post:", error);
      return helper.error400(res, error.message);
    }
  },

  comment_post: async (req, res) => {
    try {
      // Validate request body
      let v = new Validator(req.body, {
        post_id: "required",
        comment: "required",
      });

      let validationPassed = await v.check();
      if (!validationPassed) {
        const errorsResponse = Object.values(v.errors)
          .map((err) => err.message)
          .join(", ");
        return helper.failed(res, errorsResponse);
      }

      const { post_id, comment } = req.body;
      const user_id1 = req.user.id;

      let data = await db.post_comment.create({
        post_id: post_id,
        user_id: user_id1,
        comment: comment,
      });

      // *************************Push Notification**********************start**************
      const userPost = await db.user_posts.findOne({
        where: { id: post_id },
        raw: true,
      });

      const find_sender = await db.users.findOne({
        where: { id: user_id1 },
        raw: true,
      });
      console.log(find_sender, "fffffffff");

      const find_receiver = await db.users.findOne({
        where: { id: userPost.user_id },
        raw: true,
      });
      console.log(find_receiver, "dddddddddddddd");

      if (find_sender.id !== find_receiver.id) {
        const msg = `${find_sender.name} commented on your post`;
        const notification_type = 14;

        const notificationCreate = {
          sender_id: find_sender.id,
          receiver_id: find_receiver.id,
          message: msg,
          type: notification_type,
        };

        // Save notification to the database
        await db.notifications.create(notificationCreate);

        // Send push notification if receiver has notifications enabled
        if (find_receiver.is_notification == 1) {
          const noti_data = {
            title: "Rantivity",
            message: msg,
            deviceToken: find_receiver.device_token,
            deviceType: find_receiver.device_type,
            Receiver_name: find_receiver.name,
            Receiver_image: find_receiver.image,
            type: notification_type,
            senderId: find_sender.id,
            user2_Id: find_receiver.id,
            sender_name: find_sender.name,
            sender_image: find_sender.image,
          };

          await helper.sendNotification_android(
            find_receiver.device_token,
            noti_data
          );
        } else {
          console.log(
            "Notifications are disabled for user ID:",
            find_receiver.id
          );
        }
      }
      // *************************Push Notification***************************end*********
      return helper.success(res, "Comment Posted successfully.", { data });
    } catch (error) {
      return helper.error400(res, error.message);
    }
  },

  deletepost: async (req, res) => {
    try {
      // Delete post first
      const post_delete = await db.user_posts.destroy({
        where: { id: req.params.id },
      });

      if (post_delete === 0) {
        return res.status(404).send("Post not found");
      }

      await db.post_images.destroy({
        where: { post_id: req.params.id },
      });

      return helper.success(
        res,
        "Post and associated images deleted successfully"
      );
    } catch (error) {
      console.error("Error occurred:", error);
      return helper.error400(res, "Error")
    }
  },
};
