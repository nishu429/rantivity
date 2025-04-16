const db = require("../../models");
const helper = require('../../helper/helper')

module.exports = {
    cms: async (req, res) => {
        try {

            let add_data = await db.cms.findOne({
                where: {
                    id: req.query.id
                }, raw: true
            });
            return helper.success(res, "Cms get Successfully", add_data);
        } catch (error) {
            console.log("error", error);
            return helper.error400(res, "Error")
        }
    },


    


}
