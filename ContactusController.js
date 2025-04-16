const db = require("../../models");
const helper = require('../../helper/helper')
const { Validator } = require('node-input-validator');
module.exports = {
    contactus: async (req, res) => {
        try {
           
            let v = new Validator(req.body, {
                phone: "required",
                country_code: "required",
                email: "required",
                message: "required",
                name: "required",
            });
    
            
            let validationerror = await helper.checkValidation(v);
            if (validationerror) {
                return helper.error400(res, validationerror);
            }
    
            req.body.phone_number = `${req.body.country_code}${req.body.phone}`;
    
            req.body.user_id = req.user.id;
    
            let add_support = await db.contact_us.create(req.body);
    
            let contact = await db.contact_us.findOne({
                where: {
                    id: add_support.id
                }
            });
            return helper.success(res, "Contactus mail sent successfully", contact);
    
        } catch (error) {
            console.error("Error:", error);
           return helper.error400(res, "Error")
        }
    },
    
}