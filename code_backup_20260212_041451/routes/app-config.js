const { Op } = require("sequelize");
const db = require("../models");
const { SchoolSetup, Role, sequelize } = db;

const { authenticate, authorize } = require('../middleware/auth');
// ==================== FEATURE CATEGORIES API ====================
module.exports = (app) => {


    // Get all schools with their roles
    app.get('/schools', authenticate, async (req, res) => {
        try {
            const { query_type } = req.query;

            if (query_type === 'getAllWithRoles') {
                const schools = await SchoolSetup.findAll({
                    include: [{
                        model: Role,
                        as: 'roles',
                        where: { school_id: sequelize.col('SchoolSetup.school_id') },
                        required: false
                    }]
                });

                res.json({ success: true, data: schools });
            } else {
                const schools = await SchoolSetup.findAll();
                res.json({ success: true, data: schools });
            }
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Get school by ID with URL
    app.get('/schools/:school_id/url', authenticate, async (req, res) => {
        try {
            const { school_id } = req.params;
            const school = await SchoolSetup.findByPk(school_id);

            if (!school) {
                return res.status(404).json({ success: false, message: 'School not found' });
            }

            const schoolUrl = `https://${school.short_name.toLowerCase()}.elite-edu.com`;
            res.json({ success: true, url: schoolUrl });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Create new school
    // COMMENTED OUT: Conflicts with /school-setup in school_creation.js
    // Use school_creation.js route instead which handles both school creation and attendance settings
    /*
    app.post('/school-setup', authenticate, async (req, res) => {
        try {
            const payload = req.body;
            const { school_id } = payload;

            // Create school
            const school = await SchoolSetup.create({
                school_id: payload.school_id,
                school_name: payload.school_name,
                short_name: payload.short_name,
                school_motto: payload.school_motto,
                state: payload.state,
                lga: payload.lga,
                address: payload.address,
                primary_contact_number: payload.primary_contact_number,
                secondary_contact_number: payload.secondary_contact_number,
                email_address: payload.email_address,
                status: 'Active',
                total_users: 1 // Initial admin user
            });

            // Create roles for the new school based on default roles
            const defaultRoles = await Role.findAll({
                where: { school_id: '' } // Empty school_id indicates default roles
            });

            const rolesToCreate = defaultRoles.map(role => ({
                user_type: role.user_type,
                description: role.description,
                accessTo: role.accessTo,
                permissions: role.permissions,
                school_id: school_id
            }));

            await Role.bulkCreate(rolesToCreate);

            res.json({ success: true, message: 'School setup created successfully', school_id: school_id });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });
    */

    // GET /roles?query_type=...
    app.get("/roles", authenticate, async (req, res) => {
        try {
            const { query_type, school_id } = req.query;

            switch (query_type) {
                // === GET STATS ===
                case "getStats": {
                    const categories = await db.FeatureCategory.count();
                    const features = await db.Feature.count();

                    // distinct user types
                    const userTypes = await db.Role.count({
                        distinct: true,
                        col: "user_type",
                    });

                    // permissions count
                    const roles = await db.Role.findAll({
                        attributes: ["permissions"],
                        where: { permissions: { [Op.ne]: null } },
                    });

                    const permissionCount = roles.reduce((acc, r) => {
                        const perms = r.permissions ? r.permissions.split(",") : [];
                        return acc + perms.length;
                    }, 0);

                    // distribution
                    const distribution = await db.FeatureCategory.findAll({
                        include: [{ model: db.Feature, as: "features", attributes: ["id"] }],
                    });

                    const featureDistribution = distribution.map((cat) => ({
                        category_name: cat.category_name,
                        color: cat.color,
                        feature_count: cat.features.length,
                    }));

                    return res.json({
                        success: true,
                        data: {
                            totals: { categories, features, userTypes, permissions: permissionCount },
                            featureDistribution,
                        },
                    });
                }

                // === GET CATEGORIES ===
                case "getCategories": {
                    const categories = await db.FeatureCategory.findAll({
                        include: [
                            { model: db.Feature, as: "features", attributes: ["id"] },
                        ],
                        order: [["display_order", "ASC"]],
                    });

                    const formatted = categories.map((c) => ({
                        id: c.id,
                        category_name: c.category_name,
                        color: c.color,
                        description: c.description,
                        display_order: c.display_order,
                        feature_count: c.features.length,
                        type: c.display_order <= 3 ? "core" : "premium", // you can adjust this
                    }));

                    return res.json({ success: true, data: formatted });
                }

                // === GET FEATURES ===
                case "getFeatures": {
                    try {
                        const [features] = await db.sequelize.query(`
                        SELECT 
                            f.id,
                            f.feature_key,
                            f.feature_name,
                            f.description,
                            f.category_id,
                            c.category_name,
                            c.color
                        FROM features f
                        LEFT JOIN feature_categories c ON f.category_id = c.id
                        ORDER BY f.feature_name ASC
                        `);

                        const formatted = features.map((f) => ({
                            id: f.id,
                            feature_key: f.feature_key,
                            feature_name: f.feature_name,
                            description: f.description,
                            category_id: f.category_id || null,
                            category_name: f.category_name || "Uncategorized",
                            category_color: f.color || "#1677ff",
                            requiredAccess: [f.feature_key],
                        }));

                        return res.json({ success: true, data: formatted });
                    } catch (err) {
                        console.error("Error in getFeatures:", err);
                        return res.status(500).json({
                            success: false,
                            message: "Server error",
                            error: err.message,
                        });
                    }
                }


                // === GET USER TYPES ===
                case "getUserTypes": {
                    const roles = await db.Role.findAll();

                    const formatted = roles.map((r) => ({
                        id: r.role_id,
                        type_key: r.user_type.toLowerCase(),
                        type_name: r.user_type,
                        description: r.description,
                        permission_count: r.permissions ? r.permissions.split(",").length : 0,
                    }));

                    return res.json({ success: true, data: formatted });
                }

                // === SELECT ROLES BY SCHOOL ===
                case "select": {
                    if (!school_id) {
                        return res.status(400).json({ success: false, message: "school_id is required" });
                    }

                    const roles = await db.Role.findAll({
                        where: { school_id },
                    });

                    return res.json({ success: true, data: roles });
                }

                case "getPermissions": {
                    try {
                        // 1. Get all roles
                        const [roles] = await db.sequelize.query(`
                            SELECT role_id, user_type, description
                            FROM roles
                            ORDER BY user_type ASC
                            `);

                        // 2. Get role → features → permissions
                        const [rolePerms] = await db.sequelize.query(`
                            SELECT 
                                rp.role_id,
                                p.permission_id AS id,
                                p.permission_key,
                                p.permission_name,
                                p.description,
                                p.feature_id,
                                f.feature_key,
                                f.feature_name,
                                f.description AS feature_description
                            FROM role_permissions rp
                            INNER JOIN features f ON rp.feature_id = f.id
                            INNER JOIN permissions p ON p.feature_id = f.id
                            ORDER BY rp.role_id, p.permission_key
                            `);

                        // 3. Group permissions by role
                        const byRole = roles.map(r => {
                            const perms = rolePerms.filter(rp => rp.role_id === r.role_id);
                            return {
                                id: r.role_id,
                                type_key: r.user_type,
                                type_name: r.user_type,
                                description: r.description,
                                permissions: perms.map(p => ({
                                    id: p.id,
                                    permission_key: p.permission_key,
                                    permission_name: p.permission_name,
                                    description: p.description,
                                    feature_id: p.feature_id,
                                    feature: p.feature_id ? {
                                        id: p.feature_id,
                                        feature_key: p.feature_key,
                                        feature_name: p.feature_name,
                                        description: p.feature_description
                                    } : null
                                })),
                                permission_count: perms.length
                            };
                        });

                        // 4. Unique flattened permissions
                        const seen = new Set();
                        const allPermissions = [];
                        for (const r of byRole) {
                            for (const p of r.permissions) {
                                if (!seen.has(p.id)) {
                                    seen.add(p.id);
                                    allPermissions.push(p);
                                }
                            }
                        }

                        return res.json({
                            success: true,
                            data: {
                                byRole,
                                all: allPermissions
                            }
                        });
                    } catch (err) {
                        console.error("Error in getPermissions:", err);
                        return res.status(500).json({
                            success: false,
                            message: "Server error",
                            error: err.message,
                        });
                    }
                }

                default:
                    return res.status(400).json({ success: false, message: "Invalid query_type" });
            }
        } catch (err) {
            console.error("Error fetching roles:", err);
            res.status(500).json({ success: false, message: "Server error", error: err.message });
        }
    });

}