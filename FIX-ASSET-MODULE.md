MODULE: Asset Management (Frontend + Backend)

GOAL:
Update, enhance, fix, and complete the entire asset management module.  
Use existing tables and code where possible.  
Create new files only when absolutely necessary.  
Document all DB changes in ONE SQL file.

GENERAL RULES:
- Do NOT rewrite entire files unless they are extremely broken.
- Prefer small, targeted fixes over major rewrites.
- Preserve existing table names.
- Only introduce new tables when there is no suitable existing structure.
- Replace ALL mock data with working live API data.
- Follow existing coding style and architecture.
- Add comments where logic is important.
- Create ONE migration/dump file containing all DB fixes.

───────────────────────────────────────────────
FRONTEND FIXES
───────────────────────────────────────────────

1. ASSET REGISTRATION FORM
Fix & improve:
- Ensure all inputs work properly.
- Validate name, category, cost, model, serial_no, condition, location, vendor.
- Add image upload (multiple images).
- Show preview before upload.
- Remove any mock dropdowns.
- Use real API: POST /assets/create, POST /assets/:id/uploadImages.

2. ASSET LIST PAGE
Fix & improve:
- Load assets from real API (GET /assets).
- Pagination or infinite scroll (use existing UI pattern).
- Show image thumbnail if available.
- Status highlights: Working, Under Maintenance, Decommissioned.

3. ASSET DETAILS PAGE
Ensure:
- Loads single asset info from GET /assets/:id.
- Shows images gallery.
- Shows maintenance history via GET /maintenance?asset_id=ID.
- Button: "Create Maintenance Request".

4. MAINTENANCE REQUEST FORM
Fix & enhance:
- Fields: description, priority, attached images.
- Add image upload support.
- POST /maintenance/create
- Auto-update asset status to "Under Maintenance".

5. MAINTENANCE LIST PAGE
Ensure:
- Uses real data from GET /maintenance.
- Status badges: Pending, In Progress, Completed.
- Action buttons to update status.

6. DASHBOARD
Completely fix using real data:
- Total assets
- Breakdown by status (% Working, % Under Maintenance, % Decommissioned)
- Assets nearing end of life
- Monthly maintenance requests count
- High-cost assets
Use new API: GET /dashboard/assetsSummary

───────────────────────────────────────────────
BACKEND FIXES
───────────────────────────────────────────────

1. REST ENDPOINTS (Create or Fix)
Ensure these endpoints are working:

ASSETS:
- POST   /assets/create
- GET    /assets
- GET    /assets/:id
- PATCH  /assets/:id
- POST   /assets/:id/uploadImages

MAINTENANCE:
- POST   /maintenance/create
- GET    /maintenance
- GET    /maintenance/:id
- PATCH  /maintenance/:id/updateStatus

DASHBOARD:
- GET /dashboard/assetsSummary

2. BUSINESS LOGIC
Fix:
- Asset status updates automatically when maintenance is created.
- When maintenance is Completed → set asset back to Working.
- Validate all fields.
- Add proper error messages.
- Use existing asset tables where possible.

3. IMAGE HANDLING
Add:
- Multer upload (or adapt existing uploader).
- Save file paths in asset_images table.
- For maintenance, save into maintenance_images.

───────────────────────────────────────────────
DATABASE CHANGES (DOCUMENT IN ONE FILE)
───────────────────────────────────────────────

Create ONE SQL file:

`asset_module_updates.sql`

It should include:

A. New tables only if necessary:
- asset_images (if not existing)
- maintenance_requests (if not existing)
- maintenance_images (if not existing)

B. Missing columns for existing tables:
- assets: add “expected_life”, “vendor”, “condition”, “location” (ONLY if missing)
- assets: ensure status has valid enum: Working, Under Maintenance, Decommissioned

C. Indexes and constraints.

D. Sample minimal production-safe seed (optional).

IMPORTANT:
- Do NOT duplicate tables that already exist.
- Only add columns if the table doesn’t have them.
- Use ALTER TABLE instead of creating new tables when possible.

───────────────────────────────────────────────
OUTPUT EXPECTATIONS
───────────────────────────────────────────────

AI should:

1. Update all existing components/files.
2. Create new files ONLY if required.
3. Replace all mock data with real API calls.
4. Ensure API endpoints fully work.
5. Generate 1 SQL file containing all DB alterations.
6. Ensure module is fully functional end-to-end.
7. Provide a summary of what was changed.
