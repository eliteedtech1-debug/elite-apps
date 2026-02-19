const db = require("../models");

const _ = require("lodash"); 

const schoolCalendar = async (req, res) => {
  try {
    const operations = Array.isArray(req.body) ? req.body : [req.body];

    const results = [];

    for (const operation of operations) {
      const {
        query_type = null,
        id = null,
        title = null,
        start_date = null,
        end_date = null,
        school_location = null,
        status = null,
        color = null,
        created_by = null,
        recurrence = null,
        school_id=null
      } = operation;

      // Call the stored procedure
      const result = await db.sequelize.query(
        "CALL schoolCalendar(:query_type, :id, :title, :start_date, :end_date, :color, :status,  :created_by, :recurrence,:school_location,:school_id)",
        {
          replacements: {
            query_type,
            id,
            title,
            start_date: start_date === "" ? null : start_date,
            end_date: !end_date ? null : end_date,
            school_location,
            color,
            status,
            created_by,
            recurrence,
            school_id:school_id??req.user.school_id
          },
        }
      );

      results.push(result);
    }

    res.status(200).json({ success: true, data: results.flat() });
  } catch (error) {
    console.error("Error executing school_calendar operation:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const taskTodos = async (req, res) => {
  const operations = Array.isArray(req.body) ? req.body : [req.body];

  try {
    const results = [];

    for (const operation of operations) {
      const {
        query_type = null,
        id = null,
        user_id = null,
        title = null,
        class_name = null,
        event_category = null,
        due_date = null,
        content = null,
        created_by = null,
        priority = null,
        status = null,
        limit = null,
        offset = null,
      } = operation;

      // Call the stored procedure
      const result = await db.sequelize.query(
        `CALL taskTodos(:query_type,:id,:user_id,:title,:class_name,:event_category,:due_date,:content,:created_by,:priority,:status,:limit,:offset)`,
        {
          replacements: {
            query_type,
            id,
            user_id,
            title,
            class_name,
            event_category,
            due_date,
            content,
            created_by,
            status,
            priority,
            limit,
            offset,
          },
        }
      );

      if (result && result[0]?.id) {
        results.push(result);
      }
    }

    res.status(200).json({ success: true, data: results.flat() });
  } catch (error) {
    console.error("Error executing school_calendar operation:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const schedule = async (req, res) => {
  const operations = Array.isArray(req.body) ? req.body : [req.body];

  try {
    const results = [];

    for (const operation of operations) {
      const {
        query_type = null,
        id = null,
        user_id = null,
        title = null,
        event_for = null,
        event_category = null,
        start_date = null,
        end_date = null,
        start_time = null,
        end_time = null,
        attachment = null,
        content = null,
        created_by = null,
        priority = null,
        search_keyword = null,
        limit = null,
        offset = null,
      } = operation;

      // Call the stored procedure
      const result = await db.sequelize.query(
        `CALL manage_task_todo(:query_type,:id,:user_id,:title,:event_for,:event_category,:start_date,:end_date,:start_time,:end_time,:attachment,:content,:created_by,:priority,:search_keyword,:limit,:offset)`,
        {
          replacements: {
            query_type,
            id,
            user_id,
            title,
            event_for,
            event_category,
            start_date,
            end_date,
            start_time,
            end_time,
            attachment,
            content,
            created_by,
            search_keyword,
            priority,
            limit,
            offset,
          },
        }
      );

      if (result && result[0]?.id) {
        results.push(result);
      }
    }

    res.status(200).json({ success: true, data: results.flat() });
  } catch (error) {
    console.error("Error executing school_calendar operation:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Controller for ManageSyllabus
const syllabus = async (req, res) => {
  const operations = Array.isArray(req.body) ? req.body : [req.body];
  console.log({ operations });

  try {
    const results = [];

    for (const operation of operations) {
      let {
        query_type = null,
        id = null,
        subject = null,
        class_code = null,
        term = null,
        week = null,
        title = null,
        content = null,
        status = null,
      } = operation;

      const query = `CALL syllabus(:query_type, :id, :subject, :class_code, :term, :week, :title, :content, :status);`;

      const result = await db.sequelize.query(query, {
        replacements: {
          query_type,
          id,
          subject,
          class_code,
          term,
          week,
          title,
          content,
          status,
        },
      });
      console.log({ result });

      if (result && result[0]?.id) {
        results.push(result);
      }
    }
    // query_type
    res.status(200).json({
      message: `Operation successful`,
      data: results.flat(),
      success: true,
    });
  } catch (error) {
    console.error({ error });

    res.status(500).json({
      message: "An error occurred while managing syllabus",
      error: error.message,
    });
  }
};

// const syllabusTracker = async (req, res) => {
//     const operations = Array.isArray(req.body) ? req.body : [req.body];

//     try {

//         const results = [];

//         for (const operation of operations) {

//             const {
//                 query_type = null,
//                 id = null,
//                 syllabus_id = null,
//                 subject = null,
//                 class_code = null,
//                 term = null,
//                 academic_year = null,
//                 week = null,
//                 status = null
//             } = operation;

//             const query = `
//         CALL syllabusTracker(
//           :query_type, :id, :syllabus_id, :subject, :class_code, :term, :academic_year, :week, :status
//         );
//       `;

//             const result = await sequelize.query(query, {
//                 replacements: {
//                     query_type,
//                     id,
//                     syllabus_id,
//                     subject,
//                     class_code,
//                     term,
//                     academic_year,
//                     week,
//                     status,
//                 },
//             });
//             if (result && result[0]?.id) {
//                 results.push(result);
//             }
//         }
//         res.status(200).json({
//             message: `Operation '${query_type}' on syllabus tracker successful`,
//             data: results.flat(),
//             success: true
//         });
//     } catch (error) {
//         res.status(500).json({
//             message: 'An error occurred while managing syllabus tracker',
//             error: error.message,
//         });
//     }
// };

// Controller for leaveRecords
const leaveRecords = async (req, res) => {
  const operations = Array.isArray(req.body) ? req.body : [req.body];
  console.log({ operations });

  try {
    const results = [];

    for (const operation of operations) {
      let {
        query_type = null,
        record_id = null,
        user_role = null,
        user_id = null,
        user_name = null,
        class_name = null,
        type = null,
        start_date = null,
        end_date = null,
        no_of_days = null,
        applied_on = null,
        status = null,
        approved_by = null,
        approved_on = null,
        school_location = null,
      } = operation;

      const query = `CALL leaveRecords (
                    :query_type,
                    :record_id,
                    :user_id,
                    :user_role,
                    :user_name,
                    :class_name,
                    :type,
                    :start_date,
                    :end_date,
                    :no_of_days,
                    :applied_on,
                    :status,
                    :approved_by,
                    :approved_on,
                    :school_location
                );`;

      const result = await db.sequelize.query(query, {
        replacements: {
          query_type,
          record_id,
          user_role,
          user_name,
          class_name,
          user_id,
          type,
          start_date,
          end_date,
          no_of_days,
          applied_on,
          status,
          approved_by,
          school_location,
          approved_on,
        },
      });
      console.log({ result });

      if (result && result[0]?.id) {
        results.push(result);
      }
    }
    // query_type
    res.status(200).json({
      message: `Operation successful`,
      data: results.flat(),
      success: true,
    });
  } catch (error) {
    console.error({ error });

    res.status(500).json({
      message: "An error occurred while managing syllabus",
      error: error.message,
    });
  }
};
const exam_calendar = (req, res) => {
  // const {  } = req.body;
  const {
    query_type = "create",
    id = null,
    admin_id = null,
    exam_name = null,
    academic_year = null,
    term = null,
    start_date = null,
    end_date = null,
    status = null,
    school_id = null,
  } = req.body;

  db.sequelize
    .query(
      `call exam_calendar(:query_type, :id, :admin_id, :exam_name, :academic_year, :term, :start_date, :end_date,:status,:school_id)`,
      {
        replacements: {
          query_type,
          id,
          admin_id,
          exam_name,
          academic_year,
          term,
          start_date,
          end_date,
          status,
          school_id,
        },
      }
    )
    .then((results) => res.json({ success: true, data: results }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};
const update_exam_calendar = (req, res) => {
  // const {  } = req.body;
  const {
    query_type = "update",
    id = null,
    admin_id = null,
    exam_name = null,
    academic_year = null,
    term = null,
    start_date = null,
    end_date = null,
    status = null,
    school_id = null,
  } = req.body;

  db.sequelize
    .query(
      `call exam_calendar(:query_type, :id, :admin_id, :exam_name, :academic_year, :term, :start_date, :end_date,:status,:school_id)`,
      {
        replacements: {
          query_type,
          id,
          admin_id,
          exam_name,
          academic_year,
          term,
          start_date,
          end_date,
          status,
          school_id,
        },
      }
    )
    .then((results) => res.json({ success: true, data: results }))
    .catch((err) => {
      console.log(err);
      res.status(500).json({ success: false });
    });
};

const syllabusTracker = async (req, res) => {
  const operations = Array.isArray(req.body) ? req.body : [req.body];
  try {
    const results = [];
    for (const operation of operations) {
      var _result$4;
      const {
        query_type = null,
        id = null,
        syllabus_id = null,
        subject = null,
        class_code = null,
        term = null,
        academic_year = null,
        week = null,
        status = null,
      } = operation;
      const query = `
        CALL syllabusTracker(
          :query_type, :id, :syllabus_id, :subject, :class_code, :term, :academic_year, :week, :status
        );
      `;
      const result = await sequelize.query(query, {
        replacements: {
          query_type,
          id,
          syllabus_id,
          subject,
          class_code,
          term,
          academic_year,
          week,
          status,
        },
      });
      if (
        result &&
        (_result$4 = result[0]) !== null &&
        _result$4 !== void 0 &&
        _result$4.id
      ) {
        results.push(result);
      }
    }
    res.status(200).json({
      message: `Operation '${query_type}' on syllabus tracker successful`,
      data: results.flat(),
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while managing syllabus tracker",
      error: error.message,
    });
  }
};

const libraryCatalogue = async (req, res) => {
  const records = Array.isArray(req.body) ? req.body : [req.body]; // Ensure it's an array of records

  try {
    // Iterate over the records and call the stored procedure for each
    for (let record of records) {
      const {
        query_type, // 'CREATE', 'UPDATE', or 'RETURN'
        book_title = null,
        author = null,
        isbn = null,
        cover_img = null,
        borrower_name = null,
        date_borrowed = null,
        due_date = null,
        return_date = null,
        status = null,
        qty = null,
        post_date = null,
        rack_no = null,
        publisher = null,
        subject = null,
        book_no = null,
        record_id = null,
      } = record;

      await db.sequelize.query(
        "CALL ManageLibraryCatalogue(:query_type, :book_title, :author, :isbn, :cover_img, :borrower_name, :date_borrowed, :due_date, :return_date, :status, :qty, :post_date, :rack_no, :publisher, :subject, :book_no, :record_id);",
        {
          replacements: {
            query_type,
            book_title,
            record_id,
            author,
            isbn,
            cover_img,
            borrower_name,
            date_borrowed,
            due_date,
            return_date,
            status,
            qty,
            post_date,
            rack_no,
            publisher,
            subject,
            book_no,
          },
        }
      );
    }

    // Respond based on the query_type
    if (records.length === 1) {
      const queryType = records[0].query_type;
      if (queryType === "CREATE") {
        res.status(201).json({ message: "Book added to the catalogue" });
      } else if (queryType === "UPDATE") {
        res.status(200).json({ message: "Book updated successfully" });
      } else if (queryType === "RETURN") {
        res.status(200).json({ message: "Book returned successfully" });
      }
    } else {
      res
        .status(200)
        .json({ message: "Bulk operation completed successfully" });
    }
  } catch (error) {
    console.error({
      error,
    });
    res.status(500).json({
      message: "An error occurred while managing syllabus",
      error: error.message,
    });
  }
};

const bookSupplies = async (req, res) => {
  const records = Array.isArray(req.body) ? req.body : [req.body]; // Ensure it's an array of records
  const results = [];
  try {
    // Iterate over the records and call the stored procedure for each
    for (let record of records) {
      const {
        record_id = null,
        book_title = null,
        author = null,
        isbn = null,
        cover_img = null,
        status = null,
        qty = null,
        post_date = null,
        publisher = null,
        subject = null,
        book_no = null,
        query_type = null,
      } = record;

      let resp = await db.sequelize.query(
        "CALL bookSupplies(:query_type, :record_id, :book_title, :author, :isbn, :cover_img, :status, :qty, :post_date, :publisher, :subject, :book_no);",
        {
          replacements: {
            record_id: parseInt(record_id || 0),
            book_title,
            author,
            isbn,
            cover_img,
            status,
            qty: parseInt(qty || 0),
            post_date,
            publisher,
            subject,
            book_no,
            query_type,
          },
        }
      );

      results.push(resp);
    }
    // Respond based on the query_type
    if (records.length === 1) {
      const query_type = records[0].query_type;
      if (query_type === "CREATE") {
        res
          .status(201)
          .json({ success: true, message: "Book created successfully" });
      } else if (query_type === "UPDATE") {
        res.status(200).json({
          success: true,
          data: results,
          message: "Book updated successfully",
        });
      } else if (query_type === "DELETE") {
        res
          .status(200)
          .json({ success: true, message: "Book deleted successfully" });
      } else {
        res.status(200).json({
          success: true,
          data: results[0],
          message: "Book fetched successfully",
        });
      }
    } else {
      res.status(200).json({
        success: true,
        data: results.flat(),
        message: "Bulk operation completed successfully",
      });
    }
  } catch (error) {
    console.error("Error managing book:", error);
    res.status(500).json({ success: false, message: "Error managing book" });
  }
};
const generateTimeTableQueries = async (timetableData, school_id, school_location) => {
  let queries = [];

  for (const [className, schedule] of Object.entries(timetableData)) {
    for (const [day, periods] of Object.entries(schedule)) {
      for (const period of periods) {
        const { time, subject, teacher_id, section } = period;
        const [start_time, end_time] = time.split(" - "); // Extract start & end time

        // Generate SQL CALL statement
        const sqlQuery = `CALL lesson_time_table('create', NULL, :day, :className, :subject, :teacher_id, :section, :school_location, :start_time, :end_time, :status, :school_id);`;
        console.log({sqlQuery})
        queries.push(
          db.sequelize.query(sqlQuery, {
            replacements: {
              day,
              className,
              subject,
              teacher_id,
              section,
              school_location,
              start_time,
              end_time,
              status: "active",
              school_id,
            },
          })
        );
      }
    }
  }

  return Promise.all(queries); // Execute all queries in parallel
};

// Function to generate a timetable for a class
const generateTimetable = async (req, res) => {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  try {
    const { subjects, classes, timeSlots } = req.body;
    const school_location = req.user.school_location;
    const school_id = req.user.school_id;

    if (!subjects || !classes || !timeSlots) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Convert subjects array into a map for easy lookup
    const subjectMap = {};
    subjects.forEach(({ subject, teacher_id }) => {
      subjectMap[subject] = teacher_id;
    });

    const timetable = {};

    classes.forEach((className) => {
      const classTimetable = {};

      days.forEach((day) => {
        let dailySchedule = [];
        let shuffledSubjects = [...subjects].sort(() => Math.random() - 0.5); // Shuffle subjects
        let subjectIndex = 0;
        timeSlots.forEach((timeSlot) => {
          if (dailySchedule.length >= timeSlots.length) return; // Stop if full

          const subjectData = shuffledSubjects[subjectIndex % shuffledSubjects.length];
          dailySchedule.push({
            time: timeSlot,
            subject: subjectData.subject,
            teacher_id: subjectData.teacher_id,
            section: subjectData.section,
          });

          subjectIndex++;
        });

        classTimetable[day] = dailySchedule;
      });

      timetable[className] = classTimetable;
    });

    // Execute queries in DB
    await generateTimeTableQueries(timetable, school_id, school_location);

    res.status(200).json({ success: true, timetable });

  } catch (error) {
    console.error("Error generating timetable:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
// function shuffle(array) {
//   for (let i = array.length - 1; i > 0; i--) {
//     const j = Math.floor(Math.random() * (i + 1));
//     [array[i], array[j]] = [array[j], array[i]];
//   }
//   return array;
// }

// const generateTimetable2 = async (req, res) => {
//   const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
//   const breakTimes = ["10:00 AM - 10:30 AM", "12:00 PM - 12:15 PM"];
//   const morningSlots = ["08:00 AM - 08:45 AM", "08:45 AM - 09:30 AM", 
//                         "09:30 AM - 10:15 AM", "11:00 AM - 11:45 AM"];
//   const difficultSubjects = ["Mathematics", "English Language", 
//                             "Chemistry", "Physics", "Biology"];

//   try {
//     const { subjects, classes, section,school_location=null, timeSlots } = req.body;
//     const school_id = req.user.school_id;

//     if (!subjects || !classes || !timeSlots) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     const validTimeSlots = timeSlots.filter(slot => !breakTimes.includes(slot));
//     const difficult = subjects.filter(s => difficultSubjects.includes(s.subject));
//     const others = subjects.filter(s => !difficultSubjects.includes(s.subject));

//     const timetable = {};
//     const teacherSchedule = days.reduce((acc, day) => {
//       acc[day] = validTimeSlots.reduce((slots, time) => {
//         slots[time] = new Set();
//         return slots;
//       }, {});
//       return acc;
//     }, {});

//     const isTeacherAvailable = (day, time, teacherId) => 
//       !teacherSchedule[day][time].has(teacherId);

//     const assignSubject = (day, time, className, subject, section, teacher_id) => {
//       if (isTeacherAvailable(day, time, teacher_id)) {
//         timetable[className][day].push({ 
//           time, 
//           subject: subject.subject, 
//           teacher_id,
//           section
//         });
//         teacherSchedule[day][time].add(teacher_id);
//         return true;
//       }
//       return false;
//     };

//     classes.forEach(className => {
//       timetable[className] = days.reduce((acc, day) => {
//         acc[day] = [];
//         return acc;
//       }, {});

//       // Assign mandatory subjects first
//       const mandatory = ["Mathematics", "English Language"];
//       mandatory.forEach(subjectName => {
//         const subject = [...difficult, ...others].find(s => s.subject === subjectName);
//         if (!subject) return;

//         for (const time of morningSlots) {
//           if (validTimeSlots.includes(time)) {
//             const day = days[Math.floor(Math.random() * days.length)];
//             if (assignSubject(day, time, className, subject, section, subject.teacher_id)) break;
//           }
//         }
//       });

//       // Process remaining subjects
//       let remainingSubjects = [
//         ...difficult.filter(s => !mandatory.includes(s.subject)), 
//         ...others
//       ];
//       remainingSubjects = shuffle(remainingSubjects);

//       validTimeSlots.forEach(time => {
//         // Adjust priority based on time of day
//         if (["11:45 AM - 12:30 PM", "12:30 PM - 01:15 PM", 
//              "01:15 PM - 01:45 PM"].includes(time)) {
//           remainingSubjects = [...others, ...difficult];
//         } else {
//           remainingSubjects = [...difficult, ...others];
//         }

//         days.forEach(day => {
//           if (timetable[className][day].some(entry => entry.time === time)) return;

//           // Try priority assignment
//           let assigned = false;
//           for (const subject of remainingSubjects) {
//             if (assignSubject(day, time, className,  subject, section, subject.teacher_id)) {
//               assigned = true;
//               break;
//             }
//           }

//           // Fallback assignment
//           if (!assigned && remainingSubjects.length > 0) {
//             const randomSubject = remainingSubjects[
//               Math.floor(Math.random() * remainingSubjects.length)
//             ];
//             assignSubject(day, time, className, randomSubject, section, randomSubject.teacher_id);
//           }
//         });
//       });
//     });

//     await generateTimeTableQueries(timetable, school_id, school_location);
//     res.status(200).json({ success: true, timetable });

//   } catch (error) {
//     console.error("Error generating timetable:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };
// function shuffle(array) {
//   for (let i = array.length - 1; i > 0; i--) {
//     const j = Math.floor(Math.random() * (i + 1));
//     [array[i], array[j]] = [array[j], array[i]];
//   }
//   return array;
// }

// const generateTimetable2 = async (req, res) => {
//   const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
//   const breakTimes = ["10:00 AM - 10:30 AM", "12:00 PM - 12:15 PM"];
//   const morningSlots = ["08:00 AM - 08:45 AM", "08:45 AM - 09:30 AM", 
//                         "09:30 AM - 10:15 AM", "11:00 AM - 11:45 AM"];
//   const difficultSubjects = ["Mathematics", "English Language", 
//                             "Chemistry", "Physics", "Biology"];

//   try {
//     const { subjects, classes, section, school_location, timeSlots } = req.body;
//     const school_id = req.user.school_id;

//     if (!subjects || !classes || !timeSlots) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     const sectionClasses = classes.filter(cls => cls.section === section);
//     const validTimeSlots = timeSlots.filter(slot => !breakTimes.includes(slot));
//     const difficult = subjects.filter(s => difficultSubjects.includes(s.subject));
//     const others = subjects.filter(s => !difficultSubjects.includes(s.subject));

//     const timetable = {};
//     const teacherSchedule = days.reduce((acc, day) => {
//       acc[day] = validTimeSlots.reduce((slots, time) => {
//         slots[time] = new Set();
//         return slots;
//       }, {});
//       return acc;
//     }, {});

//     // Track subject assignments per class
//     const classSubjectSchedule = sectionClasses.reduce((acc, cls) => {
//       acc[cls.name] = days.reduce((d, day) => {
//         d[day] = {};
//         return d;
//       }, {});
//       return acc;
//     }, {});

//     // Track subject counts per class
//     const subjectCount = sectionClasses.reduce((acc, cls) => {
//       acc[cls.name] = {};
//       return acc;
//     }, {});

//     const isTeacherAvailable = (day, time, teacherId) => 
//       !teacherSchedule[day][time].has(teacherId);

//     const canAssignSubject = (className, day, time, subject) => {
//       // Check time conflict across days
//       const timeConflict = days.some(d => 
//         d !== day && classSubjectSchedule[className][d][time] === subject
//       );
      
//       // Check if subject already assigned to class
//       const alreadyAssigned = subjectCount[className][subject] || 0;
      
//       // Check total subjects limit
//       const totalSubjects = Object.keys(subjectCount[className]).length;

//       return !timeConflict && alreadyAssigned < 1 && totalSubjects < 9;
//     };

//     const assignSubject = (day, time, className, subject, teacherId) => {
//       if (isTeacherAvailable(day, time, teacherId) && 
//           canAssignSubject(className, day, time, subject.subject)) {
//         timetable[className] = timetable[className] || 
//           days.reduce((acc, d) => ({ ...acc, [d]: [] }), {});
//         timetable[className][day].push({ 
//           time, 
//           subject: subject.subject, 
//           teacher_id,
//           section
//         });
//         teacherSchedule[day][time].add(teacherId);
//         classSubjectSchedule[className][day][time] = subject.subject;
//         subjectCount[className][subject.subject] = 
//           (subjectCount[className][subject.subject] || 0) + 1;
//         return true;
//       }
//       return false;
//     };

//     sectionClasses.forEach(cls => {
//       timetable[cls.name] = days.reduce((acc, day) => ({ ...acc, [day]: [] }), {});

//       // Assign mandatory subjects with distribution
//       const mandatory = ["Mathematics", "English Language"];
//       mandatory.forEach(subjectName => {
//         const subject = [...difficult, ...others].find(s => s.subject === subjectName);
//         if (!subject) return;

//         const availableSlots = shuffle([...morningSlots]);
//         const shuffledDays = shuffle([...days]);
        
//         for (const day of shuffledDays) {
//           for (const time of availableSlots) {
//             if (validTimeSlots.includes(time) && 
//                 assignSubject(day, time, cls.name, subject, subject.teacher_id)) {
//               return; // Assigned successfully
//             }
//           }
//         }
//       });

//       // Process remaining subjects
//       let remainingSubjects = [
//         ...difficult.filter(s => !mandatory.includes(s.subject)), 
//         ...others
//       ];
//       remainingSubjects = shuffle(remainingSubjects);

//       validTimeSlots.forEach(time => {
//         if (["11:45 AM - 12:30 PM", "12:30 PM - 01:15 PM", 
//              "01:15 PM - 01:45 PM"].includes(time)) {
//           remainingSubjects = shuffle([...others, ...difficult]);
//         } else {
//           remainingSubjects = shuffle([...difficult, ...others]);
//         }

//         const shuffledDays = shuffle([...days]);
//         shuffledDays.forEach(day => {
//           if (timetable[cls.name][day].some(entry => entry.time === time)) return;

//           let assigned = false;
//           for (const subject of remainingSubjects) {
//             if (assignSubject(day, time, cls.name, subject, subject.teacher_id)) {
//               assigned = true;
//               break;
//             }
//           }

//           if (!assigned && remainingSubjects.length > 0) {
//             remainingSubjects = shuffle(remainingSubjects);
//             const randomSubject = remainingSubjects[
//               Math.floor(Math.random() * remainingSubjects.length)
//             ];
//             assignSubject(day, time, cls.name, randomSubject, randomSubject.teacher_id);
//           }
//         });
//       });
//     });

//    const responses = await generateTimeTableQueries(timetable, school_id, school_location);
//    console.log(responses);
   
//     res.status(200).json({ success: true, timetable, responses });

//   } catch (error) {
//     console.error("Error generating timetable:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const generateTimetable2 = async (req, res) => {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const breakTimes = ["10:00 AM - 10:30 AM", "12:00 PM - 12:15 PM"];
  const morningSlots = ["08:00 AM - 08:45 AM", "08:45 AM - 09:30 AM", 
                       "09:30 AM - 10:15 AM", "11:00 AM - 11:45 AM"];

  try {
    const { sections, school_location = null, timeSlots } = req.body;
    const school_id = req.user.school_id;

    if (!sections || !timeSlots) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const validTimeSlots = timeSlots.filter(slot => !breakTimes.includes(slot));
    const timetable = {};
    const teacherSchedule = days.reduce((acc, day) => {
      acc[day] = validTimeSlots.reduce((slots, time) => {
        slots[time] = new Set();
        return slots;
      }, {});
      return acc;
    }, {});

    const isTeacherAvailable = (day, time, teacherId) => 
      !teacherSchedule[day][time].has(teacherId);

    const assignSubject = (day, time, className, subject, sectionName) => {
      if (!timetable[className][day].some(e => e.time === time) &&
          isTeacherAvailable(day, time, subject.teacher_id)) {
        timetable[className][day].push({
          time,
          subject: subject.subject,
          teacher_id: subject.teacher_id,
          section: sectionName
        });
        teacherSchedule[day][time].add(subject.teacher_id);
        return true;
      }
      return false;
    };

    for (const section of sections) {
      const { name: sectionName, classes: sectionClasses, subjects } = section;

      // Validate subjects per class
      for (const className of sectionClasses) {
        const classSubjects = subjects.filter(s => s.class === className);
        const teachers = new Set();
        
        // Validate single subject per teacher per class
        for (const subject of classSubjects) {
          if (teachers.has(subject.teacher_id)) {
            return res.status(400).json({
              error: `Teacher ${subject.teacher_id} teaches multiple subjects in ${className}`
            });
          }
          teachers.add(subject.teacher_id);
        }

        // Initialize timetable
        timetable[className] = days.reduce((acc, day) => {
          acc[day] = [];
          return acc;
        }, {});

        // Prepare subjects with remaining periods
        const subjectsWithPeriods = classSubjects.map(s => ({
          ...s,
          remaining: s.periods
        }));

        // Process subjects in priority order
        const priorityOrder = [
          ...subjectsWithPeriods.filter(s => 
            ["Mathematics", "English Language"].includes(s.subject)),
          ...subjectsWithPeriods.filter(s => 
            ["Chemistry", "Physics", "Biology"].includes(s.subject)),
          ...subjectsWithPeriods.filter(s => 
            !["Mathematics", "English Language", "Chemistry", "Physics", "Biology"].includes(s.subject))
        ];

        for (const subject of priorityOrder) {
          while (subject.remaining > 0) {
            let assigned = false;
            const preferredSlots = ["Mathematics", "English Language", "Chemistry", "Physics", "Biology"]
              .includes(subject.subject) ? morningSlots : validTimeSlots;

            // Try preferred slots first
            const shuffledDays = shuffle([...days]);
            for (const day of shuffledDays) {
              const availableSlots = shuffle(
                preferredSlots.filter(time => 
                  validTimeSlots.includes(time) &&
                  !timetable[className][day].some(e => e.time === time))
              );
              
              for (const time of availableSlots) {
                if (assignSubject(day, time, className, subject, sectionName)) {
                  subject.remaining--;
                  assigned = true;
                  break;
                }
              }
              if (assigned) break;
            }

            // Fallback to other slots
            if (!assigned) {
              const fallbackSlots = validTimeSlots.filter(t => !preferredSlots.includes(t));
              const shuffledDays = shuffle([...days]);
              for (const day of shuffledDays) {
                const availableSlots = shuffle(
                  fallbackSlots.filter(time => 
                    !timetable[className][day].some(e => e.time === time))
                );
                for (const time of availableSlots) {
                  if (assignSubject(day, time, className, subject, sectionName)) {
                    subject.remaining--;
                    assigned = true;
                    break;
                  }
                }
                if (assigned) break;
              }
            }

            if (!assigned) {
              console.warn(`Could not assign all periods for ${subject.subject} in ${className}`);
              break;
            }
          }
        }
      }
    }

    await generateTimeTableQueries(timetable, school_id, school_location);
    res.status(200).json({ success: true, timetable });

  } catch (error) {
    console.error("Error generating timetable:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const dashboardQuery = async (req, res) => {
  const {
      query_type = null,
      branch_id = null,
      school_location = null,
      created_by = null,
      start_date = null,
      end_date = null
  } = req.query;

  const userId = req.user?.id;
  const userType = req.user?.user_type || req.headers['x-user-type'];
  const isDeveloper = userType?.toLowerCase() === 'developer';

  console.log('🔍 dashboardQuery called:', {
    query_type,
    userId,
    isDeveloper,
    school_location,
    created_by,
    start_date,
    end_date
  });

  try {
    // Use custom aggregation query ONLY for Developer and SuperAdmin with dashboard-cards
    if (query_type === 'dashboard-cards' && (isDeveloper || userType?.toLowerCase() === 'superadmin')) {
      console.log('✅ Using custom aggregation query for:', userType, 'isDeveloper:', isDeveloper);

      // Build WHERE clause - filter by created_by for non-developers
      let whereClause = '1=1';
      let schoolParams = {};
      
      if (!isDeveloper) {
        whereClause = 'ss.created_by = :created_by';
        schoolParams.created_by = userId;
        console.log('🔒 Filtering by created_by:', userId);
      } else {
        console.log('🌍 No filter - showing all schools');
      }

      const query = `
        SELECT
          COALESCE(SUM(st.student_count), 0) as student_count,
          COALESCE(SUM(st.active_student_count), 0) as active_student_count,
          COALESCE(SUM(st.inactive_student_count), 0) as inactive_student_count,
          COALESCE(SUM(t.teacher_count), 0) as teacher_count,
          COALESCE(SUM(t.active_teacher_count), 0) as active_teacher_count,
          COALESCE(SUM(t.inactive_teacher_count), 0) as inactive_teacher_count,
          COALESCE(SUM(c.class_count), 0) as class_count,
          COALESCE(SUM(c.active_class_count), 0) as active_class_count,
          COALESCE(SUM(c.inactive_class_count), 0) as inactive_class_count,
          COALESCE(SUM(subj.subject_count), 0) as subject_count,
          COALESCE(SUM(subj.active_subject_count), 0) as active_subject_count,
          COALESCE(SUM(subj.inactive_subject_count), 0) as inactive_subject_count,
          COUNT(DISTINCT ss.school_id) as schools_count,
          SUM(CASE WHEN ss.status = 'active' THEN 1 ELSE 0 END) as active_schools_count,
          SUM(CASE WHEN ss.status != 'active' THEN 1 ELSE 0 END) as inactive_schools_count,
          0 as finance_count,
          0 as active_finance_count,
          0 as inactive_finance_count,
          0 as cbt_count,
          0 as active_cbt_count,
          0 as inactive_cbt_count,
          0 as result_count,
          0 as active_result_count,
          0 as inactive_result_count,
          COALESCE(SUM(subs.total_revenue), 0) as total_revenue,
          0 as total_expenses,
          COALESCE(SUM(subs.total_revenue), 0) as total_profit,
          COALESCE(SUM(subs.active_subscriptions), 0) as active_subscriptions,
          COALESCE(SUM(subs.pending_subscriptions), 0) as pending_subscriptions,
          COALESCE(SUM(subs.expired_subscriptions), 0) as expired_subscriptions,
          0 as total_payments
        FROM school_setup ss
        LEFT JOIN (
          SELECT school_id,
            COUNT(*) as student_count,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_student_count,
            SUM(CASE WHEN status != 'active' THEN 1 ELSE 0 END) as inactive_student_count
          FROM students
          GROUP BY school_id
        ) st ON ss.school_id = st.school_id
        LEFT JOIN (
          SELECT school_id,
            COUNT(*) as teacher_count,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_teacher_count,
            SUM(CASE WHEN status != 'active' THEN 1 ELSE 0 END) as inactive_teacher_count
          FROM teachers
          GROUP BY school_id
        ) t ON ss.school_id = t.school_id
        LEFT JOIN (
          SELECT school_id,
            COUNT(*) as class_count,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_class_count,
            SUM(CASE WHEN status != 'active' THEN 1 ELSE 0 END) as inactive_class_count
          FROM classes
          GROUP BY school_id
        ) c ON ss.school_id = c.school_id
        LEFT JOIN (
          SELECT school_id,
            COUNT(*) as subject_count,
            SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_subject_count,
            SUM(CASE WHEN status != 'Active' THEN 1 ELSE 0 END) as inactive_subject_count
          FROM subjects
          GROUP BY school_id
        ) subj ON ss.school_id = subj.school_id
        LEFT JOIN (
          SELECT school_id,
            SUM(CASE WHEN status = 'active' AND payment_status = 'paid' AND subscription_end_date >= CURDATE() THEN 1 ELSE 0 END) as active_subscriptions,
            SUM(CASE WHEN payment_status IN ('pending', 'partial') AND subscription_end_date >= CURDATE() THEN 1 ELSE 0 END) as pending_subscriptions,
            SUM(CASE WHEN subscription_end_date < CURDATE() THEN 1 ELSE 0 END) as expired_subscriptions,
            SUM(CASE WHEN payment_status = 'paid' THEN amount_paid ELSE 0 END) as total_revenue
          FROM school_subscriptions
          WHERE 1=1
            ${start_date && end_date ? `AND created_at BETWEEN '${start_date}' AND '${end_date}'` : ''}
          GROUP BY school_id
        ) subs ON ss.school_id = subs.school_id
        WHERE ${whereClause}
      `;

      console.log('📊 Executing super admin aggregation query...');

      const results = await db.sequelize.query(query, {
        replacements: schoolParams,
        type: db.sequelize.QueryTypes.SELECT,
      });

      console.log('📈 Query results:', JSON.stringify(results, null, 2));
      console.log('📤 Returning data:', JSON.stringify(results, null, 2));

      // Frontend expects an array, so return results (not results[0])
      return res.json({ success: true, data: results });
    }

    // For regular school admins and all other query types, use the stored procedure
    db.sequelize
          .query(
              `call dashboard_query(:query_type,:branch_id,:school_id)`,
              {
                  replacements: {
                      query_type,
                      branch_id: branch_id ?? (req.user.branch_id || ''),
                      school_id: req.user.school_id,
                  },
              }
          )
          .then((results) => res.json({ success: true, data: results }))
          .catch((err) => {
              console.log(err);
              res.status(500).json({ success: false, error: err.message });
          });
  } catch (err) {
    console.error('Error in dashboardQuery:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const manageNoticeBoard = async (req, res) => {
  const {
    query_type,
    id = null,
    title = null,
    description = null,
    content = null,
    status = null,
    priority = 'normal',
    due_date = null,
    publish_date = null,
    category = null,
    audience = null,
    attachments = null,
    created_by = null,
    branch_id = null,
    school_id = null,
  } = req.body;

  try {
    const { getAuditConnection } = require('../config/database');
    const auditDb = await getAuditConnection();
    const notificationTrigger = require('../services/notificationTriggerService');

    if (query_type?.toLowerCase() === 'select') {
      const notices = await auditDb.query(
        `SELECT 
          id, 
          title, 
          description, 
          content,
          status, 
          priority,
          due_date, 
          publish_date as post_date,
          category, 
          audience,
          attachments,
          views_count,
          created_by,
          created_by_name,
          created_at,
          updated_at
         FROM notice_board 
         WHERE school_id = ? AND branch_id = ? 
         ORDER BY created_at DESC`,
        { 
          replacements: [req.user.school_id, req.user.branch_id],
          type: db.Sequelize.QueryTypes.SELECT 
        }
      );
      
      const formattedNotices = notices.map(n => ({
        ...n,
        message_to: n.audience ? JSON.parse(n.audience).join(',') : 'all',
        audience: n.audience ? JSON.parse(n.audience) : ['all'],
        attachments: n.attachments ? JSON.parse(n.attachments) : []
      }));
      
      return res.status(200).json({ success: true, data: formattedNotices });
    }

    if (query_type?.toLowerCase() === 'insert' || query_type?.toLowerCase() === 'create') {
      const uuid = require('crypto').randomUUID();
      
      // Parse message_to field (from frontend)
      let audienceArray = audience;
      if (req.body.message_to) {
        audienceArray = req.body.message_to.split(',').map(a => a.trim());
      }
      
      const audienceJson = audienceArray ? JSON.stringify(audienceArray) : null;
      const attachmentsJson = attachments ? JSON.stringify(attachments) : null;
      const finalStatus = (status === 'active' || status === 'published') ? 'published' : 'draft';

      await auditDb.query(
        `INSERT INTO notice_board 
         (id, title, description, content, status, priority, due_date, publish_date, 
          category, audience, attachments, school_id, branch_id, created_by, created_by_name) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        { 
          replacements: [
            uuid, 
            title, 
            description, 
            content || description, 
            finalStatus, 
            priority, 
            due_date, 
            req.body.post_date || publish_date || new Date(), 
            category || 'Notice', 
            audienceJson, 
            attachmentsJson,
            req.user.school_id, 
            req.user.branch_id, 
            created_by || req.user.id, 
            req.user.name
          ]
        }
      );

      if (finalStatus === 'published' && audienceArray) {
        // Filter out super_admin/superadmin - they only monitor system health
        const filteredAudience = audienceArray.filter(a => 
          !['super_admin', 'superadmin'].includes(a.toLowerCase())
        );

        if (filteredAudience.length === 0) {
          console.log('No valid recipients after filtering super_admin');
          return res.status(200).json({ 
            success: true, 
            message: 'Notice created successfully (no notifications sent)', 
            id: uuid 
          });
        }

        const audienceFilter = filteredAudience.map(a => {
          const lower = a.toLowerCase();
          if (lower === 'student') return 'Student';
          if (lower === 'teacher') return 'Teacher';
          if (lower === 'parent') return 'parent';
          if (lower === 'admin') return 'admin';
          if (lower === 'branchadmin') return 'branchadmin';
          if (lower === 'accountant') return 'accountant';
          if (lower === 'librarian') return 'librarian';
          if (lower === 'receptionist') return 'receptionist';
          return a;
        });

        const recipients = await db.sequelize.query(
          `SELECT id FROM users 
           WHERE school_id = ? AND branch_id = ? 
           AND user_type IN (?)
           AND user_type NOT IN ('super_admin', 'superadmin')`,
          { 
            replacements: [req.user.school_id, req.user.branch_id, audienceFilter],
            type: db.Sequelize.QueryTypes.SELECT 
          }
        );

        console.log(`Found ${recipients.length} recipients for notice notification (super_admin excluded)`);

        if (recipients.length > 0) {
          await notificationTrigger.sendNotification('notice_published', {
            title,
            description,
            category: category || 'Notice',
            due_date,
            school_id: req.user.school_id,
            branch_id: req.user.branch_id,
            link: `/announcements/notice-board`
          }, recipients.map(r => r.id));
        }
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Notice created successfully', 
        id: uuid 
      });
    }

    if (query_type?.toLowerCase() === 'update') {
      await auditDb.query(
        `UPDATE notice_board 
         SET title = ?, description = ?, content = ?, status = ?, priority = ?, 
             due_date = ?, category = ?, audience = ?, attachments = ?
         WHERE id = ? AND school_id = ?`,
        { 
          replacements: [
            title, description, content, status, priority, due_date, category,
            audience ? JSON.stringify(audience) : null,
            attachments ? JSON.stringify(attachments) : null,
            id, req.user.school_id
          ]
        }
      );
      return res.status(200).json({ success: true, message: 'Notice updated successfully' });
    }

    if (query_type?.toLowerCase() === 'delete') {
      await auditDb.query(
        'DELETE FROM notice_board WHERE id = ? AND school_id = ?',
        { replacements: [id, req.user.school_id] }
      );
      return res.status(200).json({ success: true, message: 'Notice deleted successfully' });
    }

    return res.status(400).json({ success: false, error: 'Invalid query_type' });
  } catch (error) {
    console.error('Error in manageNoticeBoard:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const managePrivilages = async (req, res) => {
  const {
    query_type,
    id = null,
    user_id = null,
    user_type = null,
    description=null,
    accessTo = null,
    permissions = null,
    school_id=null
  } = req.body;

  try {
    const result = await db.sequelize.query(
      `CALL managePrivilages(:query_type, :id, :user_id, :user_type,:description, :accessTo, :permissions,:school_id)`,
      {
        replacements: {
          query_type,
          id,
          user_id,
          user_type,
          description,
          accessTo,
          permissions,
          school_id: req.user.school_id??school_id,
        },
      }
    );

    // For SELECT query, result will be an array of rows
    if (query_type?.toLowerCase().includes('select')) {
      return res.status(200).json({ success: true, data: result });
    }

    return res.status(200).json({ success: true, message: 'Operation completed successfully.' });
  } catch (error) {
    console.error('Error in managePrivilages:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const  reportTheme = async(req, res) => {
  try {
    const {
      query_type,
      id=0,
      school_id,
      branch_id,
      theme_name,
      header_size=25,
      primary_color='#003366',
      secondary_color='#FFFFFF',
      tertiary_color='#0000FF',
      watermark_opacity= 0.15,
      watermark_size=400,
      logo_width='85',
      logo_height='85',
    } = req.body;

    const [result] = await connection.execute(
      `CALL report_theme(:query_type,
        :id,
        :school_id,
        :branch_id,
        :theme_name,
        :header_size,
        :primary_color,
        :secondary_color,
        :tertiary_color,
        :watermark_opacity,
        :watermark_size,
        :logo_width,
        :logo_height)`,
     {replacements: {
        query_type,
        id,
        school_id:school_id??req.user.school_id,
        branch_id :branch_id??req.user.branch_id,
        theme_name,
        header_size,
        primary_color,
        secondary_color,
        tertiary_color,
        watermark_opacity,
        watermark_size,
        logo_width,
        logo_height,
      }
    });
    res.json({success:true, data:result});
   
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    await connection.end();
  }
};

module.exports =  {
  libraryCatalogue,
  bookSupplies,
  exam_calendar,
  schoolCalendar,
  taskTodos,
  syllabus,
  syllabusTracker,
  schedule,
  leaveRecords,
  update_exam_calendar,
  generateTimetable,
  generateTimetable2,
  dashboardQuery,
  manageNoticeBoard,
  managePrivilages,
  reportTheme
};
