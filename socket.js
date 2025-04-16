const db = require("../models");
const helper = require("../helper/helper");
const { Validator } = require("node-input-validator");
const { Sequelize, or } = require("sequelize");
const {
  chat_constants,
  messages,
  users,
  socketuser,
  blocked_users,
  call_history,
} = require("../models");
const { Op } = Sequelize;
const database = require("../config/config.json");
const { SELECT } = require("sequelize/lib/query-types");
const RtcTokenBuilder = require("agora-access-token").RtcTokenBuilder;
db.blocked_users.belongsTo(db.users, {
  foreignKey: "block_by_id",
  as: "BlockedByUser",
});
db.blocked_users.belongsTo(db.users, {
  foreignKey: "block_to_id",
  as: "BlockedToUser",
});
module.exports = function (io) {
  io.on("connection", function (socket) {
    console.log("A user connected");

    socket.on("connect_user", async (connect_listener) => {
      try {
        const user = await db.users.findOne({
          where: { id: connect_listener.user_id },
          raw: true,
        });
        console.log(socket.id, "kkkkkkk");

        let response_message;
        if (user) {
          await db.users.update(
            { socket_id: socket.id, onlinestatus: 1 },
            { where: { id: connect_listener.user_id } }
          );
          response_message = { message: "Connected successfully" };
        } else {
          response_message = { message: "User not found" };
        }

        socket.emit("connect_user", response_message);
      } catch (error) {
        console.error("Error in connect_user:", error);
        socket.emit("connect_user", { message: "An error occurred" });
      }
    });

    socket.on("disconnect_user", async (connect_listener) => {
      try {
        let socket_id = socket.id;
        console.log(socket_id, "rdddddddddddddddddddddddddddddddddddddddd");

        let check_user = await db.users.findOne({
          where: {
            id: connect_listener.user_id,
          },
        });
        console.log(check_user, "ddddddd");

        if (check_user) {
          create_socket_user = await db.users.update(
            {
              onlinestatus: 0,
            },
            {
              where: {
                id: connect_listener.user_id,
              },
            }
          );
        }
        success_message = {
          success_message: "Disconnect successfully",
        };
        socket.emit("disconnect_user", success_message);
      } catch (error) {
        throw error;
      }
    });

    // Handle location update event
    socket.on("update_location", async (update_listener) => {
      try {
        const user = await db.users.findOne({
          where: { id: update_listener.user_id },
          raw: true,
        });

        let response_message;
        if (user) {
          await db.users.update(
            {
              location: update_listener.location,
              latitude: update_listener.latitude,
              longitude: update_listener.longitude,
            },
            { where: { id: update_listener.user_id } }
          );
          response_message = { message: "Location updated successfully" };
        } else {
          response_message = { message: "User not found" };
        }

        socket.emit("update_location", response_message);
      } catch (error) {
        console.error("Error in update_location:", error);
        socket.emit("update_location", { message: "An error occurred" });
      }
    });

    // Handle send message event
    socket.on("send_message", async function (get_data) {
      console.log("Received data:", get_data);
      try {
        if (get_data.userid && get_data.user2id) {
          // Fetch the sender's subscription plan
          const sender = await db.users.findOne({
            where: { id: get_data.userid },
            attributes: ["sub_plan"],
            raw: true,
          });

          if (!sender) {
            console.log("Sender not found");
            return;
          }

          const sub_plan = sender.sub_plan; // 1 = Basic, 2 = Premium, 3 = Unlimited
          let message_limit = 0;

          if (sub_plan === 1) message_limit = 25;
          else if (sub_plan === 2) message_limit = 50;
          if (sub_plan !== 3) {
            const message_count = await db.messages.count({
              where: { userid: get_data.userid },
            });

            if (message_count >= message_limit) {
              socket.emit("send_message_listner", {
                success: false,
                code: 400,
                message: `You have reached your message limit of ${message_limit} messages for your subscription plan.`,
                body: {},
              });
              return;
            }
          }
          var user_data = await chat_constants.findOne({
            where: {
              [Op.or]: [
                { userid: get_data.userid, user2id: get_data.user2id },
                { user2id: get_data.userid, userid: get_data.user2id },
              ],
            },
            raw: true,
          });

          if (user_data) {
            create_message = await db.messages.create(
              {
                userid: get_data.userid,
                user2id: get_data.user2id,
                msg_type: get_data.msg_type,
                message: get_data.message,
                constant_id: user_data.id,
                // created: await my_function.create_time_stamp(),
                // updated: await my_function.create_time_stamp(),
              },
              { raw: true }
            );
            update_last_message = await chat_constants.update(
              {
                last_msg_id: create_message.id,
                deleted_id: 0,
              },
              {
                where: {
                  id: user_data.id,
                },
              }
            );

            // ************************Push Notification**********************start*************

            const find_sender = await db.users.findOne({
              where: {
                id: get_data.userid,
              },
              raw: true,
            });

            const find_receiver = await db.users.findOne({
              where: {
                id: get_data.user2id,
              },
              raw: true,
            });

            const msg = `${find_sender.name} sent a messge`;
            const notification_type = 3;

            // Send push notification if receiver has notifications enabled

            if (
              find_receiver.is_notification == 1 &&
              user_data.livestatus == 1
            ) {
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
              console.log("Notifications are disabled for user ID:");
            }
            // ************************Push Notification***************************end********

            const getData = await messages.findOne({
              attributes: {
                include: [
                  [
                    Sequelize.literal(
                      "(SELECT name FROM users WHERE users.id  = messages.userid)"
                    ),
                    "User_Name",
                  ],
                  [
                    Sequelize.literal(
                      "(SELECT image FROM users WHERE users.id  = messages.userid)"
                    ),
                    "User_Image",
                  ],
                  [
                    Sequelize.literal(
                      "(SELECT name FROM users WHERE users.id  = messages.user2id)"
                    ),
                    "Receiver_Name",
                  ],
                  [
                    Sequelize.literal(
                      "(SELECT image FROM users WHERE users.id  = messages.user2id)"
                    ),
                    "Receiver_Image",
                  ],
                  // [sequelize.literal(`IFNULL((SELECT is_block FROM block_user WHERE block_user.block_to  = ${get_data.user2id} OR block_user.block_by = ${get_data.userid}),0)`), 'block_status'],
                ],
              },
              where: {
                id: create_message.id,
              },
              raw: true,
            });
            // console.log(dsf,'----------------');return
            var get_id = await users.findOne({
              where: {
                id: get_data.user2id,
              },
              raw: true,
            });

            let successData = {
              success: true,
              code: 200,
              message: "message send successfully",
              body: getData,
            };
            if (get_id) {
              io.to(get_id.socket_id).emit("send_message_listner", successData);
            }
            socket.emit("send_message_listner", successData);
          } else {
            let create_last_message = await chat_constants.create({
              userid: get_data.userid,
              user2id: get_data.user2id,
              last_msg_id: 0,
            });
            var create_message = await messages.create(
              {
                userid: get_data.userid,
                user2id: get_data.user2id,
                msg_type: get_data.msg_type,
                message: get_data.message,
                constant_id: create_last_message.dataValues.id,
                // created: await my_function.create_time_stamp(),
                // updated: await my_function.create_time_stamp(),
              },
              { raw: true }
            );
            update_last_message = await chat_constants.update(
              {
                last_msg_id: create_message.id,
              },
              {
                where: {
                  id: create_last_message.dataValues.id,
                },
              }
            );

            // ************************Push Notification**********************start*************

            const find_sender = await db.users.findOne({
              where: {
                id: get_data.userid,
              },
              raw: true,
            });

            const find_receiver = await db.users.findOne({
              where: {
                id: get_data.user2id,
              },

              raw: true,
            });

            const msg = `${find_sender.name} sent a messge`;
            const notification_type = 3;

            // Send push notification if receiver has notifications enabled
            if (
              find_receiver.is_notification == 1 &&
              create_last_message.dataValues.livestatus == 1
            ) {
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
              console.log("Notifications are disabled for user ID:");
            }
            // ************************Push Notification***************************end********

            const getData = await messages.findOne({
              attributes: {
                include: [
                  [
                    Sequelize.literal(
                      "(SELECT name FROM users WHERE users.id  = messages.userid)"
                    ),
                    "User_Name",
                  ],
                  [
                    Sequelize.literal(
                      "(SELECT image FROM users WHERE users.id  = messages.userid)"
                    ),
                    "User_Image",
                  ],
                  [
                    Sequelize.literal(
                      "(SELECT name FROM users WHERE users.id  = messages.user2id)"
                    ),
                    "Receiver_Name",
                  ],
                  [
                    Sequelize.literal(
                      "(SELECT image FROM users WHERE users.id  = messages.user2id)"
                    ),
                    "Receiver_Image",
                  ],
                  // [sequelize.literal(`IFNULL((SELECT is_block FROM block_user WHERE block_user.block_to  = ${get_data.user2id} and block_user.block_by = ${get_data.userid}),0)`), 'block_status'],
                ],
              },
              where: {
                id: create_message.id,
              },
              raw: true,
            });

            var get_id = await users.findOne({
              where: {
                id: get_data.user2id,
              },
              raw: true,
            });
            let successData = {
              success: true,
              code: 200,
              message: "message send successfully",
              body: getData,
            };
            if (get_id) {
              io.to(get_id.socket_id).emit("send_message_listner", successData);
            }
            socket.emit("send_message_listner", successData);
          }
        }
      } catch (error) {
        throw error;
      }
    });

    //=============get_message============//
    socket.on("get_message", async (data) => {
      try {
        const findMessages = await messages.findAll({
          attributes: {
            include: [
              [
                Sequelize.literal(
                  "(SELECT name FROM users WHERE users.id = messages.userid)"
                ),
                "User_Name",
              ],
              [
                Sequelize.literal(
                  "(SELECT image FROM users WHERE users.id = messages.userid)"
                ),
                "User_Image",
              ],
              [
                Sequelize.literal(
                  "(SELECT name FROM users WHERE users.id = messages.user2id)"
                ),
                "Receiver_Name",
              ],
              [
                Sequelize.literal(
                  "(SELECT image FROM users WHERE users.id = messages.user2id)"
                ),
                "Receiver_Image",
              ],
              [
                Sequelize.literal(
                  "(SELECT sub_status FROM users WHERE users.id = messages.user2id)"
                ),
                "sub_status",
              ],
              [
                Sequelize.literal(
                  `(SELECT COUNT(*) FROM messages 
                    WHERE 
                      (messages.userid = ${data.userid} AND messages.user2id = ${data.user2id}) 
                      OR 
                      (messages.userid = ${data.user2id} AND messages.user2id = ${data.userid}) 
                      AND 
                      (messages.deleted_id IS NULL OR messages.deleted_id != ${data.userid}))`
                ),
                "message_count",
              ],
            ],
          },
          where: {
            [Op.or]: [
              { userid: data.userid, user2id: data.user2id },
              { userid: data.user2id, user2id: data.userid },
            ],
            [Op.not]: [{ deleted_id: data.userid }],
          },
          raw: true,
        });

        const get_block_status = await db.blocked_users.findOne({
          where: {
            [Op.and]: [
              { block_by_id: data.userid },
              { block_to_id: data.user2id },
            ],
          },
          include: [
            {
              model: db.users,
              as: "BlockedByUser",
              attributes: [[Sequelize.col("name"), "blocked_by"]],
            },
            {
              model: db.users,
              as: "BlockedToUser",
              attributes: [[Sequelize.col("name"), "blocked_to"]],
            },
          ],
        });

        socket.emit("get_message_listner", {
          messages: findMessages,
          blockStatus: get_block_status,
        });
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    });

    //=============get_chat_list==========//

    socket.on("get_chat_list", async (get_data) => {
      try {
        let whereCondition = {
          deleted_id: 0,
          [Op.or]: [{ userid: get_data.userid }, { user2id: get_data.userid }],
          // [Op.and]: [
          //   Sequelize.literal(`
          //     NOT EXISTS (
          //       SELECT 1 FROM likes
          //       WHERE (likes.user_id = chat_constants.userid OR likes.user2_id = chat_constants.user2id)
          //         AND likes.status = 0
          //     )
          //   `)
          // ]
        };

        // Subqueries modified to return a single row with LIMIT 1
        var quer1 = [
          Sequelize.literal(
            `(SELECT name FROM users WHERE users.id=receiver_user_id AND users.id !=${get_data.userid} OR users.id=userid AND  users.id !=${get_data.userid} LIMIT 1)`
          ),
          "receivername",
        ];
        var image = [
          Sequelize.literal(
            "(SELECT image FROM users WHERE users.id=receiver_user_id LIMIT 1)"
          ),
          "receiverimage",
        ];
        var sendername = [
          Sequelize.literal(
            "(SELECT name FROM users WHERE users.id=chat_constants.userid LIMIT 1)"
          ),
          "sendername",
        ];
        var subscriptionstatus = [
          Sequelize.literal(
            "(SELECT sub_status FROM users WHERE users.id=chat_constants.userid LIMIT 1)"
          ),
          "sub_status",
        ];
        var senderimage = [
          Sequelize.literal(
            "(SELECT image FROM users WHERE users.id=chat_constants.userid LIMIT 1)"
          ),
          "senderimage",
        ];
        var msg = [
          Sequelize.literal(
            "(SELECT msg_type FROM messages WHERE messages.userid=chat_constants.userid ORDER BY id DESC LIMIT 1)"
          ),
          "msgtype",
        ];
        var msg_count = [
          Sequelize.literal(
            `(SELECT COUNT(*) FROM messages 
              WHERE (messages.userid = chat_constants.userid AND messages.user2id = chat_constants.user2id) 
                 OR (messages.userid = chat_constants.user2id AND messages.user2id = chat_constants.userid)
            )`
          ),
          "msg_count",
        ];

        // Fetch chat list with additional attributes (name, image, unread_msg)
        let constantList = await db.chat_constants.findAll({
          attributes: {
            include: [
              [
                Sequelize.literal(`
                  CASE 
                      WHEN chat_constants.user2id = ${get_data.userid} 
                      THEN chat_constants.userid 
                      ELSE chat_constants.user2id 
                  END
                `),
                "receiver_user_id",
              ],
              [
                Sequelize.literal(`
                  (SELECT COUNT(*) 
                   FROM messages 
                   WHERE messages.user2id = ${get_data.userid} 
                     AND messages.read_status = 0
                  )
                `),
                "unread_msg",
              ],
              [
                Sequelize.literal(`
                  (SELECT message 
                   FROM messages 
                   WHERE messages.id = chat_constants.last_msg_id 
                   LIMIT 1
                  )
                `),
                "last_msg",
              ],
              quer1,
              image,
              sendername,
              senderimage,
              subscriptionstatus,
              msg,
              msg_count,
            ],
          },
          where: whereCondition,
          order: [["updatedAt", "DESC"]],
          raw: true,
        });

        // Emit success message
        const success_message = {
          success_message: "User Constant Chats List",
          code: 200,
          getdata: constantList,
        };
        socket.emit("get_chat_list", success_message);
      } catch (error) {
        console.log("Error fetching chat list:", error);
        const error_message = {
          error_message: "Failed to get chat list",
          code: 500,
          error: error.message,
        };

        socket.emit("get_chat_list", error_message);
      }
    });

    socket.on("block_data", async (get_data) => {
      try {
        let blockByme = 0;
        let blockByOther = 0;

        const get_block_status = await db.blocked_users.findOne({
          where: {
            [Op.and]: [
              {
                block_by_id: get_data.block_by_id,
              },
              {
                block_to_id: get_data.block_to_id,
              },
            ],
          },
        });

        const get_block_status1 = await db.blocked_users.findOne({
          where: {
            [Op.and]: [
              {
                block_to_id: get_data.block_by_id,
              },
              {
                block_by_id: get_data.block_to_id,
              },
            ],
          },
        });

        if (get_block_status) {
          blockByme = 1;
        }

        if (get_block_status1) {
          blockByOther = 1;
        }

        const success_message = {
          success_message: "Block Status get",
          blockByme: blockByme,
          blockByOther: blockByOther,
        };

        socket.emit("block_data", success_message);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    socket.on("blocked_users", async (data) => {
      try {
        const { block_to_id, block_by_id, status } = data;

        const findblockuser = await db.blocked_users.findOne({
          where: { block_to_id, block_by_id },
        });

        let success_message;
        if (findblockuser) {
          if (status == 1) {
            success_message = { success_message: "Already Blocked by You" };
          } else {
            await db.blocked_users.destroy({
              where: { block_to_id, block_by_id },
            });
            success_message = { success_message: "Unblock user successfully" };
          }
        } else if (status == 1) {
          await db.blocked_users.create({ block_to_id, block_by_id, status });
          success_message = { success_message: "Block user successfully" };
        } else {
          console.log("User not blocked");
          return;
        }

        const data1 = {
          blockByMe: status == 1 ? 1 : 0,
          blockByOther: 0,
        };

        socket.emit("blocked_users", { ...success_message, data: data1 });

        const socketUser = await db.users.findOne({
          where: { id: block_to_id },
        });
        if (socketUser) {
          const data2 = {
            blockByMe: 0,
            blockByOther: status == 1 ? 1 : 0,
          };

          io.to(socketUser.socket_id).emit("blocked_users", {
            ...success_message,
            data: data2,
          });
        }
      } catch (error) {
        console.error(error, ">>>>>>>>>>");
      }
    });
    //=============delete_chat============//
    // socket.on('delete_chat', async (delete_chat) => {
    //   try {

    //     let delete_chat_data = await my_function.delete_msg(delete_chat)
    //     success_message = []
    //     success_message = {
    //       // 'success_message': 'Chat Deleted Successfully'
    //       'success_message': 'Deleted successfully'
    //     }

    //     socket.emit('delete', success_message);

    //   } catch (error) {
    //     throw error
    //   }
    // });
    //=============read_unread============//
    socket.on("read_unread_status", async (read_status) => {
      try {
        console.log(
          read_status.userid,
          read_status.user2id,
          "Received read/unread status event"
        );

        const update_read_status = await db.messages.update(
          { read_status: 1 },
          {
            where: {
              userid: read_status.user2id,
              user2id: read_status.userid,
            },
          }
        );
        console.log(update_read_status, "dddd");

        const success_messages = {
          success_message: "Messages marked as seen",
          update_read_status: update_read_status,
        };

        // Emit back to client with the updated status
        const socketUser = await db.users.findOne({
          where: { id: read_status.userid },
        });
        socket.emit("read_unread_listener", success_messages);
        io.to(socketUser.socket_id).emit(
          "read_unread_listener",
          success_messages
        );
      } catch (error) {
        console.error("Error updating read/unread status:", error);
      }
    });

    socket.on("updatedChat_status", async (get_data) => {
      try {
        const statusupdae = await chat_constants.update(
          {
            livestatus: get_data.livestatus,
          },
          {
            where: {
              id: get_data.constantid,
            },
          }
        );
        const success_message = {
          success_message: "live status updated successfully",
        };

        socket.emit("updatedChat_statusListner", success_message);
      } catch (error) {
        console.error(error);
      }
    });
    socket.on("blocked_feed", async (data) => {
      try {
        const { user_id, post_id, status } = data;
    
        const findblockuser = await db.userfeed_block.findOne({
          where: { user_id, post_id },
        });
    
        let success_message;
    
        if (findblockuser) {
          if (status == 1) {
            success_message = { success_message: "Userfeed post already blocked by you" };
          } else {
            await db.userfeed_block.destroy({ where: { user_id, post_id } });
            success_message = { success_message: "Unblocked userfeed successfully" };
          }
        } else if (status == 1) {
          await db.userfeed_block.create({ user_id, post_id, status });
          success_message = { success_message: "Blocked userfeed successfully" };
        } else {
          console.log("Userfeed not blocked");
          return;
        }

        const updatedBlockList = await db.userfeed_block.findOne(
          { where: { user_id } });
    
        socket.emit("blocked_users", { ...success_message,  updatedBlockList });
    
      } catch (error) {
        console.error("Error in blocked_feed:", error);
      }
    });
    
  });

  io.on("connection", (socket) => {
    socket.on("start_call", async (data) => {
      try {
        const { receiverId, senderId } = data;

        const senderdetail = await db.users.findOne({
          where: { id: senderId },
          raw: true,
        });
        const { sub_plan } = senderdetail;
        const callCount = await db.call_history.count({
          where: {
            sender_id: senderId,
          },
        });

        let calllimit;
        if (sub_plan == 1||0) {
          calllimit = 25;
        } else if (sub_plan == 2||0) {
          calllimit = 50;
        } else if (sub_plan == 3) {
          calllimit = Infinity;
        } else {
          return socket.emit("error", {
            message: "Invalid subscription plan",
          });
        }
        if (callCount >= calllimit) {
          return socket.emit("start_call_listener", {
            success: false,
                code: 400,
                message: `You have reached your video limit for your subscription plan.`,
                body: {},
              });
        }
        // Check if receiver is already on another call
        const busyCall = await db.call_history.findOne({
          where: {
            [Op.or]: [
              { receiver_id: receiverId, status: 1 },
              { sender_id: senderId, status: 1 },
            ],
          },
          raw: true,
        });

        if (busyCall) {
          return socket.emit("start_call_listener", {
            message: "Person is on another call",
          });
        } else {
          // Fetch sender and receiver details
          const receiverDetailObj = await db.users.findOne({
            where: { id: receiverId },
            raw: true,
          });

          const senderDetailObj = await db.users.findOne({
            where: { id: senderId },
            raw: true,
          });

          if (!receiverDetailObj || !senderDetailObj) {
            console.error("Sender or receiver not found in the database");
            return socket.emit("error", {
              message: "Sender or receiver not found",
            });
          }

          // Generate channel name and token
          const appID = "02dcc2d395214df9b92e31166c628e1c";
          const appCertificate = "4721d9c1db6945bd8b613fa4af62c34f";

          function makeid(length) {
            let result = "";
            const characters =
              "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            for (let i = 0; i < length; i++) {
              result += characters.charAt(
                Math.floor(Math.random() * characters.length)
              );
            }
            return result;
          }

          const channelName = makeid(20);
          const uid = 0;
          const expirationTimeInSeconds = 3600;
          const currentTimestamp = Math.floor(Date.now() / 1000);
          const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
          const token = RtcTokenBuilder.buildTokenWithUid(
            appID,
            appCertificate,
            channelName,
            uid,
            privilegeExpiredTs
          );
          await db.call_history.create({
            sender_id: senderId,
            receiver_id: receiverId,
            call_duration: 0,
            status: 1, // 1=connected, 2=accepted, 3=disconnected, 4=missedCall, 0=calling
            video_token: token,
            channel_name: channelName,
          });

          const message = `You have a video call from ${senderDetailObj.name}`;

          io.to(receiverDetailObj.socket_id).emit("start_call_listener", {
            senderId: senderId,
            video_token: token,
            channel_name: channelName,
            receiver_data: receiverDetailObj,
          });

          // Check if notifications are enabled and send notification if they are
          if (receiverDetailObj.is_notification === 1) {
            const notificationData = {
              title: "Rantivity",
              message: `${senderDetailObj.name} on a video call`,
              deviceToken: receiverDetailObj.device_token,
              deviceType: receiverDetailObj.device_type,
              Receiver_name: receiverDetailObj.name,
              Receiver_image: receiverDetailObj.image,
              type: 4,
              senderId: senderDetailObj.id,
              user2_Id: receiverDetailObj.id,
              sender_name: senderDetailObj.name,
              sender_image: senderDetailObj.image,
              channel_name: channelName,
              video_token: token,
              
            };

            await helper.sendNotification_android(
              receiverDetailObj.device_token,
              notificationData
            );
          } else {
            console.log("Notifications are disabled for user ID:", receiverId);
          }
          /////////////////////////////////////////end//////////////////////////////////////
          // Notify the caller about the initiation
          socket.emit("start_call_listener", {
            success: true,
            code: 200,
            message: "video call send successfully",
            body: {    title: "Calling",
              push_type: 5,
              message: message,
              type: data.type,
              senderId: senderId,
              senderName: senderDetailObj.name,
              senderImage: senderDetailObj.image,
              receiverId: receiverId,
              receiverName: receiverDetailObj.name,
              receiverImage: receiverDetailObj.image,
              notification_type: 4,
              status: 1,
              token: token,
              channelname: channelName,
              calllimit: calllimit,},
        
          });
        }
      } catch (error) {
        console.error("Error during video call initiation:", error);
        socket.emit("error", { message: "Error during video call initiation" });
      }
    });
  });

  // ******************* call to status ****************/
  io.on("connection", (socket) => {
    socket.on("call_status", async (data) => {
      try {
        const callingData = await call_history.findOne({
          where: { channel_name: data.channel_name },
          raw: true,
        });

        if (callingData) {
          await call_history.update(
            { status: data.status },
            { where: { channel_name: data.channel_name } }
          );

          let messageText;
          let pushType;
          switch (data.status) {
            case 0:
              messageText = "Calling";
              pushType = 5;
              break;
            case 1:
              messageText = "Connected";
              pushType = 6;
              break;
            case 3:
              messageText = "Disconnected";
              pushType = 7;
              break;
            case 4:
              messageText = "Missed call";
              pushType = 8;
              break;
            case 5:
              messageText = "Declined";
              pushType = 9;
              break;
            default:
              messageText = "Unknown call status";
              pushType = 10;
          }

          // Prepare notification data
          const notification_data = {
            push_type: pushType,
            message: messageText,
            token: data.token || "",
            status: data.status,
            channel_name: data.channel_name || "",
          };

          // Fetch sender and receiver details
          const receiver = await users.findOne({
            where: { id: data.receiverId },
            raw: true,
          });
          const sender = await users.findOne({
            where: { id: data.senderId },
            raw: true,
          });

          // Prepare payload for push notifications
          const payload = {
            title: "rantivity",
            channel_name: data.channel_name,
            senderName: sender?.name,
            senderImage: sender?.image,
            senderId: sender?.id,
            receiverId: receiver?.id,
            receiverName: receiver?.name,
            receiverImage: receiver?.image,
            videoToken: data.token,
            callType: data.callType,
            notificationType: 10,
          };
          ////////////////////////////////////////////start//////////////////////////////////////
          if (data.status == 5) {
            console.log("Call declined. No push notification will be sent.");
          } else {
            // Push notification logic
            const find_sender = await db.users.findOne({
              where: { id: data.senderId },
              raw: true,
            });

            const find_receiver = await db.users.findOne({
              where: { id: data.receiverId },
              raw: true,
            });

            const msg = `${find_sender.name} ${messageText} a call`;
            const notification_type = 5;

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
                channel_name: data.channel_name,
                video_token: data.token,
              };

              await helper.sendNotification_android(
                find_receiver.device_token,
                noti_data
              );
            } else {
              console.log(
                "Notifications are disabled for user ID:",
                data.receiverId
              );
            }
            //////////////////////////////////////////////////end//////////////////////////////////////////////////
            // Update payload based on status
            switch (data.status) {
              case 0:
                payload.title = "You have a new video call";
                payload.message = "Calling";
                payload.messageType = 0;
                payload.status = 0;
                break;
              case 1:
                payload.title = "Call connected";
                payload.message = "Connected";
                payload.messageType = 1;
                payload.status = 1;
                break;
              case 3:
                payload.title = "Call disconnected";
                payload.message = "Disconnected";
                payload.messageType = 3;
                payload.status = 3;
                break;
              case 4:
                payload.title = "You have missed a video call";
                payload.message = "Missed call";
                payload.messageType = 4;
                payload.status = 4;
                break;
              case 5:
                payload.title = "Call declined";
                payload.message = "Declined";
                payload.messageType = 5;
                payload.status = 5;
                break;
              default:
                payload.title = "Unknown call status";
                payload.message = "Status unknown";
                payload.messageType = -1;
                payload.status = -1;
            }

            const collapseId = `${data.senderId}${data.receiverId}`;
            const device_type = receiver?.device_type;
            const device_token = receiver?.device_token;

            console.log(collapseId, "collapseId");
            console.log(device_type, "device_type");
            console.log(device_token, "device_token");

            if (callingData) {
              const get_id = await users.findOne({
                where: { id: data.receiverId },
                raw: true,
              });

              if (get_id && get_id.socket_id) {
                io.to(get_id.socket_id).emit("acceptReject", notification_data);
                socket.emit("acceptReject", notification_data);
              } else {
                console.log("Receiver socket ID not found.");
              }
            }
          }
        }
      } catch (error) {
        console.error("Error in call_status:", error);
      }
    });
  });
};
