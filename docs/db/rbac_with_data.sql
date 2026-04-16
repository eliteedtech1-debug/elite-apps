-- MariaDB dump 10.19  Distrib 10.4.28-MariaDB, for osx10.10 (x86_64)
--
-- Host: localhost    Database: elite_test_db
-- ------------------------------------------------------
-- Server version	10.4.28-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `rbac_menu_items`
--

DROP TABLE IF EXISTS `rbac_menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rbac_menu_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `parent_id` int(11) DEFAULT NULL,
  `label` varchar(100) NOT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `link` varchar(255) DEFAULT NULL,
  `required_access` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`required_access`)),
  `required_permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`required_permissions`)),
  `sort_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `feature` varchar(50) DEFAULT NULL,
  `premium` tinyint(1) DEFAULT 0,
  `elite` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `parent_id` (`parent_id`),
  CONSTRAINT `rbac_menu_items_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `rbac_menu_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1072 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rbac_menu_items`
--

LOCK TABLES `rbac_menu_items` WRITE;
/*!40000 ALTER TABLE `rbac_menu_items` DISABLE KEYS */;
INSERT INTO `rbac_menu_items` (`id`, `parent_id`, `label`, `icon`, `link`, `required_access`, `required_permissions`, `sort_order`, `is_active`, `feature`, `premium`, `elite`, `created_at`, `updated_at`) VALUES (1,NULL,'Personal Data Mngr','ti ti-users','',NULL,NULL,1,1,'core',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(2,1,'Students List','ti ti-school',NULL,NULL,NULL,1,1,'core',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(3,2,'Student List','ti ti-list','/student/student-list',NULL,NULL,1,1,'core',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(4,2,'Class List','ti ti-list','/academic/class-list',NULL,NULL,2,1,'core',0,0,'2025-12-25 19:23:23','2026-01-02 22:34:56'),(5,2,'Promotion & Graduation','fa fa-table','/students/promotion',NULL,NULL,3,1,'academic',0,0,'2025-12-25 19:23:23','2026-01-02 22:34:41'),(6,1,'Admission','ti ti-user-plus',NULL,NULL,NULL,2,1,'admission',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(7,6,'Dashboard','ti ti-dashboard','/admissions/dashboard',NULL,NULL,1,1,'admission',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(8,6,'Applications','ti ti-file-text','/admissions/applications',NULL,NULL,2,1,'admission',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(9,107,'Parent List','ti ti-user-bolt','/parents/parent-list',NULL,NULL,3,1,'core',0,0,'2025-12-25 19:23:23','2025-12-28 14:40:24'),(10,109,'Staff List','ti ti-users','/teacher/teacher-list',NULL,NULL,4,1,'core',0,0,'2025-12-25 19:23:23','2025-12-28 14:51:07'),(11,1,'Student Attendance','ti ti-calendar-check',NULL,NULL,NULL,5,1,'attendance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(12,11,'Reports 📊','ti ti-chart-bar','/attendance/dashboard',NULL,NULL,1,1,'attendance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(13,11,'Mark Attendance','ti ti-school','/academic/attendance-register',NULL,NULL,2,1,'attendance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(14,106,'Mark Attendance','ti ti-id-badge','/hrm/staff-attendance',NULL,NULL,3,1,'attendance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(15,106,'Reports 📊','ti ti-users','/hrm/staff-attendance-overview',NULL,NULL,4,1,'attendance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(16,NULL,'Class Management',NULL,NULL,NULL,NULL,2,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(17,16,'Daily Routine','fa fa-gears',NULL,NULL,NULL,1,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(18,17,'Class Time Table','ti ti-table','/academic/class-time-table',NULL,NULL,1,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(19,17,'Class Attendance','ti ti-id-badge','/academic/attendance-register',NULL,NULL,2,1,'attendance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(20,17,'Lessons','ti ti-book','/academic/tearcher-lessons',NULL,NULL,3,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(21,1070,'Syllabus & Curriculum','ti ti-clipboard-list','/academic/syllabus',NULL,NULL,4,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-29 13:13:59'),(22,17,'Assignments','ti ti-license','/academic/class-assignment',NULL,NULL,5,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(23,16,'Teaching Tools','fa fa-gears',NULL,NULL,NULL,2,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(24,23,'Virtual Class','ti ti-receipt','/application/video-call',NULL,NULL,1,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(25,23,'Lesson Planning','ti ti-book','/academic/teacher/lesson-planning',NULL,NULL,2,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(26,23,'Syllabus','ti ti-dashboard','/class/syllabus',NULL,NULL,3,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(27,129,'Announcements','ti ti-clock','',NULL,NULL,3,1,'communication',0,0,'2025-12-25 19:23:23','2025-12-28 23:24:37'),(29,27,'Notice Board','ti ti-receipt','/announcements/notice-board',NULL,NULL,0,1,'communication',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(30,NULL,'My Children','ti ti-users','',NULL,NULL,4,1,'parent',0,0,'2025-12-25 19:23:23','2025-12-28 14:56:31'),(31,30,'Bills / School Fees','ti ti-receipt','/parent/studentpayment',NULL,NULL,1,1,'parent',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(32,NULL,'My School Activities','ti ti-clock','',NULL,NULL,5,1,'student',0,0,'2025-12-25 19:23:23','2025-12-28 14:57:22'),(33,32,'My Attendances','ti ti-id-badge','/academic/student-attendance',NULL,NULL,1,1,'attendance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(34,32,'Class Time Table','ti ti-table','/academic/student-time-table',NULL,NULL,2,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(35,32,'Lessons','ti ti-book','/academic/lessons',NULL,NULL,3,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(36,32,'My Assignments','ti ti-license','/academic/student-assignments',NULL,NULL,4,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(37,NULL,'General Setups',NULL,NULL,NULL,NULL,6,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(38,37,'School Setup','fa fa-gears',NULL,NULL,NULL,1,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(39,38,'Academic Calendar','ti ti-calendar','/school-setup/academic-year-setup',NULL,NULL,1,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(42,38,'School Branches','ti ti-building','/school-setup/branches',NULL,NULL,4,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(43,38,'School Sections','ti ti-section','/school-setup/section-form',NULL,NULL,5,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(44,38,'Classes Setup','ti ti-classes','/academic/classes-setup',NULL,NULL,6,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(45,38,'Subjects Setup','ti ti-book','/academic/subjects',NULL,NULL,7,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(46,38,'Personal Dev. Setup','ti ti-book','/academic/character-subjects',NULL,NULL,8,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(47,38,'Assessment Setup','ti ti-book','/academic/ca-setup',NULL,NULL,9,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(48,38,'Time Table','ti ti-table','/simple-timetable',NULL,NULL,10,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(49,38,'Communication Setup','ti ti-message-circle','/communication/setup',NULL,NULL,11,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(50,NULL,'Exams & Records',NULL,NULL,NULL,NULL,7,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(51,50,'Examinations','ti ti-certificate',NULL,NULL,NULL,1,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(52,51,'Assessment Form','fa fa-clipboard-list','/academic/assessments',NULL,NULL,1,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(53,51,'FormMaster Review','fa fa-clipboard-list','/academic/formmaster-score-sheet',NULL,NULL,2,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(54,51,'Reports Generator','fa fa-file-alt','/academic/reports/Exam',NULL,NULL,3,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(55,51,'Broad Sheet','fa fa-table','/academic/broad-sheet',NULL,NULL,4,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(56,51,'Exam Analytics','fa fa-chart-bar','/academic/exam-analytics',NULL,NULL,5,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(57,51,'Report Template','fa fa-cog','/academic/report-configuration',NULL,NULL,6,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(58,51,'CA/Exam Setup','fa fa-cogs','/examinations/ca-setup',NULL,NULL,7,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(59,51,'Submit Questions','fa fa-upload','/examinations/submit-questions',NULL,NULL,8,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(60,51,'Moderation','fa fa-check-circle','/examinations/moderation',NULL,NULL,9,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(61,51,'Print Questions','fa fa-print','/examinations/print-questions',NULL,NULL,10,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(62,51,'Progress Tracking','fa fa-tasks','/examinations/progress',NULL,NULL,11,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(63,NULL,'Super Admin',NULL,NULL,NULL,NULL,8,1,'admin',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(64,63,'Create School',NULL,'/school-setup/add-school',NULL,NULL,1,1,'admin',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(65,63,'School List',NULL,'/school-setup/school-list',NULL,NULL,2,1,'admin',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(66,63,'Support Dashboard',NULL,'/support/superadmin-dashboard',NULL,NULL,3,1,'admin',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(67,63,'Queue Dashboard','ti ti-list-check','/superadmin/queues',NULL,NULL,4,1,'admin',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(68,63,'School Access Management',NULL,'/school-access-management',NULL,NULL,5,1,'admin',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(69,63,'App Configurations',NULL,'/app/configurations',NULL,NULL,6,1,'admin',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(70,NULL,'Express Finance',NULL,NULL,NULL,NULL,9,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(71,70,'Finance Report','ti ti-chart-bar','/management/finance/report',NULL,NULL,1,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(72,70,'Bank Accounts','ti ti-building-bank','/management/finance/bank-accounts',NULL,NULL,2,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(73,70,'School Fees','ti ti-coin',NULL,NULL,NULL,3,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(74,73,'Fees Setup','ti ti-settings','/management/student-fees',NULL,NULL,1,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(75,73,'Single Billing','ti ti-receipt','/management/collect-fees',NULL,NULL,2,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(76,73,'Single Payments','ti ti-cash','/management/receipt-classes',NULL,NULL,3,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(77,73,'Family Billing','ti ti-users','/management/family-billing',NULL,NULL,4,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(78,73,'Family Payments','ti ti-wallet','/parent/parentpayments',NULL,NULL,5,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(79,70,'Income & Expenses','ti ti-coin',NULL,NULL,NULL,4,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(80,79,'Income Reports','ti ti-arrow-up','/accounts/income-report',NULL,NULL,1,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(81,79,'Expenses Reports','ti ti-arrow-down','/accounts/expesnes/new',NULL,NULL,2,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(82,79,'Profit and Loss','ti ti-chart-dots','/accounts/profit/report',NULL,NULL,3,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(83,70,'Payroll','ti ti-briefcase',NULL,NULL,NULL,5,1,'hr',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(84,83,'Staff Management','ti ti-users-group','/payroll/staff-payroll',NULL,NULL,1,1,'hr',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(85,83,'Salary Structure','ti ti-list-tree','/payroll/structure',NULL,NULL,2,1,'hr',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(86,83,'Allowance & Deductions','ti ti-percentage','/payrol/Allowances/deductions',NULL,NULL,3,1,'hr',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(87,83,'Loan Management','ti ti-credit-card','/payroll/loan-management',NULL,NULL,4,1,'hr',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(88,83,'Salary Disbursement','ti ti-transfer','/payroll/salary-disbursement',NULL,NULL,5,1,'hr',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(89,83,'Salary Report','ti ti-report','/payroll/salary-report',NULL,NULL,6,1,'hr',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(90,NULL,'Supply Management',NULL,NULL,NULL,NULL,10,1,'inventory',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(91,90,'Asset Management','ti ti-package',NULL,NULL,NULL,1,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(92,91,'Asset Dashboard','ti ti-dashboard','/supply-management/asset/dashboard',NULL,NULL,1,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(93,91,'Asset Inventory','ti ti-list','/supply-management/asset/inventory',NULL,NULL,2,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(94,91,'Asset Categories','ti ti-category','/supply-management/asset/categories',NULL,NULL,3,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(95,91,'Facility Rooms','ti ti-home','/supply-management/asset/facility-rooms',NULL,NULL,4,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(96,91,'Asset Inspections','ti ti-checklist','/supply-management/asset/inspections',NULL,NULL,5,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(97,91,'Maintenance Requests','ti ti-wrench','/supply-management/asset/maintenance-requests',NULL,NULL,6,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(98,91,'Asset Transfers','ti ti-transfer','/supply-management/asset/transfers',NULL,NULL,7,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(99,90,'Inventory Management','ti ti-shopping-cart',NULL,NULL,NULL,2,1,'inventory',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(100,99,'Inventory Dashboard','ti ti-dashboard','/supply-management/inventory/dashboard',NULL,NULL,1,1,'inventory',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(101,99,'Product Catalog','ti ti-list','/supply-management/inventory/products',NULL,NULL,2,1,'inventory',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(102,99,'Stock Management','ti ti-stack','/supply-management/inventory/stock',NULL,NULL,3,1,'inventory',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(103,99,'Purchase Orders','ti ti-file-invoice','/supply-management/inventory/purchase-orders',NULL,NULL,4,1,'inventory',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(104,99,'Sales Transactions','ti ti-shopping-cart','/supply-management/inventory/sales',NULL,NULL,5,1,'inventory',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(105,99,'Suppliers','ti ti-truck','/supply-management/inventory/suppliers',NULL,NULL,6,1,'inventory',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(106,1,'Staff Attendance','ti ti-id-badge',NULL,NULL,NULL,12,1,'hr',0,0,'2025-12-25 21:58:07','2025-12-27 10:05:52'),(107,1,'Parents','ti ti-users',NULL,NULL,NULL,0,1,NULL,0,0,'2025-12-28 14:38:48','2025-12-28 14:38:48'),(108,107,'Add Parent','ti ti-user-plus','/parents/parent-list?action=add',NULL,NULL,0,1,NULL,0,0,'2025-12-28 14:46:21','2025-12-28 14:50:00'),(109,1,'Staff ','ti ti-users','',NULL,NULL,0,1,NULL,0,0,'2025-12-28 14:50:50','2025-12-28 14:51:18'),(110,109,'Add Staff ','ti ti-user-plus','/teacher/add-teacher',NULL,NULL,0,1,NULL,0,0,'2025-12-28 14:54:05','2025-12-28 14:54:05'),(111,129,'Communications','ti ti-message-circle',NULL,NULL,NULL,25,1,'communication',0,0,'2025-12-28 21:05:57','2025-12-28 23:24:37'),(112,111,'Dashboard','ti ti-dashboard','/communications/dashboard',NULL,NULL,1,1,'communication',0,0,'2025-12-28 21:05:57','2025-12-28 21:05:57'),(113,111,'Sent Messages','ti ti-send','/communications/sent-messages',NULL,NULL,2,1,'communication',0,0,'2025-12-28 21:05:57','2025-12-28 21:05:57'),(114,111,'Configuration','ti ti-settings','/communication/setup',NULL,NULL,3,1,'communication',0,0,'2025-12-28 21:05:57','2025-12-28 21:05:57'),(115,27,'System Notifications','ti ti-bell','/system/notifications',NULL,NULL,2,1,'communication',0,0,'2025-12-28 21:12:42','2025-12-28 21:12:42'),(117,17,'My Teaching Hub','ti ti-dashboard','/academic/teacher-syllabus-hub',NULL,NULL,25,1,NULL,0,0,'2025-12-28 23:12:53','2025-12-28 23:12:53'),(118,1070,'Create Lesson Plan','ti ti-plus','/academic/lesson-plan-creator',NULL,NULL,26,1,NULL,0,0,'2025-12-28 23:12:53','2025-12-31 21:40:09'),(119,1070,'Browse Curriculum','ti ti-search','/academic/curriculum-browser',NULL,NULL,27,1,NULL,0,0,'2025-12-28 23:12:53','2025-12-29 13:14:26'),(120,17,'Generate Assessment','ti ti-clipboard-check','/academic/assessment-generator',NULL,NULL,28,1,NULL,0,0,'2025-12-28 23:12:53','2025-12-28 23:12:53'),(121,1070,'Subject Mapping','ti ti-link','/academic/subject-mapping',NULL,NULL,29,1,NULL,0,0,'2025-12-28 23:12:53','2025-12-29 13:14:16'),(122,38,'Subject Mapping','ti ti-link','/academic/subject-mapping',NULL,NULL,150,1,NULL,0,0,'2025-12-28 23:12:53','2025-12-28 23:12:53'),(129,NULL,'Messaging','ti ti-messages',NULL,NULL,NULL,26,1,'communication',0,0,'2025-12-28 23:24:37','2025-12-28 23:25:40'),(1068,1070,'Syllabus Dashboard','ti ti-clipboard-list','/developer/syllabus-dashboard',NULL,NULL,30,1,NULL,0,0,'2025-12-29 00:35:07','2025-12-29 13:14:20'),(1069,63,'Syllabus Scraping Dashboard','ti ti-robot','/developer/syllabus-scraping-dashboard',NULL,NULL,160,1,NULL,0,0,'2025-12-29 00:35:07','2025-12-29 00:35:07'),(1070,16,'Syllabus','ti ti-book',NULL,NULL,NULL,0,1,NULL,0,0,'2025-12-29 13:13:27','2025-12-29 13:13:27'),(1071,2,'ID Card Generator','ti ti-id-badge','/student/id-card-generator',NULL,NULL,40,1,NULL,0,0,'2026-01-02 22:31:46','2026-01-02 22:31:46');
/*!40000 ALTER TABLE `rbac_menu_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rbac_menu_access`
--

DROP TABLE IF EXISTS `rbac_menu_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rbac_menu_access` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `menu_item_id` int(11) NOT NULL,
  `user_type` varchar(50) NOT NULL,
  `valid_from` date DEFAULT NULL,
  `valid_until` date DEFAULT NULL,
  `school_id` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_menu_access` (`menu_item_id`,`user_type`),
  KEY `idx_menu_access_usertype` (`user_type`),
  KEY `idx_validity` (`valid_from`,`valid_until`),
  KEY `idx_school` (`school_id`),
  CONSTRAINT `rbac_menu_access_ibfk_1` FOREIGN KEY (`menu_item_id`) REFERENCES `rbac_menu_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=666 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rbac_menu_access`
--

LOCK TABLES `rbac_menu_access` WRITE;
/*!40000 ALTER TABLE `rbac_menu_access` DISABLE KEYS */;
INSERT INTO `rbac_menu_access` (`id`, `menu_item_id`, `user_type`, `valid_from`, `valid_until`, `school_id`) VALUES (110,6,'admin',NULL,NULL,NULL),(111,6,'branchadmin',NULL,NULL,NULL),(112,7,'admin',NULL,NULL,NULL),(113,7,'branchadmin',NULL,NULL,NULL),(114,8,'admin',NULL,NULL,NULL),(115,8,'branchadmin',NULL,NULL,NULL),(118,10,'admin',NULL,NULL,NULL),(119,10,'branchadmin',NULL,NULL,NULL),(120,11,'admin',NULL,NULL,NULL),(121,11,'branchadmin',NULL,NULL,NULL),(122,11,'teacher',NULL,NULL,NULL),(123,12,'admin',NULL,NULL,NULL),(124,12,'branchadmin',NULL,NULL,NULL),(125,13,'admin',NULL,NULL,NULL),(126,13,'branchadmin',NULL,NULL,NULL),(127,13,'teacher',NULL,NULL,NULL),(128,14,'admin',NULL,NULL,NULL),(129,14,'branchadmin',NULL,NULL,NULL),(130,15,'admin',NULL,NULL,NULL),(131,15,'branchadmin',NULL,NULL,NULL),(144,20,'admin',NULL,NULL,NULL),(145,20,'branchadmin',NULL,NULL,NULL),(146,20,'teacher',NULL,NULL,NULL),(147,21,'admin',NULL,NULL,NULL),(148,21,'branchadmin',NULL,NULL,NULL),(149,21,'teacher',NULL,NULL,NULL),(150,22,'admin',NULL,NULL,NULL),(151,22,'branchadmin',NULL,NULL,NULL),(152,22,'teacher',NULL,NULL,NULL),(153,23,'teacher',NULL,NULL,NULL),(154,24,'teacher',NULL,NULL,NULL),(155,25,'teacher',NULL,NULL,NULL),(156,26,'admin',NULL,NULL,NULL),(157,26,'branchadmin',NULL,NULL,NULL),(168,31,'parent',NULL,NULL,NULL),(170,33,'student',NULL,NULL,NULL),(171,34,'student',NULL,NULL,NULL),(172,35,'student',NULL,NULL,NULL),(173,36,'student',NULL,NULL,NULL),(185,42,'admin',NULL,NULL,NULL),(186,43,'admin',NULL,NULL,NULL),(187,43,'branchadmin',NULL,NULL,NULL),(198,49,'admin',NULL,NULL,NULL),(229,63,'superadmin',NULL,NULL,NULL),(231,64,'superadmin',NULL,NULL,NULL),(232,65,'superadmin',NULL,NULL,NULL),(233,66,'superadmin',NULL,NULL,NULL),(234,67,'superadmin',NULL,NULL,NULL),(237,70,'admin',NULL,NULL,NULL),(238,70,'branchadmin',NULL,NULL,NULL),(239,71,'admin',NULL,NULL,NULL),(240,71,'branchadmin',NULL,NULL,NULL),(241,72,'admin',NULL,NULL,NULL),(242,72,'branchadmin',NULL,NULL,NULL),(243,73,'admin',NULL,NULL,NULL),(244,73,'branchadmin',NULL,NULL,NULL),(245,74,'admin',NULL,NULL,NULL),(246,74,'branchadmin',NULL,NULL,NULL),(247,75,'admin',NULL,NULL,NULL),(248,75,'branchadmin',NULL,NULL,NULL),(249,76,'admin',NULL,NULL,NULL),(250,76,'branchadmin',NULL,NULL,NULL),(251,77,'admin',NULL,NULL,NULL),(252,77,'branchadmin',NULL,NULL,NULL),(253,78,'admin',NULL,NULL,NULL),(254,78,'branchadmin',NULL,NULL,NULL),(255,79,'admin',NULL,NULL,NULL),(256,79,'branchadmin',NULL,NULL,NULL),(257,80,'admin',NULL,NULL,NULL),(258,80,'branchadmin',NULL,NULL,NULL),(259,81,'admin',NULL,NULL,NULL),(260,81,'branchadmin',NULL,NULL,NULL),(261,82,'admin',NULL,NULL,NULL),(262,82,'branchadmin',NULL,NULL,NULL),(263,83,'admin',NULL,NULL,NULL),(264,83,'branchadmin',NULL,NULL,NULL),(265,84,'admin',NULL,NULL,NULL),(266,84,'branchadmin',NULL,NULL,NULL),(267,85,'admin',NULL,NULL,NULL),(268,85,'branchadmin',NULL,NULL,NULL),(269,86,'admin',NULL,NULL,NULL),(270,86,'branchadmin',NULL,NULL,NULL),(271,87,'admin',NULL,NULL,NULL),(272,87,'branchadmin',NULL,NULL,NULL),(273,88,'admin',NULL,NULL,NULL),(274,88,'branchadmin',NULL,NULL,NULL),(275,89,'admin',NULL,NULL,NULL),(276,89,'branchadmin',NULL,NULL,NULL),(277,90,'admin',NULL,NULL,NULL),(278,90,'branchadmin',NULL,NULL,NULL),(279,91,'admin',NULL,NULL,NULL),(280,91,'branchadmin',NULL,NULL,NULL),(281,92,'admin',NULL,NULL,NULL),(282,92,'branchadmin',NULL,NULL,NULL),(283,93,'admin',NULL,NULL,NULL),(284,93,'branchadmin',NULL,NULL,NULL),(285,94,'admin',NULL,NULL,NULL),(286,94,'branchadmin',NULL,NULL,NULL),(287,95,'admin',NULL,NULL,NULL),(288,95,'branchadmin',NULL,NULL,NULL),(289,96,'admin',NULL,NULL,NULL),(290,96,'branchadmin',NULL,NULL,NULL),(291,97,'admin',NULL,NULL,NULL),(292,97,'branchadmin',NULL,NULL,NULL),(293,98,'admin',NULL,NULL,NULL),(294,98,'branchadmin',NULL,NULL,NULL),(295,99,'admin',NULL,NULL,NULL),(296,99,'branchadmin',NULL,NULL,NULL),(297,100,'admin',NULL,NULL,NULL),(298,100,'branchadmin',NULL,NULL,NULL),(299,101,'admin',NULL,NULL,NULL),(300,101,'branchadmin',NULL,NULL,NULL),(301,102,'admin',NULL,NULL,NULL),(302,102,'branchadmin',NULL,NULL,NULL),(303,103,'admin',NULL,NULL,NULL),(304,103,'branchadmin',NULL,NULL,NULL),(305,104,'admin',NULL,NULL,NULL),(306,104,'branchadmin',NULL,NULL,NULL),(307,105,'admin',NULL,NULL,NULL),(308,105,'branchadmin',NULL,NULL,NULL),(414,63,'developer',NULL,NULL,NULL),(415,64,'developer',NULL,NULL,NULL),(416,65,'developer',NULL,NULL,NULL),(417,66,'developer',NULL,NULL,NULL),(418,67,'developer',NULL,NULL,NULL),(419,68,'developer',NULL,NULL,NULL),(420,69,'developer',NULL,NULL,NULL),(429,16,'teacher',NULL,NULL,NULL),(430,17,'teacher',NULL,NULL,NULL),(464,3,'admin',NULL,NULL,NULL),(465,1,'admin',NULL,NULL,NULL),(466,50,'admin',NULL,NULL,NULL),(467,37,'admin',NULL,NULL,NULL),(470,1,'branchadmin',NULL,NULL,NULL),(471,37,'branchadmin',NULL,NULL,NULL),(472,3,'branchadmin',NULL,NULL,NULL),(473,50,'branchadmin',NULL,NULL,NULL),(476,1,'exam_officer',NULL,NULL,NULL),(477,50,'teacher',NULL,NULL,NULL),(479,3,'exam_officer',NULL,NULL,NULL),(480,37,'superadmin',NULL,NULL,NULL),(482,37,'exam_officer',NULL,NULL,NULL),(484,50,'exam_officer',NULL,NULL,NULL),(486,39,'admin',NULL,NULL,NULL),(487,39,'branchadmin',NULL,NULL,NULL),(488,38,'admin',NULL,NULL,NULL),(489,51,'admin',NULL,NULL,NULL),(490,39,'exam_officer',NULL,NULL,NULL),(491,38,'branchadmin',NULL,NULL,NULL),(492,51,'branchadmin',NULL,NULL,NULL),(494,29,'admin',NULL,NULL,NULL),(495,51,'teacher',NULL,NULL,NULL),(496,38,'exam_officer',NULL,NULL,NULL),(497,29,'branchadmin',NULL,NULL,NULL),(500,51,'exam_officer',NULL,NULL,NULL),(501,29,'parent',NULL,NULL,NULL),(505,29,'teacher',NULL,NULL,NULL),(506,52,'admin',NULL,NULL,NULL),(507,29,'exam_officer',NULL,NULL,NULL),(508,52,'branchadmin',NULL,NULL,NULL),(509,2,'admin',NULL,NULL,NULL),(510,52,'teacher',NULL,NULL,NULL),(511,2,'branchadmin',NULL,NULL,NULL),(512,54,'admin',NULL,NULL,NULL),(513,55,'admin',NULL,NULL,NULL),(514,54,'branchadmin',NULL,NULL,NULL),(515,2,'exam_officer',NULL,NULL,NULL),(516,55,'branchadmin',NULL,NULL,NULL),(517,53,'admin',NULL,NULL,NULL),(518,52,'exam_officer',NULL,NULL,NULL),(519,54,'exam_officer',NULL,NULL,NULL),(520,9,'admin',NULL,NULL,NULL),(521,53,'branchadmin',NULL,NULL,NULL),(522,55,'teacher',NULL,NULL,NULL),(523,55,'exam_officer',NULL,NULL,NULL),(524,9,'branchadmin',NULL,NULL,NULL),(525,53,'teacher',NULL,NULL,NULL),(526,57,'admin',NULL,NULL,NULL),(527,53,'exam_officer',NULL,NULL,NULL),(528,9,'exam_officer',NULL,NULL,NULL),(529,58,'admin',NULL,NULL,NULL),(530,45,'admin',NULL,NULL,NULL),(531,57,'branchadmin',NULL,NULL,NULL),(532,45,'branchadmin',NULL,NULL,NULL),(533,58,'branchadmin',NULL,NULL,NULL),(534,56,'admin',NULL,NULL,NULL),(535,57,'exam_officer',NULL,NULL,NULL),(536,58,'exam_officer',NULL,NULL,NULL),(537,45,'exam_officer',NULL,NULL,NULL),(538,56,'branchadmin',NULL,NULL,NULL),(539,44,'admin',NULL,NULL,NULL),(540,59,'teacher',NULL,NULL,NULL),(541,56,'exam_officer',NULL,NULL,NULL),(542,44,'branchadmin',NULL,NULL,NULL),(543,59,'exam_officer',NULL,NULL,NULL),(544,47,'admin',NULL,NULL,NULL),(545,60,'admin',NULL,NULL,NULL),(546,44,'exam_officer',NULL,NULL,NULL),(547,60,'branchadmin',NULL,NULL,NULL),(548,48,'admin',NULL,NULL,NULL),(549,47,'branchadmin',NULL,NULL,NULL),(550,60,'exam_officer',NULL,NULL,NULL),(551,46,'admin',NULL,NULL,NULL),(552,62,'admin',NULL,NULL,NULL),(553,46,'branchadmin',NULL,NULL,NULL),(554,62,'branchadmin',NULL,NULL,NULL),(555,48,'branchadmin',NULL,NULL,NULL),(556,47,'exam_officer',NULL,NULL,NULL),(557,46,'exam_officer',NULL,NULL,NULL),(558,62,'exam_officer',NULL,NULL,NULL),(559,61,'admin',NULL,NULL,NULL),(560,48,'exam_officer',NULL,NULL,NULL),(561,61,'branchadmin',NULL,NULL,NULL),(562,61,'exam_officer',NULL,NULL,NULL),(563,106,'admin',NULL,NULL,NULL),(564,106,'branchadmin',NULL,NULL,NULL),(565,106,'hr',NULL,NULL,NULL),(568,53,'form_master',NULL,NULL,NULL),(569,13,'form_master',NULL,NULL,NULL),(570,107,'admin',NULL,NULL,NULL),(571,107,'branchadmin',NULL,NULL,NULL),(576,108,'admin',NULL,NULL,NULL),(577,108,'branchadmin',NULL,NULL,NULL),(580,109,'admin',NULL,NULL,NULL),(581,109,'branchadmin',NULL,NULL,NULL),(582,110,'branchadmin',NULL,NULL,NULL),(583,110,'admin',NULL,NULL,NULL),(584,18,'admin',NULL,NULL,NULL),(585,18,'branchadmin',NULL,NULL,NULL),(586,18,'teacher',NULL,NULL,NULL),(587,19,'admin',NULL,NULL,NULL),(588,19,'branchadmin',NULL,NULL,NULL),(589,19,'teacher',NULL,NULL,NULL),(594,27,'admin',NULL,NULL,NULL),(595,27,'branchadmin',NULL,NULL,NULL),(596,27,'exam_officer',NULL,NULL,NULL),(597,27,'teacher',NULL,NULL,NULL),(598,30,'parent',NULL,NULL,NULL),(599,32,'student',NULL,NULL,NULL),(600,111,'admin',NULL,NULL,NULL),(601,112,'admin',NULL,NULL,NULL),(602,113,'admin',NULL,NULL,NULL),(603,114,'admin',NULL,NULL,NULL),(604,115,'admin',NULL,NULL,NULL),(606,117,'teacher',NULL,NULL,NULL),(607,118,'teacher',NULL,NULL,NULL),(608,119,'teacher',NULL,NULL,NULL),(609,120,'teacher',NULL,NULL,NULL),(621,121,'admin',NULL,NULL,NULL),(622,122,'admin',NULL,NULL,NULL),(628,121,'branchadmin',NULL,NULL,NULL),(629,122,'branchadmin',NULL,NULL,NULL),(636,129,'admin',NULL,NULL,NULL),(637,117,'admin',NULL,NULL,NULL),(638,118,'admin',NULL,NULL,NULL),(639,119,'admin',NULL,NULL,NULL),(640,120,'admin',NULL,NULL,NULL),(644,117,'branchadmin',NULL,NULL,NULL),(645,118,'branchadmin',NULL,NULL,NULL),(646,119,'branchadmin',NULL,NULL,NULL),(647,120,'branchadmin',NULL,NULL,NULL),(651,16,'admin',NULL,NULL,NULL),(652,16,'branchadmin',NULL,NULL,NULL),(653,17,'admin',NULL,NULL,NULL),(654,17,'branchadmin',NULL,NULL,NULL),(655,1068,'admin',NULL,NULL,NULL),(656,1068,'branchadmin',NULL,NULL,NULL),(657,1069,'developer',NULL,NULL,NULL),(658,1070,'teacher',NULL,NULL,NULL),(660,5,'admin',NULL,NULL,NULL),(661,5,'branchadmin',NULL,NULL,NULL),(662,4,'admin',NULL,NULL,NULL),(663,4,'branchadmin',NULL,NULL,NULL),(664,4,'exam_officer',NULL,NULL,NULL),(665,1071,'Admin',NULL,NULL,NULL);
/*!40000 ALTER TABLE `rbac_menu_access` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rbac_menu_packages`
--

DROP TABLE IF EXISTS `rbac_menu_packages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rbac_menu_packages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `menu_item_id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_menu_package` (`menu_item_id`,`package_id`),
  KEY `idx_menu_packages_pkgid` (`package_id`),
  CONSTRAINT `rbac_menu_packages_ibfk_1` FOREIGN KEY (`menu_item_id`) REFERENCES `rbac_menu_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=171 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rbac_menu_packages`
--

LOCK TABLES `rbac_menu_packages` WRITE;
/*!40000 ALTER TABLE `rbac_menu_packages` DISABLE KEYS */;
INSERT INTO `rbac_menu_packages` (`id`, `menu_item_id`, `package_id`) VALUES (95,1,4),(93,2,4),(94,3,4),(169,4,3),(168,5,3),(68,6,2),(69,7,2),(70,8,2),(16,9,3),(96,10,4),(78,11,3),(79,12,3),(80,13,3),(76,14,2),(77,15,2),(159,16,3),(160,17,3),(104,18,3),(105,19,3),(153,20,3),(154,21,3),(155,22,3),(156,23,3),(157,24,3),(158,25,3),(87,26,2),(107,27,3),(92,29,3),(108,30,3),(109,32,3),(91,35,2),(20,39,3),(23,42,3),(24,43,3),(25,46,3),(26,47,3),(27,48,3),(28,49,3),(60,50,3),(61,51,3),(62,52,3),(63,53,3),(64,54,3),(65,55,3),(7,56,2),(66,57,3),(67,58,3),(3,59,1),(161,59,3),(4,60,1),(5,61,1),(6,62,1),(29,71,3),(30,76,3),(31,77,3),(32,78,3),(33,79,3),(34,80,3),(35,81,3),(36,82,3),(8,83,2),(9,84,2),(10,85,2),(11,86,2),(12,87,2),(13,88,2),(14,89,2),(44,90,1),(45,91,1),(46,92,1),(47,93,1),(48,94,1),(49,95,1),(50,96,1),(51,97,1),(52,98,1),(53,99,1),(54,100,1),(55,101,1),(56,102,1),(57,103,1),(58,104,1),(59,105,1),(75,106,2),(97,107,3),(100,108,3),(102,109,4),(103,110,4),(113,111,2),(114,111,3),(115,112,2),(116,112,3),(117,113,2),(118,113,3),(119,114,2),(120,114,3),(162,117,3),(163,118,3),(164,119,3),(165,120,3),(140,121,2),(141,122,2),(147,129,2),(148,129,3),(151,1068,2),(166,1070,3),(170,1071,2);
/*!40000 ALTER TABLE `rbac_menu_packages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rbac_school_packages`
--

DROP TABLE IF EXISTS `rbac_school_packages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rbac_school_packages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `school_id` varchar(50) NOT NULL,
  `package_id` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `features_override` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`features_override`)),
  `is_active` tinyint(1) DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `activated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_active_school` (`school_id`,`is_active`),
  KEY `idx_school_active` (`school_id`,`is_active`),
  KEY `idx_package` (`package_id`),
  KEY `rbac_school_packages_school_id_is_active` (`school_id`,`is_active`),
  KEY `rbac_school_packages_package_id` (`package_id`),
  KEY `idx_school_packages_school` (`school_id`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rbac_school_packages`
--

LOCK TABLES `rbac_school_packages` WRITE;
/*!40000 ALTER TABLE `rbac_school_packages` DISABLE KEYS */;
INSERT INTO `rbac_school_packages` (`id`, `school_id`, `package_id`, `start_date`, `end_date`, `features_override`, `is_active`, `created_by`, `updated_by`, `created_at`, `updated_at`, `activated_at`) VALUES (1,'SCH/11',3,'2025-12-31','2026-12-31',NULL,1,1,NULL,'2025-12-24 13:08:52','2025-12-31 00:16:00',NULL),(2,'SCH/10',3,'2025-01-01','2025-12-31',NULL,1,735,NULL,'2025-12-24 16:02:04','2025-12-25 21:19:43',NULL),(3,'SCH/12',1,'0000-00-00',NULL,NULL,1,NULL,NULL,'2025-12-25 21:19:43','2025-12-25 21:19:43',NULL),(4,'SCH/1',3,'2025-01-01','2025-12-31',NULL,1,1,NULL,'2025-12-28 20:56:53','2025-12-28 20:56:53',NULL),(7,'SCH/20',1,'2026-01-01','2027-01-01',NULL,1,1064,NULL,'2025-12-31 13:40:53','2026-01-01 00:39:15','2026-01-01 00:39:15');
/*!40000 ALTER TABLE `rbac_school_packages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rbac_permission_templates`
--

DROP TABLE IF EXISTS `rbac_permission_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rbac_permission_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `menu_items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`menu_items`)),
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rbac_permission_templates`
--

LOCK TABLES `rbac_permission_templates` WRITE;
/*!40000 ALTER TABLE `rbac_permission_templates` DISABLE KEYS */;
INSERT INTO `rbac_permission_templates` (`id`, `name`, `description`, `menu_items`, `created_by`, `created_at`) VALUES (1,'Basic Teacher','Core teaching features only','[\"classes\", \"subjects\", \"attendance\", \"assessments\"]',NULL,'2025-12-27 12:56:47'),(2,'Full Admin','All administrative features','[\"dashboard\", \"students\", \"staff\", \"classes\", \"finance\", \"reports\", \"settings\"]',NULL,'2025-12-27 12:56:47'),(3,'Finance Only','Financial management access','[\"payments\", \"fees\", \"invoices\", \"financial-reports\"]',NULL,'2025-12-27 12:56:47'),(4,'Exam Officer','Examination management','[\"cbt\", \"exam-setup\", \"results\", \"report-cards\"]',NULL,'2025-12-27 12:56:47');
/*!40000 ALTER TABLE `rbac_permission_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rbac_conditional_access`
--

DROP TABLE IF EXISTS `rbac_conditional_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rbac_conditional_access` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `menu_item_id` int(11) NOT NULL,
  `user_type` varchar(50) NOT NULL,
  `condition_type` enum('branch','class','department') NOT NULL,
  `condition_value` varchar(100) NOT NULL,
  `school_id` varchar(20) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_menu_condition` (`menu_item_id`,`condition_type`),
  KEY `idx_school` (`school_id`),
  CONSTRAINT `rbac_conditional_access_ibfk_1` FOREIGN KEY (`menu_item_id`) REFERENCES `rbac_menu_items` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rbac_conditional_access`
--

LOCK TABLES `rbac_conditional_access` WRITE;
/*!40000 ALTER TABLE `rbac_conditional_access` DISABLE KEYS */;
INSERT INTO `rbac_conditional_access` (`id`, `menu_item_id`, `user_type`, `condition_type`, `condition_value`, `school_id`, `is_active`, `created_at`) VALUES (1,1,'teacher','branch','MAIN','SCH/10',1,'2025-12-28 11:28:51');
/*!40000 ALTER TABLE `rbac_conditional_access` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rbac_usage_analytics`
--

DROP TABLE IF EXISTS `rbac_usage_analytics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rbac_usage_analytics` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `menu_item_id` int(11) NOT NULL,
  `school_id` varchar(20) DEFAULT NULL,
  `access_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `user_type` varchar(50) DEFAULT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_menu` (`user_id`,`menu_item_id`),
  KEY `idx_time` (`access_time`),
  KEY `idx_school` (`school_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rbac_usage_analytics`
--

LOCK TABLES `rbac_usage_analytics` WRITE;
/*!40000 ALTER TABLE `rbac_usage_analytics` DISABLE KEYS */;
INSERT INTO `rbac_usage_analytics` (`id`, `user_id`, `menu_item_id`, `school_id`, `access_time`, `user_type`, `session_id`) VALUES (1,735,1,'SCH/10','2025-12-28 11:28:51','Admin','test-session-123');
/*!40000 ALTER TABLE `rbac_usage_analytics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rbac_user_menu_access`
--

DROP TABLE IF EXISTS `rbac_user_menu_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rbac_user_menu_access` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `menu_item_id` int(11) NOT NULL,
  `school_id` varchar(20) NOT NULL,
  `expires_at` datetime DEFAULT NULL,
  `granted_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_menu` (`user_id`,`menu_item_id`,`school_id`),
  KEY `idx_user_school` (`user_id`,`school_id`),
  KEY `idx_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rbac_user_menu_access`
--

LOCK TABLES `rbac_user_menu_access` WRITE;
/*!40000 ALTER TABLE `rbac_user_menu_access` DISABLE KEYS */;
/*!40000 ALTER TABLE `rbac_user_menu_access` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-04 12:54:12
