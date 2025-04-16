const db = require("../../models");
const path = require("path");
const CryptoJS = require("crypto-js");
const crypto = require("crypto");
const { ifError } = require("assert");
const helper = require("../../helper/helper");
const { v4: uuid } = require("uuid");
const { Sequelize } = require("sequelize");
db.notifications.belongsTo(db.users, {
  foreignKey: "sender_id",
  as: "sender_data",
});
db.notifications.belongsTo(db.users, {
  foreignKey: "receiver_id",
  as: "reciever_data",
});
module.exports = {
  notificationadd: async (req, res) => {
    try {
      const find_sender = await db.users.findOne({
        where: {
          id: req.body.sender_id,
        },
        raw: true,
      });

      const find_receiver = await db.users.findOne({
        where: {
          id: req.body.receiver_id,
        },
        raw: true,
      });

      const msg = `${find_sender.name} `;
      let type = 1;

      const notificationCreate = {
        sender_id: req.body.sender_id,
        receiver_id: req.body.receiver_id,
        message: msg,
        type: type,
      };

      const notification = await db.notifications.create(notificationCreate);

      if (find_receiver.is_notification === 1) {
        const Receiver_name = `${find_receiver.name}`;
        const sender_name = `${find_sender.name}`;

        let noti_data = {
          title: "Rantivity",
          message: msg,
          deviceToken: find_receiver.device_token,
          deviceType: find_receiver.device_type,
          Receiver_name: Receiver_name,
          Receiver_image: find_receiver.image,
          type: type,
          senderId: find_sender.id,
          sender_name: sender_name,
          sender_image: find_sender.image,
        };

        helper.sendNotification_android(find_receiver.device_token, noti_data);
      } else {
        console.log("notification is off");
      }
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .send({ error: "An error occurred while sending the notification" });
    }
  },

  notificationlisting: async (req, res) => {
    try {
      const userId = req.user.id;

      const notificationListing = await db.notifications.findAll({
        attributes: {
          include: [
            [
              Sequelize.literal(
                `(SELECT COUNT(*) FROM notifications WHERE notifications.receiver_id = ${userId} AND is_read = 0)`
              ),
              "msg_count",
            ],
          ],
        },
        where: {
          receiver_id: userId,
        },
        include: [
          {
            model: db.users,
            as: "sender_data",
          },
          {
            model: db.users,
            as: "reciever_data",
          },
        ],
        order: [["id", "DESC"]],
      });

      return helper.success(
        res,
        "Notification fetched successfully",
        notificationListing
      );
    } catch (error) {
      console.error(error);
      return helper.error400(
        res,
        "An error occurred while getting notifications"
      );
    }
  },

  notification_readstatus: async (req, res) => {
    try {
      await db.notifications.update(
        { is_read: 1 },
        {
          where: {
            receiver_id: req.user.id,
          },
        }
      );

      const notifications = await db.notifications.findAll({
        where: {
          receiver_id: req.user.id,
        },
        order: [["id", "DESC"]],
      });

      res.json({
        success_message: "Read status changed successfully",
        data: notifications,
      });
    } catch (error) {
      console.error(error, "======================");
      return helper.error400(res, "Error");
    }
  },
};
