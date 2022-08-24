const config = require("../config/auth.config");
const db = require("../models");
const User = db.user;
const Role = db.role;

exports.allUsers = (req, res) => {
  User.find()
    .populate('roles')
    .exec((err, users) => {

      if (err) {
        res.status(500).send({ message: err });
        return;
      }

      if (!users) {
          return res.status(404).send({ message: "Orders Not found." });
        }
        
        res.status(200).send(users);    
    })
};

exports.setRole = (req, res) => {
  User.findOne({_id: req.params.id})
    .populate('roles')
    .exec((err, user) => {

      if (err) {
        res.status(500).send({ message: err });
        return;
      }

      if (!user) {
        return res.status(404).send({ message: "Orders Not found." });
      }

      Role
      .find({name: req.params.role},
        (err, roles) => {
          if (err) {
            return;
          }
          user.roles = roles.map(role => role._id);
          user.adminType = req.params.type
          user.save(err => {
            if (err) {
              return;
            }
            User.findOne({_id: user._id})          
            .populate('roles')
            .exec((err, fUser) => {
              if (err) {
                res.status(500).send({ message: err });
                return;
              }
        
              if (!fUser) {
                return res.status(404).send({ message: "Orders Not found." });
              }
              res.status(200).json(fUser);
            })
          });
          
        }
      );
    })
};


exports.delete = (req, res) => {
  User.deleteOne({_id: req.params.id})
    .exec(() => {
      res.status(200).send();

    })
};
