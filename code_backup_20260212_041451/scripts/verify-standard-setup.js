const db = require('../models');

async function verifyStandardSetup() {
  try {
    console.log('🔍 Verifying Standard Plan Setup...\n');

    // 1. Check Standard Plan in subscription_pricing
    const standardPlans = await db.sequelize.query(`
      SELECT id, pricing_name, base_price_per_student 
      FROM subscription_pricing 
      WHERE pricing_name = 'Standard Plan'
    `, { type: db.Sequelize.QueryTypes.SELECT });

    console.log('📊 Standard Plans Found:');
    standardPlans.forEach(plan => {
      console.log(`  - ID: ${plan.id}, Name: ${plan.pricing_name}, Price: $${plan.base_price_per_student}`);
    });

    // 2. Check Active Schools
    const activeSchools = await db.sequelize.query(`
      SELECT school_id, school_name 
      FROM school_setup 
      WHERE status = 'active'
    `, { type: db.Sequelize.QueryTypes.SELECT });

    console.log(`\n🏫 Active Schools: ${activeSchools.length}`);
    activeSchools.forEach(school => {
      console.log(`  - ${school.school_id}: ${school.school_name}`);
    });

    // 3. Check School Package Assignments
    const schoolPackages = await db.sequelize.query(`
      SELECT rsp.school_id, ss.school_name, sp.pricing_name, rsp.is_active
      FROM rbac_school_packages rsp
      JOIN school_setup ss ON rsp.school_id = ss.school_id
      JOIN subscription_pricing sp ON rsp.package_id = sp.id
      WHERE rsp.is_active = 1
    `, { type: db.Sequelize.QueryTypes.SELECT });

    console.log(`\n📦 School Package Assignments: ${schoolPackages.length}`);
    schoolPackages.forEach(pkg => {
      console.log(`  - ${pkg.school_id} (${pkg.school_name}): ${pkg.pricing_name}`);
    });

    // 4. Summary
    console.log('\n📋 SETUP SUMMARY:');
    console.log(`✅ Standard Plans Created: ${standardPlans.length}`);
    console.log(`✅ Active Schools: ${activeSchools.length}`);
    console.log(`✅ Schools with Standard Plan: ${schoolPackages.length}`);
    
    if (schoolPackages.length === activeSchools.length) {
      console.log('🎉 SUCCESS: All active schools have been assigned to Standard Plan!');
    } else {
      console.log('⚠️  WARNING: Some schools may not have been assigned to Standard Plan');
    }

  } catch (error) {
    console.error('❌ Error verifying setup:', error.message);
  } finally {
    process.exit(0);
  }
}

verifyStandardSetup();
