const db = require("../../models");
const helper = require("../../helper/helper");
const { Op, where } = require("sequelize");
const path = require("path");
const { v4: uuid } = require("uuid");
const { Sequelize } = require("sequelize");
db.users.hasMany(db.user_images, {
  foreignKey: "user_id",
  // as: 'user_images'
});
db.users.hasMany(db.user_lifechallege, {
  foreignKey: "user_id",
});
db.users.hasMany(db.user_prefrences, {
  foreignKey: "user_id",
});
db.user_lifechallege.belongsTo(db.current_life_challenge, {
  foreignKey: "challenge_id",
});
db.user_prefrences.belongsTo(db.communication_preferences, {
  foreignKey: "communication_id",
});
db.likes.belongsTo(db.users, {
  foreignKey: "user_id",
});
db.post_comment.belongsTo(db.users, {
  foreignKey: "user_id",
  as: "userData",
});

db.user_posts.hasMany(db.post_images, {
  foreignKey: "post_id",
});
db.userfeed_block.belongsTo(db.user_posts, {
  foreignKey: "post_id",
});

db.user_posts.belongsTo(db.users, {
  foreignKey: "user_id",
});

module.exports = {
  // getuser: async (req, res) => {
  //     try {
  //         let user = await db.likes.findAll({
  //             where: {
  //                 user_id: req.user.id,
  //                 status: 2
  //             }
  //         });
  //         let ids = user.map(items => items.user2_id);
  //         let user_listing = await db.users.findAll({
  //             include: [
  //                 {
  //                     model: db.user_lifechallege,
  //                     include: [
  //                         {
  //                             model: db.current_life_challenge,
  //                         }
  //                     ]
  //                 },
  //                 {
  //                     model: db.user_prefrences,
  //                     include: [
  //                         {
  //                             model: db.communication_preferences,
  //                         }
  //                     ]
  //                 },
  //                 {
  //                     model: db.user_images,
  //                     as: 'user_images',
  //                 },

  //             ],
  //             attributes: {
  //                 include: [
  //                     [
  //                         Sequelize.literal(`CASE
  //                             WHEN EXISTS (
  //                                 SELECT 1
  //                                 FROM likes
  //                                 WHERE likes.user_id = ${req.user.id}
  //                                 AND user2_id = users.id
  //                             ) THEN 1
  //                             ELSE 0
  //                         END`),
  //                         "is_like",
  //                     ],
  //                     [
  //                         Sequelize.literal(`(SELECT status FROM likes WHERE likes.user2_id = users.id  LIMIT 1)`), 'likeStatus'

  //                     ]
  //                 ],
  //             },
  //             where: {
  //                 id: {
  //                     [db.Sequelize.Op.ne]: req.user.id,      // Exclude the current user
  //                     [db.Sequelize.Op.notIn]: ids            // Exclude users whose IDs are in the 'ids' array
  //                 },
  //                 role: 1,
  //                 is_complete: 6                             // Only show users where is_complete is 6
  //             },
  //             order: [['id', 'DESC']],
  //         });
  // // Check like status for both directions
  // const likeFromUser1 = await db.likes.findOne({
  //     where: {
  //         user_id: req.user.id,
  //         user2_id: user_listing.id,
  //     }
  // });

  // const likeFromUser2 = await db.likes.findOne({
  //     where: {
  //         user_id:user_listing.id ,
  //         user2_id: req.user.id,
  //     }
  // });

  // // Determine like status
  // let status = 0; // Default status

  // if (likeFromUser1 && likeFromUser2) {
  //     status = 3; // Both liked each other
  // } else if (likeFromUser1) {
  //     status = 1; // Liked by current user
  // } else if (likeFromUser2) {
  //     status = 2; // Liked by other user
  // }

  //         // Return the fetched user listing
  //         return helper.success(res, "Users fetched successfully", user_listing);

  //     } catch (error) {
  //         console.log("error", error);
  //         res.status(500).send("Internal Server Error");
  //     }
  // },

  // userfeed: async (req, res) => {
  //     try {
  //         const userfeed = await db.likes.findAll({
  //             attributes: {
  //                 include: [
  //                     [
  //                         Sequelize.literal(`IFNULL((SELECT COUNT(*) FROM post_like WHERE post_like.user_id = likes.user_id), 0)`),
  //                         'like_count'
  //                     ],
  //                     [
  //                         Sequelize.literal(`IFNULL((SELECT COUNT(*) FROM post_comment WHERE post_comment.user_id = likes.user_id), 0)`),
  //                         'comment_count'
  //                     ],
  //                     [
  //                         Sequelize.literal(`IFNULL((SELECT is_like FROM post_like WHERE post_like.user_id = likes.user_id LIMIT 1), '')`),
  //                         "is_like",
  //                     ],
  //                 ]
  //             },
  //             where: {
  //                 user_id:req.user.id,
  //                 status: 2
  //             },

  //             include:[{
  //                 model:db.users,
  //                 as:"likeduser"
  //             }

  //                ],

  //       });

  //       return helper.success(res, "Users feed get successfully", userfeed);
  //     } catch (error) {
  //       console.error("Error fetching user feed:", error);
  //       res.status(500).json({ error: 'An error occurred while fetching user feed.' });
  //     }
  //   },

  getuser: async (req, res) => {
    try {
      const { latitude, longitude, radius } = req.query;

      if (!latitude || !longitude || !radius) {
        return res
          .status(400)
          .send("Latitude, longitude, and radius are required.");
      }

      let user = await db.likes.findAll({
        where: {
          user_id: req.user.id,
          status: 2,
        },
      });

      let ids = user.map((items) => items.user2_id);

      const distanceQuery = Sequelize.literal(`
        6371 * acos(
          cos(radians(${latitude})) * cos(radians(users.latitude)) *
          cos(radians(users.longitude) - radians(${longitude})) +
          sin(radians(${latitude})) * sin(radians(users.latitude))
        )
      `);

      let user_listing = await db.users.findAll({
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
            as: "user_images",
          },
        ],
        attributes: {
          include: [
            [
              Sequelize.literal(`CASE 
                                 WHEN EXISTS (
                                  SELECT 1 
                                  FROM likes AS like1 
                                  WHERE like1.user_id = ${req.user.id} 
                                  AND like1.user2_id = users.id
                                  AND like1.status = 1
                                ) AND EXISTS (
                                  SELECT 1 
                                  FROM likes AS like2 
                                  WHERE like2.user_id = users.id 
                                  AND like2.user2_id = ${req.user.id}
                                  AND like2.status = 1
                                ) THEN 0
                                WHEN EXISTS (
                                  SELECT 1 
                                  FROM likes 
                                  WHERE likes.user_id = ${req.user.id} 
                                  AND user2_id = users.id
                                ) THEN 1 
                                ELSE 0 
                              END`),
              "is_like",
            ],
            [distanceQuery, "distance"],
          ],
        },
        where: {
          id: {
            [Op.ne]: req.user.id,
            [Op.notIn]: ids,
          },
          role: 1,
          is_complete:6,
          [Op.and]: [Sequelize.where(distanceQuery, { [Op.lte]: radius })],
        },
        order: [["distance", "ASC"]],
      });

      // Determine like statuses
      for (const user of user_listing) {
        const likeFromUser1 = await db.likes.findOne({
          where: {
            user_id: req.user.id,
            user2_id: user.id,
          },
        });

        const likeFromUser2 = await db.likes.findOne({
          where: {
            user_id: user.id,
            user2_id: req.user.id,
          },
        });

        if (
          likeFromUser1 &&
          likeFromUser1.status == 0 &&
          likeFromUser2 &&
          likeFromUser2.status == 0
        ) {
          user.dataValues.likeStatus = 0;
        } else if (
          likeFromUser1 &&
          likeFromUser1.status == 1 &&
          (!likeFromUser2 || likeFromUser2.status == 0)
        ) {
          user.dataValues.likeStatus = 1;
        } else if (
          likeFromUser2 &&
          likeFromUser2.status == 1 &&
          (!likeFromUser1 || likeFromUser1.status == 0)
        ) {
          user.dataValues.likeStatus = 2;
        } else if (
          likeFromUser1 &&
          likeFromUser1.status == 1 &&
          likeFromUser2 &&
          likeFromUser2.status == 1
        ) {
          user.dataValues.likeStatus = 3;
        } else {
          user.dataValues.likeStatus = 0;
        }
      }

      return helper.success(res, "Users fetched successfully", user_listing);
    } catch (error) {
      console.log("error", error);
      return helper.error400(res, "Error");
    }
  },

  // getuser: async (req, res) => {
  //     try {
  //         // Fetch users that the current user has liked (status = 2)
  //         let userLikes = await db.likes.findAll({
  //             where: {
  //                 user_id: req.user.id,
  //                 status: 2
  //             }
  //         });

  //         let likedUserIds = userLikes.map(item => item.user2_id);

  //         let userListing = await db.users.findAll({
  //             include: [
  //                 {
  //                     model: db.user_lifechallege,
  //                     include: [
  //                         {
  //                             model: db.current_life_challenge,
  //                         }
  //                     ]
  //                 },
  //                 {
  //                     model: db.user_prefrences,
  //                     include: [
  //                         {
  //                             model: db.communication_preferences,
  //                         }
  //                     ]
  //                 },
  //                 {
  //                     model: db.user_images,
  //                 }
  //             ],
  //             attributes: {
  //                 include: [
  //                     [
  //                         Sequelize.literal(`CASE
  //                             WHEN EXISTS (
  //                                 SELECT 1
  //                                 FROM likes AS like1
  //                                 WHERE like1.user_id = ${req.user.id}
  //                                 AND like1.user2_id = users.id
  //                                 AND like1.status = 1
  //                             ) AND EXISTS (
  //                                 SELECT 1
  //                                 FROM likes AS like2
  //                                 WHERE like2.user_id = users.id
  //                                 AND like2.user2_id = ${req.user.id}
  //                                 AND like2.status = 1
  //                             ) THEN 0
  //                             WHEN EXISTS (
  //                                 SELECT 1
  //                                 FROM likes
  //                                 WHERE likes.user_id = ${req.user.id}
  //                                 AND user2_id = users.id
  //                             ) THEN 1
  //                             ELSE 0
  //                         END`),
  //                         "is_like",
  //                     ],
  //                 ]
  //             },
  //             where: {
  //                 id: {
  //                     [db.Sequelize.Op.ne]: req.user.id, // Exclude current user
  //                     [db.Sequelize.Op.notIn]: likedUserIds // Exclude users already liked
  //                 },
  //                 role: 1,
  //                 // is_complete: 6
  //             },
  //             order: [['id', 'DESC']],
  //         });

  //         for (const user of userListing) {
  //             const [likeFromUser1, likeFromUser2] = await Promise.all([
  //                 db.likes.findOne({
  //                     where: {
  //                         user_id: req.user.id,
  //                         user2_id: user.id,
  //                     }
  //                 }),
  //                 db.likes.findOne({
  //                     where: {
  //                         user_id: user.id,
  //                         user2_id: req.user.id,
  //                     }
  //                 })
  //             ]);

  //             if (likeFromUser1 && likeFromUser2 && likeFromUser1.status == 0 && likeFromUser2.status == 0) {

  //             } else if (likeFromUser1 && likeFromUser2) {
  //                 user.dataValues.likeStatus = 3;
  //             } else if (likeFromUser1) {
  //                 user.dataValues.likeStatus = 1;
  //             } else if (likeFromUser2) {
  //                 user.dataValues.likeStatus = 2;
  //             } else {
  //                 user.dataValues.likeStatus = 0;
  //             }
  //         }

  //         return helper.success(res, "Users fetched successfully", userListing);
  //     } catch (error) {
  //         console.log("error", error);
  //         res.status(500).send("Internal Server Error");
  //     }
  // },

  // getuser: async (req, res) => {
  //     try {
  //         // Fetch users that the current user has liked (status = 2)
  //         let userLikes = await db.likes.findAll({
  //             where: {
  //                 user_id: req.user.id,
  //                 status: 2
  //             }
  //         });

  //         let likedUserIds = userLikes.map(item => item.user2_id);

  //         let userListing = await db.users.findAll({
  //             include: [
  //                 {
  //                     model: db.user_lifechallege,
  //                     include: [
  //                         {
  //                             model: db.current_life_challenge,
  //                         }
  //                     ]
  //                 },
  //                 {
  //                     model: db.user_prefrences,
  //                     include: [
  //                         {
  //                             model: db.communication_preferences,
  //                         }
  //                     ]
  //                 },
  //                 {
  //                     model: db.user_images,
  //                 }
  //             ],
  //             attributes: {
  //                 include: [
  //                     [
  //                         Sequelize.literal(`CASE
  //                             WHEN EXISTS (
  //                                 SELECT 1
  //                                 FROM likes AS like1
  //                                 WHERE like1.user_id = ${req.user.id}
  //                                 AND like1.user2_id = users.id
  //                                 AND like1.status = 1
  //                             ) AND EXISTS (
  //                                 SELECT 1
  //                                 FROM likes AS like2
  //                                 WHERE like2.user_id = users.id
  //                                 AND like2.user2_id = ${req.user.id}
  //                                 AND like2.status = 1
  //                             ) THEN 0
  //                             WHEN EXISTS (
  //                                 SELECT 1
  //                                 FROM likes
  //                                 WHERE likes.user_id = ${req.user.id}
  //                                 AND user2_id = users.id
  //                             ) THEN 1
  //                             ELSE 0
  //                         END`),
  //                         "is_like",
  //                     ],
  //                 ]
  //             },
  //             where: {
  //                 id: {
  //                     [db.Sequelize.Op.ne]: req.user.id, // Exclude current user
  //                     [db.Sequelize.Op.notIn]: likedUserIds // Exclude users already liked
  //                 },
  //                 role: 1,
  //                 // is_complete: 6
  //             },
  //             order: [['id', 'DESC']],
  //         });

  //         for (const user of userListing) {
  //             const [likeFromUser1, likeFromUser2] = await Promise.all([
  //                 db.likes.findOne({
  //                     where: {
  //                         user_id: req.user.id,
  //                         user2_id: user.id,
  //                     }
  //                 }),
  //                 db.likes.findOne({
  //                     where: {
  //                         user_id: user.id,
  //                         user2_id: req.user.id,
  //                     }
  //                 })
  //             ]);

  //             if (likeFromUser1 && likeFromUser2 && likeFromUser1.status == 0 && likeFromUser2.status == 0) {

  //             } else if (likeFromUser1) {
  //                 user.dataValues.likeStatus = 1;
  //             } else if (likeFromUser2) {
  //                 user.dataValues.likeStatus = 2;
  //             } else {
  //                 user.dataValues.likeStatus = 0;
  //             }
  //         }

  //         // Filter out users with likeStatus = 2
  //         userListing = userListing.filter(user => user.dataValues.likeStatus !== 3);

  //         return helper.success(res, "Users fetched successfully", userListing);
  //     } catch (error) {
  //         console.log("error", error);
  //         res.status(500).send("Internal Server Error");
  //     }
  // },

userfeed: async (req, res) => {
    try {
        
        const likes = await db.likes.findAll({
            where: {
                [Op.or]: [
                    { user_id: req.user.id, status: 2 },
                    { user2_id: req.user.id, status: 2 },
                ],
            },
        });

        let userIds = likes
            .map((like) =>
                like.user_id === req.user.id ? like.user2_id : like.user_id
            )
            .filter((id) => id !== req.user.id);

        userIds = [...new Set(userIds)];


        
        const blockedPosts = await db.userfeed_block.findAll({
            where: {
                user_id: req.user.id,
                status: 1, 
            },
        });


        let blockedPostIds = blockedPosts.map((block) => block.post_id);


       
        blockedPostIds = blockedPostIds.length > 0 ? blockedPostIds : [0]; 

        
        const find_posts = await db.user_posts.findAll({
            include: [
                {
                    model: db.post_images,
                    required: true,
                    where: {
                        user_id: {
                            [Op.in]: userIds,
                        },
                    },
                },
                {
                    model: db.users,
                },
            ],
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
                            `IFNULL((SELECT is_like FROM post_like WHERE post_like.post_id = user_posts.id AND post_like.user_id=${req.user.id} LIMIT 1), '')`
                        ),
                        "is_like",
                    ],
                ],
            },
            where: {
                user_id: {
                    [Op.in]: userIds,
                },
                id: {
                    [Op.notIn]: blockedPostIds, 
                },
            },
            order: [["id", "DESC"]],
        });

        return helper.success(res, "Users feed fetched successfully", find_posts);
    } catch (error) {
        console.error("Error fetching user feed:", error);
        return helper.error400(res, "Error");
    }
},

  

  userfeedblock: async (req, res) => {
    try {
      let user_feed = await db.userfeed_block.findAll({
        include: [
          {
            model: db.user_posts,
            include: [
              {
                model: db.post_images,
              },
            ],
          },
        ],
        attributes: {
          include: [
            [
              Sequelize.literal(
                `(SELECT image FROM users WHERE users.id = userfeed_block.user_id LIMIT 1)`
              ),
              "userimage",
            ],
            [
              Sequelize.literal(
                `(SELECT name FROM users WHERE users.id = userfeed_block.user_id LIMIT 1)`
              ),
              "username",
            ],

            [
              Sequelize.literal(
                `IFNULL((SELECT COUNT(*) FROM post_like WHERE post_like.post_id = userfeed_block.post_id AND is_like = 1), 0)`
              ),
              "like_count",
            ],
            [
              Sequelize.literal(
                `IFNULL((SELECT COUNT(*) FROM post_comment WHERE post_comment.post_id = userfeed_block.post_id), 0)`
              ),
              "comment_count",
            ],
          ],
        },
        where: {
          user_id: req.user.id,
          
        },
      });

      return helper.success(
        res,
        "User blocked feed fetched successfully",
        user_feed
      );
    } catch (error) {
      console.error("Error fetching user feed:", error);
      return helper.error400(res, error.message || "Error fetching user feed");
    }
  },

  add_comment: async (req, res) => {
    try {
      let addComment = await db.post_comment.create({
        user_id: req.user.id,
        post_id: req.body.post_id,
        comment: req.body.comment,
      });
      return helper.success(res, "Comment added successfully", addComment);
    } catch (error) {
      console.error(error);
      return helper.error400(
        res,
        "An error occurred while adding the comment."
      );
    }
  },

  get_comment: async (req, res) => {
    try {
      let getComments = await db.post_comment.findAll({
        include: [
          {
            model: db.users,
            as: "userData",
            attributes: ["id", "name", "email", "image"],
          },
        ],

        where: {
          post_id: req.body.post_id,
        },
        order: [["id", "DESC"]],
      });

      return helper.success(
        res,
        "Comments retrieved successfully",
        getComments
      );
    } catch (error) {
      console.error(error);
      return helper.error400(
        res,
        "An error occurred while retrieving the comments."
      );
    }
  },

  fileUpload: async (req, res) => {
    try {
      const imgdata = {};
      if (req.files && req.files.image) {
        if (Array.isArray(req.files.image)) {
          await Promise.all(
            req.files.image.map(async (image, index) => {
              imgdata[`image${index}`] = await helper.fileUpload(image);
            })
          );
        } else {
          imgdata["image0"] = await helper.fileUpload(req.files.image);
        }
        return helper.success(res, "File Upload Successfully", imgdata);
      }
    } catch (error) {
      return helper.error400(res, "Error");
    }
  },
  updateLocation: async (req, res) => {
    try {
      const data = await db.users.update(
        {
          location: req.body.location,
          longitude: req.body.longitude,
          latitude: req.body.latitude,
        },
        {
          where: { id: req.user.id },
        }
      );

      if (!data) {
        return helper.error400(res, "User not found or location not updated");
      }

      return helper.success(res, "location  updated Successfully");
    } catch (error) {
      console.log(error, "error");
      return helper.error400(
        res,
        "An error occurred while updating the location"
      );
    }
  },
};
