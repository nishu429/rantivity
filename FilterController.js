const db = require("../../models");
const helper = require('../../helper/helper')
const { Sequelize } = require('sequelize');
const { Validator } = require('node-input-validator');
const { Op } = require('sequelize');

db.users.hasMany(db.user_lifechallege, {
    foreignKey: 'user_id',
   
});
db.users.hasMany(db.user_prefrences, {
    foreignKey: 'user_id',

});
db.users.hasMany(db.user_images, {
    foreignKey: 'user_id',

});
db.user_lifechallege.belongsTo(db.current_life_challenge, {
    foreignKey: 'challenge_id',
});
db.user_prefrences.belongsTo(db.communication_preferences, {
    foreignKey: 'communication_id',

});
module.exports = {
   
    
    filterdata: async (req, res) => {
        let v = new Validator(req.query, {
          
        
        });
    console.log(req.user.id,"ggggg");
    
        let validationError = await helper.checkValidation(v);
        if (validationError) {
            return helper.error400(res, validationError);
        }
    
        let where = { role: 1 };
        let where1 = {};
        let where2 = {};
    
        const minAge = req.query.minAge || 0;
        const maxAge = req.query.maxAge || 100;
        const latitude = req.query.latitude && parseFloat(req.query.latitude) !== 0 ? parseFloat(req.query.latitude) : null;
        const longitude = req.query.longitude && parseFloat(req.query.longitude) !== 0 ? parseFloat(req.query.longitude) : null;
        const   radius = req.query.radius || 50;
    
        // Age filter
        // if (req.query.minAge && req.query.maxAge) {
        //     where.age = {
        //         [Op.between]: [minAge, maxAge],
        //     };
        // } else if (req.query.minAge) {
        //     where.age = {
        //         [Op.gte]: minAge,
        //     };
        // } else if (req.query.maxAge) {
        //     where.age = {
        //         [Op.lte]: maxAge,
        //     };
        // }
    
        // Gender filter
        if (req.query.gender) {
            where.gender = req.query.gender;
        }
    
        // Challenge name filter
        if (req.query.challenge_id) {
            let challengeIds = req.query.challenge_id.split(',').map(id => parseInt(id, 10));
            challengeIds = challengeIds.filter(id => !isNaN(id));
            where1.challenge_id = { [Op.in]: challengeIds };
        }
    
        // Communication ID filter
        if (req.query.communication_id) {
            let communicationIds = req.query.communication_id.split(',').map(id => parseInt(id, 10));
            communicationIds = communicationIds.filter(id => !isNaN(id));
            where2.communication_id = { [Op.in]: communicationIds };
        }
    
        try {
            const findUser = await db.users.findOne({
                where: { id: req.user.id }
            });
    
            if (!findUser) {
                return helper.error400(res, "User not found");
            }
    
            // const attributes = [
            //     'id', 'role', 'name', 'email', 'password', 'phone_number', 'phone', 'country_code', 'gender', 'dob', 'age', 'image', 'otp', 'otp_verified', 'is_complete', 'social_id', 'social_type', 'communication_style', 'bio', 'device_type', 'device_token', 'login_time', 'is_notification', 'location', 'latitude', 'longitude', 'status', 'createdAt', 'updatedAt',
            //     [Sequelize.literal("IFNULL(TIMESTAMPDIFF(YEAR, dob, CURRENT_DATE), 0)"), "userage"]
            // ];


            let attributes = [
                'id', 'role', 'name', 'email', 'password', 'phone_number', 'phone', 'country_code', 'gender', 'dob', 'age', 'image', 'otp', 'otp_verified', 'is_complete', 'social_id', 'social_type', 'communication_style', 'bio', 'device_type', 'device_token', 'login_time', 'is_notification', 'location', 'latitude', 'longitude', 'status', 'createdAt', 'updatedAt',
                [Sequelize.fn(
                    'TIMESTAMPDIFF',
                    Sequelize.literal('YEAR'),
                    Sequelize.fn('STR_TO_DATE', Sequelize.col('users.dob'), '%d-%m-%Y'),
                    Sequelize.literal('CURDATE()')
                ), 'userage']
            ];
            
            if (latitude !== null && longitude !== null) {
                attributes.push([
                    Sequelize.literal(
                        `6371 * acos(
                            cos(radians(${latitude})) * 
                            cos(radians(users.latitude)) * 
                            cos(radians(${longitude}) - radians(users.longitude)) + 
                            sin(radians(${latitude})) * 
                            sin(radians(users.latitude))
                        )`
                    ),
                    "distance",
                ]);
            }
            console.log(attributes,"ffffff");
            
            let data = await db.users.findAll({

                include: [
                    {
                        model: db.user_lifechallege,
                        include: [
                            {
                                model: db.current_life_challenge,
                            }
                        ],
                        required: false,
                        where: where1
                        
                    },
                    {
                        model: db.user_prefrences,
                        include: [
                            {
                                model: db.communication_preferences,
                            }
                        ],
                        required: false,
                        where: where2
                    },
                    {
                        model: db.user_images,
                    }
                ],
                attributes: attributes,
                where: where,
                having: latitude !== null && longitude !== null ? {
                    distance: {
                        [Op.lte]: radius
                    },
                    userage: {
                        [Op.between]: [minAge, maxAge]
                    }
                } : {
                    userage: {
                        [Op.between]: [minAge, maxAge]
                    }
                }
            });  
           
            return helper.success(res, "Filter applied successfully", data);
    
        } catch (error) {
            console.log(error, "Error in applying filter");
            return helper.error400(res, error.message);
        }
    }
    
    
    
}