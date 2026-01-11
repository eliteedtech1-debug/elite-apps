-- MariaDB dump 10.19  Distrib 10.4.28-MariaDB, for osx10.10 (x86_64)
--
-- Host: localhost    Database: full_skcooly
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
) ENGINE=InnoDB AUTO_INCREMENT=1089 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rbac_menu_items`
--

LOCK TABLES `rbac_menu_items` WRITE;
/*!40000 ALTER TABLE `rbac_menu_items` DISABLE KEYS */;
INSERT INTO `rbac_menu_items` VALUES (1,NULL,'Personal Data Mngr','ti ti-users','',NULL,NULL,1,1,'core',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(2,1,'Students List','ti ti-school',NULL,NULL,NULL,1,1,'core',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(3,2,'Student List','ti ti-list','/student/student-list',NULL,NULL,1,1,'core',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(4,2,'Class List','ti ti-list','/academic/class-list',NULL,NULL,2,1,'core',0,0,'2025-12-25 19:23:23','2026-01-02 22:34:56'),(5,2,'Promotion & Graduation','fa fa-table','/students/promotion',NULL,NULL,3,1,'academic',0,0,'2025-12-25 19:23:23','2026-01-02 22:34:41'),(6,1,'Admission','ti ti-user-plus',NULL,NULL,NULL,2,1,'admission',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(7,6,'Dashboard','ti ti-dashboard','/admissions/dashboard',NULL,NULL,1,1,'admission',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(8,6,'Applications','ti ti-file-text','/admissions/applications',NULL,NULL,2,1,'admission',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(9,107,'Parent List','ti ti-user-bolt','/parents/parent-list',NULL,NULL,3,1,'core',0,0,'2025-12-25 19:23:23','2025-12-28 14:40:24'),(10,109,'Staff List','ti ti-users','/teacher/teacher-list',NULL,NULL,4,1,'core',0,0,'2025-12-25 19:23:23','2025-12-28 14:51:07'),(11,1,'Student Attendance','ti ti-calendar-check',NULL,NULL,NULL,5,1,'attendance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(12,11,'Reports 📊','ti ti-chart-bar','/attendance/dashboard',NULL,NULL,1,1,'attendance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(13,11,'Mark Attendance','ti ti-school','/academic/attendance-register',NULL,NULL,2,1,'attendance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(14,106,'Mark Attendance','ti ti-id-badge','/hrm/staff-attendance',NULL,NULL,3,1,'attendance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(15,106,'Reports 📊','ti ti-users','/hrm/staff-attendance-overview',NULL,NULL,4,1,'attendance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(16,NULL,'Class Management',NULL,NULL,NULL,NULL,2,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(17,16,'Daily Routine','fa fa-gears',NULL,NULL,NULL,1,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(18,17,'Class Time Table','ti ti-table','/academic/class-time-table',NULL,NULL,1,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(19,17,'Class Attendance','ti ti-id-badge','/academic/attendance-register',NULL,NULL,2,1,'attendance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(20,17,'Lessons','ti ti-book','/academic/tearcher-lessons',NULL,NULL,3,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(21,1070,'Syllabus & Curriculum','ti ti-clipboard-list','/academic/syllabus',NULL,NULL,4,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-29 13:13:59'),(22,17,'Assignments','ti ti-license','/academic/class-assignment',NULL,NULL,5,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(23,16,'Teaching Tools','fa fa-gears',NULL,NULL,NULL,2,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(24,23,'Virtual Class','ti ti-receipt','/application/video-call',NULL,NULL,1,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(25,23,'Lesson Planning','ti ti-book','/academic/teacher/lesson-planning',NULL,NULL,2,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(26,23,'Syllabus','ti ti-dashboard','/class/syllabus',NULL,NULL,3,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(27,129,'Announcements','ti ti-clock','',NULL,NULL,3,1,'communication',0,0,'2025-12-25 19:23:23','2025-12-28 23:24:37'),(29,27,'Notice Board','ti ti-receipt','/announcements/notice-board',NULL,NULL,0,1,'communication',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(30,NULL,'My Children','ti ti-users','',NULL,NULL,4,1,'parent',0,0,'2025-12-25 19:23:23','2025-12-28 14:56:31'),(31,30,'Bills / School Fees','ti ti-receipt','/parent/studentpayment',NULL,NULL,1,1,'parent',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(32,NULL,'My School Activities','ti ti-clock','',NULL,NULL,5,1,'student',0,0,'2025-12-25 19:23:23','2025-12-28 14:57:22'),(33,32,'My Attendances','ti ti-id-badge','/academic/student-attendance',NULL,NULL,1,1,'attendance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(34,32,'Class Time Table','ti ti-table','/academic/student-time-table',NULL,NULL,2,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(35,32,'Lessons','ti ti-book','/academic/lessons',NULL,NULL,3,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(36,32,'My Assignments','ti ti-license','/academic/student-assignments',NULL,NULL,4,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(37,NULL,'General Setups','','',NULL,NULL,6,1,'setup',0,0,'2025-12-25 19:23:23','2026-01-11 14:17:58'),(38,37,'School Setup','fa fa-gears',NULL,NULL,NULL,1,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(39,38,'Academic Calendar','ti ti-calendar','/school-setup/academic-year-setup',NULL,NULL,1,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(42,38,'School Branches','ti ti-building','/school-setup/branches',NULL,NULL,4,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(43,38,'School Sections','ti ti-section','/school-setup/section-form',NULL,NULL,5,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(44,38,'Classes Setup','ti ti-classes','/academic/classes-setup',NULL,NULL,6,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(45,38,'Subjects Setup','ti ti-book','/academic/subjects',NULL,NULL,7,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(46,38,'Personal Dev. Setup','ti ti-book','/academic/character-subjects',NULL,NULL,8,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(47,38,'Assessment Setup','ti ti-book','/academic/ca-setup',NULL,NULL,9,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(48,38,'Time Table','ti ti-table','/simple-timetable',NULL,NULL,10,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(49,38,'Communication Setup','ti ti-message-circle','/communication/setup',NULL,NULL,11,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(50,NULL,'Exams & Records',NULL,NULL,NULL,NULL,7,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(51,50,'Examinations','ti ti-certificate',NULL,NULL,NULL,1,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(52,51,'Assessment Form','fa fa-clipboard-list','/academic/assessments',NULL,NULL,1,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(53,51,'FormMaster Review','fa fa-clipboard-list','/academic/formmaster-score-sheet',NULL,NULL,2,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(54,51,'Reports Generator','fa fa-file-alt','/academic/reports/Exam',NULL,NULL,3,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(55,51,'Broad Sheet','fa fa-table','/academic/broad-sheet',NULL,NULL,4,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(56,51,'Exam Analytics','fa fa-chart-bar','/academic/exam-analytics',NULL,NULL,5,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(57,51,'Report Template','fa fa-cog','/academic/report-configuration',NULL,NULL,6,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(58,51,'CA/Exam Setup','fa fa-cogs','/examinations/ca-setup',NULL,NULL,7,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(59,51,'Submit Questions','fa fa-upload','/examinations/submit-questions',NULL,NULL,8,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(60,51,'Moderation','fa fa-check-circle','/examinations/moderation',NULL,NULL,9,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(61,51,'Print Questions','fa fa-print','/examinations/print-questions',NULL,NULL,10,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(62,51,'Progress Tracking','fa fa-tasks','/examinations/progress',NULL,NULL,11,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(63,NULL,'Super Admin',NULL,NULL,NULL,NULL,8,1,'admin',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(64,63,'Create School',NULL,'/school-setup/add-school',NULL,NULL,1,1,'admin',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(65,63,'School List',NULL,'/school-setup/school-list',NULL,NULL,2,1,'admin',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(66,63,'Support Dashboard',NULL,'/support/superadmin-dashboard',NULL,NULL,3,1,'admin',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(67,63,'Queue Dashboard','ti ti-list-check','/superadmin/queues',NULL,NULL,4,1,'admin',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(68,63,'School Access Management',NULL,'/school-access-management',NULL,NULL,5,1,'admin',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(69,63,'App Configurations',NULL,'/app/configurations',NULL,NULL,6,1,'admin',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(70,NULL,'Express Finance',NULL,NULL,NULL,NULL,9,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(71,70,'Finance Report','ti ti-chart-bar','/management/finance/report',NULL,NULL,1,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(72,70,'Bank Accounts','ti ti-building-bank','/management/finance/bank-accounts',NULL,NULL,2,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(73,70,'School Fees','ti ti-coin',NULL,NULL,NULL,3,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(74,73,'Fees Setup','ti ti-settings','/management/student-fees',NULL,NULL,1,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(75,73,'Single Billing','ti ti-receipt','/management/collect-fees',NULL,NULL,2,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(76,73,'Single Payments','ti ti-cash','/management/receipt-classes',NULL,NULL,3,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(77,73,'Family Billing','ti ti-users','/management/family-billing',NULL,NULL,4,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(78,73,'Family Payments','ti ti-wallet','/parent/parentpayments',NULL,NULL,5,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(79,70,'Income & Expenses','ti ti-coin',NULL,NULL,NULL,4,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(80,79,'Income Reports','ti ti-arrow-up','/accounts/income-report',NULL,NULL,1,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(81,79,'Expenses Reports','ti ti-arrow-down','/accounts/expesnes/new',NULL,NULL,2,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(82,79,'Profit and Loss','ti ti-chart-dots','/accounts/profit/report',NULL,NULL,3,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(83,70,'Payroll','ti ti-briefcase',NULL,NULL,NULL,5,1,'hr',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(84,83,'Staff Management','ti ti-users-group','/payroll/staff-payroll',NULL,NULL,1,1,'hr',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(85,83,'Salary Structure','ti ti-list-tree','/payroll/structure',NULL,NULL,2,1,'hr',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(86,83,'Allowance & Deductions','ti ti-percentage','/payrol/Allowances/deductions',NULL,NULL,3,1,'hr',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(87,83,'Loan Management','ti ti-credit-card','/payroll/loan-management',NULL,NULL,4,1,'hr',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(88,83,'Salary Disbursement','ti ti-transfer','/payroll/salary-disbursement',NULL,NULL,5,1,'hr',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(89,83,'Salary Report','ti ti-report','/payroll/salary-report',NULL,NULL,6,1,'hr',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(90,NULL,'Supply Management',NULL,NULL,NULL,NULL,10,1,'inventory',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(91,90,'Asset Management','ti ti-package',NULL,NULL,NULL,1,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(92,91,'Asset Dashboard','ti ti-dashboard','/supply-management/asset/dashboard',NULL,NULL,1,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(93,91,'Asset Inventory','ti ti-list','/supply-management/asset/inventory',NULL,NULL,2,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(94,91,'Asset Categories','ti ti-category','/supply-management/asset/categories',NULL,NULL,3,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(95,91,'Facility Rooms','ti ti-home','/supply-management/asset/facility-rooms',NULL,NULL,4,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(96,91,'Asset Inspections','ti ti-checklist','/supply-management/asset/inspections',NULL,NULL,5,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(97,91,'Maintenance Requests','ti ti-wrench','/supply-management/asset/maintenance-requests',NULL,NULL,6,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(98,91,'Asset Transfers','ti ti-transfer','/supply-management/asset/transfers',NULL,NULL,7,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(99,90,'Retail Store','ti ti-shopping-cart','',NULL,NULL,2,1,'inventory',0,0,'2025-12-25 19:23:23','2026-01-11 14:18:59'),(100,99,'Store Dashboard','ti ti-dashboard','/supply-management/inventory/dashboard',NULL,NULL,1,1,'inventory',0,0,'2025-12-25 19:23:23','2026-01-05 11:15:21'),(101,99,'Products','ti ti-list','/supply-management/inventory/products',NULL,NULL,2,1,'inventory',0,0,'2025-12-25 19:23:23','2026-01-05 11:15:21'),(102,99,'Stock Levels','ti ti-stack','/supply-management/inventory/stock',NULL,NULL,3,1,'inventory',0,0,'2025-12-25 19:23:23','2026-01-05 11:15:21'),(103,99,'Purchases','ti ti-file-invoice','/supply-management/inventory/purchase-orders',NULL,NULL,4,1,'inventory',0,0,'2025-12-25 19:23:23','2026-01-05 11:15:21'),(104,99,'Sales History','ti ti-shopping-cart','/supply-management/inventory/sales',NULL,NULL,5,1,'inventory',0,0,'2025-12-25 19:23:23','2026-01-05 11:15:21'),(105,99,'Suppliers','ti ti-truck','/supply-management/inventory/suppliers',NULL,NULL,6,1,'inventory',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(106,1,'Staff Attendance','ti ti-id-badge',NULL,NULL,NULL,12,1,'hr',0,0,'2025-12-25 21:58:07','2025-12-27 10:05:52'),(107,1,'Parents','ti ti-users',NULL,NULL,NULL,0,1,NULL,0,0,'2025-12-28 14:38:48','2025-12-28 14:38:48'),(108,107,'Add Parent','ti ti-user-plus','/parents/parent-list?action=add',NULL,NULL,0,1,NULL,0,0,'2025-12-28 14:46:21','2025-12-28 14:50:00'),(109,1,'Staff ','ti ti-users','',NULL,NULL,0,1,NULL,0,0,'2025-12-28 14:50:50','2026-01-10 11:00:31'),(110,109,'Add Staff ','ti ti-user-plus','/teacher/add-teacher',NULL,NULL,0,1,NULL,0,0,'2025-12-28 14:54:05','2026-01-10 11:00:31'),(111,129,'Communications','ti ti-message-circle',NULL,NULL,NULL,25,1,'communication',0,0,'2025-12-28 21:05:57','2025-12-28 23:24:37'),(112,111,'Dashboard','ti ti-dashboard','/communications/dashboard',NULL,NULL,1,1,'communication',0,0,'2025-12-28 21:05:57','2025-12-28 21:05:57'),(113,111,'Sent Messages','ti ti-send','/communications/sent-messages',NULL,NULL,2,1,'communication',0,0,'2025-12-28 21:05:57','2025-12-28 21:05:57'),(114,111,'Configuration','ti ti-settings','/communication/setup',NULL,NULL,3,1,'communication',0,0,'2025-12-28 21:05:57','2025-12-28 21:05:57'),(115,27,'System Notifications','ti ti-bell','/system/notifications',NULL,NULL,2,1,'communication',0,0,'2025-12-28 21:12:42','2025-12-28 21:12:42'),(117,17,'My Teaching Hub','ti ti-dashboard','/academic/teacher-syllabus-hub',NULL,NULL,25,1,NULL,0,0,'2025-12-28 23:12:53','2025-12-28 23:12:53'),(118,1070,'Create Lesson Plan','ti ti-plus','/academic/lesson-plan-creator',NULL,NULL,26,1,NULL,0,0,'2025-12-28 23:12:53','2025-12-31 21:40:09'),(119,1070,'Browse Curriculum','ti ti-search','/academic/curriculum-browser',NULL,NULL,27,1,NULL,0,0,'2025-12-28 23:12:53','2025-12-29 13:14:26'),(120,17,'Generate Assessment','ti ti-clipboard-check','/academic/assessment-generator',NULL,NULL,28,1,NULL,0,0,'2025-12-28 23:12:53','2025-12-28 23:12:53'),(121,1070,'Subject Mapping','ti ti-link','/academic/subject-mapping',NULL,NULL,29,1,NULL,0,0,'2025-12-28 23:12:53','2025-12-29 13:14:16'),(122,38,'Subject Mapping','ti ti-link','/academic/subject-mapping',NULL,NULL,150,1,NULL,0,0,'2025-12-28 23:12:53','2025-12-28 23:12:53'),(129,NULL,'Messaging','ti ti-messages',NULL,NULL,NULL,26,1,'communication',0,0,'2025-12-28 23:24:37','2025-12-28 23:25:40'),(1068,1070,'Syllabus Dashboard','ti ti-clipboard-list','/developer/syllabus-dashboard',NULL,NULL,30,1,NULL,0,0,'2025-12-29 00:35:07','2025-12-29 13:14:20'),(1069,63,'Syllabus Scraping Dashboard','ti ti-robot','/developer/syllabus-scraping-dashboard',NULL,NULL,160,1,NULL,0,0,'2025-12-29 00:35:07','2025-12-29 00:35:07'),(1070,16,'Syllabus','ti ti-book',NULL,NULL,NULL,0,1,NULL,0,0,'2025-12-29 13:13:27','2025-12-29 13:13:27'),(1071,2,'ID Card Generator','ti ti-id-badge','/student/id-card-generator',NULL,NULL,40,1,NULL,0,0,'2026-01-02 22:31:46','2026-01-02 22:31:46'),(1072,99,'POS / New Sale','ti ti-cash','/supply-management/inventory/quick-sale',NULL,NULL,6,1,'Quick Sale',1,0,'2026-01-05 06:29:52','2026-01-05 11:15:54'),(1076,99,'Reports','ti ti-chart-bar','/supply-management/inventory/analytics',NULL,NULL,8,1,NULL,1,0,'2026-01-05 11:16:58','2026-01-05 11:16:58'),(1077,NULL,'MOU Generator','FileTextOutlined','/school-setup/school-list',NULL,NULL,100,1,'mou_generator',0,0,'2026-01-08 18:14:16','2026-01-08 18:14:16'),(1078,NULL,'Staff','ti ti-users',NULL,NULL,NULL,200,0,NULL,0,0,'2026-01-10 10:44:42','2026-01-10 11:00:34'),(1079,1078,'Add Staff','ti ti-user-plus','/staff/add-staff',NULL,NULL,1,0,NULL,0,0,'2026-01-10 10:44:42','2026-01-10 11:00:34'),(1080,1078,'Staff List','ti ti-list','/staff/staff-list',NULL,NULL,2,0,NULL,0,0,'2026-01-10 10:44:42','2026-01-10 11:00:34'),(1081,1078,'ID Card Generator','ti ti-id-badge-2','/staff/id-card-generator',NULL,NULL,3,0,NULL,0,0,'2026-01-10 10:44:42','2026-01-10 11:00:34'),(1083,109,'ID Card Generator','ti ti-id-badge-2','/staff/id-card-generator',NULL,NULL,3,1,NULL,0,0,'2026-01-10 11:00:37','2026-01-10 11:00:37'),(1084,17,'Recitation','ti-microphone','/academic/recitation',NULL,NULL,30,1,NULL,0,0,'2026-01-11 10:54:10','2026-01-11 15:32:45'),(1085,32,'My Recitation','ti-microphone','/academic/student-recitation',NULL,NULL,50,1,NULL,0,0,'2026-01-11 10:54:29','2026-01-11 10:59:03'),(1086,51,'Print Answer Sheets','ti-file-text','/academic/print-answer-sheets',NULL,NULL,35,1,NULL,0,0,'2026-01-11 11:03:14','2026-01-11 11:03:14'),(1087,23,'Lesson Plans Review','ti-clipboard-check','/academic/admin-lesson-plans',NULL,NULL,25,1,NULL,0,0,'2026-01-11 11:09:48','2026-01-11 11:09:48'),(1088,23,'My Lesson Plans','ti-notebook','/academic/teacher-lesson-plans',NULL,NULL,26,1,NULL,0,0,'2026-01-11 11:09:49','2026-01-11 11:09:49');
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
) ENGINE=InnoDB AUTO_INCREMENT=729 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rbac_menu_access`
--

LOCK TABLES `rbac_menu_access` WRITE;
/*!40000 ALTER TABLE `rbac_menu_access` DISABLE KEYS */;
INSERT INTO `rbac_menu_access` VALUES (110,6,'admin',NULL,NULL,NULL),(111,6,'branchadmin',NULL,NULL,NULL),(112,7,'admin',NULL,NULL,NULL),(113,7,'branchadmin',NULL,NULL,NULL),(114,8,'admin',NULL,NULL,NULL),(115,8,'branchadmin',NULL,NULL,NULL),(118,10,'admin',NULL,NULL,NULL),(119,10,'branchadmin',NULL,NULL,NULL),(120,11,'admin',NULL,NULL,NULL),(121,11,'branchadmin',NULL,NULL,NULL),(122,11,'teacher',NULL,NULL,NULL),(123,12,'admin',NULL,NULL,NULL),(124,12,'branchadmin',NULL,NULL,NULL),(125,13,'admin',NULL,NULL,NULL),(126,13,'branchadmin',NULL,NULL,NULL),(127,13,'teacher',NULL,NULL,NULL),(128,14,'admin',NULL,NULL,NULL),(129,14,'branchadmin',NULL,NULL,NULL),(130,15,'admin',NULL,NULL,NULL),(131,15,'branchadmin',NULL,NULL,NULL),(144,20,'admin',NULL,NULL,NULL),(145,20,'branchadmin',NULL,NULL,NULL),(146,20,'teacher',NULL,NULL,NULL),(147,21,'admin',NULL,NULL,NULL),(148,21,'branchadmin',NULL,NULL,NULL),(149,21,'teacher',NULL,NULL,NULL),(150,22,'admin',NULL,NULL,NULL),(151,22,'branchadmin',NULL,NULL,NULL),(152,22,'teacher',NULL,NULL,NULL),(153,23,'teacher',NULL,NULL,NULL),(154,24,'teacher',NULL,NULL,NULL),(155,25,'teacher',NULL,NULL,NULL),(156,26,'admin',NULL,NULL,NULL),(157,26,'branchadmin',NULL,NULL,NULL),(168,31,'parent',NULL,NULL,NULL),(170,33,'student',NULL,NULL,NULL),(171,34,'student',NULL,NULL,NULL),(172,35,'student',NULL,NULL,NULL),(173,36,'student',NULL,NULL,NULL),(185,42,'admin',NULL,NULL,NULL),(186,43,'admin',NULL,NULL,NULL),(187,43,'branchadmin',NULL,NULL,NULL),(198,49,'admin',NULL,NULL,NULL),(229,63,'superadmin',NULL,NULL,NULL),(231,64,'superadmin',NULL,NULL,NULL),(232,65,'superadmin',NULL,NULL,NULL),(233,66,'superadmin',NULL,NULL,NULL),(234,67,'superadmin',NULL,NULL,NULL),(237,70,'admin',NULL,NULL,NULL),(238,70,'branchadmin',NULL,NULL,NULL),(239,71,'admin',NULL,NULL,NULL),(240,71,'branchadmin',NULL,NULL,NULL),(243,73,'admin',NULL,NULL,NULL),(244,73,'branchadmin',NULL,NULL,NULL),(245,74,'admin',NULL,NULL,NULL),(246,74,'branchadmin',NULL,NULL,NULL),(247,75,'admin',NULL,NULL,NULL),(248,75,'branchadmin',NULL,NULL,NULL),(249,76,'admin',NULL,NULL,NULL),(250,76,'branchadmin',NULL,NULL,NULL),(251,77,'admin',NULL,NULL,NULL),(252,77,'branchadmin',NULL,NULL,NULL),(253,78,'admin',NULL,NULL,NULL),(254,78,'branchadmin',NULL,NULL,NULL),(255,79,'admin',NULL,NULL,NULL),(256,79,'branchadmin',NULL,NULL,NULL),(257,80,'admin',NULL,NULL,NULL),(258,80,'branchadmin',NULL,NULL,NULL),(259,81,'admin',NULL,NULL,NULL),(260,81,'branchadmin',NULL,NULL,NULL),(261,82,'admin',NULL,NULL,NULL),(262,82,'branchadmin',NULL,NULL,NULL),(263,83,'admin',NULL,NULL,NULL),(264,83,'branchadmin',NULL,NULL,NULL),(265,84,'admin',NULL,NULL,NULL),(266,84,'branchadmin',NULL,NULL,NULL),(267,85,'admin',NULL,NULL,NULL),(268,85,'branchadmin',NULL,NULL,NULL),(269,86,'admin',NULL,NULL,NULL),(270,86,'branchadmin',NULL,NULL,NULL),(271,87,'admin',NULL,NULL,NULL),(272,87,'branchadmin',NULL,NULL,NULL),(273,88,'admin',NULL,NULL,NULL),(274,88,'branchadmin',NULL,NULL,NULL),(275,89,'admin',NULL,NULL,NULL),(276,89,'branchadmin',NULL,NULL,NULL),(277,90,'admin',NULL,NULL,NULL),(278,90,'branchadmin',NULL,NULL,NULL),(279,91,'admin',NULL,NULL,NULL),(280,91,'branchadmin',NULL,NULL,NULL),(281,92,'admin',NULL,NULL,NULL),(282,92,'branchadmin',NULL,NULL,NULL),(283,93,'admin',NULL,NULL,NULL),(284,93,'branchadmin',NULL,NULL,NULL),(285,94,'admin',NULL,NULL,NULL),(286,94,'branchadmin',NULL,NULL,NULL),(287,95,'admin',NULL,NULL,NULL),(288,95,'branchadmin',NULL,NULL,NULL),(289,96,'admin',NULL,NULL,NULL),(290,96,'branchadmin',NULL,NULL,NULL),(291,97,'admin',NULL,NULL,NULL),(292,97,'branchadmin',NULL,NULL,NULL),(293,98,'admin',NULL,NULL,NULL),(294,98,'branchadmin',NULL,NULL,NULL),(414,63,'developer',NULL,NULL,NULL),(415,64,'developer',NULL,NULL,NULL),(416,65,'developer',NULL,NULL,NULL),(417,66,'developer',NULL,NULL,NULL),(418,67,'developer',NULL,NULL,NULL),(419,68,'developer',NULL,NULL,NULL),(420,69,'developer',NULL,NULL,NULL),(429,16,'teacher',NULL,NULL,NULL),(430,17,'teacher',NULL,NULL,NULL),(464,3,'admin',NULL,NULL,NULL),(466,50,'admin',NULL,NULL,NULL),(472,3,'branchadmin',NULL,NULL,NULL),(473,50,'branchadmin',NULL,NULL,NULL),(477,50,'teacher',NULL,NULL,NULL),(479,3,'exam_officer',NULL,NULL,NULL),(484,50,'exam_officer',NULL,NULL,NULL),(486,39,'admin',NULL,NULL,NULL),(487,39,'branchadmin',NULL,NULL,NULL),(488,38,'admin',NULL,NULL,NULL),(489,51,'admin',NULL,NULL,NULL),(490,39,'exam_officer',NULL,NULL,NULL),(491,38,'branchadmin',NULL,NULL,NULL),(492,51,'branchadmin',NULL,NULL,NULL),(494,29,'admin',NULL,NULL,NULL),(495,51,'teacher',NULL,NULL,NULL),(496,38,'exam_officer',NULL,NULL,NULL),(497,29,'branchadmin',NULL,NULL,NULL),(500,51,'exam_officer',NULL,NULL,NULL),(501,29,'parent',NULL,NULL,NULL),(505,29,'teacher',NULL,NULL,NULL),(506,52,'admin',NULL,NULL,NULL),(507,29,'exam_officer',NULL,NULL,NULL),(508,52,'branchadmin',NULL,NULL,NULL),(509,2,'admin',NULL,NULL,NULL),(510,52,'teacher',NULL,NULL,NULL),(511,2,'branchadmin',NULL,NULL,NULL),(512,54,'admin',NULL,NULL,NULL),(513,55,'admin',NULL,NULL,NULL),(514,54,'branchadmin',NULL,NULL,NULL),(515,2,'exam_officer',NULL,NULL,NULL),(516,55,'branchadmin',NULL,NULL,NULL),(517,53,'admin',NULL,NULL,NULL),(518,52,'exam_officer',NULL,NULL,NULL),(519,54,'exam_officer',NULL,NULL,NULL),(520,9,'admin',NULL,NULL,NULL),(521,53,'branchadmin',NULL,NULL,NULL),(522,55,'teacher',NULL,NULL,NULL),(523,55,'exam_officer',NULL,NULL,NULL),(524,9,'branchadmin',NULL,NULL,NULL),(525,53,'teacher',NULL,NULL,NULL),(526,57,'admin',NULL,NULL,NULL),(527,53,'exam_officer',NULL,NULL,NULL),(528,9,'exam_officer',NULL,NULL,NULL),(529,58,'admin',NULL,NULL,NULL),(530,45,'admin',NULL,NULL,NULL),(531,57,'branchadmin',NULL,NULL,NULL),(532,45,'branchadmin',NULL,NULL,NULL),(533,58,'branchadmin',NULL,NULL,NULL),(534,56,'admin',NULL,NULL,NULL),(535,57,'exam_officer',NULL,NULL,NULL),(536,58,'exam_officer',NULL,NULL,NULL),(537,45,'exam_officer',NULL,NULL,NULL),(538,56,'branchadmin',NULL,NULL,NULL),(539,44,'admin',NULL,NULL,NULL),(540,59,'teacher',NULL,NULL,NULL),(541,56,'exam_officer',NULL,NULL,NULL),(542,44,'branchadmin',NULL,NULL,NULL),(543,59,'exam_officer',NULL,NULL,NULL),(544,47,'admin',NULL,NULL,NULL),(545,60,'admin',NULL,NULL,NULL),(546,44,'exam_officer',NULL,NULL,NULL),(547,60,'branchadmin',NULL,NULL,NULL),(548,48,'admin',NULL,NULL,NULL),(549,47,'branchadmin',NULL,NULL,NULL),(550,60,'exam_officer',NULL,NULL,NULL),(551,46,'admin',NULL,NULL,NULL),(552,62,'admin',NULL,NULL,NULL),(553,46,'branchadmin',NULL,NULL,NULL),(554,62,'branchadmin',NULL,NULL,NULL),(555,48,'branchadmin',NULL,NULL,NULL),(556,47,'exam_officer',NULL,NULL,NULL),(557,46,'exam_officer',NULL,NULL,NULL),(558,62,'exam_officer',NULL,NULL,NULL),(559,61,'admin',NULL,NULL,NULL),(560,48,'exam_officer',NULL,NULL,NULL),(561,61,'branchadmin',NULL,NULL,NULL),(562,61,'exam_officer',NULL,NULL,NULL),(563,106,'admin',NULL,NULL,NULL),(564,106,'branchadmin',NULL,NULL,NULL),(565,106,'hr',NULL,NULL,NULL),(568,53,'form_master',NULL,NULL,NULL),(569,13,'form_master',NULL,NULL,NULL),(570,107,'admin',NULL,NULL,NULL),(571,107,'branchadmin',NULL,NULL,NULL),(576,108,'admin',NULL,NULL,NULL),(577,108,'branchadmin',NULL,NULL,NULL),(580,109,'admin',NULL,NULL,NULL),(581,109,'branchadmin',NULL,NULL,NULL),(582,110,'branchadmin',NULL,NULL,NULL),(583,110,'admin',NULL,NULL,NULL),(584,18,'admin',NULL,NULL,NULL),(585,18,'branchadmin',NULL,NULL,NULL),(586,18,'teacher',NULL,NULL,NULL),(587,19,'admin',NULL,NULL,NULL),(588,19,'branchadmin',NULL,NULL,NULL),(589,19,'teacher',NULL,NULL,NULL),(594,27,'admin',NULL,NULL,NULL),(595,27,'branchadmin',NULL,NULL,NULL),(596,27,'exam_officer',NULL,NULL,NULL),(597,27,'teacher',NULL,NULL,NULL),(598,30,'parent',NULL,NULL,NULL),(599,32,'student',NULL,NULL,NULL),(600,111,'admin',NULL,NULL,NULL),(601,112,'admin',NULL,NULL,NULL),(602,113,'admin',NULL,NULL,NULL),(603,114,'admin',NULL,NULL,NULL),(604,115,'admin',NULL,NULL,NULL),(606,117,'teacher',NULL,NULL,NULL),(607,118,'teacher',NULL,NULL,NULL),(608,119,'teacher',NULL,NULL,NULL),(609,120,'teacher',NULL,NULL,NULL),(621,121,'admin',NULL,NULL,NULL),(622,122,'admin',NULL,NULL,NULL),(628,121,'branchadmin',NULL,NULL,NULL),(629,122,'branchadmin',NULL,NULL,NULL),(636,129,'admin',NULL,NULL,NULL),(637,117,'admin',NULL,NULL,NULL),(638,118,'admin',NULL,NULL,NULL),(639,119,'admin',NULL,NULL,NULL),(640,120,'admin',NULL,NULL,NULL),(644,117,'branchadmin',NULL,NULL,NULL),(645,118,'branchadmin',NULL,NULL,NULL),(646,119,'branchadmin',NULL,NULL,NULL),(647,120,'branchadmin',NULL,NULL,NULL),(651,16,'admin',NULL,NULL,NULL),(652,16,'branchadmin',NULL,NULL,NULL),(653,17,'admin',NULL,NULL,NULL),(654,17,'branchadmin',NULL,NULL,NULL),(655,1068,'admin',NULL,NULL,NULL),(656,1068,'branchadmin',NULL,NULL,NULL),(657,1069,'developer',NULL,NULL,NULL),(658,1070,'teacher',NULL,NULL,NULL),(660,5,'admin',NULL,NULL,NULL),(661,5,'branchadmin',NULL,NULL,NULL),(662,4,'admin',NULL,NULL,NULL),(663,4,'branchadmin',NULL,NULL,NULL),(664,4,'exam_officer',NULL,NULL,NULL),(665,1071,'Admin',NULL,NULL,NULL),(676,1078,'admin',NULL,NULL,NULL),(677,1078,'branchadmin',NULL,NULL,NULL),(678,1079,'admin',NULL,NULL,NULL),(679,1079,'branchadmin',NULL,NULL,NULL),(680,1080,'admin',NULL,NULL,NULL),(681,1080,'branchadmin',NULL,NULL,NULL),(682,1081,'admin',NULL,NULL,NULL),(683,1081,'branchadmin',NULL,NULL,NULL),(686,1083,'admin',NULL,NULL,NULL),(687,1083,'branchadmin',NULL,NULL,NULL),(688,1084,'admin',NULL,NULL,NULL),(689,1084,'branchadmin',NULL,NULL,NULL),(690,1084,'teacher',NULL,NULL,NULL),(691,1085,'student',NULL,NULL,NULL),(692,1086,'admin',NULL,NULL,NULL),(693,1086,'branchadmin',NULL,NULL,NULL),(694,1086,'teacher',NULL,NULL,NULL),(695,1087,'admin',NULL,NULL,NULL),(696,1087,'branchadmin',NULL,NULL,NULL),(697,1088,'teacher',NULL,NULL,NULL),(698,1,'admin',NULL,NULL,NULL),(699,1,'branchadmin',NULL,NULL,NULL),(700,1,'exam_officer',NULL,NULL,NULL),(701,37,'admin',NULL,NULL,NULL),(702,37,'branchadmin',NULL,NULL,NULL),(703,37,'exam_officer',NULL,NULL,NULL),(704,37,'superadmin',NULL,NULL,NULL),(705,72,'admin',NULL,NULL,NULL),(706,72,'branchadmin',NULL,NULL,NULL),(707,99,'admin',NULL,NULL,NULL),(708,99,'branchadmin',NULL,NULL,NULL),(709,101,'admin',NULL,NULL,NULL),(710,101,'branchadmin',NULL,NULL,NULL),(711,100,'admin',NULL,NULL,NULL),(712,100,'branchadmin',NULL,NULL,NULL),(713,102,'admin',NULL,NULL,NULL),(714,102,'branchadmin',NULL,NULL,NULL),(715,103,'admin',NULL,NULL,NULL),(716,103,'branchadmin',NULL,NULL,NULL),(717,104,'admin',NULL,NULL,NULL),(718,104,'branchadmin',NULL,NULL,NULL),(719,105,'admin',NULL,NULL,NULL),(720,105,'branchadmin',NULL,NULL,NULL),(721,1072,'admin',NULL,NULL,NULL),(722,1072,'branchadmin',NULL,NULL,NULL),(723,1076,'admin',NULL,NULL,NULL),(724,1076,'branchadmin',NULL,NULL,NULL),(725,23,'admin',NULL,NULL,NULL),(726,23,'branchadmin',NULL,NULL,NULL),(727,24,'admin',NULL,NULL,NULL),(728,24,'branchadmin',NULL,NULL,NULL);
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
) ENGINE=InnoDB AUTO_INCREMENT=202 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rbac_menu_packages`
--

LOCK TABLES `rbac_menu_packages` WRITE;
/*!40000 ALTER TABLE `rbac_menu_packages` DISABLE KEYS */;
INSERT INTO `rbac_menu_packages` VALUES (188,1,1),(93,2,1),(94,3,1),(169,4,2),(168,5,2),(68,6,3),(69,7,3),(70,8,3),(16,9,2),(96,10,1),(78,11,2),(79,12,2),(80,13,2),(76,14,3),(77,15,3),(159,16,2),(160,17,2),(104,18,2),(105,19,2),(153,20,2),(154,21,2),(155,22,2),(156,23,4),(180,24,4),(158,25,2),(87,26,3),(107,27,2),(92,29,2),(108,30,2),(109,32,2),(91,35,3),(189,37,1),(20,39,2),(23,42,2),(24,43,2),(186,44,1),(187,45,1),(25,46,2),(26,47,2),(27,48,2),(28,49,2),(60,50,2),(61,51,2),(62,52,2),(63,53,2),(64,54,2),(65,55,2),(7,56,3),(66,57,2),(67,58,2),(161,59,2),(3,59,4),(4,60,4),(5,61,4),(6,62,4),(29,71,2),(190,72,2),(30,76,2),(31,77,2),(32,78,2),(33,79,2),(34,80,2),(35,81,2),(36,82,2),(8,83,3),(9,84,3),(10,85,3),(11,86,3),(12,87,3),(13,88,3),(14,89,3),(44,90,4),(45,91,4),(46,92,4),(47,93,4),(48,94,4),(49,95,4),(50,96,4),(51,97,4),(52,98,4),(192,99,3),(191,99,4),(194,100,3),(193,101,3),(195,102,3),(197,103,3),(196,103,4),(198,104,3),(199,105,3),(75,106,3),(97,107,2),(100,108,2),(102,109,1),(103,110,1),(114,111,2),(113,111,3),(116,112,2),(115,112,3),(118,113,2),(117,113,3),(120,114,2),(119,114,3),(177,117,4),(163,118,2),(164,119,2),(178,120,4),(140,121,3),(141,122,3),(148,129,2),(147,129,3),(151,1068,3),(166,1070,2),(170,1071,3),(200,1072,3),(201,1076,3),(171,1078,4),(172,1079,4),(173,1080,4),(174,1081,4),(176,1083,3),(183,1086,4),(184,1087,4),(185,1088,4);
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
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rbac_school_packages`
--

LOCK TABLES `rbac_school_packages` WRITE;
/*!40000 ALTER TABLE `rbac_school_packages` DISABLE KEYS */;
INSERT INTO `rbac_school_packages` VALUES (1,'SCH/11',3,'2026-01-11','2027-01-11',NULL,1,1,NULL,'2025-12-24 13:08:52','2026-01-11 14:38:48','2026-01-06 12:59:14'),(2,'SCH/10',2,'2025-01-01','2025-12-31',NULL,1,735,NULL,'2025-12-24 16:02:04','2026-01-11 10:00:36','2026-01-06 12:59:14'),(3,'SCH/12',4,'0000-00-00',NULL,NULL,1,NULL,NULL,'2025-12-25 21:19:43','2026-01-11 10:00:36','2026-01-06 12:59:14'),(4,'SCH/1',2,'2025-01-01','2025-12-31',NULL,1,1,NULL,'2025-12-28 20:56:53','2026-01-11 10:00:36','2026-01-06 12:59:14'),(7,'SCH/20',4,'2026-01-01','2027-01-01',NULL,1,1064,NULL,'2025-12-31 13:40:53','2026-01-11 10:00:36','2026-01-01 00:39:15'),(10,'SCH/23',4,'2026-01-05','2027-01-05',NULL,1,NULL,NULL,'2026-01-05 11:20:34','2026-01-11 10:00:36','2026-01-06 12:59:14'),(11,'SCH/13',4,'2026-01-06','2026-05-06',NULL,1,NULL,NULL,'2026-01-06 12:54:50','2026-01-11 10:00:36','2026-01-06 13:03:31');
/*!40000 ALTER TABLE `rbac_school_packages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rbac_school_menu_access`
--

DROP TABLE IF EXISTS `rbac_school_menu_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rbac_school_menu_access` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `school_id` varchar(20) NOT NULL,
  `menu_item_id` int(11) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_school_menu` (`school_id`,`menu_item_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rbac_school_menu_access`
--

LOCK TABLES `rbac_school_menu_access` WRITE;
/*!40000 ALTER TABLE `rbac_school_menu_access` DISABLE KEYS */;
INSERT INTO `rbac_school_menu_access` VALUES (1,'SCH/23',1084,1,'2026-01-11 10:59:04'),(2,'SCH/23',1085,1,'2026-01-11 10:59:04');
/*!40000 ALTER TABLE `rbac_school_menu_access` ENABLE KEYS */;
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
INSERT INTO `rbac_conditional_access` VALUES (1,1,'teacher','branch','MAIN','SCH/10',1,'2025-12-28 11:28:51');
/*!40000 ALTER TABLE `rbac_conditional_access` ENABLE KEYS */;
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
INSERT INTO `rbac_permission_templates` VALUES (1,'Basic Teacher','Core teaching features only','[\"classes\", \"subjects\", \"attendance\", \"assessments\"]',NULL,'2025-12-27 12:56:47'),(2,'Full Admin','All administrative features','[\"dashboard\", \"students\", \"staff\", \"classes\", \"finance\", \"reports\", \"settings\"]',NULL,'2025-12-27 12:56:47'),(3,'Finance Only','Financial management access','[\"payments\", \"fees\", \"invoices\", \"financial-reports\"]',NULL,'2025-12-27 12:56:47'),(4,'Exam Officer','Examination management','[\"cbt\", \"exam-setup\", \"results\", \"report-cards\"]',NULL,'2025-12-27 12:56:47');
/*!40000 ALTER TABLE `rbac_permission_templates` ENABLE KEYS */;
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
INSERT INTO `rbac_usage_analytics` VALUES (1,735,1,'SCH/10','2025-12-28 11:28:51','Admin','test-session-123');
/*!40000 ALTER TABLE `rbac_usage_analytics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscription_packages`
--

DROP TABLE IF EXISTS `subscription_packages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subscription_packages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `package_name` varchar(50) NOT NULL,
  `display_name` varchar(100) DEFAULT NULL,
  `package_description` text DEFAULT NULL,
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`features`)),
  `price_monthly` decimal(10,2) DEFAULT 0.00,
  `price_yearly` decimal(10,2) DEFAULT 0.00,
  `max_students` int(11) DEFAULT NULL,
  `max_teachers` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `package_name` (`package_name`)
) ENGINE=InnoDB AUTO_INCREMENT=103 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscription_packages`
--

LOCK TABLES `subscription_packages` WRITE;
/*!40000 ALTER TABLE `subscription_packages` DISABLE KEYS */;
INSERT INTO `subscription_packages` VALUES (1,'starter','Starter (Free)',NULL,NULL,0.00,0.00,NULL,NULL,1,'2026-01-11 11:00:36','2026-01-11 11:12:26'),(2,'standard','Standard Package','Essential features - NGN 500/student/term','[\"students\",\"teachers\",\"classes\",\"exams\",\"fees\",\"reports\",\"communication\"]',500.00,0.00,NULL,NULL,1,'2025-12-08 02:02:51','2026-01-11 11:00:36'),(3,'premium','Premium Package','Core features - NGN 700/student/term','[\"students\",\"teachers\",\"classes\",\"exams\",\"fees\",\"accounting\",\"reports\",\"communication\",\"lesson_plans\"]',700.00,0.00,NULL,NULL,1,'2025-12-08 02:02:51','2026-01-11 11:00:36'),(4,'elite','Elite Package','Full system access - NGN 1,000/student/term','[\"students\",\"teachers\",\"classes\",\"exams\",\"fees\",\"accounting\",\"reports\",\"communication\",\"recitation\",\"lesson_plans\",\"payroll\",\"assets\"]',1000.00,0.00,NULL,NULL,1,'2025-12-08 02:02:51','2026-01-11 11:00:36');
/*!40000 ALTER TABLE `subscription_packages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscription_pricing`
--

DROP TABLE IF EXISTS `subscription_pricing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subscription_pricing` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pricing_name` varchar(255) NOT NULL,
  `base_price_per_student` decimal(10,2) NOT NULL,
  `discount_per_annum` decimal(5,2) DEFAULT 0.00,
  `cbt_stand_alone_cost` decimal(10,2) DEFAULT 0.00,
  `sms_subscription_cost` decimal(10,2) DEFAULT 0.00,
  `whatsapp_subscription_cost` decimal(10,2) DEFAULT 0.00,
  `email_subscription_cost` decimal(10,2) DEFAULT 0.00,
  `express_finance_cost` decimal(10,2) DEFAULT 0.00,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscription_pricing`
--

LOCK TABLES `subscription_pricing` WRITE;
/*!40000 ALTER TABLE `subscription_pricing` DISABLE KEYS */;
INSERT INTO `subscription_pricing` VALUES (1,'Standard Plan',1500.00,15.00,200.00,5.00,2.00,0.00,50.00,1,'2025-11-09 07:34:13','2025-11-16 10:17:40'),(2,'Premium Plan',2100.00,15.00,200.00,5.00,1.50,0.00,50.00,1,'2025-11-09 07:34:13','2025-11-16 10:17:46'),(3,'Elite Plan',3000.00,15.00,200.00,5.00,1.00,0.00,50.00,1,'2025-11-09 07:34:13','2025-11-16 10:17:49');
/*!40000 ALTER TABLE `subscription_pricing` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscription_invoices`
--

DROP TABLE IF EXISTS `subscription_invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subscription_invoices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(50) NOT NULL,
  `school_id` varchar(20) NOT NULL,
  `subscription_id` int(11) NOT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `discount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(10,2) NOT NULL,
  `payment_status` enum('unpaid','pending','paid','partial','overdue','cancelled') DEFAULT 'unpaid',
  `balance` decimal(10,2) NOT NULL,
  `created_by` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `amount_paid` decimal(10,2) DEFAULT 0.00,
  `next_payment_due` date DEFAULT NULL,
  `last_payment_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  KEY `subscription_id` (`subscription_id`),
  CONSTRAINT `subscription_invoices_ibfk_1` FOREIGN KEY (`subscription_id`) REFERENCES `school_subscriptions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscription_invoices`
--

LOCK TABLES `subscription_invoices` WRITE;
/*!40000 ALTER TABLE `subscription_invoices` DISABLE KEYS */;
INSERT INTO `subscription_invoices` VALUES (4,'INV-SCH13-1767697785038','SCH/13',4,'2026-01-06','2026-01-13',3000.00,0.00,3000.00,'paid',0.00,NULL,'2026-01-06 11:09:45','2026-01-06 13:04:39',3000.00,NULL,'2026-01-06'),(5,'INV-SCH13-1767697792337','SCH/13',4,'2026-01-06','2026-01-13',9000.00,1350.00,7650.00,'paid',0.00,NULL,'2026-01-06 11:09:52','2026-01-06 13:04:39',7650.00,NULL,'2026-01-06'),(6,'INV-SCH13-1767697814125','SCH/13',4,'2026-01-06','2026-01-13',9000.00,1350.00,7650.00,'paid',0.00,NULL,'2026-01-06 11:10:14','2026-01-06 13:03:31',7650.00,NULL,'2026-01-06'),(7,'INV-SCH13-1767697828863','SCH/13',4,'2026-01-06','2026-01-13',9000.00,1350.00,7650.00,'paid',0.00,NULL,'2026-01-06 11:10:28','2026-01-06 13:04:39',7650.00,NULL,NULL),(16,'INV-2026-0041','SCH/11',5,'2026-01-11','2026-02-10',174006.00,87000.00,87006.00,'unpaid',87006.00,'1064','2026-01-11 14:38:48','2026-01-11 14:38:48',0.00,NULL,NULL),(17,'INV-SCH23-1768145663','SCH/23',3,'2026-01-11','2026-02-10',50000.00,0.00,50000.00,'pending',50000.00,NULL,'2026-01-11 15:34:23','2026-01-11 15:34:23',0.00,NULL,NULL);
/*!40000 ALTER TABLE `subscription_invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscription_payments`
--

DROP TABLE IF EXISTS `subscription_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subscription_payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `subscription_id` int(11) NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `payment_date` date NOT NULL,
  `amount_paid` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `payment_status` enum('completed','pending','failed','refunded') DEFAULT 'completed',
  `notes` mediumtext DEFAULT NULL,
  `created_by` varchar(20) DEFAULT NULL,
  `school_id` varchar(20) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `gateway_reference` varchar(100) DEFAULT NULL,
  `gateway_response` mediumtext DEFAULT NULL,
  `channel` varchar(50) DEFAULT NULL,
  `receipt_url` varchar(255) DEFAULT NULL,
  `bank_name` varchar(100) DEFAULT NULL,
  `account_number` varchar(50) DEFAULT NULL,
  `account_name` varchar(255) DEFAULT NULL,
  `verification_status` enum('pending','verified','rejected') DEFAULT 'pending',
  `verified_by` varchar(20) DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `payment_provider_id` int(11) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_subscription_id` (`subscription_id`),
  KEY `idx_invoice_id` (`invoice_id`),
  KEY `idx_payment_date` (`payment_date`),
  KEY `idx_subscription_invoice` (`subscription_id`,`invoice_id`),
  KEY `idx_reference_number` (`reference_number`),
  KEY `idx_paystack_reference` (`gateway_reference`),
  KEY `idx_payment_status` (`payment_status`),
  CONSTRAINT `subscription_payments_ibfk_1` FOREIGN KEY (`subscription_id`) REFERENCES `school_subscriptions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `subscription_payments_ibfk_2` FOREIGN KEY (`invoice_id`) REFERENCES `subscription_invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscription_payments`
--

LOCK TABLES `subscription_payments` WRITE;
/*!40000 ALTER TABLE `subscription_payments` DISABLE KEYS */;
INSERT INTO `subscription_payments` VALUES (13,4,4,'2026-01-06',3000.00,'online','FLW-INV-SCH13-1767697785038-1767703667496','pending',NULL,'748','SCH/13','2026-01-06 12:47:48','2026-01-06 12:47:48','FLW-INV-SCH13-1767697785038-1767703667496',NULL,'flutterwave',NULL,NULL,NULL,NULL,'pending',NULL,NULL,2),(14,4,4,'2026-01-06',3000.00,'online','FLW-INV-SCH13-1767697785038-1767703713475','pending',NULL,'748','SCH/13','2026-01-06 12:48:33','2026-01-06 12:48:33','FLW-INV-SCH13-1767697785038-1767703713475',NULL,'flutterwave',NULL,NULL,NULL,NULL,'pending',NULL,NULL,2),(15,4,4,'2026-01-06',3000.00,'online','FLW-INV-SCH13-1767697785038-1767703766750','completed',NULL,'748','SCH/13','2026-01-06 12:49:27','2026-01-06 12:51:20','9914566',NULL,'flutterwave',NULL,NULL,NULL,NULL,'pending',NULL,NULL,2),(16,4,5,'2026-01-06',7650.00,'online','FLW-INV-SCH13-1767697792337-1767703910631','completed',NULL,'748','SCH/13','2026-01-06 12:51:51','2026-01-06 12:52:11','9914576',NULL,'flutterwave',NULL,NULL,NULL,NULL,'pending',NULL,NULL,2),(17,4,6,'2026-01-06',7650.00,'online','INV-INV-SCH13-1767697814125-1767704443471','completed',NULL,'748','SCH/13','2026-01-06 12:56:21','2026-01-06 13:03:31','INV-INV-SCH13-1767697814125-1767704443471','{\"id\":5709112883,\"domain\":\"test\",\"status\":\"success\",\"reference\":\"INV-INV-SCH13-1767697814125-1767704443471\",\"receipt_number\":null,\"amount\":765000,\"message\":\"madePayment\",\"gateway_response\":\"Approved\",\"paid_at\":\"2026-01-06T13:01:00.000Z\",\"created_at\":\"2026-01-06T13:00:44.000Z\",\"channel\":\"bank\",\"currency\":\"NGN\",\"ip_address\":\"143.105.174.87\",\"metadata\":{\"invoice_id\":\"6\",\"invoice_number\":\"INV-SCH13-1767697814125\",\"school_id\":\"SCH/13\",\"user_id\":\"748\",\"subscription_id\":\"4\",\"referrer\":\"http://localhost:3000/\"},\"log\":{\"start_time\":1767704447,\"time_spent\":13,\"attempts\":1,\"errors\":0,\"success\":true,\"mobile\":false,\"input\":[],\"history\":[{\"type\":\"input\",\"message\":\"Filled this field: account number\",\"time\":1},{\"type\":\"action\",\"message\":\"Attempted to pay with bank account\",\"time\":1},{\"type\":\"auth\",\"message\":\"Authentication Required: birthday\",\"time\":2},{\"type\":\"auth\",\"message\":\"Authentication Required: registration_token\",\"time\":7},{\"type\":\"auth\",\"message\":\"Authentication Required: payment_token\",\"time\":11},{\"type\":\"success\",\"message\":\"Successfully paid with bank account\",\"time\":13}]},\"fees\":21475,\"fees_split\":null,\"authorization\":{\"authorization_code\":\"AUTH_cfqd7w3ivz\",\"bin\":\"000XXX\",\"last4\":\"X000\",\"exp_month\":\"12\",\"exp_year\":\"9999\",\"channel\":\"bank\",\"card_type\":\"\",\"bank\":\"Zenith Bank\",\"country_code\":\"NG\",\"brand\":\"Zenith Emandate\",\"reusable\":false,\"signature\":null,\"account_name\":null,\"receiver_bank_account_number\":null,\"receiver_bank\":null},\"customer\":{\"id\":319533248,\"first_name\":null,\"last_name\":null,\"email\":\"info@elitescholar.ng\",\"customer_code\":\"CUS_9t5jifjw3dclpf2\",\"phone\":null,\"metadata\":null,\"risk_action\":\"default\",\"international_format_phone\":null},\"plan\":null,\"split\":{},\"order_id\":null,\"paidAt\":\"2026-01-06T13:01:00.000Z\",\"createdAt\":\"2026-01-06T13:00:44.000Z\",\"requested_amount\":765000,\"pos_transaction_data\":null,\"source\":null,\"fees_breakdown\":null,\"connect\":null,\"transaction_date\":\"2026-01-06T13:00:44.000Z\",\"plan_object\":{},\"subaccount\":{}}','paystack',NULL,NULL,NULL,NULL,'verified',NULL,'2026-01-06 13:03:31',1),(18,4,6,'2026-01-06',7650.00,'online','FLW-INV-SCH13-1767697814125-1767704494431','completed',NULL,'748','SCH/13','2026-01-06 13:01:34','2026-01-06 13:01:51','9914591',NULL,'flutterwave',NULL,NULL,NULL,NULL,'pending',NULL,NULL,2),(19,5,16,'2026-01-11',87006.00,'online','FLW-INV-2026-0041-1768142523560','pending',NULL,'746','SCH/11','2026-01-11 14:42:04','2026-01-11 14:42:04','FLW-INV-2026-0041-1768142523560',NULL,'flutterwave',NULL,NULL,NULL,NULL,'pending',NULL,NULL,2),(20,5,16,'2026-01-11',87006.00,'online','FLW-INV-2026-0041-1768142525570','pending',NULL,'746','SCH/11','2026-01-11 14:42:06','2026-01-11 14:42:06','FLW-INV-2026-0041-1768142525570',NULL,'flutterwave',NULL,NULL,NULL,NULL,'pending',NULL,NULL,2);
/*!40000 ALTER TABLE `subscription_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `school_subscriptions`
--

DROP TABLE IF EXISTS `school_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `school_subscriptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `school_id` varchar(20) NOT NULL,
  `subscription_type` enum('termly','annually') DEFAULT 'termly',
  `pricing_plan_id` int(11) NOT NULL,
  `subscription_start_date` date DEFAULT curdate(),
  `subscription_end_date` date DEFAULT (curdate() + interval 4 month),
  `current_term` varchar(50) DEFAULT NULL,
  `academic_year` varchar(20) DEFAULT NULL,
  `active_students_count` int(11) DEFAULT 0,
  `cbt_stand_alone_enabled` tinyint(1) DEFAULT 0,
  `sms_subscription_enabled` tinyint(1) DEFAULT 0,
  `whatsapp_subscription_enabled` tinyint(1) DEFAULT 0,
  `email_subscription_enabled` tinyint(1) DEFAULT 0,
  `express_finance_enabled` tinyint(1) DEFAULT 0,
  `base_cost` decimal(10,2) DEFAULT 0.00,
  `addon_cost` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_cost` decimal(10,2) DEFAULT 0.00,
  `payment_status` enum('pending','paid','overdue','cancelled') DEFAULT 'pending',
  `balance` decimal(10,2) DEFAULT 0.00,
  `status` enum('active','inactive','expired','suspended','pending') DEFAULT 'pending',
  `created_by` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `amount_paid` decimal(10,2) DEFAULT 0.00,
  `next_payment_due` date DEFAULT NULL,
  `last_payment_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pricing_plan_id` (`pricing_plan_id`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_subscription_type` (`subscription_type`),
  KEY `idx_status` (`status`),
  KEY `idx_subscription_dates` (`subscription_start_date`,`subscription_end_date`),
  CONSTRAINT `school_subscriptions_ibfk_1` FOREIGN KEY (`pricing_plan_id`) REFERENCES `subscription_pricing` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `school_subscriptions`
--

LOCK TABLES `school_subscriptions` WRITE;
/*!40000 ALTER TABLE `school_subscriptions` DISABLE KEYS */;
INSERT INTO `school_subscriptions` VALUES (1,'SCH/18','termly',1,'2025-11-17','2026-03-17',NULL,'2024/2026',144,1,1,1,1,1,216000.00,257.00,21600.00,194657.00,'pending',194657.00,'active','1','2025-11-17 17:10:40','2025-11-17 17:10:40',0.00,NULL,NULL),(2,'SCH/22','termly',1,'2025-12-22','2026-12-22',NULL,NULL,100,0,0,0,0,0,150000.00,0.00,0.00,150000.00,'pending',150000.00,'active',NULL,'2025-12-21 23:55:06','2025-12-21 23:55:06',0.00,NULL,NULL),(3,'SCH/23','annually',3,'2025-12-27','2026-12-27',NULL,NULL,200,0,0,0,0,0,600000.00,0.00,0.00,510000.00,'pending',510000.00,'active',NULL,'2025-12-27 09:39:25','2025-12-27 09:39:25',0.00,NULL,NULL),(4,'SCH/13','termly',1,'2026-01-06','2026-05-06',NULL,NULL,3,0,0,0,0,0,3000.00,0.00,0.00,3000.00,'paid',-22950.00,'active',NULL,'2026-01-06 11:09:45','2026-01-06 13:01:51',18300.00,NULL,'2026-01-06'),(5,'SCH/11','annually',3,'2026-01-11','2027-01-11','All Terms','2024/2025',58,0,1,1,0,0,174000.00,6.00,87000.00,87006.00,'pending',87006.00,'active','1064','2026-01-11 14:38:48','2026-01-11 14:38:48',0.00,NULL,NULL);
/*!40000 ALTER TABLE `school_subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_receipts`
--

DROP TABLE IF EXISTS `payment_receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payment_receipts` (
  `receipt_id` varchar(30) NOT NULL,
  `admission_no` varchar(100) NOT NULL,
  `ref_no` varchar(30) NOT NULL,
  `amount_paid` decimal(10,2) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` enum('Cash','Bank Transfer','Card','Mobile Money','Other') NOT NULL,
  `payment_reference` varchar(100) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `balance` decimal(10,2) NOT NULL,
  `status` varchar(30) DEFAULT NULL,
  `school_id` varchar(20) NOT NULL,
  `branch_id` varchar(20) DEFAULT NULL,
  `parent_id` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`receipt_id`),
  KEY `admission_no` (`admission_no`),
  KEY `ref_no` (`ref_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_receipts`
--

LOCK TABLES `payment_receipts` WRITE;
/*!40000 ALTER TABLE `payment_receipts` DISABLE KEYS */;
INSERT INTO `payment_receipts` VALUES ('RCPT-0830668835','213232/1/0003','1079666745',20000.00,'2025-09-19','Bank Transfer','PAY-SCH-BRCH-BNK-1758269775675-287','Payment',0.00,'Full Payment','SCH/1','BRCH00001','PAR/213232/00001','2025-09-19 07:16:15','2025-09-19 07:16:15'),('RCPT-1327576247','213232/1/0011','2518828273',30000.00,'2025-09-01','Bank Transfer','','Payment',17000.00,'Part Payment','SCH/1','BRCH00001','','2025-09-01 19:49:22','2025-09-01 19:49:22'),('RCPT-2090397991','213232/1/0007','7806486238',47000.00,'2025-09-03','Bank Transfer','','Payment',0.00,'Full Payment','SCH/1','BRCH00001','','2025-09-03 11:30:26','2025-09-03 11:30:26'),('RCPT-2524607700','980466/1/0005','7077537069',216100.00,'2025-12-03','Bank Transfer','PAY-SCH-BRCH-BNK-1764755319415-757','Payment',-115600.00,'Overpaid','SCH/10','BRCH00011','','2025-12-03 08:48:39','2025-12-03 08:48:39'),('RCPT-3308318176','213232/1/0002','REF-1756509730366',78200.00,'2025-08-29','Cash','','Parent Payment',-78200.00,'Overpaid','SCH/1','BRCH00001','PAR/213232/00001','2025-08-29 22:22:10','2025-08-29 22:22:10'),('RCPT-4719713595','213232/1/0011','1467381630',30000.00,'2025-09-22','Bank Transfer','PAY-SCH-BRCH-BNK-1758536698050-930','Payment',0.00,'Full Payment','SCH/1','BRCH00001','','2025-09-22 09:24:58','2025-09-22 09:24:58'),('RCPT-5199684496','213232/1/0001','1205739865',50000.00,'2025-09-01','Cash','','Payment',28200.00,'Part Payment','SCH/1','BRCH00001','','2025-09-01 19:08:12','2025-09-01 19:08:12'),('RCPT-6541015553','980466/1/0005','3200520009',216100.00,'2025-12-03','Bank Transfer','PAY-SCH-BRCH-BNK-1764778041306-136','Payment',-103100.00,'Overpaid','SCH/10','BRCH00011','','2025-12-03 15:07:21','2025-12-03 15:07:21'),('RCPT-8479452206','213232/1/0002','REF-1756509730373',78200.00,'2025-08-29','Cash','','Parent Payment',-78200.00,'Overpaid','SCH/1','BRCH00001','PAR/213232/00001','2025-08-29 22:22:10','2025-08-29 22:22:10'),('RCPT-8592961570','980466/1/0005','6079467765',216100.00,'2025-12-03','Bank Transfer','PAY-SCH-BRCH-BNK-1764753940797-687','Payment',-102000.00,'Overpaid','SCH/10','BRCH00011','','2025-12-03 08:25:40','2025-12-03 08:25:40'),('RCPT-8625328688','213232/1/0012','4246313183',10000.00,'2025-09-08','Bank Transfer','','Payment',30000.00,'Part Payment','SCH/1','BRCH00001','','2025-09-08 17:54:26','2025-09-08 17:54:26'),('RCPT-9627149877','213232/1/0002','2175695068',78200.00,'2025-09-01','Cash','','Payment',-156400.00,'Overpaid','SCH/1','BRCH00001','PAR/213232/00001','2025-09-01 19:06:23','2025-09-01 19:06:23');
/*!40000 ALTER TABLE `payment_receipts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ref_no` int(11) NOT NULL,
  `item_code` bigint(10) unsigned NOT NULL,
  `description` varchar(200) NOT NULL,
  `class_name` varchar(100) NOT NULL,
  `admission_no` varchar(20) NOT NULL,
  `academic_year` varchar(9) NOT NULL,
  `term` varchar(30) NOT NULL,
  `payment_mode` varchar(255) DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `payment_date` date DEFAULT NULL,
  `qty` tinyint(2) DEFAULT 1,
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `amount_paid` decimal(10,2) DEFAULT NULL,
  `discount` decimal(8,2) NOT NULL DEFAULT 0.00,
  `fines` decimal(8,2) NOT NULL DEFAULT 0.00,
  `status` enum('Paid','Unpaid') NOT NULL DEFAULT 'Unpaid',
  `created_by` varchar(30) DEFAULT NULL,
  `school_id` varchar(10) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  UNIQUE KEY `id` (`id`),
  KEY `item_id` (`item_code`),
  KEY `payment_std_fk` (`admission_no`),
  KEY `item_code` (`item_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-11 17:06:52
