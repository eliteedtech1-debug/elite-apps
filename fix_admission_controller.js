// Quick fix for AdmissionBranchController.js
// Replace the INSERT query in submitPublicApplication method (around line 250)

// BEFORE (line 250-277):
/*
await db.sequelize.query(
  `INSERT INTO school_applicants (
    applicant_id, application_no, school_id, branch_id, parent_id, name_of_applicant, date_of_birth, sex,
    home_address, state_of_origin, l_g_a, last_school_attended, last_class,
    special_health_needs, parent_name, parent_phone, parent_address,
    class, status, date
  ) VALUES (
    :applicant_id, :application_no, :school_id, :branch_id, '', :name_of_applicant, :date_of_birth, :sex,
    :home_address, :state_of_origin, :l_g_a, :last_school_attended, :last_class,
    :special_health_needs, :parent_name, :parent_phone, :parent_address,
    :class_name, 'submitted', CURDATE()
  )`,
*/

// AFTER (FIXED VERSION):
try {
  await db.sequelize.query(
    `INSERT INTO school_applicants (
      applicant_id, application_no, school_id, branch_id, parent_id, name_of_applicant, date_of_birth, sex,
      home_address, state_of_origin, l_g_a, last_school_attended, last_class,
      special_health_needs, parent_fullname, parent_phone, parent_address,
      class, status, date
    ) VALUES (
      :applicant_id, :application_no, :school_id, :branch_id, '', :name_of_applicant, :date_of_birth, :sex,
      :home_address, :state_of_origin, :l_g_a, :last_school_attended, :last_class,
      :special_health_needs, :parent_fullname, :parent_phone, :parent_address,
      :class_name, 'submitted', CURDATE()
    )`,
    { 
      replacements: {
        applicant_id,
        application_no,
        school_id,
        branch_id,
        name_of_applicant: applicationData.name_of_applicant || '',
        date_of_birth: applicationData.date_of_birth || null,
        sex: applicationData.gender || '',
        home_address: applicationData.home_address || '',
        state_of_origin: applicationData.state_of_origin || '',
        l_g_a: applicationData.l_g_a || '',
        last_school_attended: applicationData.last_school_attended || '',
        last_class: applicationData.last_class || '',
        special_health_needs: applicationData.special_health_needs || '',
        parent_fullname: applicationData.parent_fullname || '', // Changed from parent_name
        parent_phone: applicationData.parent_phone || '',
        parent_address: applicationData.parent_address || '',
        class_name: applicationData.class_id ? String(applicationData.class_id) : ''
      }
    }
  );
} catch (insertError) {
  // Fallback: try with parent_name if parent_fullname fails
  if (insertError.message.includes('parent_fullname')) {
    await db.sequelize.query(
      `INSERT INTO school_applicants (
        applicant_id, application_no, school_id, branch_id, parent_id, name_of_applicant, date_of_birth, sex,
        home_address, state_of_origin, l_g_a, last_school_attended, last_class,
        special_health_needs, parent_name, parent_phone, parent_address,
        class, status, date
      ) VALUES (
        :applicant_id, :application_no, :school_id, :branch_id, '', :name_of_applicant, :date_of_birth, :sex,
        :home_address, :state_of_origin, :l_g_a, :last_school_attended, :last_class,
        :special_health_needs, :parent_name, :parent_phone, :parent_address,
        :class_name, 'submitted', CURDATE()
      )`,
      { 
        replacements: {
          applicant_id,
          application_no,
          school_id,
          branch_id,
          name_of_applicant: applicationData.name_of_applicant || '',
          date_of_birth: applicationData.date_of_birth || null,
          sex: applicationData.gender || '',
          home_address: applicationData.home_address || '',
          state_of_origin: applicationData.state_of_origin || '',
          l_g_a: applicationData.l_g_a || '',
          last_school_attended: applicationData.last_school_attended || '',
          last_class: applicationData.last_class || '',
          special_health_needs: applicationData.special_health_needs || '',
          parent_name: applicationData.parent_fullname || '', // Map parent_fullname to parent_name
          parent_phone: applicationData.parent_phone || '',
          parent_address: applicationData.parent_address || '',
          class_name: applicationData.class_id ? String(applicationData.class_id) : ''
        }
      }
    );
  } else {
    throw insertError;
  }
}
