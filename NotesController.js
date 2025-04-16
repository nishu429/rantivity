const db = require("../../models");
const helper = require('../../helper/helper')
const { Sequelize } = require('sequelize');
const { Validator } = require('node-input-validator');
module.exports = {
    getnotes: async (req, res) => {
        try {
            let note_listing = await db.notes.findAll({
               
                where:{
                    user_id:req.user.id
                },
                order: [['id', 'DESC']],
                raw: true,

            });
            return helper.success(res, "Notes get Successfully", note_listing);

        } catch (error) {
            console.log("error", error);
          return helper.error400(res, "Error")
        }
    },

    addnote: async (req, res) => {
        try {
            let note = await db.notes.create({
                user_id: req.user.id,
                description: req.body.description
            });
            return helper.success(res, "Note Added Successfully", note);
        } catch (error) {
            console.log("error", error);
            return helper.error400(res, "Error")
        }
    },
    
    deletenote: async (req, res) => {
        try {
            let deck_note = await db.notes.destroy({
                where: {
                    id: req.params.id
                }
            });
  return helper.success(res, "Note Deleted Successfully");
          
           
        } catch (error) {
            console.error("Error occurred:", error);
           return helper.error400(res, "Error")
        }
    },


}