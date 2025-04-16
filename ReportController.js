const db = require("../../models");
const helper = require("../../helper/helper");
const { Sequelize, where } = require("sequelize");
const { Validator } = require("node-input-validator");
const cron = require("node-cron");
db.call_history.belongsTo(db.users, {
  foreignKey: "sender_id",
  as: "senderdetail",
});
db.call_history.belongsTo(db.users, {
  foreignKey: "receiver_id",
  as: "receiverdettail",
});
module.exports = {
  addreport: async (req, res) => {
    try {
      let report = await db.report.create({
        user_id: req.user.id,
        user2_id: req.body.user2_id,
        message: req.body.message,
      });
      return helper.success(res, "Report Added Successfully", report);
    } catch (error) {
      console.log("error", error);
      return helper.error400(res, "Error");
    }
  },

  manage: async (req, res) => {
    try {
      let data = await db.call_history.findOne({
        include: [
          {
            model: db.users,
            as: "senderdetail",
          },
          {
            model: db.users,
            as: "receiverdettail",
          },
        ],
        where: {
          channel_name: req.body.channel_name,
        },
      });
      return helper.success(res, "Channel name get ", data);
    } catch (error) {
      console.log("error", error);
      return helper.error400(res, "Error");
    }
  },

  add_subscription: async (req, res) => {
    try {
      const currentTimestamp = req.body.currenttimestamp
        ? new Date(req.body.currenttimestamp).toISOString()
        : new Date().toISOString();
      
      const endDate = new Date(currentTimestamp);
      endDate.setDate(endDate.getDate() + 30); 
      const formattedEndDate = endDate.toISOString();

      const user_find = await db.users.findOne({
        where: { id: req.user.id },
        raw: true,
      });
      let sub_status = 0;
      if (req.body.sub_plan === 1 || req.body.sub_plan === 2) {
        sub_status = 1;
      }
      await db.users.update(
        {
          start_date: currentTimestamp,
          end_date: formattedEndDate,
          sub_plan: req.body.sub_plan,
          sub_status: 1,
          sub_value: req.body.sub_value,
        },
        { where: { id: req.user.id } }
      );
      const userdata1 = await db.users.findOne({
        where: { id: req.user.id },
      });
  
      return helper.success(res, "Subscription updated successfully", userdata1);
    } catch (error) {
      return helper.error400(res, error.message || "An error occurred", "error");
    }
  },
  
  

  
};
