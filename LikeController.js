const db = require("../../models");
const { Op } = require("sequelize");
const helper = require("../../helper/helper");
const { Validator } = require("node-input-validator");
db.likes.belongsTo(db.users, {
  foreignKey: "user2_id",
  as: "likedUser",
});

module.exports = {
  user_like: async (req, res) => {
    try {
      const { user2_id, status } = req.body;
      const user_id = req.user.id;
  
      const currentuser = await db.users.findOne({
        where: { id: user_id },
        raw: true,
      });
      const { sub_plan } = currentuser;
  
      let matches = 0;
      if (sub_plan == 1) matches = 50;
      else if (sub_plan == 2) matches = 100;
      else if (sub_plan == 3) matches = Infinity;
  
      const matchcount = await db.likes.count({
        where: { user_id, status: 2 },
      });
  
      if (matchcount >= matches && matches !== Infinity) {
        return helper.error400(res,"You have reached your match limit based on your subscription plan." );
      }
      const existingLike = await db.likes.findOne({
        where: { user_id, user2_id },
        raw: true,
      });
  
      if (!existingLike) {
        let userLike = await db.likes.create({
          user_id,
          user2_id,
          status,
        });
  
        let matchStatus = 1;
  
        if (status == 1) {
          const userData2 = await db.likes.findOne({
            where: {
              user_id: user2_id,
              user2_id: user_id,
              status: 1,
            },
            raw: true,
          });
  
          if (userData2) {
            userData2.status = 2;
            userLike.status = 2;
            matchStatus = 2;
  
            await db.likes.update(
              { status: 2 },
              { where: { id: userData2.id } }
            );
  
            await db.chat_constants.update(
              { deleted_id: 0 },
              {
                where: {
                  [Op.or]: [
                    { userid: user2_id, user2id: user_id },
                    { userid: user_id, user2id: user2_id },
                  ],
                },
              }
            );
  
            const find_sender = await db.users.findOne({
              where: { id: user_id },
              raw: true,
            });
  
            const find_receiver = await db.users.findOne({
              where: { id: user2_id },
              raw: true,
            });
  
            const msg = `${find_sender.name} liked you`;
            const notification_type = 1;
  
            const notificationCreate = {
              sender_id: req.user.id,
              receiver_id: user2_id,
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
                type: 2,
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
              console.log("Notifications are disabled for user ID:", user2_id);
            }
            await userLike.save();
          } else {
            const find_sender = await db.users.findOne({
              where: { id: user_id },
              raw: true,
            });
  
            const find_receiver = await db.users.findOne({
              where: { id: user2_id },
              raw: true,
            });
  
            const msg = `${find_sender.name} liked you`;
            const notification_type = 1;
  
            const notificationCreate = {
              sender_id: req.user.id,
              receiver_id: user2_id,
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
                type: 1,
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
              console.log("Notifications are disabled for user ID:", user2_id);
            }
            userLike.match = 1;
            await userLike.save();
          }
        }
        return helper.success(res, "You liked this User", {
          userLike,
          match: matchStatus,
        });
      } else {
        return helper.error400(res, "You have already liked this user.");
      }
    } catch (error) {
      console.error("Error in user_like function:", error);
      return helper.error400(res, "An error occurred while liking the user.");
    }
  },
  

  my_matches: async (req, res) => {
    try {
      console.log(req.user.id);

      // Fetch the users the current user has liked
      const likedUsers = await db.likes.findAll({
        where: {
          user_id: req.user.id,
          status: 2,
        },
        include: [
          {
            model: db.users,
            as: "likedUser",
          },
        ],
      });

      return helper.success(res, "Here are your matched users", likedUsers);
    } catch (error) {
      console.error(error);
      return helper.error400(res, "An error occurred while fetching matches");
    }
  },
unmatch: (io) => {
    return async (req, res) => {
      try {
        const userId = req.user.id;

        const likedUserId = req.body.user2_id;

        const likeEntry = await db.likes.findOne({
          where: {
            user_id: userId,
            user2_id: likedUserId,
            status: 2,
          },
        });

        const likeEntry2 = await db.likes.findOne({
          where: {
            user_id: likedUserId,
            user2_id: userId,
            status: 2,
          },
        });
        if (likeEntry) {
          await db.likes.destroy({ where: { id: likeEntry.id } });
        }
        if (likeEntry2) {
          await db.likes.destroy({ where: { id: likeEntry2.id } });
        }

        await db.chat_constants.update(
          {
            deleted_id: 1,
          },
          {
            where: {
              [Op.or]: [
                { userid: userId, user2id: likedUserId },
                { userid: likedUserId, user2id: userId },
              ],
            },
          }
        );

        getuser = await db.users.findOne({
          where: {
            id: likedUserId,
          },
          raw: true,
        });

        io.to(getuser?.socket_id).emit("unmatch_user", { status: 0 });
        return helper.success(res, "User has been unmatched successfully", {});
      } catch (error) {
        console.error(error);

        return helper.error400(
          res,
          "An error occurred while unmatching the user"
        );
      }
    };
  },
};
