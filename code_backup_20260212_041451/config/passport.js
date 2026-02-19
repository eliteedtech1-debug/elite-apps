// Load environment variables if not already loaded
require('dotenv').config();

const { Strategy, ExtractJwt } = require("passport-jwt");
const models = require("../models");
const db = require("../models");

const Users = models.User;

// Do not set the secretOrKey at module load time to avoid the error
// The secret will be checked inside the strategy function
const opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
// We'll handle the secret key availability check inside the strategy function

module.exports = (passport) => {
  // Check if JWT_SECRET_KEY is available before creating the strategy
  if (!process.env.JWT_SECRET_KEY) {
    console.error('❌ CRITICAL ERROR: JWT_SECRET_KEY is not defined!');
    console.error('This will cause authentication to fail!');
    return;
  }
  
  // Set the secretOrKey only when initializing the strategy
  opts.secretOrKey = process.env.JWT_SECRET_KEY;
  
  passport.use(
    new Strategy(opts, async (jwt_payload, done) => {
      if (!process.env.JWT_SECRET_KEY) {
        console.error('❌ CRITICAL ERROR: JWT_SECRET_KEY is not defined at runtime!');
        return done(null, false);
      }

      console.log('🔍 JWT Payload received:', jwt_payload);

      try {
        const { user_type, id } = jwt_payload;

        if (!user_type) {
          console.error('❌ No user_type in JWT payload');
          return done(null, false);
        }

        // =======================
        // 🧠 ENFORCE ROLE PRIORITY
        // If user has a teacher record → they can only be teacher, not admin
        // =======================
        if (id) {
          const teacherRecord = await db.sequelize.query(
            `SELECT * FROM teachers WHERE user_id = :user_id LIMIT 1`,
            {
              replacements: { user_id: id },
              type: db.Sequelize.QueryTypes.SELECT,
            }
          );

          if (teacherRecord.length > 0) {
            const teacher = teacherRecord[0];

            // Allow admin/branchadmin users to have teacher records (for payroll)
            if (user_type.toLowerCase() !== 'teacher' && 
                !['admin', 'branchadmin'].includes(user_type.toLowerCase())) {
              console.warn(`⚠️ User ${id} has a TEACHER record but tried to login as ${user_type}. Blocking...`);
              return done(null, false);
            }
          }
        }

        // =======================
        // 🧑 STUDENT AUTHENTICATION
        // =======================
        if (user_type.toLowerCase() === "student") {
          const { admission_no, school_id } = jwt_payload;

          if (!admission_no) {
            console.error('❌ No admission_no in student JWT payload');
            return done(null, false);
          }

          console.log('🔍 Looking up student with admission_no:', admission_no);

          const student_raw = await db.sequelize.query(
            `SELECT * FROM students WHERE admission_no = :admission_no AND school_id = :school_id`,
            {
              replacements: { admission_no, school_id },
              type: db.Sequelize.QueryTypes.SELECT,
            }
          );

          if (student_raw.length > 0) {
            console.log('✅ Student found:', student_raw[0].admission_no);
            return done(null, student_raw[0]);
          } else {
            console.error('❌ Student not found for admission_no:', admission_no);
            return done(null, false);
          }
        }

        // =======================
        // 👤 NON-STUDENT AUTH (ADMIN / TEACHER)
        // =======================
        if (!id) {
          console.error('❌ No id in non-student JWT payload');
          return done(null, false);
        }

        console.log('🔍 Looking up user with id:', id);

        const user = await Users.findOne({ where: { id } });

        if (user) {
          console.log('✅ User found:', user.email || user.username);
          return done(null, user.dataValues);
        } else {
          console.error('❌ User not found for id:', id);
          return done(null, false);
        }

      } catch (err) {
        console.error('❌ Passport JWT Strategy Error:', err.message);
        console.error('🔍 Full error:', err);
        return done(err, false);
      }
    })
  );
};
