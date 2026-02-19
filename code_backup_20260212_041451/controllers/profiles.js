// const db= require("../models");
const db = require("../models");

const bcrypt = require("bcryptjs");


const update_teacher_profile = async (req, res) => {
  const {
    query_type = null,
    id = null,
    name = null,
    sex = null,
    age = null,
    address = null,
    date_of_birth = null,
    marital_status = null,
    state_of_origin = null,
    mobile_no = null,
    email = null,
    qualification = null,
    working_experience = null,
    religion = null,
    last_place_of_work = null,
    do_you_have = null,
    when_do = null,
    account_name = null,
    account_number = null,
    bank = null,
    school_location = null,
    school_id = null,
    old_password = null,
    new_password = null,
    picture = null,
  } = req.body;

  let finalPassword = null;

  try {
    if (old_password && new_password) {
      const [userResult] = await db.sequelize.query(
        `SELECT password FROM users WHERE id = :id`,
        {
          replacements: { id },
          type: db.sequelize.QueryTypes.SELECT,
        }
      );

      if (!userResult) {
        return res.status(404).json({ success: false, message: "User not found." });
      }

      const isMatch = await bcrypt.compare(old_password, userResult.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: "Old password is incorrect." });
      }

      finalPassword = await bcrypt.hash(new_password, 10);
    }

    const [results] = await db.sequelize.query(
      `CALL teachers(:query_type, :id, :name, :sex, :age, :address, :date_of_birth, :marital_status, :state_of_origin, :mobile_no, :email, :qualification, :working_experience, :religion, :last_place_of_work, :do_you_have, :when_do, :account_name, :account_number, :bank, :school_location, :school_id, :password)`,
      {
        replacements: {
          query_type,
          id,
          name,
          sex,
          age,
          address,
          date_of_birth,
          marital_status,
          state_of_origin,
          mobile_no,
          email,
          qualification,
          working_experience,
          religion,
          last_place_of_work,
          do_you_have,
          when_do,
          account_name,
          account_number,
          bank,
          school_location,
          school_id,
          password: finalPassword, 
        },
      }
    );

    res.json({ success: true, data: results });
  } catch (err) {
    console.error("Error updating teacher profile:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};


//     return res.json({ success: true, data: results });
//   } catch (err) {
//     console.error("Error updating teacher profile:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };


const update_admin_profile = async (req, res) => {
  const {
    query_type = null,
    id = null,
    old_password = null,
    new_password = null,
    confirm_password = null,
    picture = null
  } = req.body;

  try {
    const user = await db.User.findOne({ where: { id } });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // If user wants to update password
    if (old_password && new_password && confirm_password) {
      const isMatch = await bcrypt.compare(old_password, user.password);

      if (!isMatch) {
        return res.status(400).json({ success: false, message: "Old password is incorrect." });
      }

      if (new_password !== confirm_password) {
        return res.status(400).json({ success: false, message: "New password and confirmation do not match." });
      }

      const hashedPassword = await bcrypt.hash(new_password, 10);
      user.password = hashedPassword;
    }

    // Update picture if provided
    if (picture !== null) {
      user.picture = picture;
    }

    await user.save();

    return res.json({ success: true, message: "Profile updated successfully." });
  } catch (err) {
    console.error("Error updating profile:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

module.exports = { update_admin_profile, update_teacher_profile };
